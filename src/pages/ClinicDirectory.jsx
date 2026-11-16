import { useEffect, useMemo, useRef, useState } from "react";
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
  const requestId = useRef(crypto.randomUUID());
  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try {
      const pet = pets.find((item) => String(item.id) === form.petId);
      if (!pet) throw new Error("Choose one of your pets.");
      await clinicApi.syncPet(pet);
      await clinicApi.book(clinic.id, { ...form, requestId: requestId.current });
      requestId.current = crypto.randomUUID();
      onBooked();
    }
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
  const [governorate, setGovernorate] = useState("");
  const [city, setCity] = useState("");
  const [serviceName, setServiceName] = useState("");
  const [active, setActive] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState("");
  const refresh = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const [results, mine] = await Promise.all([clinicApi.list(), user ? clinicApi.myBookings() : Promise.resolve({ appointments: [] })]);
      setClinics(results.clinics); setBookings(mine.appointments);
    } catch (err) { setError(err.message || "Unable to load clinics."); }
    finally { if (!silent) setLoading(false); }
  };
  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => refresh(true), 60000);
    return () => window.clearInterval(timer);
  }, [user?.uid]);
  const governorates = useMemo(() => [...new Set(clinics.map((clinic) => clinic.governorate).filter(Boolean))].sort(), [clinics]);
  const cities = useMemo(() => [...new Set(clinics.filter((clinic) => !governorate || clinic.governorate === governorate)
    .map((clinic) => clinic.city).filter(Boolean))].sort(), [clinics, governorate]);
  const services = useMemo(() => [...new Set(clinics.flatMap((clinic) => clinic.services.map((service) => service.name)).filter(Boolean))].sort(), [clinics]);
  const filtered = useMemo(() => clinics.filter((clinic) =>
    `${clinic.name} ${clinic.city} ${clinic.governorate} ${clinic.address} ${clinic.description}`.toLowerCase().includes(search.trim().toLowerCase()) &&
    (!governorate || clinic.governorate === governorate) &&
    (!city || clinic.city === city) &&
    (!serviceName || clinic.services.some((service) => service.name === serviceName))
  ), [clinics, search, governorate, city, serviceName]);
  const ownedPets = useMemo(() => pets.filter((pet) => pet.ownerUid === user?.uid), [pets, user?.uid]);
  const cancel = async (id) => {
    setBusy(id);
    try { await clinicApi.cancelBooking(id); await refresh(); }
    catch (err) { setError(err.message); }
    finally { setBusy(""); }
  };
  return <div className="space-y-6 py-5">
    <PageHeader eyebrow={tr("Verified PetCare partners", "Проверенные партнёры PetCare")} title={tr("Our Veterinary Clinics", "Наши ветеринарные клиники")} description={tr("Book directly with approved PetCare clinics. For external 2GIS results, use the Public Services directory.", "Запись доступна только в клиники, проверенные PetCare. Внешние организации 2ГИС находятся в общем каталоге.")} />
    <nav className="grid grid-cols-2 gap-3"><Link className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white p-4 text-sm font-semibold" to="/nearby/veterinary"><MapPin className="text-primary-700"/>{tr("Public directory (2GIS)", "Общий каталог (2ГИС)")}</Link><div className="flex items-center gap-3 rounded-2xl border border-primary-700 bg-primary-50 p-4 text-sm font-extrabold"><ShieldCheck className="text-primary-700"/>{tr("Our verified clinics", "Наши проверенные клиники")}</div></nav>
    {notice && <p role="status" className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-900">{notice}</p>}
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_repeat(3,minmax(150px,auto))_auto]">
      <label className="min-w-0"><span className="sr-only">{tr("Search registered clinics", "Поиск клиник")}</span><input className="w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tr("Search clinic, city or address…", "Поиск клиники, города или адреса…")}/></label>
      <Select label={tr("Governorate", "Губернаторство")} value={governorate} onChange={(event) => { setGovernorate(event.target.value); setCity(""); }}><option value="">{tr("All governorates", "Все губернаторства")}</option>{governorates.map((item) => <option key={item}>{item}</option>)}</Select>
      <Select label={tr("City", "Город")} value={city} onChange={(event) => setCity(event.target.value)}><option value="">{tr("All cities", "Все города")}</option>{cities.map((item) => <option key={item}>{item}</option>)}</Select>
      <Select label={tr("Service", "Услуга")} value={serviceName} onChange={(event) => setServiceName(event.target.value)}><option value="">{tr("All services", "Все услуги")}</option>{services.map((item) => <option key={item}>{item}</option>)}</Select>
      <Button variant="secondary" type="button" onClick={refresh}><RefreshCw size={16}/> {tr("Refresh", "Обновить")}</Button>
    </div>
    {loading && <p role="status" className="text-sm text-ink-500">{tr("Loading clinics…", "Загрузка клиник…")}</p>}
    {!loading && !filtered.length && <Card className="py-12 text-center"><Building2 size={32} className="mx-auto text-primary-700"/><h2 className="mt-3 text-lg font-extrabold">{tr("No verified clinics found yet", "Проверенных клиник пока нет")}</h2><p className="mt-2 text-sm text-ink-500">{tr("Approved PetCare clinics will appear here automatically.", "Одобренные клиники PetCare появятся здесь автоматически.")}</p></Card>}
    <div className="grid gap-4 lg:grid-cols-2">
      {filtered.map((clinic) => <Card key={clinic.id} className="flex flex-col gap-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-primary-50 p-3 text-primary-700"><Stethoscope size={23}/></span>
            <div>
              <h2 className="text-lg font-extrabold">{clinic.name}</h2>
              <p className="mt-1 flex items-center gap-1 text-xs text-ink-600"><MapPin size={14}/>{clinic.address}, {clinic.city}</p>
            </div>
          </div>
          <Badge variant="success"><ShieldCheck size={13} className="mr-1 inline"/>Verified</Badge>
        </div>
        <p className="text-sm text-ink-600">{clinic.description || "Veterinary care from an approved PetCare clinic."}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-ink-600">
          <span>{clinic.phone} · {clinic.governorate}</span>
          {Number.isFinite(clinic.latitude) && Number.isFinite(clinic.longitude) && <a className="font-bold text-primary-700 underline" href={`https://maps.google.com/?q=${clinic.latitude},${clinic.longitude}`} target="_blank" rel="noreferrer">{tr("View location on map", "Посмотреть на карте")}</a>}
        </div>
        {clinic.workingHours && <p className="text-xs text-ink-600">{tr("Open", "Открыто")}: {clinic.workingHours.open}–{clinic.workingHours.close} · {clinic.workingHours.days.map((day) => ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][day]).join(", ")}</p>}
        <div className="space-y-2">
          {clinic.services.map((service) => <p key={service.id} className="flex justify-between gap-2 border-b border-stone-100 pb-2 text-sm"><span>{service.name} · {service.durationMinutes} min</span><strong>{service.price} EGP</strong></p>)}
        </div>
        <div className="mt-auto">
          {!clinic.services.length
            ? <p className="text-xs text-ink-500">{tr("This clinic hasn't published bookable services yet.", "Клиника пока не добавила услуги для записи.")}</p>
            : !clinic.workingHours
              ? <p className="text-xs text-ink-500">{tr("Clinic availability is not configured.", "Расписание клиники не настроено.")}</p>
              : user
                ? <Button variant="secondary" onClick={() => setActive(active === clinic.id ? "" : clinic.id)}><CalendarDays size={16}/>{active === clinic.id ? tr("Close", "Закрыть") : tr("Book a visit", "Записаться")}</Button>
                : <Link className="text-sm font-bold text-primary-700 underline" to="/login" state={{ from: "/nearby/our/veterinary" }}>{tr("Sign in to book", "Войдите для записи")}</Link>}
          {active === clinic.id && user && <BookingForm clinic={clinic} pets={ownedPets} onBooked={() => { setActive(""); setNotice(tr("Request sent. Waiting for clinic approval.", "Запрос отправлен и ожидает подтверждения клиникой.")); refresh(); }}/>}
        </div>
      </Card>)}
    </div>
    {user && <Card className="space-y-3"><h2 className="text-lg font-extrabold">Your PetCare clinic appointments</h2>{!bookings.length ? <p className="text-sm text-ink-500">No clinic booking requests yet.</p> : bookings.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 p-3"><div><strong className="text-sm">{item.clinicName} · {item.petName}</strong><p className="text-xs text-ink-600">{item.serviceName} · {item.date} {item.time} · {item.status}</p></div>{["pending","confirmed"].includes(item.status) && <Button size="sm" variant="secondary" disabled={busy === item.id} onClick={() => cancel(item.id)}>Cancel request</Button>}</div>)}</Card>}
  </div>;
}
