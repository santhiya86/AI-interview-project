// CHANGES FROM v5:
// 1. Added delete button per interview with confirmation dialog
// 2. After delete — removes from local state immediately (no full reload needed)
// 3. Added "View Details" button that opens the full report
// 4. Added interview count in header that updates after delete
// 5. Added highest score and average score summary at top
// 6. onDeleted prop callback notifies Dashboard to refresh its stats

import { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";

export default function History({ onView, onDeleted }) {
  const [interviews, setInterviews] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [deleting,   setDeleting]   = useState(null); // id currently being deleted
  const [error,      setError]      = useState("");

  const loadInterviews = useCallback(async () => {
    try {
      const data = await api("/interview");
      setInterviews(data.interviews || []);
    } catch {
      setError("Failed to load interviews. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInterviews(); }, [loadInterviews]);

  const handleDelete = async (iv) => {
    const confirmed = window.confirm(
      `Delete "${iv.type}${iv.subject ? " — " + iv.subject : ""}" interview?\n\nThis will permanently remove it from your history and update your dashboard stats.`
    );
    if (!confirmed) return;

    setDeleting(iv._id);
    setError("");
    try {
      await api(`/interview/${iv._id}`, { method: "DELETE" });
      // Remove from local state immediately — no reload needed
      setInterviews(prev => prev.filter(i => i._id !== iv._id));
      // Notify Dashboard to refresh its stats
      if (onDeleted) onDeleted();
    } catch (err) {
      setError("Delete failed: " + err.message);
    } finally {
      setDeleting(null);
    }
  };

  const handleView = async (iv) => {
    if (!iv.finalReport) return;
    try {
      // Fetch full interview with answers for the report page
      const data = await api(`/interview/${iv._id}`);
      onView({
        report:  iv.finalReport,
        answers: data.interview?.answers || [],
        config: {
          type:       iv.type,
          subject:    iv.subject,
          difficulty: iv.difficulty,
          inputMode:  iv.inputMode,
          questions:  data.interview?.questions || []
        }
      });
    } catch {
      setError("Could not load interview details.");
    }
  };

  // Computed stats
  const completed  = interviews.filter(i => i.status === "completed" && i.finalReport);
  const avgScore   = completed.length
    ? Math.round(completed.reduce((s, i) => s + (i.finalReport.overallScore || 0), 0) / completed.length)
    : 0;
  const highScore  = completed.length
    ? Math.max(...completed.map(i => i.finalReport.overallScore || 0))
    : 0;

  const scoreColor = (s) => s >= 7 ? "var(--green)" : s >= 4 ? "var(--yellow)" : "var(--red)";
  const scoreBadge = (s) => s >= 7 ? "badge-green" : s >= 4 ? "badge-yellow" : "badge-red";

  if (loading) {
    return (
      <div>
        <div className="page-header"><h1>Interview History</h1></div>
        <div className="page-body"><p style={{ color:"var(--muted)" }}>Loading...</p></div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Interview History</h1>
        <p>{interviews.length} session{interviews.length !== 1 ? "s" : ""} · {completed.length} completed</p>
      </div>

      <div className="page-body">
        {error && (
          <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#fca5a5", padding:"10px 14px", borderRadius:8, fontSize:13, marginBottom:16 }}>
            {error}
          </div>
        )}

        {/* Summary stats bar — updates automatically when interviews change */}
        {completed.length > 0 && (
          <div style={{ display:"flex", gap:14, marginBottom:24, flexWrap:"wrap" }}>
            <div className="stat-card" style={{ flex:1, minWidth:140 }}>
              <div className="label">Completed</div>
              <div className="value">{completed.length}</div>
              <div className="sub">Total sessions</div>
            </div>
            <div className="stat-card" style={{ flex:1, minWidth:140 }}>
              <div className="label">Avg Score</div>
              <div className="value" style={{ color: scoreColor(avgScore) }}>{avgScore}/10</div>
              <div className="sub">All sessions</div>
            </div>
            <div className="stat-card" style={{ flex:1, minWidth:140 }}>
              <div className="label">Highest Score</div>
              <div className="value" style={{ color: scoreColor(highScore) }}>{highScore}/10</div>
              <div className="sub">Personal best</div>
            </div>
          </div>
        )}

        {interviews.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📊</div>
            <h3>No interviews yet</h3>
            <p>Complete your first interview to see your history here.</p>
          </div>
        ) : (
          <div>
            {interviews.map((iv) => (
              <div
                key={iv._id}
                className="history-item"
                style={{ alignItems:"flex-start", flexWrap:"wrap", gap:12 }}
              >
                {/* Left: interview info */}
                <div style={{ flex:1, minWidth:200 }}>
                  <div style={{ fontWeight:600, fontSize:15, marginBottom:4 }}>
                    {iv.type}{iv.subject ? ` — ${iv.subject}` : ""}
                    {iv.difficulty ? ` (${iv.difficulty})` : ""}
                  </div>
                  <div style={{ fontSize:12, color:"var(--muted)", lineHeight:1.7 }}>
                    {iv.inputMode} mode ·{" "}
                    {new Date(iv.startedAt).toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })}
                    {iv.finalReport
                      ? ` · ${iv.finalReport.answeredQuestions}/${iv.finalReport.totalQuestions} answered`
                      : ""}
                  </div>
                </div>

                {/* Right: score badge + action buttons */}
                <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
                  {iv.finalReport && (
                    <span className={"badge " + scoreBadge(iv.finalReport.overallScore)}>
                      {iv.finalReport.overallScore}/10
                    </span>
                  )}
                  <span className={"badge " + (iv.status === "completed" ? "badge-green" : "badge-yellow")}>
                    {iv.status}
                  </span>

                  {/* View Details button — only for completed interviews */}
                  {iv.finalReport && (
                    <button
                      onClick={() => handleView(iv)}
                      style={{
                        padding:"5px 12px", borderRadius:6, fontSize:12, fontWeight:500,
                        background:"rgba(99,102,241,0.1)", border:"1px solid rgba(99,102,241,0.3)",
                        color:"#a5b4fc", cursor:"pointer"
                      }}
                    >
                      View
                    </button>
                  )}

                  {/* Delete button */}
                  <button
                    onClick={() => handleDelete(iv)}
                    disabled={deleting === iv._id}
                    style={{
                      padding:"5px 12px", borderRadius:6, fontSize:12, fontWeight:500,
                      background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.25)",
                      color:"#fca5a5", cursor: deleting === iv._id ? "not-allowed" : "pointer",
                      opacity: deleting === iv._id ? 0.5 : 1
                    }}
                  >
                    {deleting === iv._id ? "Deleting..." : "Delete"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
