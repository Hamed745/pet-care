import { auth } from "../firebase.js";

const BASE_URL = (import.meta.env.VITE_ADMIN_API_BASE_URL || "http://localhost:10000").replace(/\/+$/, "");

async function authHeaders() {
  await auth.authStateReady();
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in first.");
  return {
    Authorization: `Bearer ${await user.getIdToken()}`,
  };
}

async function request(path, { method = "GET", payload, authenticated = false } = {}) {
  const headers = {};
  if (authenticated) Object.assign(headers, await authHeaders());
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method, headers, ...(payload === undefined ? {} : { body: JSON.stringify(payload) }),
    });
  } catch {
    throw new Error("Unable to reach the clinic service. Check your connection and try again.");
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error("The clinic service returned an invalid response. Check the backend configuration."); }
  if (!response.ok) throw new Error(result.error || `Clinic request failed (${response.status}).`);
  return result;
}

async function uploadDocument(kind, file) {
  const form = new FormData();
  form.append("document", file);
  let response;
  try {
    response = await fetch(`${BASE_URL}/api/clinics/mine/documents/${encodeURIComponent(kind)}`, {
      method: "POST",
      headers: await authHeaders(),
      body: form,
    });
  } catch {
    throw new Error("Unable to reach the clinic service. Check your connection and try again.");
  }
  let result;
  try { result = await response.json(); }
  catch { throw new Error("The clinic service returned an invalid response. Check the backend configuration."); }
  if (!response.ok) throw new Error(result.error || `Clinic request failed (${response.status}).`);
  return result;
}

async function downloadAdminDocument(id, kind) {
  let response;
  try {
    response = await fetch(
      `${BASE_URL}/api/admin/clinics/${encodeURIComponent(id)}/documents/${encodeURIComponent(kind)}`,
      { headers: await authHeaders(), cache: "no-store" },
    );
  } catch {
    throw new Error("Unable to reach the clinic service. Check your connection and try again.");
  }
  if (!response.ok) {
    let result;
    try { result = await response.json(); } catch { result = {}; }
    throw new Error(result.error || `Clinic request failed (${response.status}).`);
  }
  return response.blob();
}

export const clinicApi = {
  verificationConfig: () => request("/api/clinics/verification-config"),
  list: () => request("/api/clinics"),
  mine: () => request("/api/clinics/mine", { authenticated: true }),
  saveDraft: (clinic) => request("/api/clinics/mine/draft", { method: "PUT", authenticated: true, payload: { clinic } }),
  acceptDocumentConsent: (version) => request("/api/clinics/mine/document-consent", {
    method: "POST", authenticated: true, payload: { accepted: true, version },
  }),
  uploadDocument,
  deleteDocument: (kind) => request(`/api/clinics/mine/documents/${encodeURIComponent(kind)}`, { method: "DELETE", authenticated: true }),
  apply: (clinic) => request("/api/clinics/apply", { method: "POST", authenticated: true, payload: { clinic } }),
  updateProfile: (profile) => request("/api/clinics/mine/profile", { method: "PUT", authenticated: true, payload: { profile } }),
  updateAvailability: (workingHours) => request("/api/clinics/mine/availability", { method: "PUT", authenticated: true, payload: { workingHours } }),
  services: (services) => request("/api/clinics/mine/services", { method: "PUT", authenticated: true, payload: { services } }),
  syncPet: (pet) => request("/api/pets/sync", { method: "POST", authenticated: true, payload: { pet } }),
  myBookings: () => request("/api/clinics/my-appointments", { authenticated: true }),
  clinicBookings: () => request("/api/clinics/mine/appointments", { authenticated: true }),
  clinicHistory: (id) => request(`/api/admin/clinics/${encodeURIComponent(id)}/history`, { authenticated: true }),
  book: (clinicId, details) => request(`/api/clinics/${encodeURIComponent(clinicId)}/appointments`, { method: "POST", authenticated: true, payload: details }),
  updateBooking: (id, status, reason = "", slot = {}) => request(`/api/clinics/mine/appointments/${encodeURIComponent(id)}/status`, { method: "POST", authenticated: true, payload: { status, reason, ...(status === "confirmed" ? slot : {}) } }),
  cancelBooking: (id) => request(`/api/clinics/my-appointments/${encodeURIComponent(id)}/cancel`, { method: "POST", authenticated: true }),
  adminClinics: () => request("/api/admin/clinics", { authenticated: true }),
  adminDocuments: (id) => request(`/api/admin/clinics/${encodeURIComponent(id)}/documents`, { authenticated: true }),
  adminDocument: downloadAdminDocument,
  decide: (id, status, reason) => request(`/api/admin/clinics/${encodeURIComponent(id)}/decision`, { method: "POST", authenticated: true, payload: { status, reason } }),
  setRetentionHold: (id, active, type, reason) => request(`/api/admin/clinics/${encodeURIComponent(id)}/retention-hold`, {
    method: "POST", authenticated: true, payload: { active, type, reason },
  }),
  recordDocumentNecessityReview: (id, reason) => request(`/api/admin/clinics/${encodeURIComponent(id)}/document-necessity-review`, {
    method: "POST", authenticated: true, payload: { reason },
  }),
  cleanupClinicRetention: (cursor = {}) => request("/api/admin/clinic-retention/cleanup", {
    method: "POST", authenticated: true, payload: cursor,
  }),
};
