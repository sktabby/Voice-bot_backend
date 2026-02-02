import { CONFIG } from "./config.js";

export function createRecorder({ onStatus, onButtonLabel, onChunk, timesliceMs = 500 }) {
  let mediaRecorder = null;
  let chunks = [];
  let isRecording = false;
  let pressStartTs = 0;
  let streamRef = null;

  async function start() {
    if (isRecording) return null;

    if (!navigator.mediaDevices?.getUserMedia) {
      throw new Error("Microphone not available. Use http://127.0.0.1 or http://localhost.");
    }

    streamRef = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Optional mime-type preference (keeps default if unsupported)
    const preferredTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
    ];

    let options = undefined;
    for (const t of preferredTypes) {
      if (window.MediaRecorder?.isTypeSupported?.(t)) {
        options = { mimeType: t };
        break;
      }
    }

    mediaRecorder = new MediaRecorder(streamRef, options);
    chunks = [];
    pressStartTs = Date.now();

    return await new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (e) => {
        if (!e.data || e.data.size === 0) return;

        // Keep for final combined blob (batch fallback)
        chunks.push(e.data);

        // NEW: streaming callback (near real-time base)
        const chunkIndex = chunks.length - 1;
        onChunk?.({
          chunkIndex,
          chunk: e.data,
          mimeType: mediaRecorder.mimeType,
          ts: Date.now(),
        });
      };

      mediaRecorder.onstart = () => {
        onStatus("recording... (release to stop)");
        onButtonLabel("🔴 Recording... release to stop");
        isRecording = true;
      };

      mediaRecorder.onerror = (e) => {
        reject(e?.error || new Error("MediaRecorder error"));
      };

      mediaRecorder.onstop = () => {
        streamRef?.getTracks().forEach((t) => t.stop());

        const durationMs = Date.now() - pressStartTs;
        const blob = new Blob(chunks, { type: mediaRecorder.mimeType });

        isRecording = false;
        onButtonLabel("🎙️ Hold to Record");

        if (durationMs < CONFIG.MIN_DURATION_MS || blob.size < CONFIG.MIN_SIZE_BYTES) {
          resolve({ tooShort: true });
          return;
        }

        // Final combined audio (same as before)
        resolve({ blob, mimeType: mediaRecorder.mimeType });
      };

      // ✅ KEY CHANGE: timeslice makes browser emit chunks while recording
      mediaRecorder.start(timesliceMs);
    });
  }

  function stop() {
    if (!mediaRecorder || !isRecording) return;
    onStatus("stopping...");
    mediaRecorder.stop();
  }

  function recording() {
    return isRecording;
  }

  return { start, stop, recording };
}
