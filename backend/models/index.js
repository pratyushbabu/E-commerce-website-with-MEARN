const mongoose = require('mongoose');

// ─── CART ────────────────────────────────────────────────
const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1, min: 1 },
    price: Number,         // original price snapshot
    effectivePrice: Number, // discounted price if applicable
  }],
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);

// ─── REVIEW ──────────────────────────────────────────────
const reviewSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true },
}, { timestamps: true });

reviewSchema.index({ user: 1, product: 1 }, { unique: true });
const Review = mongoose.model('Review', reviewSchema);

// ─── WISHLIST ─────────────────────────────────────────────
const wishlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  products: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
}, { timestamps: true });

const Wishlist = mongoose.model('Wishlist', wishlistSchema);

// ─── NOTIFICATION ─────────────────────────────────────────
const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  message: { type: String, required: true },
  type: { type: String, enum: ['order', 'product', 'payment', 'system', 'review'], default: 'system' },
  isRead: { type: Boolean, default: false },
  link: { type: String, default: '' },
  forRole: { type: String, enum: ['buyer', 'seller', 'admin', 'all'], default: 'all' },
}, { timestamps: true });

const Notification = mongoose.model('Notification', notificationSchema);

// ─── PAYMENT ──────────────────────────────────────────────
const paymentSchema = new mongoose.Schema({
  order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  method: { type: String, default: 'COD' },
  status: { type: String, enum: ['pending', 'completed', 'refunded', 'failed'], default: 'pending' },
  transactionId: { type: String, default: '' },
  refundReason: { type: String, default: '' },
}, { timestamps: true });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = { Cart, Review, Wishlist, Notification, Payment };
