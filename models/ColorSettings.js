const mongoose = require("mongoose");

const colorSettingsSchema = new mongoose.Schema(
  {
    colors: [
      {
        name: {
          type: String,
          required: true,
        },
        hexCode: {
          type: String,
          required: true,
        },
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("ColorSettings", colorSettingsSchema);
