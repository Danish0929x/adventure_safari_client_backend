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
    // A catalogue trip always carries a figure. A custom trip is quoted for one
    // customer and is often built before that quote is settled, so it may be
    // saved unpriced and priced later — `null` until then, never 0, which would
    // read as free.
    price: {
      type: Number,
      default: null,
      required: [
        function () {
          return !this.isCustom;
        },
        "A catalog trip needs a price",
      ],
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
    // The customers this trip was sent to. Two couples on the same safari each
    // book separately, so several customers can share one custom trip.
    assignedUserIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    // Superseded by assignedUserIds, and kept only so trips assigned before
    // several customers were supported keep working. Mirrors the first entry
    // above. Read it through resolveAssignedUserIds(), never directly.
    assignedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    // When the trip runs. Both are optional: a catalogue trip with no dates is
    // an evergreen product that never retires on its own. A trip that does
    // carry an end date is deactivated automatically the day after it ends.
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // A trip is archived a month after it ends: out of the working list, but
    // never deleted, because bookings still point at it.
    isArchived: {
      type: Boolean,
      default: false,
    },
    archivedAt: {
      type: Date,
      default: null,
    }
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Trip", tripSchema);
