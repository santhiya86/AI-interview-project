require("dotenv").config();
const express  = require("express");
const mongoose = require("mongoose");
const cors     = require("cors");
const path     = require("path");

const auth = require("./middleware/auth");
const { checkHealth: geminiHealth } = require("./services/groq");

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString().slice(11,19)}] ${req.method} ${req.path}`);
  next();
});

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  const gemini = await geminiHealth().catch(() => ({ ok: false, message: "Health check failed" }));
  res.json({
    server: "ok",
    mongo:  mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    ai:     gemini,
    // Keep these keys so frontend Dashboard doesn't break
    ollama:  { ok: gemini.ok, modelAvailable: gemini.ok, message: gemini.message },
    whisper: { ok: true, message: "Browser Web Speech API (no server needed)" }
  });
});

// ── Public routes ─────────────────────────────────────────────────────────────
app.use("/api/auth", require("./routes/auth"));

// ── Protected routes ──────────────────────────────────────────────────────────
app.use("/api/user",      auth, require("./routes/user"));
app.use("/api/resume",    auth, require("./routes/resume"));
app.use("/api/interview", auth, require("./routes/interview"));

// ── Serve built React frontend ────────────────────────────────────────────────
const DIST = path.join(__dirname, "public");
app.use(express.static(DIST));
app.get("*", (req, res) => {
  const index = path.join(DIST, "index.html");
  res.sendFile(index, (err) => {
    if (err) res.status(200).json({ status: "InterviewPro API running" });
  });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error("[ERROR]", err.message);
  res.status(err.status || 500).json({ message: err.message || "Server error" });
});

// ── Start ─────────────────────────────────────────────────────────────────────
if (!process.env.MONGO_URI) {
  console.error("MONGO_URI missing in .env"); process.exit(1);
}

mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 })
  .then(() => {
    console.log("✅ MongoDB connected");
    if (!process.env.GROQ_API_KEY) {
      console.warn("⚠ GROQ_API_KEY not set — AI features will return errors until you add it to Render env vars");
    } else {
      console.log("✅ Groq API key loaded");
    }
    app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
  })
  .catch(err => {
    console.error("❌ MongoDB failed:", err.message);
    process.exit(1);
  });
