const express = require("express");
const Pad = require("../models/Pad");

const router = express.Router();

function isValidPadId(padId) {
  return /^[a-f0-9]{64}$/.test(padId);
}

router.get("/:padId", async (req, res) => {
  const { padId } = req.params;

  if (!isValidPadId(padId)) {
    return res.status(400).json({ message: "Invalid pad ID" });
  }

  try {
    const pad = await Pad.findOne({ padId: padId });
    if (!pad) {
      return res.status(404).json({ message: "Pad not found" });
    }
    res.json({ content: pad.content });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:padId", async (req, res) => {
  const { padId } = req.params;
  const content = req.body?.content;

  if (!isValidPadId(padId)) {
    return res.status(400).json({ message: "Invalid pad ID" });
  }
  if (typeof content !== "string") {
    return res.status(400).json({ message: "Content must be text" });
  }

  try {
    await Pad.findOneAndUpdate({ padId: padId }, { content: content }, { upsert: true });
    res.json({ message: "Saved" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/:padId", async (req, res) => {
  const { padId } = req.params;

  if (!isValidPadId(padId)) {
    return res.status(400).json({ message: "Invalid pad ID" });
  }

  try {
    const result = await Pad.deleteOne({ padId: padId });
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Pad not found" });
    }
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;