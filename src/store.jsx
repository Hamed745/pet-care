import { createContext, useContext, useState } from "react";
const Ctx = createContext();
export const useApp = () => useContext(Ctx);
export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [cart, setCart] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pets, setPets] = useState([
    { id: 1, name: "Luna", type: "Cat", breed: "Persian", age: 2, gender: "Female", weight: 4, vaccines: [{ name: "Rabies", date: "2026-05-01", next: "2027-05-01" }], meds: [] },
  ]);
  const addToCart = (p) => setCart((c) => c.find((i) => i.id === p.id) ? c.map((i) => i.id === p.id ? { ...i, qty: i.qty + 1 } : i) : [...c, { ...p, qty: 1 }]);
  const changeQty = (id, d) => setCart((c) => c.map((i) => i.id === id ? { ...i, qty: i.qty + d } : i).filter((i) => i.qty > 0));
  const addPet = (p) => setPets((x) => [...x, { ...p, id: Date.now(), vaccines: [], meds: [] }]);
  const updatePet = (id, fn) => setPets((x) => x.map((p) => p.id === id ? fn(p) : p));
  const addBooking = (b) => setBookings((x) => [{ ...b, id: Date.now(), status: "Upcoming" }, ...x]);
  const setBookingStatus = (id, status) => setBookings((x) => x.map((b) => b.id === id ? { ...b, status } : b));
  return <Ctx.Provider value={{ user, setUser, cart, setCart, addToCart, changeQty, pets, addPet, updatePet, bookings, addBooking, setBookingStatus }}>{children}</Ctx.Provider>;
}
