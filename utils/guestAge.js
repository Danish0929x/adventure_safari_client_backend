const Booking = require("../models/Booking");
const Guest = require("../models/Guest");
const { startOfToday } = require("./schedule");

const MAX_AGE = 120;

// Birthdates are calendar dates stored at midnight UTC, so every comparison uses UTC.
function ageOnDate(birthdate, onDate) {
  if (!birthdate || !onDate) return null;
  const born = new Date(birthdate);
  const on = new Date(onDate);
  let age = on.getUTCFullYear() - born.getUTCFullYear();
  const hadBirthday =
    on.getUTCMonth() > born.getUTCMonth() ||
    (on.getUTCMonth() === born.getUTCMonth() && on.getUTCDate() >= born.getUTCDate());
  if (!hadBirthday) age -= 1;
  return age;
}

// Returns a UTC-midnight Date for a valid `YYYY-MM-DD` birthdate, or null.
function parseBirthdate(value, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || "").trim());
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  const age = ageOnDate(date, startOfToday(now));
  if (age < 0 || age > MAX_AGE) return null;
  return date;
}

function tripStartForBooking(booking) {
  return booking?.departure?.startDate || booking?.bookingDate || null;
}

function tripEndForBooking(booking, trip) {
  return booking?.departure?.endDate || trip?.endDate || null;
}

// Age today, frozen at the age on the last day of the trip once it is over.
function currentAgeForBooking(birthdate, booking, trip, now = new Date()) {
  const today = startOfToday(now);
  const end = tripEndForBooking(booking, trip);
  const reference = end && new Date(end) < today ? end : today;
  return ageOnDate(birthdate, reference);
}

// Run daily: brings guests' stored ages up to date for every booking whose trip
// has not finished. Guests whose trips are all over keep the age they had on the last day.
async function refreshGuestAges(now = new Date()) {
  const today = startOfToday(now);
  const bookings = await Booking.find({})
    .select("guestIds departure tripId")
    .populate("tripId", "endDate status");

  const guestIds = new Set();
  for (const booking of bookings) {
    if (booking.tripId?.status === "voided") continue;
    const end = tripEndForBooking(booking, booking.tripId);
    if (end && new Date(end) < today) continue;
    booking.guestIds.forEach((id) => guestIds.add(String(id)));
  }
  if (guestIds.size === 0) return 0;

  const guests = await Guest.find({ _id: { $in: [...guestIds] }, birthdate: { $ne: null } })
    .select("birthdate age");

  const updates = guests
    .map((guest) => ({ guest, age: ageOnDate(guest.birthdate, today) }))
    .filter(({ guest, age }) => age !== null && age >= 0 && age !== guest.age)
    .map(({ guest, age }) => ({
      updateOne: { filter: { _id: guest._id }, update: { $set: { age } } },
    }));

  if (updates.length) await Guest.bulkWrite(updates);
  return updates.length;
}

function scheduleGuestAgeRefresh(intervalMs = 6 * 60 * 60 * 1000) {
  const run = () =>
    refreshGuestAges()
      .then((count) => count && console.log(`Guest ages refreshed: ${count}`))
      .catch((err) => console.error("Guest age refresh failed:", err));
  run();
  return setInterval(run, intervalMs);
}

module.exports = {
  MAX_AGE,
  ageOnDate,
  parseBirthdate,
  tripStartForBooking,
  tripEndForBooking,
  currentAgeForBooking,
  refreshGuestAges,
  scheduleGuestAgeRefresh,
};
