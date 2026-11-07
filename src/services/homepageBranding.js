// Public homepage appearance; independent of authentication.
// The API validates ImageKit URLs and returns no administrator data.
const API_BASE_URL = (
  import.meta.env.VITE_ADMIN_API_BASE_URL || "http://localhost:10000"
).replace(/\/+$/, "");

export async function fetchHomepageHero({ signal } = {}) {
  const response = await fetch(`${API_BASE_URL}/api/public/homepage`, {
    signal,
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  if (!response.ok) throw new Error("Homepage branding is not available.");
  const body = await response.json();
  return typeof body?.heroImageUrl === "string" && /^https:\/\//i.test(body.heroImageUrl)
    ? body.heroImageUrl : "";
}
