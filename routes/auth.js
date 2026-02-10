const express = require('express');
const router = express.Router();
const passport = require('passport');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');

// Existing auth routes
router.post('/register', authController.register);
router.get("/verify-email/:token", authController.verifyEmail);
router.post('/login', authController.login);
router.post("/resend-verification", authController.resendVerification);
router.post("/forgot-password", authController.forgotPassword);
router.post("/reset-password/:token", authController.resetPassword);

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account"
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/login",
    session: false
  }),
  authController.googleSuccess
);

// Apple OAuth routes
router.get(
  "/apple",
  passport.authenticate("apple", {
    scope: ["name", "email"]
  })
);

router.post(
  "/apple/callback",
  (req, res, next) => {
    console.log("Apple callback received");
    console.log("Request body:", req.body);
    console.log("Request query:", req.query);
    next();
  },
  passport.authenticate("apple", {
    failureRedirect: `${process.env.CLIENT_URL}/login?error=apple_auth_failed`,
    session: false
  }),
  authController.appleSuccess
);

// 2FA routes
router.post('/verify-2fa', authController.verify2FA);
router.post('/2fa/generate-secret', authMiddleware, authController.generate2FASecret);
router.post('/2fa/enable', authMiddleware, authController.enable2FA);
router.post('/2fa/disable', authMiddleware, authController.disable2FA);
router.get('/2fa/status', authMiddleware, authController.get2FAStatus);

module.exports = router;