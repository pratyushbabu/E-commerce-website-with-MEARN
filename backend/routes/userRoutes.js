const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');

// Public seller profile
router.get('/seller/:id', async (req, res) => {
  const seller = await User.findOne({ _id: req.params.id, role: 'seller', isApproved: true })
    .select('name shopName shopDescription avatar createdAt');
  if (!seller) return res.status(404).json({ message: 'Seller not found' });
  res.json({ success: true, seller });
});

module.exports = router;
