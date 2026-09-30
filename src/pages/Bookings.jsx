import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Activity, CalendarDays, Check, Clock3, MapPin, X } from "lucide-react";
import { useApp } from "../store.jsx";
import { btn2, btnDanger, card } from "../ui.js";
import { Badge, Modal, Tabs, Toast } from "../components/ui.jsx";
export default function Bookings() {
  const { bookings, setBookingStatus } = useApp();
  const location = useLocation();
  const [tab, setTab] = useState("Upcoming");
  const [cancelId, setCancelId] = useState(null);
  const [toast, setToast] = useState("");
  useEffect(() => { if (location.state?.toast) { setToast(location.state.toast); const timeout = window.setTimeout(() => setToast(""), 4000); return () => window.clearTimeout(timeout); } }, [location.state]);
  const list = bookings.filter((b) => (tab === "Upcoming") === (b.status === "Upcoming"));
  const cancelBooking = () => { setBookingStatus(cancelId, "Cancelled"); setCancelId(null); };
  return <div><div className="mb-7"><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Your schedule</p><h1 className="mt-2 text-3xl font-extrabold">Bookings</h1><p className="mt-2 text-sm text-ink-500">Keep track of every visit and appointment.</p></div>
    <Tabs items={["Upcoming", "History"]} value={tab} onChange={setTab} label="Booking history" className="mb-6" />
    <div className="space-y-4">{list.map((booking) => <article key={booking.id} className={`${card} flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between`}><div className="flex min-w-0 gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700"><Activity size={22} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold">{booking.provider.name}</h2><Badge variant={booking.status === "Upcoming" ? "warning" : booking.status === "Completed" ? "success" : "danger"}>{booking.status}</Badge></div><p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500"><span className="inline-flex items-center gap-1"><CalendarDays size={14} /> {booking.date}</span><span className="inline-flex items-center gap-1"><Clock3 size={14} /> {booking.time}</span><span>{booking.pet?.name || "Pet"}</span></p><p className="mt-2 flex items-center gap-1 text-xs text-ink-500"><MapPin size={13} /> {booking.provider.city}<span className="mx-1">·</span>{booking.provider.price} EGP</p>{booking.notes && <p className="mt-3 rounded-lg bg-stone-50 p-3 text-sm text-ink-700">{booking.notes}</p>}</div></div>
      {booking.status === "Upcoming" && <div className="flex shrink-0 gap-2 sm:justify-end"><button className={btn2} onClick={() => setBookingStatus(booking.id, "Completed")}><Check size={15} /> Complete</button><button className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-red-100 px-4 py-2 text-sm font-semibold text-danger-600 transition hover:bg-red-50" onClick={() => setCancelId(booking.id)}><X size={15} /> Cancel</button></div>}</article>)}
      {!list.length && <div className={`${card} py-16 text-center`}><CalendarDays size={30} className="mx-auto text-primary-600" /><h2 className="mt-4 text-lg font-extrabold">No {tab.toLowerCase()} bookings</h2><p className="mt-2 text-sm text-ink-500">{tab === "Upcoming" ? "Find a service and choose a time that works." : "Completed or cancelled appointments will appear here."}</p></div>}</div>
    <Modal open={cancelId !== null} onClose={() => setCancelId(null)} title="Cancel this booking?"><p className="text-sm leading-6 text-ink-500">This appointment will move to your booking history as cancelled.</p><div className="mt-6 flex justify-end gap-2"><button className={btn2} onClick={() => setCancelId(null)}>Keep booking</button><button className={btnDanger} onClick={cancelBooking}>Cancel booking</button></div></Modal>
    <Toast message={toast} onClose={() => setToast("")} /></div>;
}
