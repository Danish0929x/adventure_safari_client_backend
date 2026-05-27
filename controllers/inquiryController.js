const { sendInquiryEmail } = require("../utils/emailService");

// Handle "Inquire Now" form submissions
exports.createInquiry = async (req, res) => {
  try {
    const { name, email, phoneNumber, query } = req.body;

    // Validate required fields
    if (!name || !email || !phoneNumber || !query) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone number and query are all required",
      });
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    await sendInquiryEmail({ name, email, phoneNumber, query });

    return res.status(200).json({
      success: true,
      message: "Your inquiry has been sent successfully. We'll get back to you soon!",
    });
  } catch (error) {
    console.error("Inquiry submission error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to send your inquiry. Please try again later.",
    });
  }
};
