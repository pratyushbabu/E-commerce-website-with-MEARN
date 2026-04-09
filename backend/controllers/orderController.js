const Order = require('../models/Order');
const Product = require('../models/Product');
const { Cart, Notification, Payment } = require('../models/index');
const User = require('../models/User');

// @POST /api/orders - Buyer places order
exports.placeOrder = async (req, res) => {
  const { shippingAddress, note } = req.body;
  const cart = await Cart.findOne({ user: req.user._id }).populate('items.product');
  if (!cart || cart.items.length === 0) return res.status(400).json({ message: 'Cart is empty' });

  // Group items by seller — USE EFFECTIVE (discounted) price
  const sellerMap = {};
  let totalAmount = 0;

  for (const item of cart.items) {
    const product = item.product;
    if (!product || !product.isApproved) continue;
    if (product.stock < item.quantity) {
      return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
    }
    // Block order if seller is blocked
    const seller = await User.findById(product.seller).select('isBlocked name shopName');
    if (seller?.isBlocked) {
      return res.status(403).json({ message: `Seller "${seller.shopName || seller.name}" is currently unavailable. Please remove their items from your cart.` });
    }
    const sellerId = product.seller.toString();
    if (!sellerMap[sellerId]) sellerMap[sellerId] = { seller: product.seller, items: [], subtotal: 0 };

    // Always use discountPrice if valid, else original price
    const effectivePrice = (product.discountPrice && product.discountPrice > 0 && product.discountPrice < product.price)
      ? product.discountPrice
      : product.price;

    const itemTotal = effectivePrice * item.quantity;
    sellerMap[sellerId].items.push({
      product: product._id,
      seller: product.seller,
      name: product.name,
      image: product.images[0]?.url || '',
      price: effectivePrice,      // store effective price in order
      originalPrice: product.price,
      quantity: item.quantity,
      uom: product.uom || 'pcs',
      unitQuantity: product.quantity || 1,
    });
    sellerMap[sellerId].subtotal += itemTotal;
    totalAmount += itemTotal;
  }

  const subOrders = Object.values(sellerMap);
  const order = await Order.create({
    buyer: req.user._id,
    subOrders,
    shippingAddress,
    paymentMethod: 'COD',
    paymentStatus: 'pending',
    totalAmount,
    note,
  });

  // Update stock
  for (const item of cart.items) {
    await Product.findByIdAndUpdate(item.product._id, {
      $inc: { stock: -item.quantity, soldCount: item.quantity },
    });
  }

  // Create payment record
  await Payment.create({ order: order._id, buyer: req.user._id, amount: totalAmount, method: 'COD' });

  // Clear cart
  await Cart.findOneAndUpdate({ user: req.user._id }, { items: [] });

  const io = req.app.get('io');
  // Notify each seller
  for (const sub of subOrders) {
    io.to(`user-${sub.seller}`).emit('new-order', { orderId: order._id, buyerName: req.user.name });
    await Notification.create({
      user: sub.seller,
      message: `New order received from ${req.user.name}`,
      type: 'order',
      link: `/seller/orders`,
    });
  }
  io.to('admin-room').emit('new-order', { orderId: order._id, total: totalAmount });
  io.to(`user-${req.user._id}`).emit('order-placed', { orderId: order._id });

  // Emit stock updates
  for (const item of cart.items) {
    const updated = await Product.findById(item.product._id);
    if (updated) io.emit('stock-update', { productId: updated._id, stock: updated.stock });
  }

  res.status(201).json({ success: true, order });
};

// @GET /api/orders/my - Buyer's orders
exports.getMyOrders = async (req, res) => {
  const orders = await Order.find({ buyer: req.user._id })
    .sort({ createdAt: -1 })
    .populate('subOrders.seller', 'name shopName')
    .populate('subOrders.items.product', 'name images');
  res.json({ success: true, orders });
};

// @GET /api/orders/:id
exports.getOrder = async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('buyer', 'name email phone')
    .populate('subOrders.seller', 'name shopName phone')
    .populate('subOrders.items.product', 'name images price');
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const isBuyer = order.buyer._id.toString() === req.user._id.toString();
  const isSeller = order.subOrders.some(s => s.seller._id.toString() === req.user._id.toString());
  const isAdmin = req.user.role === 'admin';

  if (!isBuyer && !isSeller && !isAdmin) return res.status(403).json({ message: 'Not authorized' });
  res.json({ success: true, order });
};

// @PUT /api/orders/:id/status - Seller updates sub-order status
exports.updateSubOrderStatus = async (req, res) => {
  const { status, note } = req.body;
  const order = await Order.findById(req.params.id).populate('subOrders.seller', '_id name');
  if (!order) return res.status(404).json({ message: 'Order not found' });

  const subOrder = order.subOrders.find(s => {
    const sellerId = s.seller._id ? s.seller._id.toString() : s.seller.toString();
    return sellerId === req.user._id.toString();
  });
  if (!subOrder) return res.status(403).json({ message: 'Not your order' });

  const allowed = ['packed', 'shipped'];
  if (!allowed.includes(status)) return res.status(400).json({ message: 'Sellers can only set packed/shipped' });

  subOrder.status = status;
  subOrder.statusHistory.push({ status, note });

  // Derive overall order status from all sub-orders
  const allStatuses = order.subOrders.map(s => s.status);
  if (allStatuses.every(s => s === 'delivered')) {
    order.orderStatus = 'delivered';
  } else if (allStatuses.some(s => s === 'shipped')) {
    order.orderStatus = 'shipped';
  } else if (allStatuses.every(s => s === 'packed')) {
    order.orderStatus = 'processing';
  }

  await order.save();

  const io = req.app.get('io');
  const orderStatus = order.orderStatus;

  // Notify buyer with both sub-status and overall orderStatus
  io.to(`user-${order.buyer}`).emit('order-status-update', {
    orderId: order._id.toString(),
    status: orderStatus,       // overall order status for buyer view
    subStatus: status,
    orderStatus,
    sellerName: req.user.name,
  });
  // Notify admin
  io.to('admin-room').emit('order-status-update', {
    orderId: order._id.toString(),
    status: orderStatus,
    orderStatus,
  });

  await Notification.create({
    user: order.buyer,
    message: `Your order status updated to "${orderStatus}"`,
    type: 'order',
    forRole: 'buyer',
    link: `/orders/${order._id}`,
  });

  res.json({ success: true, order });
};

// @PUT /api/orders/:id/admin-status - Admin updates
exports.adminUpdateOrderStatus = async (req, res) => {
  const { status } = req.body;
  const order = await Order.findById(req.params.id).populate('subOrders.seller', 'name email');
  if (!order) return res.status(404).json({ message: 'Order not found' });

  order.orderStatus = status;
  if (status === 'delivered') {
    order.deliveredAt = Date.now();
    order.paymentStatus = 'paid';

    // Auto-complete payment record
    await Payment.findOneAndUpdate(
      { order: order._id },
      { status: 'completed' },
      { new: true }
    );

    // Update seller earnings for each sub-order
    for (const sub of order.subOrders) {
      sub.status = 'delivered';
      sub.statusHistory.push({ status: 'delivered', note: 'Marked delivered by admin' });
      await User.findByIdAndUpdate(sub.seller, {
        $inc: { totalEarnings: sub.subtotal },
      });
    }
  }

  await order.save();

  const io = req.app.get('io');
  // Emit to buyer with full status
  io.to(`user-${order.buyer}`).emit('order-status-update', {
    orderId: order._id.toString(),
    status,
    orderStatus: status,
  });
  // Emit to all sellers in this order
  for (const sub of order.subOrders) {
    io.to(`user-${sub.seller._id || sub.seller}`).emit('order-status-update', {
      orderId: order._id.toString(),
      status,
      orderStatus: status,
    });
  }
  io.to('admin-room').emit('order-status-update', { orderId: order._id.toString(), status, orderStatus: status });

  await Notification.create({
    user: order.buyer,
    message: `Your order has been marked as "${status}"`,
    type: 'order',
    forRole: 'buyer',
    link: `/orders/${order._id}`,
  });

  if (status === 'delivered') {
    for (const sub of order.subOrders) {
      await Notification.create({
        user: sub.seller._id || sub.seller,
        message: `Order #${order._id.toString().slice(-6).toUpperCase()} delivered. ₹${sub.subtotal.toLocaleString()} added to your earnings.`,
        type: 'payment',
        forRole: 'seller',
        link: `/seller/orders`,
      });
      io.to(`user-${sub.seller._id || sub.seller}`).emit('earnings-updated', {
        orderId: order._id.toString(),
        amount: sub.subtotal,
      });
    }
  }

  res.json({ success: true, order });
};

// @GET /api/orders/seller - Seller's orders
exports.getSellerOrders = async (req, res) => {
  const orders = await Order.find({ 'subOrders.seller': req.user._id })
    .sort({ createdAt: -1 })
    .populate('buyer', 'name email phone')
    .populate('subOrders.items.product', 'name images');

  const filtered = orders.map(o => ({
    ...o.toObject(),
    subOrders: o.subOrders.filter(s => s.seller.toString() === req.user._id.toString()),
  }));

  res.json({ success: true, orders: filtered });
};

// @GET /api/orders - Admin: all orders
exports.getAllOrders = async (req, res) => {
  const { page = 1, limit = 20, status } = req.query;
  const query = status ? { orderStatus: status } : {};
  const skip = (page - 1) * limit;
  const [orders, total] = await Promise.all([
    Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
      .populate('buyer', 'name email')
      .populate('subOrders.seller', 'name shopName'),
    Order.countDocuments(query),
  ]);
  res.json({ success: true, orders, total, pages: Math.ceil(total / limit) });
};
