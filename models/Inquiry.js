import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true },
    lastName: String,
    contactNumber: { type: String, required: true },
    alternateContact: String,
    email: String,
    gender: String,
    areaAddress: String,
    scheduleFollowUp: String,
    dateOfBirth: String,
    status: { type: String, default: "Pending" },
    attendedBy: String,
    convertibility: { type: String, default: "Warm" },
    source: String,
    inquiryFor: String,

    /* ⭐ MULTIPLE FEEDBACK WITH DATE ⭐ */
    feedback: [
      {
        message: { type: String },
        date: { type: String }, // or Date
      },
    ],
  },
  { timestamps: true }
);

const Inquiry = mongoose.model("Inquiry", inquirySchema);
export default Inquiry;
