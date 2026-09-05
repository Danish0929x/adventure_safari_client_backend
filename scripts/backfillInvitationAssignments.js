// Invitations accepted before the acceptance step assigned the trip left their
// users unassigned, so the trip they were invited to stayed invisible to them.
// This reconciles those: every accepted invitation puts its user on its trip.
//
// Idempotent — $addToSet means re-running it changes nothing.
//
//   node scripts/backfillInvitationAssignments.js

const mongoose = require('mongoose');
const Invitation = require('../models/Invitation');
const Trip = require('../models/Trip');
require('dotenv').config();

const backfill = async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const accepted = await Invitation.find({ status: 'accepted' });
  console.log(`Found ${accepted.length} accepted invitation(s)`);

  let assigned = 0;
  let skipped = 0;

  for (const invitation of accepted) {
    if (!invitation.tripId || !invitation.userId) {
      skipped++;
      continue;
    }

    const result = await Trip.updateOne(
      { _id: invitation.tripId },
      { $addToSet: { assignedUserIds: invitation.userId } }
    );

    // modifiedCount is 0 when the user was already on the trip.
    if (result.modifiedCount > 0) {
      assigned++;
      console.log(`  Assigned ${invitation.email} to trip ${invitation.tripId}`);
    }
  }

  console.log(`\nDone: ${assigned} newly assigned, ${skipped} skipped (incomplete), ` +
    `${accepted.length - assigned - skipped} already correct`);

  await mongoose.disconnect();
};

backfill().catch((error) => {
  console.error('Backfill failed:', error);
  process.exit(1);
});
