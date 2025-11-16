import express from "express";
import Inquiry from "../models/Inquiry.js";

const router = express.Router();

// ✅ Create a new inquiry
router.post("/", async (req, res) => {
  try {
    const inquiry = new Inquiry(req.body);
    await inquiry.save();
    res.status(201).json({ message: "Inquiry created successfully", inquiry });
  } catch (error) {
    res.status(500).json({ error: "Failed to create inquiry", details: error });
  }
});

// ✅ Get all inquiries
router.get("/", async (req, res) => {
  try {
    const inquiries = await Inquiry.find().sort({ createdAt: -1 });
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch inquiries" });
  }
});

// ✅ Get a single inquiry by ID
router.get("/:id", async (req, res) => {
  try {
    const inquiry = await Inquiry.findById(req.params.id);
    if (!inquiry) return res.status(404).json({ error: "Inquiry not found" });
    res.json(inquiry);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch inquiry" });
  }
});

// ✅ Update inquiry (feedback array included)
router.put("/:id", async (req, res) => {
  try {
    const updated = await Inquiry.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );

    if (!updated) return res.status(404).json({ error: "Inquiry not found" });

    res.json({ message: "Inquiry updated successfully", inquiry: updated });
  } catch (error) {
    res.status(500).json({ error: "Failed to update inquiry" });
  }
});

// ✅ Delete inquiry
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Inquiry.findByIdAndDelete(req.params.id);

    if (!deleted) return res.status(404).json({ error: "Inquiry not found" });

    res.json({ message: "Inquiry deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete inquiry" });
  }
});

export default router;
