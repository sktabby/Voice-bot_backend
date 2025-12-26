// // Make sure this matches your backend port:
// const BACKEND_URL = "http://127.0.0.1:5050";

// const holdBtn = document.getElementById("holdBtn");
// const clearBtn = document.getElementById("clearBtn");
// const statusEl = document.getElementById("status");

// const outputOriginalEl = document.getElementById("outputOriginal");
// const outputEnglishEl = document.getElementById("outputEnglish");
// const outputReplyEl = document.getElementById("outputReply");

// const langSelect = document.getElementById("langSelect");

// const chatInput = document.getElementById("chatInput");
// const askBtn = document.getElementById("askBtn");

// const outputReplyHindiEl = document.getElementById("outputReplyHindi");


// // ✅ Optional (recommended): add this button in HTML if you want reset
// // <button id="resetBtn">♻️ Reset Session</button>
// const resetBtn = document.getElementById("resetBtn");

// // ✅ Session ID (stored in browser so it persists on refresh)
// function getSessionId() {
//   let sid = localStorage.getItem("voicebot_session_id");
//   if (!sid) {
//     sid =
//       (crypto?.randomUUID?.() ||
//         `sid_${Date.now()}_${Math.random().toString(16).slice(2)}`);
//     localStorage.setItem("voicebot_session_id", sid);
//   }
//   return sid;
// }
// const SESSION_ID = getSessionId();

// // Recorder state
// let mediaRecorder = null;
// let chunks = [];
// let isRecording = false;
// let pressStartTs = 0;

// function setStatus(msg) {
//   statusEl.textContent = `Status: ${msg}`;
// }

// function setButtonLabel(text) {
//   holdBtn.textContent = text;
// }

// function autoResize(el) {
//   if (!el) return;
//   el.style.height = "auto";
//   el.style.height = el.scrollHeight + "px";
// }

// function clearOutputs() {
//   outputOriginalEl.value = "";
//   outputEnglishEl.value = "";
//   outputReplyEl.value = "";
//   chatInput.value = "";

//   // ✅ Clear Hindi output too (if present)
//   if (outputReplyHindiEl) {
//     outputReplyHindiEl.value = "";
//     autoResize(outputReplyHindiEl);
//   }

//   autoResize(outputOriginalEl);
//   autoResize(outputEnglishEl);
//   autoResize(outputReplyEl);
//   autoResize(chatInput);
// }

// // Clear button (only clears UI; does NOT clear memory on backend)
// clearBtn.addEventListener("click", () => {
//   clearOutputs();
//   setStatus("idle");
// });

// function escapeHtml(str = "") {
//   return str
//     .replaceAll("&", "&amp;")
//     .replaceAll("<", "&lt;")
//     .replaceAll(">", "&gt;")
//     .replaceAll('"', "&quot;")
//     .replaceAll("'", "&#039;");
// }

// function addChatTurn({ lang = "Auto", transcript = "", translation = "", reply = "" }) {
//   const chatLog = document.getElementById("chatLog");
//   if (!chatLog) return;

//   const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

//   const el = document.createElement("div");
//   el.className = "chat-item";
//   el.innerHTML = `
//     <div class="chat-meta">
//       <span class="badge">🎙️ Turn • ${escapeHtml(lang)}</span>
//       <span>${escapeHtml(time)}</span>
//     </div>

//     <div class="chat-grid">
//       <div class="chat-block">
//         <h4>Transcript (Original)</h4>
//         <div class="chat-text">${escapeHtml(transcript || "—")}</div>
//       </div>

//       <div class="chat-block">
//         <h4>Translation (English)</h4>
//         <div class="chat-text">${escapeHtml(translation || "—")}</div>
//       </div>
//     </div>

//     <div class="chat-reply">
//       <h4 style="margin:0 0 6px;font-size:13px;opacity:.85;">Advisor Reply</h4>
//       <div class="chat-text">${escapeHtml(reply || "—")}</div>
//     </div>
//   `;

//   chatLog.appendChild(el);
//   chatLog.scrollTop = chatLog.scrollHeight; // auto-scroll to latest
// }

// // ✅ Reset session button (clears server memory)
// if (resetBtn) {
//   resetBtn.addEventListener("click", async () => {
//     try {
//       await fetch(`${BACKEND_URL}/reset`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ session_id: SESSION_ID }),
//       });
//       clearOutputs();
//       setStatus("session reset");
//       alert("Conversation memory cleared!");
//     } catch (err) {
//       console.error(err);
//       alert("Reset failed. Check backend.");
//     }
//   });
// }

// // Manual chat -> Groq (session-based)
// askBtn.addEventListener("click", async () => {
//   const prompt = chatInput.value.trim();
//   if (!prompt) {
//     alert("Please type a question");
//     return;
//   }

//   setStatus("asking advisor...");

//   try {
//     const res = await fetch(`${BACKEND_URL}/chat`, {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       // ✅ include session_id
//       body: JSON.stringify({ session_id: SESSION_ID, prompt }),
//     });

//     if (!res.ok) {
//       const txt = await res.text();
//       throw new Error(txt);
//     }

//     const data = await res.json();
//     outputReplyEl.value = (data.reply || "").trim();
//     autoResize(outputReplyEl);

//     setStatus("advisor replied");
//   } catch (err) {
//     console.error(err);
//     setStatus("chat failed");
//     alert("Chatbot error. Check backend logs.");
//   }
// });

// async function startRecording() {
//   if (isRecording) return;

//   try {
//     // Clear STT/translation/reply outputs for new recording
//     outputOriginalEl.value = "";
//     outputEnglishEl.value = "";
//     outputReplyEl.value = "";

//     // ✅ Clear Hindi output too (if present)
//     if (outputReplyHindiEl) {
//       outputReplyHindiEl.value = "";
//       autoResize(outputReplyHindiEl);
//     }

//     autoResize(outputOriginalEl);
//     autoResize(outputEnglishEl);
//     autoResize(outputReplyEl);

//     chunks = [];
//     pressStartTs = Date.now();

//     if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//       alert(
//         "Microphone not available. Open using http://127.0.0.1 or http://localhost (not 0.0.0.0)."
//       );
//       return;
//     }

//     const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//     mediaRecorder = new MediaRecorder(stream);

//     mediaRecorder.ondataavailable = (e) => {
//       if (e.data && e.data.size > 0) chunks.push(e.data);
//     };

//     mediaRecorder.onstart = () => {
//       setStatus("recording... (release to stop)");
//       setButtonLabel("🔴 Recording... release to stop");
//       isRecording = true;
//     };

//     mediaRecorder.onstop = async () => {
//       stream.getTracks().forEach((t) => t.stop());

//       const durationMs = Date.now() - pressStartTs;
//       const audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType });

//       isRecording = false;
//       setButtonLabel("🎙️ Hold to Record");

//       if (durationMs < 600 || audioBlob.size < 1500) {
//         setStatus("too short — hold longer and try again");
//         return;
//       }

//       await uploadAndProcess(audioBlob, mediaRecorder.mimeType);
//     };

//     mediaRecorder.start();
//   } catch (err) {
//     console.error("getUserMedia error:", err?.name, err?.message);
//     setStatus(`mic error: ${err?.name || "unknown"}`);
//     alert(`Microphone error: ${err?.name || "unknown"}\n${err?.message || ""}`);
//   }
// }

// async function stopRecording() {
//   if (!mediaRecorder || !isRecording) return;
//   setStatus("stopping...");

//   try {
//     mediaRecorder.stop();
//   } catch (err) {
//     console.error(err);
//     setStatus("error stopping recorder");
//   }
// }

// // Voice pipeline: STT + translate + Groq advisor (session-based)
// async function uploadAndProcess(blob, mimeType) {
//   holdBtn.disabled = true;
//   setStatus("uploading...");

//   try {
//     const form = new FormData();
//     const filename =
//       mimeType && mimeType.includes("webm") ? "audio.webm" : "audio.wav";

//     form.append("file", blob, filename);
//     form.append("language_code", langSelect.value);

//     // ✅ include session_id so backend stores memory
//     form.append("session_id", SESSION_ID);

//     setStatus("processing (stt + translate + advisor)...");
//     const res = await fetch(`${BACKEND_URL}/voicebot`, {
//       method: "POST",
//       body: form,
//     });

//     if (!res.ok) {
//       const txt = await res.text();
//       throw new Error(txt);
//     }

//     const data = await res.json();

//     if (outputReplyHindiEl) {
//       outputReplyHindiEl.value = (data.llm_reply_hi || "").trim();
//       autoResize(outputReplyHindiEl);
//     }


// outputOriginalEl.value = (data.transcript_original || "").trim();
// outputEnglishEl.value = (data.translation_en || "").trim();
// outputReplyEl.value = (data.llm_reply || "").trim();

// autoResize(outputOriginalEl);
// autoResize(outputEnglishEl);
// autoResize(outputReplyEl);

// // ✅ ADD THIS
// addChatTurn({
//   lang: langSelect?.value || "Auto",
//   transcript: outputOriginalEl.value,
//   translation: outputEnglishEl.value,
//   reply: outputReplyEl.value
// });

// setStatus(`done (latency: ${data.latency_ms} ms)`);

//   } catch (err) {
//     console.error(err);
//     setStatus("failed");
//     alert("Failed. Check backend logs.");
//   } finally {
//     holdBtn.disabled = false;
//   }
// }

// // Press & hold handlers (mouse + touch)
// holdBtn.addEventListener("pointerdown", async (e) => {
//   e.preventDefault();
//   await startRecording();
// });

// holdBtn.addEventListener("pointerup", async (e) => {
//   e.preventDefault();
//   await stopRecording();
// });

// holdBtn.addEventListener("pointercancel", async (e) => {
//   e.preventDefault();
//   await stopRecording();
// });

// holdBtn.addEventListener("pointerleave", async () => {
//   if (isRecording) await stopRecording();
// });

// holdBtn.addEventListener("contextmenu", (e) => e.preventDefault());

// chatInput.addEventListener("input", () => autoResize(chatInput));

// // Health check on load
// (async function healthCheck() {
//   try {
//     const r = await fetch(`${BACKEND_URL}/health`);
//     if (r.ok) setStatus("idle (backend connected)");
//     else setStatus("backend reachable but unhealthy");
//   } catch {
//     setStatus("backend not reachable — start uvicorn");
//   }
// })();

// // Initial resize
// autoResize(outputOriginalEl);
// autoResize(outputEnglishEl);
// autoResize(outputReplyEl);
// autoResize(chatInput);



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
  chatInput: document.getElementById("chatInput"),
  askBtn: document.getElementById("askBtn"),
  resetBtn: document.getElementById("resetBtn"),
  chatLog: document.getElementById("chatLog"),
};

const SESSION_ID = getSessionId();

const recorder = createRecorder({
  onStatus: (m) => setStatus(els.statusEl, m),
  onButtonLabel: (t) => setButtonLabel(els.holdBtn, t),
});

function resizeAll() {
  autoResize(els.outputOriginalEl);
  autoResize(els.outputEnglishEl);
  autoResize(els.outputReplyEl);
  autoResize(els.chatInput);
  if (els.outputReplyHindiEl) autoResize(els.outputReplyHindiEl);
}

// UI clear
els.clearBtn.addEventListener("click", () => {
  clearOutputs(els);
  setStatus(els.statusEl, "idle");
});

// reset (server memory)
if (els.resetBtn) {
  els.resetBtn.addEventListener("click", async () => {
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
}

// manual chat
els.askBtn.addEventListener("click", async () => {
  const prompt = els.chatInput.value.trim();
  if (!prompt) return alert("Please type a question");

  setStatus(els.statusEl, "asking advisor...");
  try {
    const data = await chat(SESSION_ID, prompt);
    els.outputReplyEl.value = (data.reply || "").trim();
    autoResize(els.outputReplyEl);
    setStatus(els.statusEl, "advisor replied");
  } catch (e) {
    console.error(e);
    setStatus(els.statusEl, "chat failed");
    alert("Chatbot error. Check backend logs.");
  }
});

// record flow
async function processVoice(blob, mimeType) {
  els.holdBtn.disabled = true;
  setStatus(els.statusEl, "processing (stt + translate + advisor)...");

  try {
    const form = new FormData();
    const filename = mimeType?.includes("webm") ? "audio.webm" : "audio.wav";
    form.append("file", blob, filename);
    form.append("language_code", els.langSelect.value);
    form.append("session_id", SESSION_ID);

    const data = await voicebot(form);

    els.outputOriginalEl.value = (data.transcript_original || "").trim();
    els.outputEnglishEl.value = (data.translation_en || "").trim();
    els.outputReplyEl.value = (data.llm_reply || "").trim();
    if (els.outputReplyHindiEl) els.outputReplyHindiEl.value = (data.llm_reply_hi || "").trim();

    resizeAll();

    addChatTurn(els.chatLog, {
      lang: els.langSelect?.value || "Auto",
      transcript: els.outputOriginalEl.value,
      translation: els.outputEnglishEl.value,
      reply: els.outputReplyEl.value,
    });

    setStatus(els.statusEl, `done (latency: ${data.latency_ms} ms)`);
  } catch (e) {
    console.error(e);
    setStatus(els.statusEl, "failed");
    alert("Failed. Check backend logs.");
  } finally {
    els.holdBtn.disabled = false;
  }
}
const heartLogo = document.getElementById("heartLogo");

heartLogo.addEventListener("click", () => {
  // 💗 Text message
  const msg = document.createElement("div");
  msg.className = "love-message";
  msg.innerText = "Only for Madamjii 💖";
  document.body.appendChild(msg);

  setTimeout(() => msg.remove(), 3000);

  // 💕 Heart rain
  for (let i = 0; i < 30; i++) {
    const heart = document.createElement("div");
    heart.className = "heart";
    heart.innerText = ["💗","💖","💕","💘"][Math.floor(Math.random() * 4)];

    heart.style.left = Math.random() * 100 + "vw";
    heart.style.fontSize = 14 + Math.random() * 20 + "px";
    heart.style.animationDuration = 2 + Math.random() * 2 + "s";

    document.body.appendChild(heart);

    setTimeout(() => heart.remove(), 4000);
  }
});


els.holdBtn.addEventListener("pointerdown", async (e) => {
  e.preventDefault();
  // clear outputs for new recording
  els.outputOriginalEl.value = "";
  els.outputEnglishEl.value = "";
  els.outputReplyEl.value = "";
  if (els.outputReplyHindiEl) els.outputReplyHindiEl.value = "";
  resizeAll();

  try {
    const result = await recorder.start();
    if (result?.tooShort) setStatus(els.statusEl, "too short — hold longer and try again");
    else if (result?.blob) await processVoice(result.blob, result.mimeType);
  } catch (err) {
    console.error(err);
    setStatus(els.statusEl, `mic error`);
    alert(`Microphone error\n${err?.message || ""}`);
  }
});

els.holdBtn.addEventListener("pointerup", (e) => { e.preventDefault(); recorder.stop(); });
els.holdBtn.addEventListener("pointercancel", (e) => { e.preventDefault(); recorder.stop(); });
els.holdBtn.addEventListener("pointerleave", () => { if (recorder.recording()) recorder.stop(); });
els.holdBtn.addEventListener("contextmenu", (e) => e.preventDefault());
els.chatInput.addEventListener("input", () => autoResize(els.chatInput));

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
