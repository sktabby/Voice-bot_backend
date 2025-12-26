import { CONFIG } from "./config.js";

// ✅ Normalize base URL once (NO trailing slash)
const API_BASE = (CONFIG.BACKEND_URL || "").replace(/\/+$/, "");

// ✅ Build full URL safely
function apiUrl(path) {
  const p = String(path || "").replace(/^\/+/, "");
  return `${API_BASE}/${p}`;
}

// ✅ Safe JSON parse
function tryJson(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

// ✅ Request wrapper: reads text once, throws only on non-2xx
async function request(path, options = {}) {
  const res = await fetch(apiUrl(path), options);
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text}`);
  }
  return { res, text };
}

export async function health() {
  return request("health", { method: "GET" });
}

export async function resetSession(session_id) {
  const { text } = await request("reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id }),
  });

  return tryJson(text) ?? { ok: true };
}

export async function chat(session_id, prompt) {
  const { text } = await request("chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ session_id, prompt }),
  });

  const data = tryJson(text);
  if (data == null) throw new Error(`Chat returned non-JSON: ${text}`);
  return data;
}

export async function voicebot(formData) {
  const { text } = await request("voicebot", {
    method: "POST",
    body: formData,
  });

  const data = tryJson(text);
  if (data == null) throw new Error(`Voicebot returned non-JSON: ${text}`);
  return data;
}
