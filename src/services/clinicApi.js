import { auth } from "../firebase.js";

const BASE_URL = (import.meta.env.VITE_ADMIN_API_BASE_URL || "http://localhost:10000").replace(/\/+$/, "");

async function request(path, { method = "GET", payload, authenticated = false } = {}) {
  const headers = {};
  if (authenticated) {
    const user = auth.currentUser;
    if (!user) throw new Error("Please sign in first.");
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${BASE_URL}${path}`, {
    method, headers, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
  });
  let result;
  try { result = await response.json(); }
  catch { throw new Error("The clinic service returned an invalid response. Check the backend configuration."); }
  if (!response.ok) throw new Error(result.error || `Clinic request failed (${response.status}).`);
  return result;
}

export const clinicApi = {
  list: () => request("/api/clinics"),
  mine: () => request("/api/clinics/mine", { authenticated: true }),
  apply: (clinic, documents) => request("/api/clinics/apply", { method: "POST", authenticated: true, payload: { clinic, documents } }),
  services: (services) => request("/api/clinics/mine/services", { method: "PUT", authenticated: true, payload: { services } }),
  myBookings: () => request("/api/clinics/my-appointments", { authenticated: true }),
  clinicBookings: () => request("/api/clinics/mine/appointments", { authenticated: true }),
  book: (clinicId, details) => request(`/api/clinics/${encodeURIComponent(clinicId)}/appointments`, { method: "POST", authenticated: true, payload: details }),
  updateBooking: (id, status) => request(`/api/clinics/mine/appointments/${encodeURIComponent(id)}/status`, { method: "POST", authenticated: true, payload: { status } }),
  cancelBooking: (id) => request(`/api/clinics/my-appointments/${encodeURIComponent(id)}/cancel`, { method: "POST", authenticated: true }),
  adminClinics: () => request("/api/admin/clinics", { authenticated: true }),
  adminDocument: (id, kind) => request(`/api/admin/clinics/${encodeURIComponent(id)}/documents/${kind}`, { authenticated: true }),
  decide: (id, status, reason) => request(`/api/admin/clinics/${encodeURIComponent(id)}/decision`, { method: "POST", authenticated: true, payload: { status, reason } }),
};
