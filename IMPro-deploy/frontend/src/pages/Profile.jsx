import { useState, useEffect } from "react";
import { api } from "../utils/api";

export default function Profile({ onSaved }) {
  const [user,   setUser]   = useState(null);
  const [name,   setName]   = useState("");
  const [role,   setRole]   = useState("");
  const [saving, setSaving] = useState(false);
  const [msg,    setMsg]    = useState({ text:"", ok:false });
  const [pw,     setPw]     = useState({ current:"", next:"", confirm:"" });
  const [pwMsg,  setPwMsg]  = useState({ text:"", ok:false });

  useEffect(() => {
    api("/user/profile").then(d => {
      setUser(d.user);
      setName(d.user.name);
      setRole(d.user.role);
    }).catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSaving(true); setMsg({ text:"", ok:false });
    try {
      const d = await api("/user/profile", { method:"PUT", body: JSON.stringify({ name, role }) });
      setUser(d.user);
      setMsg({ text:"Profile saved successfully!", ok:true });
      if (onSaved) onSaved(d.user); // update sidebar name
    } catch (err) {
      setMsg({ text:err.message, ok:false });
    } finally { setSaving(false); }
  };

  const changePw = async () => {
    setPwMsg({ text:"", ok:false });
    if (!pw.current) { setPwMsg({ text:"Enter current password.", ok:false }); return; }
    if (pw.next !== pw.confirm) { setPwMsg({ text:"Passwords do not match.", ok:false }); return; }
    if (pw.next.length < 6) { setPwMsg({ text:"New password must be at least 6 characters.", ok:false }); return; }
    try {
      await api("/user/password", { method:"PUT", body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }) });
      setPwMsg({ text:"Password changed successfully!", ok:true });
      setPw({ current:"", next:"", confirm:"" });
    } catch (err) { setPwMsg({ text:err.message, ok:false }); }
  };

  if (!user) return (
    <div className="page-body" style={{ color:"var(--muted)" }}>Loading profile...</div>
  );

  return (
    <div>
      <div className="page-header"><h1>My Profile</h1><p>Manage your account settings</p></div>
      <div className="page-body" style={{ maxWidth:540 }}>

        <div className="card" style={{ marginBottom:20 }}>
          <h3>Account Information</h3>
          {msg.text && (
            <div style={{ color: msg.ok ? "var(--green)" : "var(--red)", fontSize:13, marginBottom:12, padding:"8px 12px", background: msg.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", borderRadius:6 }}>
              {msg.text}
            </div>
          )}
          <div className="field"><label>Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Your name" />
          </div>
          <div className="field"><label>Email (cannot be changed)</label>
            <input value={user.email} disabled style={{ opacity:0.5, cursor:"not-allowed" }} />
          </div>
          <div className="field"><label>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option value="Student">Student</option>
              <option value="Fresher">Fresher</option>
              <option value="Experienced">Experienced</option>
            </select>
          </div>
          <button className="btn btn-accent btn" onClick={saveProfile} disabled={saving || !name.trim()}>
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>

        <div className="card">
          <h3>Change Password</h3>
          {pwMsg.text && (
            <div style={{ color: pwMsg.ok ? "var(--green)" : "var(--red)", fontSize:13, marginBottom:12, padding:"8px 12px", background: pwMsg.ok ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.08)", borderRadius:6 }}>
              {pwMsg.text}
            </div>
          )}
          <div className="field"><label>Current Password</label>
            <input type="password" value={pw.current} onChange={e => setPw(p => ({...p, current:e.target.value}))} placeholder="Enter current password" />
          </div>
          <div className="field"><label>New Password</label>
            <input type="password" value={pw.next} onChange={e => setPw(p => ({...p, next:e.target.value}))} placeholder="Min 6 characters" />
          </div>
          <div className="field"><label>Confirm New Password</label>
            <input type="password" value={pw.confirm} onChange={e => setPw(p => ({...p, confirm:e.target.value}))} placeholder="Repeat new password" />
          </div>
          <button className="btn btn-outline" onClick={changePw}>Update Password</button>
        </div>
      </div>
    </div>
  );
}
