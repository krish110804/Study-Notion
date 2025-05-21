const express = require('express');
const router = express.Router();

const {
    capturePayment,
    verifyPayment,
    sendPaymentSuccessEmail,
} = require('../controllers/payments');

const { auth, isStudent } = require('../middleware/auth');

router.post('/capturePayment', auth, isStudent, capturePayment);
router.post('/verifyPayment', auth, isStudent, verifyPayment);
router.post('/sendSuccessEmail', auth, isStudent, sendPaymentSuccessEmail);

module.exports = router;
