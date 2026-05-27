// routes/guestRoutes.js
const express = require("express");
const guestController = require("../controllers/guestController");
const auth = require("../middleware/auth");
const { uploadSingleDocument } = require("../middleware/documentUpload");

const router = express.Router();

// 1. PASSPORT UPLOAD ROUTE
router.put("/passport-upload/:bookingId/:guestIndex", 
  auth, 
  uploadSingleDocument('passport'),
  guestController.uploadPassport
);

// 2. DOCUMENT UPLOAD ROUTE (Travel Insurance only)
router.put("/document-upload/:bookingId/:guestIndex",
  auth,
  uploadSingleDocument('travelInsurance'),
  guestController.uploadDocuments
);

// 2b. MEDICAL APPOINTMENT ROUTE
router.put("/medical-appointment/:bookingId/:guestIndex",
  auth,
  guestController.updateMedicalAppointment
);

// 3. FORM SUBMISSION ROUTE (Phone, Age, Name updates)
router.put("/form-submission/:bookingId/:guestIndex", 
  auth, 
  guestController.updateGuestForm
);

// 4. ACKNOWLEDGE ROUTE (Booking-level acknowledgment)
router.put("/acknowledge/:bookingId", 
  auth, 
  guestController.updateAcknowledge
);

// 5. ADD GUESTS TO EXISTING BOOKING
router.post("/add-guests/:bookingId", auth, guestController.addGuests);

// 6. DELETE A GUEST FROM AN EXISTING BOOKING
router.delete("/delete-guest/:bookingId/:guestIndex", auth, guestController.deleteGuest);

// Additional utility routes
// Get specific guest information
router.get("/get-guest/:bookingId/:guestIndex", auth, guestController.getGuest);

// Get all guests for a booking
router.get("/get-guests/:bookingId", auth, guestController.getGuests);

// Update registration payment status
router.put("/update-payment-status/:bookingId/:guestIndex", 
  auth, 
  guestController.updateRegistrationPayment
);

module.exports = router;