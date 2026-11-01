export async function fetchNearbyPlaceDetails(id, { signal } = {}) {
  const query = new URLSearchParams({ id: String(id) });
  let response;
  try {
    response = await fetch(`/api/place-details?${query}`, {
      signal,
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error("Could not connect to the place details service.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Place details are unavailable.");
  if (!data.place || String(data.place.id) !== String(id)) {
    throw new Error("Unexpected place details.");
  }
  return data;
}
