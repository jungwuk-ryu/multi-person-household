import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: ["gdg.jungwuk.com", "131.186.62.191"],
    cors: {
      origin: [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://131.186.62.191:3021",
        "https://gdg.jungwuk.com"
      ],
      credentials: true
    }
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: ["gdg.jungwuk.com", "131.186.62.191"]
  }
});
