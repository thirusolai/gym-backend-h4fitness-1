import mongoose from "mongoose";

const gymBillSchema = new mongoose.Schema(
  {
    memberId: String,
    client: String,
    contactNumber: String,
    alternateContact: String,
    email: String,
    clientSource: String,
    gender: String,
    dateOfBirth: String,
    anniversary: String,
    profession: String,
    taxId: String,
    workoutHours: String,
    areaAddress: String,
    remarks: String,

    profilePicture: {
      data: Buffer,
      contentType: String,
    },

    package: String,
    joiningDate: String,
    endDate: String,
    sessions: Number,
    price: Number,

    // 👇 You want to store this from frontend
    discountAmount: {
      type: Number,
      default: 0,
    },

    admissionCharges: Number,
    tax: Number,
    amountPayable: Number,
    amountPaid: Number,
    balance: Number,
    amount: Number,

    followupDate: String,

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },

    paymentMethodDetail: String,
    appointTrainer: String,
    clientRep: String,

    paymentHistory: [
      {
        amount: Number,
        mode: String,
        note: String,
        date: { type: Date, default: Date.now },
      },
    ],

    renewalHistory: [
      {
        joiningDate: String,
        endDate: String,
        package: String,
        price: Number,
        discountAmount: Number,
        
        amountPaid: Number,
        balance: Number,
        remarks: String,
        trainer: String,
        date: { type: Date, default: Date.now },
      },
    ],
  },

  { timestamps: true }
);

// ❌ Removed pre save (it overwrote discountAmount, balance...)
export default mongoose.model("GymBill", gymBillSchema);
