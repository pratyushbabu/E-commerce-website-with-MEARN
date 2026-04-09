const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const { Payment, Notification } = require('../models/index');

// @GET /api/admin/dashboard
exports.getDashboard = async (req, res) => {
  const [
    totalUsers, totalSellers, totalBuyers, totalProducts,
    totalOrders, pendingSellers, pendingProducts,
    revenueData, recentOrders, recentUsers,
  ] = await Promise.all([
    User.countDocuments({ role: { $ne: 'admin' } }),
    User.countDocuments({ role: 'seller' }),
    User.countDocuments({ role: 'buyer' }),
    Product.countDocuments({ isApproved: true }),
    Order.countDocuments(),
    User.countDocuments({ role: 'seller', isApproved: false }),
    Product.countDocuments({ isApproved: false }),
    Order.aggregate([
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
    ]),
    Order.find().sort({ createdAt: -1 }).limit(5).populate('buyer', 'name'),
    User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt'),
  ]);

  // Monthly revenue
  const monthlyRevenue = await Order.aggregate([
    { $group: {
      _id: { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
      revenue: { $sum: '$totalAmount' },
      orders: { $sum: 1 },
    }},
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: 12 },
  ]);

  // Count pending withdrawal requests
  const sellersWithPendingWithdrawals = await User.find({
    role: 'seller',
    'withdrawalRequests': { $elemMatch: { status: 'pending' } },
  }).select('withdrawalRequests');
  const pendingWithdrawals = sellersWithPendingWithdrawals.reduce(
    (count, seller) => count + seller.withdrawalRequests.filter(w => w.status === 'pending').length, 0
  );

  res.json({
    success: true,
    stats: {
      totalUsers, totalSellers, totalBuyers, totalProducts, totalOrders,
      pendingSellers, pendingProducts, pendingWithdrawals,
      totalRevenue: revenueData[0]?.total || 0,
    },
    monthlyRevenue: monthlyRevenue.reverse(),
    recentOrders,
    recentUsers,
  });
};

// @GET /api/admin/users
exports.getAllUsers = async (req, res) => {
  const { role, page = 1, limit = 20, search } = req.query;
  const query = { role: { $ne: 'admin' } };
  if (role) query.role = role;
  if (search) query.$or = [
    { name: { $regex: search, $options: 'i' } },
    { email: { $regex: search, $options: 'i' } },
  ];
  const skip = (page - 1) * limit;
  const [users, total] = await Promise.all([
    User.find(query).select('-password').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
    User.countDocuments(query),
  ]);
  res.json({ success: true, users, total, pages: Math.ceil(total / limit) });
};

// @PUT /api/admin/users/:id/approve
exports.approveSeller = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isApproved: req.body.approve !== false },
    { new: true }
  ).select('-password');

  const io = req.app.get('io');
  io.to(`user-${user._id}`).emit('account-approved', { approved: user.isApproved });

  await Notification.create({
    user: user._id,
    message: user.isApproved
      ? 'Your seller account has been approved! You can now list products.'
      : 'Your seller account application was rejected.',
    type: 'system',
    link: '/seller/dashboard',
  });

  res.json({ success: true, user });
};

// @PUT /api/admin/users/:id/block
exports.blockUser = async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isBlocked: req.body.block !== false },
    { new: true }
  ).select('-password');

  const io = req.app.get('io');
  // Notify the user themselves
  io.to(`user-${user._id}`).emit('account-blocked', { blocked: user.isBlocked });
  // Broadcast to all buyers to refresh their product lists and carts
  if (user.role === 'seller') {
    io.emit('seller-block-status', { sellerId: user._id.toString(), blocked: user.isBlocked });
  }

  res.json({ success: true, user });
};

// @DELETE /api/admin/users/:id
exports.deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ success: true, message: 'User deleted' });
};

// @GET /api/admin/products
exports.getAllProducts = async (req, res) => {
  const { isApproved, page = 1, limit = 20 } = req.query;
  const query = {};
  if (isApproved !== undefined) query.isApproved = isApproved === 'true';
  const skip = (page - 1) * limit;
  const [products, total] = await Promise.all([
    Product.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))
      .populate('seller', 'name shopName email'),
    Product.countDocuments(query),
  ]);
  res.json({ success: true, products, total, pages: Math.ceil(total / limit) });
};

// @GET /api/admin/payments
exports.getAllPayments = async (req, res) => {
  const payments = await Payment.find().sort({ createdAt: -1 })
    .populate('buyer', 'name email')
    .populate('order', 'totalAmount orderStatus');
  res.json({ success: true, payments });
};

// @PUT /api/admin/payments/:id/refund
exports.refundPayment = async (req, res) => {
  const payment = await Payment.findByIdAndUpdate(
    req.params.id,
    { status: 'refunded', refundReason: req.body.reason },
    { new: true }
  );
  const io = req.app.get('io');
  io.to(`user-${payment.buyer}`).emit('payment-refunded', { paymentId: payment._id, amount: payment.amount });
  res.json({ success: true, payment });
};

// @GET /api/admin/withdrawals - list all seller withdrawal requests
exports.getWithdrawalRequests = async (req, res) => {
  const sellers = await User.find({
    role: 'seller',
    'withdrawalRequests.0': { $exists: true },
  }).select('name email shopName totalEarnings withdrawalRequests');

  // Flatten into a list with seller info attached
  const requests = [];
  for (const seller of sellers) {
    for (const wr of seller.withdrawalRequests) {
      requests.push({
        _id: wr._id,
        sellerId: seller._id,
        sellerName: seller.name,
        sellerEmail: seller.email,
        shopName: seller.shopName,
        totalEarnings: seller.totalEarnings,
        amount: wr.amount,
        status: wr.status,
        requestedAt: wr.requestedAt,
      });
    }
  }

  // Sort newest first
  requests.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
  res.json({ success: true, requests });
};

// @PUT /api/admin/withdrawals/:sellerId/:requestId - approve or reject
exports.processWithdrawal = async (req, res) => {
  const { sellerId, requestId } = req.params;
  const { action } = req.body; // 'approved' | 'rejected'

  if (!['approved', 'rejected'].includes(action)) {
    return res.status(400).json({ message: 'Action must be approved or rejected' });
  }

  const seller = await User.findById(sellerId);
  if (!seller) return res.status(404).json({ message: 'Seller not found' });

  const wr = seller.withdrawalRequests.id(requestId);
  if (!wr) return res.status(404).json({ message: 'Withdrawal request not found' });
  if (wr.status !== 'pending') return res.status(400).json({ message: 'Request already processed' });

  wr.status = action;

  // If approved, deduct from totalEarnings
  if (action === 'approved') {
    if (seller.totalEarnings < wr.amount) {
      return res.status(400).json({ message: 'Seller has insufficient earnings for this withdrawal' });
    }
    seller.totalEarnings -= wr.amount;
  }

  await seller.save();

  const io = req.app.get('io');
  io.to(`user-${seller._id}`).emit('withdrawal-processed', {
    requestId,
    action,
    amount: wr.amount,
  });

  await Notification.create({
    user: seller._id,
    message: action === 'approved'
      ? `Your withdrawal request of ₹${wr.amount.toLocaleString()} has been approved.`
      : `Your withdrawal request of ₹${wr.amount.toLocaleString()} was rejected.`,
    type: 'payment',
    forRole: 'seller',
    link: '/seller/dashboard',
  });

  res.json({ success: true, action, sellerId, requestId });
};

// @GET /api/admin/seller-stats/:id
exports.getSellerStats = async (req, res) => {
  const sellerId = req.params.id;
  const [productCount, orders] = await Promise.all([
    Product.countDocuments({ seller: sellerId }),
    Order.find({ 'subOrders.seller': sellerId }),
  ]);
  let earnings = 0;
  for (const order of orders) {
    const sub = order.subOrders.find(s => s.seller.toString() === sellerId);
    if (sub) earnings += sub.subtotal;
  }
  res.json({ success: true, stats: { productCount, orderCount: orders.length, earnings } });
};
