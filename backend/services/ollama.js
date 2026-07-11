// AI Service - Groq API (Render compatible)

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function callOllama(prompt, { json = true, timeoutMs = 60000 } = {}) {

  const controller = new AbortController();

  const timer = setTimeout(() => {
    controller.abort();
  }, timeoutMs);


  try {
    const response = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1024
      }),
      signal: controller.signal
    });


    clearTimeout(timer);


    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq Error: ${errorText}`);
    }


    const data = await response.json();

    const raw = data.choices[0].message.content.trim();


    if (!json) {
      return raw;
    }


    const clean = raw
      .replace(/^```json/g, "")
      .replace(/```$/g, "")
      .trim();


    try {
      return JSON.parse(clean);
    } catch {

      const match = clean.match(/\{[\s\S]*\}/);

      if (match) {
        return JSON.parse(match[0]);
      }

      throw new Error("Invalid JSON from Groq: " + raw.slice(0,200));
    }


  } catch (error) {

    clearTimeout(timer);

    const err = new Error(
      error.name === "AbortError"
        ? "Groq request timed out"
        : error.message
    );

    err.isAIError = true;

    throw err;
  }
}


async function checkHealth() {

  return {
    ok: !!process.env.GROQ_API_KEY,
    modelAvailable: true,
    models: ["llama-3.1-8b-instant"],
    message: process.env.GROQ_API_KEY
      ? "Groq AI Ready"
      : "GROQ_API_KEY missing"
  };

}


module.exports = {
  callOllama,
  checkHealth
};
