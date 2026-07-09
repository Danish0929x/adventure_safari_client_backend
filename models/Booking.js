const mongoose = require("mongoose");

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
    guestIds: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "Guest",
      required: true,
    }],
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