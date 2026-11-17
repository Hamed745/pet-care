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
