import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Building2, CalendarCheck2, CheckCircle2, ClipboardCheck, Clock3, FileCheck2, RefreshCw, ShieldCheck, Stethoscope } from "lucide-react";
import { useApp } from "../store.jsx";
import { clinicApi } from "../services/clinicApi.js";
import { mapLinkCityConflict } from "../services/clinicDiscovery.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import ClinicWorkspace from "./ClinicWorkspace.jsx";
import { useClinicAudience } from "../clinic/ClinicAudienceContext.jsx";
import { Button, Card, Input, PageHeader, Textarea } from "../components/ui.jsx";

const EMPTY = { name: "", managerName: "", region: "", city: "", address: "", mapUrl: "", phone: "", email: "", description: "", clinicLicenseNumber: "", responsibleVetName: "", responsibleVetLicenseNumber: "" };
const DOCUMENT_CONSENT_VERSION = "clinic-document-consent-v1";
const DOCUMENTS = [
  ["clinic_license", "Clinic license"], ["manager_id", "Manager identity document"], ["vet_license", "Responsible veterinarian's license"],
];

function ClinicApplication({ current, onSaved, uploadEnabled, emulatorDocuments, demoUploads, managerName, managerEmail }) {
  const { isRussian } = useLanguage();
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...Object.fromEntries(Object.keys(EMPTY).map((key) => [key, current?.[key] ?? EMPTY[key]])),
    region: current?.region || current?.governorate || "",
    managerName: current?.managerName || managerName || "",
    email: current?.email || managerEmail || "",
  }));
  const [files, setFiles] = useState({});
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState("");
  const [error, setError] = useState("");
  const [consentAccepted, setConsentAccepted] = useState(
    current?.documentConsent?.version === DOCUMENT_CONSENT_VERSION,
  );
  const label = (en, ru) => isRussian ? ru : en;
  const edit = (key) => (event) => setForm((prev) => ({ ...prev, [key]: event.target.value }));
  const applicationFields = () => Object.fromEntries(Object.keys(EMPTY).map((key) => [key, form[key] ?? ""]));
  const saveDraft = async () => {
    setSaving(true); setSavingAction("draft"); setError("");
    try {
      const result = await clinicApi.saveDraft(applicationFields());
      onSaved(result.clinic);
    } catch (err) { setError(err.message || "Unable to save clinic draft."); }
    finally { setSaving(false); setSavingAction(""); }
  };
  const submit = async (event) => {
    event.preventDefault(); setError(""); setSaving(true); setSavingAction("submit");
    try {
      if (!uploadEnabled) throw new Error("Clinic document storage is not connected. Ask the project administrator to configure private Supabase Storage.");
      for (const [kind] of DOCUMENTS) {
        if (!files[kind]) throw new Error("Please attach all three verification documents.");
        if (!(["application/pdf", "image/jpeg", "image/png"].includes(files[kind].type)) || files[kind].size > 5 * 1024 * 1024) {
          throw new Error("Each document must be a PDF, JPG or PNG no larger than 5 MB.");
        }
      }
      if (!consentAccepted) throw new Error("Please accept the verification-document privacy notice before uploading.");
      await clinicApi.acceptDocumentConsent(DOCUMENT_CONSENT_VERSION);
      for (const [kind] of DOCUMENTS) await clinicApi.uploadDocument(kind, files[kind]);
      const result = await clinicApi.apply(applicationFields());
      onSaved(result.clinic);
    } catch (err) { setError(err.message || "Unable to submit application."); }
    finally { setSaving(false); setSavingAction(""); }
  };
  return <Card className="max-w-4xl p-6 sm:p-8">
    <div className="mb-6 flex items-center gap-3"><span className="rounded-xl bg-primary-50 p-3 text-primary-700"><Building2 size={23} /></span><div><h2 className="text-xl font-extrabold">{label(current?.status === "draft" ? "Resume clinic application" : "Register your veterinary clinic", current?.status === "draft" ? "Продолжить заявку клиники" : "Регистрация ветеринарной клиники")}</h2><p className="text-sm text-ink-500">{label("One independent manager account per clinic branch. A PetCare administrator personally reviews the application and verification documents, then approves, rejects or requests changes.", "Один менеджер на филиал. Администратор PetCare лично проверяет заявку и документы, затем одобряет, отклоняет или запрашивает исправления.")}</p></div></div>
    {current?.reviewReason && <p role="alert" className="mb-5 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">{label("Admin feedback:", "Комментарий администратора:")} {current.reviewReason}</p>}
    <form onSubmit={submit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input required label={label("Clinic name", "Название клиники")} maxLength={120} value={form.name} onChange={edit("name")} />
        <Input required label={label("Manager full name", "Полное имя менеджера")} maxLength={120} value={form.managerName} onChange={edit("managerName")} />
        <Input required label={label("Region / Federal subject", "Регион / субъект РФ")} maxLength={120} value={form.region} placeholder={label("e.g. Moscow Oblast", "Например, Московская область")} onChange={edit("region")} />
        <Input required label={label("City", "Город")} maxLength={100} value={form.city} onChange={edit("city")} />
        <Input required label={label("Street address", "Адрес")} maxLength={250} value={form.address} onChange={edit("address")} />
        <Input required label={label("Phone", "Телефон")} type="tel" maxLength={32} value={form.phone} onChange={edit("phone")} />
        <Input required label="Email" type="email" maxLength={180} value={form.email} onChange={edit("email")} />
        <Input required label={label("Clinic map link (2GIS, Yandex Maps, Google Maps…)", "Ссылка на клинику на карте (2ГИС, Яндекс Карты…)")} type="url" maxLength={1800} placeholder="https://2gis.ru/..." value={form.mapUrl} onChange={edit("mapUrl")} />
        <p className="text-xs text-ink-500 sm:col-span-2">{label("Paste a share link to your exact clinic address from 2GIS, Yandex Maps, Google Maps or OpenStreetMap. No map picker is needed.", "Вставьте ссылку на точный адрес клиники из 2ГИС, Яндекс Карт, Google Maps или OpenStreetMap. Выбирать точку на карте не нужно.")}</p>
      </div>
      <Textarea label={label("Clinic description (optional)", "Описание клиники (необязательно)")} rows={3} maxLength={700} value={form.description} onChange={edit("description")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input required label={label("Clinic license number", "Номер лицензии клиники")} maxLength={100} value={form.clinicLicenseNumber} onChange={edit("clinicLicenseNumber")} />
        <Input required label={label("Responsible veterinarian", "Ответственный ветеринар")} maxLength={120} value={form.responsibleVetName} onChange={edit("responsibleVetName")} />
        <Input required label={label("Veterinarian license number", "Номер лицензии ветеринара")} maxLength={100} value={form.responsibleVetLicenseNumber} onChange={edit("responsibleVetLicenseNumber")} />
      </div>
      <section className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h3 className="flex items-center gap-2 font-extrabold"><FileCheck2 size={19} className="text-primary-700" /> {label("Verification documents", "Документы для проверки")}</h3>
        <p className="mt-1 text-xs leading-5 text-ink-600">{demoUploads || emulatorDocuments
          ? label("Graduation project demo: attach sample or completely fictional PDF, JPG or PNG files (max 5 MB each). A PetCare administrator will examine them manually. Do NOT upload real passports, IDs, licences or personal documents.", "Демонстрация дипломного проекта: прикрепите вымышленные или тестовые PDF, JPG или PNG (до 5 МБ). Администратор PetCare проверит их вручную. НЕ загружайте реальные паспорта, удостоверения или лицензии.")
          : label("PDF, JPG or PNG only (max 5 MB each). Documents are private and available only through the authenticated Admin API.", "Только PDF, JPG или PNG до 5 МБ. Документы закрыты и доступны только через защищённый API администратора.")}</p>
        {!uploadEnabled && <p role="status" className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-950">{label("Document uploads are disabled until private storage and required security controls are ready. You can save a draft in the meantime.", "Загрузка отключена до настройки приватного хранилища и обязательных мер безопасности. Пока можно сохранить черновик.")}</p>}
        <div className="mt-4 grid gap-3 sm:grid-cols-3">{DOCUMENTS.map(([kind, title]) => <label key={kind} className="block rounded-xl border border-stone-200 bg-white p-3 text-xs font-semibold text-ink-800">{title}<input required={uploadEnabled} disabled={!uploadEnabled} type="file" accept="application/pdf,image/jpeg,image/png" className="mt-2 block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-primary-50 file:px-3 file:py-2 file:font-bold file:text-primary-700 disabled:cursor-not-allowed disabled:opacity-50" onChange={(event) => setFiles((old) => ({ ...old, [kind]: event.target.files?.[0] || null }))}/></label>)}</div>
      </section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
        <h3 className="font-extrabold">{label("Document privacy and retention", "Конфиденциальность и хранение документов")}</h3>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs leading-5">
          <li>{label("Drafts: delete verification documents after 30 days without activity.", "Черновики: документы удаляются после 30 дней без активности.")}</li>
          <li>{label("Changes requested: delete after 60 days without activity. Rejected applications: delete 30 days after final rejection, including the 14-day appeal period.", "Запрошенные исправления: удаление после 60 дней без активности. Отклонённые заявки: через 30 дней после окончательного отказа, включая 14-дневный срок апелляции.")}</li>
          <li>{label("Approved documents are retained while the clinic relationship is active; after closure, delete after 90 days.", "Документы одобренной клиники хранятся во время сотрудничества; после закрытия удаляются через 90 дней.")}</li>
          <li>{label("Legal holds, active appeals or legal retention obligations pause deletion. Clinic audit events are retained for 365 days.", "Юридическая блокировка, активная апелляция или обязательный срок хранения приостанавливают удаление. Журнал клиники хранится 365 дней.")}</li>
        </ul>
        <label className="mt-3 flex items-start gap-2 text-xs leading-5">
          <input type="checkbox" required checked={consentAccepted} onChange={(event) => setConsentAccepted(event.target.checked)} />
          <span>{label(
            "I am authorized to provide these documents and consent to their private processing solely for clinic verification by authorized PetCare administrators. They are not public and are not used for marketing. I have read the retention periods above.",
            "Я уполномочен(а) предоставить эти документы и даю согласие на их конфиденциальную обработку только уполномоченными администраторами PetCare для проверки клиники. Документы не публикуются и не используются для маркетинга. Я ознакомился(лась) со сроками хранения выше.",
          )}</span>
        </label>
        <p className="mt-2 text-xs font-semibold">{label(
          demoUploads ? "Demo documents only. The admin reviews submitted samples manually; real identity documents must not be uploaded. Consent wording is not legally reviewed." : "Consent and retention wording is a draft pending legal review. Production identity-document uploads remain disabled.",
          demoUploads ? "Только тестовые документы. Администратор проверяет примеры вручную; настоящие документы загружать нельзя. Текст согласия не проходил юридическую проверку." : "Текст согласия и сроков хранения является проектом и ожидает юридической проверки. Загрузка реальных документов в production отключена.",
        )}</p>
      </section>
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" disabled={saving} loading={savingAction === "draft"} onClick={saveDraft}>{label("Save draft", "Сохранить черновик")}</Button>
        <Button type="submit" disabled={!uploadEnabled || saving} loading={savingAction === "submit"} className="w-full sm:w-auto"><ShieldCheck size={17}/>{label("Submit for admin review", "Отправить на проверку")}</Button>
      </div>
    </form>
  </Card>;
}

function ClinicProfileEditor({ clinic, onSaved }) {
  const { isRussian } = useLanguage();
  const [profile, setProfile] = useState(() => ({
    name: clinic.name || "", description: clinic.description || "",
    phone: clinic.phone || "", city: clinic.city || "", address: clinic.address || "",
    region: clinic.region || clinic.governorate || "",
    mapUrl: clinic.mapUrl || "",
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const tr = (en, ru) => isRussian ? ru : en;
  const edit = (key) => (event) => setProfile((current) => ({ ...current, [key]: event.target.value }));
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const result = await clinicApi.updateProfile(profile);
      onSaved(result.clinic);
    } catch (err) { setError(err.message || "Unable to update clinic profile."); }
    finally { setSaving(false); }
  };
  return <Card>
    <h2 className="mb-4 text-lg font-extrabold">{tr("Clinic profile", "Профиль клиники")}</h2>
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <Input required label={tr("Clinic name", "Название клиники")} maxLength={120} value={profile.name} onChange={edit("name")} />
      <Input required label={tr("Phone", "Телефон")} type="tel" maxLength={32} value={profile.phone} onChange={edit("phone")} />
      <Input required label={tr("City", "Город")} maxLength={100} value={profile.city} onChange={edit("city")} />
      <Input required label={tr("Street address", "Адрес")} maxLength={250} value={profile.address} onChange={edit("address")} />
        <Input required label={tr("Region / Federal subject", "Регион / субъект РФ")} maxLength={120} value={profile.region} onChange={edit("region")} />
        <Input required type="url" label={tr("Clinic map link (HTTPS)", "Ссылка на клинику на карте (HTTPS)")} maxLength={1800} value={profile.mapUrl} onChange={edit("mapUrl")} />
      {mapLinkCityConflict(profile.city, profile.mapUrl) && <p role="alert" className="sm:col-span-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        {tr(
          `Clinic city is ${profile.city}, but this 2GIS link points to ${mapLinkCityConflict(profile.city, profile.mapUrl)}. Please correct the city or paste the link to your actual clinic. PetCare won't place an inaccurate map pin until they match.`,
          `Город клиники: ${profile.city}, но ссылка 2ГИС указывает на ${mapLinkCityConflict(profile.city, profile.mapUrl)}. Исправьте город или ссылку на фактический адрес клиники. До исправления неточной метки на карте не будет.`
        )}
      </p>}
      <p className="text-xs text-ink-500 sm:col-span-2">{tr(
        "Use the real street and building number, not only the city, so the map can locate the clinic precisely.",
        "Укажите настоящий адрес с улицей и номером дома, а не только город, чтобы клинику можно было найти на карте."
      )}</p>
      <div className="sm:col-span-2"><Textarea label={tr("Description", "Описание")} rows={3} maxLength={700} value={profile.description} onChange={edit("description")} /></div>
      {error && <p role="alert" className="text-sm text-red-700 sm:col-span-2">{error}</p>}
      <div className="sm:col-span-2"><Button type="submit" loading={saving}>{tr("Save profile", "Сохранить профиль")}</Button></div>
    </form>
    <p className="mt-3 text-xs text-ink-500">{tr("Verified legal names and license numbers can only be changed through administrator review.", "Юридическое название и номера лицензий можно изменить только через проверку администратора.")}</p>
  </Card>;
}

const WEEKDAYS = [
  ["Sunday", "Воскресенье"], ["Monday", "Понедельник"], ["Tuesday", "Вторник"],
  ["Wednesday", "Среда"], ["Thursday", "Четверг"], ["Friday", "Пятница"], ["Saturday", "Суббота"],
];

function ClinicAvailability({ clinic, onSaved }) {
  const { isRussian } = useLanguage();
  const [workingHours, setWorkingHours] = useState(() => clinic.workingHours || {
    days: [0, 1, 2, 3, 4, 5, 6], open: "09:00", close: "17:00",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const tr = (en, ru) => isRussian ? ru : en;
  const toggleDay = (day) => setWorkingHours((current) => ({
    ...current,
    days: current.days.includes(day)
      ? current.days.filter((item) => item !== day)
      : [...current.days, day].sort((a, b) => a - b),
  }));
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const result = await clinicApi.updateAvailability(workingHours);
      onSaved(result.clinic);
    } catch (err) { setError(err.message || "Unable to save clinic hours."); }
    finally { setSaving(false); }
  };
  return <Card>
    <h2 className="mb-4 text-lg font-extrabold">{tr("Working hours", "Часы работы")}</h2>
    <form onSubmit={save} className="space-y-4">
      <fieldset>
        <legend className="mb-2 text-xs font-semibold text-ink-700">{tr("Working days", "Рабочие дни")}</legend>
        <div className="flex flex-wrap gap-2">{WEEKDAYS.map(([day, russian], index) => <label key={day} className="inline-flex items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-xs">
          <input type="checkbox" checked={workingHours.days.includes(index)} onChange={() => toggleDay(index)} />
          {isRussian ? russian : day}
        </label>)}</div>
      </fieldset>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input required label={tr("Opens", "Открытие")} type="time" value={workingHours.open} onChange={(event) => setWorkingHours((current) => ({ ...current, open: event.target.value }))} />
        <Input required label={tr("Closes", "Закрытие")} type="time" value={workingHours.close} onChange={(event) => setWorkingHours((current) => ({ ...current, close: event.target.value }))} />
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button type="submit" loading={saving}>{tr("Save availability", "Сохранить расписание")}</Button>
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
  return <Card className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-extrabold">Clinic services · RUB (₽)</h2><Button size="sm" variant="secondary" type="button" disabled={services.length >= 15} onClick={() => setServices((current) => [...current, { id: crypto.randomUUID(), name: "", price: "", durationMinutes: 30 }])}>+ Add service</Button></div>
    {!services.length && <p className="text-sm text-ink-500">Add at least one service to let pet owners book this clinic.</p>}
    {services.map((service, index) => <div key={service.id} className="grid items-end gap-3 rounded-xl border border-stone-100 p-3 sm:grid-cols-[1fr_120px_110px_auto]"><Input label="Service name" value={service.name} onChange={(e) => edit(index,"name",e.target.value)}/><Input label="Price (RUB)" type="number" min="0" max="100000" value={service.price} onChange={(e) => edit(index,"price",e.target.value)}/><Input label="Minutes" type="number" min="10" max="480" value={service.durationMinutes} onChange={(e) => edit(index,"durationMinutes",e.target.value)}/><label className="flex min-h-10 items-center gap-2 text-xs"><input type="checkbox" checked={service.available !== false} onChange={(event) => edit(index, "available", event.target.checked)} />Available for booking</label><Button type="button" variant="ghost" onClick={() => setServices((current) => current.filter((_,i) => i !== index))}>Remove</Button></div>)}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <Button type="button" loading={saving} onClick={save}>Save services</Button>
  </Card>;
}

function ClinicAppointments() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [rejectionReasons, setRejectionReasons] = useState({});
  const refresh = async () => {
    try { setLoading(true); setItems((await clinicApi.clinicBookings()).appointments); setError(""); }
    catch (err) { setError(err.message); } finally { setLoading(false); }
  };
  useEffect(() => { refresh(); }, []);
  const update = async (id, status, reason = "") => {
    setBusy(id); setError("");
    try { await clinicApi.updateBooking(id, status, reason); setRejectionReasons((current) => ({ ...current, [id]: "" })); await refresh(); }
    catch (err) { setError(err.message); } finally { setBusy(""); }
  };
  const pendingCount = items.filter((item) => item.status === "pending").length;
  const confirmedCount = items.filter((item) => item.status === "confirmed").length;
  const completedCount = items.filter((item) => item.status === "completed").length;
  return <Card className="space-y-4"><div className="flex items-center justify-between"><h2 className="text-lg font-extrabold">Appointment requests</h2><button type="button" onClick={refresh} aria-label="Refresh appointments"><RefreshCw size={18}/></button></div>
    {loading && <p role="status" className="text-sm text-ink-500">Loading appointments…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl bg-amber-50 p-3"><strong>{pendingCount}</strong><p className="text-xs text-ink-600">Pending requests</p></div>
      <div className="rounded-xl bg-primary-50 p-3"><strong>{confirmedCount}</strong><p className="text-xs text-ink-600">Confirmed bookings</p></div>
      <div className="rounded-xl bg-green-50 p-3"><strong>{completedCount}</strong><p className="text-xs text-ink-600">Completed appointments</p></div>
    </div>
    {!loading && !items.length && <p className="text-sm text-ink-500">No appointments yet. Approved clinics with services will appear in Our Clinics.</p>}
    {items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-stone-200 p-4"><div><strong>{item.petName} · {item.serviceName}</strong><p className="mt-1 text-xs text-ink-500">{item.date} {item.time} · {item.price} RUB · {item.status}</p>{item.notes && <p className="mt-1 text-xs text-ink-600">{item.notes}</p>}{item.statusReason && <p className="mt-1 text-xs text-amber-900">Feedback: {item.statusReason}</p>}</div><div className="flex flex-wrap items-end gap-2">{item.status === "pending" && <><Button size="sm" disabled={busy === item.id} onClick={() => update(item.id,"confirmed")}>Accept</Button><div className="w-full sm:w-56"><Textarea label="Rejection reason" rows={1} maxLength={300} value={rejectionReasons[item.id] || ""} onChange={(event) => setRejectionReasons((current) => ({ ...current, [item.id]: event.target.value }))}/></div><Button size="sm" variant="danger" disabled={busy === item.id || (rejectionReasons[item.id] || "").trim().length < 5} onClick={() => update(item.id,"rejected",rejectionReasons[item.id])}>Reject</Button></>}{item.status === "confirmed" && <><Button size="sm" disabled={busy === item.id} onClick={() => update(item.id,"completed")}>Complete</Button><Button size="sm" variant="secondary" disabled={busy === item.id} onClick={() => update(item.id,"cancelled")}>Cancel</Button></>}</div></div>)}
  </Card>;
}

export default function ClinicPortal() {
  const { user } = useApp();
  const { isRussian } = useLanguage();
  const { markClinic } = useClinicAudience();
  const [clinic, setClinic] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploadEnabled, setUploadEnabled] = useState(false);
  const [emulatorDocuments, setEmulatorDocuments] = useState(false);
  const [demoUploads, setDemoUploads] = useState(false);
  useEffect(() => {
    setClinic(null);
    if (!user?.uid) { setLoading(false); setError(""); return; }
    let active = true;
    setLoading(true);
    clinicApi.mine().then((result) => { if (active) { setClinic(result.clinic); setError(""); } })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    clinicApi.verificationConfig()
      .then((result) => {
        if (active) {
          setUploadEnabled(result.uploadEnabled === true);
          setEmulatorDocuments(result.emulatorDocuments === true);
          setDemoUploads(result.demoUploads === true);
        }
      })
      .catch(() => { if (active) setUploadEnabled(false); });
    return () => { active = false; };
  }, [user?.uid]);
  return <div className="space-y-6 py-5">
    {clinic?.status !== "approved" && <PageHeader eyebrow="PetCare for clinics" title={isRussian ? "Кабинет клиники" : "Clinic Manager Portal"} description="Register your clinic, track admin approval, and manage bookings after verification."/>}
    {!user && <Card className="flex flex-col items-start gap-4"><h2 className="text-lg font-extrabold">Sign in to register a clinic</h2><p className="text-sm text-ink-500">Sign in with your Clinic Branch Manager account to manage clinic applications.</p><Link to="/login" state={{ from: "/clinic" }} className="rounded-xl bg-primary-600 px-5 py-3 text-sm font-bold text-white">Sign in</Link><Link to="/register?next=%2Fclinic" className="text-sm font-bold text-primary-700 underline">Create clinic manager account</Link></Card>}
    {user && loading && <p role="status" className="text-sm text-ink-500">Checking your clinic registration…</p>}
    {user && error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {user && !loading && !error && (!clinic || ["draft", "rejected", "changes_requested"].includes(clinic.status)) && <ClinicApplication current={clinic} onSaved={(updated) => { setClinic(updated); markClinic(updated); }} uploadEnabled={uploadEnabled} emulatorDocuments={emulatorDocuments} demoUploads={demoUploads} managerName={user.name} managerEmail={user.email}/>}
    {user && clinic?.status === "pending" && <Card className="max-w-3xl"><Clock3 size={28} className="text-amber-600"/><h2 className="mt-3 text-xl font-extrabold">Your clinic is pending approval</h2><p className="mt-2 text-sm text-ink-600">The PetCare administrator must verify your clinic and documents before it becomes public or receives bookings. Return here to check the decision.</p><p className="mt-3 text-sm font-semibold">{clinic.name} · {clinic.city}</p><Button className="mt-4" variant="secondary" onClick={() => clinicApi.mine().then((r) => setClinic(r.clinic)).catch((err) => setError(err.message))}><RefreshCw size={16}/> Refresh status</Button></Card>}
    {user && clinic?.status === "suspended" && <Card><h2 className="font-extrabold">Clinic access is suspended</h2><p className="text-sm text-ink-600">{clinic.reviewReason || "Contact PetCare support for details."}</p></Card>}
    {user && clinic?.status === "approved" && <ClinicWorkspace clinic={clinic} onSaved={(updated) => { setClinic(updated); markClinic(updated); }} core={{profile:<ClinicProfileEditor clinic={clinic} onSaved={setClinic}/>,availability:<ClinicAvailability clinic={clinic} onSaved={setClinic}/>,services:<ServicesEditor clinic={clinic} onSaved={setClinic}/>,bookings:<ClinicAppointments/>}}/>}
  </div>;
}
