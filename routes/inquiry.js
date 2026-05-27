const express = require("express");
const router = express.Router();
const inquiryController = require("../controllers/inquiryController");

// Public route - no auth required
router.post("/", inquiryController.createInquiry);

module.exports = router;
