const mongoose = require("mongoose");

const guestSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
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
    // Medical Appointment
    medicalAppointmentDate: {
      type: Date,
    },
    medicalAppointmentCompleted: {
      type: Boolean,
      default: false,
    },
    // Documents
    travelInsurance: {
      type: String,
      trim: true,
    },
    previousPassports: [{
      url: String,
      replacedAt: { type: Date, default: Date.now }
    }]
  },
  {
    timestamps: true,
  }
);

const Guest = mongoose.model("Guest", guestSchema);
module.exports = Guest;
