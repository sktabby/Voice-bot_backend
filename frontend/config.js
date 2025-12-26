export const CONFIG = {
  BACKEND_URL: import.meta?.env?.VITE_BACKEND_URL || "https://voice-bot-backend-syli.onrender.com",
  MIN_DURATION_MS: 600,
  MIN_SIZE_BYTES: 1500,
};
