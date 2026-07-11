const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  userId:       { type: String, required: true, unique: true },
  originalName: String,
  filename:     String,
  filePath:     String,
  mimetype:     String,
  fileSize:     Number,
  rawText:      String,
  candidate:    { type: Object, default: {} },
  questions:    { type: Array, default: [] },
  status:       { type: String, enum: ["processing","ready","failed"], default: "processing" },
  error:        String,
  uploadedAt:   { type: Date, default: Date.now },
  updatedAt:    { type: Date, default: Date.now }
});

module.exports = mongoose.model("Resume", resumeSchema);
