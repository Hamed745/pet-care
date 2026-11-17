import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, RefreshCw, X } from "lucide-react";
import { clinicApi } from "../../services/clinicApi.js";
import { useLanguage } from "../../i18n/LanguageContext.jsx";

const statusText = {
  pending: ["Pending clinic approval", "Ожидает подтверждения клиники"],
  confirmed: ["Confirmed", "Подтверждено"],
  rejected: ["Declined", "Отклонено"],
  completed: ["Completed", "Завершено"],
  cancelled: ["Cancelled", "Отменено"],
};
const statusColor = {
  pending: "bg-amber-50 text-amber-800",
  confirmed: "bg-green-50 text-green-800",
  completed: "bg-green-50 text-green-800",
  rejected: "bg-red-50 text-red-800",
  cancelled: "bg-stone-100 text-stone-700",
};

// Clinic appointments are stored in the authenticated clinic backend, not in
// the separate local/demo booking list. Never mix owners' cached records.
export default function MyClinicAppointments({ ownerUid }) {
  const { isRussian } = useLanguage();
  const tr = (en, ru) => isRussian ? ru : en;
  const [snapshot, setSnapshot] = useState({ ownerUid: null, appointments: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const generation = useRef(0);

  const refresh = useCallback(async () => {
    if (!ownerUid) return;
    const request = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await clinicApi.myBookings();
      if (request === generation.current) {
        setSnapshot({
          ownerUid,
          appointments: Array.isArray(result.appointments) ? result.appointments : [],
        });
      }
    } catch (cause) {
      if (request === generation.current) {
        setError(cause.message || "Unable to load clinic appointments.");
      }
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, [ownerUid]);

  useEffect(() => {
    setSnapshot({ ownerUid: null, appointments: [] });
    void refresh();
    return () => { generation.current += 1; };
  }, [refresh]);

  const appointments = snapshot.ownerUid === ownerUid ? snapshot.appointments : [];

  const cancel = async (appointment) => {
    if (!window.confirm(tr(
      "Cancel this clinic appointment request?",
      "Отменить запись в клинику?"
    ))) return;
    setSavingId(appointment.id);
    setError("");
    try {
      await clinicApi.cancelBooking(appointment.id);
      await refresh();
    } catch (cause) {
      setError(cause.message || "Unable to cancel this appointment.");
    } finally {
      setSavingId("");
    }
  };

  if (!ownerUid) return null;

  return <section className="mb-7 rounded-2xl border border-stone-200 bg-white p-4 sm:p-6" aria-label="PetCare clinic appointments">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2 text-primary-700">
          <CalendarDays size={19} aria-hidden="true" />
          <h2 className="text-lg font-extrabold text-ink-900">
            {tr("PetCare clinic appointments", "Записи в клиники PetCare")}
          </h2>
        </div>
        <p className="mt-1 text-sm text-ink-500">
          {tr("Requests to approved clinics. The clinic confirms your final time.",
            "Заявки в одобренные клиники. Окончательное время подтверждает клиника.")}
        </p>
      </div>
      <button type="button" disabled={loading || Boolean(savingId)} onClick={() => void refresh()}
        className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm font-semibold text-primary-700 disabled:opacity-50">
        <RefreshCw size={15} aria-hidden="true" />
        {tr("Refresh status", "Обновить статус")}
      </button>
    </div>
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    {loading && <p role="status" className="mt-4 text-sm text-ink-500">
      {tr("Loading clinic appointments…", "Загрузка записей в клиники…")}
    </p>}
    {!loading && !error && appointments.length === 0 && <div className="mt-4 rounded-xl bg-stone-50 p-4 text-sm text-ink-600">
      {tr("No clinic appointment requests yet.", "Заявок на приём в клинику пока нет.")}
      {" "}<Link className="font-bold text-primary-700 underline" to="/nearby/our/veterinary">
        {tr("Find an approved clinic", "Найти одобренную клинику")}
      </Link>
    </div>}
    <div className="mt-4 space-y-3" aria-live="polite">
      {appointments.map((appointment) => <article key={appointment.id}
        className="rounded-xl border border-stone-200 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="font-extrabold text-ink-900">{appointment.clinicName || tr("PetCare clinic", "Клиника PetCare")}</h3>
            <p className="mt-1 text-sm text-ink-600">
              {appointment.petName || tr("Pet", "Питомец")} · {appointment.serviceName || tr("Appointment", "Приём")}
            </p>
          </div>
          <span className={"rounded-full px-3 py-1 text-xs font-bold " +
            (statusColor[appointment.status] || "bg-stone-100 text-stone-700")}>
            {(statusText[appointment.status] || [appointment.status, appointment.status])[isRussian ? 1 : 0]}
          </span>
        </div>
        <p className="mt-3 text-sm text-ink-700">
          <CalendarDays size={14} className="mr-1 inline" aria-hidden="true" />
          {appointment.date} · {appointment.time}
          <span className="ml-1 text-xs text-ink-500">
            {tr("(clinic local time)", "(местное время клиники)")}
          </span>
        </p>
        {appointment.doctorName && <p className="mt-2 text-sm text-ink-600">
          {tr("Veterinarian:", "Ветеринар:")} {appointment.doctorName}
        </p>}
        {appointment.status === "pending" && <p className="mt-2 text-xs text-amber-800">
          {tr("This is your requested time; the clinic may confirm another available slot.",
            "Это желаемое время; клиника может подтвердить другое свободное время.")}
        </p>}
        {appointment.status === "rejected" && appointment.statusReason && <p className="mt-2 text-sm text-red-700">
          {tr("Clinic response:", "Ответ клиники:")} {appointment.statusReason}
        </p>}
        {["pending", "confirmed"].includes(appointment.status) && <button type="button"
          disabled={Boolean(savingId) || loading} onClick={() => void cancel(appointment)}
          className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-100 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
          <X size={15} aria-hidden="true" />
          {savingId === appointment.id ? tr("Cancelling…", "Отмена…") : tr("Cancel request", "Отменить запись")}
        </button>}
      </article>)}
    </div>
  </section>;
}
