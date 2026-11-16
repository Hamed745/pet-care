"use strict";

// No network fetches: this validates only external hyperlinks entered by clinic managers.
// Never use these URLs for server-side requests or for embedded maps.
const MAP_HOSTS = [
  "2gis.ru", "2gis.com", "2gis.kz", "2gis.by", "2gis.uz", "2gis.ae",
  "yandex.ru", "yandex.com", "yandex.kz", "yandex.by",
  "maps.google.com", "google.com", "google.ru", "google.co.uk",
  "maps.app.goo.gl", "maps.apple.com", "openstreetmap.org",
];
const RUSSIAN_TIME_ZONES = Object.freeze([
  "Europe/Kaliningrad", "Europe/Moscow", "Europe/Samara",
  "Asia/Yekaterinburg", "Asia/Omsk", "Asia/Novosibirsk",
  "Asia/Krasnoyarsk", "Asia/Irkutsk", "Asia/Yakutsk",
  "Asia/Vladivostok", "Asia/Magadan", "Asia/Sakhalin", "Asia/Kamchatka",
]);
function validateMapUrl(input, required = true) {
  if (!required && (input == null || input === "")) return "";
  if (typeof input !== "string" || !input.trim() || input.trim().length > 1800) {
    throw new Error("Enter a valid HTTPS map link (up to 1800 characters).");
  }
  let url;
  try { url = new URL(input.trim()); }
  catch { throw new Error("Enter a valid HTTPS map link."); }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const allowedHost = MAP_HOSTS.some((host) => hostname === host || hostname.endsWith("." + host));
  if (url.protocol !== "https:" || !allowedHost || url.username || url.password ||
      (url.port && url.port !== "443")) {
    throw new Error("Use a HTTPS location link from 2GIS, Yandex Maps, Google Maps, Apple Maps or OpenStreetMap.");
  }
  const mapPathRequired = ["google.com", "google.ru", "google.co.uk", "yandex.ru", "yandex.com", "yandex.kz", "yandex.by"]
    .some((domain) => hostname === domain || hostname.endsWith("." + domain));
  if (mapPathRequired && !(/^\/maps(?:\/|$)/.test(url.pathname) || hostname.startsWith("maps."))) {
    throw new Error("Link must point to a map location.");
  }
  return url.toString();
}
function safeMapUrl(value) {
  try { return validateMapUrl(value, false); }
  catch { return ""; }
}
function validateClinicTimeZone(value) {
  if (typeof value !== "string" || !RUSSIAN_TIME_ZONES.includes(value)) {
    throw new Error("Choose a valid Russian clinic time zone.");
  }
  return value;
}
/**
 * Best-effort clinic time zone inference: hides technical IANA controls from applicants.
 * Some Russian regions span multiple zones. Ambiguous or unknown regions use Moscow
 * until an administrator can verify the correct booking-local time zone.
 */
function inferRussianTimeZone(region, city = "") {
  const place = (String(region || "") + " " + String(city || "")).toLowerCase().replace(/ё/g, "е");
  const rules = [
    ["Europe/Kaliningrad", /калининград|kaliningrad/],
    ["Asia/Kamchatka", /камчат|чукот|kamchat|chukot/],
    ["Asia/Sakhalin", /сахалин|sakhalin/],
    ["Asia/Magadan", /магадан|magadan/],
    ["Asia/Vladivostok", /приморск|владивосток|хабаровск|еврейск.*автоном|primorsk|vladivostok|khabarovsk/],
    ["Asia/Yakutsk", /якут|саха|забайкал|амурск|благовещенск|yakut|sakha|zabaykal|amur/],
    ["Asia/Irkutsk", /иркутск|бурят|улан-удэ|irkutsk|buryat/],
    ["Asia/Krasnoyarsk", /красноярск|хакас|тыва|тува|кызыл|krasnoyarsk|khakass|tyva|tuva/],
    ["Asia/Novosibirsk", /новосибирск|томск|кемеров|алтай|барнаул|novosibirsk|tomsk|kemerovo|altai/],
    ["Asia/Omsk", /омск|omsk/],
    ["Asia/Yekaterinburg", /екатеринбург|свердловск|челябинск|тюмен|пермск|пермь|курган|башкортостан|уфа|ханты|ямал|yekaterinburg|sverdlov|chelyabinsk|tyumen|perm|kurgan|bashkort|yamalo/],
    ["Europe/Samara", /самар|ульяновск|саратов|астрахан|удмурт|ижевск|samara|ulyanovsk|saratov|astrakhan|udmurt/],
  ];
  for (const [zone, pattern] of rules) if (pattern.test(place)) return zone;
  return "Europe/Moscow";
}
function clinicTimeZone(data) {
  return RUSSIAN_TIME_ZONES.includes(data?.timeZone)
    ? data.timeZone
    : data?.region ? inferRussianTimeZone(data.region, data.city) : "Africa/Cairo";
}
function clinicCurrency(data) {
  return data?.currency === "RUB" ? "RUB" : data?.region ? "RUB" : "EGP";
}
function clinicRegion(data) {
  return data?.region || data?.governorate || "";
}
module.exports = {
  RUSSIAN_TIME_ZONES, validateMapUrl, safeMapUrl,
  validateClinicTimeZone, inferRussianTimeZone, clinicTimeZone, clinicCurrency, clinicRegion,
};