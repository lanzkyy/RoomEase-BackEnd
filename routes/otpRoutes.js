// routes/otpRoutes.js
const express = require('express');
const OtpController = require('../controllers/otpController');
const AuthController = require('../controllers/authController');

console.log('OtpController:', OtpController); // Debug
console.log('AuthController:', AuthController); // Debug

const { validateOtpSend, validateOtpVerify } = require('../middleware/validationMiddleware');
const router = express.Router();

router.post('/send-otp', validateOtpSend, OtpController.sendOtp);
router.post('/verify-otp', validateOtpVerify, OtpController.verifyOtp);
router.post('/reset-password', AuthController.resetPassword);

module.exports = router;