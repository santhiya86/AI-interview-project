import { useState, useEffect, useCallback } from "react";
import { api } from "../utils/api";

export default function ResumePage() {
  const [resume, setResume]   = useState(null);
  const [file, setFile]       = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError]     = useState("");
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try { const d = await api("/resume"); setResume(d.resume); }
    catch { setResume(null); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Poll while processing
  useEffect(() => {
    if (resume?.status !== "processing") return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [resume?.status, load]);

  const upload = async () => {
    if (!file) { setError("Please select a PDF or DOCX file."); return; }
    setError(""); setUploading(true);
    try {
      const fd = new FormData();
      fd.append("resume", file);
      await api("/resume/upload", { method: "POST", body: fd });
      setFile(null);
      setTimeout(load, 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const deleteResume = async () => {
    if (!window.confirm("Delete your resume? This will remove all extracted data and generated questions.")) return;
    setDeleting(true);
    try { await api("/resume", { method: "DELETE" }); setResume(null); }
    catch (err) { setError(err.message); }
    finally { setDeleting(false); }
  };

  const download = async () => {
    const token = localStorage.getItem("token");
    const res = await fetch("http://localhost:5000/api/resume/download", { headers: { Authorization: "Bearer " + token } });
    if (!res.ok) { setError("Download failed"); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = resume.originalName; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="page-header">
        <h1>Resume Manager</h1>
        <p>Upload your resume to unlock personalized AI interview questions</p>
      </div>
      <div className="page-body">
        <div className="resume-page">
          {error && <div className="error-box" style={{ marginBottom: 16 }}>{error}</div>}

          {/* Upload zone */}
          <div className="card" style={{ marginBottom: 20 }}>
            <h3>Upload Resume</h3>
            <div className="upload-zone" onClick={() => document.getElementById("resume-file").click()}>
              <div className="icon">📄</div>
              <h3>{file ? file.name : "Click to choose file"}</h3>
              <p>PDF or DOCX · Max 15MB</p>
            </div>
            <input id="resume-file" type="file" accept=".pdf,.doc,.docx" style={{ display:"none" }}
              onChange={e => { setFile(e.target.files[0]); setError(""); }} />
            <button className="btn btn-accent btn" style={{ marginTop: 14 }} onClick={upload} disabled={!file || uploading}>
              {uploading ? "Uploading..." : resume ? "Replace Resume" : "Upload Resume"}
            </button>
          </div>

          {/* Current resume */}
          {resume && (
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="row-between mb-4">
                <div>
                  <div style={{ fontWeight:600, fontSize:16 }}>{resume.originalName}</div>
                  <div style={{ fontSize:13, color:"var(--muted)", marginTop:4 }}>
                    Uploaded {new Date(resume.uploadedAt).toLocaleDateString()} · {Math.round((resume.fileSize||0)/1024)} KB
                  </div>
                </div>
                <span className={"status-pill " + resume.status}>
                  {resume.status === "processing" && "⏳ Analyzing..."}
                  {resume.status === "ready"      && "✅ Ready"}
                  {resume.status === "failed"     && "❌ Failed"}
                </span>
              </div>

              {resume.status === "failed" && (
                <div className="error-box">{resume.error || "Analysis failed. Try re-uploading."}</div>
              )}
              {resume.status === "processing" && (
                <div style={{ fontSize:13, color:"var(--yellow)" }}>
                  Analyzing your resume... This takes 20-60 seconds. Page updates automatically.
                </div>
              )}

              <div className="flex gap-2" style={{ marginTop: 14 }}>
                <button className="btn btn-outline" onClick={download}>⬇ Download</button>
                <button className="btn btn-danger btn" onClick={deleteResume} disabled={deleting}>
                  {deleting ? "Deleting..." : "🗑 Delete"}
                </button>
              </div>
            </div>
          )}

          {/* Analysis results */}
          {resume?.status === "ready" && resume.candidate && (
            <>
              <div className="card" style={{ marginBottom: 20 }}>
                <h3>Extracted Skills</h3>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize:12, color:"var(--muted)", marginBottom:6 }}>Programming Languages</div>
                  {(resume.candidate.languages || []).map((s,i) => <span key={i} className="tag">{s}</span>)}
                </div>
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize:12, color:"var(--muted)", marginBottom:6 }}>Skills & Frameworks</div>
                  {[...(resume.candidate.skills||[]), ...(resume.candidate.frameworks||[])].map((s,i) => <span key={i} className="tag">{s}</span>)}
                </div>
                {(resume.candidate.projects||[]).length > 0 && (
                  <div>
                    <div style={{ fontSize:12, color:"var(--muted)", marginBottom:6 }}>Projects</div>
                    {(resume.candidate.projects||[]).map((p,i) => (
                      <div key={i} style={{ background:"var(--surface2)", borderRadius:8, padding:"10px 12px", marginBottom:8 }}>
                        <div style={{ fontWeight:600, fontSize:13 }}>{p.name}</div>
                        {p.summary && <div style={{ fontSize:12, color:"var(--muted)", marginTop:3 }}>{p.summary}</div>}
                        <div style={{ marginTop:6 }}>{(p.tech||[]).map((t,j) => <span key={j} className="tag">{t}</span>)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card">
                <h3>Generated Interview Questions ({resume.questions?.length || 0})</h3>
                <p style={{ fontSize:13, color:"var(--muted)", marginBottom:16 }}>
                  Go to New Interview → select "Resume" type to use these questions.
                </p>
                {(resume.questions||[]).map((q,i) => (
                  <div key={i} className="q-card">
                    <div className="q-cat">{q.category} · {q.difficulty}</div>
                    {q.question}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
