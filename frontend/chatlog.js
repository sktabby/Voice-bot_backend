function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function addChatTurn(chatLogEl, { lang = "Auto", transcript = "", translation = "", reply = "" }) {
  if (!chatLogEl) return;
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const el = document.createElement("div");
  el.className = "chat-item";
  el.innerHTML = `
    <div class="chat-meta">
      <span class="badge">🎙️ Turn • ${escapeHtml(lang)}</span>
      <span>${escapeHtml(time)}</span>
    </div>

    <div class="chat-grid">
      <div class="chat-block">
        <h4>Transcript (Original)</h4>
        <div class="chat-text">${escapeHtml(transcript || "—")}</div>
      </div>

      <div class="chat-block">
        <h4>Translation (English)</h4>
        <div class="chat-text">${escapeHtml(translation || "—")}</div>
      </div>
    </div>

    <div class="chat-reply">
      <h4 style="margin:0 0 6px;font-size:13px;opacity:.85;">Advisor Reply</h4>
      <div class="chat-text">${escapeHtml(reply || "—")}</div>
    </div>
  `;
  chatLogEl.appendChild(el);
  chatLogEl.scrollTop = chatLogEl.scrollHeight;
}
