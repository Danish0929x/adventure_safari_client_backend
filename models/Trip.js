const mongoose = require("mongoose");

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
    },
    image: {
      type: String,
      required: true,
    },
    // Link to the Wetu itinerary for this trip
    wetuLink: {
      type: String,
      trim: true,
      default: "",
    },
    // Custom trips are built by an admin for one specific customer and are
    // kept out of the public trip catalogue.
    isCustom: {
      type: Boolean,
      default: false,
    },
    assignedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Trip", tripSchema);
