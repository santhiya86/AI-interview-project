import { useState, useEffect } from "react";
import { api } from "../utils/api";
import { getQuestions } from "../utils/questions";

const SUBJECTS = ["OOPS","CN","DBMS","OS","WebDev","DSA"];
const DIFFICULTIES = ["Easy","Medium","Hard"];
const MODES = [
  { id: "text",   icon: "⌨️",  name: "Text",   desc: "Type your answers" },
  { id: "voice",  icon: "🎙",  name: "Voice",  desc: "Speak your answers" },
  { id: "hybrid", icon: "🔀",  name: "Hybrid", desc: "Choose per question" }
];

export default function Setup({ onStart }) {
  const [type, setType]         = useState("");
  const [subject, setSubject]   = useState("");
  const [difficulty, setDifficulty] = useState("");
  const [inputMode, setInputMode]   = useState("");
  const [resume, setResume]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");

  useEffect(() => {
    api("/resume").then(d => setResume(d.resume)).catch(() => {});
  }, []);

  const handleStart = async () => {
    setError("");
    if (!type || !inputMode) { setError("Please select interview type and input mode."); return; }
    if (type === "Technical" && (!subject || !difficulty)) { setError("Please select subject and difficulty."); return; }

    let questions = [];
    if (type === "Resume") {
      if (!resume || resume.status !== "ready") { setError("Please upload a resume first and wait for analysis to complete."); return; }
      questions = resume.questions.map(q => q.question);
    } else {
      questions = getQuestions(type, subject, difficulty);
    }

    if (!questions.length) { setError("No questions available for this selection."); return; }

    setLoading(true);
    try {
      const data = await api("/interview/start", {
        method: "POST",
        body: JSON.stringify({ type, subject, difficulty, inputMode, questions })
      });
      onStart({ type, subject, difficulty, inputMode, questions }, data.interviewId);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const Pill = ({ val, selected, onClick }) => (
    <button className={"pill" + (selected ? " selected" : "")} onClick={onClick}>{val}</button>
  );

  return (
    <div>
      <div className="page-header">
        <h1>Setup Interview</h1>
        <p>Configure your practice session</p>
      </div>
      <div className="page-body">
        <div style={{ maxWidth: 640 }}>
          {error && <div className="error-box" style={{ marginBottom: 20 }}>{error}</div>}

          <div className="setup-section">
            <h3>Interview Type</h3>
            <div className="pill-group">
              {["Technical","HR","Behavioral","Resume"].map(t => (
                <Pill key={t} val={t} selected={type === t} onClick={() => { setType(t); setSubject(""); setDifficulty(""); }} />
              ))}
            </div>
            {type === "Resume" && (!resume || resume.status !== "ready") && (
              <div style={{ marginTop: 10, fontSize: 13, color: "var(--yellow)" }}>
                ⚠ No analyzed resume found. Go to Resume page to upload one first.
              </div>
            )}
          </div>

          {type === "Technical" && (
            <>
              <div className="setup-section">
                <h3>Subject</h3>
                <div className="pill-group">
                  {SUBJECTS.map(s => <Pill key={s} val={s} selected={subject === s} onClick={() => setSubject(s)} />)}
                </div>
              </div>
              <div className="setup-section">
                <h3>Difficulty</h3>
                <div className="pill-group">
                  {DIFFICULTIES.map(d => <Pill key={d} val={d} selected={difficulty === d} onClick={() => setDifficulty(d)} />)}
                </div>
              </div>
            </>
          )}

          <div className="setup-section">
            <h3>Input Mode</h3>
            <div className="input-mode-cards">
              {MODES.map(m => (
                <div key={m.id} className={"input-mode-card" + (inputMode === m.id ? " selected" : "")} onClick={() => setInputMode(m.id)}>
                  <div className="icon">{m.icon}</div>
                  <div className="name">{m.name}</div>
                  <div className="desc">{m.desc}</div>
                </div>
              ))}
            </div>
          </div>

          <button className="btn-start" onClick={handleStart} disabled={loading}>
            {loading ? "Starting..." : "🚀 Start Interview"}
          </button>
        </div>
      </div>
    </div>
  );
}
