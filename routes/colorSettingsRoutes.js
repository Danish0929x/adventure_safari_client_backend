const express = require("express");
const router = express.Router();
const colorSettingsController = require("../controllers/colorSettingsController");
const authMiddleware = require("../middleware/authMiddleware");

// Protected route - get only enabled colors (authenticated users only)
router.get("/enabled", authMiddleware, colorSettingsController.getEnabledColors);

module.exports = router;
