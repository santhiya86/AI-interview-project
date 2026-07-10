// ══════════════════════════════════════════════════════════════════════════════
// Groq AI Service — replaces Gemini.
// Uses Groq API (free tier: 14,400 requests/day, very fast inference).
// Get your free API key at: https://console.groq.com/keys
// Set GROQ_API_KEY in Render environment variables.
// Model: llama3-8b-8192 (free, fast, great for interview tasks)
// ══════════════════════════════════════════════════════════════════════════════

const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

async function callGroq(prompt, { json = true, timeoutMs = 60000 } = {}) {
  if (!GROQ_API_KEY) {
    const e = new Error("GROQ_API_KEY not set. Add it to your Render environment variables.");
    e.isAIError = true;
    throw e;
  }

  let res;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type":  "application/json",
        "Authorization": `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content: json
              ? "You are a helpful AI assistant. Always respond with valid JSON only. No markdown, no explanation, just the JSON object."
              : "You are a helpful AI assistant."
          },
          { role: "user", content: prompt }
        ],
        temperature:       0.3,
        max_tokens:        1024,
        response_format:   json ? { type: "json_object" } : undefined
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });
  } catch (err) {
    const e = new Error(
      err.name === "TimeoutError"
        ? "AI request timed out. Please try again."
        : "Cannot reach Groq API. Check your internet connection."
    );
    e.isAIError = true;
    throw e;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg  = body?.error?.message || `Groq error ${res.status}`;

    if (res.status === 401) {
      const e = new Error("Invalid GROQ_API_KEY. Please check your Render environment variable.");
      e.isAIError = true;
      throw e;
    }
    if (res.status === 429) {
      const e = new Error("Groq rate limit reached. Please wait a moment and try again.");
      e.isAIError = true;
      throw e;
    }

    const e = new Error(msg);
    e.isAIError = true;
    throw e;
  }

  const data = await res.json();
  const raw  = data?.choices?.[0]?.message?.content || "";

  if (!json) return raw;

  const clean = raw.replace(/^```(?:json)?|```$/gm, "").trim();
  try { return JSON.parse(clean); } catch { /* try extracting */ }
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { /* fall through */ } }

  const e = new Error("Groq returned invalid JSON: " + raw.slice(0, 200));
  e.isAIError = true;
  throw e;
}

async function checkHealth() {
  if (!GROQ_API_KEY) return { ok: false, message: "GROQ_API_KEY not configured in environment variables" };
  try {
    const res = await fetch("https://api.groq.com/openai/v1/models", {
      headers: { "Authorization": `Bearer ${GROQ_API_KEY}` },
      signal: AbortSignal.timeout(5000)
    });
    if (res.status === 401) return { ok: false, message: "Invalid GROQ_API_KEY" };
    if (!res.ok) return { ok: false, message: `Groq API status ${res.status}` };
    const data   = await res.json();
    const models = (data.data || []).map(m => m.id);
    return { ok: true, modelAvailable: true, model: GROQ_MODEL, models, message: `Groq ready (${GROQ_MODEL})` };
  } catch (err) {
    return { ok: false, message: "Cannot reach Groq API: " + err.message };
  }
}

module.exports = { callGroq, checkHealth };
