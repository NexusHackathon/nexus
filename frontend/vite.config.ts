import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Dev proxy: the SPA talks to same-origin /api and /ws and Vite forwards them to
// the FastAPI backend on :8800 - no CORS juggling, and the production build
// (served by FastAPI) keeps using the same relative URLs.
// Port 8800 (not 8000) avoids colliding with the SPOT project's backend.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api": { target: "http://127.0.0.1:8800", changeOrigin: true },
      "/ws": { target: "ws://127.0.0.1:8800", ws: true },
    },
  },
});
