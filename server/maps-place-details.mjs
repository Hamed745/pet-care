// Normalize contact records returned by the licensed 2GIS Places API.
// This file deliberately does not scrape 2GIS pages or infer booking links.
const PROVIDERS = [
  ["WhatsApp", /(^|\.)whatsapp\.com$|(^|\.)wa\.me$/i],
  ["Telegram", /(^|\.)t\.me$|(^|\.)telegram\.me$/i],
  ["VKontakte", /(^|\.)vk\.com$/i],
  ["Instagram", /(^|\.)instagram\.com$/i],
  ["Facebook", /(^|\.)facebook\.com$|(^|\.)fb\.com$/i],
  ["YouTube", /(^|\.)youtube\.com$|(^|\.)youtu\.be$/i],
];

export function safeHttpUrl(raw) {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 2048) return null;
  const s = raw.trim();
  if (/^(javascript|data|file|blob):/i.test(s)) return null;
  const normalized = /^https?:\/\//i.test(s) ? s : /^([\w-]+\.)+[a-z]{2,}(\/|$)/i.test(s) ? `https://${s}` : "";
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    if (!url.hostname.includes(".") || /^(localhost|127\.|0\.|10\.|192\.168\.|169\.254\.)/i.test(url.hostname)) return null;
    return url.href;
  } catch { return null; }
}

function phoneRecord(contact) {
  const display = String(contact?.text || contact?.value || "").trim().slice(0, 60);
  const digits = String(contact?.value || contact?.text || "").replace(/[^\d+]/g, "");
  const normalized = digits.replace(/(?!^)\+/g, "");
  if (!/^\+?\d{7,15}$/.test(normalized)) return null;
  return { label: display || normalized, url: `tel:${normalized}` };
}

function socialProvider(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return PROVIDERS.find(([, match]) => match.test(hostname))?.[0] || null;
  } catch { return null; }
}

function contactLink(contact) {
  const type = String(contact?.type || "").trim().toLowerCase();
  const raw = contact?.url || contact?.value || contact?.text;
  if (type === "phone") {
    const record = phoneRecord(contact);
    return record ? { category: "phone", label: record.label, url: record.url } : null;
  }
  if (type === "email") {
    const addr = String(contact?.value || contact?.text || "").trim();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr) && addr.length < 200
      ? { category: "email", label: addr, url: `mailto:${addr}` } : null;
  }
  const url = safeHttpUrl(raw);
  if (!url) return null;
  const provider = socialProvider(url);
  if (provider) return { category: "social", label: provider, url };
  if (["website", "site", "url"].includes(type)) {
    return { category: "website", label: new URL(url).hostname.replace(/^www\./, ""), url };
  }
  if (["whatsapp", "telegram", "vkontakte", "vk", "facebook", "instagram", "social", "messenger"].includes(type)) {
    return { category: "social", label: type.charAt(0).toUpperCase() + type.slice(1), url };
  }
  return null;
}

export function normalizePlaceDetails(item, { contactsRequested = true } = {}) {
  if (!item || item.type !== "branch" || !item.id || !item.name) return null;
  const id = String(item.id);
  const contacts = (Array.isArray(item.contact_groups) ? item.contact_groups : [])
    .flatMap((group) => Array.isArray(group?.contacts) ? group.contacts : [])
    .map(contactLink)
    .filter(Boolean)
    .filter((record, index, arr) => arr.findIndex((other) => other.category === record.category && other.url === record.url) === index)
    .slice(0, 20);
  const point = item.point || {};
  const lon = Number(point.lon), lat = Number(point.lat);
  return {
    id, name: String(item.name).slice(0, 180),
    address: String(item.full_address_name || item.address_name || "").slice(0, 300),
    type: "branch",
    lon: Number.isFinite(lon) && Math.abs(lon) <= 180 ? lon : null,
    lat: Number.isFinite(lat) && Math.abs(lat) <= 90 ? lat : null,
    phones: contacts.filter((c) => c.category === "phone").slice(0, 5),
    websites: contacts.filter((c) => c.category === "website").slice(0, 4),
    socials: contacts.filter((c) => c.category === "social").slice(0, 8),
    emails: contacts.filter((c) => c.category === "email").slice(0, 3),
    contactsAvailable: contacts.length > 0,
    contactsRequested,
    is24x7: item.schedule?.is_24x7 === true,
    mapUrl: /^\d{3,24}$/.test(id) ? `https://2gis.ru/firm/${id}` : null,
    // A generic website is not proof that the business supports booking.
    bookingUrl: null,
  };
}
