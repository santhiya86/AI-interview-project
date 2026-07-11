import { useState, useEffect } from "react";
import Landing          from "./pages/Landing";
import Login            from "./pages/Login";
import Signup           from "./pages/Signup";
import ProfileSetup     from "./pages/ProfileSetup";
import Dashboard        from "./pages/Dashboard";
import Setup            from "./pages/Setup";
import InterviewScreen  from "./pages/InterviewScreen";
import Report           from "./pages/Report";
import ResumePage       from "./pages/ResumePage";
import History          from "./pages/History";
import Profile          from "./pages/Profile";

export default function App() {
  const [ready,            setReady]            = useState(false);
  const [user,             setUser]             = useState(null);
  const [screen,           setScreen]           = useState("landing");
  const [ivConfig,         setIvConfig]         = useState(null);
  const [ivId,             setIvId]             = useState(null);
  const [reportData,       setReportData]       = useState(null);
  const [dashboardRefresh, setDashboardRefresh] = useState(0); // increments on interview delete

  // Restore session on page load
  useEffect(() => {
    const token = localStorage.getItem("token");
    const saved = localStorage.getItem("user");
    if (token && saved) {
      try {
        const u = JSON.parse(saved);
        setUser(u);
        // If profile not completed yet, show setup page
        // Otherwise go straight to dashboard
        setScreen(u.profileComplete ? "setup" : "profileSetup");
      } catch {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      }
    }
    setReady(true);
  }, []);

  if (!ready) {
    return (
      <div style={{ minHeight:"100vh", background:"var(--bg)", display:"flex", alignItems:"center", justifyContent:"center" }}>
        <div style={{ color:"var(--muted)", fontSize:14 }}>Loading...</div>
      </div>
    );
  }

  const saveUser = (u) => {
    setUser(u);
    localStorage.setItem("user", JSON.stringify(u));
  };

  // Called after successful login or signup
  const handleLogin = (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);
    // First-time signup: profileComplete is false → show profile setup
    // Returning login: profileComplete is true → go to New Interview (setup) page
    setScreen(userData.profileComplete ? "setup" : "profileSetup");
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    setScreen("landing");
  };

  const handleProfileSetupComplete = (updatedUser) => {
    saveUser(updatedUser);
    setScreen("dashboard");
  };

  const handleStartInterview = (cfg, id) => {
    setIvConfig(cfg);
    setIvId(id);
    setScreen("interview");
  };

  const handleInterviewComplete = (data) => {
    setReportData(data);
    setScreen("report");
  };

  const goTo = (s) => setScreen(s);

  // ── Public screens ───────────────────────────────────────────────────────
  if (screen === "landing") return <Landing onLogin={() => goTo("login")} onSignup={() => goTo("signup")} />;
  if (screen === "login")   return <Login   onLogin={handleLogin} goSignup={() => goTo("signup")} />;
  if (screen === "signup")  return <Signup  onLogin={handleLogin} goLogin={() => goTo("login")} />;

  // ── First-time profile setup (shown only once after signup) ───────────────
  if (screen === "profileSetup") {
    return <ProfileSetup user={user} onComplete={handleProfileSetupComplete} />;
  }

  // ── Full-screen interview ─────────────────────────────────────────────────
  if (screen === "interview" && ivConfig) {
    return (
      <InterviewScreen
        config={ivConfig}
        interviewId={ivId}
        onComplete={handleInterviewComplete}
        onExit={() => goTo("dashboard")}
      />
    );
  }

  // ── Report (full screen) ──────────────────────────────────────────────────
  if (screen === "report") {
    return (
      <Report
        data={reportData}
        onRetake={() => goTo("setup")}
        onDashboard={() => goTo("dashboard")}
      />
    );
  }

  // ── Sidebar layout — all authenticated pages ─────────────────────────────
  return (
    <div className="dashboard-layout">
      <Sidebar screen={screen} setScreen={goTo} user={user} onLogout={handleLogout} />
      <div className="main-content">
        {screen === "dashboard" && <Dashboard user={user} onStartSetup={() => goTo("setup")} refreshKey={dashboardRefresh} />}
        {screen === "setup"     && <Setup     user={user} onStart={handleStartInterview} />}
        {screen === "resume"    && <ResumePage />}
        {screen === "history"   && <History
          onView={(data) => { setReportData(data); goTo("report"); }}
          onDeleted={() => setDashboardRefresh(k => k + 1)}
        />}
        {screen === "profile"   && <Profile onSaved={saveUser} />}
      </div>
    </div>
  );
}

function Sidebar({ screen, setScreen, user, onLogout }) {
  const nav = [
    { id:"dashboard", icon:"🏠", label:"Dashboard" },
    { id:"setup",     icon:"🎯", label:"New Interview" },
    { id:"resume",    icon:"📄", label:"Resume" },
    { id:"history",   icon:"📊", label:"History" },
    { id:"profile",   icon:"👤", label:"Profile" },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <h2>Interview<span>Pro</span></h2>
        <p>AI Interview Platform</p>
      </div>

      {nav.map(n => (
        <div
          key={n.id}
          className={"nav-item" + (screen === n.id ? " active" : "")}
          onClick={() => setScreen(n.id)}
        >
          <span className="nav-icon">{n.icon}</span>
          <span>{n.label}</span>
        </div>
      ))}

      <div className="sidebar-bottom">
        <div className="sidebar-user">
          <strong>{user?.name || "User"}</strong>
          {user?.role || "Student"}
        </div>
        <button className="btn-logout" onClick={onLogout}>Sign Out</button>
      </div>
    </div>
  );
}
