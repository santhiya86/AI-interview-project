const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema({
  questionIndex: Number,
  question:      String,
  inputMode:     { type: String, enum: ["text","voice","hybrid"] },
  textAnswer:    String,
  transcript:    String,
  speechMetrics: Object,
  aiScores:      Object,
  timeTakenSec:  Number
});

const interviewSchema = new mongoose.Schema({
  userId:        { type: String, required: true },
  type:          { type: String, enum: ["Technical","HR","Behavioral","Resume"] },
  subject:       String,
  difficulty:    String,
  inputMode:     { type: String, enum: ["text","voice","hybrid"] },
  questions:     [String],
  answers:       [answerSchema],
  finalReport:   Object,
  status:        { type: String, enum: ["active","completed"], default: "active" },
  startedAt:     { type: Date, default: Date.now },
  completedAt:   Date
}, { timestamps: true });

module.exports = mongoose.model("Interview", interviewSchema);
