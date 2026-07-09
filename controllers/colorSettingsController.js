const ColorSettings = require("../models/ColorSettings");

// Default bag colors
const DEFAULT_COLORS = [
  { name: "Black", hexCode: "#000000", isActive: true },
  { name: "Navy Blue", hexCode: "#001f3f", isActive: true },
  { name: "Olive Green", hexCode: "#556B2F", isActive: true },
  { name: "Chocolate Brown", hexCode: "#8B4513", isActive: true },
  { name: "Forest Green", hexCode: "#228B22", isActive: true },
  { name: "Burgundy", hexCode: "#800020", isActive: true },
  { name: "Tan", hexCode: "#D2B48C", isActive: true },
  { name: "Charcoal Gray", hexCode: "#36454F", isActive: true },
  { name: "Slate Blue", hexCode: "#6A5ACD", isActive: true },
  { name: "Teal", hexCode: "#008080", isActive: true },
  { name: "Rust Orange", hexCode: "#B7410E", isActive: true },
  { name: "Deep Red", hexCode: "#9B111E", isActive: true },
];

// Get enabled bag colors (public endpoint)
exports.getEnabledColors = async (req, res) => {
  try {
    let settings = await ColorSettings.findOne();

    // If no settings exist, create default settings
    if (!settings) {
      settings = new ColorSettings({
        colors: DEFAULT_COLORS,
      });

      await settings.save();
    }

    // Filter only active colors for public response
    const enabledColors = settings.colors
      .filter(color => color.isActive)
      .map(color => ({
        name: color.name,
        hex: color.hexCode
      }));

    return res.status(200).json({
      success: true,
      data: enabledColors,
    });
  } catch (error) {
    console.error("Error fetching enabled colors:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch colors.",
    });
  }
};

// Get all color settings (admin only)
exports.getAllColorSettings = async (req, res) => {
  try {
    let settings = await ColorSettings.findOne();

    if (!settings) {
      settings = new ColorSettings({
        colors: DEFAULT_COLORS,
      });
      await settings.save();
    }

    return res.status(200).json({
      success: true,
      data: settings,
    });
  } catch (error) {
    console.error("Error fetching color settings:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch color settings.",
    });
  }
};
