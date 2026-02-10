const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const speakeasy = require("speakeasy");
const qrcode = require("qrcode");
const User = require("../models/User");
const { sendVerificationEmail, sendPasswordResetEmail } = require("../utils/emailService");

// Register user
exports.register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: "Please provide a valid email address" });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email" });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // Create new user
    const user = new User({
      name,
      email,
      password,
      verificationToken,
      isRegistrationPayment: false, 
    });

    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      // Delete the user if email sending fails
      await User.findByIdAndDelete(user._id);
      return res.status(500).json({ message: "Failed to send verification email. Please try again." });
    }

    res.status(201).json({
      message: "User registered successfully. Please check your email to verify your account.",
      userId: user._id,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// Verify email
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Validate token exists
    if (!token || typeof token !== 'string') {
      console.log('Invalid token format:', token);
      return res.status(400).json({ 
        message: "Verification token is required and must be a string",
        code: "INVALID_TOKEN_FORMAT"
      });
    }

    // Find user by token with additional checks
    const user = await User.findOne({ 
      verificationToken: token,
      isVerified: false // Only find unverified users
    });

    if (!user) {
      console.log('Token not found or user already verified:', token);
      return res.status(404).json({ 
        message: "Invalid, expired verification token or already verified",
        code: "INVALID_OR_EXPIRED_TOKEN"
      });
    }

    // Add token expiration check (24 hours)
    const tokenAge = Date.now() - user.updatedAt.getTime();
    const maxTokenAge = 24 * 60 * 60 * 1000; // 24 hours
    
    if (tokenAge > maxTokenAge) {
      console.log('Expired token:', token);
      await User.findByIdAndUpdate(user._id, { 
        verificationToken: null 
      });
      
      return res.status(410).json({ 
        message: "Verification token has expired. Please request a new one.",
        code: "TOKEN_EXPIRED"
      });
    }

    // Verify the user
    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    console.log('Successfully verified user:', user.email);
    return res.json({ 
      message: "Email verified successfully. You can now login to your account.",
      email: user.email
    });

  } catch (error) {
    console.error("Email verification error:", error);
    return res.status(500).json({ 
      message: "Server error during email verification",
      code: "SERVER_ERROR",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Login user (Step 1: Email/Password verification)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "Please provide email and password" });
    }

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check if user is verified
    if (!user.isVerified) {
      return res.status(400).json({
        message: "Please verify your email before logging in",
        needsVerification: true,
        email: user.email,
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    // Check if user has 2FA enabled
    if (user.twoFactorSecret) {
      // Generate temporary token for 2FA verification (valid for 5 minutes)
      const tempToken = jwt.sign(
        { email: user.email, purpose: '2fa' }, 
        process.env.JWT_SECRET || "your-secret-key", 
        { expiresIn: "5m" }
      );

      return res.json({
        message: "Please enter your 2FA code",
        requires2FA: true,
        tempToken,
        email: user.email
      });
    }

    // If no 2FA, generate final JWT token
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "7d" });

   res.json({
  message: "Login successful",
  token,
  user: {
    id: user._id,
    name: user.name,
    email: user.email,
    isPasswordUpload: user.isPasswordUpload,
    isRegistrationPayment: user.isRegistrationPayment,
    has2FA: !!user.twoFactorSecret
  }

    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// Verify 2FA code and complete login
exports.verify2FA = async (req, res) => {
  try {
    const { tempToken, code } = req.body;

    if (!tempToken || !code) {
      return res.status(400).json({ message: "Temporary token and 2FA code are required" });
    }

    // Verify temporary token
    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET || "your-secret-key");
      if (decoded.purpose !== '2fa') {
        throw new Error('Invalid token purpose');
      }
    } catch (error) {
      return res.status(400).json({ message: "Invalid or expired temporary token" });
    }

    // Find user
    const user = await User.findOne({ email: decoded.email });
    if (!user) {
      return res.status(400).json({ message: "User not found" });
    }

    // Verify 2FA code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2 // Allow 2 time steps tolerance
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid 2FA code" });
    }

    // Generate final JWT token
    const token = jwt.sign({ email: user.email }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "7d" });

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        has2FA: true
      }
    });
  } catch (error) {
    console.error("2FA verification error:", error);
    res.status(500).json({ message: "Server error during 2FA verification" });
  }
};

// Generate 2FA secret and QR code (for setup)
exports.generate2FASecret = async (req, res) => {
  try {
    const userEmail = req.body.email; // From auth middleware
    
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `Adventure Safari (${user.email})`,
      issuer: 'Adventure Safari'
    });

    // Save temporary secret (not activated until verified)
    user.twoFactorTempSecret = secret.base32;
    await user.save();

    // Generate QR code
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      manualEntryKey: secret.base32,
      message: "Scan the QR code with your authenticator app or enter the manual key"
    });
  } catch (error) {
    console.error("2FA secret generation error:", error);
    res.status(500).json({ message: "Server error generating 2FA secret" });
  }
};

// Enable 2FA after verification
exports.enable2FA = async (req, res) => {
  try {
    const userEmail = req.body.email; // From auth middleware
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ message: "2FA code is required" });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorTempSecret) {
      return res.status(400).json({ message: "No pending 2FA setup found. Please generate a new secret first." });
    }

    // Verify the code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorTempSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid 2FA code" });
    }

    // Enable 2FA
    user.twoFactorSecret = user.twoFactorTempSecret;
    user.twoFactorTempSecret = undefined;
    user.twoFactorEnabled = true;
    await user.save();

    res.json({ 
      message: "2FA has been successfully enabled for your account",
      enabled: true 
    });
  } catch (error) {
    console.error("2FA enable error:", error);
    res.status(500).json({ message: "Server error enabling 2FA" });
  }
};

// Disable 2FA
exports.disable2FA = async (req, res) => {
  try {
    const userEmail = req.body.email; // From auth middleware
    const { code, password } = req.body;

    if (!code || !password) {
      return res.status(400).json({ message: "2FA code and password are required" });
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (!user.twoFactorSecret) {
      return res.status(400).json({ message: "2FA is not enabled for this account" });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // Verify 2FA code
    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 2
    });

    if (!verified) {
      return res.status(400).json({ message: "Invalid 2FA code" });
    }

    // Disable 2FA
    user.twoFactorSecret = undefined;
    user.twoFactorTempSecret = undefined;
    user.twoFactorEnabled = false;
    await user.save();

    res.json({ 
      message: "2FA has been successfully disabled for your account",
      enabled: false 
    });
  } catch (error) {
    console.error("2FA disable error:", error);
    res.status(500).json({ message: "Server error disabling 2FA" });
  }
};

// Get 2FA status
exports.get2FAStatus = async (req, res) => {
  try {
    const userEmail = req.body.email; // From auth middleware
    
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      enabled: !!user.twoFactorSecret,
      hasSetupInProgress: !!user.twoFactorTempSecret
    });
  } catch (error) {
    console.error("2FA status error:", error);
    res.status(500).json({ message: "Server error getting 2FA status" });
  }
};

// Resend verification email
exports.resendVerification = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User not found with this email address" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "User is already verified" });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.verificationToken = verificationToken;
    await user.save();

    // Send verification email
    try {
      await sendVerificationEmail(email, verificationToken);
      res.json({ message: "Verification email sent successfully. Please check your inbox." });
    } catch (emailError) {
      console.error("Error sending verification email:", emailError);
      res.status(500).json({ message: "Failed to send verification email. Please try again later." });
    }
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({ message: "Server error while resending verification email" });
  }
};

// Forgot password - Initiate password reset
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: "Email is required" 
      });
    }

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal whether email exists for security
      return res.status(200).json({ 
        success: true,
        message: "If an account with that email exists, a reset link has been sent" 
      });
    }

    // Generate reset token (expires in 1 hour)
    const resetToken = crypto.randomBytes(32).toString("hex");
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour (fixed from 7200000)
    await user.save();

    // Send password reset email
    try {
      await sendPasswordResetEmail(user.email, resetToken);
      res.status(200).json({ 
        success: true,
        message: "Password reset link sent to your email" 
      });
    } catch (emailError) {
      console.error("Error sending reset email:", emailError);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();
      
      res.status(500).json({ 
        success: false,
        message: "Failed to send password reset email" 
      });
    }
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while processing password reset" 
    });
  }
};

// Reset password - Complete password reset
exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ 
        success: false,
        message: "Reset token and new password are required" 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: "Password must be at least 6 characters long" 
      });
    }

    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Invalid or expired reset token" 
      });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password reset successfully"
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while resetting password"
    });
  }
};

// Google OAuth Success Handler
exports.googleSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }

    // Generate JWT token with email (to match regular login format)
    const token = jwt.sign(
      { email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Redirect to frontend with token
    return res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);

  } catch (error) {
    console.error("Google auth error:", error);
    return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
  }
};

// Apple OAuth Success Handler
exports.appleSuccess = async (req, res) => {
  try {
    console.log("appleSuccess handler called");
    console.log("req.user:", req.user ? { id: req.user._id, email: req.user.email } : "undefined");

    if (!req.user) {
      console.error("No user found in request after Apple authentication");
      return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
    }

    // Generate JWT token with email (to match regular login format)
    const token = jwt.sign(
      { email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    console.log("Apple auth successful, redirecting with token");
    // Redirect to frontend with token
    return res.redirect(`${process.env.CLIENT_URL}/auth/success?token=${token}`);

  } catch (error) {
    console.error("Apple auth error in success handler:", {
      message: error.message,
      stack: error.stack,
      user: req.user ? { id: req.user._id, email: req.user.email } : "undefined"
    });
    return res.redirect(`${process.env.CLIENT_URL}/login?error=auth_failed`);
  }
};