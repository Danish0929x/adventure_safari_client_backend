// A custom trip is often sold to several parties at once — two couples on the
// same safari, say. Each assigned customer sees the trip, books it themselves,
// and gets a booking (and booking number) of their own; the bookings are tied
// back together by the trip they all point at.
//
// `assignedUserIds` is the list. `assignedUserId` is the single field that came
// before it and is still carried on trips assigned back then, so every read
// goes through here rather than touching either field directly.

function resolveAssignedUserIds(trip) {
  if (trip?.assignedUserIds?.length) {
    return trip.assignedUserIds.map((id) => String(id?._id || id));
  }
  return trip?.assignedUserId ? [String(trip.assignedUserId?._id || trip.assignedUserId)] : [];
}

function isAssignedTo(trip, userId) {
  return resolveAssignedUserIds(trip).includes(String(userId));
}

// Turns whatever the trip form submitted into a clean, de-duplicated list.
// Accepts the list, the legacy single value, or both.
function normalizeAssignedUserIds(input, legacySingle) {
  const raw = Array.isArray(input) ? input : input ? [input] : [];
  if (raw.length === 0 && legacySingle) raw.push(legacySingle);

  const seen = new Set();
  for (const value of raw) {
    const id = String(value?._id || value || "").trim();
    if (id) seen.add(id);
  }
  return [...seen];
}

module.exports = { resolveAssignedUserIds, isAssignedTo, normalizeAssignedUserIds };
