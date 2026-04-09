const mongoose = require('mongoose');

const UOM_VALUES = ['pcs', 'kg', 'g', 'litre', 'ml', 'meter', 'cm', 'box', 'dozen', 'pair', 'set', 'pack'];

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  description: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  discountPrice: { type: Number, default: 0 },
  // NEW: quantity per unit and unit of measurement
  quantity: { type: Number, default: 1, min: 0 },
  uom: { type: String, enum: UOM_VALUES, default: 'pcs' },
  category: { type: String, required: true },
  subcategory: { type: String, default: '' },
  brand: { type: String, default: '' },
  images: [{ url: String, public_id: String }],
  stock: { type: Number, required: true, min: 0, default: 0 },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  isApproved: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  ratings: { type: Number, default: 0 },
  numReviews: { type: Number, default: 0 },
  tags: [String],
  specifications: [{ key: String, value: String }],
  soldCount: { type: Number, default: 0 },
}, { timestamps: true });

// Text index for global search
productSchema.index({ name: 'text', description: 'text', category: 'text', tags: 'text', brand: 'text' });

module.exports = mongoose.model('Product', productSchema);
