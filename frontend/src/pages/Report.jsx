import { useState } from "react";

const PERF = [[8,"Excellent","var(--green)"], [6,"Good","#60a5fa"], [4,"Average","var(--yellow)"], [0,"Needs Work","var(--red)"]];
function perf(score) { return PERF.find(([t]) => score >= t) || PERF[3]; }

function ScoreBar({ label, value, max = 10 }) {
  const pct = Math.round((value / max) * 100);
  const color = value >= 7 ? "var(--green)" : value >= 4 ? "var(--yellow)" : "var(--red)";
  return (
    <div className="bar-item">
      <div className="bar-header"><span>{label}</span><span style={{ color }}>{value}/{max}</span></div>
      <div className="bar-track"><div className="bar-fill" style={{ width: pct + "%", background: color }} /></div>
    </div>
  );
}

export default function Report({ data, onRetake, onDashboard }) {
  const [tab, setTab] = useState("overview");
  if (!data) return <div className="page-body"><p>No report data available.</p></div>;

  const { report, answers, config } = data;
  const [,perfLabel, perfColor] = perf(report.overallScore);

  const copy = () => {
    const txt = [
      `InterviewPro Report — ${report.type}${report.subject ? " " + report.subject : ""}`,
      `Overall Score: ${report.overallScore}/10 (${perfLabel})`,
      `Technical: ${report.technicalScore}/10 | Communication: ${report.communicationScore}/10`,
      `Grammar: ${report.grammarScore}/10 | Confidence: ${report.confidenceScore}/10`,
      `Strengths: ${report.strengths.join(", ")}`,
      `Weaknesses: ${report.weaknesses.join(", ")}`
    ].join("\n");
    navigator.clipboard.writeText(txt).catch(() => {});
    alert("Report copied to clipboard!");
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", padding: "28px", overflowY: "auto" }}>
      <div className="report-page">
        {/* Header */}
        <div className="row-between mb-4">
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Interview Report</h1>
          <div className="flex gap-2">
            <button className="btn btn-outline" onClick={copy}>📋 Copy</button>
            <button className="btn btn-outline" onClick={onRetake}>🔄 Retake</button>
            <button className="btn btn-accent btn" onClick={onDashboard}>← Dashboard</button>
          </div>
        </div>

        {/* Score Hero */}
        <div className="score-hero">
          <div className="big-score">{report.overallScore}</div>
          <div className="label">out of 10 overall score</div>
          <div className="perf-badge" style={{ background: `${perfColor}22`, borderColor: `${perfColor}44`, color: perfColor }}>
            {perfLabel}
          </div>
          <div style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
            {report.type}{report.subject ? ` · ${report.subject}` : ""}{report.difficulty ? ` · ${report.difficulty}` : ""} · {report.inputMode} mode · {Math.round(report.durationSec / 60)} min
          </div>
        </div>

        {/* Score Grid */}
        <div className="score-grid">
          {[
            ["Technical",     report.technicalScore],
            ["Communication", report.communicationScore],
            ["Grammar",       report.grammarScore],
            ["Confidence",    report.confidenceScore],
          ].map(([label, val]) => {
            const [,, color] = perf(val);
            return (
              <div key={label} className="score-item">
                <div className="s-val" style={{ color }}>{val}</div>
                <div className="s-label">{label}</div>
              </div>
            );
          })}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          {["overview","breakdown","transcript"].map(t => (
            <button key={t} className={"btn " + (tab === t ? "btn-accent" : "btn-outline")} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <>
            <div className="feedback-2col">
              <div className="feedback-box green">
                <h4>✅ Strengths</h4>
                <ul>{report.strengths.length ? report.strengths.map((s,i) => <li key={i}>{s}</li>) : <li>Keep practicing to build strengths.</li>}</ul>
              </div>
              <div className="feedback-box red">
                <h4>⚠ Areas to Improve</h4>
                <ul>{report.weaknesses.length ? report.weaknesses.map((w,i) => <li key={i}>{w}</li>) : <li>Great job! No major weaknesses.</li>}</ul>
              </div>
            </div>
            <div className="card">
              <h3>Detailed Scores</h3>
              <ScoreBar label="Overall"       value={report.overallScore} />
              <ScoreBar label="Technical"     value={report.technicalScore} />
              <ScoreBar label="Communication" value={report.communicationScore} />
              <ScoreBar label="Grammar"       value={report.grammarScore} />
              <ScoreBar label="Confidence"    value={report.confidenceScore} />
            </div>
          </>
        )}

        {tab === "breakdown" && (
          <div>
            {answers.map((a, i) => (
              <div key={i} className="qa-item">
                <div className="qa-q">Q{i+1}: {a.question}</div>
                <div className="qa-a">{a.textAnswer || a.transcript || "(no answer)"}</div>
                {a.aiScores && (
                  <>
                    <div className="flex gap-2" style={{ flexWrap:"wrap", marginBottom: 8 }}>
                      {["overallScore","technicalScore","communicationScore"].map(k => (
                        <span key={k} className="badge badge-blue">{k.replace("Score","")}: {a.aiScores[k]}/10</span>
                      ))}
                    </div>
                    {a.aiScores.feedback && <div style={{ fontSize:13, color:"var(--muted)", marginBottom:8 }}>{a.aiScores.feedback}</div>}
                    {a.aiScores.improvedAnswer && (
                      <div style={{ background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:8, padding:"10px 12px", fontSize:13 }}>
                        <strong style={{ color:"var(--accent)" }}>Better answer: </strong>{a.aiScores.improvedAnswer}
                      </div>
                    )}
                  </>
                )}
                {!a.aiScores && <div style={{ fontSize:12, color:"var(--muted)" }}>AI scoring unavailable for this answer.</div>}
              </div>
            ))}
          </div>
        )}

        {tab === "transcript" && (
          <div className="card">
            <h3>Full Transcript</h3>
            {answers.map((a, i) => (
              <div key={i} style={{ marginBottom: 20 }}>
                <div style={{ fontWeight:600, fontSize:14, marginBottom:6 }}>Q{i+1}: {a.question}</div>
                <div style={{ fontSize:13, color:"var(--muted)", paddingLeft:12, borderLeft:"3px solid var(--border)" }}>
                  {a.textAnswer || a.transcript || "(no answer)"}
                  {a.speechMetrics && (
                    <div style={{ marginTop:8, fontSize:12, color:"var(--accent)" }}>
                      {a.speechMetrics.wpm} WPM · {a.speechMetrics.fillerCount} fillers · {a.speechMetrics.longPauses} long pauses
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
