import 'dotenv/config';
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import path from "path";
import { fileURLToPath } from "url";

import { generateApology } from "./services/generateApology.js";
import { sendApologyEmail } from "./services/sendEmail.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ------------------
// MongoDB
// ------------------
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ connected to mongodb"))
  .catch(err => {
    console.error("❌ mongodb error", err);
    process.exit(1);
  });

const ApologySchema = new mongoose.Schema({
  senderName: String,
  recipientEmail: String,
  tone: String,
  userMessage: String,
  aiGeneratedMessage: String,
  emailProviderId: String,
  createdAt: { type: Date, default: Date.now }
});

const Apology = mongoose.model("Apology", ApologySchema);

// ------------------
// Routes
// ------------------

app.post("/api/send", async (req, res) => {
  try {
    const { senderName, recipientEmail, tone, message } = req.body;

    if (!senderName || !recipientEmail || !tone) {
      return res.status(400).json({ error: "missing required fields" });
    }

    // rate limit: 1 email per recipient per 24h
    const recent = await Apology.findOne({
      recipientEmail,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });

    if (recent) {
      return res.status(429).json({
        error: "an apology was already sent to this email today"
      });
    }

    const aiText = await generateApology({
      tone,
      userMessage: message
    });

    const emailResult = await sendApologyEmail({
      to: recipientEmail,
      html: aiText
    });

    await Apology.create({
      senderName,
      recipientEmail,
      tone,
      userMessage: message,
      aiGeneratedMessage: aiText,
      emailProviderId: emailResult?.id || null
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ send error", err);
    return res.status(500).json({ error: "failed to send apology" });
  }
});

// admin view
app.get("/api/all", async (req, res) => {
  if (req.query.admin_token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: "unauthorized" });
  }
  const all = await Apology.find().sort({ createdAt: -1 });
  res.json(all);
});

// fallback
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 server running on ${PORT}`);
});
