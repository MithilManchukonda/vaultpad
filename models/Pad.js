const mongoose = require("mongoose");

const padSchema = new mongoose.Schema(
  {
    padId: { type: String, required: true, unique: true },
    content: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Pad", padSchema);