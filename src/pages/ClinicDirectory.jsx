import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CalendarDays, MapPin, RefreshCw, ShieldCheck, Stethoscope } from "lucide-react";
import { useApp } from "../store.jsx";
import { clinicApi } from "../services/clinicApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { Badge, Button, Card, Input, PageHeader, Select, Textarea } from "../components/ui.jsx";

function BookingForm({ clinic, pets, onBooked }) {
  const [form, setForm] = useState({ petId: "", serviceId: "", date: "", time: "", notes: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await clinicApi.book(clinic.id, form); onBooked(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const edit = (key) => (event) => setForm((old) => ({ ...old, [key]: event.target.value }));
  const todayParts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const todayValues = Object.fromEntries(todayParts.map(({ type, value }) => [type, value]));
  const today = `${todayValues.year}-${todayValues.month}-${todayValues.day}`;
  return <form onSubmit={submit} className="mt-4 grid gap-3 rounded-xl bg-primary-50/50 p-4 sm:grid-cols-2">
    {!pets.length ? <p className="text-sm text-amber-900 sm:col-span-2">Add a pet to your profile before requesting an appointment. <Link className="font-bold underline" to="/pets/new">Add a pet</Link></p> : <>
      <Select required label="Your pet" value={form.petId} onChange={edit("petId")}><option value="">Choose a pet</option>{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name}</option>)}</Select>
      <Select required label="Clinic service" value={form.serviceId} onChange={edit("serviceId")}><option value="">Choose a service</option>{clinic.services.map((service) => <option key={service.id} value={service.id}>{service.name} · {service.price} EGP</option>)}</Select>
      <Input required type="date" min={today} label="Appointment date" value={form.date} onChange={edit("date")}/>
      <Input required type="time" label="Preferred time (Egypt time)" value={form.time} onChange={edit("time")}/>
      <div className="sm:col-span-2"><Textarea label="Notes (optional)" rows={2} maxLength={500} value={form.notes} onChange={edit("notes")}/></div>
      <p className="text-xs leading-5 text-ink-600 sm:col-span-2">Your appointment is a request. The clinic manager must approve it before it is confirmed. No payment is collected.</p>
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2"><Button type="submit" loading={busy}>Request appointment</Button></div>
    </>}
  </form>;
}

export default function ClinicDirectory() {
  const { user, pets } = useApp();
  const { isRussian } = useLanguage();
  const tr = (en, ru) => isRussian ? ru : en;
  const [clinics, setClinics] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const refresh = async () => {
    setLoading(true); setError("");
    try {
      const [results, mine] = await Promise.all([clinicApi.list(), user ? clinicApi.myBookings() : Promise.resolve({ appointments: [] })]);
      setClinics(results.clinics); setBookings(mine.appointments);
    } catch (err) { setError(err.message || "Unable to load clinics."); }
    finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, [user?.uid]);
  const filtered = useMemo(() => clinics.filter((clinic) =>
    `${clinic.name} ${clinic.city} ${clinic.governorate} ${clinic.address} ${clinic.description}`.toLowerCase().includes(search.trim().toLowerCase())
  ), [clinics, search]);
  const ownedPets = useMemo(() => pets.filter((pet) => pet.ownerUid === user?.uid), [pets, user?.uid]);
  const cancel = async (id) => {
    setBusy(id);
    try { await clinicApi.cancelBooking(id); await refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(""); }
  };
  return <div className="space-y-6 py-5">
    <PageHeader eyebrow={tr("Verified PetCare partners", "Проверенные партнёры PetCare")} title={tr("Our Veterinary Clinics", "Наши ветеринарные клиники")} description={tr("Book directly with approved PetCare clinics. For external 2GIS results, use the Public Services directory.", "Запись доступна только в клиники, проверенные PetCare. Внешние организации 2ГИС находятся в общем каталоге.")} action={<Link to="/clinic" className="inline-flex rounded-xl bg-primary-600 px-4 py-3 text-sm font-bold text-white">{tr("Register your clinic", "Зарегистрировать клинику")}</Link>}/>
    <nav className="grid grid-cols-2 gap-3"><Link className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm font-semibold" to="/nearby/veterinary"><MapPin className="text-primary-700"/>{tr("Public directory (2GIS)", "Общий каталог (2ГИС)")}</Link><div className="flex items-center gap-3 rounded-2xl border border-primary-700 bg-primary-50 p-4 text-sm font-extrabold"><ShieldCheck className="text-primary-700"/>{tr("Our verified clinics", "Наши проверенные клиники")}</div></nav>
    {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-900">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <div className="flex flex-wrap items-center gap-3"><label className="min-w-[220px] flex-1"><span className="sr-only">Search registered clinics</span><input className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tr("Search clinic, city or address…", "Поиск клиники, города или адреса…")}/></label><Button variant="secondary" type="button" onClick={refresh}><RefreshCw size={16}/> {tr("Refresh", "Обновить")}</Button></div>
    {loading && <p role="status" className="text-sm text-ink-500">{tr("Loading clinics…", "Загрузка клиник…")}</p>}
    {!loading && !filtered.length && <Card className="py-12 text-center"><Building2 size={32} className="mx-auto text-primary-700"/><h2 className="mt-3 text-lg font-extrabold">{tr("No verified clinics found yet", "Проверенных клиник пока нет")}</h2><p className="mt-2 text-sm text-ink-500">{tr("Clinic managers can register, and approved clinics will appear here automatically.", "Руководитель клиники может отправить заявку. После одобрения клиника появится здесь.")}</p></Card>}
    <div className="grid gap-4 lg:grid-cols-2">{filtered.map((clinic) => <Card key={clinic.id} className="flex flex-col gap-3"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="rounded-xl bg-primary-50 p-3 text-primary-700"><Stethoscope size={23}/></span><div><h2 className="text-lg font-extrabold">{clinic.name}</h2><p className="mt-1 flex items-center gap-1 text-xs text-ink-600"><MapPin size={14}/>{clinic.address}, {clinic.city}</p></div></div><Badge variant="success"><ShieldCheck size={13} className="mr-1 inline"/>Verified</Badge></div><p className="text-sm text-ink-600">{clinic.description || "Veterinary care from an approved PetCare clinic."}</p><div className="text-xs font-medium text-ink-600">{clinic.phone} · {clinic.governorate}</div><div className="space-y-2">{clinic.services.map((service) => <p key={service.id} className="flex justify-between gap-2 border-b border-stone-100 pb-2 text-sm"><span>{service.name} · {service.durationMinutes} min</span><strong>{service.price} EGP</strong></p>)}</div><div className="mt-auto">{clinic.services.length ? user ? <Button variant="secondary" onClick={() => setActive(active === clinic.id ? "" : clinic.id)}><CalendarDays size={16}/>{active === clinic.id ? "Close" : "Book a visit"}</Button> : <Link className="text-sm font-bold text-primary-700 underline" to="/login" state={{ from: "/nearby/our/veterinary" }}>Sign in to book</Link> : <p className="text-xs text-ink-500">This clinic hasn't published bookable services yet.</p>}{active === clinic.id && user && <BookingForm clinic={clinic} pets={ownedPets} onBooked={() => { setActive(""); setNotice("Request sent. Waiting for clinic approval."); refresh(); }}/>}</div></Card>)}</div>
    {user && <Card className="space-y-3"><h2 className="text-lg font-extrabold">Your PetCare clinic appointments</h2>{!bookings.length ? <p className="text-sm text-ink-500">No clinic booking requests yet.</p> : bookings.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 p-3"><div><strong className="text-sm">{item.clinicName} · {item.petName}</strong><p className="text-xs text-ink-600">{item.serviceName} · {item.date} {item.time} · {item.status}</p></div>{["pending","confirmed"].includes(item.status) && <Button size="sm" variant="secondary" disabled={busy === item.id} onClick={() => cancel(item.id)}>Cancel request</Button>}</div>)}</Card>}
  </div>;
}
