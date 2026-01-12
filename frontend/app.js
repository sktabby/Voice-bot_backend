import { CONFIG } from "./config.js";
import { getSessionId } from "./session.js";
import { health, resetSession, chat, voicebot } from "./api.js";
import { autoResize, setStatus, setButtonLabel, clearOutputs } from "./dom.js";
import { addChatTurn } from "./chatlog.js";
import { createRecorder } from "./recorder.js";

console.log("app.js loaded");

const els = {
  holdBtn: document.getElementById("holdBtn"),
  clearBtn: document.getElementById("clearBtn"),
  statusEl: document.getElementById("status"),

  outputOriginalEl: document.getElementById("outputOriginal"),
  outputEnglishEl: document.getElementById("outputEnglish"),
  outputReplyEl: document.getElementById("outputReply"),
  outputReplyHindiEl: document.getElementById("outputReplyHindi"),

  langSelect: document.getElementById("langSelect"),

  // These may NOT exist after UI cleanup:
  chatInput: document.getElementById("chatInput"),
  askBtn: document.getElementById("askBtn"),
  chatLog: document.getElementById("chatLog"),
  resetBtn: document.getElementById("resetBtn"),
};

if (!els.holdBtn) console.warn("Missing #holdBtn in HTML");
if (!els.clearBtn) console.warn("Missing #clearBtn in HTML");
if (!els.statusEl) console.warn("Missing #status in HTML");

const SESSION_ID = getSessionId();

const recorder = createRecorder({
  onStatus: (m) => setStatus(els.statusEl, m),
  onButtonLabel: (t) => setButtonLabel(els.holdBtn, t),
});

function resizeAll() {
  if (els.outputOriginalEl) autoResize(els.outputOriginalEl);
  if (els.outputEnglishEl) autoResize(els.outputEnglishEl);
  if (els.outputReplyEl) autoResize(els.outputReplyEl);
  if (els.outputReplyHindiEl) autoResize(els.outputReplyHindiEl);
  if (els.chatInput) autoResize(els.chatInput);
}

// UI clear
els.clearBtn?.addEventListener("click", () => {
  clearOutputs(els);
  setStatus(els.statusEl, "idle");
});

// reset (server memory)
els.resetBtn?.addEventListener("click", async () => {
  try {
    await resetSession(SESSION_ID);
    clearOutputs(els);
    setStatus(els.statusEl, "session reset");
    alert("Conversation memory cleared!");
  } catch (e) {
    console.error(e);
    alert("Reset failed. Check backend.");
  }
});

// manual chat (ONLY if UI still has ask button + input)
els.askBtn?.addEventListener("click", async () => {
  const prompt = els.chatInput?.value?.trim();
  if (!prompt) return alert("Please type a question");

  setStatus(els.statusEl, "asking advisor...");
  try {
    const data = await chat(SESSION_ID, prompt);
    if (els.outputReplyEl) {
      els.outputReplyEl.value = (data.reply || "").trim();
      autoResize(els.outputReplyEl);
    }
    setStatus(els.statusEl, "advisor replied");
  } catch (e) {
    console.error(e);
    setStatus(els.statusEl, "chat failed");
    alert("Chatbot error. Check backend logs.");
  }
});

async function processVoice(blob, mimeType) {
  els.holdBtn.disabled = true;
  setStatus(els.statusEl, "processing (stt + translate + advisor)...");

  try {
    const form = new FormData();
    const filename = mimeType?.includes("webm") ? "audio.webm" : "audio.wav";
    form.append("file", blob, filename);
    form.append("language_code", els.langSelect?.value || "unknown");
    form.append("session_id", SESSION_ID);

    const data = await voicebot(form);

    if (els.outputOriginalEl) els.outputOriginalEl.value = (data.transcript_original || "").trim();
    if (els.outputEnglishEl) els.outputEnglishEl.value = (data.translation_en || "").trim();
    if (els.outputReplyEl) els.outputReplyEl.value = (data.llm_reply || "").trim();
    if (els.outputReplyHindiEl) els.outputReplyHindiEl.value = (data.llm_reply_hi || "").trim();

    resizeAll();

    // Only log if chatLog exists
    if (els.chatLog) {
      addChatTurn(els.chatLog, {
        lang: els.langSelect?.value || "Auto",
        transcript: els.outputOriginalEl?.value || "",
        translation: els.outputEnglishEl?.value || "",
        reply: els.outputReplyEl?.value || "",
      });
    }

    setStatus(els.statusEl, `done (latency: ${data.latency_ms} ms)`);
  } catch (e) {
    console.error(e);
    setStatus(els.statusEl, "failed");
    alert("Failed. Check backend logs.");
  } finally {
    els.holdBtn.disabled = false;
  }
}

// --- Hold-to-record flow (works even without chatInput/askBtn/heartLogo) ---
els.holdBtn?.addEventListener("pointerdown", async (e) => {
  e.preventDefault();

  // clear outputs for new recording
  if (els.outputOriginalEl) els.outputOriginalEl.value = "";
  if (els.outputEnglishEl) els.outputEnglishEl.value = "";
  if (els.outputReplyEl) els.outputReplyEl.value = "";
  if (els.outputReplyHindiEl) els.outputReplyHindiEl.value = "";
  resizeAll();

  try {
    const result = await recorder.start();
    if (result?.tooShort) {
      setStatus(els.statusEl, "too short — hold longer and try again");
    } else if (result?.blob) {
      await processVoice(result.blob, result.mimeType);
    }
  } catch (err) {
    console.error(err);
    setStatus(els.statusEl, "mic error");
    alert(`Microphone error\n${err?.message || ""}`);
  }
});

els.holdBtn?.addEventListener("pointerup", (e) => {
  e.preventDefault();
  recorder.stop();
});
els.holdBtn?.addEventListener("pointercancel", (e) => {
  e.preventDefault();
  recorder.stop();
});
els.holdBtn?.addEventListener("pointerleave", () => {
  if (recorder.recording()) recorder.stop();
});
els.holdBtn?.addEventListener("contextmenu", (e) => e.preventDefault());

// chat input auto-resize (only if present)
els.chatInput?.addEventListener("input", () => autoResize(els.chatInput));

// health check
(async function () {
  try {
    const r = await health();
    if (r.ok) setStatus(els.statusEl, "idle (backend connected)");
    else setStatus(els.statusEl, "backend reachable but unhealthy");
  } catch {
    setStatus(els.statusEl, "backend not reachable — start uvicorn");
  }
})();

resizeAll();
