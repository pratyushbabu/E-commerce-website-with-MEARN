const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));

router.get('/dashboard', ctrl.getDashboard);
router.get('/users', ctrl.getAllUsers);
router.put('/users/:id/approve', ctrl.approveSeller);
router.put('/users/:id/block', ctrl.blockUser);
router.delete('/users/:id', ctrl.deleteUser);
router.get('/products', ctrl.getAllProducts);
router.get('/payments', ctrl.getAllPayments);
router.put('/payments/:id/refund', ctrl.refundPayment);
router.get('/seller-stats/:id', ctrl.getSellerStats);
// Withdrawal management
router.get('/withdrawals', ctrl.getWithdrawalRequests);
router.put('/withdrawals/:sellerId/:requestId', ctrl.processWithdrawal);

module.exports = router;
