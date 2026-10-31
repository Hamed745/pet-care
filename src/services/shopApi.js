import { auth } from "../firebase.js";

const API_BASE_URL = (import.meta.env.VITE_ADMIN_API_BASE_URL || "http://localhost:10000").replace(/\/+$/, "");

async function request(path, { method = "GET", body, signedIn = false } = {}) {
  const headers = {};
  if (signedIn) {
    const user = auth.currentUser;
    if (!user) throw new Error("Please sign in before placing or viewing orders.");
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method, headers, ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Shop request failed (${response.status}).`);
  return data;
}

export const normalizeProduct = (product) => ({
  ...product,
  id: String(product.id),
  name: product.name || "",
  brand: "PetCare",
  images: product.imageUrl ? [product.imageUrl] : [],
  image: product.imageUrl || "",
  price: Number(product.price) || 0,
  stock: Number(product.stock) || 0,
  rating: 0,
  reviewsCount: 0,
  badges: [],
  ageGroup: "all",
  createdAt: product.createdAt || "",
});

const displayStatus = (status) => {
  if (["cancelled", "rejected"].includes(status)) return "Cancelled";
  if (["delivered", "picked_up"].includes(status)) return "Delivered";
  if (["out_for_delivery", "ready_for_pickup"].includes(status)) return "Shipped";
  if (status === "pending") return "Placed";
  return "Preparing";
};

export const normalizeOrder = (order) => ({
  ...order,
  serverStatus: order.status,
  status: displayStatus(order.status),
});

export const shopApi = {
  products: async () => (await request("/api/store/products")).products.map(normalizeProduct),
  orders: async () => (await request("/api/store/orders", { signedIn: true })).orders.map(normalizeOrder),
  checkout: async (payload) => normalizeOrder((await request("/api/store/orders", {
    method: "POST", body: payload, signedIn: true,
  })).order),
  cancelOrder: async (id) => normalizeOrder((await request(`/api/store/orders/${encodeURIComponent(id)}/cancel`, {
    method: "POST", signedIn: true,
  })).order),
};
