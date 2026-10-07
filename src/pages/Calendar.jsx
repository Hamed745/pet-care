import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Trash2 } from "lucide-react";
import { useApp } from "../store.jsx";
import PetAvatar from "../components/PetAvatar.jsx";
import { btn, btn2, input } from "../ui.js";
import { Button, EmptyState, Modal } from "../components/ui.jsx";

const eventTypes = ["Vaccination", "Medication", "Veterinary appointment", "Grooming", "Pet sitting", "Custom reminder"];
const eventStyles = {
  Vaccination: "border-violet-200 bg-violet-50 text-violet-800",
  Medication: "border-orange-200 bg-orange-50 text-orange-800",
  "Veterinary appointment": "border-sky-200 bg-sky-50 text-sky-800",
  Grooming: "border-rose-200 bg-rose-50 text-rose-800",
  "Pet sitting": "border-emerald-200 bg-emerald-50 text-emerald-800",
  "Custom reminder": "border-pink-200 bg-pink-50 text-pink-800",
};
const eventDotStyles = {
  Vaccination: "bg-violet-500",
  Medication: "bg-orange-500",
  "Veterinary appointment": "bg-sky-500",
  Grooming: "bg-rose-500",
  "Pet sitting": "bg-emerald-500",
  "Custom reminder": "bg-pink-500",
};
const dateInput = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDate = (value) => new Date(`${value}T00:00:00`);
const mondayOf = (date) => {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return monday;
};
const notificationType = (type) => {
  if (type === "vaccination") return "Vaccination";
  if (type === "medication") return "Medication";
  if (type === "appointment") return "Veterinary appointment";
  return null;
};

export default function Calendar() {
  const {
    user, pets, bookings, calendarEvents, notifications = [],
    createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, showToast,
  } = useApp();
  const now = new Date();
  const today = dateInput(now);
  const [petFilter, setPetFilter] = useState("all");
  const [activeTypes, setActiveTypes] = useState(eventTypes);
  const [focusedDate, setFocusedDate] = useState(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
  const [view, setView] = useState("month");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [form, setForm] = useState({
    petId: pets[0]?.id || "",
    type: "Custom reminder",
    title: "",
    date: today,
    time: "09:00",
    notes: "",
  });

  const events = useMemo(() => {
    const customEvents = calendarEvents.map((event) => ({ ...event, date: event.date?.slice(0, 10) }));
    const vaccineEvents = pets.flatMap((pet) => (pet.vaccines || [])
      .filter((vaccine) => vaccine.next && String(vaccine.petId) === String(pet.id))
      .map((vaccine) => ({
        id: `vaccine-${pet.id}-${vaccine.id}`,
        vaccinationId: vaccine.id,
        petId: pet.id,
        petName: pet.name,
        title: vaccine.name,
        type: "Vaccination",
        date: vaccine.next,
        time: "09:00",
        notes: "Next vaccination date",
        readonly: true,
      })));
    const bookingEvents = bookings
      .filter((booking) => booking.status === "Upcoming")
      .map((booking) => ({
        id: `booking-${booking.id}`,
        petId: booking.pet?.id,
        petName: booking.pet?.name,
        title: booking.provider?.name || "Appointment",
        type: booking.provider?.type === "grooming" ? "Grooming" : booking.provider?.type === "sitting" ? "Pet sitting" : "Veterinary appointment",
        date: booking.date?.slice(0, 10),
        time: booking.time,
        notes: booking.notes || "Upcoming booking",
        readonly: true,
      }));
    const reminderEvents = notifications.flatMap((notification) => {
      const type = notificationType(notification.type);
      if (!type || !notification.date) return [];
      const pet = pets.find((item) => String(item.id) === String(notification.petId));
      return [{
        id: `notification-${notification.id}`,
        petId: notification.petId,
        petName: pet?.name,
        title: notification.title || notification.message || type,
        type,
        date: notification.date.slice(0, 10),
        time: notification.date.includes("T") ? notification.date.slice(11, 16) : "",
        notes: notification.message || "",
        readonly: true,
      }];
    });
    return [...customEvents, ...vaccineEvents, ...bookingEvents, ...reminderEvents]
      .filter((event) => event.date)
      .sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));
  }, [bookings, calendarEvents, notifications, pets]);

  const visibleEvents = events.filter((event) =>
    (petFilter === "all" || String(event.petId) === petFilter) &&
    activeTypes.includes(event.type));
  const eventMap = useMemo(() => visibleEvents.reduce((map, event) => {
    map.set(event.date, [...(map.get(event.date) || []), event]);
    return map;
  }, new Map()), [visibleEvents]);

  const monthTitle = focusedDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const weekStart = mondayOf(focusedDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekTitle = weekStart.getMonth() === weekEnd.getMonth()
    ? `${weekStart.toLocaleDateString(undefined, { month: "long" })} ${weekStart.getDate()}–${weekEnd.getDate()}, ${weekStart.getFullYear()}`
    : `${weekStart.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${weekEnd.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;

  const calendarDates = useMemo(() => {
    if (view === "week") {
      return Array.from({ length: 7 }, (_, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        return date;
      });
    }
    const first = new Date(focusedDate.getFullYear(), focusedDate.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;
    const count = new Date(focusedDate.getFullYear(), focusedDate.getMonth() + 1, 0).getDate();
    const total = Math.ceil((offset + count) / 7) * 7;
    return Array.from({ length: total }, (_, index) => new Date(focusedDate.getFullYear(), focusedDate.getMonth(), index - offset + 1));
  }, [focusedDate, view, weekStart]);

  const moveCalendar = (amount) => {
    setFocusedDate((current) => view === "month"
      ? new Date(current.getFullYear(), current.getMonth() + amount, 1)
      : new Date(current.getFullYear(), current.getMonth(), current.getDate() + amount * 7));
  };
  const openCreate = (date = today) => {
    setEditing(null);
    setForm({ petId: pets[0]?.id || "", type: "Custom reminder", title: "", date, time: "09:00", notes: "" });
    setModalOpen(true);
  };
  const openEdit = (event) => {
    setViewingEvent(null);
    setEditing(event);
    setForm({ petId: event.petId || pets[0]?.id || "", type: event.type, title: event.title, date: event.date, time: event.time || "09:00", notes: event.notes || "" });
    setModalOpen(true);
  };
  const submit = async (event) => {
    event.preventDefault();
    const pet = pets.find((item) => String(item.id) === String(form.petId));
    const record = { ...form, petId: pet?.id, petName: pet?.name };
    if (editing) await updateCalendarEvent(editing.id, record);
    else await createCalendarEvent(record);
    setModalOpen(false);
    showToast(editing ? "Reminder updated." : "Reminder added.");
  };
  const confirmDelete = async () => {
    await deleteCalendarEvent(deleting.id);
    setDeleting(null);
    showToast("Reminder deleted.");
  };
  const toggleType = (type) => setActiveTypes((current) =>
    current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);

  if (!user) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Please log in to view your calendar" description="Your pet reminders and appointments are saved with your account." icon={CalendarDays} action={<Link to="/login" state={{ from: "/calendar" }} className={btn}>Log in</Link>} /></div>;

  return <div className="calendar-layout min-w-0">
    <aside aria-label="Calendar filters" className="calendar-sidebar flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
      <div className="mb-4 border-b border-stone-100 pb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-700">Care schedule</p>
        <h1 className="mt-1 text-xl font-extrabold text-ink-900">My Pets</h1>
        <p className="mt-1 text-xs text-ink-500">Choose pets to filter events</p>
      </div>
      <nav aria-label="Filter calendar by pet" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        <button type="button" aria-pressed={petFilter === "all"} onClick={() => setPetFilter("all")} className={`flex min-w-[150px] items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition lg:min-w-0 ${petFilter === "all" ? "border-primary-200 bg-primary-50 text-primary-900" : "border-transparent text-ink-600 hover:bg-slate-50"}`}>
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-primary-700"><CalendarDays size={17} /></span>
          <span>All Pets</span>
        </button>
        {pets.map((pet) => {
          const selected = petFilter === String(pet.id);
          return <button key={pet.id} type="button" aria-pressed={selected} onClick={() => setPetFilter(selected ? "all" : String(pet.id))} className={`flex min-w-[170px] items-center gap-3 rounded-xl border px-3 py-2 text-left transition lg:min-w-0 ${selected ? "border-primary-200 bg-primary-50 text-primary-900 shadow-sm" : "border-transparent text-ink-700 hover:border-stone-200 hover:bg-slate-50"}`}>
            <PetAvatar name={pet.name} photo={pet.photo} className="size-10 border border-white shadow-sm" iconSize={12} alt={`${pet.name}, ${pet.type}`} />
            <span className="min-w-0"><span className={`block truncate text-sm ${selected ? "font-extrabold" : "font-semibold"}`}>{pet.name}</span><span className="block truncate text-xs text-ink-500">({pet.type})</span></span>
          </button>;
        })}
      </nav>

      <button type="button" onClick={() => openCreate()} className={`${btn} mt-4 min-h-11 w-full justify-center`}><Plus size={17} />Add Event</button>

      <div className="mt-5 border-t border-stone-100 pt-4 lg:mt-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-ink-500">Event Types</h2>
          <button type="button" onClick={() => setActiveTypes(activeTypes.length === eventTypes.length ? [] : eventTypes)} className="text-[11px] font-semibold text-primary-700 hover:text-primary-800">{activeTypes.length === eventTypes.length ? "Clear" : "All"}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {eventTypes.map((type) => {
            const enabled = activeTypes.includes(type);
            return <button key={type} type="button" aria-pressed={enabled} onClick={() => toggleType(type)} className={`flex min-h-9 items-center gap-2 rounded-lg px-2 text-left text-xs font-semibold transition ${enabled ? "text-ink-700 hover:bg-slate-50" : "text-ink-400 line-through hover:bg-slate-50"}`}>
              <span className={`size-2.5 shrink-0 rounded-full ${enabled ? eventDotStyles[type] : "bg-stone-300"}`} />
              {type === "Veterinary appointment" ? "Veterinary" : type === "Pet sitting" ? "Pet Sitting" : type === "Custom reminder" ? "Custom" : type}
            </button>;
          })}
        </div>
      </div>
    </aside>

    <section className="calendar-main min-w-0">
      <header className="mb-4 flex min-w-0 flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => setFocusedDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()))} className={`${btn2} min-h-10 px-4`}>Today</button>
          <div className="flex items-center gap-1">
            <button type="button" aria-label={view === "month" ? "Previous month" : "Previous week"} onClick={() => moveCalendar(-1)} className="grid size-10 place-items-center rounded-xl border border-stone-200 text-ink-600 transition hover:bg-slate-50 hover:text-primary-700"><ChevronLeft size={19} /></button>
            <button type="button" aria-label={view === "month" ? "Next month" : "Next week"} onClick={() => moveCalendar(1)} className="grid size-10 place-items-center rounded-xl border border-stone-200 text-ink-600 transition hover:bg-slate-50 hover:text-primary-700"><ChevronRight size={19} /></button>
          </div>
          <h2 className="ms-1 min-w-0 text-xl font-extrabold tracking-tight text-ink-900 sm:ms-3 sm:text-2xl">{view === "month" ? monthTitle : weekTitle}</h2>
        </div>
        <div role="group" aria-label="Calendar view" className="flex self-start rounded-xl bg-slate-100 p-1 sm:self-auto">
          {["month", "week"].map((option) => <button key={option} type="button" aria-pressed={view === option} onClick={() => setView(option)} className={`min-h-9 rounded-lg px-4 text-sm font-bold capitalize transition ${view === option ? "bg-primary-600 text-white shadow-sm" : "text-ink-600 hover:bg-white hover:text-ink-900"}`}>{option}</button>)}
        </div>
      </header>

      <section aria-label={view === "month" ? "Monthly calendar" : "Weekly calendar"} className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <div className="min-w-[760px] lg:min-w-0">
            <div className="grid grid-cols-7 border-b border-stone-200 bg-slate-50 text-center text-xs font-bold text-ink-500">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => <div key={day} className="py-3">{day}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {calendarDates.map((date) => {
                const key = dateInput(date);
                const dayEvents = eventMap.get(key) || [];
                const inCurrentMonth = date.getMonth() === focusedDate.getMonth();
                const isToday = key === today;
                return <div key={key} className={`group flex min-h-[118px] min-w-0 flex-col border-b border-r border-stone-200 p-2 transition-colors last:border-r-0 sm:min-h-[132px] ${inCurrentMonth || view === "week" ? "bg-white" : "bg-slate-50/70"} hover:bg-slate-50`}>
                  <div className="flex min-h-7 items-center justify-between gap-1">
                    <span className={`inline-flex min-w-7 items-center justify-center rounded-full px-1.5 py-1 text-xs font-bold ${isToday ? "bg-primary-600 text-white" : inCurrentMonth || view === "week" ? "text-ink-700" : "text-ink-400"}`}>{date.getDate()}</span>
                    <button type="button" aria-label={`Add event on ${date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}`} onClick={() => openCreate(key)} className="grid size-7 shrink-0 place-items-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-700 focus-visible:bg-primary-50 focus-visible:text-primary-700 sm:opacity-0 sm:group-hover:opacity-100"><Plus size={15} /></button>
                  </div>
                  <div className="mt-1.5 min-w-0 flex-1 space-y-1">
                    {dayEvents.slice(0, 3).map((event) => <button key={`${event.id}-${key}`} type="button" title={`${event.title}${event.petName ? ` · ${event.petName}` : ""}`} onClick={() => event.readonly ? setViewingEvent(event) : openEdit(event)} className={`flex w-full min-w-0 items-center gap-1.5 overflow-hidden rounded-md border px-1.5 py-1 text-left text-[10px] font-semibold leading-4 transition hover:brightness-[0.98] sm:text-[11px] ${eventStyles[event.type] || eventStyles["Custom reminder"]}`}>
                      <span className={`size-1.5 shrink-0 rounded-full ${eventDotStyles[event.type] || eventDotStyles["Custom reminder"]}`} />
                      <span className="truncate">{event.time ? `${event.time} ` : ""}{event.title}</span>
                    </button>)}
                    {dayEvents.length > 3 && <button type="button" onClick={() => { setFocusedDate(date); setView("week"); }} className="px-1 text-[10px] font-bold text-primary-700 hover:underline">+{dayEvents.length - 3} more</button>}
                  </div>
                </div>;
              })}
            </div>
          </div>
        </div>
      </section>
      <p className="mt-3 flex items-center gap-2 text-xs text-ink-500"><Clock3 size={14} />Select an event to view or edit its details. Calendar reminders use your current pet, vaccination, and booking data.</p>
    </section>

    <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? "Edit event" : "Add event or reminder"}>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-xs font-bold">Pet<select required className={`${input} mt-2`} value={form.petId} onChange={(event) => setForm((value) => ({ ...value, petId: event.target.value }))}>{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}</select></label>
        <label className="block text-xs font-bold">Event type<select className={`${input} mt-2`} value={form.type} onChange={(event) => setForm((value) => ({ ...value, type: event.target.value }))}>{eventTypes.map((type) => <option key={type}>{type}</option>)}</select></label>
        <label className="block text-xs font-bold">Title<input required className={`${input} mt-2`} value={form.title} onChange={(event) => setForm((value) => ({ ...value, title: event.target.value }))} /></label>
        <div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-bold">Date<input required type="date" className={`${input} mt-2`} value={form.date} onChange={(event) => setForm((value) => ({ ...value, date: event.target.value }))} /></label><label className="block text-xs font-bold">Time<input type="time" className={`${input} mt-2`} value={form.time} onChange={(event) => setForm((value) => ({ ...value, time: event.target.value }))} /></label></div>
        <label className="block text-xs font-bold">Notes<textarea rows="3" className={`${input} mt-2`} value={form.notes} onChange={(event) => setForm((value) => ({ ...value, notes: event.target.value }))} /></label>
        <div className="flex flex-wrap justify-between gap-2">
          {editing && <Button type="button" variant="danger" onClick={() => { setModalOpen(false); setDeleting(editing); }}><Trash2 size={15} />Delete event</Button>}
          <Button type="submit" disabled={!pets.length} className="ms-auto">{editing ? "Save changes" : "Add event"}</Button>
        </div>
      </form>
    </Modal>
    <Modal open={Boolean(viewingEvent)} onClose={() => setViewingEvent(null)} title={viewingEvent?.title || "Calendar event"}>
      {viewingEvent && <div className="space-y-3 text-sm text-ink-600"><p><b className="text-ink-900">Type:</b> {viewingEvent.type}</p>{viewingEvent.petName && <p><b className="text-ink-900">Pet:</b> {viewingEvent.petName}</p>}<p><b className="text-ink-900">Date:</b> {viewingEvent.date}{viewingEvent.time ? ` · ${viewingEvent.time}` : ""}</p>{viewingEvent.notes && <p><b className="text-ink-900">Notes:</b> {viewingEvent.notes}</p>}<p className="text-xs text-ink-500">This event is generated from existing pet or booking records.</p></div>}
    </Modal>
    <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete this reminder?"><p className="text-sm text-ink-500">This event will be removed from your calendar.</p><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeleting(null)}>Keep event</Button><Button type="button" variant="danger" onClick={confirmDelete}><Trash2 size={15} />Delete event</Button></div></Modal>
  </div>;
}
