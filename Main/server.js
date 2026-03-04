const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors"); // optional here (same-origin), but harmless
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5050;

// ---------- Middlewares ----------
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------- Static Frontend (IMPORTANT) ----------
app.use(express.static(__dirname)); // serves index.html, styles.css, script.js, assets/

// ---------- Upload folders ----------
const uploadRoot = path.join(__dirname, "uploads");
const photoDir = path.join(uploadRoot, "photos");
const idDir = path.join(uploadRoot, "ids");

[uploadRoot, photoDir, idDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// serve uploaded files
app.use("/uploads", express.static(uploadRoot));

// ---------- Multer ----------
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "photo") return cb(null, photoDir);
    if (file.fieldname === "identityDocument") return cb(null, idDir);
    cb(new Error("Invalid file field"));
  },
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/\s+/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Unsupported file type"), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
});

// ---------- Schema ----------
const citizenApplicationSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true },

    photoPath: { type: String, required: true },
    identityDocumentPath: { type: String, required: true },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedAt: { type: Date, default: null },
    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

const CitizenApplication = mongoose.model(
  "CitizenApplication",
  citizenApplicationSchema
);

// ---------- Routes ----------
app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "API running" });
});

app.post(
  "/api/citizenship/apply",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "identityDocument", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { firstName, lastName, phone, email } = req.body;

      if (!firstName || !lastName || !phone || !email) {
        return res
          .status(400)
          .json({ ok: false, message: "Missing required fields" });
      }

      if (!req.files?.photo?.[0] || !req.files?.identityDocument?.[0]) {
        return res.status(400).json({
          ok: false,
          message: "Photo and identity document are required",
        });
      }

      const application = await CitizenApplication.create({
        firstName,
        lastName,
        phone,
        email,
        photoPath: `/uploads/photos/${req.files.photo[0].filename}`,
        identityDocumentPath: `/uploads/ids/${req.files.identityDocument[0].filename}`,
      });

      res.status(201).json({
        ok: true,
        message: "Application submitted successfully",
        applicationId: application._id,
        status: application.status,
      });
    } catch (err) {
      console.error("Submit error:", err);
      res.status(500).json({ ok: false, message: "Server error" });
    }
  }
);

// optional admin list
app.get("/api/citizenship/applications", async (req, res) => {
  try {
    const items = await CitizenApplication.find().sort({ createdAt: -1 });
    res.json({ ok: true, items });
  } catch (err) {
    console.error("List error:", err);
    res.status(500).json({ ok: false, message: "Server error" });
  }
});

// Serve index.html for "/" explicitly (safe)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ---------- Start after DB connects ----------
async function startServer() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB error:", err);
    process.exit(1);
  }
}
startServer();