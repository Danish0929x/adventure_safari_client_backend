const express = require("express")
const userController = require("../controllers/userController")
const auth = require("../middleware/auth")

const router = express.Router()

// Get user profile
router.get("/get-profile", auth, userController.getProfile)


// Update user profile
router.put("/update-profile", auth, userController.updateProfile)

// Change password
router.put("/change-password", auth, userController.changePassword)

// Delete user account
router.delete("/delete-account", auth, userController.deleteUserAccount)

module.exports = router