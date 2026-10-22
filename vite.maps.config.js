import { mergeConfig } from "vite";
import baseConfig from "./vite.config.js";

/** Development-only API proxy, keeps the existing Vite config unchanged. */
export default mergeConfig(baseConfig, {
  server: {
    proxy: {
      "/api/places": { target: "http://127.0.0.1:8787", changeOrigin: false },
      "/api/health": { target: "http://127.0.0.1:8787", changeOrigin: false },
    },
  },
});
