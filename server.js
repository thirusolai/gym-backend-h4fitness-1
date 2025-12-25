import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes.js";
import inquiryRoutes from "./routes/inquiryRoutes.js";
import trainerRoutes from "./routes/trainerRoutes.js";
import clientRoutes from "./routes/clientRoutes.js";
import membershipRoutes from "./routes/membershipRoutes.js";
import groupClassRoutes from "./routes/groupClassRoutes.js";
import ptRoutes from "./routes/ptRoutes.js";
import subRoutes from "./routes/subscriptionRoutes.js";
import followupRoutes from "./routes/followupRoutes.js";
import gymBillRoutes from "./routes/gymBillRoutes.js"; // ✅ Make sure this file exists
import packageRoutes from "./routes/packageRoutes.js";
import multer from "multer"; // ✅ use ES Module import instead of require
import path from "path";
import { fileURLToPath } from "url"; // ✅ Needed for __dirname in ESM

dotenv.config();
const app = express();

// ✅ Fix __dirname usage in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
app.use(cors({ origin: "*" }));
app.use(express.json());

// ✅ Set up multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

// ✅ Serve static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/inquiries", inquiryRoutes);
app.use("/api/trainers", trainerRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/memberships", membershipRoutes);
app.use("/api/groupclasses", groupClassRoutes);
app.use("/api/personaltrainings", ptRoutes);
app.use("/api/subscriptions", subRoutes);
app.use("/api/followups", followupRoutes);
app.use("/api/gymbill", gymBillRoutes);
app.use("/api/packages", packageRoutes);
// Database connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Connection Failed:", err));

// Start server
const PORT = process.env.PORT || 5000;
app.listen(process.env.PORT || 8900, '0.0.0.0', () => {
  console.log(`Server running on port ${process.env.PORT}`);
});

