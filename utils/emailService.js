const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASS, // Your email password or app password
  },
});

const sendVerificationEmail = async (email, token) => {
  const verificationUrl = `${
    process.env.CLIENT_URL ||
    "https://adventure-safari-client-frontend.vercel.app" ||
    "http://localhost:3000"
  }/verify-email/${token}`;

  const mailOptions = {
    from: {
      name: "Adventure Safari Account Verification",
      address: process.env.EMAIL_USER,
    },
    to: email,
    subject: "Email Verification - Adventure Safari ",
    text: `Thank you for registering with Adventure Safari Network! To complete your registration and activate your account, please verify your email address by clicking the link below: ${verificationUrl}`,
    html: `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Email Verification</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 0;">
          <!-- Header -->
         <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">Adventure Safari Network</h1>
            <p style="color: rgba(255, 255, 255, 0.95); margin: 5px 0 0; font-size: 16px;">Your Gateway to Adventure safari</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <h2 style="color: #333333; text-align: center; margin-bottom: 30px;">Verify Your Email Address</h2>
            
            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              Thank you for registering with Adventure Safari Network! To complete your registration and activate your account, 
              please verify your email address by clicking the button below.
            </p>
            
            <!-- Verification Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${verificationUrl}" 
                 style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #ffffff; padding: 15px 30px; text-decoration: none; 
                        border-radius: 5px; display: inline-block; font-weight: bold; font-size: 16px;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">
              Or copy and paste this link into your browser to verify your email address:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 30px;">
              <p style="color: #007bff; word-break: break-all; margin: 0; font-size: 14px;">
                ${verificationUrl}
              </p>
            </div>
            
            <div style="border-top: 1px solid #eeeeee; padding-top: 20px; margin-top: 30px;">
              <p style="color: #999999; font-size: 12px; line-height: 1.4; margin: 0;">
                <strong>Security Note:</strong> This verification link will expire in 24 hours for security reasons. 
                If you didn't create an account with Adventure Safari Network, please ignore this email.
              </p>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eeeeee;">
            <p style="color: #999999; font-size: 12px; margin: 0;">
              © ${new Date().getFullYear()} Adventure Safari Network. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Verification email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
};

const sendPasswordResetEmail = async (email, token) => {
  const resetUrl = `${
    process.env.CLIENT_URL ||
    "https://adventure-safari-client-frontend.vercel.app" ||
    "http://localhost:3000"
  }/reset-password/${token}`;
  // Extract username from email (everything before @)
  const username = email.split("@")[0];

  const mailOptions = {
    from: {
      name: "Adventure Safari",
      address: process.env.EMAIL_USER,
    },
    to: email,
    subject: "Password Reset - Adventure Safari Network",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);  padding: 20px; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0; color: white;">Adventure Safari Network</h1>
        </div>
        
        <div style="padding: 25px; background: #fff; border-radius: 0 0 5px 5px; border: 1px solid #e9ecef;">
          <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
            <strong>Hi ${username},</strong>
          </p>
          
          <p style="font-size: 15px; line-height: 1.6;">
            We received a request to reset the password for your Adventure Safari account.
          </p>
          
          <p style="font-size: 15px; line-height: 1.6;">
            Please click the button below to reset your password. This link will expire in <strong>2 hrs</strong>.
          </p>
          
          <div style="margin: 30px 0; text-align: center;">
            <a href="${resetUrl}" 
               style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
              Reset Password
            </a>
          </div>
          
          <p style="font-size: 15px; color: #666;">
            Or copy and paste this URL into your browser:<br>
            <span style="word-break: break-all; color: #3498db;">${resetUrl}</span>
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="font-size: 14px; color: #666;">
              <strong>Note:</strong> If you didn't request this password reset, please ignore this email.
            </p>
          </div>
          
          <div style="margin-top: 30px; font-size: 14px; color: #7f8c8d;">
            <p>Thanks,<br>The Adventure Safari Team</p>
          </div>
        </div>
        
        <div style="margin-top: 20px; text-align: center; font-size: 12px; color: #95a5a6;">
          <p>© ${new Date().getFullYear()} Adventure Safari Network. All rights reserved.</p>
        </div>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
};

module.exports = {
  sendVerificationEmail,
  sendPasswordResetEmail,
};
