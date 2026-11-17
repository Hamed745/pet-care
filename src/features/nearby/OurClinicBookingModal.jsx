import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock3, MapPin, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import { Modal } from "../../components/ui.jsx";
import { useApp } from "../../store.jsx";
import { useLanguage } from "../../i18n/LanguageContext.jsx";
import { clinicApi } from "../../services/clinicApi.js";

// This is the Our Services booking modal only. Public 2GIS business cards keep
// their own PlaceDetailsModal and never claim bookings are handled by PetCare.
export default function OurClinicBookingModal({ place, onClose, onBooked }) {
  const { user, pets } = useApp();
  const { isRussian } = useLanguage();
  const tr = (en, ru) => isRussian ? ru : en;
  const clinic = place?.clinic;
  const [doctors,setDoctors] = useState([]);
  const [loadingDoctors,setLoadingDoctors] = useState(false);
  const [doctorError,setDoctorError] = useState("");
  const [form,setForm] = useState({petId:"",serviceId:"",doctorId:"",date:"",time:"",contactPhone:"",notes:""});
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const requestId = useRef(null);
  const ownedPets = useMemo(() => pets.filter(p => Boolean(user?.uid) && p.ownerUid === user.uid),[pets,user?.uid]);
  const availableServices = (clinic?.services || []).filter(s => s.available !== false);
  const update = field => event => setForm(old => ({...old,[field]:event.target.value}));
  useEffect(() => {
    if (!clinic?.id) { setDoctors([]);return; }
    let active=true;
    const controller=new AbortController();
    setDoctors([]);setDoctorError("");setLoadingDoctors(true);setError("");
    setForm({petId:"",serviceId:"",doctorId:"",date:"",time:"",
      contactPhone:user?.phone || user?.phoneNumber || "",notes:""});
    requestId.current=crypto.randomUUID();
    clinicApi.doctors(clinic.id).then(value => {
      if(active)setDoctors(Array.isArray(value.doctors) ? value.doctors : []);
    }).catch(() => {
      if(active)setDoctorError(tr("Doctor list is currently unavailable. You can request the clinic to assign a doctor.",
        "Список врачей сейчас недоступен. Клиника может назначить врача."));
    }).finally(() => {if(active)setLoadingDoctors(false);});
    return () => { active=false;controller.abort();};
  },[clinic?.id,user?.uid]);

  if (!clinic) return null;
  const tz=clinic.timeZone || "Europe/Moscow";
  const todayParts=new Intl.DateTimeFormat("en-GB",{timeZone:tz,year:"numeric",month:"2-digit",day:"2-digit"})
    .formatToParts(new Date());
  const today=Object.fromEntries(todayParts.map(p=>[p.type,p.value]));
  const minimumDate=today.year+"-"+today.month+"-"+today.day;
  const canBook=Boolean(user && ownedPets.length && availableServices.length && clinic.workingHours);
  const inputClass="mt-1.5 min-h-11 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-primary-600";
  const submit=async(event)=>{
    event.preventDefault();
    if(busy || !canBook)return;
    setBusy(true);setError("");
    try{
      const pet=ownedPets.find(p=>String(p.id)===form.petId);
      const service=availableServices.find(s=>s.id===form.serviceId);
      if(!pet || !service)throw Error(tr("Choose your pet and a clinic service.","Выберите питомца и услугу клиники."));
      await clinicApi.syncPet(pet);
      await clinicApi.book(clinic.id,{
        ...form,requestId:requestId.current || crypto.randomUUID(),
      });
      requestId.current=crypto.randomUUID();
      onBooked?.(clinic);
      onClose?.();
    }catch(err){setError(err.message||tr("Could not send your request.","Не удалось отправить заявку."));}
    finally{setBusy(false);}
  };
  return <Modal open={Boolean(place)} onClose={onClose} title={clinic.name}
    className="max-w-2xl max-h-[90vh] overflow-y-auto">
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-800">
          <ShieldCheck size={14}/>{tr("Approved PetCare clinic","Одобренная клиника PetCare")}
        </span>
        <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-800">
          {tr("Book a clinic appointment","Запись на приём")}
        </span>
      </div>
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
        <p className="flex items-start gap-2 text-sm font-semibold text-ink-800"><MapPin size={17} className="shrink-0 text-primary-700"/>{[clinic.address,clinic.city].filter(Boolean).join(", ")}</p>
        <p className="mt-2 text-xs text-ink-600">{clinic.description || tr("Verified veterinary care","Проверенная ветеринарная помощь")}</p>
        {clinic.phone && <p className="mt-2 text-xs text-ink-600">{tr("Clinic phone: ","Телефон клиники: ")}{clinic.phone}</p>}
        {clinic.mapUrl && <a className="mt-2 inline-block text-xs font-bold text-primary-700 underline" href={clinic.mapUrl}
          target="_blank" rel="noopener noreferrer">{tr("Open clinic location","Открыть местоположение клиники")}</a>}
      </div>
      <div className="space-y-1">
        <h3 className="flex items-center gap-2 text-sm font-extrabold text-ink-900"><Stethoscope size={17} className="text-primary-700"/>{tr("Services and prices","Услуги и цены")}</h3>
        {availableServices.length ? availableServices.map(s=><p key={s.id} className="flex justify-between gap-3 border-b border-stone-100 py-2 text-sm">
          <span>{s.name} · {s.durationMinutes} min</span><strong className="shrink-0">{s.price} {clinic.currency||"RUB"}</strong>
        </p>):<p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{tr("This clinic has not published bookable services yet.","Клиника пока не добавила услуги для записи.")}</p>}
      </div>
      {!user && <p className="rounded-xl bg-primary-50 p-4 text-sm text-ink-800">
        {tr("Sign in as a pet owner to request an appointment.","Войдите как владелец питомца, чтобы записаться.")}
        {" "}<Link className="font-bold underline text-primary-700" to="/login" state={{from:"/nearby/our/veterinary"}}>{tr("Sign in","Войти")}</Link>
      </p>}
      {user && availableServices.length===0 && <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        {tr("Booking cannot be submitted until the clinic manager publishes at least one service in Services & pricing. Other form fields remain editable.", "Запись нельзя отправить, пока менеджер клиники не опубликует услугу в разделе «Услуги и цены». Остальные поля доступны для заполнения.")}
      </p>}
      {user && !ownedPets.length && <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        {tr("Add your pet before requesting an appointment.","Добавьте питомца перед записью.")}
        {" "}<Link className="font-bold underline" to="/pets/new">{tr("Add a pet","Добавить питомца")}</Link>
      </p>}
      {user && <form onSubmit={submit} className="space-y-4 border-t border-stone-200 pt-4">
        <h3 className="flex items-center gap-2 text-base font-extrabold"><CalendarDays size={18}/>{tr("Request an appointment","Заявка на приём")}</h3>
        <p className="text-xs text-ink-600">{tr("The clinic manager will review your request and confirm or suggest a time. No payment is collected.","Менеджер клиники проверит заявку и подтвердит или предложит время. Оплата не взимается.")}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-xs font-bold">{tr("Your pet","Ваш питомец")}
            <select className={inputClass} required disabled={busy} value={form.petId} onChange={update("petId")}>
              <option value="">{tr("Choose pet","Выберите питомца")}</option>
              {ownedPets.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold">{tr("Service","Услуга")}
            <select className={inputClass} required disabled={busy} value={form.serviceId} onChange={update("serviceId")}>
              <option value="">{tr("Choose service","Выберите услугу")}</option>
              {availableServices.map(s=><option key={s.id} value={s.id}>{s.name} · {s.price} {clinic.currency||"RUB"}</option>)}
            </select>
          </label>
          <label className="text-xs font-bold sm:col-span-2">{tr("Veterinarian","Ветеринар")}
            <select className={inputClass} disabled={busy || loadingDoctors} value={form.doctorId} onChange={update("doctorId")}>
              <option value="">{loadingDoctors?tr("Loading doctors…","Загрузка врачей…"):tr("Any available veterinarian (clinic assigns)","Любой доступный врач (назначит клиника)")}</option>
              {doctors.map(d=><option key={d.id} value={d.id}>{d.name}{d.specialty ? " · "+d.specialty : ""}</option>)}
            </select>
            {!loadingDoctors && doctors.length===0 && <span className="mt-1 block font-normal text-ink-500">{tr("No active doctors have been listed by this clinic yet.","Клиника пока не указала активных врачей.")}</span>}
            {doctorError && <span className="mt-1 block font-normal text-amber-800">{doctorError}</span>}
          </label>
          <label className="text-xs font-bold">{tr("Preferred date","Желаемая дата")}
            <input className={inputClass} required type="date" min={minimumDate} disabled={busy}
              value={form.date} onChange={update("date")}/>
          </label>
          <label className="text-xs font-bold">{tr("Preferred time","Желаемое время")}
            <input className={inputClass} required type="time" disabled={busy} value={form.time} onChange={update("time")}/>
          </label>
          <label className="text-xs font-bold sm:col-span-2">{tr("Contact phone (optional)","Контактный телефон (необязательно)")}
            <input className={inputClass} type="tel" maxLength={32} autoComplete="tel"
              disabled={busy} value={form.contactPhone} onChange={update("contactPhone")}
              placeholder="+7 999 000 00 00"/>
          </label>
          <label className="text-xs font-bold sm:col-span-2">{tr("Notes for the clinic (optional)","Комментарий клинике (необязательно)")}
            <textarea className={inputClass+" min-h-24 resize-y"} maxLength={500} disabled={busy}
              value={form.notes} onChange={update("notes")} rows={3}/>
          </label>
        </div>
        <p className="flex items-center gap-2 text-xs text-ink-600"><Clock3 size={15}/>{tr("Clinic local time: ","Местное время клиники: ")}{tz}</p>
        {clinic.workingHours && <p className="text-xs text-ink-600">{tr("Opening hours: ","Часы работы: ")}
          {clinic.workingHours.open}–{clinic.workingHours.close}</p>}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={!canBook||busy}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary-700 px-5 py-3 text-sm font-extrabold text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-50">
          <CalendarDays size={17}/>{busy?tr("Sending request…","Отправка заявки…"):tr("Send booking request","Отправить заявку на запись")}
        </button>
        {!clinic.workingHours && <p className="text-sm text-amber-800">{tr("This clinic has not published its appointment schedule yet.","Клиника ещё не опубликовала расписание.")}</p>}
      </form>}
    </div>
  </Modal>;
}
