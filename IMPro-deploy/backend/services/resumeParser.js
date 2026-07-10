// ══════════════════════════════════════════════════════════════════════════════
// Rule-based Resume Parser — works WITHOUT Ollama.
// Extracts skills, projects, education, experience using regex patterns.
// Used as fallback when Ollama is unavailable (e.g. on Render free tier).
// ══════════════════════════════════════════════════════════════════════════════

const PROGRAMMING_LANGUAGES = [
  "javascript","typescript","python","java","c++","c#","c","ruby","go","rust",
  "kotlin","swift","php","scala","r","matlab","perl","dart","bash","shell"
];

const FRAMEWORKS = [
  "react","angular","vue","next.js","nextjs","nuxt","express","fastapi","django",
  "flask","spring","laravel","rails","node.js","nodejs","tailwind","bootstrap",
  "redux","graphql","rest","mongodb","mysql","postgresql","sqlite","firebase",
  "aws","azure","docker","kubernetes","git","linux","tensorflow","pytorch"
];

const SKILLS_KEYWORDS = [
  "html","css","sql","nosql","json","xml","api","agile","scrum","devops",
  "machine learning","deep learning","nlp","data structures","algorithms",
  "object oriented","microservices","ci/cd","testing","jest","mocha"
];

function extractSection(text, headings) {
  const lines = text.split("\n");
  let inSection = false;
  const result = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lower = line.toLowerCase();

    const isHeading = headings.some(h => lower.includes(h)) && line.length < 60;
    const isNextHeading = i + 1 < lines.length &&
      ["experience","education","project","skill","certification","achievement","summary","objective","profile"]
        .some(h => lines[i+1].trim().toLowerCase().startsWith(h)) &&
      lines[i+1].trim().length < 60;

    if (isHeading) { inSection = true; continue; }
    if (inSection && isNextHeading) { inSection = false; continue; }
    if (inSection && line.length > 2) result.push(line);
  }
  return result;
}

function parseResume(rawText) {
  const text = rawText || "";
  const lower = text.toLowerCase();
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);

  // ── Skills ─────────────────────────────────────────────────────────────────
  const languages  = PROGRAMMING_LANGUAGES.filter(l => lower.includes(l));
  const frameworks = FRAMEWORKS.filter(f => lower.includes(f));
  const skills     = SKILLS_KEYWORDS.filter(s => lower.includes(s));

  // ── Projects ──────────────────────────────────────────────────────────────
  const projectLines = extractSection(text, ["project", "projects", "personal project", "academic project"]);
  const projects = [];
  let currentProject = null;

  for (const line of projectLines) {
    // A project title is usually a short line without common sentence words
    if (line.length < 80 && !line.startsWith("•") && !line.startsWith("-") &&
        !line.toLowerCase().startsWith("tech") && /^[A-Z]/.test(line)) {
      if (currentProject) projects.push(currentProject);
      currentProject = { name: line, summary: "", tech: [] };
    } else if (currentProject) {
      if (!currentProject.summary) currentProject.summary = line.replace(/^[-•]\s*/, "");
      // Extract techs mentioned in project line
      [...PROGRAMMING_LANGUAGES, ...FRAMEWORKS].forEach(t => {
        if (line.toLowerCase().includes(t) && !currentProject.tech.includes(t))
          currentProject.tech.push(t);
      });
    }
  }
  if (currentProject) projects.push(currentProject);

  // ── Education ─────────────────────────────────────────────────────────────
  const eduLines = extractSection(text, ["education", "academic", "qualification"]);
  const education = [];
  for (const line of eduLines) {
    const yearMatch = line.match(/\b(19|20)\d{2}\b/);
    if (line.length > 10) {
      education.push({
        degree: line.replace(/\b(19|20)\d{2}\b.*/, "").trim(),
        institution: "",
        year: yearMatch ? yearMatch[0] : ""
      });
    }
  }

  // ── Experience ────────────────────────────────────────────────────────────
  const expLines = extractSection(text, ["experience", "work experience", "employment", "internship"]);
  const experience = [];
  for (const line of expLines) {
    if (line.length > 10 && line.length < 100 && /^[A-Z]/.test(line)) {
      experience.push({ role: line, company: "", duration: "", summary: "" });
    }
  }

  // ── Name (first non-empty line usually) ───────────────────────────────────
  const name = lines[0] || "";

  // ── Generate questions from extracted data ────────────────────────────────
  const questions = [];

  // Project-based questions
  projects.slice(0, 3).forEach(p => {
    questions.push({ question: `Explain your "${p.name}" project in detail.`, category: "Project", difficulty: "Medium", targetSkill: p.name });
    if (p.tech.length > 0)
      questions.push({ question: `Why did you choose ${p.tech[0]} for your "${p.name}" project?`, category: "Technical", difficulty: "Medium", targetSkill: p.tech[0] });
  });

  // Skill-based questions
  if (languages.length > 0)
    questions.push({ question: `How proficient are you in ${languages[0]}? Rate yourself and explain.`, category: "Technical", difficulty: "Easy", targetSkill: languages[0] });

  if (frameworks.length > 0)
    questions.push({ question: `Describe how you have used ${frameworks[0]} in your projects.`, category: "Technical", difficulty: "Medium", targetSkill: frameworks[0] });

  // Generic but important questions
  questions.push({ question: "What was the biggest technical challenge you faced and how did you overcome it?", category: "Behavioral", difficulty: "Medium", targetSkill: "Problem Solving" });
  questions.push({ question: "Walk me through your most significant project from start to finish.", category: "Project", difficulty: "Hard", targetSkill: "Communication" });
  questions.push({ question: "How do you stay updated with new technologies in your field?", category: "Behavioral", difficulty: "Easy", targetSkill: "Learning" });
  questions.push({ question: "Where do you see yourself in 3-5 years?", category: "HR", difficulty: "Easy", targetSkill: "Career Goals" });

  return {
    candidate: { name, skills, languages, frameworks, projects, education, experience, certifications: [], achievements: [] },
    questions: questions.slice(0, 10)
  };
}

module.exports = { parseResume };
