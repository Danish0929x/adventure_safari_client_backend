const mongoose = require("mongoose");

// One traveller type on a trip: what an adult costs, what a child costs, and
// the age range each covers so a guest can be matched to one automatically.
const pricingTierSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    ageMin: { type: Number, min: 0 },
    ageMax: { type: Number, min: 0 },
  },
  { _id: false }
);

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
    // Trips are quoted per traveller type. `price` above stays as the cheapest
    // of these, so the catalogue can keep showing a single "from" figure.
    pricing: {
      type: [pricingTierSchema],
      default: [],
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
