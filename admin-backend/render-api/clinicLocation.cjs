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
  if ((hostname === "google.com" || hostname.endsWith(".google.com") ||
       hostname === "yandex.ru" || hostname.endsWith(".yandex.ru")) &&
      !(/^\/maps(?:\/|$)/.test(url.pathname) || hostname.startsWith("maps."))) {
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
function clinicTimeZone(data) {
  return RUSSIAN_TIME_ZONES.includes(data?.timeZone)
    ? data.timeZone
    : data?.region ? "Europe/Moscow" : "Africa/Cairo";
}
function clinicCurrency(data) {
  return data?.currency === "RUB" ? "RUB" : data?.region ? "RUB" : "EGP";
}
function clinicRegion(data) {
  return data?.region || data?.governorate || "";
}
module.exports = {
  RUSSIAN_TIME_ZONES, validateMapUrl, safeMapUrl,
  validateClinicTimeZone, clinicTimeZone, clinicCurrency, clinicRegion,
};