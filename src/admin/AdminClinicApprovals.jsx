import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const [documentMetadata, setDocumentMetadata] = useState([]);
  const [preview, setPreview] = useState(null);
  const documentUrls = useRef(new Set());
  const selectedClinicId = useRef(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const ru = language === "ru";
  const tr = (en, russian) => ru ? russian : en;
  const revokeDocumentUrls = () => {
    for (const url of documentUrls.current) URL.revokeObjectURL(url);
    documentUrls.current.clear();
  };
  useEffect(() => () => revokeDocumentUrls(), []);
  // Escape closes only the full-screen document viewer, not the clinic review.
  useEffect(() => {
    if (!preview) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setPreview(null);
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [preview]);
  const open = (clinic) => {
    revokeDocumentUrls();
    selectedClinicId.current = clinic.id;
    setSelected(clinic);
    setPreview(null);
    setDocuments({});
    setDocumentMetadata([]);
    setReason("");
    setError("");
    setMetadataLoading(true);
    clinicApi.adminDocuments(clinic.id).then((result) => {
      if (selectedClinicId.current === clinic.id) setDocumentMetadata(result.documents || []);
    }).catch((err) => {
      if (selectedClinicId.current === clinic.id) setError(err.message);
    }).finally(() => {
      if (selectedClinicId.current === clinic.id) setMetadataLoading(false);
    });
  };
  const close = () => {
    selectedClinicId.current = null;
    setPreview(null);
    revokeDocumentUrls();
    setSelected(null);
    setDocuments({});
    setDocumentMetadata([]);
    setReason("");
    setError("");
  };
  const loadDocument = async (kind, title) => {
    const cached = documents[kind];
    if (cached) {
      setPreview({ ...cached, kind, title });
      return;
    }
    const clinicId = selected?.id;
    if (!clinicId) return;
    setBusy(true);
    setError("");
    try {
      const blob = await clinicApi.adminDocument(clinicId, kind);
      if (selectedClinicId.current !== clinicId) return;
      const mimeType = blob.type;
      if (!["application/pdf", "image/jpeg", "image/png"].includes(mimeType)) {
        throw new Error("This document format cannot be previewed safely.");
      }
      const url = URL.createObjectURL(blob);
      documentUrls.current.add(url);
      const file = { url, mimeType };
      setDocuments((old) => ({ ...old, [kind]: file }));
      setPreview({ ...file, kind, title });
    } catch (err) {
      if (selectedClinicId.current === clinicId) setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  const decide = async (status) => {
    if (["rejected", "changes_requested", "suspended", "closed"].includes(status) && reason.trim().length < 5) {
      setError(tr("Write a reason with at least 5 characters before continuing.", "Перед продолжением укажите причину не короче пяти символов."));
      return;
    }
    setBusy(true);
    setError("");
    try {
      await clinicApi.decide(selected.id, status, reason);
      close();
      onReviewed?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return <section className="pa-card">
    <div className="pa-card-heading"><h2><ShieldCheck size={20}/>{tr("Clinic verification", "Проверка ветеринарных клиник")}</h2><small>{clinics.filter((item) => item.status === "pending").length} {tr("awaiting review", "ожидают проверки")}</small></div>
    <label className="mb-4 block max-w-xs text-xs font-semibold">{tr("Filter applications", "Фильтр заявок")}<select className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{tr("All statuses", "Все статусы")}</option>{["draft", "pending", "changes_requested", "approved", "rejected", "suspended", "closed", "terminated"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
    {!clinics.length ? <p className="pa-muted">{tr("No clinic applications yet.", "Заявок от клиник пока нет.")}</p> :
      clinics.filter((item) => statusFilter === "all" || item.status === statusFilter).length
        ? <div className="pa-table-scroll"><table className="pa-table"><thead><tr><th className="pa-th">{tr("Clinic", "Клиника")}</th><th className="pa-th">{tr("Location", "Адрес")}</th><th className="pa-th">{tr("Status", "Статус")}</th><th className="pa-th">{tr("Action", "Действие")}</th></tr></thead><tbody>{clinics.filter((item) => statusFilter === "all" || item.status === statusFilter).map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.managerName} · {item.email}</small></td><td>{item.city}, {item.region || item.governorate}</td><td><span className={`pa-pill pa-${item.status}`}>{item.status.replaceAll("_", " ")}</span>{item.documentNecessityReviewDue && <small className="text-amber-700">{tr("Annual document review due", "Пора провести ежегодную проверку документов")}</small>}</td><td><button type="button" className="pa-outline-button" onClick={() => open(item)}>{tr("Review", "Проверить")}</button></td></tr>)}</tbody></table></div>
        : <p className="pa-muted">{tr("No applications match this status.", "Нет заявок с таким статусом.")}</p>}
    {selected && <div className="pa-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="pa-modal" role="dialog" aria-modal="true" aria-label={tr("Review clinic", "Проверка клиники")}>
        <div className="pa-modal-header"><h2>{selected.name}</h2><button type="button" aria-label="Close" onClick={close}><X size={19}/></button></div>
        <div className="space-y-2 text-sm"><p><strong>{tr("Manager:", "Менеджер:")}</strong> {selected.managerName} · {selected.email}</p><p><strong>{tr("Address:", "Адрес:")}</strong> {selected.address}, {selected.city}, {selected.region || selected.governorate}</p><p><strong>{tr("Phone:", "Телефон:")}</strong> {selected.phone}</p><p><strong>{tr("Map link:", "Ссылка на карте:")}</strong> {selected.mapUrl ? <a href={selected.mapUrl} target="_blank" rel="noopener noreferrer" className="font-bold text-primary-700 underline">{tr("Open clinic location", "Открыть местоположение")}</a> : tr("Not provided", "Не указана")}</p><p><strong>{tr("Clinic license:", "Лицензия клиники:")}</strong> {selected.clinicLicenseNumber}</p><p><strong>{tr("Veterinarian:", "Ветеринар:")}</strong> {selected.responsibleVetName} · {selected.responsibleVetLicenseNumber}</p><p><strong>{tr("Current status:", "Статус:")}</strong> {selected.status}</p>{selected.reviewReason && <p><strong>{tr("Last feedback:", "Последний комментарий:")}</strong> {selected.reviewReason}</p>}</div>
        <h3 className="pa-mini-heading">{tr("Private verification documents", "Закрытые документы для проверки")}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          {DOCUMENTS.map(([kind, title]) => {
            const metadata = documentMetadata.find((item) => item.kind === kind)?.metadata;
            const isViewed = Boolean(documents[kind]);
            return <div key={kind} className="rounded-xl border border-stone-200 p-3">
              <p className="mb-1 text-xs font-bold">{title}</p>
              <p className="mb-3 text-[11px] text-ink-500">
                {metadata
                  ? (metadata.mimeType === "application/pdf" ? "PDF" : "Image") +
                    " · " + (metadata.size / (1024 * 1024)).toFixed(2) + " MB" +
                    (metadata.demo === true ? " · Demo" : "")
                  : metadataLoading
                    ? tr("Loading file details…", "Загрузка сведений о файле…")
                    : tr("No uploaded document", "Документ не загружен")}
              </p>
              <button
                type="button"
                className="pa-outline-button"
                disabled={busy || !metadata}
                onClick={() => loadDocument(kind, title)}
                aria-label={tr("View full-screen: ", "Просмотр на весь экран: ") + title}
              >
                <FileImage size={15}/>
                {isViewed ? tr("View again", "Открыть снова") : tr("View", "Просмотр")}
              </button>
            </div>;
          })}
        </div>
        {selected.status === "pending" && <>
          <label className="pa-form-field">
            {tr("Reason (only for rejection or requesting changes)", "Причина (для отказа или запроса изменений)")}
            <textarea rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)}/>
          </label>
          {error && <p role="alert" className="pa-alert pa-error">{error}</p>}
          <div className="pa-modal-actions" style={{ flexWrap: "wrap" }}>
            <button type="button" className="pa-outline-button" onClick={close}>{tr("Close", "Закрыть")}</button>
            <button type="button" className="pa-outline-button" disabled={busy} onClick={() => decide("changes_requested")}>{tr("Request changes", "Запросить исправления")}</button>
            <button type="button" className="pa-outline-button" disabled={busy} onClick={() => decide("rejected")}>{tr("Reject", "Отклонить")}</button>
            <button type="button" className="pa-primary-button" disabled={busy || !DOCUMENTS.every(([kind]) => documents[kind])}
              onClick={() => decide("approved")}>
              <CheckCircle2 size={16}/> {tr("Approve", "Одобрить")}
            </button>
          </div>
          <p className="pa-muted">{tr("Open all three documents before approving. The administrator decides after reviewing them.", "Откройте все три документа перед одобрением. Решение принимает администратор.")}</p>
        </>}
        {selected.status !== "pending" && <>
          {error && <p role="alert" className="pa-alert pa-error">{error}</p>}
          <div className="pa-modal-actions">
            <button type="button" className="pa-outline-button" onClick={close}>{tr("Close", "Закрыть")}</button>
          </div>
          {["approved", "suspended"].includes(selected.status) && <details className="mt-3 rounded-xl border border-stone-200 p-3">
            <summary className="cursor-pointer text-xs font-semibold">{tr("Advanced clinic status actions", "Дополнительные действия со статусом клиники")}</summary>
            <label className="pa-form-field mt-3">
              {tr("Reason (required for suspension or closure)", "Причина (обязательна для блокировки или закрытия)")}
              <textarea rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)}/>
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              {selected.status === "approved" && <button type="button" disabled={busy} className="pa-outline-button" onClick={() => decide("suspended")}>{tr("Suspend clinic", "Приостановить работу клиники")}</button>}
              <button type="button" disabled={busy} className="pa-outline-button" onClick={() => decide("closed")}>{tr("Close clinic relationship", "Закрыть сотрудничество")}</button>
              {selected.status === "suspended" && <button type="button" disabled={busy} className="pa-primary-button" onClick={() => decide("approved")}>{tr("Restore approval", "Восстановить одобрение")}</button>}
            </div>
          </details>}
        </>}
      </div>
    </div>}
    {preview && createPortal(
      <div
        className="fixed inset-0 z-[9999] flex flex-col bg-white"
        role="dialog"
        aria-modal="true"
        aria-label={tr("Full-screen verification document: ", "Документ на весь экран: ") + preview.title}
        data-testid="clinic-document-fullscreen"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 bg-white px-4 py-3">
          <h2 className="min-w-0 truncate text-base font-bold">{preview.title}</h2>
          <button type="button" autoFocus onClick={() => setPreview(null)}
            className="pa-outline-button" aria-label={tr("Close document viewer", "Закрыть просмотр документа")}>
            <X size={18}/> {tr("Close viewer", "Закрыть просмотр")}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-stone-100">
          {preview.mimeType === "application/pdf"
            ? <iframe
                key={preview.url}
                title={preview.title}
                src={preview.url}
                sandbox="allow-scripts allow-downloads"
                referrerPolicy="no-referrer"
                className="h-full w-full border-0 bg-white"
              />
            : <div className="flex min-h-full items-start justify-center p-4">
                <img src={preview.url} alt={preview.title} className="block h-auto max-w-full object-contain" />
              </div>}
        </div>
      </div>,
      document.body
    )}
  </section>;
}
