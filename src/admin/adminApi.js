import { onIdTokenChanged } from "firebase/auth";
import { auth } from "../firebase.js";

const API_BASE_URL = (
  import.meta.env.VITE_ADMIN_API_BASE_URL || "http://localhost:10000"
).replace(/\/+$/, "");

const request = async (path, { method = "GET", payload } = {}) => {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in first.");

  const token = await user.getIdToken();
  const hasBody = payload !== undefined;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(hasBody ? { "Content-Type": "application/json" } : {}),
    },
    ...(hasBody ? { body: JSON.stringify(payload) } : {}),
  });

  let data = {};
  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(data?.error || `Request failed (${response.status}).`);
  }
  return data;
};

export const adminApi = {
  overview: () => request("/api/admin/overview"),
  users: (pageToken = "") =>
    request(`/api/admin/users${pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : ""}`),
  pets: () => request("/api/admin/pets"),
  orders: () => request("/api/admin/orders"),
  products: () => request("/api/admin/products"),
  activity: () => request("/api/admin/activity"),
  setSuspended: (uid, disabled, reason) =>
    request(`/api/admin/users/${encodeURIComponent(uid)}/suspension`, {
      method: "POST",
      payload: { disabled, reason },
    }),
  setOrderStatus: (orderId, status, note) =>
    request(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: "POST",
      payload: { status, note },
    }),
  saveProduct: (product) =>
    request("/api/admin/products", { method: "POST", payload: { product } }),
  syncProfile: (profile) =>
    request("/api/profile/sync", { method: "POST", payload: { profile } }),
  syncPet: (pet) =>
    request("/api/pets/sync", { method: "POST", payload: { pet } }),
  deletePet: (petId) =>
    request(`/api/pets/${encodeURIComponent(petId)}`, { method: "DELETE" }),
};

export const onAdminAuth = (callback) =>
  onIdTokenChanged(auth, async (user) => {
    if (!user) {
      callback({ loading: false, user: null, isAdmin: false });
      return;
    }

    try {
      const result = await user.getIdTokenResult();
      callback({
        loading: false,
        user,
        isAdmin: result.claims.petcareAdmin === true,
      });
    } catch (error) {
      callback({ loading: false, user, isAdmin: false, error });
    }
  });
