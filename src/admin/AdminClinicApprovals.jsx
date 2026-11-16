import { useEffect, useRef, useState } from "react";
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
  const documentUrls = useRef(new Set());
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [holdType, setHoldType] = useState("legal");
  const [holdReason, setHoldReason] = useState("");
  const [necessityReviewReason, setNecessityReviewReason] = useState("");
  const [cleanupResult, setCleanupResult] = useState(null);
  const [cleanupCursor, setCleanupCursor] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const ru = language === "ru";
  const tr = (en, russian) => ru ? russian : en;
  const revokeDocumentUrls = () => {
    for (const url of documentUrls.current) URL.revokeObjectURL(url);
    documentUrls.current.clear();
  };
  useEffect(() => () => revokeDocumentUrls(), []);
  const open = (clinic) => {
    revokeDocumentUrls();
    setSelected(clinic); setDocuments({}); setDocumentMetadata([]); setHistory([]); setReason(""); setError("");
    setHistoryLoading(true);
    Promise.all([clinicApi.clinicHistory(clinic.id), clinicApi.adminDocuments(clinic.id)])
      .then(([historyResult, documentResult]) => {
        setHistory(historyResult.history || []);
        setDocumentMetadata(documentResult.documents || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setHistoryLoading(false));
  };
  const close = () => {
    revokeDocumentUrls();
    setSelected(null); setDocuments({}); setDocumentMetadata([]); setHistory([]); setError("");
  };
  const loadDocument = async (kind) => {
    setBusy(true); setError("");
    try {
      const blob = await clinicApi.adminDocument(selected.id, kind);
      const url = URL.createObjectURL(blob);
      documentUrls.current.add(url);
      setDocuments((old) => ({ ...old, [kind]: { url, mimeType: blob.type } }));
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const decide = async (status) => {
    setBusy(true); setError("");
    try { await clinicApi.decide(selected.id, status, reason); close(); onReviewed?.(); }
    catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const updateRetentionHold = async () => {
    const active = selected.retentionHold?.active !== true;
    setBusy(true); setError("");
    try {
      const result = await clinicApi.setRetentionHold(
        selected.id, active, holdType, holdReason,
      );
      setSelected((current) => ({ ...current, retentionHold: result.retentionHold }));
      setHoldReason("");
      const historyResult = await clinicApi.clinicHistory(selected.id);
      setHistory(historyResult.history || []);
      onReviewed?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const runRetentionCleanup = async () => {
    setBusy(true); setError(""); setCleanupResult(null);
    try {
      const result = await clinicApi.cleanupClinicRetention(cleanupCursor || {});
      setCleanupResult(result);
      setCleanupCursor(result.hasMore ? {
        cursors: result.nextCursors,
        auditCursor: result.nextAuditCursor,
      } : null);
      onReviewed?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  const recordNecessityReview = async () => {
    setBusy(true); setError("");
    try {
      const result = await clinicApi.recordDocumentNecessityReview(selected.id, necessityReviewReason);
      setSelected((current) => ({
        ...current,
        documentNecessityReviewedAt: result.reviewedAt,
        documentNecessityReviewDue: result.reviewDue,
        documentNecessityReviewDueAt: result.reviewDueAt,
      }));
      setNecessityReviewReason("");
      const historyResult = await clinicApi.clinicHistory(selected.id);
      setHistory(historyResult.history || []);
      onReviewed?.();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  };
  return <section className="pa-card">
    <div className="pa-card-heading"><h2><ShieldCheck size={20}/>{tr("Clinic verification", "Проверка ветеринарных клиник")}</h2><small>{clinics.filter((item) => item.status === "pending").length} {tr("awaiting review", "ожидают проверки")}</small></div>
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-5 text-amber-950">{tr("Retention cleanup is a manual, bounded batch; it honors legal, appeal and active-review holds.", "Очистка выполняется вручную ограниченными пакетами и учитывает юридические блокировки, апелляции и активные проверки.")}</p><button type="button" className="pa-outline-button" disabled={busy} onClick={runRetentionCleanup}>{cleanupCursor ? tr("Continue cleanup", "Продолжить очистку") : tr("Run retention cleanup", "Запустить очистку")}</button></div>
      {cleanupResult && <p role="status" className="mt-2 text-xs text-ink-700">{cleanupResult.hasMore ? tr("Batch complete; more records remain:", "Пакет завершён, остались записи:") : tr("Cleanup complete:", "Очистка завершена:")} {cleanupResult.documentsDeleted} {tr("documents deleted,", "документов удалено,")} {cleanupResult.auditEventsDeleted} {tr("old clinic audit events deleted,", "старых событий удалено,")} {cleanupResult.failedOperations} {tr("failures.", "ошибок.")}</p>}
    </div>
    <label className="mb-4 block max-w-xs text-xs font-semibold">{tr("Filter applications", "Фильтр заявок")}<select className="mt-2 w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">{tr("All statuses", "Все статусы")}</option>{["draft", "pending", "changes_requested", "approved", "rejected", "suspended", "closed", "terminated"].map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
    {!clinics.length ? <p className="pa-muted">{tr("No clinic applications yet.", "Заявок от клиник пока нет.")}</p> :
      clinics.filter((item) => statusFilter === "all" || item.status === statusFilter).length
        ? <div className="pa-table-scroll"><table className="pa-table"><thead><tr><th className="pa-th">{tr("Clinic", "Клиника")}</th><th className="pa-th">{tr("Location", "Адрес")}</th><th className="pa-th">{tr("Status", "Статус")}</th><th className="pa-th">{tr("Action", "Действие")}</th></tr></thead><tbody>{clinics.filter((item) => statusFilter === "all" || item.status === statusFilter).map((item) => <tr key={item.id}><td><strong>{item.name}</strong><small>{item.managerName} · {item.email}</small></td><td>{item.city}, {item.governorate}</td><td><span className={`pa-pill pa-${item.status}`}>{item.status.replaceAll("_", " ")}</span>{item.documentNecessityReviewDue && <small className="text-amber-700">{tr("Annual document review due", "Пора провести ежегодную проверку документов")}</small>}</td><td><button type="button" className="pa-outline-button" onClick={() => open(item)}>{tr("Review", "Проверить")}</button></td></tr>)}</tbody></table></div>
        : <p className="pa-muted">{tr("No applications match this status.", "Нет заявок с таким статусом.")}</p>}
    {selected && <div className="pa-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <div className="pa-modal" role="dialog" aria-modal="true" aria-label={tr("Review clinic", "Проверка клиники")}>
        <div className="pa-modal-header"><h2>{selected.name}</h2><button type="button" aria-label="Close" onClick={close}><X size={19}/></button></div>
        <div className="space-y-2 text-sm"><p><strong>{tr("Manager:", "Менеджер:")}</strong> {selected.managerName} · {selected.email}</p><p><strong>{tr("Address:", "Адрес:")}</strong> {selected.address}, {selected.city}, {selected.governorate}</p><p><strong>{tr("Phone:", "Телефон:")}</strong> {selected.phone}</p><p><strong>{tr("Location:", "Координаты:")}</strong> {selected.latitude}, {selected.longitude}</p><p><strong>{tr("Clinic license:", "Лицензия клиники:")}</strong> {selected.clinicLicenseNumber}</p><p><strong>{tr("Veterinarian:", "Ветеринар:")}</strong> {selected.responsibleVetName} · {selected.responsibleVetLicenseNumber}</p><p><strong>{tr("Current status:", "Статус:")}</strong> {selected.status}</p>{selected.reviewReason && <p><strong>{tr("Last feedback:", "Последний комментарий:")}</strong> {selected.reviewReason}</p>}</div>
        {selected.documentConsent && <p className="mt-2 text-xs text-ink-600">{tr("Document consent:", "Согласие на обработку:")} {selected.documentConsent.version} · {selected.documentConsent.acceptedAt ? new Date(selected.documentConsent.acceptedAt).toLocaleString(ru ? "ru-RU" : "en-GB") : "—"} · {tr("pending legal review", "ожидает юридической проверки")}</p>}
        <h3 className="pa-mini-heading">{tr("Private verification documents", "Закрытые документы для проверки")}</h3>
        <div className="grid gap-3 sm:grid-cols-3">{DOCUMENTS.map(([kind, title]) => {
          const metadata = documentMetadata.find((item) => item.kind === kind)?.metadata;
          const document = documents[kind];
          return <div key={kind} className="rounded-xl border border-stone-200 p-2">
            <p className="mb-1 text-xs font-bold">{title}</p>
            <p className="mb-2 text-[11px] text-ink-500">{metadata
              ? `${metadata.mimeType} · ${(metadata.size / (1024 * 1024)).toFixed(2)} MB · ${metadata.scanStatus}`
              : tr("No uploaded document", "Документ не загружен")}</p>
            {document
              ? document.mimeType === "application/pdf"
                ? <iframe title={title} src={document.url} sandbox="" referrerPolicy="no-referrer" className="h-44 w-full rounded-lg border border-stone-200" />
                : <img className="max-h-44 w-full rounded-lg object-contain" src={document.url} alt={title}/>
              : <button type="button" className="pa-outline-button" disabled={busy || !metadata} onClick={() => loadDocument(kind)}><FileImage size={15}/> {tr("View", "Просмотр")}</button>}
          </div>;
        })}</div>
        <section className="mt-5 rounded-xl border border-stone-200 p-3"><h3 className="text-sm font-extrabold">{tr("Application history", "История заявки")}</h3>{historyLoading && <p role="status" className="mt-2 text-xs text-ink-500">{tr("Loading history…", "Загрузка истории…")}</p>}{!historyLoading && !history.length && <p className="mt-2 text-xs text-ink-500">{tr("No recorded review actions yet.", "Действий по проверке пока нет.")}</p>}{history.map((item) => <div key={item.id} className="mt-2 border-t border-stone-100 pt-2 text-xs"><strong>{item.action.replace("clinic.", "").replaceAll("_", " ")}</strong><span className="ml-2 text-ink-500">{item.createdAt ? new Date(item.createdAt).toLocaleString(ru ? "ru-RU" : "en-GB") : "—"}</span><p className="mt-1 text-ink-500">{item.actorUid}{item.reason ? ` · ${item.reason}` : ""}</p></div>)}</section>
        <section className="mt-4 rounded-xl border border-stone-200 p-3">
          <h3 className="text-sm font-extrabold">{tr("Document retention control", "Управление сроком хранения")}</h3>
          <p className="mt-1 text-xs text-ink-600">{selected.retentionHold?.active
            ? `${tr("Hold active:", "Блокировка активна:")} ${selected.retentionHold.type} · ${selected.retentionHold.reason}`
            : tr("No retention hold is active.", "Блокировка хранения не установлена.")}</p>
          {!selected.retentionHold?.active && <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <label className="text-xs font-semibold">{tr("Hold type", "Тип блокировки")}<select className="mt-1 w-full rounded-lg border border-stone-200 bg-white px-3 py-2" value={holdType} onChange={(event) => setHoldType(event.target.value)}><option value="legal">{tr("Legal", "Юридическая")}</option><option value="appeal">{tr("Appeal", "Апелляция")}</option><option value="active_review">{tr("Active review", "Активная проверка")}</option></select></label>
            <label className="text-xs font-semibold">{tr("Reason", "Причина")}<input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" maxLength={300} value={holdReason} onChange={(event) => setHoldReason(event.target.value)}/></label>
          </div>}
          {selected.retentionHold?.active && <label className="mt-2 block text-xs font-semibold">{tr("Release reason", "Причина снятия блокировки")}<input className="mt-1 w-full rounded-lg border border-stone-200 px-3 py-2" maxLength={300} value={holdReason} onChange={(event) => setHoldReason(event.target.value)}/></label>}
          <button type="button" className="pa-outline-button mt-2" disabled={busy || holdReason.trim().length < 5} onClick={updateRetentionHold}>{selected.retentionHold?.active ? tr("Release retention hold", "Снять блокировку") : tr("Place retention hold", "Установить блокировку")}</button>
          <div className="mt-3 border-t border-stone-100 pt-3">
            <p className="text-xs text-ink-600">{tr("Last necessity review:", "Последняя проверка необходимости:")} {selected.documentNecessityReviewedAt ? new Date(selected.documentNecessityReviewedAt).toLocaleString(ru ? "ru-RU" : "en-GB") : tr("not recorded", "не зарегистрирована")}</p>
            {["approved", "suspended"].includes(selected.status) && <p className={`mt-1 text-xs ${selected.documentNecessityReviewDue ? "font-bold text-amber-700" : "text-ink-600"}`}>{selected.documentNecessityReviewDue ? tr("Annual document necessity review is due.", "Пора провести ежегодную проверку необходимости документов.") : tr("Next necessity review due:", "Следующая проверка необходимости:")} {selected.documentNecessityReviewDueAt ? new Date(selected.documentNecessityReviewDueAt).toLocaleDateString(ru ? "ru-RU" : "en-GB") : tr("immediately (review date missing)", "немедленно (дата проверки отсутствует)")}</p>}
            {["approved", "suspended"].includes(selected.status) && <div className="mt-2 flex flex-wrap gap-2"><input aria-label={tr("Necessity review reason", "Причина проверки необходимости")} className="min-w-52 flex-1 rounded-lg border border-stone-200 px-3 py-2 text-xs" maxLength={300} value={necessityReviewReason} onChange={(event) => setNecessityReviewReason(event.target.value)} /><button type="button" className="pa-outline-button" disabled={busy || necessityReviewReason.trim().length < 5} onClick={recordNecessityReview}>{tr("Record necessity review", "Записать проверку необходимости")}</button></div>}
          </div>
        </section>
        <label className="pa-form-field">{tr("Reason (required for rejection, changes or suspension)", "Причина (для отказа, исправления или блокировки)")}<textarea rows={3} maxLength={300} value={reason} onChange={(event) => setReason(event.target.value)}/></label>
        {error && <p role="alert" className="pa-alert pa-error">{error}</p>}
        <div className="pa-modal-actions" style={{ flexWrap: "wrap" }}><button type="button" className="pa-outline-button" onClick={close}>{tr("Close", "Закрыть")}</button>
          {selected.status === "pending" && <><button disabled={busy || reason.trim().length < 5} type="button" className="pa-outline-button" onClick={() => decide("changes_requested")}>{tr("Request changes", "Запросить исправления")}</button><button disabled={busy || reason.trim().length < 5} type="button" className="pa-outline-button" onClick={() => decide("rejected")}>{tr("Reject", "Отклонить")}</button><button disabled={busy || !DOCUMENTS.every(([kind]) => documents[kind])} type="button" className="pa-primary-button" onClick={() => decide("approved")}><CheckCircle2 size={16}/> {tr("Approve", "Одобрить")}</button></>}
          {selected.status === "approved" && <button disabled={busy || reason.trim().length < 5} type="button" className="pa-outline-button" onClick={() => decide("suspended")}>{tr("Suspend", "Заблокировать")}</button>}
          {["approved", "suspended"].includes(selected.status) && <button disabled={busy || reason.trim().length < 5} type="button" className="pa-outline-button" onClick={() => decide("closed")}>{tr("Close clinic relationship", "Закрыть сотрудничество")}</button>}
          {selected.status === "suspended" && <button disabled={busy} type="button" className="pa-primary-button" onClick={() => decide("approved")}>{tr("Restore approval", "Восстановить")}</button>}
        </div>
        <p className="pa-muted">{tr("Approve only after reviewing all documents. Never approve based solely on the entered license numbers.", "Одобряйте заявку только после проверки всех документов, а не только введённых номеров лицензий.")}</p>
      </div>
    </div>}
  </section>;
}
