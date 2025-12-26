import { CONFIG } from "./config.js";

export function createRecorder({ onStatus, onButtonLabel }) {
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
    mediaRecorder = new MediaRecorder(streamRef);
    chunks = [];
    pressStartTs = Date.now();

    return await new Promise((resolve, reject) => {
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstart = () => {
        onStatus("recording... (release to stop)");
        onButtonLabel("🔴 Recording... release to stop");
        isRecording = true;
      };

      mediaRecorder.onerror = (e) => reject(e.error || new Error("MediaRecorder error"));

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
        resolve({ blob, mimeType: mediaRecorder.mimeType });
      };

      mediaRecorder.start();
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
