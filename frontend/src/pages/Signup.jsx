import { useState } from "react";
import { api } from "../utils/api";

export default function Signup({ onLogin, goLogin }) {
  const [form, setForm]     = useState({ name: "", email: "", password: "", confirm: "", role: "" });
  const [error, setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.name || !form.email || !form.password || !form.role) { setError("Please fill all fields."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password, role: form.role })
      });
      onLogin(data.user, data.token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Interview<span>Pro</span></h1>
          <p>AI-Powered Interview Platform</p>
        </div>
        <h2>Create account</h2>
        <p className="sub">Start your AI interview practice journey</p>
        {error && <div className="error-box">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Full Name</label><input placeholder="Santhiya" value={form.name} onChange={e => set("name", e.target.value)} /></div>
          <div className="field"><label>Email</label><input type="email" placeholder="you@email.com" value={form.email} onChange={e => set("email", e.target.value)} /></div>
          <div className="field"><label>Password</label><input type="password" placeholder="Min 6 characters" value={form.password} onChange={e => set("password", e.target.value)} /></div>
          <div className="field"><label>Confirm Password</label><input type="password" placeholder="Repeat password" value={form.confirm} onChange={e => set("confirm", e.target.value)} /></div>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={e => set("role", e.target.value)}>
              <option value="">Select your role</option>
              <option value="Student">Student</option>
              <option value="Fresher">Fresher</option>
              <option value="Experienced">Experienced</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>
        <div className="auth-link">Already have an account? <span onClick={goLogin}>Sign in</span></div>
      </div>
    </div>
  );
}
