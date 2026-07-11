// ══════════════════════════════════════════════════════════════════════════════
// Gemini AI Service — replaces Ollama entirely.
// Uses Google Gemini 1.5 Flash (free tier: 15 req/min, 1500 req/day).
// No credit card required. Get your free API key at:
//   https://aistudio.google.com/app/apikey
// Set GEMINI_API_KEY in your Render environment variables.
// ══════════════════════════════════════════════════════════════════════════════

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || "";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

async function callGemini(prompt, { json = true, timeoutMs = 60000 } = {}) {
  if (!GEMINI_API_KEY) {
    const e = new Error("GEMINI_API_KEY not set. Add it to your Render environment variables.");
    e.isAIError = true;
    throw e;
  }

  let res;
  try {
    res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
          ...(json ? { responseMimeType: "application/json" } : {})
        }
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    const e = new Error(err.name === "TimeoutError"
      ? "AI request timed out. Please try again."
      : "Cannot reach AI service. Check your internet connection.");
    e.isAIError = true;
    throw e;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg = body?.error?.message || `Gemini error ${res.status}`;
    // Handle quota exceeded gracefully
    if (res.status === 429) {
      const e = new Error("AI quota exceeded. Please wait a minute and try again.");
      e.isAIError = true;
      throw e;
    }
    if (res.status === 400 && msg.includes("API_KEY")) {
      const e = new Error("Invalid GEMINI_API_KEY. Please check your Render environment variable.");
      e.isAIError = true;
      throw e;
    }
    const e = new Error(msg);
    e.isAIError = true;
    throw e;
  }

  const data = await res.json();
  const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

  if (!json) return raw;

  const clean = raw.replace(/^```(?:json)?|```$/gm, "").trim();
  try { return JSON.parse(clean); } catch { /* try extracting */ }
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { /* fall through */ } }

  const e = new Error("AI returned invalid JSON. Raw: " + raw.slice(0, 200));
  e.isAIError = true;
  throw e;
}

async function checkHealth() {
  if (!GEMINI_API_KEY) return { ok: false, message: "GEMINI_API_KEY not configured" };
  try {
    // Quick test call
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (res.status === 400 || res.status === 401) return { ok: false, message: "Invalid API key" };
    return { ok: res.ok, modelAvailable: res.ok, message: res.ok ? "Gemini API ready" : `Status ${res.status}` };
  } catch {
    return { ok: false, message: "Cannot reach Gemini API" };
  }
}

module.exports = { callGemini, checkHealth };
