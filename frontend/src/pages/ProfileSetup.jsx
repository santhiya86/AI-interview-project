// Shown ONLY ONCE after first signup.
// After saving, profileComplete becomes true in DB.
// Every subsequent login goes straight to Dashboard.

import { useState } from "react";
import { api } from "../utils/api";

export default function ProfileSetup({ user, onComplete }) {
  const [name,    setName]    = useState(user?.name || "");
  const [role,    setRole]    = useState(user?.role || "");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!role)        { setError("Please select your role."); return; }

    setSaving(true);
    try {
      const data = await api("/user/profile", {
        method: "PUT",
        body: JSON.stringify({ name: name.trim(), role })
      });
      // Pass updated user back to App so sidebar/header reflects correct name
      onComplete(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-logo">
          <h1>Interview<span>Pro</span></h1>
          <p>AI-Powered Interview Platform</p>
        </div>

        <h2>Complete Your Profile</h2>
        <p className="sub">Just two quick things before we get started.</p>

        {error && <div className="error-box">{error}</div>}

        <form onSubmit={handleSave}>
          <div className="field">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="e.g. Santhiya"
              value={name}
              onChange={e => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label>I am a...</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="">Select your role</option>
              <option value="Student">Student</option>
              <option value="Fresher">Fresher (0–1 year experience)</option>
              <option value="Experienced">Experienced (1+ years)</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving..." : "Go to Dashboard →"}
          </button>
        </form>
      </div>
    </div>
  );
}
