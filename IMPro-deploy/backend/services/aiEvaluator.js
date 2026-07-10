const { callGroq } = require("./groq");

async function evaluateAnswer({ question, answer, interviewType, speechMetrics = null }) {
  const speechSection = speechMetrics ? `
SPEECH METRICS:
- Words per minute: ${speechMetrics.wpm} (ideal: 120-160)
- Long pauses: ${speechMetrics.longPauses}
- Filler words: ${speechMetrics.fillerCount} (${speechMetrics.fillerRate}% of words)
- Voice stability: ${speechMetrics.voiceStabilityScore}/100
` : "";

  const prompt = `You are an expert interview evaluator for a ${interviewType} interview.

QUESTION: "${question}"
CANDIDATE ANSWER: "${answer}"
${speechSection}
Evaluate honestly. Score 0-10 for each dimension.

Respond with this exact JSON structure:
{
  "overallScore": 7,
  "technicalScore": 7,
  "communicationScore": 7,
  "grammarScore": 8,
  "confidenceScore": 7,
  "relevanceScore": 8,
  "strengths": ["point1", "point2"],
  "weaknesses": ["point1", "point2"],
  "improvedAnswer": "A better version of this answer in 2-3 sentences",
  "feedback": "One paragraph of specific actionable feedback"
}`;

  const result = await callGroq(prompt, { json: true });
  const clamp  = (v) => Math.max(0, Math.min(10, Math.round(Number(v) || 0)));
  return {
    overallScore:       clamp(result.overallScore),
    technicalScore:     clamp(result.technicalScore),
    communicationScore: clamp(result.communicationScore),
    grammarScore:       clamp(result.grammarScore),
    confidenceScore:    clamp(result.confidenceScore),
    relevanceScore:     clamp(result.relevanceScore),
    strengths:      Array.isArray(result.strengths)  ? result.strengths.slice(0, 4)  : [],
    weaknesses:     Array.isArray(result.weaknesses) ? result.weaknesses.slice(0, 4) : [],
    improvedAnswer: result.improvedAnswer || "",
    feedback:       result.feedback || ""
  };
}

async function generateResumeQuestions(resumeText) {
  const prompt = `You are a technical interviewer. Analyze this resume and generate 8 specific interview questions.
Focus on actual projects, technologies, and experience mentioned. Do NOT ask generic questions.

RESUME:
${resumeText.slice(0, 5000)}

Respond with this exact JSON structure:
{
  "candidate": {
    "name": "extracted name",
    "skills": ["skill1", "skill2"],
    "languages": ["Python", "JavaScript"],
    "frameworks": ["React", "Node.js"],
    "projects": [{"name":"Project Name","tech":["tech1"],"summary":"one line summary"}],
    "education": [{"degree":"B.Tech","institution":"College Name","year":"2024"}],
    "experience": [{"role":"Intern","company":"Company","duration":"6 months"}],
    "certifications": [],
    "achievements": []
  },
  "questions": [
    {"question":"Specific question about their work","category":"Technical","difficulty":"Medium","targetSkill":"skill name"}
  ]
}`;

  return callGroq(prompt, { json: true, timeoutMs: 90000 });
}

async function chatbotReply({ question, answer, userMessage, history = [] }) {
  const historyText = history.slice(-4).map(h => `${h.role}: ${h.content}`).join("\n");

  // Use plain text mode first (more reliable), then parse the reply manually
  const prompt = `You are an AI interview coach. Help the candidate with their interview.

Interview question: "${question}"
Candidate answer so far: "${answer || "(not answered yet)"}"

${historyText ? "Recent conversation:\n" + historyText + "\n" : ""}
Candidate message: "${userMessage}"

Give specific, helpful advice. Keep your response under 150 words.
Then on a new line write IMPROVED: followed by an improved version of their answer (or leave blank if not needed).
Then on a new line write TIP: followed by one quick tip.`;

  // Use non-JSON mode — much more reliable, avoids JSON parse failures
  const raw = await callGroq(prompt, { json: false, timeoutMs: 30000 });

  // Parse the structured plain-text response
  const lines    = raw.split("\n");
  const improved = lines.find(l => l.startsWith("IMPROVED:"))?.replace("IMPROVED:", "").trim() || "";
  const tip      = lines.find(l => l.startsWith("TIP:"))?.replace("TIP:", "").trim() || "";
  const reply    = lines
    .filter(l => !l.startsWith("IMPROVED:") && !l.startsWith("TIP:"))
    .join("\n")
    .trim() || raw.trim();

  return {
    reply:          reply,
    improvedAnswer: improved,
    tip:            tip
  };
}

module.exports = { evaluateAnswer, generateResumeQuestions, chatbotReply };
