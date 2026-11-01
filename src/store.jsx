import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import useAccountPersistentState, { getStoredAccountProfile, transferGuestCart } from "./hooks/useAccountPersistentState.js";
import * as petsService from "./services/petsService.js";
import * as bookingsService from "./services/bookingsService.js";
import * as authService from "./services/authService.js";
import * as storeService from "./services/storeService.js";
import { shopApi } from "./services/shopApi.js";
import * as communityService from "./services/communityService.js";
import { adminApi } from "./admin/adminApi.js";
import { ownerPetsApi } from "./services/ownerPetsApi.js";
import { readAccountData } from "./utils/accountStorage.js";
// Optional centralized profile/pet metadata sync: legacy local-first features remain usable.
const syncAdminData = (method, payload) => {
  if (!authService.getCurrentAuthUser()) return;
  adminApi[method](payload).catch((error) => {
    console.warn("PetCare admin sync not ready:", error?.code || "unavailable");
  });
};
const Ctx = createContext();
export const useApp = () => useContext(Ctx);

const createVaccinationId = () => `vaccine-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`}`;
const initialData = {
  user: null,
  cart: [],
  bookings: [],
  reports: [],
  calendarEvents: [],
  notifications: [
    { id: "demo-vaccine", type: "vaccination", title: "Vaccination reminder", message: "Luna is due for a Rabies booster soon.", date: "2026-10-08T09:00:00.000Z", petId: 1, read: false },
    { id: "demo-medication", type: "medication", title: "Medication schedule", message: "Review Luna's daily medication schedule.", date: "2026-10-02T08:00:00.000Z", petId: 1, read: false },
    { id: "demo-appointment", type: "appointment", title: "Veterinary appointment", message: "Your upcoming visit is on the calendar.", date: "2026-10-12T10:00:00.000Z", petId: 1, read: true },
    { id: "demo-order", type: "order", title: "Order delivered", message: "Your recent order was marked delivered.", date: "2026-09-28T14:00:00.000Z", read: true },
    { id: "demo-adoption", type: "adoption", title: "Adoption update", message: "A new animal listing may be a good match.", date: "2026-09-26T11:00:00.000Z", read: true },
    { id: "demo-lost-found", type: "lostFound", title: "Lost & Found update", message: "A nearby community report was updated.", date: "2026-09-24T15:00:00.000Z", read: true },
  ],
  adoptionListings: [],
  favorites: [],
  recentlyViewed: [],
  storeSort: "featured",
  orders: [],
  pets: [
    { id: 1, name: "Luna", type: "Cat", breed: "Persian", age: 2, gender: "Female", weight: 4, healthStatus: "Healthy", notes: "", vaccines: [{ id: "vaccine-1-initial-rabies", petId: 1, name: "Rabies", date: "2026-05-01", next: "2027-05-01" }], meds: [], medicalVisits: [] },
  ],
};

export function AppProvider({ children }) {
  const [authUid, setAuthUid] = useState(undefined);
  const [data, setData, storageError, setStorageError] = useAccountPersistentState(authUid, initialData);
  const latestData = useRef(data);
  useEffect(() => { latestData.current = data; }, [data]);
  // Keep local drafts in a distinct namespace for each Firebase user.
  // A guest's shopping cart may follow them when they sign in, but pet records
  // and bookings must never move to a different account.
  useEffect(() => {
    let previousUid = authService.getCurrentAuthUser()?.uid || null;
    return authService.subscribeToAuthState((firebaseUser) => {
      const nextUid = firebaseUser?.uid || null;
      if (nextUid && previousUid !== nextUid) transferGuestCart(nextUid, initialData);
      previousUid = nextUid;
      setAuthUid(nextUid);
      if (nextUid) {
        // A remembered Firebase session must also hydrate the UI account.
        const saved = getStoredAccountProfile(nextUid) || {};
        setData((current) => ({
          ...current,
          user: current.user?.uid === nextUid ? current.user : {
            uid: nextUid,
            email: firebaseUser.email || "",
            name: saved.name || firebaseUser.displayName || "",
            phone: saved.phone || "",
            city: saved.city || "",
            avatar: saved.avatar || "",
            photoURL: firebaseUser.photoURL || "",
            emailVerified: firebaseUser.emailVerified,
          },
        }));
      }
    });
  }, []);
  // Sync only records explicitly owned by the account whose session is active.
  useEffect(() => {
    if (!authUid) return;
    const saved = latestData.current || {};
    if (saved.user?.uid === authUid) {
      syncAdminData("syncProfile", {
        name: saved.user.name,
        city: saved.user.city,
        phone: saved.user.phone,
      });
    }
    (Array.isArray(saved.pets) ? saved.pets : [])
      .filter((pet) => pet.ownerUid === authUid && pet.id != null)
      .forEach((pet) => syncAdminData("syncPet", pet));
  }, [authUid]);
  // Load the server's owner-only pet records after Firebase restores a session.
  // Import older, explicitly owned local records ONCE without overwriting server
  // records. Do not delete browser data: it remains a migration backup.
  const [petsLoading, setPetsLoading] = useState(false);
  const [petsError, setPetsError] = useState("");
  useEffect(() => {
    if (!authUid) { setPetsLoading(false); setPetsError(""); return; }
    let active = true;
    const uid = authUid;
    const run = async () => {
      setPetsLoading(true);
      setPetsError("");
      try {
        let remote = await ownerPetsApi.list();
        const marker = `petcare-owner-pets-imported-v1:${uid}`;
        if (localStorage.getItem(marker) !== "yes") {
          const prior = (readAccountData(uid, initialData).pets || [])
            .filter((pet) => pet && pet.ownerUid === uid);
          const known = new Set(remote.map((pet) => String(pet.id)));
          for (const pet of prior) {
            if (!known.has(String(pet.id))) {
              const created = await ownerPetsApi.create(pet);
              remote.push(created);
              known.add(String(created.id));
            }
          }
          localStorage.setItem(marker, "yes");
        }
        if (active && authService.getCurrentAuthUser()?.uid === uid) {
          setData((current) => ({ ...current, pets: remote }));
        }
      } catch (error) {
        // Keep the user's local backup visible if their server is unavailable.
        if (active) setPetsError(error.message || "Unable to load pet records.");
      } finally {
        if (active) setPetsLoading(false);
      }
    };
    run();
    return () => { active = false; };
  }, [authUid]);
  const [notice, setNotice] = useState([]);
  const { user, cart, bookings, pets, reports, favorites, recentlyViewed, storeSort, calendarEvents, notifications, adoptionListings } = {
    ...initialData,
    ...data,
    // Do not trust stored profile/pet arrays without checking ownership.
    user: authUid && data?.user?.uid === authUid ? data.user : null,
    cart: Array.isArray(data?.cart) ? data.cart : initialData.cart,
    bookings: Array.isArray(data?.bookings) ? data.bookings : initialData.bookings,
    pets: authUid && Array.isArray(data?.pets)
      ? data.pets.filter((pet) => pet && pet.ownerUid === authUid)
      : [],
    reports: Array.isArray(data?.reports) ? data.reports : initialData.reports,
    calendarEvents: Array.isArray(data?.calendarEvents) ? data.calendarEvents : initialData.calendarEvents,
    notifications: Array.isArray(data?.notifications) ? data.notifications : initialData.notifications,
    adoptionListings: Array.isArray(data?.adoptionListings) ? data.adoptionListings : initialData.adoptionListings,
    favorites: Array.isArray(data?.favorites) ? data.favorites : initialData.favorites,
    recentlyViewed: Array.isArray(data?.recentlyViewed) ? data.recentlyViewed.slice(0, 8) : initialData.recentlyViewed,
    storeSort: ["featured", "price-asc", "price-desc", "rating", "newest"].includes(data?.storeSort) ? data.storeSort : initialData.storeSort,
  };
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const productsRequest = useRef(0);
  const ordersRequest = useRef(0);

  const refreshProducts = useCallback(async () => {
    const requestNumber = ++productsRequest.current;
    setProductsLoading(true);
    setProductsError("");
    try {
      const liveProducts = await shopApi.products();
      if (requestNumber !== productsRequest.current) return;
      setProducts(liveProducts);
      const published = new Map(liveProducts.map((product) => [product.id, product]));
      // Old demo products and unpublished products must not survive in the cart.
      setData((current) => ({ ...current, cart: (Array.isArray(current.cart) ? current.cart : []).flatMap((item) => {
        const product = published.get(String(item.id));
        if (!product || product.stock <= 0) return [];
        const qty = Number(item.qty);
        return Number.isInteger(qty) && qty > 0
          ? [{ ...product, qty: Math.min(qty, product.stock), variant: null }]
          : [];
      }) }));
    } catch (error) {
      if (requestNumber === productsRequest.current) setProductsError(error.message || "The store could not be loaded.");
    } finally {
      if (requestNumber === productsRequest.current) setProductsLoading(false);
    }
  }, [setData]);
  useEffect(() => { refreshProducts(); }, [refreshProducts]);

  const refreshOrders = useCallback(async ({ silent = false } = {}) => {
    const requestNumber = ++ordersRequest.current;
    const uid = authService.getCurrentAuthUser()?.uid;
    if (!uid) { setOrders([]); setOrdersLoading(false); return; }
    if (!silent) { setOrdersLoading(true); setOrdersError(""); }
    try {
      const liveOrders = await shopApi.orders();
      if (requestNumber === ordersRequest.current && authService.getCurrentAuthUser()?.uid === uid) setOrders(liveOrders);
    } catch (error) {
      if (!silent && requestNumber === ordersRequest.current && authService.getCurrentAuthUser()?.uid === uid) setOrdersError(error.message || "Could not load orders.");
    } finally {
      if (requestNumber === ordersRequest.current && authService.getCurrentAuthUser()?.uid === uid) setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthState((firebaseUser) => {
      setOrdersError("");
      if (!firebaseUser) { ordersRequest.current++; setOrders([]); setOrdersLoading(false); return; }
      setOrdersLoading(true);
      refreshOrders();
    });
    return unsubscribe;
  }, [refreshOrders]);
  useEffect(() => {
    const usedIds = new Set();
    let needsMigration = false;
    pets.forEach((pet) => (pet.vaccines || []).forEach((vaccine) => {
      if (!vaccine.id || usedIds.has(vaccine.id) || String(vaccine.petId) !== String(pet.id)) needsMigration = true;
      if (vaccine.id) usedIds.add(vaccine.id);
    }));
    if (!needsMigration) return;
    setData((current) => {
      const migratedIds = new Set();
      const sourcePets = Array.isArray(current.pets) ? current.pets : initialData.pets;
      return {
        ...current,
        pets: sourcePets.map((pet) => ({
          ...pet,
          vaccines: (pet.vaccines || []).map((vaccine) => {
            const id = vaccine.id && !migratedIds.has(vaccine.id) ? vaccine.id : createVaccinationId();
            migratedIds.add(id);
            return { ...vaccine, id, petId: pet.id };
          }),
        })),
      };
    });
  }, [pets, setData]);
  const setUser = (value) => setData((current) => ({ ...current, user: typeof value === "function" ? value(current.user) : value }));
  const saveUser = async (userData) => { const updated = await authService.updateUser(user, userData); setUser(updated); if (updated?.uid && authService.getCurrentAuthUser()?.uid === updated.uid) syncAdminData("syncProfile", {name:updated.name,city:updated.city,phone:updated.phone}); };
  const setCart = (value) => setData((current) => ({ ...current, cart: typeof value === "function" ? value(current.cart) : value }));
  const setPets = (value) => setData((current) => ({ ...current, pets: typeof value === "function" ? value(current.pets) : value }));
  const setBookings = (value) => setData((current) => ({ ...current, bookings: typeof value === "function" ? value(current.bookings) : value }));
  const addToCart = (product) => setCart((current) => current.find((item) => item.id === product.id) ? current.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...current, { ...product, qty: 1 }]);
  const addCartProduct = async (product, variant, quantity = 1) => { setCart(await storeService.addCartItem(cart, product, variant, quantity)); };
  const removeCartProduct = async (id, variantId) => { setCart(await storeService.removeCartItem(cart, id, variantId)); };
  const changeQty = (id, delta) => setCart((current) => current.map((item) => item.id === id ? { ...item, qty: item.qty + delta } : item).filter((item) => item.qty > 0));
  const updateCartQuantity = async (id, delta, variantId) => { setCart(await storeService.changeCartQuantity(cart, id, delta, variantId)); };
  const clearCart = async () => { setCart(await storeService.clearCart()); };
  const toggleFavorite = async (id) => { const nextFavorites = await storeService.toggleFavorite(favorites, id); setData((current) => ({ ...current, favorites: nextFavorites })); };
  const markProductViewed = async (id) => { const nextRecentlyViewed = await storeService.addRecentlyViewed(recentlyViewed, id); setData((current) => ({ ...current, recentlyViewed: nextRecentlyViewed })); };
  const setStoreSort = (storeSort) => setData((current) => ({ ...current, storeSort }));
  const createStoreOrder = async (orderData) => {
    const order = await shopApi.checkout({
      requestId: orderData.requestId,
      items: orderData.items.map(({ id, qty }) => ({ id, qty })),
      address: orderData.address,
      paymentMethod: orderData.paymentMethod,
      expectedSubtotal: orderData.subtotal - orderData.discount,
    });
    ordersRequest.current++;
    setOrdersLoading(false);
    setOrders((current) => [order, ...current.filter((item) => item.id !== order.id)]);
    setProducts((current) => current.map((product) => {
      const purchased = order.items?.find((item) => item.id === product.id);
      return purchased ? { ...product, stock: Math.max(0, product.stock - purchased.qty) } : product;
    }));
    return order;
  };
  const cancelStoreOrder = async (id) => {
    const order = await shopApi.cancelOrder(id);
    ordersRequest.current++;
    setOrdersLoading(false);
    setOrders((current) => current.map((item) => item.id === id ? order : item));
    refreshProducts();
  };
  const requireOwner = () => {
    const uid = authService.getCurrentAuthUser()?.uid;
    if (!uid || uid !== authUid) throw new Error("Please sign in to manage your pet records.");
    return uid;
  };
  const persistPetList = async (nextPets, id) => {
    const uid = requireOwner();
    const changed = nextPets.find((pet) => String(pet.id) === String(id) && pet.ownerUid === uid);
    if (!changed) throw new Error("This pet does not belong to your account.");
    await ownerPetsApi.save(changed);
    setPets(nextPets);
    return changed;
  };
  const addPet = async (pet) => createPet(pet);
  const createPet = async (pet) => {
    const uid = requireOwner();
    const next = await petsService.createPet(pets, { ...pet, ownerUid: uid });
    const created = next[next.length - 1];
    const saved = await ownerPetsApi.create(created);
    setPets((current) => [...current.filter((p) => String(p.id) !== String(saved.id)), saved]);
    syncAdminData("syncPet", saved);
    return saved;
  };
  const updatePetInfo = async (id, petData) => {
    const next = await petsService.updatePet(pets, id, petData);
    const changed = await persistPetList(next, id);
    syncAdminData("syncPet", changed);
  };
  const updatePet = async (id, fn) => {
    const next = pets.map((p) => String(p.id) === String(id) ? fn(p) : p);
    await persistPetList(next, id);
  };
  const deletePet = async (id, { cancelBookings = true } = {}) => {
    requireOwner();
    await ownerPetsApi.remove(id);
    const nextPets = await petsService.deletePet(pets, id);
    syncAdminData("deletePet", id);
    const nextBookings = await bookingsService.deleteBookingsForPet(bookings, id, cancelBookings);
    setData((current) => ({ ...current, pets: nextPets, bookings: nextBookings,
      calendarEvents: (current.calendarEvents || []).filter((event) => String(event.petId) !== String(id)) }));
  };
  const addVaccine = async (petId, vaccine) =>
    persistPetList(await petsService.addVaccination(pets, petId, vaccine), petId);
  const updateVaccine = async (petId, vaccineId, changes) => {
    const nextPets = await petsService.updateVaccination(pets, petId, vaccineId, changes);
    const updated = nextPets.find((p) => String(p.id) === String(petId));
    requireOwner();
    if (!updated || updated.ownerUid !== authUid) throw new Error("Pet not found.");
    await ownerPetsApi.save(updated);
    setData((current) => ({
      ...current, pets: nextPets,
      calendarEvents: (current.calendarEvents || [])
        .filter((event) => !(String(event.petId) === String(petId) && event.vaccinationId === vaccineId && !changes.next))
        .map((event) => String(event.petId) === String(petId) && event.vaccinationId === vaccineId
          ? { ...event, title: changes.name, date: changes.next, type: "Vaccination" }
          : event),
    }));
  };
  const addMedication = async (petId, medication) =>
    persistPetList(await petsService.addMedication(pets, petId, medication), petId);
  const deleteVaccine = async (petId, vaccineId) => {
    const nextPets = await petsService.deleteVaccination(pets, petId, vaccineId);
    const updated = nextPets.find((p) => String(p.id) === String(petId));
    requireOwner();
    if (!updated || updated.ownerUid !== authUid) throw new Error("Pet not found.");
    await ownerPetsApi.save(updated);
    setData((current) => ({
      ...current, pets: nextPets,
      calendarEvents: (current.calendarEvents || []).filter((event) =>
        !(String(event.petId) === String(petId) && event.vaccinationId === vaccineId)),
    }));
  };
  const deleteMedication = async (petId, index) =>
    persistPetList(await petsService.deleteMedication(pets, petId, index), petId);
  const addMedicalVisit = async (petId, visit) =>
    persistPetList(await petsService.addMedicalVisit(pets, petId, visit), petId);
  const deleteMedicalVisit = async (petId, visitId) =>
    persistPetList(await petsService.deleteMedicalVisit(pets, petId, visitId), petId);
  const addBooking = (booking) => setBookings((current) => [{ ...booking, id: Date.now(), status: "Upcoming" }, ...current]);
  const createBooking = async (booking) => { setBookings(await bookingsService.createBooking(bookings, booking)); };
  const setBookingStatus = (id, status) => setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status } : booking));
  const updateBookingStatus = async (id, status) => { setBookings(await bookingsService.updateBooking(bookings, id, { status })); };
  const updateBookingDetails = async (id, changes) => { setBookings(await bookingsService.updateBooking(bookings, id, changes)); };
  const submitBookingReview = async (id, review) => { setBookings(await bookingsService.updateBooking(bookings, id, { review: { ...review, createdAt: new Date().toISOString() } })); };
  const createLostFoundReport = async (report) => { const next = await communityService.createReport(reports, report); setData((current) => ({ ...current, reports: next })); };
  const updateLostFoundReport = async (id, changes) => { const next = await communityService.updateReport(reports || [], id, changes); setData((current) => ({ ...current, reports: next })); };
  const deleteLostFoundReport = async (id) => { const next = await communityService.deleteReport(reports || [], id); setData((current) => ({ ...current, reports: next })); };
  const createCalendarEvent = async (event) => { const record = { ...event, id: `event-${Date.now()}`, createdAt: new Date().toISOString() }; setData((current) => ({ ...current, calendarEvents: [record, ...(current.calendarEvents || [])] })); return record; };
  const updateCalendarEvent = async (id, changes) => setData((current) => ({ ...current, calendarEvents: (current.calendarEvents || []).map((event) => event.id === id ? { ...event, ...changes } : event) }));
  const deleteCalendarEvent = async (id) => setData((current) => ({ ...current, calendarEvents: (current.calendarEvents || []).filter((event) => event.id !== id) }));
  const markNotificationRead = (id) => setData((current) => ({ ...current, notifications: (current.notifications || []).map((item) => item.id === id ? { ...item, read: true } : item) }));
  const markAllNotificationsRead = () => setData((current) => ({ ...current, notifications: (current.notifications || []).map((item) => ({ ...item, read: true })) }));
  const deleteNotification = (id) => setData((current) => ({ ...current, notifications: (current.notifications || []).filter((item) => item.id !== id) }));
  const createAdoptionListing = async (listing) => { const record = { ...listing, id: `listing-${Date.now()}`, ownerId: user?.email || "guest", status: "Available", createdAt: new Date().toISOString() }; setData((current) => ({ ...current, adoptionListings: [record, ...(current.adoptionListings || [])] })); return record; };
  const updateAdoptionListing = async (id, changes) => setData((current) => ({ ...current, adoptionListings: (current.adoptionListings || []).map((listing) => listing.id === id ? { ...listing, ...changes } : listing) }));
  const deleteAdoptionListing = async (id) => setData((current) => ({ ...current, adoptionListings: (current.adoptionListings || []).filter((listing) => listing.id !== id) }));
  const savePreferences = async (preferences) => { await saveUser({ ...user, preferences: { ...(user?.preferences || {}), ...preferences } }); };
  const clearDemoData = async () => {
    const reset = await authService.clearDemoData();
    setData(reset);
  };
  const dismissStorageError = () => setStorageError("");
  const showToast = (message, variant = "success", action) => setNotice((current) => [{ id: `${Date.now()}-${Math.random()}`, message, variant, action }, ...current].slice(0, 3));
  const dismissToast = (id) => setNotice((current) => current.filter((item) => item.id !== id));
  if (authUid === undefined || authUid !== (authService.getCurrentAuthUser()?.uid || null)) return <div role="status" className="p-8 text-center">Checking your session…</div>;
  return <Ctx.Provider value={{ products, productsLoading, productsError, refreshProducts, ordersLoading, ordersError, refreshOrders, user, setUser, saveUser, savePreferences, cart, setCart, addToCart, addCartProduct, removeCartProduct, changeQty, updateCartQuantity, clearCart, favorites, toggleFavorite, recentlyViewed, markProductViewed, storeSort, setStoreSort, orders, createStoreOrder, cancelStoreOrder, pets, petsLoading, petsError, setPets, addPet, createPet, updatePet, updatePetInfo, deletePet, addVaccine, updateVaccine, deleteVaccine, addMedication, deleteMedication, addMedicalVisit, deleteMedicalVisit, bookings, setBookings, addBooking, createBooking, setBookingStatus, updateBookingStatus, updateBookingDetails, submitBookingReview, reports, createLostFoundReport, updateLostFoundReport, deleteLostFoundReport, calendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, notifications, markNotificationRead, markAllNotificationsRead, deleteNotification, adoptionListings, createAdoptionListing, updateAdoptionListing, deleteAdoptionListing, clearDemoData, storageError, dismissStorageError, notice, showToast, dismissToast }}>{children}</Ctx.Provider>;
}
