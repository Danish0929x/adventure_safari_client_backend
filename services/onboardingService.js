const invitationService = require("./invitationService");
const { ensureBookingsForUser } = require("../utils/customTripBooking");

// A new account picks up whatever it was invited to, then gets a booking for
// every custom trip it is on. Never fatal: signing up must not fail because of
// this, so a failure is logged and the account still stands.
async function linkCustomTripsForNewUser(user) {
  if (!user?.email) return;

  try {
    await invitationService.acceptPendingByEmail(user.email, user._id);
    await ensureBookingsForUser(user._id);
  } catch (error) {
    console.warn("Custom trip linking failed:", error.message);
  }
}

module.exports = { linkCustomTripsForNewUser };
