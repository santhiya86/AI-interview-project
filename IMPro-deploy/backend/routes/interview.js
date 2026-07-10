const express = require("express");
const multer  = require("multer");
const router  = express.Router();

const Interview = require("../models/Interview");
const { evaluateAnswer, chatbotReply } = require("../services/aiEvaluator");
const { compute: computeSpeech } = require("../services/speechMetrics");

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25*1024*1024 } });

// ── Start Interview ──────────────────────────────────────────────────────────
router.post("/start", async (req, res) => {
  try {
    const { type, subject, difficulty, inputMode, questions } = req.body;
    if (!type || !inputMode || !questions?.length)
      return res.status(400).json({ message: "type, inputMode, and questions required" });
    const interview = await Interview.create({
      userId: req.user.id, type, subject, difficulty, inputMode, questions, answers: [], status: "active"
    });
    res.status(201).json({ message: "Interview started", interviewId: interview._id });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Text Answer ──────────────────────────────────────────────────────────────
router.post("/:id/answer/text", async (req, res) => {
  try {
    const { questionIndex, answer, timeTakenSec } = req.body;
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user.id });
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    const question = interview.questions[questionIndex];
    let aiScores = null;
    try {
      aiScores = await evaluateAnswer({ question, answer: answer || "(no answer)", interviewType: interview.type });
    } catch (err) {
      console.warn("[text answer] AI scoring failed:", err.message);
    }

    interview.answers.push({ questionIndex, question, inputMode: "text", textAnswer: answer, aiScores, timeTakenSec: timeTakenSec || 0 });
    await interview.save();
    res.json({ success: true, aiScores });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Voice Answer ─────────────────────────────────────────────────────────────
router.post("/:id/answer/voice", async (req, res) => {
  try {
    const { questionIndex, transcript, timeTakenSec, speechMetricsData } = req.body;
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user.id });
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    const question = interview.questions[questionIndex];
    const text = (transcript || "").trim();
    let aiScores = null;

    if (text.length > 3) {
      try {
        aiScores = await evaluateAnswer({ question, answer: text, interviewType: interview.type, speechMetrics: speechMetricsData });
      } catch (err) {
        console.warn("[voice answer] AI scoring failed:", err.message);
      }
    }

    interview.answers.push({ questionIndex, question, inputMode: "voice", transcript: text, speechMetrics: speechMetricsData, aiScores, timeTakenSec: Number(timeTakenSec) || 0 });
    await interview.save();
    res.json({ success: true, transcript: text, aiScores, note: text ? null : "No speech detected" });
  } catch (err) {
    console.error("[voice answer]", err.message);
    res.status(500).json({ message: err.message, continueInterview: true });
  }
});

// ── AI Chatbot ────────────────────────────────────────────────────────────────
// Critical fix: log the real error so we can see what's actually failing
router.post("/:id/chat", async (req, res) => {
  try {
    const { question, answer, userMessage, history } = req.body;
    if (!userMessage?.trim()) {
      return res.json({ reply: "Please type a message to get help.", improvedAnswer: "", tip: "" });
    }
    const reply = await chatbotReply({ question, answer, userMessage, history });
    res.json(reply);
  } catch (err) {
    // Log the REAL error — this is what was hidden before
    console.error("[chat] AI Coach error:", err.message);
    // Return a helpful error message showing what went wrong
    res.json({
      reply: `AI Coach error: ${err.message}. Please check that GROQ_API_KEY is correctly set in Render environment variables.`,
      improvedAnswer: "",
      tip: ""
    });
  }
});

// ── Complete Interview ────────────────────────────────────────────────────────
router.post("/:id/complete", async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user.id });
    if (!interview) return res.status(404).json({ message: "Interview not found" });

    const answers = interview.answers;
    const scored  = answers.filter(a => a.aiScores);
    const avg = (key) => scored.length
      ? Math.round(scored.reduce((s, a) => s + (a.aiScores[key] || 0), 0) / scored.length) : 0;

    const report = {
      totalQuestions:     interview.questions.length,
      answeredQuestions:  answers.length,
      overallScore:       avg("overallScore"),
      technicalScore:     avg("technicalScore"),
      communicationScore: avg("communicationScore"),
      grammarScore:       avg("grammarScore"),
      confidenceScore:    avg("confidenceScore"),
      strengths:   [...new Set(scored.flatMap(a => a.aiScores.strengths  || []))].slice(0, 5),
      weaknesses:  [...new Set(scored.flatMap(a => a.aiScores.weaknesses || []))].slice(0, 5),
      inputMode:   interview.inputMode,
      type:        interview.type,
      subject:     interview.subject,
      difficulty:  interview.difficulty,
      durationSec: Math.round((Date.now() - new Date(interview.startedAt).getTime()) / 1000)
    };

    interview.finalReport = report;
    interview.status      = "completed";
    interview.completedAt = new Date();
    await interview.save();
    res.json({ message: "Interview completed", report, answers });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get one ───────────────────────────────────────────────────────────────────
router.get("/:id", async (req, res) => {
  try {
    const interview = await Interview.findOne({ _id: req.params.id, userId: req.user.id });
    if (!interview) return res.status(404).json({ message: "Not found" });
    res.json({ interview });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Get all ───────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const interviews = await Interview.find({ userId: req.user.id })
      .select("type subject difficulty status startedAt completedAt finalReport inputMode")
      .sort({ startedAt: -1 });
    res.json({ interviews });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

// ── Delete ────────────────────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    await Interview.deleteOne({ _id: req.params.id, userId: req.user.id });
    res.json({ message: "Interview deleted" });
  } catch (err) { res.status(500).json({ message: err.message }); }
});

module.exports = router;
