// controllers/guestController.js
const { deleteCloudinaryFile } = require('../middleware/documentUpload');
const Booking = require('../models/Booking');
const Guest = require('../models/Guest');
const User = require('../models/User');

// Helper function to extract Cloudinary public ID from URL
const extractPublicId = (url) => {
  if (!url) return null;
  const parts = url.split('/');
  const filename = parts.pop();
  return filename.split('.')[0];
};

// Helper function to validate booking and guest
const validateBookingAndGuest = async (bookingId, guestId, userEmail) => {
  try {
    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return { error: "User not found", status: 404 };
    }

    // Find booking that belongs to this user
    const booking = await Booking.findOne({
      _id: bookingId,
      userId: user._id
    });

    if (!booking) {
      return { error: "Booking not found", status: 404 };
    }

    // Find guest and verify it belongs to the booking
    const guest = await Guest.findById(guestId);
    if (!guest) {
      return { error: "Guest not found", status: 404 };
    }

    // Verify guest is in this booking's guestIds
    if (!booking.guestIds.includes(guestId)) {
      return { error: "Guest does not belong to this booking", status: 403 };
    }

    // Verify guest belongs to this user
    if (guest.userId.toString() !== user._id.toString()) {
      return { error: "Unauthorized access to guest", status: 403 };
    }

    return { booking, guest, user };
  } catch (error) {
    console.error('Validation error:', error);
    return { error: "Database error during validation", status: 500 };
  }
};

// Upload passport document
exports.uploadPassport = async (req, res) => {
  try {
    const { bookingId, guestId } = req.params;
    const userEmail = req.user?.email || req.body?.email;

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No passport file uploaded" });
    }

    const validation = await validateBookingAndGuest(bookingId, guestId, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { guest } = validation;

    // Check upload limit (max 2 uploads: 1 original + 1 re-upload)
    const oldPassport = guest.passport;
    const isReupload = oldPassport && oldPassport.trim() !== "";
    const previousPassports = guest.previousPassports || [];

    if (isReupload && previousPassports.length >= 1) {
      return res.status(400).json({
        message: "Passport upload limit reached. You can only update your passport once."
      });
    }

    // Archive old passport if exists (keep for records)
    if (isReupload) {
      if (!guest.previousPassports) {
        guest.previousPassports = [];
      }
      guest.previousPassports.push({
        url: oldPassport,
        replacedAt: new Date()
      });
    }

    // Update passport URL and set approval status to pending
    guest.passport = req.fileUrl;
    if (!guest.passportApproval) {
      guest.passportApproval = {};
    }
    guest.passportApproval.status = "pending";
    guest.passportApproval.approvedAt = null;
    guest.passportApproval.approvedBy = null;
    guest.passportApproval.rejectionReason = null;
    await guest.save();

    const updatedBooking = await Booking.findById(bookingId)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds');

    res.status(200).json({
      message: "Passport uploaded successfully",
      passportUrl: req.fileUrl,
      guest,
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Upload passport error:", error);
    res.status(500).json({ message: "Server error while uploading passport" });
  }
};

// Upload travel insurance document
exports.uploadDocuments = async (req, res) => {
  try {
    const { bookingId, guestId } = req.params;
    const userEmail = req.user?.email || req.body?.email;

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No travel insurance file uploaded" });
    }

    const validation = await validateBookingAndGuest(bookingId, guestId, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { guest } = validation;

    // Delete old insurance from Cloudinary if exists
    const oldInsurance = guest.travelInsurance;
    if (oldInsurance) {
      const publicId = extractPublicId(oldInsurance);
      if (publicId) {
        await deleteCloudinaryFile(publicId);
      }
    }

    guest.travelInsurance = req.fileUrl;
    await guest.save();

    const updatedBooking = await Booking.findById(bookingId)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds');

    res.status(200).json({
      message: "Travel insurance uploaded successfully",
      travelInsuranceUrl: req.fileUrl,
      guest,
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Upload documents error:", error);
    res.status(500).json({ message: "Server error while uploading document" });
  }
};

// Update medical appointment date / mark as completed
exports.updateMedicalAppointment = async (req, res) => {
  try {
    const { bookingId, guestId } = req.params;
    const { medicalAppointmentDate, medicalAppointmentCompleted, medicalAppointmentCompletedDate, medicalFollowUpAppointmentDate, healthInfo } = req.body;
    const userEmail = req.user?.email || req.body?.email;

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    const validation = await validateBookingAndGuest(bookingId, guestId, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { guest } = validation;

    if (medicalAppointmentDate !== undefined) {
      guest.medicalAppointmentDate = medicalAppointmentDate;
      guest.medicalAppointmentCompleted = true;
    }

    if (medicalAppointmentCompleted !== undefined) {
      guest.medicalAppointmentCompleted = medicalAppointmentCompleted;
    }

    if (medicalAppointmentCompletedDate !== undefined) {
      guest.medicalAppointmentCompletedDate = medicalAppointmentCompletedDate;
    }

    if (medicalFollowUpAppointmentDate !== undefined) {
      guest.medicalFollowUpAppointmentDate = medicalFollowUpAppointmentDate;
    }

    if (healthInfo !== undefined) {
      guest.healthInfo = healthInfo;
    }

    await guest.save();

    const updatedBooking = await Booking.findById(bookingId)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds');

    res.status(200).json({
      message: "Medical appointment updated successfully",
      guest,
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Update medical appointment error:", error);
    res.status(500).json({ message: "Server error while updating medical appointment" });
  }
};

// Update guest form information
exports.updateGuestForm = async (req, res) => {
  try {
    const { bookingId, guestId } = req.params;
    const {
      // Existing fields
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
      emergencyContactRelationship,
      emergencyContactEmail,
      emergencyContactNumber,
      emergencyContactAddress,
      // New fields
      birthdate,
      nationality,
      mailingStreet,
      mailingCity,
      mailingState,
      mailingZip,
      roomPreference,
      singleSupplementSignature,
      singleSupplementAcknowledge,
      wantShared,
      roommatePreferences,
      bagSize,
      bagColor,
      bagMonogram,
      specialOccasionType,
      specialOccasionDate,
      specialOccasionComments,
      tAndCSignature,
      liabilitySignature,
      responsibilityInitial,
      cancellationRefundInitial,
      copiedFromGuestId
    } = req.body;

    const userEmail = req.user?.email || req.body?.email;

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    const validation = await validateBookingAndGuest(bookingId, guestId, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { guest, booking } = validation;

    // Update basic guest information
    if (name !== undefined) guest.name = name;
    if (age !== undefined) guest.age = age;
    if (gender !== undefined) guest.gender = gender;
    if (phone !== undefined) guest.phone = phone;
    if (country !== undefined) guest.country = country;
    if (state !== undefined) guest.state = state;
    if (address !== undefined) guest.address = address;

    // Update personal details
    if (birthdate !== undefined) guest.birthdate = birthdate;
    if (nationality !== undefined) guest.nationality = nationality;

    // Update mailing address
    if (mailingStreet !== undefined) guest.mailingStreet = mailingStreet;
    if (mailingCity !== undefined) guest.mailingCity = mailingCity;
    if (mailingState !== undefined) guest.mailingState = mailingState;
    if (mailingZip !== undefined) guest.mailingZip = mailingZip;

    // Update passport information
    if (passportNumber !== undefined) guest.passportNumber = passportNumber;
    if (passportCountry !== undefined) guest.passportCountry = passportCountry;
    if (passportIssuedOn !== undefined) guest.passportIssuedOn = passportIssuedOn;
    if (passportExpiresOn !== undefined) guest.passportExpiresOn = passportExpiresOn;

    // Validate passport 6-month rule if expiration date provided
    if (passportExpiresOn && booking?.tripId?.endDate) {
      const expiryDate = new Date(passportExpiresOn);
      const endDate = new Date(booking.tripId.endDate);
      const requiredDate = new Date(endDate);
      requiredDate.setMonth(requiredDate.getMonth() + 6);

      if (!guest.passportValidation) {
        guest.passportValidation = {};
      }
      guest.passportValidation.isValid6Months = expiryDate >= requiredDate;
      guest.passportValidation.travelEndDate = endDate;
      guest.passportValidation.requiredExpiryDate = requiredDate;
      guest.passportValidation.checkedAt = new Date();
    }

    // Update emergency contact
    if (emergencyContactName !== undefined) guest.emergencyContactName = emergencyContactName;
    if (emergencyContactRelationship !== undefined) guest.emergencyContactRelationship = emergencyContactRelationship;
    if (emergencyContactEmail !== undefined) guest.emergencyContactEmail = emergencyContactEmail;
    if (emergencyContactNumber !== undefined) guest.emergencyContactNumber = emergencyContactNumber;
    if (emergencyContactAddress !== undefined) guest.emergencyContactAddress = emergencyContactAddress;

    // Update room preferences
    if (roomPreference !== undefined) guest.roomPreference = roomPreference;

    if (singleSupplementSignature !== undefined || roomPreference?.includes('single')) {
      if (!guest.singleSupplementAcknowledge) {
        guest.singleSupplementAcknowledge = {};
      }
      if (singleSupplementSignature !== undefined) {
        guest.singleSupplementAcknowledge.signature = singleSupplementSignature;
        if (singleSupplementSignature && singleSupplementSignature.trim()) {
          guest.singleSupplementAcknowledge.acknowledged = true;
          guest.singleSupplementAcknowledge.acknowledgedAt = new Date();
        }
      }
    }

    // Update roommate preference
    if (wantShared !== undefined || roommatePreferences !== undefined) {
      if (!guest.roommatePreference) {
        guest.roommatePreference = {};
      }
      if (wantShared !== undefined) guest.roommatePreference.wantShared = wantShared;
      if (roommatePreferences !== undefined) guest.roommatePreference.preferences = roommatePreferences;
    }

    // Update travel bag preferences
    if (bagSize !== undefined || bagColor !== undefined || bagMonogram !== undefined) {
      if (!guest.travelBag) {
        guest.travelBag = {};
      }
      if (bagSize !== undefined) guest.travelBag.size = bagSize;
      if (bagColor !== undefined) guest.travelBag.color = bagColor;
      if (bagMonogram !== undefined) guest.travelBag.monogram = bagMonogram;
      if (bagSize || bagColor) {
        guest.travelBag.requestedAt = new Date();
      }
    }

    // Update special occasion
    if (specialOccasionType !== undefined || specialOccasionDate !== undefined || specialOccasionComments !== undefined) {
      if (!guest.specialOccasion) {
        guest.specialOccasion = {};
      }
      if (specialOccasionType !== undefined) guest.specialOccasion.type = specialOccasionType;
      if (specialOccasionDate !== undefined) guest.specialOccasion.date = specialOccasionDate;
      if (specialOccasionComments !== undefined) guest.specialOccasion.comments = specialOccasionComments;
      if (specialOccasionType && specialOccasionType.trim()) {
        guest.specialOccasion.notifiedAt = new Date();
      }
    }

    // Update legal forms and signatures
    if (tAndCSignature !== undefined || liabilitySignature !== undefined || responsibilityInitial !== undefined || cancellationRefundInitial !== undefined) {
      if (!guest.termsAcceptance) {
        guest.termsAcceptance = {};
      }
      if (tAndCSignature !== undefined) guest.termsAcceptance.tAndCSignature = tAndCSignature;
      if (liabilitySignature !== undefined) guest.termsAcceptance.liabilitySignature = liabilitySignature;
      if (responsibilityInitial !== undefined) guest.termsAcceptance.responsibilityInitial = responsibilityInitial;
      if (cancellationRefundInitial !== undefined) guest.termsAcceptance.cancellationRefundInitial = cancellationRefundInitial;

      if (tAndCSignature || liabilitySignature || responsibilityInitial || cancellationRefundInitial) {
        guest.termsAcceptance.acceptedAt = new Date();
      }
    }

    // Track data copy source
    if (copiedFromGuestId !== undefined) guest.copiedFromGuestId = copiedFromGuestId;

    await guest.save();

    const updatedBooking = await Booking.findById(bookingId)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds');

    res.status(200).json({
      message: "Guest information updated successfully",
      guest,
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Update guest form error:", error);
    res.status(500).json({ message: "Server error while updating guest information" });
  }
};

// Get specific guest information
exports.getGuest = async (req, res) => {
  try {
    const { bookingId, guestId } = req.params;
    const userEmail = req.user?.email || req.body?.email;

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    const validation = await validateBookingAndGuest(bookingId, guestId, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { guest } = validation;

    res.status(200).json({
      message: "Guest information retrieved successfully",
      guest
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

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    // Find user by email
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      userId: user._id
    }).populate('guestIds');

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.status(200).json({
      message: "Guests retrieved successfully",
      guests: booking.guestIds,
      totalGuests: booking.guestIds.length,
      booking
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
    booking.acknowledge = acknowledged;
    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds');

    res.status(200).json({
      message: "Acknowledgment status updated successfully",
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Update acknowledge error:", error);
    res.status(500).json({ message: "Server error while updating acknowledgment status" });
  }
};

// Add guests to an existing booking
exports.addGuests = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { guests } = req.body;
    const userEmail = req.user?.email || req.body?.email;

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    if (!guests || !Array.isArray(guests) || guests.length === 0) {
      return res.status(400).json({ message: "At least one guest is required" });
    }

    for (const guest of guests) {
      if (!guest.name || !guest.age) {
        return res.status(400).json({ message: "Each guest must have a name and age" });
      }
      if (guest.age < 1 || guest.age > 120) {
        return res.status(400).json({ message: "Guest age must be between 1 and 120" });
      }
    }

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const booking = await Booking.findOne({ _id: bookingId, userId: user._id });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // Create new guest documents
    const newGuestDocs = await Guest.insertMany(
      guests.map(g => ({
        userId: user._id,
        name: g.name.trim(),
        age: Number(g.age),
        registrationPayment: false
      }))
    );

    // Add the new guest IDs to the booking
    booking.guestIds.push(...newGuestDocs.map(g => g._id));
    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds');

    res.status(200).json({
      message: `${newGuestDocs.length} guest(s) added successfully`,
      guests: newGuestDocs,
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Add guests error:", error);
    res.status(500).json({ message: "Server error while adding guests" });
  }
};

// Update registration payment status
exports.updateRegistrationPayment = async (req, res) => {
  try {
    const { bookingId, guestId } = req.params;
    const { registrationPayment } = req.body;
    const userEmail = req.user?.email || req.body?.email;

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    if (typeof registrationPayment !== 'boolean') {
      return res.status(400).json({ message: "Registration payment status must be a boolean value" });
    }

    const validation = await validateBookingAndGuest(bookingId, guestId, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { guest } = validation;

    // Update registration payment status
    guest.registrationPayment = registrationPayment;
    await guest.save();

    const updatedBooking = await Booking.findById(bookingId)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds');

    res.status(200).json({
      message: "Registration payment status updated successfully",
      guest,
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Update registration payment error:", error);
    res.status(500).json({ message: "Server error while updating registration payment status" });
  }
};

// Delete a guest from an existing booking
exports.deleteGuest = async (req, res) => {
  try {
    const { bookingId, guestId } = req.params;
    const userEmail = req.user?.email || req.body?.email;

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    const validation = await validateBookingAndGuest(bookingId, guestId, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { booking, guest } = validation;

    // A booking must always have at least one guest
    if (booking.guestIds.length <= 1) {
      return res.status(400).json({ message: "A booking must have at least one traveler" });
    }

    // Remove guest ID from booking
    booking.guestIds = booking.guestIds.filter(id => id.toString() !== guestId);
    await booking.save();

    const updatedBooking = await Booking.findById(booking._id)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds');

    res.status(200).json({
      message: `${guest.name} removed successfully`,
      booking: updatedBooking
    });
  } catch (error) {
    console.error("Delete guest error:", error);
    res.status(500).json({ message: "Server error while deleting guest" });
  }
};
