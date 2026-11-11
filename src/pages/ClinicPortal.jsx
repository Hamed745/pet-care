import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CalendarCheck2, CheckCircle2, ClipboardCheck, Clock3, FileCheck2, RefreshCw, ShieldCheck, Stethoscope } from "lucide-react";
import { useApp } from "../store.jsx";
import { clinicApi } from "../services/clinicApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { Button, Card, Input, PageHeader, Textarea } from "../components/ui.jsx";

const EMPTY = { name: "", governorate: "", city: "", address: "", phone: "", email: "", description: "", clinicLicenseNumber: "", responsibleVetName: "", responsibleVetLicenseNumber: "" };
const DOCUMENTS = [
  ["clinic_license", "Clinic license"], ["manager_id", "Manager identity document"], ["vet_license", "Responsible veterinarian's license"],
];
const GOVERNORATES = ["Alexandria", "Aswan", "Asyut", "Beheira", "Beni Suef", "Cairo", "Dakahlia", "Damietta", "Faiyum", "Gharbia", "Giza", "Ismailia", "Kafr El Sheikh", "Luxor", "Matrouh", "Minya", "Monufia", "New Valley", "North Sinai", "Port Said", "Qalyubia", "Qena", "Red Sea", "Sharqia", "Sohag", "South Sinai", "Suez"];

function ClinicApplication({ current, onSaved }) {
  const { isRussian } = useLanguage();
  const [form, setForm] = useState(() => ({ ...EMPTY, ...current }));
  const [files, setFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const label = (en, ru) => isRussian ? ru : en;
  const edit = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const readImage = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read document image."));
    reader.readAsDataURL(file);
  });
  const submit = async (event) => {
    event.preventDefault(); setError("");
    try {
      for (const [kind] of DOCUMENTS) {
        if (!files[kind]) throw new Error("Please attach all three verification documents.");
        if (!(["image/jpeg", "image/png", "image/webp"].includes(files[kind].type)) || files[kind].size > 190000) {
          throw new Error("Each document must be a JPG, PNG or WebP image smaller than 190 KB.");
        }
      }
      setSaving(true);
      const documents = Object.fromEntries(await Promise.all(DOCUMENTS.map(async ([kind]) => [kind, await readImage(files[kind])])));
      const result = await clinicApi.apply(form, documents);
      onSaved(result.clinic);
    } catch (err) { setError(err.message || "Unable to submit application."); }
    finally { setSaving(false); }
  };
  return <Card className="max-w-4xl p-6 sm:p-8">
    <div className="mb-6 flex items-center gap-3"><span className="rounded-xl bg-primary-50 p-3 text-primary-700"><Building2 size={23} /></span><div><h2 className="text-xl font-extrabold">{label("Register your veterinary clinic", "Регистрация ветеринарной клиники")}</h2><p className="text-sm text-ink-500">{label("One independent manager account per clinic branch. The PetCare team reviews every application.", "Один ответственный менеджер на филиал. Каждая заявка проходит проверку.")}</p></div></div>
    {current?.reviewReason && <p role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{label("Admin feedback:", "Комментарий администратора:")} {current.reviewReason}</p>}
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input required label={label("Clinic name", "Название клиники")} maxLength={120} value={form.name} onChange={edit("name")} />
        <label className="text-xs font-semibold text-ink-700">{label("Governorate", "Губернаторство")}<select required className="mt-2 w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm" value={form.governorate} onChange={edit("governorate")}><option value="">{label("Choose governorate", "Выберите губернаторство")}</option>{GOVERNORATES.map((place) => <option value={place} key={place}>{place}</option>)}</select></label>
        <Input required label={label("City", "Город")} maxLength={100} value={form.city} onChange={edit("city")} />
        <Input required label={label("Street address", "Адрес")} maxLength={250} value={form.address} onChange={edit("address")} />
        <Input required label={label("Phone", "Телефон")} type="tel" maxLength={32} value={form.phone} onChange={edit("phone")} />
        <Input required label="Email" type="email" maxLength={180} value={form.email} onChange={edit("email")} />
      </div>
      <Textarea label={label("Clinic description (optional)", "Описание клиники (необязательно)")} rows={3} maxLength={700} value={form.description} onChange={edit("description")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input required label={label("Clinic license number", "Номер лицензии клиники")} maxLength={100} value={form.clinicLicenseNumber} onChange={edit("clinicLicenseNumber")} />
        <Input required label={label("Responsible veterinarian", "Ответственный ветеринар")} maxLength={120} value={form.responsibleVetName} onChange={edit("responsibleVetName")} />
        <Input required label={label("Veterinarian license number", "Номер лицензии ветеринара")} maxLength={100} value={form.responsibleVetLicenseNumber} onChange={edit("responsibleVetLicenseNumber")} />
      </div>
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h3 className="flex items-center gap-2 font-extrabold"><FileCheck2 size={19} className="text-primary-700" /> {label("Verification documents", "Документы для проверки")}</h3>
        <p className="mt-1 text-xs leading-5 text-ink-600">{label("Test or redacted JPG, PNG or WebP images only (max 190 KB each). Documents are returned by the protected admin API, not public clinic pages. Do not upload real IDs until private file storage and Firestore security rules have been reviewed for production.", "Только тестовые изображения JPG, PNG или WebP до 190 КБ. Документы выдаются через защищённый API, но перед загрузкой реальных удостоверений необходимо проверить правила Firestore и настроить закрытое файловое хранилище.")}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">{DOCUMENTS.map(([kind, title]) => <label key={kind} className="block rounded-xl border border-stone-200 bg-white p-3 text-xs font-semibold text-ink-800">{title}<input required type="file" accept="image/jpeg,image/png,image/webp" className="mt-2 block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:font-bold file:text-primary-700" onChange={(event) => setFiles((old) => ({ ...old, [kind]: event.target.files?.[0] || null }))}/></label>)}</div>
      </section>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <Button type="submit" loading={saving} className="w-full sm:w-auto"><ShieldCheck size={17}/>{label("Submit for admin review", "Отправить на проверку")}</Button>
    </form>
  </Card>;
}

function ServicesEditor({ clinic, onSaved }) {
  const [services, setServices] = useState(clinic.services || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const edit = (index, key, value) => setServices((current) => current.map((service, i) => i === index ? { ...service, [key]: value } : service));
  const save = async () => {
    setSaving(true); setError("");
    try { const result = await clinicApi.services(services); onSaved(result.clinic); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  return <Card className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold">Clinic services · EGP</h2><Button size="sm" variant="secondary" type="button" disabled={services.length >= 15} onClick={() => setServices((current) => [...current, { id: crypto.randomUUID(), name: "", price: "", durationMinutes: 30 }])}>+ Add service</Button></div>
    {!services.length && <p className="text-sm text-ink-500">Add at least one service to let pet owners book this clinic.</p>}
    {services.map((service, index) => <div key={service.id} className="grid items-end gap-3 rounded-xl border border-stone-100 p-3 sm:grid-cols-[1fr_120px_110px_auto]"><Input label="Service name" value={service.name} onChange={(e) => edit(index,"name",e.target.value)}/><Input label="Price (EGP)" type="number" min="0" max="100000" value={service.price} onChange={(e) => edit(index,"price",e.target.value)}/><Input label="Minutes" type="number" min="10" max="480" value={service.durationMinutes} onChange={(e) => edit(index,"durationMinutes",e.target.value)}/><Button type="button" variant="ghost" onClick={() => setServices((current) => current.filter((_,i) => i !== index))}>Remove</Button></div>)}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button type="button" loading={saving} onClick={save}>Save services</Button>
  </Card>;
}

function ClinicAppointments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const refresh = async () => {
    try { setLoading(true); setItems((await clinicApi.clinicBookings()).appointments); setError(""); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
  const update = async (id, status) => {
    setBusy(id); setError("");
    try { await clinicApi.updateBooking(id, status); await refresh(); }
    catch (err) { setError(err.message); } finally { setBusy(""); }
  };
  return <Card className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Appointment requests</h2><button type="button" onClick={refresh} aria-label="Refresh appointments"><RefreshCw size={18}/></button></div>
    {loading && <p role="status" className="text-sm text-ink-500">Loading appointments…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!loading && !items.length && <p className="text-sm text-ink-500">No appointments yet. Approved clinics with services will appear in Our Clinics.</p>}
    {items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 p-4"><div><strong>{item.petName} · {item.serviceName}</strong><p className="mt-1 text-xs text-ink-500">{item.date} {item.time} · {item.price} EGP · {item.status}</p>{item.notes && <p className="mt-1 text-xs text-ink-600">{item.notes}</p>}</div><div className="flex gap-2">{item.status === "pending" && <><Button size="sm" disabled={busy === item.id} onClick={() => update(item.id,"confirmed")}>Accept</Button><Button size="sm" variant="danger" disabled={busy === item.id} onClick={() => update(item.id,"rejected")}>Reject</Button></>}{item.status === "confirmed" && <><Button size="sm" disabled={busy === item.id} onClick={() => update(item.id,"completed")}>Complete</Button><Button size="sm" variant="secondary" disabled={busy === item.id} onClick={() => update(item.id,"cancelled")}>Cancel</Button></>}</div></div>)}
  </Card>;
}

export default function ClinicPortal() {
  const { user } = useApp();
  const { isRussian } = useLanguage();
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    setClinic(null);
    if (!user?.uid) { setLoading(false); setError(""); return; }
    let active = true;
    setLoading(true);
    clinicApi.mine().then((result) => { if (active) { setClinic(result.clinic); setError(""); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.uid]);
  return <div className="space-y-6 py-5">
    <PageHeader eyebrow="PetCare for clinics" title={isRussian ? "Кабинет клиники" : "Clinic Manager Portal"} description="Register your clinic, track admin approval, and manage bookings after verification." action={<Link className="text-sm font-bold text-primary-700" to="/nearby/our/veterinary">View Our Clinics →</Link>}/>
    {!user && <Card className="flex flex-col items-start gap-4"><h2 className="text-lg font-extrabold">Sign in to register a clinic</h2><p className="text-sm text-ink-500">Your existing PetCare account can be both a pet owner account and a clinic manager account.</p><Link to="/login" state={{ from: "/clinic" }} className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white">Sign in</Link></Card>}
    {user && loading && <p role="status" className="text-sm text-ink-500">Checking your clinic registration…</p>}
    {user && error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {user && !loading && !error && (!clinic || ["rejected", "changes_requested"].includes(clinic.status)) && <ClinicApplication current={clinic} onSaved={setClinic}/>}
    {user && clinic?.status === "pending" && <Card className="max-w-3xl"><Clock3 size={28} className="text-amber-600"/><h2 className="mt-3 text-xl font-extrabold">Your clinic is pending approval</h2><p className="mt-2 text-sm text-ink-600">The PetCare administrator must verify your clinic and documents before it becomes public or receives bookings. Return here to check the decision.</p><p className="mt-3 text-sm font-semibold">{clinic.name} · {clinic.city}</p><Button className="mt-4" variant="secondary" onClick={() => clinicApi.mine().then((r) => setClinic(r.clinic)).catch((err) => setError(err.message))}><RefreshCw size={16}/> Refresh status</Button></Card>}
    {user && clinic?.status === "suspended" && <Card><h2 className="font-extrabold">Clinic access is suspended</h2><p className="text-sm text-ink-600">{clinic.reviewReason || "Contact PetCare support for details."}</p></Card>}
    {user && clinic?.status === "approved" && <><div className="grid gap-3 sm:grid-cols-3"><Card><CheckCircle2 className="text-green-600"/><p className="mt-2 text-xs text-ink-500">Verification</p><strong className="text-lg">Approved</strong></Card><Card><Stethoscope className="text-primary-700"/><p className="mt-2 text-xs text-ink-500">Services</p><strong className="text-lg">{clinic.services.length}</strong></Card><Card><CalendarCheck2 className="text-primary-700"/><p className="mt-2 text-xs text-ink-500">Clinic</p><strong className="text-lg">{clinic.name}</strong></Card></div><ServicesEditor clinic={clinic} onSaved={setClinic}/><ClinicAppointments/><p className="flex items-start gap-2 text-xs text-ink-500"><ClipboardCheck size={16}/> Doctor accounts, shift scheduling and medical records will be introduced in the next phase.</p></>}
  </div>;
}
