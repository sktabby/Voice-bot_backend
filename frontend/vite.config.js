import { defineConfig } from "vite";

export default defineConfig({
  server: {
    host: true,
    allowedHosts: [
      "recapitulatory-kaia-unfantastic.ngrok-free.dev",
      ".ngrok-free.dev",
      "localhost",
      "127.0.0.1",
    ],
  },
});
