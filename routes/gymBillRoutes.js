import express from "express";
import multer from "multer";
import fs from "fs";
import GymBill from "../models/GymBill.js";
import Followup from "../models/Followup.js";

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

    // Require memberId
    if (!req.body.memberId || req.body.memberId.trim() === "") {
      return res.status(400).json({ message: "Member ID is required" });
    }

    const memberId = req.body.memberId.trim();

    // Check duplicate memberId
    const existingBill = await GymBill.findOne({ memberId });
    if (existingBill) {
      return res.status(400).json({ message: `Member ID "${memberId}" already exists.` });
    }

    // Ensure valid status
    let status = req.body.status?.trim();
    if (!status || !["Active", "Inactive"].includes(status)) {
      status = "Active";
    }

    // -------------------------------
    // 📌 Calculate first bill values
    // -------------------------------
    const priceNum = Number(req.body.price) || 0;

    // ⭐ Read admissionCharges (frontend)
    const admissionCharges = Number(req.body.admissionCharges) || 0;

    const discountAmt = Number(req.body.discountAmount) || 0;
    const paidAmt = Number(req.body.amountPaid) || 0;

    // ⭐ Correct Balance Formula
    const firstBalance = priceNum + admissionCharges - discountAmt - paidAmt;

    // First renewal entry
    const firstRenewalEntry = {
      joiningDate: req.body.joiningDate,
      endDate: req.body.endDate,
      package: req.body.package,
      price: priceNum,
      admissionCharges: admissionCharges,
      discountAmount: discountAmt,
      amountPaid: paidAmt,
      balance: firstBalance,
      remarks: req.body.remarks,
      trainer: req.body.trainer,
    };

    // Handle Profile Picture
    let profilePicture = undefined;
    if (req.file) {
      const imageData = fs.readFileSync(req.file.path);
      profilePicture = {
        data: imageData,
        contentType: req.file.mimetype,
      };
      fs.unlinkSync(req.file.path);
    }

    // Create new bill
    const newBill = new GymBill({
      ...req.body,
      memberId,
      status,
      profilePicture,
      admissionCharges: admissionCharges, // ⭐ store it
      balance: firstBalance,
      discountAmount: discountAmt,
      renewalHistory: [firstRenewalEntry],
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
    let bills = await GymBill.find().sort({ _id: -1 });

    bills = bills.map((bill) => {
      const renewalTotal = (bill.renewalHistory || []).reduce(
        (sum, r) => sum + (r.amountPaid || 0),
        0
      );

      const totalPaidIncludingRenewals =
        (bill.amountPaid || 0) + renewalTotal;

      return {
        ...bill._doc,
        totalPaidIncludingRenewals,
      };
    });

    res.status(200).json(bills);
  } catch (error) {
    res.status(500).json({ message: "Error fetching bills", error: error.message });
  }
});

// ------------------
// 🔁 Renew Membership
// ------------------
router.put("/renew/:id", async (req, res) => {
  try {
    const {
      joiningDate,
      endDate,
      package: pkg,
      price,
      discountAmount,
      amountPaid,
      balance,
      remarks,
      trainer,
    } = req.body;

    const client = await GymBill.findById(req.params.id);
    if (!client) return res.status(404).json({ message: "Client not found" });

    const priceNum = Number(price) || 0;

    // ⭐ Read admissionCharges from frontend
    const admissionCharges = Number(req.body.admissionCharges) || 0;

    const discountAmt = Number(discountAmount) || 0;
    const paidAmt = Number(amountPaid) || 0;

    // ⭐ CORRECT RENEWAL BALANCE FORMULA
    const newBalance = priceNum + admissionCharges - discountAmt - paidAmt;

    // 1️⃣ Push renewal history
    await GymBill.findByIdAndUpdate(req.params.id, {
      $push: {
        renewalHistory: {
          joiningDate,
          endDate,
          package: pkg,
          price: priceNum,
          admissionCharges: admissionCharges,
          discountAmount: discountAmt,
          amountPaid: paidAmt,
          balance: newBalance,
          remarks,
          trainer,
        },
      },
    });

    // 2️⃣ Update latest user fields
    const updated = await GymBill.findByIdAndUpdate(
      req.params.id,
      {
        joiningDate,
        endDate,
        package: pkg,
        price: priceNum,
        admissionCharges: admissionCharges,
        discountAmount: discountAmt,
        amountPaid: paidAmt,
        balance: newBalance,
        remarks,
        appointTrainer: trainer,
        status: "Active",
      },
      { new: true }
    );

    res.status(200).json({
      message: "Membership renewed successfully",
      data: updated,
    });
  } catch (err) {
    console.error("Renewal error:", err);
    res.status(500).json({ error: "Renewal failed", details: err.message });
  }
});

// ------------------
// ✏️ Edit Renewal Entry
// ------------------
router.put("/renew/edit/:clientId/:renewId", async (req, res) => {
  try {
    const { clientId, renewId } = req.params;

    const updateFields = req.body;

    const updated = await GymBill.updateOne(
      { _id: clientId, "renewalHistory._id": renewId },
      {
        $set: {
          "renewalHistory.$": {
            ...updateFields,
            _id: renewId,
          },
        },
      }
    );

    res.json({ message: "Renewal entry updated", data: updated });
  } catch (error) {
    res.status(500).json({ error: error.message });
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

// 🗑 Delete Renewal Entry
router.delete("/renew/delete/:clientId/:renewId", async (req, res) => {
  try {
    const { clientId, renewId } = req.params;

    const updated = await GymBill.findByIdAndUpdate(
      clientId,
      { $pull: { renewalHistory: { _id: renewId } } },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Client not found" });
    }

    res.json({ message: "Renewal entry deleted", data: updated });
  } catch (err) {
    console.error("Error deleting renewal:", err);
    res.status(500).json({ message: "Deletion failed", error: err.message });
  }
});

// ---------------------------
// 💰 Update Payment + Followup
// ---------------------------
router.put("/payment/:id", async (req, res) => {
  try {
    const { amountPaid, balance, paymentHistory, followUpDate } = req.body;

    const updatedBill = await GymBill.findByIdAndUpdate(
      req.params.id,
      {
        amountPaid,
        balance,
        $push: { paymentHistory },
      },
      { new: true }
    );

    if (!updatedBill) {
      return res.status(404).json({ message: "Client not found" });
    }

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
