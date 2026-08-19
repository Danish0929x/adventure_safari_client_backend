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