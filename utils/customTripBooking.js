const Booking = require("../models/Booking");
const Trip = require("../models/Trip");
const { buildBookingReference } = require("./reference");

// A custom trip is assigned and booked in one act: the booking exists from the
// moment the customer is put on the trip, and they fill in their guests later.
async function ensureCustomTripBooking(trip, userId) {
  const existing = await Booking.findOne({ tripId: trip._id, userId });
  if (existing) return existing;

  const booking = new Booking({
    tripId: trip._id,
    userId,
    bookingId: buildBookingReference(trip, new Date()),
    guestIds: [],
    // Never priced here: a custom trip may still be awaiting its quote.
    guestPricing: [],
    tripTotal: 0,
  });

  await booking.save();
  return booking;
}

async function ensureCustomTripBookings(trip, userIds = []) {
  const bookings = [];
  for (const userId of userIds) {
    bookings.push(await ensureCustomTripBooking(trip, userId));
  }
  return bookings;
}

// Only an untouched booking goes. Once guests are on it, it stands on its own.
async function removeEmptyCustomTripBooking(tripId, userId) {
  const result = await Booking.deleteOne({
    tripId,
    userId,
    guestIds: { $size: 0 },
  });
  return result.deletedCount > 0;
}

// Every custom trip this user is on, booked. Run after a new account is linked
// to whatever it was invited to.
async function ensureBookingsForUser(userId) {
  const trips = await Trip.find({ isCustom: true, assignedUserIds: userId });

  const bookings = [];
  for (const trip of trips) {
    bookings.push(await ensureCustomTripBooking(trip, userId));
  }
  return bookings;
}

module.exports = {
  ensureCustomTripBooking,
  ensureCustomTripBookings,
  removeEmptyCustomTripBooking,
  ensureBookingsForUser,
};
