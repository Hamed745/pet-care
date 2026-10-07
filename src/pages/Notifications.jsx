import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CalendarDays, Check, Heart, PackageCheck, PawPrint, Pill, Trash2 } from "lucide-react";
import { useApp } from "../store.jsx";
import { btn } from "../ui.js";
import { EmptyState } from "../components/ui.jsx";

const notificationCategories = [
  { id: "reminders", label: "Reminders", types: ["vaccination", "medication"] },
  { id: "bookings", label: "Bookings", types: ["appointment", "booking"] },
  { id: "orders", label: "Orders", types: ["order"] },
  { id: "adoption", label: "Adoption", types: ["adoption"] },
  { id: "lostFound", label: "Lost & Found", types: ["lostFound", "lost-found"] },
];

const notificationIcon = {
  vaccination: CalendarDays,
  medication: Pill,
  appointment: CalendarDays,
  booking: CalendarDays,
  order: PackageCheck,
  adoption: Heart,
  lostFound: PawPrint,
  "lost-found": PawPrint,
};

const notificationIconStyles = {
  vaccination: "bg-emerald-50 text-emerald-700",
  medication: "bg-rose-50 text-rose-700",
  appointment: "bg-amber-50 text-amber-700",
  booking: "bg-amber-50 text-amber-700",
  order: "bg-violet-50 text-violet-700",
  adoption: "bg-rose-50 text-rose-700",
  lostFound: "bg-primary-50 text-primary-700",
  "lost-found": "bg-primary-50 text-primary-700",
};

function notificationHref(item, petIds) {
  const explicitPath = item.href || item.path || item.link;
  if (typeof explicitPath === "string" && explicitPath.startsWith("/")) return explicitPath;
  if (["vaccination", "medication"].includes(item.type)) {
    return item.petId && petIds.has(String(item.petId)) ? `/pets/${item.petId}` : "/calendar";
  }
  if (["appointment", "booking"].includes(item.type)) return "/bookings";
  if (item.type === "order") return item.orderId ? `/orders/${item.orderId}` : "/orders";
  if (item.type === "adoption") return item.listingId ? `/adoption/${item.listingId}` : "/adoption";
  if (["lostFound", "lost-found"].includes(item.type)) return "/lost-found";
  return null;
}

function formatRelativeDate(value) {
  if (!value) return "";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "";
  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000);
  const units = [
    ["year", 60 * 60 * 24 * 365],
    ["month", 60 * 60 * 24 * 30],
    ["day", 60 * 60 * 24],
    ["hour", 60 * 60],
    ["minute", 60],
  ];
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  for (const [unit, seconds] of units) {
    if (Math.abs(deltaSeconds) >= seconds) return formatter.format(Math.round(deltaSeconds / seconds), unit);
  }
  return formatter.format(deltaSeconds, "second");
}

export default function Notifications() {
  const { user, notifications, pets, markNotificationRead, markAllNotificationsRead, deleteNotification } = useApp();
  const [activeFilter, setActiveFilter] = useState("all");
  const items = notifications || [];
  const unreadCount = items.filter((item) => !item.read).length;
  const petNames = new Map(pets.map((pet) => [String(pet.id), pet.name]));
  const petIds = new Set(pets.map((pet) => String(pet.id)));
  const availableCategories = notificationCategories.filter((category) =>
    items.some((item) => category.types.includes(item.type)));
  const sortedItems = useMemo(() => [...items].sort((a, b) => {
    const aTime = new Date(a.date || 0).getTime();
    const bTime = new Date(b.date || 0).getTime();
    return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
  }), [items]);
  const filteredItems = sortedItems.filter((item) => {
    if (activeFilter === "unread") return !item.read;
    if (activeFilter === "all") return true;
    const category = availableCategories.find((entry) => entry.id === activeFilter);
    return category?.types.includes(item.type) || false;
  });

  if (!user) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Please log in to view notifications" description="Pet reminders and updates will appear here." icon={Bell} action={<Link to="/login" state={{ from: "/notifications" }} className={btn}>Log in</Link>} /></div>;

  const filters = [
    { id: "all", label: "All" },
    { id: "unread", label: "Unread", count: unreadCount },
    ...availableCategories.map(({ id, label }) => ({ id, label })),
  ];

  return <div className="min-w-0">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Updates for you</p>
        <h1 className="mt-2 text-3xl font-extrabold text-ink-900">Notifications</h1>
        <p className="mt-2 text-sm text-ink-500">Stay updated on your pets, bookings, orders, and community activity.</p>
      </div>
      <button type="button" disabled={!unreadCount} onClick={markAllNotificationsRead} className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-50">
        <Check size={16} />Mark all as read
      </button>
    </header>

    <nav aria-label="Notification filters" className="-mx-1 mb-4 overflow-x-auto px-1 pb-1">
      <div role="tablist" className="flex min-w-max gap-2">
        {filters.map((filter) => <button key={filter.id} type="button" role="tab" aria-selected={activeFilter === filter.id} onClick={() => setActiveFilter(filter.id)} className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3.5 text-sm font-semibold transition ${activeFilter === filter.id ? "border-primary-200 bg-primary-50 text-primary-800" : "border-stone-200 bg-white text-ink-600 hover:border-stone-300 hover:bg-stone-50"}`}>
          {filter.label}
          {filter.id === "unread" && <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${activeFilter === "unread" ? "bg-primary-100 text-primary-800" : "bg-stone-100 text-ink-600"}`}>{filter.count}</span>}
        </button>)}
      </div>
    </nav>

    {filteredItems.length ? <section aria-label="Notification inbox" className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
      {filteredItems.map((item) => {
        const Icon = notificationIcon[item.type] || Bell;
        const destination = notificationHref(item, petIds);
        const relativeTime = formatRelativeDate(item.date);
        const details = <>
          <span aria-hidden="true" className={`grid size-9 shrink-0 place-items-center rounded-full ${notificationIconStyles[item.type] || "bg-slate-100 text-ink-600"}`}><Icon size={17} /></span>
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm font-bold text-ink-900">{item.title}</span>
              {item.petId && petNames.has(String(item.petId)) && <span className="hidden shrink-0 text-xs text-ink-500 sm:inline">{petNames.get(String(item.petId))}</span>}
            </span>
            {item.message && <span className="mt-1 block truncate text-sm text-ink-500">{item.message}</span>}
            {relativeTime && <time dateTime={item.date || undefined} className="mt-1 block text-[11px] font-medium text-ink-500 sm:hidden">{relativeTime}</time>}
          </span>
        </>;
        return <article key={item.id} className={`flex min-w-0 items-center gap-3 border-b border-stone-100 p-4 last:border-b-0 sm:gap-4 sm:px-5 ${item.read ? "bg-white" : "bg-primary-50/30"}`}>
          {destination ? <Link to={destination} onClick={() => { if (!item.read) markNotificationRead(item.id); }} aria-label={`${item.title}${item.message ? `: ${item.message}` : ""}`} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left focus-visible:outline-primary-500 sm:gap-4">{details}</Link>
            : <button type="button" onClick={() => { if (!item.read) markNotificationRead(item.id); }} className="flex min-w-0 flex-1 items-center gap-3 rounded-lg text-left sm:gap-4">{details}</button>}
          {relativeTime && <time dateTime={item.date || undefined} className="hidden max-w-[90px] shrink-0 text-right text-xs font-medium text-ink-500 sm:block sm:max-w-none">{relativeTime}</time>}
          {!item.read && <span aria-label="Unread" title="Unread" className="size-2 shrink-0 rounded-full bg-primary-600" />}
          <div className="flex shrink-0 items-center">
            {!item.read && <button type="button" aria-label={`Mark ${item.title} as read`} onClick={() => markNotificationRead(item.id)} className="grid size-8 place-items-center rounded-lg text-ink-400 transition hover:bg-primary-50 hover:text-primary-700"><Check size={15} /></button>}
            <button type="button" aria-label={`Delete ${item.title}`} onClick={() => deleteNotification(item.id)} className="grid size-8 place-items-center rounded-lg text-ink-400 transition hover:bg-red-50 hover:text-danger-600"><Trash2 size={15} /></button>
          </div>
        </article>;
      })}
    </section> : <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-5 py-14 text-center">
      <span className="mx-auto grid size-11 place-items-center rounded-full bg-primary-50 text-primary-700"><Bell size={20} /></span>
      <h2 className="mt-3 text-base font-bold text-ink-900">{activeFilter === "unread" ? "You're all caught up." : "No notifications here."}</h2>
      <p className="mt-1 text-sm text-ink-500">{activeFilter === "unread" ? "You have no unread notifications." : "Try another filter or check back later."}</p>
    </div>}
  </div>;
}
