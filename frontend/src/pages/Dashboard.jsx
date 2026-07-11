// CHANGES FROM v5:
// 1. Added refreshKey state — increments when History deletes an interview
//    This triggers useEffect to re-fetch stats automatically
// 2. Added highest score stat card
// 3. onRefresh prop exposed so App.jsx / History can trigger a reload
// 4. Recent sessions list also refreshes on delete

import { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";

export default function Dashboard({ user, onStartSetup, refreshKey }) {
  const [health,  setHealth]  = useState(null);
  const [history, setHistory] = useState([]);
  const [resume,  setResume]  = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [h, iv, r] = await Promise.allSettled([
        api("/health"),
        api("/interview"),
        api("/resume")
      ]);
      if (h.status  === "fulfilled") setHealth(h.value);
      if (iv.status === "fulfilled") setHistory(iv.value.interviews || []);
      if (r.status  === "fulfilled") setResume(r.value.resume);
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever refreshKey changes (triggered by delete in History)
  useEffect(() => { loadData(); }, [loadData, refreshKey]);

  const aiOk     = health?.ollama?.ok && health?.ollama?.modelAvailable;
  const completed = history.filter(i => i.status === "completed" && i.finalReport);

  const avgScore  = completed.length
    ? Math.round(completed.reduce((s, i) => s + (i.finalReport.overallScore || 0), 0) / completed.length)
    : 0;
  const highScore = completed.length
    ? Math.max(...completed.map(i => i.finalReport.overallScore || 0))
    : 0;

  const scoreColor = (s) => s >= 7 ? "var(--green)" : s >= 4 ? "var(--yellow)" : "var(--red)";

  return (
    <div>
      <div className="page-header">
        <h1>Welcome back, {user?.name?.split(" ")[0] || "there"} 👋</h1>
        <p>Ready for your next interview practice session?</p>
      </div>

      <div className="page-body">
        {/* AI status banner */}
        {health && !aiOk && (
          <div className="health-banner">
            ⚠ AI features limited — Ollama is {health.ollama?.ok ? "running but model not loaded" : "not running"}.
            {health.whisper?.ok ? "" : " Whisper speech service is also offline."}
            {" "}Text-mode interviews work without AI.
          </div>
        )}

        {/* Stat cards — all recomputed from current history after any delete */}
        <div className="stat-grid">
          <div className="stat-card">
            <div className="label">Interviews Done</div>
            <div className="value">{loading ? "—" : completed.length}</div>
            <div className="sub">Completed sessions</div>
          </div>

          <div className="stat-card">
            <div className="label">Avg Score</div>
            <div className="value" style={{ color: completed.length ? scoreColor(avgScore) : "var(--muted)" }}>
              {loading ? "—" : completed.length ? avgScore + "/10" : "—"}
            </div>
            <div className="sub">Overall average</div>
          </div>

          <div className="stat-card">
            <div className="label">Highest Score</div>
            <div className="value" style={{ color: completed.length ? scoreColor(highScore) : "var(--muted)" }}>
              {loading ? "—" : completed.length ? highScore + "/10" : "—"}
            </div>
            <div className="sub">Personal best</div>
          </div>

          <div className="stat-card">
            <div className="label">Resume</div>
            <div className="value" style={{ fontSize:16, marginTop:4 }}>
              {resume?.status === "ready"      ? "✅ Ready"      :
               resume?.status === "processing" ? "⏳ Processing" : "❌ None"}
            </div>
            <div className="sub">{resume?.originalName || "Upload to unlock AI questions"}</div>
          </div>
        </div>

        {/* Start interview CTA */}
        <div style={{ marginBottom:24 }}>
          <button
            className="btn-primary"
            style={{ width:"auto", padding:"14px 36px", fontSize:16 }}
            onClick={onStartSetup}
          >
            🎯 Start New Interview
          </button>
        </div>

        {/* Recent sessions — also live-updates after delete */}
        {!loading && history.length > 0 && (
          <div className="card">
            <h3>Recent Sessions</h3>
            {history.slice(0, 5).map((iv, idx) => (
              <div key={idx} className="history-item">
                <div>
                  <div style={{ fontWeight:600, fontSize:14 }}>
                    {iv.type}{iv.subject ? ` — ${iv.subject}` : ""}
                  </div>
                  <div style={{ fontSize:12, color:"var(--muted)", marginTop:3 }}>
                    {iv.inputMode} mode · {new Date(iv.startedAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ textAlign:"right" }}>
                  {iv.finalReport && (
                    <span className="badge badge-blue">{iv.finalReport.overallScore}/10</span>
                  )}
                  <div style={{ fontSize:12, color:"var(--muted)", marginTop:4 }}>{iv.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && history.length === 0 && (
          <div className="empty-state" style={{ padding:"40px 0" }}>
            <div className="icon">🎯</div>
            <h3>No interviews yet</h3>
            <p>Start your first practice session above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
