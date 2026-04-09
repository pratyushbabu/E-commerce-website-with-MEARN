const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['buyer', 'seller', 'admin'], default: 'buyer' },
  avatar: { type: String, default: '' },
  phone: { type: String, default: '' },
  isApproved: { type: Boolean, default: false }, // for sellers
  isBlocked: { type: Boolean, default: false },
  addresses: [{
    label: String,
    street: String,
    city: String,
    state: String,
    zip: String,
    country: { type: String, default: 'India' },
    isDefault: { type: Boolean, default: false },
  }],
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  shopName: { type: String, default: '' },       // seller
  shopDescription: { type: String, default: '' }, // seller
  bankDetails: {                                  // seller
    accountNumber: String,
    ifsc: String,
    holderName: String,
  },
  totalEarnings: { type: Number, default: 0 },   // seller
  withdrawalRequests: [{
    amount: Number,
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    requestedAt: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
