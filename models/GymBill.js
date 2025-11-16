import mongoose from "mongoose";

const gymBillSchema = new mongoose.Schema(
  {
    memberId: { type: String }, // manually entered or left blank
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
    discount: Number, // percentage
    discountAmount: Number,
    admissionCharges: Number,
    tax: Number, // percentage
    amountPayable: Number,
    amountPaid: Number,
    balance: Number,
    amount: Number, // optional
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
    date: { type: Date, default: Date.now }
  }
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
    date: { type: Date, default: Date.now }
  }
],

},

  { timestamps: true } // Adds createdAt and updatedAt
);

// Auto-calculation before saving
gymBillSchema.pre("save", function (next) {
  const discountAmt =
    this.price && this.discount ? (this.price * this.discount) / 100 : 0;

  const taxableAmount = this.price - discountAmt + (this.admissionCharges || 0);

  const taxAmt = this.tax ? (taxableAmount * this.tax) / 100 : 0;

  this.discountAmount = discountAmt;
  this.amountPayable = taxableAmount + taxAmt;
  this.balance = this.amountPayable - (this.amountPaid || 0);

  next();
});

const GymBill = mongoose.model("GymBill", gymBillSchema);

export default GymBill;
