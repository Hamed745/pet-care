import { useState } from "react";
import { ArrowRight, Check, Heart, MapPin, Phone, Plus, Search, ShieldCheck, X } from "lucide-react";
import { adoptions, lostItems } from "../data.js";
import { btn, btn2, card, input } from "../ui.js";
import Media from "../components/Media.jsx";
import { useApp } from "../store.jsx";
import { Edit2, Trash2 } from "lucide-react";
import { Button, Modal } from "../components/ui.jsx";

const petImage = (type) => type === "Cat" ? "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=800&q=70" : type === "Bird" ? "https://images.unsplash.com/photo-1552728089-57bdde30beb3?auto=format&fit=crop&w=800&q=70" : "https://images.unsplash.com/photo-1552053831-71594a27632d?auto=format&fit=crop&w=800&q=70";

export function Adoption() {
  const [type, setType] = useState(""); const [city, setCity] = useState(""); const [sent, setSent] = useState([]);
  const list = adoptions.filter((a) => (!type || a.type === type) && (!city || a.city === city));
  return <div><div className="mb-8"><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Make room for love</p><h1 className="mt-2 text-3xl font-extrabold">Meet your new best friend</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">These pets are looking for a safe, loving home. Find a good match close to you.</p></div><div className="mb-6 grid gap-3 rounded-2xl border border-stone-200 bg-white p-4 sm:grid-cols-2"><label><span className="sr-only">Filter by animal type</span><select aria-label="Filter by animal type" className={input} value={type} onChange={(e) => setType(e.target.value)}><option value="">All types</option><option>Dog</option><option>Cat</option><option>Bird</option></select></label><label><span className="sr-only">Filter by city</span><select aria-label="Filter by city" className={input} value={city} onChange={(e) => setCity(e.target.value)}><option value="">All cities</option><option>Cairo</option><option>Giza</option><option>Alexandria</option></select></label></div>
    {list.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{list.map((animal) => <article key={animal.id} className={`${card} overflow-hidden p-0`}><div className="relative h-56"><Media src={animal.image} alt={`${animal.name}, ${animal.breed}`} className="h-full w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-primary-50 px-3 py-1 text-xs font-extrabold text-primary-700">{animal.health}</span><span className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white text-danger-600"><Heart size={17} /></span></div><div className="p-4"><h2 className="text-lg font-extrabold">{animal.name}</h2><p className="mt-1 text-sm text-ink-500">{animal.breed} · {animal.age} years · {animal.gender}</p><p className="mt-3 flex items-center gap-1 text-xs font-semibold text-ink-500"><MapPin size={14} /> {animal.city}</p><button disabled={sent.includes(animal.id)} onClick={() => setSent([...sent, animal.id])} className={`${btn} mt-4 w-full text-sm disabled:bg-stone-400`}>{sent.includes(animal.id) ? <><Check size={16} /> Request sent</> : <><Heart size={16} /> Ask about adoption</>}</button></div></article>)}</div> : <div className={`${card} py-14 text-center`}><Search className="mx-auto text-ink-500" /><h2 className="mt-3 font-extrabold">No pets match these filters</h2><p className="mt-1 text-sm text-ink-500">Choose another type or city to keep looking.</p><button className={`${btn2} mt-4`} onClick={() => { setType(""); setCity(""); }}>Clear filters</button></div>}</div>;
}

export function LostFound() {
  const { reports = [], user, createLostFoundReport, updateLostFoundReport, deleteLostFoundReport, showToast } = useApp();
  const [tab, setTab] = useState("lost");
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ kind: "lost", type: "Dog", desc: "", city: "", date: "", contact: "" });
  const set = (key) => (event) => setF((current) => ({ ...current, [key]: event.target.value }));
  const items = [...reports, ...lostItems];
  const visible = items.filter((item) => item.kind === tab);
  const openCreate = () => { setEditing(null); setF({ kind: tab, type: "Dog", desc: "", city: "", date: "", contact: "" }); setShow(true); };
  const openEdit = (report) => { setEditing(report); setF({ kind: report.kind, type: report.type, desc: report.desc, city: report.city, date: report.date, contact: report.contact }); setShow(true); };
  const saveReport = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const details = { ...f, image: editing?.image || petImage(f.type), owner: user?.email || "guest" };
      if (editing) await updateLostFoundReport(editing.id, details);
      else await createLostFoundReport(details);
      setTab(f.kind);
      setShow(false);
      showToast(editing ? "Report updated." : "Report published.");
    } finally { setSaving(false); }
  };
  const confirmDelete = async () => { await deleteLostFoundReport(deleting.id); setDeleting(null); showToast("Report deleted."); };
  return <div><div className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Neighbors helping neighbors</p><h1 className="mt-2 text-3xl font-extrabold">Lost &amp; Found</h1><p className="mt-2 text-sm text-ink-500">Share a sighting or help bring a pet back home.</p></div><button className={btn} onClick={openCreate}><Plus size={17} /> Create a report</button></div>
    <div role="tablist" aria-label="Lost and found reports" className="mb-6 inline-flex rounded-xl bg-stone-100 p-1">{[["lost", "Lost pets"], ["found", "Found pets"]].map(([value, label]) => <button key={value} type="button" role="tab" aria-selected={tab === value} onClick={() => setTab(value)} className={`min-h-10 rounded-lg px-5 text-sm font-bold capitalize ${tab === value ? "bg-white text-primary-700 shadow-sm" : "text-ink-500"}`}>{label}</button>)}</div>
    {visible.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visible.map((item) => { const canManage = item.owner === (user?.email || "guest"); return <article key={item.id} className={`${card} overflow-hidden p-0`}><div className="relative h-52"><Media src={item.image || petImage(item.type)} alt={`${item.kind} ${item.type.toLowerCase()}: ${item.desc}`} className="h-full w-full object-cover" /><span className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-extrabold ${item.kind === "lost" ? "bg-red-50 text-danger-600" : "bg-primary-50 text-primary-700"}`}>{item.kind === "lost" ? "Lost pet" : "Found pet"}</span></div><div className="p-5"><div className="flex items-start justify-between gap-2"><h2 className="font-extrabold">{item.type}: {item.desc}</h2>{canManage && <span className="flex shrink-0 gap-1"><button aria-label="Edit report" className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-primary-50 hover:text-primary-700" onClick={() => openEdit(item)}><Edit2 size={15} /></button><button aria-label="Delete report" className="grid size-8 place-items-center rounded-lg text-ink-500 hover:bg-red-50 hover:text-danger-600" onClick={() => setDeleting(item)}><Trash2 size={15} /></button></span>}</div><p className="mt-2 flex items-center gap-1 text-sm text-ink-500"><MapPin size={14} /> {item.city}<span className="mx-1">·</span>{item.date}</p><a href={`tel:${item.contact}`} className={`${btn2} mt-4 w-full`}><Phone size={16} /> Contact {item.contact}</a></div></article>; })}</div> : <div className={`${card} py-14 text-center`}><MapPin className="mx-auto text-primary-600" /><h2 className="mt-3 font-extrabold">No {tab} reports right now</h2><p className="mt-1 text-sm text-ink-500">A report here could help your community.</p><button className={`${btn2} mt-4`} onClick={openCreate}><Plus size={15} /> Create a report</button></div>}
    <Modal open={show} onClose={() => setShow(false)} title={editing ? "Edit report" : "Share a pet report"}><form className="space-y-4" onSubmit={saveReport}><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold">Report type<select className={`${input} mt-2`} value={f.kind} onChange={set("kind")}><option value="lost">I lost a pet</option><option value="found">I found a pet</option></select></label><label className="block text-xs font-bold">Animal type<select className={`${input} mt-2`} value={f.type} onChange={set("type")}><option>Dog</option><option>Cat</option><option>Bird</option><option>Other</option></select></label><label className="block text-xs font-bold">City / last seen<input required className={`${input} mt-2`} value={f.city} onChange={set("city")} /></label><label className="block text-xs font-bold">Date<input required type="date" className={`${input} mt-2`} value={f.date} onChange={set("date")} /></label><label className="block text-xs font-bold sm:col-span-2">Description<input required className={`${input} mt-2`} value={f.desc} onChange={set("desc")} /></label><label className="block text-xs font-bold sm:col-span-2">Contact number<input required type="tel" className={`${input} mt-2`} value={f.contact} onChange={set("contact")} /></label></div><Button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save changes" : "Publish report"}</Button></form></Modal>
    <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete this report?"><p className="text-sm leading-6 text-ink-500">This report will be removed from your community listings.</p><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDeleting(null)}>Keep report</Button><Button type="button" variant="danger" onClick={confirmDelete}><Trash2 size={16} /> Delete report</Button></div></Modal>
  </div>;
}
