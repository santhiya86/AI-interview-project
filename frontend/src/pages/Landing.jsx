export default function Landing({ onLogin, onSignup }) {
  return (
    <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", flexDirection:"column" }}>
      {/* Nav */}
      <nav style={{ padding:"16px 40px", display:"flex", alignItems:"center", justifyContent:"space-between", borderBottom:"1px solid var(--border)" }}>
        <h1 style={{ fontSize:22, fontWeight:700 }}>Interview<span style={{ color:"var(--accent)" }}>Pro</span></h1>
        <div style={{ display:"flex", gap:12 }}>
          <button className="btn btn-outline" onClick={onLogin} style={{ padding:"8px 20px" }}>Sign In</button>
          <button className="btn btn-accent btn" onClick={onSignup} style={{ padding:"8px 20px" }}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"60px 20px", textAlign:"center" }}>
        <div style={{ fontSize:14, fontWeight:600, color:"var(--accent)", textTransform:"uppercase", letterSpacing:2, marginBottom:16 }}>
          AI-Powered Interview Platform
        </div>
        <h1 style={{ fontSize:52, fontWeight:800, lineHeight:1.2, marginBottom:20, maxWidth:700 }}>
          Ace Your Next Interview with <span style={{ color:"var(--accent)" }}>AI Coaching</span>
        </h1>
        <p style={{ fontSize:18, color:"var(--muted)", maxWidth:560, lineHeight:1.7, marginBottom:40 }}>
          Practice with real interview questions, get instant AI feedback on your answers,
          and track your improvement over time — for free.
        </p>
        <div style={{ display:"flex", gap:14 }}>
          <button className="btn-primary" style={{ padding:"14px 36px", fontSize:16, borderRadius:10, border:"none", cursor:"pointer" }} onClick={onSignup}>
            Start Practicing Free →
          </button>
          <button className="btn btn-outline" style={{ padding:"14px 28px", fontSize:16 }} onClick={onLogin}>
            Sign In
          </button>
        </div>

        {/* Feature pills */}
        <div style={{ display:"flex", flexWrap:"wrap", gap:10, marginTop:48, justifyContent:"center" }}>
          {["🎙 Voice & Text Answers","🤖 AI Scoring & Feedback","📄 Resume-Based Questions","📊 Performance Reports","💬 AI Coach Chatbot","🏆 Track Progress"].map(f => (
            <span key={f} style={{ background:"var(--surface)", border:"1px solid var(--border)", padding:"8px 16px", borderRadius:20, fontSize:14, color:"var(--muted)" }}>{f}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
