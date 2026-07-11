const fs = require("fs");
const path = require("path");

async function extractText(filePath, mimetype) {
  const buf = fs.readFileSync(filePath);

  if (mimetype === "application/pdf") {
    const pdfParse = require("pdf-parse");
    const data = await pdfParse(buf);
    return data.text;
  }

  if (mimetype.includes("wordprocessingml") || mimetype.includes("msword")) {
    const mammoth = require("mammoth");
    const result = await mammoth.extractRawText({ buffer: buf });
    return result.value;
  }

  throw new Error("Only PDF and DOCX files are supported.");
}

module.exports = { extractText };
