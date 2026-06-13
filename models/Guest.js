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
    // Personal Details
    birthdate: {
      type: Date,
    },
    nationality: {
      type: String,
      trim: true,
    },
    // Mailing Address
    mailingStreet: {
      type: String,
      trim: true,
    },
    mailingCity: {
      type: String,
      trim: true,
    },
    mailingState: {
      type: String,
      trim: true,
    },
    mailingZip: {
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
    passportValidation: {
      isValid6Months: Boolean,
      travelEndDate: Date,
      requiredExpiryDate: Date,
      checkedAt: Date,
    },
    passportApproval: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "pending",
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
      },
      rejectionReason: String,
      approvedAt: Date,
    },
    // Emergency Contact
    emergencyContactName: {
      type: String,
      trim: true,
    },
    emergencyContactRelationship: {
      type: String,
      trim: true,
    },
    emergencyContactEmail: {
      type: String,
      trim: true,
    },
    emergencyContactNumber: {
      type: String,
      trim: true,
    },
    emergencyContactAddress: {
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
    }],
    // Room Preferences
    roomPreference: {
      type: String,
      enum: ["single1bed", "single2bed", "shared1bed", "shared2bed"],
      trim: true,
    },
    singleSupplementAcknowledge: {
      acknowledged: Boolean,
      signature: String,
      acknowledgedAt: Date,
    },
    // Roommate Preference
    roommatePreference: {
      wantShared: Boolean,
      preferences: String,
    },
    // Travel Bag
    travelBag: {
      size: {
        type: String,
        enum: ["carryOn", "africaSize"],
      },
      color: String,
      monogram: String,
      requestedAt: Date,
    },
    // Special Occasion
    specialOccasion: {
      type: {
        type: String,
        enum: ["birthday", "anniversary", "other"],
      },
      date: Date,
      comments: String,
      notifiedAt: Date,
    },
    // Legal Forms & Signatures
    termsAcceptance: {
      tAndCSignature: String,
      liabilitySignature: String,
      responsibilityInitial: String,
      cancellationRefundInitial: String,
      acceptedAt: Date,
    },
    // Track data copy source
    copiedFromGuestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
    }
  },
  {
    timestamps: true,
  }
);

const Guest = mongoose.model("Guest", guestSchema);
module.exports = Guest;
