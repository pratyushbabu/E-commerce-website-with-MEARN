const Product = require('../models/Product');
const User = require('../models/User');
const { Notification } = require('../models/index');
const cloudinary = require('../config/cloudinary');

// Helper: get IDs of all blocked sellers (cached per-request)
const getBlockedSellerIds = async () => {
  const blocked = await User.find({ role: 'seller', isBlocked: true }).select('_id');
  return blocked.map(u => u._id);
};

// @GET /api/products - Public, with advanced live search/filter
exports.getProducts = async (req, res) => {
  const { search, category, minPrice, maxPrice, sort, page = 1, limit = 12, seller } = req.query;

  // Exclude products from blocked sellers
  const blockedSellerIds = await getBlockedSellerIds();
  const query = {
    isApproved: true,
    seller: { $nin: blockedSellerIds },
  };

  if (search && search.trim()) {
    const s = search.trim();
    query.$or = [
      { name: { $regex: s, $options: 'i' } },
      { description: { $regex: s, $options: 'i' } },
      { category: { $regex: s, $options: 'i' } },
      { brand: { $regex: s, $options: 'i' } },
      { subcategory: { $regex: s, $options: 'i' } },
      { tags: { $elemMatch: { $regex: s, $options: 'i' } } },
    ];
  }
  if (category) query.category = { $regex: category, $options: 'i' };
  if (seller) query.seller = seller; // seller-specific override (still filters blocked above via $nin check is skipped)
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  const sortOptions = {
    newest: { createdAt: -1 },
    'price-asc': { price: 1 },
    'price-desc': { price: -1 },
    rating: { ratings: -1 },
    popular: { soldCount: -1 },
  };
  const sortBy = sortOptions[sort] || { createdAt: -1 };

  const skip = (Number(page) - 1) * Number(limit);
  const [products, total] = await Promise.all([
    Product.find(query).sort(sortBy).skip(skip).limit(Number(limit))
      .populate('seller', 'name shopName avatar isBlocked'),
    Product.countDocuments(query),
  ]);

  res.json({ success: true, products, total, pages: Math.ceil(total / Number(limit)), page: Number(page) });
};

// @GET /api/products/search - Live search endpoint for instant results
exports.searchProducts = async (req, res) => {
  const { q, limit = 8 } = req.query;
  if (!q || q.trim().length < 1) return res.json({ success: true, products: [] });

  const blockedSellerIds = await getBlockedSellerIds();
  const s = q.trim();
  const products = await Product.find({
    isApproved: true,
    seller: { $nin: blockedSellerIds },
    $or: [
      { name: { $regex: s, $options: 'i' } },
      { category: { $regex: s, $options: 'i' } },
      { brand: { $regex: s, $options: 'i' } },
      { tags: { $elemMatch: { $regex: s, $options: 'i' } } },
    ],
  })
    .select('name price discountPrice images category brand ratings uom quantity')
    .populate('seller', 'shopName isBlocked')
    .limit(Number(limit))
    .sort({ soldCount: -1 });

  res.json({ success: true, products });
};

// @GET /api/products/:id
exports.getProduct = async (req, res) => {
  const product = await Product.findById(req.params.id).populate('seller', 'name shopName avatar phone');
  if (!product) return res.status(404).json({ message: 'Product not found' });
  res.json({ success: true, product });
};

// @POST /api/products - Seller only
exports.createProduct = async (req, res) => {
  const { name, description, price, discountPrice, category, subcategory, brand, stock, tags, specifications } = req.body;
  const images = [];

  if (req.files && req.files.length > 0) {
    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, { folder: 'mern-ecommerce/products' });
      images.push({ url: result.secure_url, public_id: result.public_id });
    }
  }

  const product = await Product.create({
    name, description, price, discountPrice, category, subcategory, brand, stock,
    tags: tags ? JSON.parse(tags) : [],
    specifications: specifications ? JSON.parse(specifications) : [],
    images,
    seller: req.user._id,
    isApproved: false,
  });

  const io = req.app.get('io');
  io.to('admin-room').emit('new-product-pending', { product: { _id: product._id, name, seller: req.user.name } });

  res.status(201).json({ success: true, product });
};

// @PUT /api/products/:id - Seller (own) or Admin
exports.updateProduct = async (req, res) => {
  let product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  if (req.user.role === 'seller' && product.seller.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  const updates = { ...req.body };
  if (updates.tags && typeof updates.tags === 'string') updates.tags = JSON.parse(updates.tags);
  if (updates.specifications && typeof updates.specifications === 'string') updates.specifications = JSON.parse(updates.specifications);

  if (req.files && req.files.length > 0) {
    const newImages = [];
    for (const file of req.files) {
      const result = await cloudinary.uploader.upload(file.path, { folder: 'mern-ecommerce/products' });
      newImages.push({ url: result.secure_url, public_id: result.public_id });
    }
    updates.images = [...(product.images || []), ...newImages];
  }

  product = await Product.findByIdAndUpdate(req.params.id, updates, { new: true });

  const io = req.app.get('io');
  io.emit('product-updated', { productId: product._id, stock: product.stock, price: product.price });

  res.json({ success: true, product });
};

// @DELETE /api/products/:id
exports.deleteProduct = async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) return res.status(404).json({ message: 'Product not found' });
  if (req.user.role === 'seller' && product.seller.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  // Remove cloudinary images
  for (const img of product.images) {
    if (img.public_id) await cloudinary.uploader.destroy(img.public_id);
  }
  await product.deleteOne();
  const io = req.app.get('io');
  io.emit('product-deleted', { productId: req.params.id });
  res.json({ success: true, message: 'Product deleted' });
};

// @GET /api/products/categories
exports.getCategories = async (req, res) => {
  const categories = await Product.distinct('category', { isApproved: true });
  res.json({ success: true, categories });
};

// @PUT /api/products/:id/approve - Admin
exports.approveProduct = async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    { isApproved: req.body.approve !== false },
    { new: true }
  ).populate('seller', 'name email');

  const io = req.app.get('io');
  if (product.isApproved) {
    io.emit('new-product', { product });
    io.to(`user-${product.seller._id}`).emit('product-approved', { productId: product._id, name: product.name });
  } else {
    io.to(`user-${product.seller._id}`).emit('product-rejected', { productId: product._id, name: product.name });
  }

  await Notification.create({
    user: product.seller._id,
    message: `Your product "${product.name}" has been ${product.isApproved ? 'approved' : 'rejected'}.`,
    type: 'product',
    link: `/seller/products`,
  });

  res.json({ success: true, product });
};
