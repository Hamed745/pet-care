export async function fetchNearbyPlaces({ kind, lon, lat, radius = 10000, hours = "any", signal }) {
  const query = new URLSearchParams({
    kind,
    lon: String(lon),
    lat: String(lat),
    radius: String(radius),
    ...(hours !== "any" ? { hours } : {}),
  });
  const response = await fetch(`/api/places?${query}`, {
    headers: { Accept: "application/json" },
    signal,
  });
  let data;
  try {
    data = await response.json();
  } catch {
    throw new Error("The map search service returned an invalid response.");
  }
  if (!response.ok) {
    throw new Error(data?.error || `Map search is temporarily unavailable (HTTP ${response.status}).`);
  }
  if (!Array.isArray(data?.items)) throw new Error("Unexpected search response.");
  return data.items;
}
