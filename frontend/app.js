import { CONFIG } from "./config.js";
import { getSessionId } from "./session.js";
import { health, resetSession, chat, voicebot, streamChunk, streamFinalize, streamPartial } from "./api.js";
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

// ✅ Streaming upload queue (keeps chunk uploads ordered)
let uploadChain = Promise.resolve();
let streamError = null;

// ✅ Guard to ensure we finalize only once per recording
let finalized = false;

// ✅ Phase 2: partial transcript polling
let partialTimer = null;

function startPartialPolling() {
  stopPartialPolling();

  partialTimer = setInterval(async () => {
    try {
      const p = await streamPartial(SESSION_ID);

      // ✅ Phase 3: backend decided speech is over
      if (p?.auto_finalize && !finalized) {
        finalized = true;
        stopPartialPolling();

        // Stop recorder if still recording
        if (recorder.recording()) {
          recorder.stop();
        }

        setStatus(els.statusEl, "auto-finalizing (silence detected)...");

        try {
          await uploadChain;

          const data = await streamFinalize(
            SESSION_ID,
            els.langSelect?.value || "unknown"
          );

          if (els.outputOriginalEl) els.outputOriginalEl.value = data.transcript_original || "";
          if (els.outputEnglishEl) els.outputEnglishEl.value = data.translation_en || "";
          if (els.outputReplyEl) els.outputReplyEl.value = data.llm_reply || "";
          if (els.outputReplyHindiEl) els.outputReplyHindiEl.value = data.llm_reply_hi || "";

          resizeAll();

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
          setStatus(els.statusEl, "auto-finalize failed");
        }

        return; // ⛔ stop further polling
      }

      // ✅ Phase 2: partial transcript updates
      if (p?.partial_text && els.outputOriginalEl) {
        els.outputOriginalEl.value = p.partial_text;
        autoResize(els.outputOriginalEl);
      }

    } catch (e) {
      console.warn("partial polling failed:", e?.message || e);
    }
  }, 1000);
}


function stopPartialPolling() {
  if (partialTimer) clearInterval(partialTimer);
  partialTimer = null;
}

function enqueueUpload(fn) {
  uploadChain = uploadChain.then(fn).catch((e) => {
    streamError = e;
    console.error("stream upload failed:", e);
  });
  return uploadChain;
}

const recorder = createRecorder({
  onStatus: (m) => setStatus(els.statusEl, m),
  onButtonLabel: (t) => setButtonLabel(els.holdBtn, t),

  timesliceMs: 500,
  onChunk: ({ chunkIndex, chunk, mimeType }) => {
    if (chunkIndex === 0) {
      setStatus(els.statusEl, "streaming audio chunks...");
      streamError = null;
    }

    enqueueUpload(async () => {
      const form = new FormData();
      const ext = (mimeType || "").includes("webm") ? "webm" : "wav";

      form.append("file", chunk, `chunk_${chunkIndex}.${ext}`);
      form.append("session_id", SESSION_ID);
      form.append("chunk_index", String(chunkIndex));
      form.append("mime_type", mimeType || "");
      form.append("language_code", els.langSelect?.value || "unknown");

      await streamChunk(form);
    });
  },
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

// --- Hold-to-record flow ---
els.holdBtn?.addEventListener("pointerdown", async (e) => {
  e.preventDefault();

  // reset state for new recording
  uploadChain = Promise.resolve();
  streamError = null;
  finalized = false;

  // clear outputs for new recording
  if (els.outputOriginalEl) els.outputOriginalEl.value = "";
  if (els.outputEnglishEl) els.outputEnglishEl.value = "";
  if (els.outputReplyEl) els.outputReplyEl.value = "";
  if (els.outputReplyHindiEl) els.outputReplyHindiEl.value = "";
  resizeAll();

  // ✅ start partial transcript polling while recording
  startPartialPolling();

  try {
    const result = await recorder.start();

    // recording ended here (stop called)
    stopPartialPolling();

    if (result?.tooShort) {
      setStatus(els.statusEl, "too short — hold longer and try again");
      return;
    }

    if (result?.blob) {
      if (finalized) return;
      finalized = true;

      // ✅ wait for all chunk uploads to finish
      await uploadChain;

      // ✅ streaming finalize
      if (!streamError) {
        try {
          setStatus(els.statusEl, "finalizing stream (stt + translate + advisor)...");
          const data = await streamFinalize(SESSION_ID, els.langSelect?.value || "unknown");

          if (els.outputOriginalEl) els.outputOriginalEl.value = (data.transcript_original || "").trim();
          if (els.outputEnglishEl) els.outputEnglishEl.value = (data.translation_en || "").trim();
          if (els.outputReplyEl) els.outputReplyEl.value = (data.llm_reply || "").trim();
          if (els.outputReplyHindiEl) els.outputReplyHindiEl.value = (data.llm_reply_hi || "").trim();

          resizeAll();

          if (els.chatLog) {
            addChatTurn(els.chatLog, {
              lang: els.langSelect?.value || "Auto",
              transcript: els.outputOriginalEl?.value || "",
              translation: els.outputEnglishEl?.value || "",
              reply: els.outputReplyEl?.value || "",
            });
          }

          setStatus(els.statusEl, `done (latency: ${data.latency_ms} ms)`);
          return;
        } catch (e) {
          console.error(e);
          setStatus(els.statusEl, "stream finalize failed — falling back to batch...");
        }
      }

      // ✅ fallback: old batch pipeline
      await processVoice(result.blob, result.mimeType);
    }
  } catch (err) {
    stopPartialPolling();
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
