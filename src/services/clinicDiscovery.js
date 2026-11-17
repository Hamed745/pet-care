// Pure location helpers shared by clinic profile validation hints and the
// approved-partner search. These never geocode or guess coordinates.
const cityAliases = {
  moscow: ["moscow", "москва"],
  krasnoyarsk: ["krasnoyarsk", "красноярск"],
  kazan: ["kazan", "казань"],
  novosibirsk: ["novosibirsk", "новосибирск"],
  yekaterinburg: ["yekaterinburg", "екатеринбург"],
  saint_petersburg: ["saint petersburg", "saint-petersburg", "санкт петербург", "санкт-петербург"],
};
const norm = value => String(value || "").toLocaleLowerCase("ru")
  .replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/gi, " ").trim();
const knownCity = value => {
  const name = norm(value);
  for (const [city, aliases] of Object.entries(cityAliases)) {
    if (aliases.some(alias => norm(alias) === name)) return city;
  }
  return null;
};

export function mapLinkCityConflict(city, mapUrl) {
  if (!city || !mapUrl) return null;
  try {
    const url = new URL(mapUrl);
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" ||
      !["2gis.ru", "2gis.com"].some(domain => host === domain || host.endsWith("." + domain))) {
      return null;
    }
    const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] || "");
    const actual = knownCity(city), linked = knownCity(slug);
    return actual && linked && actual !== linked ? slug : null;
  } catch { return null; }
}

export function clinicSearchPlacement({ distanceKm, radius, sameCity, gps }) {
  const withinRadius = Number.isFinite(distanceKm) && distanceKm >= 0 &&
    distanceKm * 1000 <= radius;
  // Unresolved share links may still match a manually chosen city, never GPS.
  const cityOnly = distanceKm == null && !gps && sameCity;
  return { nearby: withinRadius || cityOnly, withinRadius, cityOnly };
}

// Return a real geographic coordinate only when it is consistent with the
// clinic's recorded city. City centers here are VALIDATION references only,
// never displayed as clinic pins or substituted for missing coordinates.
const CITY_REFERENCE_POINTS = {
  moscow: { lat:55.7558, lon:37.6176 },
  krasnoyarsk: { lat:56.0101, lon:92.8526 },
  kazan: { lat:55.7961, lon:49.1221 },
  novosibirsk: { lat:55.0302, lon:82.9204 },
  yekaterinburg: { lat:56.8389, lon:60.5975 },
  saint_petersburg: { lat:59.9343, lon:30.3158 },
};
const numericCoord = value => {
  if (typeof value !== "number" && (typeof value !== "string" || !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const distanceKm = (a, b) => {
  const rad = v => v * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) *
    Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

export function isPlausibleClinicPoint(clinic, point) {
  const lat = numericCoord(point?.lat), lon = numericCoord(point?.lon);
  if (lat === null || lon === null || Math.abs(lat) > 90 || Math.abs(lon) > 180 ||
      (lat === 0 && lon === 0)) return false;
  const reference = CITY_REFERENCE_POINTS[knownCity(clinic?.city)];
  // Reject points thousands of kilometres away from a known clinic city.
  return !reference || distanceKm(reference, { lat, lon }) <= 100;
}

export function addressMentionsClinicCity(city, fullAddress) {
  const full = norm(fullAddress);
  if (!city || !full) return false;
  const canonical = knownCity(city);
  if (canonical) return cityAliases[canonical].some(alias => full.includes(norm(alias)));
  return full.includes(norm(city));
}
