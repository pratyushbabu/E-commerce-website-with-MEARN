// routes/orderRoutes.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.post('/', protect, authorize('buyer'), ctrl.placeOrder);
router.get('/my', protect, authorize('buyer'), ctrl.getMyOrders);
router.get('/seller', protect, authorize('seller'), ctrl.getSellerOrders);
router.get('/', protect, authorize('admin'), ctrl.getAllOrders);
router.get('/:id', protect, ctrl.getOrder);
router.put('/:id/status', protect, authorize('seller'), ctrl.updateSubOrderStatus);
router.put('/:id/admin-status', protect, authorize('admin'), ctrl.adminUpdateOrderStatus);

module.exports = router;
