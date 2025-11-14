import express from "express";
import multer from "multer";
import fs from "fs";
import GymBill from "../models/GymBill.js";
import Followup from "../models/Followup.js";  // ← important

const router = express.Router();

// ----------------------
// 🗂️ Multer Configuration
// ----------------------
const upload = multer({ dest: "uploads/" });

// ----------------------
// 🖼️ Serve Image by ID
// ----------------------
router.get("/image/:id", async (req, res) => {
  try {
    const bill = await GymBill.findById(req.params.id);

    if (!bill || !bill.profilePicture?.data) {
      return res.status(404).json({ message: "Image not found" });
    }

    const imgBuffer = Buffer.from(bill.profilePicture.data);
    res.writeHead(200, {
      "Content-Type": bill.profilePicture.contentType,
      "Content-Length": imgBuffer.length,
      "Cache-Control": "public, max-age=31536000",
    });
    res.end(imgBuffer);
  } catch (error) {
    console.error("❌ Image fetch error:", error);
    res.status(500).json({ message: "Error fetching image", error: error.message });
  }
});

// ---------------------
// 🧾 Create New Gym Bill
// ---------------------
router.post("/", upload.single("profilePicture"), async (req, res) => {
  try {
    if (!req.body || Object.keys(req.body).length === 0)
      return res.status(400).json({ message: "No data provided" });

    // ✅ Require manual memberId input
    if (!req.body.memberId || req.body.memberId.trim() === "") {
      return res.status(400).json({ message: "Member ID is required" });
    }

    const memberId = req.body.memberId.trim();

    // ✅ Check for duplicate memberId
    const existingBill = await GymBill.findOne({ memberId });
    if (existingBill) {
      return res.status(400).json({ message: `Member ID "${memberId}" already exists.` });
    }

    // ✅ Ensure valid status
    let status = req.body.status?.trim();
    if (!status || !["Active", "Inactive"].includes(status)) {
      status = "Active";
    }

    // ✅ Handle profile picture
    let profilePicture = undefined;
    if (req.file) {
      const imageData = fs.readFileSync(req.file.path);
      profilePicture = {
        data: imageData,
        contentType: req.file.mimetype,
      };
      fs.unlinkSync(req.file.path);
    }

    const newBill = new GymBill({
      ...req.body,
      memberId,
      status,
      profilePicture,
    });

    await newBill.save();

    res.status(201).json({
      message: "✅ Gym Bill Created Successfully",
      memberId: newBill.memberId,
      data: newBill,
    });
  } catch (error) {
    console.error("❌ Error creating gym bill:", error);
    res.status(500).json({ message: "Error creating gym bill", error: error.message });
  }
});

// ----------------
// 📜 Get All Bills
// ----------------
router.get("/", async (req, res) => {
  try {
    const bills = await GymBill.find().sort({ _id: -1 });
    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bills", error: error.message });
  }
});

// ------------------
// 🔁 Renew Membership (Enhanced)
// ------------------
router.put("/renew/:id", async (req, res) => {
  try {
    const {
      joiningDate,
      endDate,
      package: pkg,
      price,
      discount,
      amountPaid,
      balance,
      remarks,
      trainer,
    } = req.body;

    // ✅ Fetch existing client to retain unchanged data
    const client = await GymBill.findById(req.params.id);
    if (!client) {
      return res.status(404).json({ message: "Client not found" });
    }

    // ✅ Recalculate fields safely
    const priceNum = Number(price) || 0;
    const discountAmt = Number(discount) || 0;
    const paidAmt = Number(amountPaid) || 0;
    const newBalance = balance
      ? Number(balance)
      : priceNum - discountAmt - paidAmt;

    // ✅ Update record
    const updatedClient = await GymBill.findByIdAndUpdate(
      req.params.id,
      {
        joiningDate,
        endDate,
        package: pkg,
        price: priceNum,
        discount: discountAmt, // store as amount
        amountPaid: paidAmt,
        balance: newBalance,
        remarks,
        appointTrainer: trainer, // ✅ your schema field name
        status: "Active",
      },
      { new: true }
    );

    res.status(200).json({
      message: "✅ Membership renewed successfully",
      data: updatedClient,
    });
  } catch (err) {
    console.error("❌ Renewal error:", err);
    res.status(500).json({ error: "Renewal failed", details: err.message });
  }
});


// -----------------
// ✏️ Update Gym Bill
// -----------------
router.put("/:id", upload.single("profilePicture"), async (req, res) => {
  try {
    let updatedData = { ...req.body };

    if (req.file) {
      const imageData = fs.readFileSync(req.file.path);
      updatedData.profilePicture = {
        data: imageData,
        contentType: req.file.mimetype,
      };
      fs.unlinkSync(req.file.path);
    }

    if (!updatedData.status || !["Active", "Inactive"].includes(updatedData.status)) {
      updatedData.status = "Active";
    }

    const updated = await GymBill.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({ error: err.message });
  }
});

// -------------------
// ❌ Delete Gym Client
// -------------------
router.delete("/:id", async (req, res) => {
  try {
    await GymBill.findByIdAndDelete(req.params.id);
    res.json({ message: "Client deleted successfully" });
  } catch (err) {
    console.error("❌ Delete error:", err);
    res.status(500).json({ error: err.message });
  }
});

// --------------------------
// 💰 Update Payment + Followup
// --------------------------
router.put("/payment/:id", async (req, res) => {
  try {
    const { amountPaid, balance, paymentHistory, followUpDate } = req.body;

    // 1️⃣ Update payment + push history
    const updatedBill = await GymBill.findByIdAndUpdate(
      req.params.id,
      {
        amountPaid,
        balance,
        $push: { paymentHistory }, // push record
      },
      { new: true }
    );

    if (!updatedBill) {
      return res.status(404).json({ message: "Client not found" });
    }

    // 2️⃣ Create follow-up entry (optional)
    if (followUpDate) {
      await Followup.create({
        client: req.params.id,
        followupType: "Payment",
        scheduleDate: followUpDate,
        response: paymentHistory.note || "Payment Follow-up",
        status: "Pending",
      });
    }

    res.status(200).json({
      message: "Payment updated successfully",
      data: updatedBill,
    });

  } catch (error) {
    console.error("❌ Payment update error:", error);
    res.status(500).json({ error: error.message });
  }
});


export default router;
