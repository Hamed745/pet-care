import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check, Heart, Image as ImageIcon, MapPin, PawPrint, Phone, Plus, Search, ShieldCheck, X } from "lucide-react";
import { adoptions, lostItems } from "../data.js";
import { btn, btn2, card, input } from "../ui.js";
import Media from "../components/Media.jsx";
import { useApp } from "../store.jsx";
import { Edit2, Trash2 } from "lucide-react";
import { Button, Modal } from "../components/ui.jsx";
import PhotoUpload from "../components/PhotoUpload.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";

const petImage = (type) => type === "Cat" ? "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=800&q=70" : type === "Bird" ? "https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=800&q=70" : "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=70";

function LostFoundCardImage({ src, fallbackSrc, alt }) {
  const [imageSrc, setImageSrc] = useState(src || fallbackSrc);
  const [failed, setFailed] = useState(false);
  const handleError = () => {
    if (imageSrc !== fallbackSrc) setImageSrc(fallbackSrc);
    else setFailed(true);
  };
  return <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-100">
    {!failed ? <>
      <img src={imageSrc} alt="" aria-hidden="true" onError={handleError} className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-xl" />
      <img src={imageSrc} alt={alt} loading="lazy" onError={handleError} className="relative z-[1] size-full object-contain" />
    </> : <div role="img" aria-label={alt} className="absolute inset-0 grid place-items-center bg-gradient-to-br from-primary-50 to-stone-100 text-primary-600"><ImageIcon aria-hidden="true" size={32} /></div>}
  </div>;
}

export function Adoption() {
  const { t, isRussian } = useLanguage();
  const [type, setType] = useState(""); const [city, setCity] = useState(""); const [sent, setSent] = useState([]);
  const list = adoptions.filter((a) => (!type || a.type === type) && (!city || a.city === city));
  return <div>
    <div className="mb-8">
      <p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">{t("adoption.tagline")}</p>
      <h1 className="mt-2 text-3xl font-extrabold">{t("adoption.title")}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">{t("adoption.subtitle")}</p>
    </div>
    <div className="mb-6 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2">
      <label><span className="sr-only">{t("adoption.filter_type")}</span><select aria-label={t("adoption.filter_type")} className={input} value={type} onChange={(e) => setType(e.target.value)}><option value="">{isRussian ? "Все виды" : "All types"}</option><option value="Dog">{isRussian ? "Собака" : "Dog"}</option><option value="Cat">{isRussian ? "Кошка" : "Cat"}</option><option value="Bird">{isRussian ? "Птица" : "Bird"}</option></select></label>
      <label><span className="sr-only">{t("adoption.filter_city")}</span><select aria-label={t("adoption.filter_city")} className={input} value={city} onChange={(e) => setCity(e.target.value)}><option value="">{isRussian ? "Все города" : "All cities"}</option><option value="Cairo">{isRussian ? "Каир" : "Cairo"}</option><option value="Giza">{isRussian ? "Гиза" : "Giza"}</option><option value="Alexandria">{isRussian ? "Александрия" : "Alexandria"}</option></select></label>
    </div>
    {list.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{list.map((animal) => <article key={animal.id} className={`${card} overflow-hidden p-0`}><div className="relative h-56"><Media src={animal.image} alt={`${animal.name}, ${animal.breed}`} className="h-full w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-primary-50 px-3 py-1 text-xs font-extrabold text-primary-700">{animal.health}</span><span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white text-danger-600"><Heart size={17} /></span></div><div className="p-4"><h2 className="text-lg font-extrabold">{animal.name}</h2><p className="mt-1 text-sm text-ink-500">{animal.breed} · {animal.age} {isRussian ? (animal.age === 1 ? "год" : "лет") : "years"} · {isRussian ? (animal.gender === "Male" ? "Самец" : "Самка") : animal.gender}</p><p className="mt-3 flex items-center gap-1 text-xs font-semibold text-ink-500"><MapPin size={14} /> {animal.city}</p><button disabled={sent.includes(animal.id)} onClick={() => setSent([...sent, animal.id])} className={`${btn} mt-4 w-full text-sm disabled:bg-stone-400`}>{sent.includes(animal.id) ? <><Check size={16} /> {t("adoption.request_sent")}</> : <><Heart size={16} /> {t("adoption.ask_adoption")}</>}</button></div></article>)}</div> : <div className={`${card} py-14 text-center`}><Search className="mx-auto text-ink-500" /><h2 className="mt-3 font-extrabold">{t("adoption.no_matches")}</h2><p className="mt-1 text-sm text-ink-500">{t("adoption.no_matches_sub")}</p><button className={`${btn2} mt-4`} onClick={() => { setType(""); setCity(""); }}>{t("adoption.clear_filters")}</button></div>}
  </div>;
}

export function LostFoundComingSoon() {
  const { t, isRussian } = useLanguage();
  return (
    <section className="relative isolate flex min-h-[60vh] items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-primary-50 via-white to-teal-100 px-4 py-14 sm:px-8">
      <PawPrint aria-hidden="true" className="pointer-events-none absolute left-8 top-10 size-12 -rotate-12 text-primary-700/10 sm:left-16 sm:top-14 sm:size-16" />
      <PawPrint aria-hidden="true" className="pointer-events-none absolute right-8 top-16 size-10 rotate-12 text-primary-700/10 sm:right-20 sm:top-20 sm:size-14" />
      <PawPrint aria-hidden="true" className="pointer-events-none absolute bottom-10 left-12 size-10 rotate-12 text-primary-700/10 sm:bottom-14 sm:left-24 sm:size-14" />
      <PawPrint aria-hidden="true" className="pointer-events-none absolute bottom-12 right-10 size-12 -rotate-12 text-primary-700/10 sm:right-20 sm:size-16" />
      <div className="relative z-10 w-full max-w-xl rounded-3xl border border-stone-200 bg-white/95 px-6 py-9 text-center shadow-[0_20px_60px_rgba(15,118,110,0.10)] sm:px-12 sm:py-12">
        <span className="relative mx-auto grid size-20 place-items-center rounded-3xl bg-primary-100 text-primary-700">
          <Search size={42} strokeWidth={1.8} />
          <PawPrint aria-hidden="true" size={18} className="absolute left-5 top-5 rounded-full bg-primary-100" />
        </span>
        <span className="mx-auto mt-6 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-bold text-primary-700">{t("community.coming_soon")}</span>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl">{t("community.title")}</h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-ink-500 sm:text-base">{t("community.coming_soon_desc")}</p>
        <Link to="/" className="mt-7 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 text-sm font-bold text-white transition hover:bg-primary-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
          {isRussian ? "На главную" : "Back to Home"} <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}

export function LostFound() {
  const { reports = [], user, createLostFoundReport, updateLostFoundReport, deleteLostFoundReport, showToast } = useApp();
  const { t, isRussian } = useLanguage();
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("");
  const [sort, setSort] = useState("newest");
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [details, setDetails] = useState(null);
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ kind: "lost", type: "Dog", breed: "", color: "", gender: "Unknown", location: "", desc: "", city: "", date: "", contact: "", photo: "", status: "Active" });
  const set = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }));
  const items = [...reports, ...lostItems];
  const cities = [...new Set(items.map((item) => item.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const visible = items.filter((item) => {
    const resolved = item.status === "Resolved";
    const matchesStatus = statusFilter === "all" ||
      (statusFilter === "resolved" ? resolved : !resolved && item.kind === statusFilter);
    return matchesStatus &&
      (!typeFilter || item.type === typeFilter) &&
      (!cityFilter || item.city === cityFilter) &&
      (!query || `${item.name || ""} ${item.type || ""} ${item.breed || ""} ${item.color || ""} ${item.desc || ""} ${item.city || ""} ${item.location || ""}`.toLowerCase().includes(query.trim().toLowerCase()));
  }).sort((a, b) => {
    if (sort === "name") return String(a.name || a.desc || "").localeCompare(String(b.name || b.desc || ""));
    const aDate = Date.parse(a.date) || Number(a.id) || 0;
    const bDate = Date.parse(b.date) || Number(b.id) || 0;
    return sort === "oldest" ? aDate - bDate : bDate - aDate;
  });
  const emptyReport = (kind = "lost") => ({ kind, type: "Dog", breed: "", color: "", gender: "Unknown", location: "", desc: "", city: "", date: "", contact: "", photo: "", status: "Active" });
  const openCreate = () => { setEditing(null); setF(emptyReport()); setShow(true); };
  const openEdit = (report) => { setEditing(report); setF({ ...emptyReport(report.kind), ...report, photo: report.image || report.photo || "" }); setShow(true); };
  const saveReport = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const reportDetails = { ...f, image: f.photo || editing?.image || petImage(f.type), owner: user?.email || "guest", status: editing?.status || "Active" };
      if (editing) await updateLostFoundReport(editing.id, reportDetails);
      else await createLostFoundReport(reportDetails);
      setStatusFilter(f.kind);
      setShow(false);
      showToast(editing ? (isRussian ? "Объявление обновлено." : "Report updated.") : (isRussian ? "Объявление опубликовано." : "Report published."));
    } finally { setSaving(false); }
  };
  const confirmDelete = async () => { await deleteLostFoundReport(deleting.id); setDeleting(null); showToast(isRussian ? "Объявление удалено." : "Report deleted."); };
  const resolveReport = async (report) => { await updateLostFoundReport(report.id, { status: "Resolved" }); showToast(isRussian ? "Объявление отмечено решенным." : "Report marked resolved."); };

  const statusOptions = [
    ["all", isRussian ? "Все" : "All"],
    ["lost", isRussian ? "Потерянные" : "Lost"],
    ["found", isRussian ? "Найденные" : "Found"],
    ["resolved", isRussian ? "Найденные / Дома" : "Resolved"],
  ];

  const petTypes = [
    { value: "Dog", label: isRussian ? "Собака" : "Dog" },
    { value: "Cat", label: isRussian ? "Кошка" : "Cat" },
    { value: "Bird", label: isRussian ? "Птица" : "Bird" },
    { value: "Other", label: isRussian ? "Другое" : "Other" },
  ];

  return <div className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-6">
    <aside aria-label="Lost and Found filters" className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary-700">{isRussian ? "Сообщество" : "Community"}</p><h2 className="mt-1 text-lg font-extrabold text-ink-900">{isRussian ? "Фильтры" : "Filters"}</h2></div><button type="button" onClick={() => { setQuery(""); setCityFilter(""); setTypeFilter(""); setStatusFilter("all"); }} className="text-xs font-semibold text-primary-700 hover:text-primary-800">{t("common.clear")}</button></div>
      <div className="space-y-3.5">
        <label className="block text-xs font-bold text-ink-700">{t("common.search")}<span className="relative mt-1.5 block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input aria-label="Search reports" className={`${input} min-h-10 pl-9 text-sm`} placeholder={isRussian ? "Поиск по кличке, породе, месту..." : "Search by name, breed, or location..."} value={query} onChange={(event) => setQuery(event.target.value)} /></span></label>
        <label className="block text-xs font-bold text-ink-700">{isRussian ? "Город" : "City"}<select aria-label="Filter report city" className={`${input} mt-1.5 min-h-10 text-sm`} value={cityFilter} onChange={(event) => setCityFilter(event.target.value)}><option value="">{isRussian ? "Все города" : "All Cities"}</option>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
        <label className="block text-xs font-bold text-ink-700">{isRussian ? "Вид животного" : "Animal Type"}<select aria-label="Filter animal type" className={`${input} mt-1.5 min-h-10 text-sm`} value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="">{isRussian ? "Все виды" : "All Types"}</option>{[...new Set(items.map((item) => item.type).filter(Boolean))].sort().map((type) => <option key={type} value={type}>{isRussian ? (type === "Dog" ? "Собака" : type === "Cat" ? "Кошка" : type === "Bird" ? "Птица" : type) : type}</option>)}</select></label>
        <fieldset><legend className="mb-2 text-xs font-bold text-ink-700">{isRussian ? "Статус" : "Status"}</legend><div className="space-y-1">{statusOptions.map(([value, label]) => <button key={value} type="button" aria-pressed={statusFilter === value} onClick={() => setStatusFilter(value)} className={`flex min-h-9 w-full items-center justify-between rounded-lg px-3 text-left text-sm font-semibold transition ${statusFilter === value ? "border border-primary-200 bg-primary-50 text-primary-800" : "border border-transparent text-ink-600 hover:bg-slate-50"}`}><span>{label}</span>{statusFilter === value && <Check size={15} />}</button>)}</div></fieldset>
      </div>
      <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-ink-500">{visible.length} {isRussian ? (visible.length === 1 ? "объявление найдено" : "объявл. найдено") : (visible.length === 1 ? "report found" : "reports found")}</p>
    </aside>

    <section className="min-w-0">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">{isRussian ? "Помощь друг другу" : "Neighbors helping neighbors"}</p><h1 className="mt-1 text-2xl font-extrabold text-ink-900 sm:text-3xl">{isRussian ? "Бюро находок питомцев" : "Lost & Found Pets"}</h1><p className="mt-1 text-sm text-ink-500">{visible.length} {isRussian ? (visible.length === 1 ? "объявление" : "объявлений") : (visible.length === 1 ? "report" : "reports")}</p></div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 text-xs font-semibold text-ink-500">{t("store.sort_by")}<select aria-label="Sort reports" className={`${input} min-h-10 w-auto py-1.5 text-sm`} value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">{t("store.newest")}</option><option value="oldest">{isRussian ? "Сначала старые" : "Oldest"}</option><option value="name">{isRussian ? "По кличке" : "Name"}</option></select></label><button type="button" className={`${btn} min-h-10`} onClick={openCreate}><Plus size={16} />{isRussian ? "Подать объявление" : "Report a Pet"}</button></div></header>
      {visible.length ? <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{visible.map((item) => {
        const canManage = item.owner === (user?.email || "guest");
        const isResolved = item.status === "Resolved";
        const title = item.name || `${item.type}: ${item.desc}`;
        const place = [item.location, item.city].filter(Boolean).join(", ");
        const kindLabel = item.kind === "lost" ? (isRussian ? "Потерян" : "Lost") : (isRussian ? "Найден" : "Found");
        const typeDisplay = isRussian ? (item.type === "Dog" ? "Собака" : item.type === "Cat" ? "Кошка" : item.type === "Bird" ? "Птица" : item.type) : item.type;

        return <article key={item.id} className={`${card} flex min-w-0 flex-col overflow-hidden p-0`}>
          <div className="relative"><LostFoundCardImage key={`${item.id}-${item.image || item.photo || item.type}`} src={item.image || item.photo} fallbackSrc={petImage(item.type)} alt={`${title}, ${item.kind} report`} /><span className={`absolute left-3 top-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-bold ${item.kind === "lost" ? "bg-red-50 text-danger-600" : "bg-primary-50 text-primary-700"}`}>{kindLabel}</span>{isResolved && <span className="absolute right-3 top-3 z-10 rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold text-ink-700">{isRussian ? "Дома / Решено" : "Resolved"}</span>}</div>
          <div className="flex flex-1 flex-col p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><h2 className="line-clamp-2 text-base font-extrabold text-ink-900">{title}</h2><p className="mt-1 truncate text-xs text-ink-500">{[typeDisplay, item.breed].filter(Boolean).join(" · ")}</p></div>{canManage && <span className="flex shrink-0 gap-1"><button type="button" aria-label={`Edit report ${title}`} className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-primary-50 hover:text-primary-700" onClick={() => openEdit(item)}><Edit2 size={15} /></button><button type="button" aria-label={`Delete report ${title}`} className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-danger-600" onClick={() => setDeleting(item)}><Trash2 size={15} /></button></span>}</div>
            {place && <p className="mt-2 flex items-center gap-1 text-xs text-ink-500"><MapPin size={13} />{place}</p>}{item.date && <p className="mt-1 text-xs text-ink-500">{isRussian ? (item.kind === "lost" ? "Пропал:" : "Найден:") : (item.kind === "lost" ? "Lost on:" : "Found on:")} {item.date}</p>}{item.desc && item.name && <p className="mt-2 line-clamp-2 text-sm text-ink-500">{item.desc}</p>}
            <div className="mt-auto pt-3"><button type="button" className={`${btn2} min-h-9 w-full px-3 text-xs`} onClick={() => setDetails(item)}>{isRussian ? "Подробнее" : "View Details"}</button>{canManage && !isResolved && <button type="button" className="mt-2 min-h-8 w-full text-xs font-bold text-primary-700 hover:underline" onClick={() => resolveReport(item)}>{isRussian ? "Отметить решенным" : "Mark Resolved"}</button>}{item.contact && <a href={`tel:${item.contact}`} className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-ink-600 hover:bg-slate-50"><Phone size={14} />{isRussian ? "Позвонить" : "Contact"}</a>}</div>
          </div>
        </article>;
      })}</div> : <div className={`${card} py-14 text-center`}><MapPin className="mx-auto text-primary-600" /><h2 className="mt-3 font-extrabold">{isRussian ? "Объявлений не найдено" : "No reports found"}</h2><p className="mt-1 text-sm text-ink-500">{isRussian ? "Попробуйте изменить фильтры поиска." : "Try adjusting your filters."}</p><button type="button" className={`${btn2} mt-4`} onClick={() => { setQuery(""); setCityFilter(""); setTypeFilter(""); setStatusFilter("all"); }}>{t("common.clear")}</button></div>}
    </section>
    <Modal open={show} onClose={() => setShow(false)} title={editing ? (isRussian ? "Редактировать объявление" : "Edit report") : (isRussian ? "Подать объявление о питомце" : "Share a pet report")}><form className="space-y-4" onSubmit={saveReport}><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold">{isRussian ? "Тип объявления" : "Report type"}<select className={`${input} mt-2`} value={f.kind} onChange={set("kind")}><option value="lost">{isRussian ? "Я потерял(а) питомца" : "I lost a pet"}</option><option value="found">{isRussian ? "Я нашел(ла) питомца" : "I found a pet"}</option></select></label><label className="block text-xs font-bold">{isRussian ? "Вид животного" : "Animal type"}<select className={`${input} mt-2`} value={f.type} onChange={set("type")}>{petTypes.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-xs font-bold">{isRussian ? "Город / последнее место" : "City / last seen"}<input required className={`${input} mt-2`} value={f.city} onChange={set("city")} /></label><label className="block text-xs font-bold">{isRussian ? "Дата" : "Date"}<input required type="date" className={`${input} mt-2`} value={f.date} onChange={set("date")} /></label><label className="block text-xs font-bold sm:col-span-2">{isRussian ? "Описание" : "Description"}<input required className={`${input} mt-2`} value={f.desc} onChange={set("desc")} /></label><label className="block text-xs font-bold sm:col-span-2">{isRussian ? "Телефон для связи" : "Contact number"}<input required type="tel" className={`${input} mt-2`} value={f.contact} onChange={set("contact")} /></label><label className="block text-xs font-bold sm:col-span-2"><span className="mb-2 block text-xs font-bold">{isRussian ? "Фотография" : "Photo"}</span><PhotoUpload label={isRussian ? "Фото для объявления" : "Pet report photo"} value={f.photo} onChange={(photo) => setF((current) => ({ ...current, photo }))} /></label><label className="block text-xs font-bold">{t("pets.breed")}<input className={`${input} mt-2`} value={f.breed} onChange={set("breed")} /></label><label className="block text-xs font-bold">{isRussian ? "Окрас" : "Color"}<input className={`${input} mt-2`} value={f.color} onChange={set("color")} /></label><label className="block text-xs font-bold">{t("pets.gender")}<select className={`${input} mt-2`} value={f.gender} onChange={set("gender")}><option value="Unknown">{isRussian ? "Неизвестно" : "Unknown"}</option><option value="Female">{isRussian ? "Самка" : "Female"}</option><option value="Male">{isRussian ? "Самец" : "Male"}</option></select></label><label className="block text-xs font-bold">{isRussian ? "Район / точный адрес" : "Area / location"}<input className={`${input} mt-2`} value={f.location} onChange={set("location")} /></label></div><Button type="submit" disabled={saving}>{saving ? t("common.saving") : editing ? t("pets.save_changes") : (isRussian ? "Опубликовать" : "Publish report")}</Button></form></Modal>
    <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title={isRussian ? "Удалить это объявление?" : "Delete this report?"}><p className="text-sm leading-6 text-ink-500">{isRussian ? "Это объявление будет удалено из списка сообщества." : "This report will be removed from your community listings."}</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeleting(null)}>{isRussian ? "Оставить" : "Keep report"}</Button><Button type="button" variant="danger" onClick={confirmDelete}><Trash2 size={16} /> {isRussian ? "Удалить объявление" : "Delete report"}</Button></div></Modal>
    <Modal open={Boolean(details)} onClose={() => setDetails(null)} title={isRussian ? "Детали объявления" : "Lost & Found report details"}>{details && <div className="space-y-3 text-sm"><LostFoundCardImage key={`${details.id}-details-${details.image || details.photo || details.type}`} src={details.image || details.photo} fallbackSrc={petImage(details.type)} alt={`${details.type} report`} /><p><strong>{isRussian ? "Тип:" : "Report:"}</strong> {details.kind === "lost" ? (isRussian ? "Потерянный питомец" : "Lost pet") : (isRussian ? "Найденный питомец" : "Found pet")} · {details.status === "Resolved" ? (isRussian ? "Дома / Решено" : "Resolved") : (isRussian ? "Активно" : "Active")}</p><p><strong>{isRussian ? "Животное:" : "Animal:"}</strong> {details.type} {details.breed || ""} · {details.color || (isRussian ? "Окрас не указан" : "Color not noted")} · {details.gender || (isRussian ? "Пол неизвестен" : "Gender unknown")}</p><p><strong>{isRussian ? "Местоположение:" : "Location:"}</strong> {details.location ? `${details.location}, ` : ""}{details.city}</p><p><strong>{isRussian ? "Дата:" : "Date:"}</strong> {details.date}</p><p><strong>{isRussian ? "Описание:" : "Description:"}</strong> {details.desc}</p><a className="font-bold text-primary-700 underline" href={`tel:${details.contact}`}>{isRussian ? "Позвонить" : "Contact"} {details.contact}</a></div>}</Modal>
  </div>;
}
