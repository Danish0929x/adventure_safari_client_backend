const Booking = require("../models/Booking")
const Trip = require("../models/Trip")
const Guest = require("../models/Guest")
const User = require("../models/User")
const { buildGuestPricing } = require("../utils/pricing")
const { buildBookingReference } = require("../utils/reference")
const { isAssignedTo } = require("../utils/assignment")
const { hasTripEnded } = require("../utils/schedule")
const { resolveDepartureForBooking, snapshotDeparture } = require("../utils/departures")

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

    // Custom trips are built by an admin for one specific customer, so they
    // stay out of the public catalogue and are only visible to that customer.
    // An archived trip is out of circulation — it stays in the database for the
    // bookings that point at it, but no customer sees it again.
    filter.isArchived = { $ne: true }

    let customTripFilter = { isCustom: { $ne: true } }

    const requestingUserEmail = req.user?.email
    if (requestingUserEmail) {
      const user = await User.findOne({ email: requestingUserEmail })
      if (user) {
        // A custom trip may be shared by several customers, so match either the
        // list or the single field trips assigned before the list existed.
        customTripFilter = {
          $or: [
            { isCustom: { $ne: true } },
            { isCustom: true, assignedUserIds: user._id },
            { isCustom: true, assignedUserId: user._id }
          ]
        }
      }
    }

    const trips = await Trip.find({ ...filter, ...customTripFilter }).sort({ createdAt: -1 })

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
      .populate('tripId', 'name destination price pricing image wetuLink')
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
    // `guestTiers` maps an existing guest id to the traveller type chosen for
    // them; new guests carry their own `tierCode`. Both are optional — a trip
    // with a single traveller type resolves without either.
    const { tripId, guestIds = [], newGuests = [], guestTiers = {}, departureId, date } = req.body
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

    // Validate new guest data. The client asks for a birthdate and sends the age
    // it resolves to on the trip's first day, so age 0 is a legitimate value here.
    for (const guest of newGuests) {
      const guestAge = Number(guest.age)
      if (!guest.name || !Number.isFinite(guestAge) || guestAge < 0 || guestAge > 120) {
        return res.status(400).json({
          message: "Each new guest must have a valid name and birthdate"
        })
      }
      if (guest.birthdate && isNaN(new Date(guest.birthdate).getTime())) {
        return res.status(400).json({
          message: "Each new guest must have a valid birthdate"
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

    // The sweep that retires finished trips runs periodically, so a trip that
    // ended overnight can still be flagged active for a few hours. Check the
    // date directly rather than trusting isActive alone.
    if (trip.isArchived) {
      return res.status(400).json({ message: "This trip is no longer available" })
    }

    if (hasTripEnded(trip)) {
      return res.status(400).json({ message: "This trip has already finished" })
    }

    // Which dates this booking is for. A trip that runs once resolves without
    // being asked; one that runs several times has to be told which departure,
    // because the dates are the product here and guessing sells the wrong one.
    let departure
    try {
      departure = resolveDepartureForBooking(trip, departureId)
    } catch (departureError) {
      return res.status(400).json({ message: departureError.message })
    }

    // Travel starts on the departure's first day. Only an evergreen trip — one
    // with no dates at all — still takes a date from the customer, because
    // there is nothing on the trip to take it from.
    let bookingDate
    if (departure) {
      bookingDate = new Date(departure.startDate)
    } else {
      if (!date) {
        return res.status(400).json({ message: "Booking date is required" })
      }
      bookingDate = new Date(date)
      if (isNaN(bookingDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" })
      }
    }

    // Check if user exists
    const user = await User.findOne({ email: userEmail })
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // A custom trip is bookable only by the customers it was sent to. Several
    // may share it — each books separately and gets their own booking number.
    if (trip.isCustom && !isAssignedTo(trip, user._id)) {
      return res.status(403).json({ message: "This trip is not available for booking" })
    }

    // Validate and collect existing guest IDs
    const finalGuestIds = [];
    // Everyone on the booking, in one list, so each can be priced below.
    const travellers = [];

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
      travellers.push(...existingGuests.map(g => ({
        guestId: g._id,
        name: g.name,
        age: g.age,
        tierCode: guestTiers[String(g._id)]
      })))
    }

    // Create new guests and collect their IDs
    const createdGuestIds = []
    if (newGuests && newGuests.length > 0) {
      const createdGuests = await Guest.insertMany(
        newGuests.map(g => ({
          userId: user._id,
          name: g.name.trim(),
          age: Number(g.age),
          ...(g.birthdate ? { birthdate: new Date(g.birthdate) } : {}),
          registrationPayment: false
        }))
      )

      finalGuestIds.push(...createdGuests.map(g => g._id))
      createdGuestIds.push(...createdGuests.map(g => g._id))
      travellers.push(...createdGuests.map((g, i) => ({
        guestId: g._id,
        name: g.name,
        age: g.age,
        tierCode: newGuests[i]?.tierCode
      })))
    }

    // Freeze what each traveller is being charged. This snapshot is the trip
    // cost their insurance is declared against, so it is stored on the booking
    // rather than read back off the trip, which the admin may later reprice.
    let guestPricing
    let tripTotal
    try {
      ({ guestPricing, tripTotal } = buildGuestPricing(trip, travellers))
    } catch (pricingError) {
      // The guests just created would otherwise be left orphaned on a failure.
      await Guest.deleteMany({ _id: { $in: createdGuestIds } })
      return res.status(400).json({ message: pricingError.message })
    }

    // A custom trip is booked the moment the admin assigns it, so the customer
    // may already have an empty booking waiting. Filling it is the whole point —
    // creating a second one here would split their trip in two.
    const pendingBooking = await Booking.findOne({
      tripId,
      userId: user._id,
      guestIds: { $size: 0 }
    })

    let booking
    if (pendingBooking) {
      pendingBooking.guestIds = finalGuestIds
      pendingBooking.guestPricing = guestPricing
      pendingBooking.tripTotal = tripTotal
      pendingBooking.bookingDate = bookingDate
      pendingBooking.departure = snapshotDeparture(departure)
      // A schema default, so it was fixed at 0 when the booking was created and
      // will not recompute on its own.
      if (!pendingBooking.registrationPaymentDetails) {
        pendingBooking.registrationPaymentDetails = { transactions: [] }
      }
      pendingBooking.registrationPaymentDetails.requiredAmount = finalGuestIds.length * 25
      // The reference keeps its original value — the admin may already have quoted it.
      booking = pendingBooking
    } else {
      // Catalogue and custom trips are referenced identically — one generator,
      // no branch on isCustom.
      booking = new Booking({
        tripId,
        userId: user._id,
        bookingId: buildBookingReference(trip, bookingDate),
        guestIds: finalGuestIds,
        guestPricing,
        tripTotal,
        bookingDate: bookingDate,
        // Frozen, not a reference: editing the trip's dates later must not move
        // the dates someone has already booked and paid against.
        departure: snapshotDeparture(departure)
      })
    }

    await booking.save()

    // Populate trip, user, and guest details for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate('tripId', 'name destination price pricing image wetuLink')
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
      .populate('tripId', 'name destination price pricing image wetuLink')
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