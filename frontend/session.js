const KEY = "voicebot_session_id";

export function getSessionId() {
  let sid = localStorage.getItem(KEY);
  if (!sid) {
    sid = (crypto?.randomUUID?.() || `sid_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    localStorage.setItem(KEY, sid);
  }
  return sid;
}

export function clearSessionId() {
  localStorage.removeItem(KEY);
}
