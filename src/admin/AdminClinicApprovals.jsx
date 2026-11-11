import { useState } from "react";
import { CheckCircle2, FileImage, ShieldCheck, X } from "lucide-react";
import { clinicApi } from "../services/clinicApi.js";

const DOCUMENTS = [
  ["clinic_license", "Clinic license"],
  ["manager_id", "Manager identification"],
  ["vet_license", "Veterinarian license"],
];

export default function AdminClinicApprovals({ clinics = [], onReviewed, language }) {
  const [selected, setSelected] = useState(null);
  const [documents, setDocuments] = useState({});
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ru = language === "ru";
  const tr = (en, russian) => ru ? russian : en;
  const open = (clinic) => { setSelected(clinic); setDocuments({}); setReason(""); setError(""); };
  const close = () => { setSelected(null); setDocuments({}); setError(""); };
  const loadDocument = async (kind) => {
    setBusy(true); setError("");
    try {
      const result = await clinicApi.adminDocument(selected.id, kind);
      setDocuments((old) => ({ ...old, [kind]: result.image }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const decide = async (status) => {
    setBusy(true); setError("");
    try { await clinicApi.decide(selected.id, status, reason); close(); onReviewed?.(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <section className="pa-card">
    <div className="pa-card-heading"><h2><ShieldCheck size={20}/>{tr("Clinic verification", "Проверка ветеринарных клиник")}</h2><small>{clinics.filter((item) => item.status === "pending").length} {tr("awaiting review", "ожидают проверки")}</small></div>
    {!clinics.length ? <p className="pa-muted">{tr("No clinic applications yet.", "Заявок от клиник пока нет.")}</p> :
      <div className="pa-table-scroll"><table className="pa-table"><thead><tr><th className="pa-th">{tr("Clinic", "Клиника")}</th><th className="pa-th">{tr("Location", "Адрес")}</th><th className="pa-th">{tr("Status", "Статус")}</th><th className="pa-th">{tr("Action", "Действие")}</th></tr></thead><tbody>{clinics.map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.email}</small></td><td>{item.city}, {item.governorate}</td><td><span className={`pa-pill pa-${item.status}`}>{item.status.replaceAll("_", " ")}</span></td><td><button type="button" className="pa-outline-button" onClick={() => open(item)}>{tr("Review", "Проверить")}</button></td></tr>)}</tbody></table></div>}
    {selected && <div className="pa-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="pa-modal" role="dialog" aria-modal="true" aria-label={tr("Review clinic", "Проверка клиники")}>
        <div className="pa-modal-header"><h2>{selected.name}</h2><button type="button" aria-label="Close" onClick={close}><X size={19}/></button></div>
        <div className="space-y-2 text-sm"><p><strong>{tr("Manager:", "Менеджер:")}</strong> {selected.email}</p><p><strong>{tr("Address:", "Адрес:")}</strong> {selected.address}, {selected.city}, {selected.governorate}</p><p><strong>{tr("Phone:", "Телефон:")}</strong> {selected.phone}</p><p><strong>{tr("Clinic license:", "Лицензия клиники:")}</strong> {selected.clinicLicenseNumber}</p><p><strong>{tr("Veterinarian:", "Ветеринар:")}</strong> {selected.responsibleVetName} · {selected.responsibleVetLicenseNumber}</p><p><strong>{tr("Current status:", "Статус:")}</strong> {selected.status}</p></div>
        <h3 className="pa-mini-heading">{tr("Private verification documents", "Закрытые документы для проверки")}</h3>
        <div className="grid gap-3 sm:grid-cols-3">{DOCUMENTS.map(([kind, title]) => <div key={kind} className="rounded-xl border border-stone-200 p-2"><p className="mb-2 text-xs font-bold">{title}</p>{documents[kind] ? <img className="max-h-44 w-full rounded-lg object-contain" src={documents[kind]} alt={title}/> : <button type="button" className="pa-outline-button" disabled={busy} onClick={() => loadDocument(kind)}><FileImage size={15}/> {tr("View", "Просмотр")}</button>}</div>)}</div>
        <label className="pa-form-field">{tr("Reason (required for rejection, changes or suspension)", "Причина (для отказа, исправления или блокировки)")}<textarea rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)}/></label>
        {error && <p role="alert" className="pa-alert pa-error">{error}</p>}
        <div className="pa-modal-actions" style={{ flexWrap: "wrap" }}><button type="button" className="pa-outline-button" onClick={close}>{tr("Close", "Закрыть")}</button>
          {selected.status === "pending" && <><button disabled={busy || reason.trim().length < 5} type="button" className="pa-outline-button" onClick={() => decide("changes_requested")}>{tr("Request changes", "Запросить исправления")}</button><button disabled={busy || reason.trim().length < 5} type="button" className="pa-outline-button" onClick={() => decide("rejected")}>{tr("Reject", "Отклонить")}</button><button disabled={busy || !DOCUMENTS.every(([kind]) => documents[kind])} type="button" className="pa-primary-button" onClick={() => decide("approved")}><CheckCircle2 size={16}/> {tr("Approve", "Одобрить")}</button></>}
          {selected.status === "approved" && <button disabled={busy || reason.trim().length < 5} type="button" className="pa-outline-button" onClick={() => decide("suspended")}>{tr("Suspend", "Заблокировать")}</button>}
          {selected.status === "suspended" && <button disabled={busy} type="button" className="pa-primary-button" onClick={() => decide("approved")}>{tr("Restore approval", "Восстановить")}</button>}
        </div>
        <p className="pa-muted">{tr("Approve only after reviewing all documents. Never approve based solely on the entered license numbers.", "Одобряйте заявку только после проверки всех документов, а не только введённых номеров лицензий.")}</p>
      </div>
    </div>}
  </section>;
}
