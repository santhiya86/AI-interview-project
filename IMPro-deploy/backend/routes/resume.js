const express = require("express");
const multer  = require("multer");
const fs      = require("fs");
const path    = require("path");
const router  = express.Router();

const Resume   = require("../models/Resume");
const { extractText } = require("../services/resumeExtract");
const { parseResume } = require("../services/resumeParser");
const { callGroq }  = require("../services/gemini");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads", "resumes");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) =>
      cb(null, req.user.id + "_" + Date.now() + path.extname(file.originalname))
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = ["application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword"].includes(file.mimetype);
    ok ? cb(null, true) : cb(new Error("Only PDF and DOCX files are allowed"));
  }
});

async function analyzeResume(rawText) {
  // Try Gemini first, fall back to rule-based parser
  try {
    if (!process.env.GROQ_API_KEY) throw new Error("No API key");
    console.log("[resume] Analyzing with Gemini...");
    const prompt = `You are an expert technical recruiter analyzing a resume.

RESUME TEXT:
"""
${rawText.slice(0, 6000)}
"""

Extract structured information and generate 8 specific personalized interview questions.
Respond ONLY with valid JSON:
{
  "candidate": {
    "name": "",
    "skills": [],
    "languages": [],
    "frameworks": [],
    "projects": [{"name":"","tech":[],"summary":""}],
    "education": [{"degree":"","institution":"","year":""}],
    "experience": [{"role":"","company":"","duration":""}],
    "certifications": [],
    "achievements": []
  },
  "questions": [
    {"question":"","category":"Technical|Project|Experience|Behavioral","difficulty":"Easy|Medium|Hard","targetSkill":""}
  ]
}`;
    const result = await callGroq(prompt, { json: true, timeoutMs: 60000 });
    if (result?.candidate && result?.questions?.length) {
      console.log("[resume] Gemini analysis done:", result.questions.length, "questions");
      return { ...result, analysisMethod: "gemini" };
    }
  } catch (err) {
    console.log("[resume] Gemini failed:", err.message, "— using rule-based parser");
  }

  // Fallback: rule-based parser (always works, no API needed)
  const result = parseResume(rawText);
  console.log("[resume] Rule-based analysis done:", result.questions.length, "questions");
  return { ...result, analysisMethod: "rules" };
}

async function processResume(resumeId) {
  let resume;
  try {
    resume = await Resume.findById(resumeId);
    if (!resume) return;

    const rawText = await extractText(resume.filePath, resume.mimetype);
    if (!rawText || rawText.trim().length < 20)
      throw new Error("Could not extract text. Make sure your PDF is not a scanned image (use a text-based PDF).");

    console.log("[resume] Extracted", rawText.length, "chars");
    const analysis = await analyzeResume(rawText);

    resume.rawText   = rawText;
    resume.candidate = analysis.candidate || {};
    resume.questions = analysis.questions || [];
    resume.status    = "ready";
    resume.error     = undefined;
    resume.updatedAt = new Date();
    await resume.save();
    console.log("[resume] Saved successfully via", analysis.analysisMethod);
  } catch (err) {
    console.error("[resume] Failed:", err.message);
    if (resume) {
      resume.status = "failed";
      resume.error  = err.message;
      await resume.save().catch(() => {});
    }
  }
}

router.post("/upload", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const existing = await Resume.findOne({ userId: req.user.id });
    if (existing?.filePath && fs.existsSync(existing.filePath)) fs.unlinkSync(existing.filePath);

    const doc = await Resume.findOneAndUpdate(
      { userId: req.user.id },
      {
        userId: req.user.id,
        originalName: req.file.originalname,
        filename:     req.file.filename,
        filePath:     req.file.path,
        mimetype:     req.file.mimetype,
        fileSize:     req.file.size,
        status: "processing", candidate: {}, questions: [], error: null,
        uploadedAt: existing?.uploadedAt || new Date(), updatedAt: new Date()
      },
      { upsert: true, new: true }
    );

    processResume(doc._id); // fire and forget

    res.status(201).json({
      message: "Resume uploaded! Analysis in progress (20-60 seconds).",
      resumeId: doc._id, status: "processing"
    });
  } catch (err) {
    console.error("[resume upload]", err.message);
    res.status(500).json({ message: "Upload failed: " + err.message });
  }
});

router.get("/", async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.id });
    res.json({ resume: resume || null });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.get("/download", async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.id });
    if (!resume || !fs.existsSync(resume.filePath))
      return res.status(404).json({ message: "File not found" });
    res.download(resume.filePath, resume.originalName);
  } catch (err) { res.status(500).json({ message: err.message }); }
});

router.delete("/", async (req, res) => {
  try {
    const resume = await Resume.findOne({ userId: req.user.id });
    if (!resume) return res.status(404).json({ message: "No resume found" });
    if (resume.filePath && fs.existsSync(resume.filePath)) fs.unlinkSync(resume.filePath);
    await Resume.deleteOne({ userId: req.user.id });
    res.json({ message: "Resume deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
