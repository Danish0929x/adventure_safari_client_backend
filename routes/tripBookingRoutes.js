const express = require("express")
const auth = require("../middleware/auth")
const {
  getAllTrips,
  createBooking,
  getAllBookings,
  getBookingById,
  getExistingGuests
} = require("../controllers/tripBookingController.js")

const router = express.Router()

// Get all trips (public route - no auth required)
router.get("/trips", getAllTrips)

// Get existing guests for authenticated user
router.get("/guests/existing", auth, getExistingGuests)

// Create booking (requires authentication)
router.post("/bookings", auth, createBooking)

// Get all bookings (requires authentication)
router.get("/bookings", auth, getAllBookings)
router.get('/:id', auth, getBookingById); // New route for single booking


module.exports = router