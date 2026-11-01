import { auth } from "../firebase.js";

const BASE_URL = (import.meta.env.VITE_ADMIN_API_BASE_URL || "http://localhost:10000").replace(/\/+$/, "");

async function request(path, method = "GET", pet) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in to save or view your pets.");
  const token = await user.getIdToken();
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(pet === undefined ? {} : { "Content-Type": "application/json" }),
      },
      ...(pet === undefined ? {} : { body: JSON.stringify({ pet }) }),
    });
  } catch {
    throw new Error("PetCare server is unreachable. Check VITE_ADMIN_API_BASE_URL and your connection.");
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `PetCare API error (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const ownerPetsApi = {
  list: async () => (await request("/api/me/pets")).pets,
  create: async (pet) => (await request("/api/me/pets", "POST", pet)).pet,
  update: async (pet) => (await request(`/api/me/pets/${encodeURIComponent(pet.id)}`, "PUT", pet)).pet,
  save: async (pet) => {
    try {
      return await ownerPetsApi.update(pet);
    } catch (error) {
      if (error.status !== 404) throw error;
      return ownerPetsApi.create(pet);
    }
  },
  remove: async (id) => {
    try {
      return await request(`/api/me/pets/${encodeURIComponent(id)}`, "DELETE");
    } catch (error) {
      if (error.status === 404) return { ok: true };
      throw error;
    }
  },
};
