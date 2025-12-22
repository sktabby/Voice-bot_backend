// Make sure this matches your backend port:
const BACKEND_URL = "http://127.0.0.1:3040";

const holdBtn = document.getElementById("holdBtn");
const clearBtn = document.getElementById("clearBtn");
const statusEl = document.getElementById("status");

const outputOriginalEl = document.getElementById("outputOriginal");
const outputEnglishEl = document.getElementById("outputEnglish");
const outputReplyEl = document.getElementById("outputReply");

const langSelect = document.getElementById("langSelect");

const chatInput = document.getElementById("chatInput");
const askBtn = document.getElementById("askBtn");

// ✅ Optional (recommended): add this button in HTML if you want reset
// <button id="resetBtn">♻️ Reset Session</button>
const resetBtn = document.getElementById("resetBtn");

// ✅ Session ID (stored in browser so it persists on refresh)
function getSessionId() {
  let sid = localStorage.getItem("voicebot_session_id");
  if (!sid) {
    sid =
      (crypto?.randomUUID?.() ||
        `sid_${Date.now()}_${Math.random().toString(16).slice(2)}`);
    localStorage.setItem("voicebot_session_id", sid);
  }
  return sid;
}
const SESSION_ID = getSessionId();

// Recorder state
let mediaRecorder = null;
let chunks = [];
let isRecording = false;
let pressStartTs = 0;

function setStatus(msg) {
  statusEl.textContent = `Status: ${msg}`;
}

function setButtonLabel(text) {
  holdBtn.textContent = text;
}

function autoResize(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function clearOutputs() {
  outputOriginalEl.value = "";
  outputEnglishEl.value = "";
  outputReplyEl.value = "";
  chatInput.value = "";

  autoResize(outputOriginalEl);
  autoResize(outputEnglishEl);
  autoResize(outputReplyEl);
  autoResize(chatInput);
}

// Clear button (only clears UI; does NOT clear memory on backend)
clearBtn.addEventListener("click", () => {
  clearOutputs();
  setStatus("idle");
});

// ✅ Reset session button (clears server memory)
if (resetBtn) {
  resetBtn.addEventListener("click", async () => {
    try {
      await fetch(`${BACKEND_URL}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: SESSION_ID }),
      });
      clearOutputs();
      setStatus("session reset");
      alert("Conversation memory cleared!");
    } catch (err) {
      console.error(err);
      alert("Reset failed. Check backend.");
    }
  });
}

// Manual chat -> Groq (session-based)
askBtn.addEventListener("click", async () => {
  const prompt = chatInput.value.trim();
  if (!prompt) {
    alert("Please type a question");
    return;
  }

  setStatus("asking advisor...");

  try {
    const res = await fetch(`${BACKEND_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ✅ include session_id
      body: JSON.stringify({ session_id: SESSION_ID, prompt }),
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt);
    }

    const data = await res.json();
    outputReplyEl.value = (data.reply || "").trim();
    autoResize(outputReplyEl);

    setStatus("advisor replied");
  } catch (err) {
    console.error(err);
    setStatus("chat failed");
    alert("Chatbot error. Check backend logs.");
  }
});

async function startRecording() {
  if (isRecording) return;

  try {
    // Clear STT/translation/reply outputs for new recording
    outputOriginalEl.value = "";
    outputEnglishEl.value = "";
    outputReplyEl.value = "";
    autoResize(outputOriginalEl);
    autoResize(outputEnglishEl);
    autoResize(outputReplyEl);

    chunks = [];
    pressStartTs = Date.now();

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert(
        "Microphone not available. Open using http://127.0.0.1 or http://localhost (not 0.0.0.0)."
      );
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunks.push(e.data);
    };

    mediaRecorder.onstart = () => {
      setStatus("recording... (release to stop)");
      setButtonLabel("🔴 Recording... release to stop");
      isRecording = true;
    };

    mediaRecorder.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());

      const durationMs = Date.now() - pressStartTs;
      const audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType });

      isRecording = false;
      setButtonLabel("🎙️ Hold to Record");

      if (durationMs < 600 || audioBlob.size < 1500) {
        setStatus("too short — hold longer and try again");
        return;
      }

      await uploadAndProcess(audioBlob, mediaRecorder.mimeType);
    };

    mediaRecorder.start();
  } catch (err) {
    console.error("getUserMedia error:", err?.name, err?.message);
    setStatus(`mic error: ${err?.name || "unknown"}`);
    alert(`Microphone error: ${err?.name || "unknown"}\n${err?.message || ""}`);
  }
}

async function stopRecording() {
  if (!mediaRecorder || !isRecording) return;
  setStatus("stopping...");

  try {
    mediaRecorder.stop();
  } catch (err) {
    console.error(err);
    setStatus("error stopping recorder");
  }
}

// Voice pipeline: STT + translate + Groq advisor (session-based)
async function uploadAndProcess(blob, mimeType) {
  holdBtn.disabled = true;
  setStatus("uploading...");

  try {
    const form = new FormData();
    const filename =
      mimeType && mimeType.includes("webm") ? "audio.webm" : "audio.wav";

    form.append("file", blob, filename);
    form.append("language_code", langSelect.value);

    // ✅ include session_id so backend stores memory
    form.append("session_id", SESSION_ID);

    setStatus("processing (stt + translate + advisor)...");
    const res = await fetch(`${BACKEND_URL}/voicebot`, {
      method: "POST",
      body: form,
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt);
    }

    const data = await res.json();

    outputOriginalEl.value = (data.transcript_original || "").trim();
    outputEnglishEl.value = (data.translation_en || "").trim();
    outputReplyEl.value = (data.llm_reply || "").trim();

    autoResize(outputOriginalEl);
    autoResize(outputEnglishEl);
    autoResize(outputReplyEl);

    setStatus(`done (latency: ${data.latency_ms} ms)`);
  } catch (err) {
    console.error(err);
    setStatus("failed");
    alert("Failed. Check backend logs.");
  } finally {
    holdBtn.disabled = false;
  }
}

// Press & hold handlers (mouse + touch)
holdBtn.addEventListener("pointerdown", async (e) => {
  e.preventDefault();
  await startRecording();
});

holdBtn.addEventListener("pointerup", async (e) => {
  e.preventDefault();
  await stopRecording();
});

holdBtn.addEventListener("pointercancel", async (e) => {
  e.preventDefault();
  await stopRecording();
});

holdBtn.addEventListener("pointerleave", async () => {
  if (isRecording) await stopRecording();
});

holdBtn.addEventListener("contextmenu", (e) => e.preventDefault());

chatInput.addEventListener("input", () => autoResize(chatInput));

// Health check on load
(async function healthCheck() {
  try {
    const r = await fetch(`${BACKEND_URL}/health`);
    if (r.ok) setStatus("idle (backend connected)");
    else setStatus("backend reachable but unhealthy");
  } catch {
    setStatus("backend not reachable — start uvicorn");
  }
})();

// Initial resize
autoResize(outputOriginalEl);
autoResize(outputEnglishEl);
autoResize(outputReplyEl);
autoResize(chatInput);
