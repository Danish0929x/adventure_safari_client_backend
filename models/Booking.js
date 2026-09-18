const mongoose = require("mongoose");

// What one traveller was quoted, frozen at the moment the booking was made.
// `tripCost` is the declared trip cost that traveller's insurance is written
// against, so it is stored rather than recomputed — later edits to the trip's
// price list must not move it.
const guestPricingSchema = new mongoose.Schema(
  {
    guestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    },
    tierCode: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    tripCost: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

// Which set of dates this booking is for, frozen at the moment it was made.
// The trip's departures can be renamed, moved or removed afterwards, and none
// of that may change the dates someone was already sold — so the booking keeps
// its own copy rather than pointing at the trip and reading it back later.
//
// `departureId` is kept alongside so a booking can still be matched to the
// departure it came from while that departure exists.
const departureSnapshotSchema = new mongoose.Schema(
  {
    departureId: { type: mongoose.Schema.Types.ObjectId, default: null },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
  },
  { _id: false }
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
    // The first day of travel. For a trip with dates this is the chosen
    // departure's start date, not a date the customer typed — picking those
    // apart is what `departure` below is for.
    bookingDate: {
      type: Date,
      default: Date.now,
    },
    // Null only for an evergreen trip, which has no fixed dates to choose from,
    // and for bookings made before departures existed.
    departure: {
      type: departureSnapshotSchema,
      default: null,
    },
    travelKey: {
      type: String,
      trim: true,
      default: "",
    },
    guestIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    }],
    // Per-traveller trip cost, frozen at booking time. Bookings made before
    // per-traveller pricing have none, and fall back to trip price x head count.
    guestPricing: {
      type: [guestPricingSchema],
      default: [],
    },
    tripTotal: {
      type: Number,
      default: 0,
    },
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
      requiredAmount: {
        type: Number,
        default: function() {
          return (this.guestIds?.length || 0) * 25; // $25 per guest
        }
      },
      paidGuestIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Guest"
      }],
      transactions: [{
        transactionId: String,
        guestId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Guest",
          required: true
        },
        amount: Number,
        currency: String,
        paymentDate: { type: Date, default: Date.now },
        payerEmail: String,
        payerName: String,
        status: {
          type: String,
          enum: ["pending", "completed", "failed"],
          default: "pending"
        }
      }]
    },
    finalPayment: {
      installmentsEnabled: {
        type: Boolean,
        default: false
      },
      totalAmount: Number,
      installments: [{
        amount: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        status: {
          type: String,
          enum: ["pending", "paid"],
          default: "pending"
        },
        transactionId: String,
        paidAt: Date,
        payerEmail: String,
        payerName: String
      }]
    },
     acknowledge: {
      type: Boolean,
      default: false
    },
    airTravel: {
      arrangedBy: {
        type: String,
        enum: ["self", "company"],
      },
      ticketUrl: {
        type: String,
        trim: true,
        default: "",
      },
      ticketPublicId: {
        type: String,
        default: "",
      },
      uploadedBy: {
        type: String,
        enum: ["client", "admin"],
      },
      uploadedAt: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
  }
);

// Export models
const Booking = mongoose.model("Booking", bookingSchema);

module.exports = Booking;