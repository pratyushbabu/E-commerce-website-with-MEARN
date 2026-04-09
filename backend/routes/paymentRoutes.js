// routes/paymentRoutes.js
const express = require('express');
const router = express.Router();
const { getMyPayments } = require('../controllers/miscControllers');
const { protect, authorize } = require('../middleware/authMiddleware');

router.get('/my', protect, authorize('buyer'), getMyPayments);

module.exports = router;
