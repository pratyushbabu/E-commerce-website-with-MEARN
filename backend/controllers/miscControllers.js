const { Cart, Review, Wishlist, Notification, Payment } = require('../models/index');
const Product = require('../models/Product');
const Order = require('../models/Order');
const User = require('../models/User');

// ─── CART ────────────────────────────────────────────────

exports.getCart = async (req, res) => {
  const cart = await Cart.findOne({ user: req.user._id })
    .populate({
      path: 'items.product',
      select: 'name price discountPrice images stock isApproved seller quantity uom',
      populate: { path: 'seller', select: 'name shopName isBlocked' },
    });

  if (!cart) return res.json({ success: true, cart: { items: [] } });

  // Annotate each item with sellerBlocked flag
  const annotatedItems = (cart.items || []).map(item => {
    const obj = item.toObject ? item.toObject() : item;
    const sellerBlocked = obj.product?.seller?.isBlocked === true;
    return { ...obj, sellerBlocked };
  });

  res.json({ success: true, cart: { ...cart.toObject(), items: annotatedItems } });
};

exports.addToCart = async (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const product = await Product.findById(productId).populate('seller', 'isBlocked name');
  if (!product || !product.isApproved) return res.status(404).json({ message: 'Product not found' });
  if (product.seller?.isBlocked) return res.status(403).json({ message: 'This seller is currently unavailable' });
  if (product.stock < quantity) return res.status(400).json({ message: 'Insufficient stock' });

  // Use discounted price if valid discount exists
  const effectivePrice = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price)
    ? product.discountPrice
    : product.price;

  let cart = await Cart.findOne({ user: req.user._id });
  if (!cart) cart = new Cart({ user: req.user._id, items: [] });

  const idx = cart.items.findIndex(i => i.product.toString() === productId);
  if (idx > -1) {
    cart.items[idx].quantity = Math.min(cart.items[idx].quantity + quantity, product.stock);
    cart.items[idx].effectivePrice = effectivePrice;
    cart.items[idx].price = product.price;
  } else {
    cart.items.push({ product: productId, quantity, price: product.price, effectivePrice });
  }
  await cart.save();
  const populated = await cart.populate('items.product', 'name price discountPrice images stock quantity uom');
  res.json({ success: true, cart: populated });
};

exports.updateCartItem = async (req, res) => {
  const { quantity } = req.body;
  const cart = await Cart.findOne({ user: req.user._id });
  if (!cart) return res.status(404).json({ message: 'Cart not found' });
  const item = cart.items.find(i => i._id.toString() === req.params.itemId);
  if (!item) return res.status(404).json({ message: 'Item not found' });
  if (quantity <= 0) {
    cart.items = cart.items.filter(i => i._id.toString() !== req.params.itemId);
  } else {
    item.quantity = quantity;
  }
  await cart.save();
  const populated = await cart.populate('items.product', 'name price discountPrice images stock quantity uom');
  res.json({ success: true, cart: populated });
};

exports.removeFromCart = async (req, res) => {
  const cart = await Cart.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { items: { _id: req.params.itemId } } },
    { new: true }
  ).populate('items.product', 'name price discountPrice images stock quantity uom');
  res.json({ success: true, cart });
};

exports.clearCart = async (req, res) => {
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });
  res.json({ success: true, message: 'Cart cleared' });
};

// ─── REVIEWS ─────────────────────────────────────────────

exports.addReview = async (req, res) => {
  const { rating, comment } = req.body;
  const productId = req.params.productId;

  const existing = await Review.findOne({ user: req.user._id, product: productId });
  if (existing) return res.status(400).json({ message: 'Already reviewed this product' });

  const review = await Review.create({ user: req.user._id, product: productId, rating, comment });

  const reviews = await Review.find({ product: productId });
  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  await Product.findByIdAndUpdate(productId, { ratings: avgRating, numReviews: reviews.length });

  const io = req.app.get('io');
  io.emit('new-review', { productId, rating: avgRating, numReviews: reviews.length });

  await review.populate('user', 'name avatar');
  res.status(201).json({ success: true, review });
};

exports.getProductReviews = async (req, res) => {
  const reviews = await Review.find({ product: req.params.productId })
    .populate('user', 'name avatar')
    .sort({ createdAt: -1 });
  res.json({ success: true, reviews });
};

exports.deleteReview = async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) return res.status(404).json({ message: 'Review not found' });
  if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Not authorized' });
  }
  await review.deleteOne();
  const reviews = await Review.find({ product: review.product });
  const avgRating = reviews.length ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;
  await Product.findByIdAndUpdate(review.product, { ratings: avgRating, numReviews: reviews.length });
  res.json({ success: true, message: 'Review deleted' });
};

// ─── WISHLIST ─────────────────────────────────────────────

exports.getWishlist = async (req, res) => {
  const wishlist = await Wishlist.findOne({ user: req.user._id }).populate('products', 'name price images ratings');
  res.json({ success: true, wishlist: wishlist || { products: [] } });
};

exports.toggleWishlist = async (req, res) => {
  const { productId } = req.body;
  let wishlist = await Wishlist.findOne({ user: req.user._id });
  if (!wishlist) wishlist = new Wishlist({ user: req.user._id, products: [] });

  const idx = wishlist.products.indexOf(productId);
  let added;
  if (idx > -1) { wishlist.products.splice(idx, 1); added = false; }
  else { wishlist.products.push(productId); added = true; }

  await wishlist.save();
  res.json({ success: true, added, wishlist });
};

// ─── NOTIFICATIONS ───────────────────────────────────────

exports.getNotifications = async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50);
  res.json({ success: true, notifications });
};

exports.markNotificationRead = async (req, res) => {
  await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
  res.json({ success: true });
};

exports.markAllRead = async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { isRead: true });
  res.json({ success: true });
};

// NEW: delete single notification
exports.deleteNotification = async (req, res) => {
  await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  res.json({ success: true });
};

// NEW: clear all notifications
exports.clearAllNotifications = async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  res.json({ success: true });
};

// ─── SELLER ───────────────────────────────────────────────

exports.getSellerDashboard = async (req, res) => {
  const sellerId = req.user._id;
  const [products, orders, sellerUser] = await Promise.all([
    Product.find({ seller: sellerId }),
    Order.find({ 'subOrders.seller': sellerId }).populate('buyer', 'name'),
    User.findById(sellerId).select('totalEarnings withdrawalRequests'),
  ]);

  // totalEarnings from orders (for chart/stats display — gross figure)
  let totalEarnings = 0, totalSales = 0;
  const salesData = {};

  for (const order of orders) {
    const sub = order.subOrders.find(s => s.seller.toString() === sellerId.toString());
    if (sub) {
      totalEarnings += sub.subtotal;
      totalSales += sub.items.reduce((s, i) => s + i.quantity, 0);
      const month = new Date(order.createdAt).toLocaleString('default', { month: 'short', year: 'numeric' });
      salesData[month] = (salesData[month] || 0) + sub.subtotal;
    }
  }

  // Use User.totalEarnings as the live balance — this field is REDUCED when
  // admin approves a withdrawal (in processWithdrawal controller), so it
  // correctly reflects money already paid out.
  const balanceAfterApprovedWithdrawals = sellerUser?.totalEarnings ?? totalEarnings;

  // Sum only PENDING withdrawal requests — these are requested but not yet decided
  const pendingWithdrawalAmount = (sellerUser?.withdrawalRequests || [])
    .filter(w => w.status === 'pending')
    .reduce((sum, w) => sum + w.amount, 0);

  // Available = balance already net of approved payouts, minus any pending locks
  const availableEarnings = Math.max(0, balanceAfterApprovedWithdrawals - pendingWithdrawalAmount);

  // Withdrawal history for display (most recent 5)
  const withdrawalHistory = (sellerUser?.withdrawalRequests || [])
    .slice()
    .sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt))
    .slice(0, 5)
    .map(w => ({
      _id: w._id,
      amount: w.amount,
      status: w.status,
      requestedAt: w.requestedAt,
    }));

  res.json({
    success: true,
    stats: {
      totalProducts: products.length,
      approvedProducts: products.filter(p => p.isApproved).length,
      pendingProducts: products.filter(p => !p.isApproved).length,
      totalOrders: orders.length,
      totalEarnings,                       // gross from orders (for chart)
      totalSales,
      pendingWithdrawalAmount,             // locked, awaiting admin decision
      availableEarnings,                   // what seller can actually request
      balanceAfterApprovedWithdrawals,     // net after approved payouts
    },
    salesData,
    recentOrders: orders.slice(0, 5),
    withdrawalHistory,
  });
};

exports.requestWithdrawal = async (req, res) => {
  const { amount } = req.body;
  const user = await User.findById(req.user._id);
  if (amount > user.totalEarnings) return res.status(400).json({ message: 'Insufficient earnings' });
  user.withdrawalRequests.push({ amount });
  await user.save();
  const io = req.app.get('io');
  io.to('admin-room').emit('withdrawal-request', { sellerId: user._id, sellerName: user.name, amount });
  res.json({ success: true, message: 'Withdrawal request submitted' });
};

// ─── PAYMENTS ─────────────────────────────────────────────

exports.getMyPayments = async (req, res) => {
  const payments = await Payment.find({ buyer: req.user._id })
    .populate('order', 'totalAmount orderStatus createdAt')
    .sort({ createdAt: -1 });
  res.json({ success: true, payments });
};
