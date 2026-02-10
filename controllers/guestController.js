// controllers/guestController.js
const { deleteCloudinaryFile } = require('../middleware/documentUpload');
const { Booking } = require('../models/Booking');
const User = require('../models/User');

// Helper function to extract Cloudinary public ID from URL
const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const filename = parts.pop();
  return filename.split('.')[0];
};

// Helper function to validate booking and guest using email
const validateBookingAndGuest = async (bookingId, guestIndex, userEmail) => {
  console.log('Validation params:', { bookingId, guestIndex, userEmail });
  
  try {
    // First find the user by email to get userId
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log('User not found with email:', userEmail);
      return { error: "User not found", status: 404 };  
    }
    
    console.log('User found:', user._id);
    
    // Find booking using userId
    const booking = await Booking.findOne({ 
      _id: bookingId, 
      userId: user._id 
    });

    if (!booking) {
      console.log('Booking not found:', { bookingId, userId: user._id });
      return { error: "Booking not found", status: 404 };
    }

    console.log('Booking found with guests:', booking.guests.length);

    if (guestIndex < 0 || guestIndex >= booking.guests.length) {
      console.log('Invalid guest index:', { guestIndex, totalGuests: booking.guests.length });
      return { error: "Invalid guest index", status: 400 };
    }

    return { booking, user };
  } catch (error) {
    console.error('Validation error:', error);
    return { error: "Database error during validation", status: 500 };
  }
};

// Upload passport document
exports.uploadPassport = async (req, res) => {
  try {
    const { bookingId, guestIndex } = req.params;
    console.log('Upload passport params:', { bookingId, guestIndex });
    
    // Get email from middleware
    const userEmail = req.user?.email || req.body?.email;
    console.log('User email from middleware:', userEmail);

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No passport file uploaded" });
    }

    console.log('File received:', {
      filename: req.file.filename,
      originalname: req.file.originalname,
      size: req.file.size,
      fileUrl: req.fileUrl
    });

    const validation = await validateBookingAndGuest(bookingId, guestIndex, userEmail);
    if (validation.error) {
      console.log('Validation failed:', validation.error);
      return res.status(validation.status).json({ message: validation.error });
    }

    const { booking } = validation;

    // Delete old passport file if exists
    const oldPassport = booking.guests[guestIndex].passport;
    if (oldPassport) {
      console.log('Deleting old passport:', oldPassport);
      const publicId = extractPublicId(oldPassport);
      if (publicId) {
        await deleteCloudinaryFile(publicId);
      }
    }

    // Update passport URL
    booking.guests[guestIndex].passport = req.fileUrl;
    await booking.save();

    console.log('Passport uploaded successfully:', req.fileUrl);

    res.status(200).json({
      message: "Passport uploaded successfully",
      passportUrl: req.fileUrl,
      guest: booking.guests[guestIndex]
    });
  } catch (error) {
    console.error("Upload passport error:", error);
    res.status(500).json({ message: "Server error while uploading passport" });
  }
};

// Upload multiple documents (Medical Certificate & Travel Insurance)
exports.uploadDocuments = async (req, res) => {
  try {
    const { bookingId, guestIndex } = req.params;
    const userEmail = req.user?.email || req.body?.email;
    
    console.log('Upload documents params:', { bookingId, guestIndex, userEmail });

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    const validation = await validateBookingAndGuest(bookingId, guestIndex, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { booking } = validation;
    const uploadedDocuments = {};

    // Process each uploaded file
    if (req.uploadedFiles) {
      // Handle medical certificate
      if (req.uploadedFiles.medicalCertificate) {
        const oldCertificate = booking.guests[guestIndex].medicalCertificate;
        if (oldCertificate) {
          const publicId = extractPublicId(oldCertificate);
          if (publicId) {
            await deleteCloudinaryFile(publicId);
          }
        }
        booking.guests[guestIndex].medicalCertificate = req.uploadedFiles.medicalCertificate.url;
        uploadedDocuments.medicalCertificate = req.uploadedFiles.medicalCertificate.url;
      }

      // Handle travel insurance
      if (req.uploadedFiles.travelInsurance) {
        const oldInsurance = booking.guests[guestIndex].travelInsurance;
        if (oldInsurance) {
          const publicId = extractPublicId(oldInsurance);
          if (publicId) {
            await deleteCloudinaryFile(publicId);
          }
        }
        booking.guests[guestIndex].travelInsurance = req.uploadedFiles.travelInsurance.url;
        uploadedDocuments.travelInsurance = req.uploadedFiles.travelInsurance.url;
      }
    }

    if (Object.keys(uploadedDocuments).length === 0) {
      return res.status(400).json({ message: "No valid documents uploaded" });
    }

    await booking.save();

    res.status(200).json({
      message: "Documents uploaded successfully",
      uploadedDocuments,
      guest: booking.guests[guestIndex]
    });
  } catch (error) {
    console.error("Upload documents error:", error);
    res.status(500).json({ message: "Server error while uploading documents" });
  }
};

// Update guest form information
exports.updateGuestForm = async (req, res) => {
  try {
    const { bookingId, guestIndex } = req.params;
    const { 
      name, 
      age, 
      gender,
      phone,
      country,
      state,
      address,
      passportNumber,
      passportCountry,
      passportIssuedOn,
      passportExpiresOn,
      emergencyContactName,
      emergencyContactNumber
    } = req.body;
    
    const userEmail = req.user?.email || req.body?.email;

    console.log('Update guest form:', { 
      bookingId, 
      guestIndex, 
      userEmail, 
      data: { 
        name, 
        age, 
        gender,
        phone,
        country,
        state,
        address,
        passportNumber,
        passportCountry,
        passportIssuedOn,
        passportExpiresOn,
        emergencyContactName,
        emergencyContactNumber
      } 
    });

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    const validation = await validateBookingAndGuest(bookingId, guestIndex, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { booking } = validation;

    // Update guest information - only update fields that are provided
    if (name !== undefined) booking.guests[guestIndex].name = name;
    if (age !== undefined) booking.guests[guestIndex].age = age;
    if (gender !== undefined) booking.guests[guestIndex].gender = gender;
    if (phone !== undefined) booking.guests[guestIndex].phone = phone;
    if (country !== undefined) booking.guests[guestIndex].country = country;
    if (state !== undefined) booking.guests[guestIndex].state = state;
    if (address !== undefined) booking.guests[guestIndex].address = address;
    
    // Passport information
    if (passportNumber !== undefined) booking.guests[guestIndex].passportNumber = passportNumber;
    if (passportCountry !== undefined) booking.guests[guestIndex].passportCountry = passportCountry;
    if (passportIssuedOn !== undefined) booking.guests[guestIndex].passportIssuedOn = passportIssuedOn;
    if (passportExpiresOn !== undefined) booking.guests[guestIndex].passportExpiresOn = passportExpiresOn;
    
    // Emergency contact
    if (emergencyContactName !== undefined) booking.guests[guestIndex].emergencyContactName = emergencyContactName;
    if (emergencyContactNumber !== undefined) booking.guests[guestIndex].emergencyContactNumber = emergencyContactNumber;

    await booking.save();

    res.status(200).json({
      message: "Guest information updated successfully",
      guest: booking.guests[guestIndex]
    });
  } catch (error) {
    console.error("Update guest form error:", error);
    res.status(500).json({ message: "Server error while updating guest information" });
  }
};

// Get specific guest information
exports.getGuest = async (req, res) => {
  try {
    const { bookingId, guestIndex } = req.params;
    const userEmail = req.user?.email || req.body?.email;

    console.log('Get guest:', { bookingId, guestIndex, userEmail });

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    const validation = await validateBookingAndGuest(bookingId, guestIndex, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { booking } = validation;

    res.status(200).json({
      message: "Guest information retrieved successfully",
      guest: booking.guests[guestIndex]
    });
  } catch (error) {
    console.error("Get guest error:", error);
    res.status(500).json({ message: "Server error while retrieving guest information" });
  }
};

// Get all guests for a booking
exports.getGuests = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const userEmail = req.user?.email || req.body?.email;

    console.log('Get guests:', { bookingId, userEmail });

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    // Find user by email first
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const booking = await Booking.findOne({ 
      _id: bookingId, 
      userId: user._id 
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({
      message: "Guests retrieved successfully",
      guests: booking.guests,
      totalGuests: booking.guests.length
    });
  } catch (error) {
    console.error("Get guests error:", error);
    res.status(500).json({ message: "Server error while retrieving guests" });
  }
};

// Update booking-level acknowledgment
exports.updateAcknowledge = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { acknowledged } = req.body;
    const userEmail = req.user?.email || req.body?.email;

    console.log('Update acknowledge:', { bookingId, userEmail, acknowledged });

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    if (typeof acknowledged !== 'boolean') {
      return res.status(400).json({ message: "Acknowledged status must be a boolean value" });
    }

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find booking
    const booking = await Booking.findOne({
      _id: bookingId,
      userId: user._id
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Update acknowledgment status
    booking.acknowledged = acknowledged;
    await booking.save();

    res.status(200).json({
      message: "Acknowledgment status updated successfully",
      booking: {
        _id: booking._id,
        acknowledged: booking.acknowledged
      }
    });
  } catch (error) {
    console.error("Update acknowledge error:", error);
    res.status(500).json({ message: "Server error while updating acknowledgment status" });
  }
};

// Update registration payment status
exports.updateRegistrationPayment = async (req, res) => {
  try {
    const { bookingId, guestIndex } = req.params;
    const { registrationPayment } = req.body;
    const userEmail = req.user?.email || req.body?.email;

    console.log('Update payment status:', { bookingId, guestIndex, userEmail, registrationPayment });

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    if (typeof registrationPayment !== 'boolean') {
      return res.status(400).json({ message: "Registration payment status must be a boolean value" });
    }

    const validation = await validateBookingAndGuest(bookingId, guestIndex, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { booking } = validation;

    // Update registration payment status
    booking.guests[guestIndex].registrationPayment = registrationPayment;
    await booking.save();

    res.status(200).json({
      message: "Registration payment status updated successfully",
      guest: booking.guests[guestIndex]
    });
  } catch (error) {
    console.error("Update registration payment error:", error);
    res.status(500).json({ message: "Server error while updating registration payment status" });
  }
};