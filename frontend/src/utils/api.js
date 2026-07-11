// Using relative URL so it works both locally (via vite proxy) and on Render
// When deployed: frontend is served from backend, so /api hits the same server
// When local: vite proxy forwards /api to localhost:5000
const BASE = "/api";

export async function api(path, options = {}) {
  const token = localStorage.getItem("token");
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...options,
      headers: {
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error("Cannot reach server. Please check your internet connection.");
  }
  if (res.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/";
    return;
  }
  let data;
  try { data = await res.json(); }
  catch { throw new Error("Server error (status " + res.status + ")"); }
  if (!res.ok) throw new Error(data.message || "Request failed (" + res.status + ")");
  return data;
}
