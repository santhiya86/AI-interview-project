// Ollama Service
// Model priority: phi3:mini (fastest) → llama3.2 → env variable
// All AI features gracefully degrade if Ollama is not running.

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

// Dynamically pick the best available model
let selectedModel = process.env.OLLAMA_MODEL || null;

async function getBestModel() {
  if (selectedModel) return selectedModel;
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return "phi3:mini";
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    // Priority order: phi3:mini is fastest for resume/answer tasks
    const priority = ["phi3:mini", "phi3", "llama3.2", "llama3.2:latest", "tinyllama", "tinyllama:latest"];
    for (const pref of priority) {
      if (models.some(m => m.startsWith(pref.split(":")[0]))) {
        selectedModel = models.find(m => m.startsWith(pref.split(":")[0]));
        console.log("[ollama] selected model:", selectedModel);
        return selectedModel;
      }
    }
    // Use whatever is available
    if (models.length > 0) { selectedModel = models[0]; return selectedModel; }
  } catch { /* fall through */ }
  return "phi3:mini";
}

async function callOllama(prompt, { json = true, timeoutMs = 120000 } = {}) {
  const model = await getBestModel();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        format: json ? "json" : undefined,
        options: { temperature: 0.3, num_predict: 1024 }
      }),
      signal: controller.signal
    });
  } catch (err) {
    clearTimeout(timer);
    const e = new Error(err.name === "AbortError"
      ? "Ollama timed out. The model is loading or the machine is too slow."
      : `Ollama unreachable at ${OLLAMA_URL}.`);
    e.isOllamaError = true;
    throw e;
  }
  clearTimeout(timer);

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const e = new Error(`Ollama error ${res.status}: ${txt}`);
    e.isOllamaError = true;
    throw e;
  }

  const data = await res.json();
  const raw  = (data.response || "").trim();

  if (!json) return raw;

  const clean = raw.replace(/^```(?:json)?|```$/gm, "").trim();
  try { return JSON.parse(clean); } catch { /* try extracting */ }
  const match = clean.match(/\{[\s\S]*\}/);
  if (match) { try { return JSON.parse(match[0]); } catch { /* fall through */ } }

  const e = new Error("Ollama returned invalid JSON: " + raw.slice(0, 200));
  e.isOllamaError = true;
  throw e;
}

async function checkHealth() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, message: `Status ${res.status}` };
    const data   = await res.json();
    const models = (data.models || []).map(m => m.name);
    const hasAny = models.length > 0;
    return {
      ok: true,
      modelAvailable: hasAny,
      models,
      message: hasAny ? `Ready (${models.join(", ")})` : "No models pulled"
    };
  } catch (err) {
    return { ok: false, modelAvailable: false, message: "Ollama not running at " + OLLAMA_URL };
  }
}

module.exports = { callOllama, checkHealth, OLLAMA_URL };
