// server.js
import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

// --- Setup ---
dotenv.config();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- MongoDB Connection ---
const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) {
  console.error("❌ Missing MONGO_URI in .env");
  process.exit(1);
}

mongoose
  .connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

// --- Schema & Model ---
const ApologySchema = new mongoose.Schema({
  senderName: { type: String, required: true },
  recipientEmail: { type: String, required: true },
  tone: { type: String, default: "sincere" },
  message: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

const Apology = mongoose.model("Apology", ApologySchema);

// --- Auth Helper ---
function adminAuth(req) {
  const token = req.headers["x-admin-token"] || req.query.admin_token || "";
  return token && process.env.ADMIN_TOKEN && token === process.env.ADMIN_TOKEN;
}

// --- Routes ---

// Health Check
app.get("/health", (req, res) => res.json({ ok: true }));

// Save a new apology submission
app.post("/api/send", async (req, res) => {
  try {
    const { senderName, recipientEmail, tone, message } = req.body || {};

    if (!senderName || !recipientEmail) {
      return res.status(400).json({ error: "senderName and recipientEmail are required" });
    }

    const doc = new Apology({
      senderName: String(senderName).trim(),
      recipientEmail: String(recipientEmail).trim(),
      tone: tone ? String(tone).trim() : "sincere",
      message: message ? String(message).trim() : "",
    });

    await doc.save();
    console.log("💾 Saved apology:", doc._id.toString());
    return res.json({ ok: true, id: doc._id });
  } catch (err) {
    console.error("❌ Error saving apology:", err);
    return res.status(500).json({ error: "Failed to save submission" });
  }
});

// Protected: view all submissions
app.get("/api/all", async (req, res) => {
  if (!adminAuth(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const all = await Apology.find().sort({ createdAt: -1 }).lean();
    return res.json(all);
  } catch (err) {
    console.error("❌ Error fetching submissions:", err);
    return res.status(500).json({ error: "Failed to fetch submissions" });
  }
});

// Protected: get a single submission by ID
app.get("/api/:id", async (req, res) => {
  if (!adminAuth(req)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const doc = await Apology.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ error: "Not found" });
    return res.json(doc);
  } catch (err) {
    console.error("❌ Error fetching submission:", err);
    return res.status(500).json({ error: "Failed to fetch submission" });
  }
});

// Fallback route for frontend (fix for Express v5)
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Start Server ---
const PORT = Number(process.env.PORT || 3000);
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
