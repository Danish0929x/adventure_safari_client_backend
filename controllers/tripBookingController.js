const Booking = require("../models/Booking")
const Trip = require("../models/Trip")
const Guest = require("../models/Guest")
const User = require("../models/User")

// Get existing guests for authenticated user
exports.getExistingGuests = async (req, res) => {
  try {
    const userEmail = req.user?.email || req.body?.email;

    // Check if user exists
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get all guests for this user
    const guests = await Guest.find({ userId: user._id }).sort({ createdAt: -1 });

    res.json({
      message: "Existing guests retrieved successfully",
      guests,
      count: guests.length
    });
  } catch (error) {
    console.error("Get existing guests error:", error);
    res.status(500).json({ message: "Server error while fetching guests" });
  }
};

// Get all trips
exports.getAllTrips = async (req, res) => {
  try {
    const { isActive } = req.query
    
    // Build filter object
    let filter = {}
    if (isActive !== undefined) {
      filter.isActive = isActive === 'true'
    }

    const trips = await Trip.find(filter).sort({ createdAt: -1 })

    res.json({
      message: "Trips retrieved successfully",
      trips,
      count: trips.length
    })
  } catch (error) {
    console.error("Get all trips error:", error)
    res.status(500).json({ message: "Server error while fetching trips" })
  }
}

// Get single booking
exports.getBookingById = async (req, res) => {
  console.log("Hoo")
  try {
    const { id } = req.params
    const requestingUserEmail = req.user?.email || req.body?.email

    // Find authenticated user by email
    const user = await User.findOne({ email: requestingUserEmail })
    if (!user) {
      return res.status(404).json({ message: "Authenticated user not found" })
    }

    // Find booking by ID and ensure it belongs to the requesting user
    const booking = await Booking.findOne({
      _id: id,
      userId: user._id
    })
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds')

    if (!booking) {
      return res.status(404).json({ message: "Booking not found or access denied" })
    }

    res.json({
      message: "Booking retrieved successfully",
      booking
    })
  } catch (error) {
    console.error("Get booking by ID error:", error)
    
    // Handle invalid ObjectId format
    if (error.name === 'CastError') {
      return res.status(400).json({ message: "Invalid booking ID format" })
    }
    
    res.status(500).json({ message: "Server error while fetching booking" })
  }
}

// Create booking
exports.createBooking = async (req, res) => {
  try {
    const { tripId, guestIds = [], newGuests = [], date } = req.body
    const userEmail = req.user?.email || req.body?.email

    // Validate required fields
    if (!tripId) {
      return res.status(400).json({
        message: "Trip ID is required"
      })
    }

    if ((!guestIds || guestIds.length === 0) && (!newGuests || newGuests.length === 0)) {
      return res.status(400).json({
        message: "At least one guest (existing or new) is required"
      })
    }

    // Validate date
    if (!date) {
      return res.status(400).json({
        message: "Booking date is required"
      })
    }

    const bookingDate = new Date(date)
    if (isNaN(bookingDate.getTime())) {
      return res.status(400).json({
        message: "Invalid date format"
      })
    }

    // Validate new guest data
    for (const guest of newGuests) {
      if (!guest.name || !guest.age || guest.age < 0) {
        return res.status(400).json({
          message: "Each new guest must have a valid name and age"
        })
      }
    }

    // Check if trip exists and is active
    const trip = await Trip.findById(tripId)
    if (!trip) {
      return res.status(404).json({ message: "Trip not found" })
    }

    if (!trip.isActive) {
      return res.status(400).json({ message: "Trip is not available for booking" })
    }

    // Check if user exists
    const user = await User.findOne({ email: userEmail })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Validate and collect existing guest IDs
    const finalGuestIds = [];
    if (guestIds && guestIds.length > 0) {
      const existingGuests = await Guest.find({
        _id: { $in: guestIds },
        userId: user._id
      })

      if (existingGuests.length !== guestIds.length) {
        return res.status(400).json({
          message: "Some guest IDs are invalid or don't belong to you"
        })
      }

      finalGuestIds.push(...guestIds)
    }

    // Create new guests and collect their IDs
    if (newGuests && newGuests.length > 0) {
      const createdGuests = await Guest.insertMany(
        newGuests.map(g => ({
          userId: user._id,
          name: g.name.trim(),
          age: Number(g.age),
          registrationPayment: false
        }))
      )

      finalGuestIds.push(...createdGuests.map(g => g._id))
    }

    // Generate booking ID
    const generateBookingId = (safariName, bookingDate) => {
      // Clean safari name: remove spaces, convert to uppercase, take first 3-4 chars
      const cleanSafariName = safariName
        .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
        .toUpperCase()
        .substring(0, 4) // Take first 4 characters
        .padEnd(3, 'X') // Ensure at least 3 characters, pad with 'X' if needed

      // Format date as YYYYMMDD
      const formattedDate = bookingDate.toISOString().slice(0, 10).replace(/-/g, '')

      // Generate 5-digit random number
      const randomNumber = Math.floor(10000 + Math.random() * 90000)

      return `${cleanSafariName}-${formattedDate}-${randomNumber}`
    }

    const bookingId = generateBookingId(trip.name, bookingDate)

    // Create booking with guest IDs
    const booking = new Booking({
      tripId,
      userId: user._id,
      bookingId,
      guestIds: finalGuestIds,
      bookingDate: bookingDate
    })

    await booking.save()

    // Populate trip, user, and guest details for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds')

    res.status(201).json({
      message: "Booking created successfully",
      booking: populatedBooking
    })
  } catch (error) {
    console.error("Create booking error:", error)
    res.status(500).json({ message: "Server error while creating booking" })
  }
}

// Get all bookings for authenticated user
exports.getAllBookings = async (req, res) => {
  try {
    const { bookingStatus, paymentStatus } = req.query
    const requestingUserEmail = req.user?.email || req.body?.email

    // Build filter object
    let filter = {}
    
    // Find authenticated user by email
    const user = await User.findOne({ email: requestingUserEmail })
    if (!user) {
      return res.status(404).json({ message: "Authenticated user not found" })
    }
    filter.userId = user._id

    if (bookingStatus) {
      filter.bookingStatus = bookingStatus
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus
    }

    const bookings = await Booking.find(filter)
      .populate('tripId', 'name destination price image')
      .populate('userId', 'name email')
      .populate('guestIds')
      .sort({ createdAt: -1 })

    res.json({
      message: "Bookings retrieved successfully",
      bookings,
      count: bookings.length
    })
  } catch (error) {
    console.error("Get all bookings error:", error)
    res.status(500).json({ message: "Server error while fetching bookings" })
  }
}


exports.updateAcknowledge = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { acknowledge } = req.body;
    const userEmail = req.user?.email || req.body?.email;

    console.log('Update acknowledge status:', { bookingId, userEmail, acknowledge });

    if (!userEmail) {
      return res.status(401).json({ message: "User email not found in request" });
    }

    if (typeof acknowledge !== 'boolean') {
      return res.status(400).json({ message: "Acknowledge status must be a boolean value" });
    }

    const validation = await validateBooking(bookingId, userEmail);
    if (validation.error) {
      return res.status(validation.status).json({ message: validation.error });
    }

    const { booking } = validation;

    // Update acknowledge status
    booking.acknowledge = acknowledge;
    await booking.save();

    res.status(200).json({
      message: "Acknowledge status updated successfully",
      acknowledge: booking.acknowledge,
      booking: booking
    });
  } catch (error) {
    console.error("Update acknowledge error:", error);
    res.status(500).json({ message: "Server error while updating acknowledge status" });
  }
};