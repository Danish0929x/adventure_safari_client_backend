const mongoose = require('mongoose');
const User = require('../models/User');
const Booking = require('../models/Booking');
const Guest = require('../models/Guest');
const Trip = require('../models/Trip');
require('dotenv').config();

const resetDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/adventure-safari');
    console.log('Connected to MongoDB');

    // Delete all documents from collections
    console.log('Deleting all users...');
    const usersDeleted = await User.deleteMany({});
    console.log(`✓ Deleted ${usersDeleted.deletedCount} users`);

    console.log('Deleting all guests...');
    const guestsDeleted = await Guest.deleteMany({});
    console.log(`✓ Deleted ${guestsDeleted.deletedCount} guests`);

    console.log('Deleting all bookings...');
    const bookingsDeleted = await Booking.deleteMany({});
    console.log(`✓ Deleted ${bookingsDeleted.deletedCount} bookings`);

    console.log('\n📊 Database Reset Summary:');
    console.log('─────────────────────────');
    console.log(`Users deleted:    ${usersDeleted.deletedCount}`);
    console.log(`Guests deleted:   ${guestsDeleted.deletedCount}`);
    console.log(`Bookings deleted: ${bookingsDeleted.deletedCount}`);
    console.log('─────────────────────────');
    console.log('\n✅ Database reset complete!');

    // Disconnect
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error resetting database:', error.message);
    process.exit(1);
  }
};

// Run the script
resetDatabase();
