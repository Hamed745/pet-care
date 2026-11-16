import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    proxy: {
      "/api/places": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/api/cities": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/api/reverse-city": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
      "/api/health": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});