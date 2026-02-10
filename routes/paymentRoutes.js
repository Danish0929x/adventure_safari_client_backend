const express = require("express");
const paymentController = require("../controllers/paymentController");
const auth = require("../middleware/auth");

const router = express.Router();

// Create PayPal order
router.post("/create-order", auth, paymentController.createPayPalOrder);

// Capture PayPal order
router.post("/capture-order", auth, paymentController.capturePayPalOrder);

// Get payment status
router.get("/status/:bookingId", auth, paymentController.getPaymentStatus);

module.exports = router;