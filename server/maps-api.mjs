// Standalone HTTP adapter for the same 2GIS routes used on Vercel.
// Keeping both deployments on the same handler prevents feature drift.
import http from "node:http";
import { handle } from "./maps-api-vercel.mjs";

const HOST = process.env.MAPS_HOST || "127.0.0.1";
const PORT = Number(process.env.MAPS_PORT || 8787);

if (!Number.isInteger(PORT) || PORT < 1 || PORT > 65535) {
  throw new Error("MAPS_PORT must be an integer from 1 to 65535.");
}

const server = http.createServer((req, res) => {
  Promise.resolve(handle(req, res)).catch((error) => {
    console.error("[maps-api] Unexpected error", error?.message || "unknown");
    if (!res.headersSent) {
      res.writeHead(500, { "Content-Type": "application/json", "Cache-Control": "no-store" });
      res.end(JSON.stringify({ error: "Maps server error." }));
    } else {
      res.end();
    }
  });
});

server.listen(PORT, HOST, () => {
  console.info(`PetCare Maps API listening on http://${HOST}:${PORT}`);
});
