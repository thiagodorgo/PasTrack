import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    // em desenvolvimento, /api vai para a API local; no Docker, o nginx faz esse papel
    proxy: {
      "/api": "http://localhost:3333",
    },
  },
});
