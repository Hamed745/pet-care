import http from "node:http";
import { verifiedOpening } from "./maps-hours.mjs";

const HOST = "127.0.0.1";
const PORT = 8787;
const API_KEY = process.env.DGIS_PLACES_KEY;
const QUERIES = Object.freeze({
  emergency: "ветеринарная клиника", veterinary: "ветеринарная клиника",
  hotels: "зоогостиница", daycare: "передержка животных",
  grooming: "груминг", "pet-sitting": "зооняня",
});
const callsByIp = new Map();
const validNum = (s, lo, hi) => s != null && s !== "" && Number.isFinite(+s) && +s >= lo && +s <= hi;
const json = (res, code, data) => {
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
  res.end(JSON.stringify(data));
};
function distanceKm(a, b, c, d) {
  const rad = (v) => v * Math.PI / 180;
  const x = Math.sin(rad(c - a) / 2) ** 2 + Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(rad(d - b) / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
async function upstream(path, options) {
  options.set("key", API_KEY);
  const response = await fetch(`https://catalog.api.2gis.com${path}?${options}`, { headers: { Accept: "application/json" }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`2GIS HTTP ${response.status}`);
  const body = await response.json();
  // 2GIS returns meta.code=404 even with HTTP 200 when no matches exist.
  if (body?.meta?.code === 404) return [];
  if (body?.meta?.code && body.meta.code !== 200) throw new Error(`2GIS status ${body.meta.code}`);
  return Array.isArray(body?.result?.items) ? body.result.items : [];
}
function pointOf(item) {
  const lon = Number(item?.point?.lon), lat = Number(item?.point?.lat);
  return Number.isFinite(lon) && Number.isFinite(lat) && Math.abs(lon) <= 180 && Math.abs(lat) <= 90 ? { lon, lat } : null;
}
async function handle(req, res) {
  if (req.method !== "GET") return json(res, 405, { error: "GET only." });
  const url = new URL(req.url, `http://${HOST}:${PORT}`);
  if (url.pathname === "/api/health") return json(res, 200, { status: "ok", placesKeyConfigured: Boolean(API_KEY) });
  if (!["/api/places", "/api/cities", "/api/reverse-city"].includes(url.pathname)) return json(res, 404, { error: "Not found." });
  const ip = req.socket.remoteAddress || "local";
  const now = Date.now();
  const previous = callsByIp.get(ip);
  const counter = !previous || now - previous.since >= 60_000 ? { since: now, count: 0 } : previous;
  counter.count++;
  callsByIp.set(ip, counter);
  if (counter.count > 45) return json(res, 429, { error: "Too many map requests; retry shortly." });
  if (!API_KEY) return json(res, 503, { error: "2GIS Places API key is not configured." });
  try {
    if (url.pathname === "/api/cities") {
      const q = (url.searchParams.get("q") || "").trim();
      if (q.length < 2 || q.length > 80) return json(res, 400, { error: "City name must contain 2–80 characters." });
      const options = new URLSearchParams({ q, type: "adm_div.city,adm_div.settlement", locale: "ru_RU", fields: "items.point", page_size: "10" });
      const items = await upstream("/3.0/items/geocode", options);
      return json(res, 200, { items: items.filter((item) => pointOf(item)).slice(0, 10).map((item) => ({ id: String(item.id), name: String(item.name || ""), ...pointOf(item) })).filter((item) => item.name) });
    }
    if (url.pathname === "/api/reverse-city") {
      const lonStr = url.searchParams.get("lon"), latStr = url.searchParams.get("lat");
      if (!validNum(lonStr, -180, 180) || !validNum(latStr, -90, 90)) return json(res, 400, { error: "Invalid coordinates." });
      const options = new URLSearchParams({ lon: lonStr, lat: latStr, type: "adm_div.city,adm_div.settlement", locale: "ru_RU", fields: "items.point", page_size: "3" });
      const items = await upstream("/3.0/items/geocode", options);
      return json(res, 200, { name: String(items.find((item) => item?.name)?.name || "") });
    }
    const kind = url.searchParams.get("kind") || "";
    if (!Object.hasOwn(QUERIES, kind)) return json(res, 400, { error: "Unsupported category." });
    const lonStr = url.searchParams.get("lon"), latStr = url.searchParams.get("lat"), radiusStr = url.searchParams.get("radius") || "10000";
    if (!validNum(lonStr, -180, 180) || !validNum(latStr, -90, 90) || !validNum(radiusStr, 1000, 50000) || !Number.isInteger(+radiusStr)) {
      return json(res, 400, { error: "Invalid location or radius." });
    }
    const hours = url.searchParams.get("hours") || (url.searchParams.get("openNow") === "true" ? "now" : "any");
    if (!["any", "now", "alltime"].includes(hours)) return json(res, 400, { error: "Invalid opening hours filter." });
    if (hours !== "any" && !["emergency", "veterinary"].includes(kind)) return json(res, 400, { error: "Opening-hours filter is only available for veterinary searches." });
    const options = new URLSearchParams({
      q: QUERIES[kind], type: "branch", point: `${lonStr},${latStr}`,
      radius: String(radiusStr), sort: "distance", locale: "ru_RU",
      fields: "items.point,items.full_address_name,items.schedule,items.schedule_special",
      page_size: "10",
    });
    // 24/7 FIX: fetch without unsupported bare alltime filter; verify schedules locally.
    if (hours === "now") options.set("work_time", "now");
    // Read multiple nearby result pages for 24/7. Avoid claiming the search is exhaustive.
    const items = [];
    const maxPages = hours === "alltime" ? 5 : 1;
    let searchCapped = false;
    for (let page = 1; page <= maxPages; page++) {
      options.set("page", String(page));
      const batch = await upstream("/3.0/items", options);
      items.push(...batch);
      if (batch.length < 10) break;
      if (page === maxPages && hours === "alltime") searchCapped = true;
    }
    const lon = +lonStr, lat = +latStr;
    const results = items.filter((item) => item?.type === "branch" && item.id && item.name).map((item) => {
      const coord = pointOf(item);
      const opening = verifiedOpening(item, hours);
      return {
        id: String(item.id), name: String(item.name),
        address: String(item.full_address_name || item.address_name || ""),
        lon: coord?.lon ?? null, lat: coord?.lat ?? null,
        distanceKm: coord ? distanceKm(lat, lon, coord.lat, coord.lon) : null,
        url: /^\d+$/.test(String(item.id)) ? `https://2gis.ru/firm/${item.id}` : null,
        opening,
      };
    }).filter((item) => item.distanceKm === null || item.distanceKm * 1000 <= +radiusStr + 200)
      .filter((item) => hours === "any" || item.opening !== null);
    return json(res, 200, { items: results, source: "2GIS Places API", hoursFilter: hours, verifiedSchedule: hours !== "any", searchedCandidates: items.length, searchCapped, distanceType: "straight-line" });
  } catch (error) {
    // Avoid leaking upstream request URLs (which contain the API key), user coordinates or stack traces.
    return json(res, 502, { error: "Unable to complete the 2GIS request. Check API permissions, quota and connection." });
  }
}
http.createServer((req, res) => { handle(req, res).catch(() => json(res, 500, { error: "Maps server error." })); }).listen(PORT, HOST, () => {
  console.log(`PetCare Maps development API on http://${HOST}:${PORT}`);
});
