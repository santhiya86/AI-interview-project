// ROOT CAUSE FIX:
// Node.js built-in fetch does NOT support FormData+Blob for multipart uploads
// the same way browsers do. We use the npm `form-data` package instead,
// which produces a proper multipart/form-data stream that Flask/Whisper accepts.

const FormData = require("form-data");

const WHISPER_URL = process.env.WHISPER_URL || "http://localhost:6000";

async function transcribe(audioBuffer, filename = "audio.webm") {
  const form = new FormData();
  form.append("audio", audioBuffer, {
    filename: filename,
    contentType: "audio/webm",
    knownLength: audioBuffer.length
  });

  let res;
  try {
    // Use Node built-in fetch with form-data headers
    res = await fetch(`${WHISPER_URL}/transcribe`, {
      method: "POST",
      body: form,
      headers: form.getHeaders(),
      signal: AbortSignal.timeout(180000)
    });
  } catch (err) {
    const isTimeout = err.name === "TimeoutError" || err.name === "AbortError";
    const error = new Error(
      isTimeout
        ? "Speech transcription timed out. Please try a shorter recording (under 2 minutes)."
        : "Speech-to-text service is not reachable. Please use Text mode."
    );
    error.isWhisperError = true;
    throw error;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const error = new Error(body.error || "Transcription failed (status " + res.status + ")");
    error.isWhisperError = true;
    throw error;
  }

  return res.json();
}

async function checkHealth() {
  try {
    const res = await fetch(`${WHISPER_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, message: "Whisper status " + res.status };
    return { ok: true, ...(await res.json()) };
  } catch {
    return { ok: false, message: "Whisper service not running at " + WHISPER_URL };
  }
}

module.exports = { transcribe, checkHealth };
