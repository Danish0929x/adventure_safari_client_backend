const mongoose = require("mongoose");

// Guest Schema
const guestSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    age: {
      type: Number,
      required: true,
      min: 0,
    },
    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },
    phone: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    // Passport Information
    passport: {
      type: String,
      trim: true,
    },
    passportNumber: {
      type: String,
      trim: true,
    },
    passportCountry: {
      type: String,
      trim: true,
    },
    passportIssuedOn: {
      type: Date,
    },
    passportExpiresOn: {
      type: Date,
    },
    // Emergency Contact
    emergencyContactName: {
      type: String,
      trim: true,
    },
    emergencyContactNumber: {
      type: String,
      trim: true,
    },
    // Documents
    medicalCertificate: {
      type: String,
      trim: true,
    },
    travelInsurance: {
      type: String,
      trim: true,
    }
  },
  {
    timestamps: true,
  }
);

// Trip Schema
const tripSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Booking Schema
const bookingSchema = new mongoose.Schema(
  {
    tripId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trip",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    bookingId: {
      type: String,
      required: true,
    },
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    guests: [guestSchema], // Array of guest subdocuments
    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled", "completed"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "refunded"],
      default: "pending",
    },
    registrationPaymentDetails: {
      transactionId: String,
      paymentDate: Date,
      amount: Number,
      currency: String,
      payerEmail: String,
      payerName: String,
      status: {
        type: String,
        enum: ["pending", "paid", "refunded"],
        default: "pending"
      }
    },
     acknowledge: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
  }
);

// Export models
const Guest = mongoose.model("Guest", guestSchema);
const Trip = mongoose.model("Trip", tripSchema);
const Booking = mongoose.model("Booking", bookingSchema);

module.exports = {
  Guest,
  Trip,
  Booking,
};