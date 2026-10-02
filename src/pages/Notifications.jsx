import { Link } from "react-router-dom";
import { Bell, CalendarDays, Check, Heart, PackageCheck, PawPrint, Pill, Trash2 } from "lucide-react";
import { useApp } from "../store.jsx";
import { btn, btn2, card } from "../ui.js";
import { Badge, EmptyState } from "../components/ui.jsx";

const notificationIcon = { vaccination: CalendarDays, medication: Pill, appointment: CalendarDays, order: PackageCheck, adoption: Heart, lostFound: PawPrint };
export default function Notifications() {
  const { user, notifications, pets, markNotificationRead, markAllNotificationsRead, deleteNotification } = useApp();
  const items = notifications;
  const unreadCount = items.filter((item) => !item.read).length;
  const petNames = new Map(pets.map((pet) => [String(pet.id), pet.name]));
  if (!user) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Please log in to view notifications" description="Pet reminders and updates will appear here." icon={Bell} action={<Link to="/login" state={{ from: "/notifications" }} className={btn}>Log in</Link>} /></div>;
  return <div><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Updates for you</p><h1 className="mt-2 text-3xl font-extrabold">Notifications</h1><p className="mt-2 text-sm text-ink-500">{unreadCount ? `${unreadCount} unread` : "You are all caught up."}</p></div><button type="button" disabled={!unreadCount} onClick={markAllNotificationsRead} className={btn2}><Check size={16} /> Mark all as read</button></header>
    {items.length ? <div className="space-y-3">{items.map((item) => { const Icon = notificationIcon[item.type] || Bell; return <article key={item.id} className={`${card} flex items-start gap-4 ${item.read ? "opacity-75" : "border-primary-200"}`}><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700"><Icon size={19} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-extrabold">{item.title}</h2>{!item.read && <Badge variant="warning">New</Badge>}</div><p className="mt-1 text-sm leading-6 text-ink-500">{item.message}</p><p className="mt-2 text-xs text-ink-500">{new Date(item.date).toLocaleString()}{item.petId && petNames.has(String(item.petId)) ? ` · ${petNames.get(String(item.petId))}` : ""}</p></div><div className="flex shrink-0 gap-1">{!item.read && <button type="button" aria-label={`Mark ${item.title} as read`} onClick={() => markNotificationRead(item.id)} className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-primary-50 hover:text-primary-700"><Check size={16} /></button>}<button type="button" aria-label={`Delete ${item.title}`} onClick={() => deleteNotification(item.id)} className="grid size-9 place-items-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-danger-600"><Trash2 size={16} /></button></div></article>; })}</div> : <EmptyState title="No notifications yet" description="Reminders and updates will appear here when available." icon={Bell} action={<Link to="/calendar" className={btn}>Open calendar</Link>} />}
  </div>;
}
