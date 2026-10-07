import { createContext, useContext, useEffect, useState } from "react";
import usePersistentState from "./hooks/usePersistentState.js";
import * as petsService from "./services/petsService.js";
import * as bookingsService from "./services/bookingsService.js";
import * as authService from "./services/authService.js";
import * as storeService from "./services/storeService.js";
import * as communityService from "./services/communityService.js";
import { products as storeProducts } from "./storeCatalog.js";
import { PERSISTENCE_KEY } from "./config.js";
const Ctx = createContext();
export const useApp = () => useContext(Ctx);

const orderLine = (productId, qty) => {
  const product = storeProducts.find((item) => item.id === productId);
  return { id: product.id, name: product.name, image: product.image, price: product.price, qty, variant: null };
};
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
  orders: [
    { id: "PC-1048", items: [orderLine(1, 1), orderLine(11, 2)], subtotal: 1210, discount: 0, deliveryFee: 0, total: 1210, address: { name: "Mina Hassan", phone: "01000000001", city: "Cairo", address: "Garden City" }, status: "Delivered", createdAt: "2026-08-16T10:00:00.000Z" },
    { id: "PC-1062", items: [orderLine(2, 1), orderLine(16, 1)], subtotal: 780, discount: 80, deliveryFee: 35, total: 735, address: { name: "Mina Hassan", phone: "01000000001", city: "Cairo", address: "Garden City" }, status: "Shipped", createdAt: "2026-09-18T10:00:00.000Z" },
  ],
  pets: [
    { id: 1, name: "Luna", type: "Cat", breed: "Persian", age: 2, gender: "Female", weight: 4, healthStatus: "Healthy", notes: "", vaccines: [{ id: "vaccine-1-initial-rabies", petId: 1, name: "Rabies", date: "2026-05-01", next: "2027-05-01" }], meds: [], medicalVisits: [] },
  ],
};

export function AppProvider({ children }) {
  const [data, setData, storageError, setStorageError] = usePersistentState(PERSISTENCE_KEY, initialData);
  const [notice, setNotice] = useState([]);
  const { user, cart, bookings, pets, reports, favorites, recentlyViewed, orders, storeSort, calendarEvents, notifications, adoptionListings } = {
    ...initialData,
    ...data,
    user: data?.user && typeof data.user === "object" ? data.user : null,
    cart: Array.isArray(data?.cart) ? data.cart : initialData.cart,
    bookings: Array.isArray(data?.bookings) ? data.bookings : initialData.bookings,
    pets: Array.isArray(data?.pets) ? data.pets : initialData.pets,
    reports: Array.isArray(data?.reports) ? data.reports : initialData.reports,
    calendarEvents: Array.isArray(data?.calendarEvents) ? data.calendarEvents : initialData.calendarEvents,
    notifications: Array.isArray(data?.notifications) ? data.notifications : initialData.notifications,
    adoptionListings: Array.isArray(data?.adoptionListings) ? data.adoptionListings : initialData.adoptionListings,
    favorites: Array.isArray(data?.favorites) ? data.favorites : initialData.favorites,
    recentlyViewed: Array.isArray(data?.recentlyViewed) ? data.recentlyViewed.slice(0, 8) : initialData.recentlyViewed,
    orders: Array.isArray(data?.orders) ? data.orders : initialData.orders,
    storeSort: ["featured", "price-asc", "price-desc", "rating", "newest"].includes(data?.storeSort) ? data.storeSort : initialData.storeSort,
  };
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
  const saveUser = async (userData) => { const updated = await authService.updateUser(user, userData); setUser(updated); };
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
  const createStoreOrder = async (orderData) => { const order = await storeService.createOrder(orderData); setData((current) => ({ ...current, orders: [order, ...(current.orders || initialData.orders)] })); return order; };
  const cancelStoreOrder = async (id) => { const nextOrders = await storeService.cancelOrder(orders, id); setData((current) => ({ ...current, orders: nextOrders })); };
  const addPet = (pet) => setPets((current) => [...current, { ...pet, id: Date.now(), vaccines: [], meds: [] }]);
  const createPet = async (pet) => { setPets(await petsService.createPet(pets, pet)); };
  const updatePetInfo = async (id, petData) => { setPets(await petsService.updatePet(pets, id, petData)); };
  const updatePet = (id, fn) => setPets((x) => x.map((p) => p.id === id ? fn(p) : p));
  const deletePet = async (id, { cancelBookings = true } = {}) => {
    const nextPets = await petsService.deletePet(pets, id);
    const nextBookings = await bookingsService.deleteBookingsForPet(bookings, id, cancelBookings);
    setData((current) => ({ ...current, pets: nextPets, bookings: nextBookings, calendarEvents: (current.calendarEvents || []).filter((event) => String(event.petId) !== String(id)) }));
  };
  const addVaccine = async (petId, vaccine) => setPets(await petsService.addVaccination(pets, petId, vaccine));
  const updateVaccine = async (petId, vaccineId, changes) => {
    const nextPets = await petsService.updateVaccination(pets, petId, vaccineId, changes);
    const calendarEventsForPet = (current) => (current.calendarEvents || [])
      .filter((event) => !(String(event.petId) === String(petId) && event.vaccinationId === vaccineId && !changes.next))
      .map((event) => String(event.petId) === String(petId) && event.vaccinationId === vaccineId
        ? { ...event, title: changes.name, date: changes.next, type: "Vaccination" }
        : event);
    setData((current) => ({
      ...current,
      pets: nextPets,
      calendarEvents: calendarEventsForPet(current),
    }));
  };
  const addMedication = async (petId, medication) => setPets(await petsService.addMedication(pets, petId, medication));
  const deleteVaccine = async (petId, vaccineId) => {
    const nextPets = await petsService.deleteVaccination(pets, petId, vaccineId);
    setData((current) => ({
      ...current,
      pets: nextPets,
      calendarEvents: (current.calendarEvents || []).filter((event) =>
        !(String(event.petId) === String(petId) && event.vaccinationId === vaccineId)),
    }));
  };
  const deleteMedication = async (petId, index) => setPets(await petsService.deleteMedication(pets, petId, index));
  const addMedicalVisit = async (petId, visit) => setPets(await petsService.addMedicalVisit(pets, petId, visit));
  const deleteMedicalVisit = async (petId, visitId) => setPets(await petsService.deleteMedicalVisit(pets, petId, visitId));
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
  return <Ctx.Provider value={{ user, setUser, saveUser, savePreferences, cart, setCart, addToCart, addCartProduct, removeCartProduct, changeQty, updateCartQuantity, clearCart, favorites, toggleFavorite, recentlyViewed, markProductViewed, storeSort, setStoreSort, orders, createStoreOrder, cancelStoreOrder, pets, setPets, addPet, createPet, updatePet, updatePetInfo, deletePet, addVaccine, updateVaccine, addMedication, deleteVaccine, deleteMedication, addMedicalVisit, deleteMedicalVisit, bookings, setBookings, addBooking, createBooking, setBookingStatus, updateBookingStatus, updateBookingDetails, submitBookingReview, reports, createLostFoundReport, updateLostFoundReport, deleteLostFoundReport, calendarEvents, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, notifications, markNotificationRead, markAllNotificationsRead, deleteNotification, adoptionListings, createAdoptionListing, updateAdoptionListing, deleteAdoptionListing, clearDemoData, storageError, dismissStorageError, notice, showToast, dismissToast }}>{children}</Ctx.Provider>;
}
