import { useEffect, useState } from "react";
import { Link, NavLink, useParams, useNavigate } from "react-router-dom";
import { Activity, ArrowLeft, ArrowRight, Bird, CalendarDays, Check, ClipboardPlus, FileHeart, PawPrint, Pencil, Plus, Printer, ShieldCheck, Syringe, Trash2, UserRound, Weight } from "lucide-react";
import { useApp } from "../store.jsx";
import { btn, btn2, card, input } from "../ui.js";
import PetAvatar from "../components/PetAvatar.jsx";
import PhotoUpload from "../components/PhotoUpload.jsx";
import { Button, Modal } from "../components/ui.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

function PetCardPhoto({ pet }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [pet.photo]);
  if (pet.photo && !failed) return <img src={pet.photo} alt={`${pet.name}, ${pet.type}`} loading="lazy" onError={() => setFailed(true)} className="h-[190px] w-full object-cover" />;
  return <div role="img" aria-label={`${pet.name} avatar`} className="flex h-[190px] w-full flex-col items-center justify-center gap-2 bg-primary-50 text-primary-700"><span className="text-5xl font-extrabold">{pet.name?.trim()?.slice(0, 1).toUpperCase() || "?"}</span><PawPrint aria-hidden="true" size={26} /></div>;
}

function PetFormModal({ pet, onClose, onSaved }) {
  const { updatePetInfo } = useApp();
  const { t, isRussian } = useLanguage();
  const [form, setForm] = useState({ name: pet?.name || "", type: pet?.type || "Dog", breed: pet?.breed || "", age: pet?.age ?? "", gender: pet?.gender || "Male", weight: pet?.weight || "", healthStatus: pet?.healthStatus || "Healthy", notes: pet?.notes || "", photo: pet?.photo || "" });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (pet) setForm({ name: pet.name || "", type: pet.type || "Dog", breed: pet.breed || "", age: pet.age ?? "", gender: pet.gender || "Male", weight: pet.weight || "", healthStatus: pet.healthStatus || "Healthy", notes: pet.notes || "", photo: pet.photo || "" });
  }, [pet]);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const petTypes = [
    { value: "Dog", label: isRussian ? "Собака" : "Dog" },
    { value: "Cat", label: isRussian ? "Кошка" : "Cat" },
    { value: "Bird", label: isRussian ? "Птица" : "Bird" },
    { value: "Other", label: isRussian ? "Другое" : "Other" },
  ];

  return <Modal open={Boolean(pet)} onClose={onClose} title={pet ? (isRussian ? `Редактировать ${pet.name}` : `Edit ${pet.name}`) : t("pets.edit_pet")}>
    <form className="space-y-4" onSubmit={async (event) => { event.preventDefault(); if (!pet) return; setSaving(true); try { await updatePetInfo(pet.id, { ...form, age: Number(form.age), weight: form.weight ? Number(form.weight) : "" }); onSaved(form.name); } finally { setSaving(false); } }}>
      <label className="block text-xs font-bold">{t("pets.pet_photo")} <span className="font-normal text-ink-500">{isRussian ? "(необязательно)" : "(optional)"}</span><div className="mt-2"><PhotoUpload value={form.photo} onChange={(photo) => setForm((current) => ({ ...current, photo }))} label={t("pets.pet_photo")} /></div></label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold">{t("pets.pet_name")}<input required className={`${input} mt-2`} value={form.name} onChange={set("name")} /></label>
        <label className="block text-xs font-bold">{t("pets.pet_type")}<select className={`${input} mt-2`} value={form.type} onChange={set("type")}>{petTypes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label className="block text-xs font-bold">{t("pets.breed")}<input className={`${input} mt-2`} value={form.breed} onChange={set("breed")} /></label>
        <label className="block text-xs font-bold">{t("pets.age")}<input required type="number" min="0" className={`${input} mt-2`} value={form.age} onChange={set("age")} /></label>
        <label className="block text-xs font-bold">{t("pets.gender")}<select className={`${input} mt-2`} value={form.gender} onChange={set("gender")}><option value="Male">{isRussian ? "Самец" : "Male"}</option><option value="Female">{isRussian ? "Самка" : "Female"}</option></select></label>
        <label className="block text-xs font-bold">{t("pets.weight")}<input type="number" min="0" className={`${input} mt-2`} value={form.weight} onChange={set("weight")} /></label>
        <label className="block text-xs font-bold">{t("pets.health_status")}<select aria-label={t("pets.health_status")} className={`${input} mt-2`} value={form.healthStatus} onChange={set("healthStatus")}><option value="Healthy">{isRussian ? "Здоров" : "Healthy"}</option><option value="Monitoring">{isRussian ? "Под наблюдением" : "Monitoring"}</option><option value="Under treatment">{isRussian ? "На лечении" : "Under treatment"}</option></select></label>
        <label className="block text-xs font-bold">{t("pets.health_notes")}<textarea aria-label={t("pets.health_notes")} rows="3" className={`${input} mt-2`} value={form.notes} onChange={set("notes")} /></label>
      </div>
      <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" disabled={saving}>{saving ? t("common.saving") : t("pets.save_changes")}</Button></div>
    </form>
  </Modal>;
}

export function MyPets() {
  const { pets, deletePet, bookings, showToast, user } = useApp();
  const { t, isRussian } = useLanguage();
  const [editingPet, setEditingPet] = useState(null);
  const [deletingPet, setDeletingPet] = useState(null);
  const [cancelBookings, setCancelBookings] = useState(true);
  const sidebarLinks = [
    { to: "/pets", label: t("pets.title"), icon: PawPrint, end: true },
    { to: "/pets/new", label: t("pets.add_pet"), icon: Plus },
    { to: "/calendar", label: t("calendar.title"), icon: CalendarDays },
  ];
  const removePet = async () => {
    await deletePet(deletingPet.id, { cancelBookings });
    showToast(`${deletingPet.name} ${isRussian ? "был удален." : "was deleted."}`);
    setDeletingPet(null);
  };

  return <div className="grid min-w-0 gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
    <aside aria-label="Pet navigation" className="h-fit rounded-2xl border border-stone-200 bg-white p-4">
      <p className="px-2 pb-3 text-xs font-extrabold uppercase tracking-[0.14em] text-ink-500">{isRussian ? "Уход за питомцами" : "Pet Care"}</p>
      <nav aria-label="Pet care" className="grid grid-cols-3 gap-1 lg:grid-cols-1">
        {sidebarLinks.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors lg:justify-start ${isActive ? "bg-primary-50 text-primary-800" : "text-ink-600 hover:bg-stone-50 hover:text-ink-900"}`}>
          {({ isActive }) => <><Icon size={17} className={isActive ? "text-primary-700" : "text-ink-500"} /><span>{label}</span></>}
        </NavLink>)}
      </nav>
    </aside>

    <section className="min-w-0">
      {!user ? <div className={`${card} mx-auto max-w-lg py-14 text-center`}><PawPrint size={30} className="mx-auto text-primary-600" /><h1 className="mt-4 text-2xl font-extrabold">{t("pets.login_required")}</h1><p className="mt-2 text-sm text-ink-500">{t("pets.login_sub")}</p><Link to="/login" state={{ from: "/pets" }} className={`${btn} mt-5`}>{t("nav.log_in")}</Link></div> : <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div><h1 className="text-2xl font-extrabold text-ink-900 sm:text-3xl">{t("pets.title")}</h1><p className="mt-1 text-sm text-ink-500">{t("pets.subtitle")}</p></div>
        <Link to="/pets/new" className={`${btn} min-h-10`}><Plus size={16} />{t("pets.add_pet")}</Link>
      </header>

    {pets.length ? <div className="grid items-stretch gap-4 sm:grid-cols-2">
      {pets.map((pet) => {
        const status = pet.healthStatus || "Healthy";
        const statusClass = status === "Healthy" ? "bg-green-50 text-green-700" : status === "Under treatment" ? "bg-red-50 text-danger-600" : "bg-amber-50 text-amber-800";
        const statusDisplay = isRussian ? (status === "Healthy" ? "Здоров" : status === "Under treatment" ? "На лечении" : "Под наблюдением") : status;
        const petTypeDisplay = isRussian ? (pet.type === "Dog" ? "Собака" : pet.type === "Cat" ? "Кошка" : pet.type === "Bird" ? "Птица" : pet.type) : pet.type;
        const genderDisplay = isRussian ? (pet.gender === "Male" ? "Самец" : pet.gender === "Female" ? "Самка" : "Не указан") : (pet.gender || "Not added");
        const ageUnit = isRussian ? (pet.age === 1 ? "год" : pet.age >= 2 && pet.age <= 4 ? "года" : "лет") : (pet.age === 1 ? "year" : "years");

        return <article key={pet.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <Link to={`/pets/${pet.id}`} aria-label={`View ${pet.name}'s profile`} className="relative block h-[190px] overflow-hidden bg-stone-100">
            <PetCardPhoto pet={pet} />
            <span className="absolute left-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-bold text-ink-800">{petTypeDisplay}</span>
          </Link>
          <div className="flex flex-1 flex-col p-4">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><h2 className="truncate text-base font-extrabold text-ink-900">{pet.name}</h2><p className="mt-1 truncate text-sm text-ink-500">{pet.breed || `${petTypeDisplay} · ${isRussian ? "порода не указана" : "breed not added"}`}</p></div><span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass}`}>{statusDisplay}</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-100 pt-3 text-xs"><div><span className="block text-ink-500">{isRussian ? "Возраст" : "Age"}</span><b className="mt-1 block text-ink-800">{pet.age} {ageUnit}</b></div><div><span className="block text-ink-500">{isRussian ? "Пол" : "Gender"}</span><b className="mt-1 block text-ink-800">{genderDisplay}</b></div></div>
            <div className="mt-auto flex items-center gap-2 pt-4">
              <Link to={`/pets/${pet.id}`} className={`${btn} min-h-9 flex-1 justify-center px-3 text-xs`}><ArrowRight size={14} />{t("pets.view_profile")}</Link>
              <button type="button" aria-label={`Edit ${pet.name}`} title={t("pets.edit_pet")} className="grid size-9 shrink-0 place-items-center rounded-lg border border-stone-200 text-ink-600 transition hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700" onClick={() => setEditingPet(pet)}><Pencil size={15} /></button>
              <button type="button" aria-label={`Delete ${pet.name}`} title={t("pets.delete_pet")} className="grid size-9 shrink-0 place-items-center rounded-lg border border-stone-200 text-ink-600 transition hover:border-red-200 hover:bg-red-50 hover:text-danger-600" onClick={() => { setCancelBookings(true); setDeletingPet(pet); }}><Trash2 size={15} /></button>
            </div>
          </div>
        </article>;
      })}
      <Link to="/pets/new" className="group flex min-h-[392px] min-w-0 flex-col overflow-hidden rounded-2xl border border-dashed border-primary-300 bg-white text-center transition hover:border-primary-500 hover:bg-primary-50/20">
        <span className="grid h-[190px] shrink-0 place-items-center bg-primary-50/70 text-primary-700 transition group-hover:bg-primary-50"><span className="grid size-12 place-items-center rounded-full bg-white shadow-sm"><Plus size={22} /></span></span>
        <span className="flex flex-1 flex-col items-center justify-center px-5 py-4">
          <span className="text-sm font-extrabold text-ink-900">{t("pets.add_new_pet")}</span>
          <span className="mt-1 max-w-[220px] text-xs leading-5 text-ink-500">{t("pets.add_pet_sub")}</span>
        </span>
      </Link>
    </div> : <div className="rounded-2xl border border-stone-200 bg-white px-6 py-14 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-primary-50 text-primary-700"><PawPrint size={24} /></span><h2 className="mt-4 text-lg font-extrabold text-ink-900">{t("pets.profiles_start_here")}</h2><p className="mt-2 text-sm text-ink-500">{t("pets.profiles_start_here_sub")}</p><Link to="/pets/new" className={`${btn} mt-5`}><Plus size={16} />{t("pets.add_pet")}</Link></div>}

    <PetFormModal pet={editingPet} onClose={() => setEditingPet(null)} onSaved={(name) => { setEditingPet(null); showToast(`${name} ${isRussian ? "был обновлен." : "was updated."}`); }} />
    <Modal open={Boolean(deletingPet)} onClose={() => setDeletingPet(null)} title={deletingPet ? t("pets.delete_pet_confirm", { name: deletingPet.name }) : t("pets.delete_pet")}>
      {deletingPet && <><p className="text-sm leading-6 text-ink-500">{t("pets.delete_pet_desc")}</p>{bookings.filter((booking) => booking.pet?.id === deletingPet.id && booking.status === "Upcoming").length > 0 && <label className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-ink-700"><input type="checkbox" className="mt-1 accent-primary-600" checked={cancelBookings} onChange={(event) => setCancelBookings(event.target.checked)} />{isRussian ? `Отменить ${bookings.filter((booking) => booking.pet?.id === deletingPet.id && booking.status === "Upcoming").length} предстоящих записей` : `Cancel ${bookings.filter((booking) => booking.pet?.id === deletingPet.id && booking.status === "Upcoming").length} upcoming booking(s) too`}</label>}<div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeletingPet(null)}>{t("pets.keep_pet")}</Button><Button type="button" variant="danger" onClick={removePet}><Trash2 size={16} />{t("pets.delete_pet")}</Button></div></>}
    </Modal>
    </>}
    </section>
  </div>;
}

export function AddPet() {
  const { addPet, createPet, user } = useApp();
  const { t, isRussian } = useLanguage();
  const nav = useNavigate();
  const [f, setF] = useState({ name: "", type: "Dog", breed: "", age: "", gender: "Male", weight: "", healthStatus: "Healthy", notes: "", photo: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const [saving, setSaving] = useState(false);

  const petTypes = [
    { value: "Dog", label: isRussian ? "Собака" : "Dog" },
    { value: "Cat", label: isRussian ? "Кошка" : "Cat" },
    { value: "Bird", label: isRussian ? "Птица" : "Bird" },
    { value: "Other", label: isRussian ? "Другое" : "Other" },
  ];

  if (!user) return <div className={`${card} mx-auto max-w-lg py-14 text-center`}><PawPrint size={30} className="mx-auto text-primary-600" /><h1 className="mt-4 text-2xl font-extrabold">{t("pets.login_required")}</h1><Link to="/login" state={{ from: "/pets/new" }} className={`${btn} mt-5`}>{t("nav.log_in")}</Link></div>;
  return <div className="mx-auto max-w-2xl"><Link to="/pets" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-primary-700"><ArrowLeft size={16} /> {t("pets.title")}</Link><form className={`${card} space-y-5 p-6 sm:p-8`} onSubmit={async (e) => { e.preventDefault(); setSaving(true); try { if (createPet) await createPet(f); else addPet(f); nav("/pets"); } finally { setSaving(false); } }}><div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">{isRussian ? "Новый член семьи" : "New family member"}</p><h1 className="mt-2 text-2xl font-extrabold">{t("pets.add_pet")}</h1><p className="mt-2 text-sm text-ink-500">{isRussian ? "Заполните основную информацию. Вы также сможете вести медкарту питомца." : "Start with the basics. You can keep their health records here too."}</p></div>
    <div><span className="mb-2 block text-xs font-bold text-ink-700">{t("pets.pet_photo")} <span className="font-normal text-ink-500">{isRussian ? "(необязательно)" : "(optional)"}</span></span><PhotoUpload value={f.photo} onChange={(photo) => setF((current) => ({ ...current, photo }))} label={t("pets.pet_photo")} /></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-xs font-bold">{t("pets.pet_name")}<input required aria-label={t("pets.pet_name")} className={`${input} mt-2`} placeholder={isRussian ? "например, Луна" : "e.g. Luna"} value={f.name} onChange={set("name")} /></label>
      <label className="block text-xs font-bold">{t("pets.pet_type")}<select aria-label={t("pets.pet_type")} className={`${input} mt-2`} value={f.type} onChange={set("type")}>{petTypes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label>
      <label className="block text-xs font-bold">{t("pets.breed")} <span className="font-normal text-ink-500">{isRussian ? "(необязательно)" : "(optional)"}</span><input aria-label={t("pets.breed")} className={`${input} mt-2`} placeholder={t("pets.breed")} value={f.breed} onChange={set("breed")} /></label>
      <label className="block text-xs font-bold">{t("pets.age")}<input required aria-label={t("pets.age")} type="number" min="0" className={`${input} mt-2`} placeholder={t("pets.age")} value={f.age} onChange={set("age")} /></label>
      <label className="block text-xs font-bold">{t("pets.gender")}<select aria-label={t("pets.gender")} className={`${input} mt-2`} value={f.gender} onChange={set("gender")}><option value="Male">{isRussian ? "Самец" : "Male"}</option><option value="Female">{isRussian ? "Самка" : "Female"}</option></select></label>
      <label className="block text-xs font-bold">{t("pets.weight")} <span className="font-normal text-ink-500">{isRussian ? "(необязательно)" : "(optional)"}</span><input aria-label={t("pets.weight")} type="number" min="0" className={`${input} mt-2`} placeholder={t("pets.weight")} value={f.weight} onChange={set("weight")} /></label>
      <label className="block text-xs font-bold">{t("pets.health_status")}<select aria-label={t("pets.health_status")} className={`${input} mt-2`} value={f.healthStatus} onChange={set("healthStatus")}><option value="Healthy">{isRussian ? "Здоров" : "Healthy"}</option><option value="Monitoring">{isRussian ? "Под наблюдением" : "Monitoring"}</option><option value="Under treatment">{isRussian ? "На лечении" : "Under treatment"}</option></select></label>
      <label className="block text-xs font-bold">{t("pets.health_notes")}<textarea aria-label={t("pets.health_notes")} rows="3" className={`${input} mt-2`} value={f.notes} onChange={set("notes")} /></label>
    </div><button disabled={saving} className={`${btn} w-full sm:w-auto`}>{saving ? t("common.saving") : <><Check size={17} /> {t("pets.save_profile")}</>}</button></form></div>;
}
export function PetProfile() {
  const { id } = useParams();
  const { pets, deletePet, bookings, calendarEvents, addVaccine, updateVaccine, addMedication, deleteVaccine, deleteMedication, addMedicalVisit, deleteMedicalVisit, showToast, user } = useApp();
  const { t, isRussian } = useLanguage();
  const navigate = useNavigate();
  const pet = pets.find((item) => String(item.id) === id);
  const [activeTab, setActiveTab] = useState("Overview");
  const [medicalSection, setMedicalSection] = useState("Veterinary Visits");
  const [vaccineForm, setVaccineForm] = useState({ name: "", date: "", next: "" });
  const [editingVaccine, setEditingVaccine] = useState(null);
  const [medicationForm, setMedicationForm] = useState({ name: "", dose: "", time: "", end: "" });
  const [visitForm, setVisitForm] = useState({ date: "", provider: "", reason: "", diagnosis: "", treatment: "", notes: "" });
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [cancelBookings, setCancelBookings] = useState(true);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [visitOpen, setVisitOpen] = useState(false);
  const [visitDetails, setVisitDetails] = useState(null);
  const [visitDelete, setVisitDelete] = useState(null);

  useEffect(() => {
    setActiveTab("Overview");
    setMedicalSection("Veterinary Visits");
    setVaccineForm({ name: "", date: "", next: "" });
    setEditingVaccine(null);
    setMedicationForm({ name: "", dose: "", time: "", end: "" });
    setVisitForm({ date: "", provider: "", reason: "", diagnosis: "", treatment: "", notes: "" });
    setEditing(false);
    setDeleting(false);
    setRecordToDelete(null);
    setVisitOpen(false);
    setVisitDetails(null);
    setVisitDelete(null);
  }, [id]);

  if (!user) return <div className={`${card} mx-auto max-w-lg py-14 text-center`}><PawPrint size={30} className="mx-auto text-primary-600" /><h1 className="mt-4 text-2xl font-extrabold">{isRussian ? "Профиль питомца ожидает вас" : "Your pet profile is waiting"}</h1><p className="mt-2 text-sm text-ink-500">{isRussian ? "Войдите, чтобы посмотреть историю здоровья и приемов." : "Log in to view health details and care history."}</p><Link to="/login" state={{ from: `/pets/${id}` }} className={`${btn} mt-5`}>{t("nav.log_in")}</Link></div>;
  if (!pet) return <div className={`${card} py-14 text-center`}><h1 className="text-xl font-extrabold">{isRussian ? "Питомец не найден" : "Pet not found"}</h1><Link to="/pets" className={`${btn} mt-5`}>{isRussian ? "Назад к моим питомцам" : "Back to My Pets"}</Link></div>;

  const vaccines = pet.vaccines || [];
  const medications = pet.meds || [];
  const visits = pet.medicalVisits || [];
  const ageLabel = pet.age !== undefined && pet.age !== null && pet.age !== ""
    ? `${pet.age} ${isRussian ? (Number(pet.age) === 1 ? "год" : Number(pet.age) >= 2 && Number(pet.age) <= 4 ? "года" : "лет") : (Number(pet.age) === 1 ? "year" : "years")}`
    : (isRussian ? "Возраст не указан" : "Age not added");
  const hasWeight = pet.weight !== undefined && pet.weight !== null && pet.weight !== "";
  const today = new Date().toISOString().slice(0, 10);
  const pendingBookings = bookings.filter((booking) => String(booking.pet?.id) === String(pet.id) && booking.status === "Upcoming");
  const upcomingVaccines = vaccines.filter((vaccine) => vaccine.next && vaccine.next >= today).sort((a, b) => a.next.localeCompare(b.next));
  const petCalendarEvents = [
    ...calendarEvents.filter((event) => String(event.petId) === String(pet.id)).map((event) => ({ id: event.id, title: event.title, date: event.date, time: event.time, kind: event.type || (isRussian ? "Напоминание" : "Reminder") })),
    ...upcomingVaccines.map((vaccine) => ({ id: `vaccine-${pet.id}-${vaccine.id}`, petId: pet.id, vaccinationId: vaccine.id, title: vaccine.name, date: vaccine.next, time: "09:00", kind: isRussian ? "Вакцинация" : "Vaccination" })),
    ...pendingBookings.map((booking) => ({ id: `booking-${booking.id}`, title: booking.provider?.name || (isRussian ? "Запись" : "Appointment"), date: booking.date, time: booking.time, kind: isRussian ? "Прием" : "Appointment" })),
  ].sort((a, b) => `${a.date} ${a.time || ""}`.localeCompare(`${b.date} ${b.time || ""}`));
  const lastVisit = [...visits].sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  const profileTabs = [
    ["Overview", t("pets.overview"), UserRound],
    ["Medical Record", t("pets.medical_record"), FileHeart],
    ["Vaccinations", t("pets.vaccinations"), Syringe],
    ["Medications", t("pets.medications"), ClipboardPlus],
    ["Passport", t("pets.passport"), ShieldCheck],
    ["Calendar", t("pets.calendar"), CalendarDays],
  ];
  const medicalTabs = [
    ["Overview", t("pets.overview"), Activity],
    ["Veterinary Visits", t("pets.veterinary_visits"), CalendarDays],
    ["Vaccinations", t("pets.vaccinations"), Syringe],
    ["Medications", t("pets.medications"), ClipboardPlus],
    ["Health Summary", t("pets.health_summary"), FileHeart],
  ];

  const petTypeDisplay = isRussian ? (pet.type === "Dog" ? "Собака" : pet.type === "Cat" ? "Кошка" : pet.type === "Bird" ? "Птица" : pet.type) : pet.type;
  const petGenderDisplay = isRussian ? (pet.gender === "Male" ? "Самец" : pet.gender === "Female" ? "Самка" : "Не указан") : (pet.gender || "Gender not added");
  const petHealthDisplay = isRussian ? (pet.healthStatus === "Healthy" || !pet.healthStatus ? "Здоров" : pet.healthStatus === "Under treatment" ? "На лечении" : "Под наблюдением") : (pet.healthStatus || "Healthy");

  const basicInformation = [
    [isRussian ? "Вид" : "Type", petTypeDisplay],
    [isRussian ? "Порода" : "Breed", pet.breed],
    [isRussian ? "Возраст" : "Age", ageLabel === (isRussian ? "Возраст не указан" : "Age not added") ? "" : ageLabel],
    [isRussian ? "Пол" : "Gender", petGenderDisplay],
    [isRussian ? "Вес" : "Weight", hasWeight ? `${pet.weight} ${isRussian ? "кг" : "kg"}` : ""],
    [isRussian ? "Состояние здоровья" : "Health Status", petHealthDisplay],
  ].filter(([, value]) => value);
  const removePet = async () => {
    await deletePet(pet.id, { cancelBookings });
    setDeleting(false);
    showToast(`${pet.name} ${isRussian ? "был удален." : "was deleted."}`);
    navigate("/pets");
  };
  const removeRecord = async () => {
    if (recordToDelete.kind === "vaccine") await deleteVaccine(pet.id, recordToDelete.id);
    else await deleteMedication(pet.id, recordToDelete.index);
    showToast(`${recordToDelete.label} ${isRussian ? "удален(а)." : "deleted."}`);
    setRecordToDelete(null);
  };
  const saveVaccine = async (event) => {
    event.preventDefault();
    if (editingVaccine) {
      await updateVaccine(pet.id, editingVaccine, vaccineForm);
      showToast(isRussian ? "Вакцинация обновлена." : "Vaccination updated.");
    } else {
      await addVaccine(pet.id, vaccineForm);
      showToast(isRussian ? "Вакцинация добавлена." : "Vaccination added.");
    }
    setVaccineForm({ name: "", date: "", next: "" });
    setEditingVaccine(null);
  };
  const startEditingVaccine = (vaccine) => {
    setEditingVaccine(vaccine.id);
    setVaccineForm({ name: vaccine.name || "", date: vaccine.date || "", next: vaccine.next || "" });
  };
  const saveVisit = async (event) => {
    event.preventDefault();
    await addMedicalVisit(pet.id, visitForm);
    setVisitForm({ date: "", provider: "", reason: "", diagnosis: "", treatment: "", notes: "" });
    setVisitOpen(false);
    showToast(isRussian ? "Визит к ветеринару добавлен." : "Veterinary visit added.");
  };
  const formatDate = (date) => date ? new Date(`${date}T00:00:00`).toLocaleDateString(isRussian ? "ru-RU" : "en-US", { month: "short", day: "numeric", year: "numeric" }) : (isRussian ? "Не указано" : "Not recorded");
  const vaccineStatus = (next) => {
    if (!next) return [isRussian ? "Зафиксировано" : "Recorded", "bg-slate-100 text-slate-700"];
    if (next < today) return [isRussian ? "Просрочено" : "Overdue", "bg-red-50 text-danger-600"];
    const daysUntil = Math.ceil((new Date(`${next}T00:00:00`) - new Date(`${today}T00:00:00`)) / 86400000);
    return daysUntil <= 30 ? [isRussian ? "Скоро срок" : "Due soon", "bg-amber-50 text-amber-800"] : [isRussian ? "Запланировано" : "Scheduled", "bg-green-50 text-green-700"];
  };
  const medicationDetails = (medication) => [
    medication.dose && [isRussian ? "Дозировка" : "Dose", medication.dose],
    medication.frequency && [isRussian ? "Частота" : "Frequency", medication.frequency],
    medication.time && [isRussian ? "Время" : "Time", medication.time],
    (medication.startDate || medication.start) && [isRussian ? "Начало" : "Start", formatDate(medication.startDate || medication.start)],
    (medication.endDate || medication.end) && [isRussian ? "Окончание" : "End", formatDate(medication.endDate || medication.end)],
  ].filter(Boolean);
  const renderVaccinations = () => <div>
    <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary-700">{isRussian ? "История иммунизации" : "Immunization history"}</p><h2 className="mt-1 text-lg font-extrabold text-ink-900">{t("pets.vaccinations")}</h2><p className="mt-1 text-xs text-ink-500">{isRussian ? "Сведения о введенных дозах и плановых датах ревакцинации." : "Recorded doses and next scheduled dates."}</p></div><Link to="/calendar" className={`${btn2} min-h-9 px-3 text-xs`}><CalendarDays size={14} />{t("pets.calendar")}</Link></div>
    {vaccines.length ? <div className="mt-4 divide-y divide-stone-200">{vaccines.map((vaccine) => { const [status, statusClass] = vaccineStatus(vaccine.next); return <article key={vaccine.id} className="grid gap-3 py-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div className="flex min-w-0 gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700"><Syringe size={17} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-ink-900">{vaccine.name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>{status}</span></div><p className="mt-1 text-xs text-ink-500">{isRussian ? "Сделана" : "Given"} {formatDate(vaccine.date)}{vaccine.next ? ` · ${isRussian ? "Следующая" : "Next dose"} ${formatDate(vaccine.next)}` : ""}{(vaccine.clinic || vaccine.provider) ? ` · ${vaccine.clinic || vaccine.provider}` : ""}</p></div></div><div className="flex items-center justify-self-end"><button type="button" aria-label={`Edit vaccination ${vaccine.name}`} onClick={() => startEditingVaccine(vaccine)} className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-primary-50 hover:text-primary-700"><Pencil size={14} /></button><button type="button" aria-label={`Delete vaccination ${vaccine.name}`} onClick={() => setRecordToDelete({ kind: "vaccine", id: vaccine.id, label: vaccine.name })} className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-danger-600"><Trash2 size={14} /></button></div></article>; })}</div> : <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-ink-500">{t("pets.no_vaccines")}</p>}
    <form className="mt-4 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2" onSubmit={saveVaccine}><h3 className="text-sm font-bold text-ink-900 sm:col-span-2">{editingVaccine ? (isRussian ? "Редактировать прививку" : "Edit vaccination") : t("pets.add_vaccine")}</h3><label className="block text-xs font-semibold text-ink-700">{t("pets.vaccine_name")}<input required className={`${input} mt-1.5 min-h-10 text-sm`} value={vaccineForm.name} onChange={(event) => setVaccineForm((current) => ({ ...current, name: event.target.value }))} /></label><label className="block text-xs font-semibold text-ink-700">{t("pets.date_administered")}<input required type="date" className={`${input} mt-1.5 min-h-10 text-sm`} value={vaccineForm.date} onChange={(event) => setVaccineForm((current) => ({ ...current, date: event.target.value }))} /></label><label className="block text-xs font-semibold text-ink-700">{t("pets.next_due")}<input type="date" className={`${input} mt-1.5 min-h-10 text-sm`} value={vaccineForm.next} onChange={(event) => setVaccineForm((current) => ({ ...current, next: event.target.value }))} /></label><div className="flex items-end gap-2">{editingVaccine && <Button type="button" variant="secondary" size="sm" onClick={() => { setEditingVaccine(null); setVaccineForm({ name: "", date: "", next: "" }); }}>{t("common.cancel")}</Button>}<Button type="submit" variant="secondary" size="sm">{editingVaccine ? (isRussian ? "Обновить дозу" : "Update dose") : <><Plus size={14} />{isRussian ? "Сохранить прививку" : "Save dose"}</>}</Button></div></form>
  </div>;
  const renderMedications = () => <div>
    <div><p className="text-xs font-bold uppercase tracking-wide text-primary-700">{isRussian ? "График приема" : "Treatment schedule"}</p><h2 className="mt-1 text-lg font-extrabold text-ink-900">{t("pets.medications")}</h2><p className="mt-1 text-xs text-ink-500">{isRussian ? "Дозировка и время приема из назначений врача." : "Dosage and timing from the existing medication record."}</p></div>
    {medications.length ? <div className="mt-4 divide-y divide-stone-200">{medications.map((medication, index) => { const ended = (medication.endDate || medication.end) && (medication.endDate || medication.end) < today; const status = medication.status || (ended ? "Completed" : "Active"); const statusClass = status === "Active" ? "bg-green-50 text-green-700" : status === "Completed" || status === "Inactive" ? "bg-slate-100 text-slate-700" : "bg-primary-50 text-primary-800"; const statusDisplay = isRussian ? (status === "Active" ? "Активно" : status === "Completed" ? "Завершено" : "Неактивно") : status; return <article key={`${medication.name}-${index}`} className="flex items-start justify-between gap-3 py-4"><div className="flex min-w-0 gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><ClipboardPlus size={17} /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-ink-900">{medication.name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusClass}`}>{statusDisplay}</span></div><dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">{medicationDetails(medication).map(([label, value]) => <div key={label}><dt className="inline text-ink-500">{label}: </dt><dd className="inline text-ink-700">{value}</dd></div>)}</dl></div></div><button type="button" aria-label={`Delete medication ${medication.name}`} onClick={() => setRecordToDelete({ kind: "medication", index, label: medication.name })} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-danger-600"><Trash2 size={14} /></button></article>; })}</div> : <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-ink-500">{t("pets.no_meds")}</p>}
    <form className="mt-4 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); await addMedication(pet.id, medicationForm); setMedicationForm({ name: "", dose: "", time: "", end: "" }); showToast(isRussian ? "Лекарство добавлено." : "Medication added."); }}><h3 className="text-sm font-bold text-ink-900 sm:col-span-2">{t("pets.add_medication")}</h3><label className="block text-xs font-semibold text-ink-700">{isRussian ? "Название лекарства" : "Medicine name"}<input required className={`${input} mt-1.5 min-h-10 text-sm`} value={medicationForm.name} onChange={(event) => setMedicationForm((current) => ({ ...current, name: event.target.value }))} /></label><label className="block text-xs font-semibold text-ink-700">{t("pets.dose")}<input className={`${input} mt-1.5 min-h-10 text-sm`} value={medicationForm.dose} onChange={(event) => setMedicationForm((current) => ({ ...current, dose: event.target.value }))} /></label><label className="block text-xs font-semibold text-ink-700">{t("pets.time_frequency")}<input type="time" className={`${input} mt-1.5 min-h-10 text-sm`} value={medicationForm.time} onChange={(event) => setMedicationForm((current) => ({ ...current, time: event.target.value }))} /></label><label className="block text-xs font-semibold text-ink-700">{t("pets.end_date")}<input type="date" className={`${input} mt-1.5 min-h-10 text-sm`} value={medicationForm.end} onChange={(event) => setMedicationForm((current) => ({ ...current, end: event.target.value }))} /></label><div className="flex items-end"><Button type="submit" variant="secondary" size="sm"><Plus size={14} />{isRussian ? "Сохранить лекарство" : "Save medication"}</Button></div></form>
  </div>;

  return <div className="grid min-w-0 grid-cols-1 items-stretch gap-5 lg:grid-cols-[232px_minmax(0,1fr)] lg:gap-6">
    <aside aria-label="Pet profile navigation" className="flex min-w-0 flex-col rounded-2xl border border-stone-200 bg-white p-3 shadow-sm sm:p-4 lg:sticky lg:top-24 lg:min-h-[calc(100vh-190px)] lg:self-start lg:p-4">
      <div className="mb-4 rounded-xl bg-primary-50 px-3 py-3">
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-primary-700">{isRussian ? "Профили питомцев" : "Pet profiles"}</p>
        <h2 className="mt-1 text-base font-extrabold text-ink-900">{isRussian ? "Ваши питомцы" : "Your Pets"}</h2>
        <p className="mt-0.5 text-xs text-ink-500">{isRussian ? "Выберите профиль для просмотра" : "Choose a profile to view"}</p>
      </div>
      <nav aria-label="Pets" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
        {pets.map((sidebarPet) => {
          const isSelected = sidebarPet.id === pet.id;
          return <Link key={sidebarPet.id} to={`/pets/${sidebarPet.id}`} aria-current={isSelected ? "page" : undefined} className={`flex min-w-[190px] items-center gap-3 rounded-xl border p-2.5 transition-colors lg:min-w-0 ${isSelected ? "border-primary-300 bg-primary-50 text-primary-900 shadow-sm ring-1 ring-primary-100" : "border-transparent text-ink-700 hover:border-stone-200 hover:bg-slate-50"}`}>
            <PetAvatar name={sidebarPet.name} photo={sidebarPet.photo} className="size-11 border border-white shadow-sm" iconSize={13} alt={`${sidebarPet.name}, ${sidebarPet.type}`} />
            <span className="min-w-0"><span className={`block truncate text-sm ${isSelected ? "font-extrabold" : "font-semibold"}`}>{sidebarPet.name}</span><span className="mt-0.5 block truncate text-xs text-ink-500">{sidebarPet.breed || sidebarPet.type}</span></span>
            {isSelected && <span aria-hidden="true" className="ms-auto size-2 shrink-0 rounded-full bg-primary-600" />}
          </Link>;
        })}
      </nav>
      <Link to="/pets/new" className="mt-3 flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-primary-300 bg-primary-50/50 px-3 text-sm font-bold text-primary-800 transition hover:border-primary-500 hover:bg-primary-50 lg:mt-auto lg:justify-start"><Plus size={17} />{t("pets.add_new_pet")}</Link>
    </aside>

    <section className="min-w-0">
      <header className="relative mb-5 flex min-w-0 flex-col gap-4 overflow-hidden rounded-2xl border border-primary-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5 lg:min-h-[188px] lg:p-6">
        <div aria-hidden="true" className="absolute inset-y-0 left-0 w-1.5 bg-primary-600" />
        <div className="size-28 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-primary-50 shadow-md ring-1 ring-primary-100 sm:size-32 lg:size-36"><PetAvatar name={pet.name} photo={pet.photo} className="size-full !rounded-xl" iconSize={30} alt={`${pet.name}, ${pet.type}`} /></div>
        <div className="min-w-0 flex-1 py-1"><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-primary-700">{petTypeDisplay}{pet.breed ? ` · ${pet.breed}` : ""}</p><h1 className="mt-1 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{pet.name}</h1><p className="mt-2 text-sm font-medium text-ink-500">{pet.breed ? `${pet.breed} · ` : ""}{ageLabel} <span aria-hidden="true" className="px-1 text-primary-500">•</span> {petGenderDisplay}</p><span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${pet.healthStatus === "Healthy" || !pet.healthStatus ? "bg-green-50 text-green-700" : pet.healthStatus === "Under treatment" ? "bg-red-50 text-danger-600" : "bg-amber-50 text-amber-800"}`}><Activity size={14} />{petHealthDisplay}</span></div>
        <div className="flex w-full shrink-0 items-center justify-between gap-3 sm:w-auto sm:flex-col sm:items-end sm:justify-center"><Button type="button" size="sm" onClick={() => setEditing(true)} className="min-h-10 px-4"><Pencil size={15} />{t("pets.edit_pet")}</Button><button type="button" aria-label={`Delete ${pet.name}`} title={t("pets.delete_pet")} onClick={() => { setCancelBookings(true); setDeleting(true); }} className="grid size-9 place-items-center rounded-lg border border-stone-200 text-ink-500 transition hover:border-red-200 hover:bg-red-50 hover:text-danger-600"><Trash2 size={15} /></button></div>
      </header>

      <nav role="tablist" aria-label="Pet profile sections" className="mb-5 flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-white p-1.5 shadow-sm">
        {profileTabs.map(([key, label, Icon]) => <button key={key} type="button" role="tab" aria-selected={activeTab === key} onClick={() => setActiveTab(key)} className={`relative inline-flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition ${activeTab === key ? "bg-primary-50 text-primary-800 after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-full after:bg-primary-600" : "text-ink-600 hover:bg-slate-50 hover:text-ink-900"}`}><Icon size={16} />{label}</button>)}
      </nav>

    {activeTab === "Overview" && <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(300px,.9fr)_minmax(0,1.1fr)]">
      <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary-700">{isRussian ? "Краткая информация" : "At a glance"}</p><h2 className="mt-1 text-xl font-extrabold text-ink-900">{isRussian ? "Основная информация" : "Basic Information"}</h2></div><span className="grid size-10 place-items-center rounded-xl bg-primary-50 text-primary-700"><UserRound size={19} /></span></div>
        <dl className="mt-2 divide-y divide-stone-100">{basicInformation.map(([label, value]) => <div key={label} className="grid grid-cols-[minmax(95px,.75fr)_minmax(0,1.25fr)] items-center gap-3 py-3"><dt className="text-xs font-semibold text-ink-500 sm:text-sm">{label}</dt><dd className="break-words text-sm font-bold text-ink-900">{value}</dd></div>)}</dl>
        {pet.notes && <div className="mt-3 rounded-xl bg-slate-50 p-4"><h3 className="text-xs font-bold uppercase tracking-wide text-ink-500">{isRussian ? "Заметки" : "Notes"}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-700">{pet.notes}</p></div>}
      </section>

      <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start justify-between gap-3 border-b border-stone-100 pb-4"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-primary-700">{isRussian ? "Фотографии питомца" : "Saved profile images"}</p><h2 className="mt-1 text-xl font-extrabold text-ink-900">{isRussian ? "Фотогалерея" : "Photo Gallery"}</h2></div>{pet.photo && <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-bold text-primary-800">{isRussian ? "1 фото" : "1 photo"}</span>}</div>
          <div className="mt-4 h-64 overflow-hidden rounded-xl border border-stone-100 bg-slate-50 sm:h-[300px]">
            <PetAvatar name={pet.name} photo={pet.photo} className="h-full w-full !rounded-xl" iconSize={34} alt={`${pet.name}, ${pet.type}`} />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs leading-5 text-ink-500">{pet.photo ? (isRussian ? "Основное фото, сохраненное в профиле." : "Primary photo saved to this pet profile.") : (isRussian ? "Фото пока не добавлено. Нажмите 'Редактировать', чтобы загрузить." : "No photo saved yet. Add one using Edit Pet.")}</p>{pet.photo && <span className="shrink-0 text-xs font-semibold text-ink-500">{isRussian ? "Основное" : "Primary"}</span>}</div>
      </section>
    </div>}

    {activeTab === "Vaccinations" && <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">{renderVaccinations()}</section>}
    {activeTab === "Medications" && <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">{renderMedications()}</section>}

    {activeTab === "Medical Record" && <div className="grid items-start gap-5 lg:grid-cols-[208px_minmax(0,1fr)]">
      <nav aria-label="Medical record sections" className="flex gap-1 overflow-x-auto rounded-xl border border-stone-200 bg-white p-2 lg:sticky lg:top-24 lg:flex-col lg:gap-1">
        {medicalTabs.map(([key, label, Icon]) => <button key={key} type="button" aria-current={medicalSection === key ? "page" : undefined} onClick={() => setMedicalSection(key)} className={`inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg px-3 text-left text-xs font-semibold transition lg:w-full ${medicalSection === key ? "bg-primary-50 text-primary-800" : "text-ink-600 hover:bg-slate-50 hover:text-ink-900"}`}><Icon size={15} />{label}</button>)}
      </nav>
      <section className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5">
        {medicalSection === "Overview" && <div><p className="text-xs font-bold uppercase tracking-wide text-primary-700">{isRussian ? "Клинический обзор" : "Clinical overview"}</p><h2 className="mt-1 text-lg font-extrabold text-ink-900">{isRussian ? `Медицинская карта: ${pet.name}` : `${pet.name}'s Medical Record`}</h2><div className="mt-4 grid gap-3 sm:grid-cols-3"><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-ink-500">{t("pets.veterinary_visits")}</span><b className="mt-1 block text-lg text-ink-900">{visits.length}</b></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-ink-500">{t("pets.vaccinations")}</span><b className="mt-1 block text-lg text-ink-900">{vaccines.length}</b></div><div className="rounded-xl bg-slate-50 p-3"><span className="text-xs text-ink-500">{t("pets.medications")}</span><b className="mt-1 block text-lg text-ink-900">{medications.length}</b></div></div><div className="mt-5 rounded-xl border border-stone-100 p-4"><h3 className="text-sm font-bold text-ink-900">{isRussian ? "Текущее здоровье" : "Current health"}</h3><p className="mt-2 text-sm text-ink-600">{petHealthDisplay}{pet.weight ? ` · ${pet.weight} ${isRussian ? "кг" : "kg"}` : ""}</p>{pet.notes && <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-500">{pet.notes}</p>}</div></div>}

        {medicalSection === "Veterinary Visits" && <div>
          <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary-700">{isRussian ? "История посещений" : "Visit history"}</p><h2 className="mt-1 text-lg font-extrabold text-ink-900">{t("pets.veterinary_visits")}</h2><p className="mt-1 text-xs text-ink-500">{isRussian ? `Диагнозы, назначения и заметки по ${pet.name}.` : `Diagnoses, treatments, and notes recorded for ${pet.name}.`}</p></div><Button type="button" size="sm" onClick={() => setVisitOpen(true)}><Plus size={15} />{t("pets.add_visit")}</Button></div>
          {visits.length ? <div className="relative mt-5 space-y-3 before:absolute before:bottom-6 before:left-[18px] before:top-5 before:w-px before:bg-primary-100">{[...visits].sort((a, b) => String(b.date).localeCompare(String(a.date))).map((visit) => <article key={visit.id} className="relative grid grid-cols-[60px_minmax(0,1fr)] gap-3"><div className="pt-1 text-right"><time className="text-[11px] font-semibold text-ink-500">{formatDate(visit.date)}</time></div><div className="relative rounded-xl border border-stone-200 bg-white p-3.5 before:absolute before:-left-[24px] before:top-4 before:size-2.5 before:rounded-full before:border-2 before:border-white before:bg-primary-600 before:ring-2 before:ring-primary-100"><div className="flex flex-wrap items-start justify-between gap-2"><div><h3 className="text-sm font-bold text-ink-900">{visit.reason || (isRussian ? "Визит к ветеринару" : "Veterinary visit")}</h3><p className="mt-1 text-xs text-ink-500">{visit.provider || (isRussian ? "Клиника не указана" : "Provider not recorded")}{visit.veterinarian ? ` · ${visit.veterinarian}` : ""}</p></div><div className="flex gap-1"><button type="button" onClick={() => setVisitDetails(visit)} className="rounded-md px-2 py-1 text-xs font-semibold text-primary-700 hover:bg-primary-50">{isRussian ? "Детали" : "View details"}</button><button type="button" aria-label={`Delete visit ${visit.reason || "record"}`} onClick={() => setVisitDelete(visit)} className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-danger-600"><Trash2 size={14} /></button></div></div>{visit.diagnosis && <p className="mt-2 text-xs leading-5 text-ink-600"><b>{isRussian ? "Диагноз:" : "Diagnosis:"}</b> {visit.diagnosis}</p>}{visit.treatment && <p className="mt-1 text-xs leading-5 text-ink-600"><b>{isRussian ? "Лечение:" : "Treatment:"}</b> {visit.treatment}</p>}</div></article>)}</div> : <div className="mt-5 rounded-xl border border-dashed border-stone-300 bg-slate-50 px-5 py-12 text-center"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-white text-primary-700"><CalendarDays size={20} /></span><h3 className="mt-3 text-sm font-bold text-ink-900">{t("pets.no_visits")}</h3><p className="mt-1 text-xs text-ink-500">{isRussian ? "Запишите визит, чтобы сохранить диагноз и план лечения." : "Add a visit to keep diagnoses and treatment history together."}</p><Button type="button" size="sm" className="mt-4" onClick={() => setVisitOpen(true)}><Plus size={14} />{t("pets.add_visit")}</Button></div>}
        </div>}

        {medicalSection === "Vaccinations" && renderVaccinations()}

        {medicalSection === "Medications" && <div>
          <div><p className="text-xs font-bold uppercase tracking-wide text-primary-700">{isRussian ? "График лечения" : "Treatment schedule"}</p><h2 className="mt-1 text-lg font-extrabold text-ink-900">{t("pets.medications")}</h2><p className="mt-1 text-xs text-ink-500">{isRussian ? "Дозировка и время приема из назначений." : "Dosage and timing from the existing medication record."}</p></div>
          {medications.length ? <div className="mt-4 divide-y divide-stone-200">{medications.map((medication, index) => { const ended = medication.end && medication.end < today; const statusDisplay = isRussian ? (ended ? "Завершено" : "Активно") : (ended ? "Completed" : "Active"); return <article key={`${medication.name}-${index}`} className="flex items-start justify-between gap-3 py-4"><div className="flex min-w-0 gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700"><ClipboardPlus size={17} /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-bold text-ink-900">{medication.name}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${ended ? "bg-slate-100 text-slate-700" : "bg-green-50 text-green-700"}`}>{statusDisplay}</span></div><dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">{medicationDetails(medication).map(([label, value]) => <div key={label}><dt className="inline text-ink-500">{label}: </dt><dd className="inline text-ink-700">{value}</dd></div>)}</dl></div></div><button type="button" aria-label={`Delete medication ${medication.name}`} onClick={() => setRecordToDelete({ kind: "medication", index, label: medication.name })} className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-danger-600"><Trash2 size={14} /></button></article>; })}</div> : <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-ink-500">{t("pets.no_meds")}</p>}
          <form className="mt-4 grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-2" onSubmit={async (event) => { event.preventDefault(); await addMedication(pet.id, medicationForm); setMedicationForm({ name: "", dose: "", time: "", end: "" }); showToast(isRussian ? "Лекарство добавлено." : "Medication added."); }}><h3 className="text-sm font-bold text-ink-900 sm:col-span-2">{t("pets.add_medication")}</h3><label className="block text-xs font-semibold text-ink-700">{isRussian ? "Название лекарства" : "Medicine name"}<input required className={`${input} mt-1.5 min-h-10 text-sm`} value={medicationForm.name} onChange={(event) => setMedicationForm((current) => ({ ...current, name: event.target.value }))} /></label><label className="block text-xs font-semibold text-ink-700">{t("pets.dose")}<input className={`${input} mt-1.5 min-h-10 text-sm`} value={medicationForm.dose} onChange={(event) => setMedicationForm((current) => ({ ...current, dose: event.target.value }))} /></label><label className="block text-xs font-semibold text-ink-700">{t("pets.time_frequency")}<input type="time" className={`${input} mt-1.5 min-h-10 text-sm`} value={medicationForm.time} onChange={(event) => setMedicationForm((current) => ({ ...current, time: event.target.value }))} /></label><label className="block text-xs font-semibold text-ink-700">{t("pets.end_date")}<input type="date" className={`${input} mt-1.5 min-h-10 text-sm`} value={medicationForm.end} onChange={(event) => setMedicationForm((current) => ({ ...current, end: event.target.value }))} /></label><div className="flex items-end"><Button type="submit" variant="secondary" size="sm"><Plus size={14} />{isRussian ? "Сохранить лекарство" : "Save medication"}</Button></div></form>
        </div>}

        {medicalSection === "Health Summary" && <div><p className="text-xs font-bold uppercase tracking-wide text-primary-700">{isRussian ? "Текущее здоровье" : "Current health"}</p><h2 className="mt-1 text-lg font-extrabold text-ink-900">{t("pets.health_summary")}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-xl border border-stone-100 p-4"><span className="text-xs text-ink-500">{isRussian ? "Общий статус" : "Overall status"}</span><b className="mt-1 block text-sm text-ink-900">{petHealthDisplay}</b></div>{pet.weight && <div className="rounded-xl border border-stone-100 p-4"><span className="text-xs text-ink-500">{isRussian ? "Вес" : "Weight"}</span><b className="mt-1 block text-sm text-ink-900">{pet.weight} {isRussian ? "кг" : "kg"}</b></div>}<div className="rounded-xl border border-stone-100 p-4"><span className="text-xs text-ink-500">{isRussian ? "Последний визит" : "Latest visit"}</span><b className="mt-1 block text-sm text-ink-900">{lastVisit ? `${formatDate(lastVisit.date)} · ${lastVisit.provider || (isRussian ? "Клиника не указана" : "Clinic not recorded")}` : (isRussian ? "Визиты не записаны" : "No visit recorded")}</b></div><div className="rounded-xl border border-stone-100 p-4"><span className="text-xs text-ink-500">{t("pets.vaccinations")}</span><b className="mt-1 block text-sm text-ink-900">{vaccines.length} {isRussian ? "записано" : "recorded"}</b></div></div><div className="mt-4 rounded-xl bg-slate-50 p-4"><h3 className="text-sm font-bold text-ink-900">{isRussian ? "Заметки" : "Notes"}</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-ink-600">{pet.notes || (isRussian ? "Заметок о здоровье нет." : "No health notes added.")}</p></div></div>}
      </section>
    </div>}

    {activeTab === "Calendar" && <section className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary-700">{isRussian ? "График ухода" : "Care schedule"}</p><h2 className="mt-1 text-lg font-extrabold text-ink-900">{isRussian ? `Календарь: ${pet.name}` : `${pet.name}'s Calendar`}</h2><p className="mt-1 text-xs text-ink-500">{isRussian ? "Напоминания, вакцинации и запланированные визиты." : "Existing reminders, upcoming vaccines, and appointments."}</p></div><Link to="/calendar" className={btn2}><CalendarDays size={15} />{isRussian ? "Открыть календарь" : "Open Calendar"}</Link></div>{petCalendarEvents.length ? <div className="mt-4 divide-y divide-stone-100">{petCalendarEvents.map((event) => <div key={event.id} className="flex items-center gap-3 py-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700"><CalendarDays size={15} /></span><div className="min-w-0 flex-1"><b className="block truncate text-sm text-ink-900">{event.title}</b><span className="mt-1 block text-xs text-ink-500">{event.kind} · {formatDate(event.date)}{event.time ? ` · ${event.time}` : ""}</span></div></div>)}</div> : <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm text-ink-500">{isRussian ? `Нет запланированных событий для ${pet.name}.` : `No upcoming calendar items for ${pet.name}.`}</p>}</section>}

    {activeTab === "Passport" && <div className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-primary-800 px-5 py-4 text-white"><span className="flex items-center gap-2 text-sm font-bold"><ShieldCheck size={18} />{isRussian ? "Цифровой ветпаспорт PetCare" : "PetCare Digital Passport"}</span><span className="text-xs text-white/75">PET-{String(pet.id).slice(-6)}</span></div>
      <div className="grid gap-5 p-4 sm:grid-cols-[128px_minmax(0,1fr)] sm:p-6">
        <div className="h-32 w-32 overflow-hidden rounded-xl bg-slate-100"><PetAvatar name={pet.name} photo={pet.photo} className="size-full !rounded-xl" iconSize={25} alt={`${pet.name}, ${pet.type}`} /></div>
        <div><p className="text-xs font-bold uppercase tracking-wide text-primary-700">{isRussian ? "Идентификация питомца" : "Pet identity"}</p><h2 className="mt-1 text-2xl font-extrabold text-ink-900">{pet.name}</h2><p className="mt-1 text-sm text-ink-500">{petTypeDisplay}{pet.breed ? ` · ${pet.breed}` : ""}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 border-y border-stone-100 py-3 text-sm"><div><span className="block text-xs text-ink-500">{isRussian ? "Возраст" : "Age"}</span><b className="mt-1 block">{pet.age} {isRussian ? (pet.age === 1 ? "год" : pet.age >= 2 && pet.age <= 4 ? "года" : "лет") : "years"}</b></div><div><span className="block text-xs text-ink-500">{isRussian ? "Пол" : "Gender"}</span><b className="mt-1 block">{petGenderDisplay}</b></div></div>
          <div className="mt-4 grid gap-1 text-xs text-ink-600"><p><b>{isRussian ? "Владелец:" : "Owner:"}</b> {user.name || (isRussian ? "Владелец питомца" : "Pet parent")}</p><p><b>{isRussian ? "Контакты:" : "Contact:"}</b> {user.phone || user.email || (isRussian ? "Не указаны" : "Not added")}</p><p><b>{isRussian ? "Город:" : "City:"}</b> {user.city || (isRussian ? "Не указан" : "Not added")}</p><p><b>{isRussian ? "Здоровье:" : "Health:"}</b> {petHealthDisplay}</p>{hasWeight && <p><b>{isRussian ? "Вес:" : "Weight:"}</b> {pet.weight} {isRussian ? "кг" : "kg"}</p>}{medications.length > 0 && <p><b>{isRussian ? "Текущие лекарства:" : "Current medications:"}</b> {medications.map((medication) => `${medication.name}${medication.dose ? ` (${medication.dose})` : ""}${medication.time ? ` · ${medication.time}` : ""}`).join(", ")}</p>}</div>
        </div>
      </div>
      <div className="flex justify-end border-t border-stone-100 p-4"><Button type="button" variant="secondary" size="sm" onClick={() => window.print()}><Printer size={15} />{isRussian ? "Распечатать или сохранить PDF" : "Print or save PDF"}</Button></div>
    </div>}

    <PetFormModal pet={editing ? pet : null} onClose={() => setEditing(false)} onSaved={(name) => { setEditing(false); showToast(`${name} ${isRussian ? "был обновлен." : "was updated."}`); }} />
    <Modal open={deleting} onClose={() => setDeleting(false)} title={isRussian ? `Удалить ${pet.name}?` : `Delete ${pet.name}?`}><p className="text-sm leading-6 text-ink-500">{t("pets.delete_pet_desc")}</p>{pendingBookings.length > 0 && <label className="mt-4 flex items-start gap-3 rounded-xl bg-amber-50 p-4 text-sm text-ink-700"><input type="checkbox" className="mt-1 accent-primary-600" checked={cancelBookings} onChange={(event) => setCancelBookings(event.target.checked)} />{isRussian ? `Отменить ${pendingBookings.length} предстоящих записей` : `Cancel ${pendingBookings.length} upcoming booking(s) too`}</label>}<div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeleting(false)}>{t("pets.keep_pet")}</Button><Button type="button" variant="danger" onClick={removePet}><Trash2 size={15} />{t("pets.delete_pet")}</Button></div></Modal>
    <Modal open={visitOpen} onClose={() => setVisitOpen(false)} title={t("pets.add_visit")}><form className="space-y-3" onSubmit={saveVisit}><label className="block text-xs font-semibold text-ink-700">{t("pets.date_administered")}<input required type="date" className={`${input} mt-1.5`} value={visitForm.date} onChange={(event) => setVisitForm((current) => ({ ...current, date: event.target.value }))} /></label>{[["provider", t("pets.provider")], ["reason", t("pets.reason")], ["diagnosis", t("pets.diagnosis")], ["treatment", t("pets.treatment")], ["notes", t("pets.notes")]].map(([key, label]) => <label key={key} className="block text-xs font-semibold text-ink-700">{label}{key === "notes" ? <textarea rows="2" className={`${input} mt-1.5`} value={visitForm[key]} onChange={(event) => setVisitForm((current) => ({ ...current, [key]: event.target.value }))} /> : <input required={key === "provider" || key === "reason"} className={`${input} mt-1.5`} value={visitForm[key]} onChange={(event) => setVisitForm((current) => ({ ...current, [key]: event.target.value }))} />}</label>)}<div className="flex justify-end"><Button type="submit">{isRussian ? "Сохранить визит" : "Save visit"}</Button></div></form></Modal>
    <Modal open={Boolean(visitDetails)} onClose={() => setVisitDetails(null)} title={isRussian ? "Детали визита к ветеринару" : "Veterinary Visit Details"}>{visitDetails && <div className="space-y-3 text-sm"><p><b>{t("pets.date_administered")}:</b> {formatDate(visitDetails.date)}</p><p><b>{t("pets.provider")}:</b> {visitDetails.provider || (isRussian ? "Не указана" : "Not recorded")}</p>{visitDetails.veterinarian && <p><b>{isRussian ? "Врач:" : "Veterinarian:"}</b> {visitDetails.veterinarian}</p>}<p><b>{t("pets.reason")}:</b> {visitDetails.reason || (isRussian ? "Не указана" : "Not recorded")}</p><p><b>{t("pets.diagnosis")}:</b> {visitDetails.diagnosis || (isRussian ? "Не указан" : "Not recorded")}</p><p><b>{t("pets.treatment")}:</b> {visitDetails.treatment || (isRussian ? "Не указано" : "Not recorded")}</p><p><b>{t("pets.notes")}:</b> {visitDetails.notes || (isRussian ? "Нет" : "None")}</p></div>}</Modal>
    <Modal open={Boolean(visitDelete)} onClose={() => setVisitDelete(null)} title={isRussian ? "Удалить этот визит?" : "Delete this visit?"}><p className="text-sm text-ink-500">{isRussian ? `Этот визит будет удален из истории болезни ${pet.name}.` : `This visit will be removed from ${pet.name}'s medical history.`}</p><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setVisitDelete(null)}>{isRussian ? "Оставить запись" : "Keep visit"}</Button><Button type="button" variant="danger" onClick={async () => { await deleteMedicalVisit(pet.id, visitDelete.id); setVisitDelete(null); showToast(isRussian ? "Визит удален." : "Visit deleted."); }}>{isRussian ? "Удалить визит" : "Delete visit"}</Button></div></Modal>
    <Modal open={Boolean(recordToDelete)} onClose={() => setRecordToDelete(null)} title={isRussian ? `Удалить ${recordToDelete?.label || "запись"}?` : `Delete ${recordToDelete?.label || "record"}?`}><p className="text-sm text-ink-500">{isRussian ? `Эта запись будет удалена из медицинской карты ${pet.name}.` : `This record will be removed from ${pet.name}'s medical history.`}</p><div className="mt-5 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setRecordToDelete(null)}>{isRussian ? "Оставить запись" : "Keep record"}</Button><Button type="button" variant="danger" onClick={removeRecord}><Trash2 size={15} />{isRussian ? "Удалить запись" : "Delete record"}</Button></div></Modal>
    </section>
  </div>;
}
