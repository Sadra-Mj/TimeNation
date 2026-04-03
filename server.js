require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const session = require("express-session");

const Citizen = require("./models/Citizen");

const app = express();
const ROOT_DIR = __dirname;
const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "time-nation-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: false,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);

// static files
app.use("/uploads", express.static(UPLOADS_DIR));
app.use(express.static(ROOT_DIR));

/* ---------------- HELPERS ---------------- */

function isGovernmentAuthenticated(req) {
  return req.session && req.session.isGovernmentAuthenticated === true;
}

function requireGovernmentAuth(req, res, next) {
  if (!isGovernmentAuthenticated(req)) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized"
    });
  }

  next();
}

/* ---------------- MULTER ---------------- */

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, UPLOADS_DIR);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + "-" + file.originalname.replace(/\s+/g, "-");
    cb(null, unique);
  }
});

const upload = multer({ storage });

/* ---------------- ROUTES ---------------- */

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "Time Nation Portal" });
});

app.post(
  "/api/citizenship/apply",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "identityDocument", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!req.files?.photo?.[0] || !req.files?.identityDocument?.[0]) {
        return res.status(400).json({
          success: false,
          message: "Photo and identity document are required"
        });
      }

      const citizen = new Citizen({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        phone: req.body.phone,
        email: req.body.email,
        photo: req.files.photo[0].filename,
        identityDocument: req.files.identityDocument[0].filename
      });

      const savedCitizen = await citizen.save();

      res.json({
        ok: true,
        success: true,
        message: "Application submitted",
        applicationId: savedCitizen._id
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({
        success: false,
        message: "Server error"
      });
    }
  }
);

app.post("/api/government/login", (req, res) => {
  try {
    const { governmentId, password } = req.body;

    if (
      governmentId === process.env.GOVERNMENT_ID &&
      password === process.env.GOVERNMENT_PASSWORD
    ) {
      req.session.isGovernmentAuthenticated = true;
      req.session.governmentId = governmentId;

      return res.json({
        success: true,
        message: "Login successful"
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid government ID or password"
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Server error"
    });
  }
});

app.post("/api/government/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({
        success: false,
        message: "Could not log out"
      });
    }

    res.clearCookie("connect.sid");
    return res.json({ success: true, message: "Logged out" });
  });
});

app.get("/api/government/session", (req, res) => {
  res.json({
    success: true,
    authenticated: isGovernmentAuthenticated(req)
  });
});

app.get("/api/government/citizens", requireGovernmentAuth, async (req, res) => {
  try {
    const citizens = await Citizen.find().sort({ createdAt: -1 }).lean();

    const normalizedCitizens = citizens.map(citizen => ({
      ...citizen,
      photoUrl: citizen.photo ? `/uploads/${citizen.photo}` : "",
      identityDocumentUrl: citizen.identityDocument
        ? `/uploads/${citizen.identityDocument}`
        : ""
    }));

    res.json({ success: true, citizens: normalizedCitizens });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: "Could not load citizens"
    });
  }
});

app.get("/government", (req, res) => {
  if (isGovernmentAuthenticated(req)) {
    return res.sendFile(path.join(ROOT_DIR, "government-dashboard.html"));
  }

  return res.sendFile(path.join(ROOT_DIR, "government-login.html"));
});

app.get("/government-dashboard", (req, res) => {
  if (!isGovernmentAuthenticated(req)) {
    return res.redirect("/government");
  }

  return res.sendFile(path.join(ROOT_DIR, "government-dashboard.html"));
});

/*
  Express 5 fix:
  app.get("*") breaks on newer path-to-regexp versions.
  Use app.use(...) as the safe fallback instead.
*/
app.use((req, res, next) => {
  if (req.path.startsWith("/api/") || req.path.startsWith("/uploads/")) {
    return next();
  }

  if (req.path === "/" || req.path === "/index.html") {
    return res.sendFile(path.join(ROOT_DIR, "index.html"));
  }

  return next();
});

/* ---------------- DATABASE ---------------- */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    const PORT = process.env.PORT || 5050;

    app.listen(PORT, () => {
      console.log(`🚀 Server running on ${PORT}`);
    });
  })
  .catch(err => {
    console.log("❌ MongoDB error:", err);
  });