import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Heart, MapPin, PawPrint, Plus, Search, Trash2 } from "lucide-react";
import { adoptions } from "../data.js";
import { useApp } from "../store.jsx";
import { btn, btn2, card, input } from "../ui.js";
import { Badge, Button, EmptyState, Modal } from "../components/ui.jsx";
import Media from "../components/Media.jsx";
import PhotoUpload from "../components/PhotoUpload.jsx";

const animalTypes = ["Dog", "Cat", "Bird", "Other"];
const listingFields = { name: "", type: "Dog", breed: "", age: "", gender: "Female", city: "", health: "Healthy", description: "", photo: "" };
const getPhoto = (animal) => animal.photo || animal.images?.[0] || animal.image;

export function AdoptionHub() {
  const { adoptionListings, user } = useApp();
  const [filters, setFilters] = useState({ q: "", city: "", type: "", breed: "", age: "", gender: "" });
  const [sort, setSort] = useState("newest");
  const animals = useMemo(() => [...adoptionListings, ...adoptions.map((animal) => ({ ...animal, status: "Available", description: animal.description || `${animal.name} is looking for a caring home.`, ownerId: null }))].filter((animal) => animal.status !== "Adopted"), [adoptionListings]);
  const cities = [...new Set(animals.map((animal) => animal.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const types = [...new Set(animals.map((animal) => animal.type).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const breeds = [...new Set(animals.map((animal) => animal.breed).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const genders = [...new Set(animals.map((animal) => animal.gender).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const update = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));
  const filteredAnimals = animals.filter((animal) =>
    (!filters.q || `${animal.name || ""} ${animal.breed || ""}`.toLowerCase().includes(filters.q.trim().toLowerCase())) &&
    (!filters.type || animal.type === filters.type) &&
    (!filters.city || animal.city === filters.city) &&
    (!filters.breed || animal.breed === filters.breed) &&
    (!filters.gender || animal.gender === filters.gender) &&
    (!filters.age || (animal.age !== undefined && animal.age !== null && animal.age !== "" && Number.isFinite(Number(animal.age)) && Number(animal.age) <= Number(filters.age))));
  const list = [...filteredAnimals].sort((a, b) => {
    if (sort === "oldest") return (Date.parse(a.createdAt) || Number(a.id) || 0) - (Date.parse(b.createdAt) || Number(b.id) || 0);
    if (sort === "age") return Number(a.age || 0) - Number(b.age || 0) || String(a.name).localeCompare(String(b.name));
    if (sort === "name") return String(a.name).localeCompare(String(b.name));
    return (Date.parse(b.createdAt) || Number(b.id) || 0) - (Date.parse(a.createdAt) || Number(a.id) || 0);
  });
  const clearFilters = () => setFilters({ q: "", city: "", type: "", breed: "", age: "", gender: "" });

  return <div className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)] lg:items-start lg:gap-6">
    <aside aria-label="Adoption filters" className="min-w-0 rounded-2xl border border-stone-200 bg-white p-4">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary-700">Find a companion</p><h2 className="mt-1 text-lg font-extrabold text-ink-900">Filters</h2></div>
        <button type="button" onClick={clearFilters} className="text-xs font-semibold text-primary-700 hover:text-primary-800">Clear</button>
      </div>
      <div className="space-y-3.5">
        <label className="block text-xs font-bold text-ink-700">Search
          <span className="relative mt-1.5 block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input aria-label="Search adoption listings" className={`${input} min-h-10 pl-9 text-sm`} placeholder="Search by name or breed..." value={filters.q} onChange={update("q")} /></span>
        </label>
        <label className="block text-xs font-bold text-ink-700">City
          <select aria-label="Adoption city" className={`${input} mt-1.5 min-h-10 text-sm`} value={filters.city} onChange={update("city")}><option value="">All Cities</option>{cities.map((city) => <option key={city}>{city}</option>)}</select>
        </label>
        <label className="block text-xs font-bold text-ink-700">Animal Type
          <select aria-label="Animal type" className={`${input} mt-1.5 min-h-10 text-sm`} value={filters.type} onChange={update("type")}><option value="">All Types</option>{types.map((type) => <option key={type}>{type}</option>)}</select>
        </label>
        <label className="block text-xs font-bold text-ink-700">Breed
          <select aria-label="Breed" className={`${input} mt-1.5 min-h-10 text-sm`} value={filters.breed} onChange={update("breed")}><option value="">All Breeds</option>{breeds.map((breed) => <option key={breed}>{breed}</option>)}</select>
        </label>
        <label className="block text-xs font-bold text-ink-700">Age
          <span className="relative mt-1.5 block"><input aria-label="Maximum age" className={`${input} min-h-10 pe-14 text-sm`} type="number" min="0" placeholder="Any age" value={filters.age} onChange={update("age")} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-400">max yrs</span></span>
        </label>
        {genders.length > 0 && <label className="block text-xs font-bold text-ink-700">Gender
          <select aria-label="Gender" className={`${input} mt-1.5 min-h-10 text-sm`} value={filters.gender} onChange={update("gender")}><option value="">Any Gender</option>{genders.map((gender) => <option key={gender}>{gender}</option>)}</select>
        </label>}
      </div>
      <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-ink-500">{list.length} {list.length === 1 ? "animal" : "animals"} found</p>
    </aside>

    <section className="min-w-0">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Make room for love</p><h1 className="mt-1 text-2xl font-extrabold text-ink-900 sm:text-3xl">Animals for Adoption</h1><p className="mt-1 text-sm text-ink-500">{list.length} {list.length === 1 ? "animal" : "animals"} to meet</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {user && <Link to="/adoption/my-listings" className={`${btn2} min-h-10 px-3 text-sm`}>My listings</Link>}
          <Link to="/adoption/new" className={`${btn} min-h-10 px-3 text-sm`}><Plus size={15} />Publish a Pet</Link>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-500">Sort by
            <select aria-label="Sort adoption listings" className={`${input} min-h-10 w-auto py-1.5 text-sm`} value={sort} onChange={(event) => setSort(event.target.value)}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="age">Age</option><option value="name">Name</option></select>
          </label>
        </div>
      </header>

      {list.length ? <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((animal) => <article key={`${animal.ownerId || "demo"}-${animal.id}`} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <Link to={`/adoption/${animal.id}`} aria-label={`View details for ${animal.name}`} className="relative block h-44 shrink-0 overflow-hidden bg-primary-50 sm:h-48"><Media src={getPhoto(animal)} alt={`${animal.name}, ${animal.breed || animal.type}`} className="size-full object-cover" /><Badge className="absolute left-3 top-3" variant={animal.status === "Available" ? "success" : "neutral"}>{animal.status || "Available"}</Badge></Link>
          <div className="flex flex-1 flex-col p-3.5">
            <h2 className="truncate text-base font-extrabold text-ink-900"><Link to={`/adoption/${animal.id}`}>{animal.name}</Link></h2>
            <p className="mt-1 truncate text-xs text-ink-500">{animal.type}{animal.breed ? ` · ${animal.breed}` : ""}{animal.age !== undefined && animal.age !== "" ? ` · ${animal.age} ${Number(animal.age) === 1 ? "year" : "years"}` : ""}{animal.gender ? ` · ${animal.gender}` : ""}</p>
            {animal.city && <p className="mt-2 flex items-center gap-1 text-xs text-ink-500"><MapPin size={13} />{animal.city}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">{animal.health && <Badge variant="neutral">{animal.health}</Badge>}</div>
            <Link to={`/adoption/${animal.id}`} className={`${btn2} mt-3 min-h-9 w-full px-3 text-xs`}><Heart size={14} />View Details</Link>
          </div>
        </article>)}
      </div> : <EmptyState title="No animals found" description="Try adjusting your filters." icon={PawPrint} action={<button type="button" className={btn2} onClick={clearFilters}>Clear filters</button>} />}
    </section>
  </div>;
}

export function AdoptionDetails() {
  const { id } = useParams(); const { adoptionListings, user, showToast } = useApp();
  const [requested, setRequested] = useState(false);
  const animal = adoptionListings.find((item) => String(item.id) === id) || adoptions.find((item) => String(item.id) === id);
  if (!animal) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Listing not found" description="This adoption listing may have been removed." icon={PawPrint} action={<Link to="/adoption" className={btn}>Browse adoption</Link>} /></div>;
  return <div><Link to="/adoption" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary-700"><ArrowLeft size={16} /> Adoption</Link><div className="grid items-start gap-6 lg:grid-cols-2"><Media src={getPhoto(animal)} alt={`${animal.name}, ${animal.breed || animal.type}`} className="aspect-[4/3] w-full rounded-2xl object-cover" /><section className={`${card}`}><Badge variant="success">{animal.status || "Available"}</Badge><h1 className="mt-3 text-3xl font-extrabold">{animal.name}</h1><p className="mt-2 text-sm text-ink-500">{animal.type} · {animal.breed || "Mixed breed"}</p><div className="mt-5 grid grid-cols-2 gap-4 border-y border-stone-100 py-4 text-sm"><p><span className="block text-xs text-ink-500">Age</span><strong>{animal.age} years</strong></p><p><span className="block text-xs text-ink-500">Gender</span><strong>{animal.gender}</strong></p><p><span className="block text-xs text-ink-500">City</span><strong>{animal.city}</strong></p><p><span className="block text-xs text-ink-500">Health</span><strong>{animal.health || "Healthy"}</strong></p></div><p className="mt-5 text-sm leading-7 text-ink-700">{animal.description || `${animal.name} is looking for a safe, loving home.`}</p><button type="button" disabled={(animal.status || "Available") !== "Available" || requested} onClick={() => { setRequested(true); showToast(`Your interest in ${animal.name} has been recorded for this demo.`); }} className={`${btn} mt-6 w-full`}><Heart size={16} /> {requested ? "Request sent" : "Ask about adoption"}</button>{!user && <p className="mt-3 text-xs text-ink-500">Sign in to keep track of your adoption interest.</p>}</section></div></div>;
}

function ListingForm({ initial = listingFields, onSubmit, submitLabel }) {
  const [form, setForm] = useState(initial);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <form className={`${card} space-y-4`} onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, age: Number(form.age) }); }}><div><h1 className="text-2xl font-extrabold">{submitLabel === "Publish listing" ? "Publish an adoption listing" : "Edit listing"}</h1><p className="mt-2 text-sm text-ink-500">Share the details that will help a pet find a good home.</p></div><label className="block text-xs font-bold">Photo<div className="mt-2"><PhotoUpload label="Adoption animal photo" value={form.photo || ""} onChange={(photo) => setForm((current) => ({ ...current, photo }))} /></div></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-xs font-bold">Animal name<input required className={`${input} mt-2`} value={form.name} onChange={set("name")} /></label><label className="block text-xs font-bold">Type<select className={`${input} mt-2`} value={form.type} onChange={set("type")}>{animalTypes.map((type) => <option key={type}>{type}</option>)}</select></label><label className="block text-xs font-bold">Breed<input className={`${input} mt-2`} value={form.breed} onChange={set("breed")} /></label><label className="block text-xs font-bold">Age in years<input required type="number" min="0" className={`${input} mt-2`} value={form.age} onChange={set("age")} /></label><label className="block text-xs font-bold">Gender<select className={`${input} mt-2`} value={form.gender} onChange={set("gender")}><option>Female</option><option>Male</option></select></label><label className="block text-xs font-bold">City<input required className={`${input} mt-2`} value={form.city} onChange={set("city")} /></label><label className="block text-xs font-bold sm:col-span-2">Health information<input className={`${input} mt-2`} value={form.health} onChange={set("health")} /></label><label className="block text-xs font-bold sm:col-span-2">Description<textarea required rows="4" className={`${input} mt-2`} value={form.description} onChange={set("description")} /></label></div><Button>{submitLabel}</Button></form>;
}

export function AdoptionNew() {
  const { user, createAdoptionListing, showToast } = useApp(); const navigate = useNavigate();
  if (!user) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Please log in to publish a listing" description="Sign in to manage your adoption posts." icon={PawPrint} action={<Link to="/login" state={{ from: "/adoption/new" }} className={btn}>Log in</Link>} /></div>;
  return <div className="mx-auto max-w-3xl"><Link to="/adoption" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary-700"><ArrowLeft size={16} /> Adoption</Link><ListingForm submitLabel="Publish listing" onSubmit={async (listing) => { await createAdoptionListing(listing); showToast("Adoption listing published."); navigate("/adoption/my-listings"); }} /></div>;
}

export function MyAdoptionListings() {
  const { user, adoptionListings, updateAdoptionListing, deleteAdoptionListing, showToast } = useApp();
  const [editing, setEditing] = useState(null); const [deleting, setDeleting] = useState(null);
  const mine = adoptionListings.filter((listing) => listing.ownerId === user?.email);
  if (!user) return <div className="mx-auto max-w-xl py-8"><EmptyState title="Please log in to manage listings" icon={PawPrint} action={<Link to="/login" state={{ from: "/adoption/my-listings" }} className={btn}>Log in</Link>} /></div>;
  return <div><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Your posts</p><h1 className="mt-2 text-3xl font-extrabold">My adoption listings</h1></div><Link to="/adoption/new" className={btn}><Plus size={16} /> Publish listing</Link></header>{mine.length ? <div className="grid gap-4 md:grid-cols-2">{mine.map((listing) => <article key={listing.id} className={`${card} flex gap-4`}><Media src={getPhoto(listing)} alt={listing.name} className="size-24 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate font-extrabold">{listing.name}</h2><Badge variant={listing.status === "Available" ? "success" : "neutral"}>{listing.status}</Badge></div><p className="mt-1 text-xs text-ink-500">{listing.type} · {listing.city}</p><div className="mt-3 flex flex-wrap gap-2"><button className={btn2} onClick={() => setEditing(listing)}>Edit</button><select aria-label={`Change status for ${listing.name}`} className={`${input} min-h-9 w-auto py-1`} value={listing.status} onChange={async (event) => { await updateAdoptionListing(listing.id, { status: event.target.value }); showToast("Listing status updated."); }}><option>Available</option><option>Adopted</option></select><button aria-label={`Delete ${listing.name}`} onClick={() => setDeleting(listing)} className="grid size-9 place-items-center rounded-lg text-danger-600 hover:bg-red-50"><Trash2 size={15} /></button></div></div></article>)}</div> : <EmptyState title="No adoption listings yet" description="Publish an animal listing and manage it here." icon={PawPrint} action={<Link className={btn} to="/adoption/new">Publish listing</Link>} />}
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title="Edit adoption listing">{editing && <ListingForm key={editing.id} initial={{ ...listingFields, ...editing, photo: getPhoto(editing) }} submitLabel="Save changes" onSubmit={async (changes) => { await updateAdoptionListing(editing.id, changes); setEditing(null); showToast("Listing updated."); }} />}</Modal>
    <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title="Delete this listing?"><p className="text-sm text-ink-500">This adoption listing will be removed.</p><div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleting(null)}>Keep listing</Button><Button variant="danger" onClick={async () => { await deleteAdoptionListing(deleting.id); setDeleting(null); showToast("Listing deleted."); }}>Delete listing</Button></div></Modal>
  </div>;
}
