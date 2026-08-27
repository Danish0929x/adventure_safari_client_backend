// Every trip is referenced the same way, catalogue or custom. A custom trip is
// only a trip an admin built for one customer — it is not a different kind of
// thing, so it must not read as one. This is the single place that decides what
// a reference looks like; both trip types go through it.

// Four characters taken from the trip's name, padded when the name is too
// short. Padding to four (not three) is what keeps every reference the same
// shape — a trip called "Kenya" and one called "A" both yield four characters.
function tripPrefix(trip) {
  return String(trip?.name || "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .substring(0, 4)
    .padEnd(4, "X");
}

// PREFIX-YYYYMMDD-NNNNN, e.g. AFRI-20260827-48213.
function buildBookingReference(trip, bookingDate) {
  const date = new Date(bookingDate).toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.floor(10000 + Math.random() * 90000);
  return `${tripPrefix(trip)}-${date}-${random}`;
}

// A short, stable, readable stand-in for the trip's raw database id, so the
// admin has something quotable. Derived rather than stored, so it needs no
// migration and cannot drift out of step with the trip.
function tripReference(trip) {
  const tail = String(trip?._id || "").slice(-5).toUpperCase();
  return tail ? `${tripPrefix(trip)}-${tail}` : tripPrefix(trip);
}

module.exports = { tripPrefix, buildBookingReference, tripReference };
