import { createContext, useContext, useState } from "react";
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
const initialData = {
  user: null,
  cart: [],
  bookings: [],
  reports: [],
  favorites: [],
  recentlyViewed: [],
  storeSort: "featured",
  orders: [
    { id: "PC-1048", items: [orderLine(1, 1), orderLine(11, 2)], subtotal: 1210, discount: 0, deliveryFee: 0, total: 1210, address: { name: "Mina Hassan", phone: "01000000001", city: "Cairo", address: "Garden City" }, status: "Delivered", createdAt: "2026-08-16T10:00:00.000Z" },
    { id: "PC-1062", items: [orderLine(2, 1), orderLine(16, 1)], subtotal: 780, discount: 80, deliveryFee: 35, total: 735, address: { name: "Mina Hassan", phone: "01000000001", city: "Cairo", address: "Garden City" }, status: "Shipped", createdAt: "2026-09-18T10:00:00.000Z" },
  ],
  pets: [
    { id: 1, name: "Luna", type: "Cat", breed: "Persian", age: 2, gender: "Female", weight: 4, vaccines: [{ name: "Rabies", date: "2026-05-01", next: "2027-05-01" }], meds: [] },
  ],
};

export function AppProvider({ children }) {
  const [data, setData, storageError, setStorageError] = usePersistentState(PERSISTENCE_KEY, initialData);
  const [notice, setNotice] = useState([]);
  const { user, cart, bookings, pets, reports, favorites, recentlyViewed, orders, storeSort } = {
    ...initialData,
    ...data,
    user: data?.user && typeof data.user === "object" ? data.user : null,
    cart: Array.isArray(data?.cart) ? data.cart : initialData.cart,
    bookings: Array.isArray(data?.bookings) ? data.bookings : initialData.bookings,
    pets: Array.isArray(data?.pets) ? data.pets : initialData.pets,
    reports: Array.isArray(data?.reports) ? data.reports : initialData.reports,
    favorites: Array.isArray(data?.favorites) ? data.favorites : initialData.favorites,
    recentlyViewed: Array.isArray(data?.recentlyViewed) ? data.recentlyViewed.slice(0, 8) : initialData.recentlyViewed,
    orders: Array.isArray(data?.orders) ? data.orders : initialData.orders,
    storeSort: ["featured", "price-asc", "price-desc", "rating", "newest"].includes(data?.storeSort) ? data.storeSort : initialData.storeSort,
  };
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
    setData((current) => ({ ...current, pets: nextPets, bookings: nextBookings }));
  };
  const addVaccine = async (petId, vaccine) => setPets(await petsService.addVaccination(pets, petId, vaccine));
  const addMedication = async (petId, medication) => setPets(await petsService.addMedication(pets, petId, medication));
  const deleteVaccine = async (petId, index) => setPets(await petsService.deleteVaccination(pets, petId, index));
  const deleteMedication = async (petId, index) => setPets(await petsService.deleteMedication(pets, petId, index));
  const addBooking = (booking) => setBookings((current) => [{ ...booking, id: Date.now(), status: "Upcoming" }, ...current]);
  const createBooking = async (booking) => { setBookings(await bookingsService.createBooking(bookings, booking)); };
  const setBookingStatus = (id, status) => setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status } : booking));
  const updateBookingStatus = async (id, status) => { setBookings(await bookingsService.updateBooking(bookings, id, { status })); };
  const updateBookingDetails = async (id, changes) => { setBookings(await bookingsService.updateBooking(bookings, id, changes)); };
  const createLostFoundReport = async (report) => { const next = await communityService.createReport(reports, report); setData((current) => ({ ...current, reports: next })); };
  const updateLostFoundReport = async (id, changes) => { const next = await communityService.updateReport(reports || [], id, changes); setData((current) => ({ ...current, reports: next })); };
  const deleteLostFoundReport = async (id) => { const next = await communityService.deleteReport(reports || [], id); setData((current) => ({ ...current, reports: next })); };
  const clearDemoData = async () => {
    const reset = await authService.clearDemoData();
    setData(reset);
  };
  const dismissStorageError = () => setStorageError("");
  const showToast = (message, variant = "success", action) => setNotice((current) => [{ id: `${Date.now()}-${Math.random()}`, message, variant, action }, ...current].slice(0, 3));
  const dismissToast = (id) => setNotice((current) => current.filter((item) => item.id !== id));
  return <Ctx.Provider value={{ user, setUser, saveUser, cart, setCart, addToCart, addCartProduct, removeCartProduct, changeQty, updateCartQuantity, clearCart, favorites, toggleFavorite, recentlyViewed, markProductViewed, storeSort, setStoreSort, orders, createStoreOrder, cancelStoreOrder, pets, setPets, addPet, createPet, updatePet, updatePetInfo, deletePet, addVaccine, addMedication, deleteVaccine, deleteMedication, bookings, setBookings, addBooking, createBooking, setBookingStatus, updateBookingStatus, updateBookingDetails, reports, createLostFoundReport, updateLostFoundReport, deleteLostFoundReport, clearDemoData, storageError, dismissStorageError, notice, showToast, dismissToast }}>{children}</Ctx.Provider>;
}
