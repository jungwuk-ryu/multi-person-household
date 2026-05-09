import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || "http://127.0.0.1:3021";
const apiProxy = {
  "/api": {
    target: apiProxyTarget,
    changeOrigin: true,
    timeout: 600000,
    proxyTimeout: 600000
  },
  "/uploads": {
    target: apiProxyTarget,
    changeOrigin: true,
    timeout: 600000,
    proxyTimeout: 600000
  },
  "/ws": {
    target: apiProxyTarget,
    changeOrigin: true,
    timeout: 600000,
    proxyTimeout: 600000,
    ws: true
  }
};

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
    },
    proxy: apiProxy
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
    allowedHosts: ["gdg.jungwuk.com", "131.186.62.191"],
    proxy: apiProxy
  }
});
