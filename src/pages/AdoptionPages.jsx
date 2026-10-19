import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Heart, MapPin, PawPrint, Plus, Search, Trash2 } from "lucide-react";
import { adoptions } from "../data.js";
import { useApp } from "../store.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { btn, btn2, card, input } from "../ui.js";
import { Badge, Button, EmptyState, Modal } from "../components/ui.jsx";
import Media from "../components/Media.jsx";
import PhotoUpload from "../components/PhotoUpload.jsx";

const animalTypes = ["Dog", "Cat", "Bird", "Other"];
const listingFields = { name: "", type: "Dog", breed: "", age: "", gender: "Female", city: "", health: "Healthy", description: "", photo: "" };
const getPhoto = (animal) => animal.photo || animal.images?.[0] || animal.image;

export function AdoptionHub() {
  const { adoptionListings, user } = useApp();
  const { t, language } = useLanguage();
  const [filters, setFilters] = useState({ q: "", city: "", type: "", breed: "", age: "", gender: "" });
  const [sort, setSort] = useState("newest");
  const animals = useMemo(() => [...adoptionListings, ...adoptions.map((animal) => ({ ...animal, status: "Available", description: animal.description || `${animal.name} is looking for a caring home.`, ownerId: null }))].filter((animal) => animal.status !== "Adopted"), [adoptionListings]);
  const cities = [...new Set(animals.map((animal) => animal.city).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const types = [...new Set(animals.map((animal) => animal.type).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const breeds = [...new Set(animals.map((animal) => animal.breed).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const genders = [...new Set(animals.map((animal) => animal.gender).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const update = (key) => (event) => setFilters((current) => ({ ...current, [key]: event.target.value }));

  const getCityName = (cityName) => {
    if (cityName === "Cairo") return t("common.cairo", "Cairo");
    if (cityName === "Giza") return t("common.giza", "Giza");
    if (cityName === "Alexandria") return t("common.alexandria", "Alexandria");
    return cityName;
  };

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
        <div><p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-primary-700">{t("adoption.tagline", "Find a companion")}</p><h2 className="mt-1 text-lg font-extrabold text-ink-900">{t("store.filter_by", "Filters")}</h2></div>
        <button type="button" onClick={clearFilters} className="text-xs font-semibold text-primary-700 hover:text-primary-800">{t("common.clear", "Clear")}</button>
      </div>
      <div className="space-y-3.5">
        <label className="block text-xs font-bold text-ink-700">{t("common.search", "Search")}
          <span className="relative mt-1.5 block"><Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" /><input aria-label="Search adoption listings" className={`${input} min-h-10 pl-9 text-sm`} placeholder={t("adoption.search_placeholder", "Search by name or breed...")} value={filters.q} onChange={update("q")} /></span>
        </label>
        <label className="block text-xs font-bold text-ink-700">{t("cart.city", "City")}
          <select aria-label="Adoption city" className={`${input} mt-1.5 min-h-10 text-sm`} value={filters.city} onChange={update("city")}><option value="">{t("common.all_cities", "All Cities")}</option>{cities.map((city) => <option key={city} value={city}>{getCityName(city)}</option>)}</select>
        </label>
        <label className="block text-xs font-bold text-ink-700">{t("adoption.filter_type", "Animal Type")}
          <select aria-label="Animal type" className={`${input} mt-1.5 min-h-10 text-sm`} value={filters.type} onChange={update("type")}><option value="">{t("common.all_types", "All Types")}</option>{types.map((type) => <option key={type} value={type}>{t(`common.${type.toLowerCase()}`, type)}</option>)}</select>
        </label>
        <label className="block text-xs font-bold text-ink-700">{t("pets.breed", "Breed")}
          <select aria-label="Breed" className={`${input} mt-1.5 min-h-10 text-sm`} value={filters.breed} onChange={update("breed")}><option value="">{t("adoption.all_breeds", "All Breeds")}</option>{breeds.map((breed) => <option key={breed}>{breed}</option>)}</select>
        </label>
        <label className="block text-xs font-bold text-ink-700">{t("pets.age", "Age")}
          <span className="relative mt-1.5 block"><input aria-label="Maximum age" className={`${input} min-h-10 pe-14 text-sm`} type="number" min="0" placeholder="Any age" value={filters.age} onChange={update("age")} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-400">{t("adoption.age_max", "max yrs")}</span></span>
        </label>
        {genders.length > 0 && <label className="block text-xs font-bold text-ink-700">{t("pets.gender", "Gender")}
          <select aria-label="Gender" className={`${input} mt-1.5 min-h-10 text-sm`} value={filters.gender} onChange={update("gender")}><option value="">{language === "ru" ? "Любой пол" : "Any Gender"}</option>{genders.map((gender) => <option key={gender} value={gender}>{t(`common.${gender.toLowerCase()}`, gender)}</option>)}</select>
        </label>}
      </div>
      <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-ink-500">{list.length} {t("common.results", "animals found")}</p>
    </aside>

    <section className="min-w-0">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">{t("home.find_a_friend", "Make room for love")}</p><h1 className="mt-1 text-2xl font-extrabold text-ink-900 sm:text-3xl">{t("home.adoption_title", "Animals for Adoption")}</h1><p className="mt-1 text-sm text-ink-500">{list.length} {t("common.results", "animals to meet")}</p></div>
        <div className="flex flex-wrap items-center gap-2">
          {user && <Link to="/adoption/my-listings" className={`${btn2} min-h-10 px-3 text-sm`}>{t("adoption.my_listings", "My listings")}</Link>}
          <Link to="/adoption/new" className={`${btn} min-h-10 px-3 text-sm`}><Plus size={15} />{t("adoption.create_listing", "Publish a Pet")}</Link>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-500">{t("store.sort_by", "Sort by")}
            <select aria-label="Sort adoption listings" className={`${input} min-h-10 w-auto py-1.5 text-sm`} value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">{t("store.newest", "Newest")}</option>
              <option value="oldest">{language === "ru" ? "Сначала старые" : "Oldest"}</option>
              <option value="age">{t("pets.age", "Age")}</option>
              <option value="name">{t("pets.pet_name", "Name")}</option>
            </select>
          </label>
        </div>
      </header>

      {list.length ? <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((animal) => <article key={`${animal.ownerId || "demo"}-${animal.id}`} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition-shadow hover:shadow-md">
          <Link to={`/adoption/${animal.id}`} aria-label={`View details for ${animal.name}`} className="relative block h-44 shrink-0 overflow-hidden bg-primary-50 sm:h-48"><Media src={getPhoto(animal)} alt={`${animal.name}, ${animal.breed || animal.type}`} className="size-full object-cover" /><Badge className="absolute left-3 top-3" variant={animal.status === "Available" ? "success" : "neutral"}>{animal.status === "Available" ? (language === "ru" ? "Ищет дом" : "Available") : animal.status}</Badge></Link>
          <div className="flex flex-1 flex-col p-3.5">
            <h2 className="truncate text-base font-extrabold text-ink-900"><Link to={`/adoption/${animal.id}`}>{animal.name}</Link></h2>
            <p className="mt-1 truncate text-xs text-ink-500">{t(`common.${animal.type.toLowerCase()}`, animal.type)}{animal.breed ? ` · ${animal.breed}` : ""}{animal.age !== undefined && animal.age !== "" ? ` · ${animal.age} ${Number(animal.age) === 1 ? t("common.year", "year") : t("common.years", "years")}` : ""}{animal.gender ? ` · ${t(`common.${animal.gender.toLowerCase()}`, animal.gender)}` : ""}</p>
            {animal.city && <p className="mt-2 flex items-center gap-1 text-xs text-ink-500"><MapPin size={13} />{getCityName(animal.city)}</p>}
            <div className="mt-2 flex flex-wrap gap-1.5">{animal.health && <Badge variant="neutral">{animal.health === "Vaccinated" ? (language === "ru" ? "Привит" : "Vaccinated") : animal.health}</Badge>}</div>
            <Link to={`/adoption/${animal.id}`} className={`${btn2} mt-3 min-h-9 w-full px-3 text-xs`}><Heart size={14} />{t("common.details", "View Details")}</Link>
          </div>
        </article>)}
      </div> : <EmptyState title={t("adoption.no_matches", "No animals found")} description={t("adoption.no_matches_sub", "Try adjusting your filters.")} icon={PawPrint} action={<button type="button" className={btn2} onClick={clearFilters}>{t("adoption.clear_filters", "Clear filters")}</button>} />}
    </section>
  </div>;
}

export function AdoptionDetails() {
  const { id } = useParams();
  const { adoptionListings, user, showToast } = useApp();
  const { t, language } = useLanguage();
  const [requested, setRequested] = useState(false);
  const animal = adoptionListings.find((item) => String(item.id) === id) || adoptions.find((item) => String(item.id) === id);

  const getCityName = (cityName) => {
    if (cityName === "Cairo") return t("common.cairo", "Cairo");
    if (cityName === "Giza") return t("common.giza", "Giza");
    if (cityName === "Alexandria") return t("common.alexandria", "Alexandria");
    return cityName;
  };

  if (!animal) return <div className="mx-auto max-w-xl py-8"><EmptyState title={t("common.page_not_found", "Listing not found")} description={t("common.page_not_found_desc", "This adoption listing may have been removed.")} icon={PawPrint} action={<Link to="/adoption" className={btn}>{t("nav.adoption", "Browse adoption")}</Link>} /></div>;
  return <div><Link to="/adoption" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary-700"><ArrowLeft size={16} /> {t("nav.adoption", "Adoption")}</Link><div className="grid items-start gap-6 lg:grid-cols-2"><Media src={getPhoto(animal)} alt={`${animal.name}, ${animal.breed || animal.type}`} className="aspect-[4/3] w-full rounded-2xl object-cover" /><section className={`${card}`}><Badge variant="success">{animal.status === "Available" ? (language === "ru" ? "Ищет дом" : "Available") : animal.status}</Badge><h1 className="mt-3 text-3xl font-extrabold">{animal.name}</h1><p className="mt-2 text-sm text-ink-500">{t(`common.${animal.type.toLowerCase()}`, animal.type)} · {animal.breed || "Mixed breed"}</p><div className="mt-5 grid grid-cols-2 gap-4 border-y border-stone-100 py-4 text-sm"><p><span className="block text-xs text-ink-500">{t("pets.age", "Age")}</span><strong>{animal.age} {t("common.years", "years")}</strong></p><p><span className="block text-xs text-ink-500">{t("pets.gender", "Gender")}</span><strong>{t(`common.${(animal.gender || "male").toLowerCase()}`, animal.gender)}</strong></p><p><span className="block text-xs text-ink-500">{t("cart.city", "City")}</span><strong>{getCityName(animal.city)}</strong></p><p><span className="block text-xs text-ink-500">{t("pets.health_status", "Health")}</span><strong>{animal.health || t("common.healthy", "Healthy")}</strong></p></div><p className="mt-5 text-sm leading-7 text-ink-700">{animal.description || `${animal.name} is looking for a safe, loving home.`}</p><button type="button" disabled={(animal.status || "Available") !== "Available" || requested} onClick={() => { setRequested(true); showToast(language === "ru" ? `Ваш запрос на усыновление ${animal.name} зарегистрирован.` : `Your interest in ${animal.name} has been recorded for this demo.`); }} className={`${btn} mt-6 w-full`}><Heart size={16} /> {requested ? t("adoption.request_sent", "Request sent") : t("adoption.ask_adoption", "Ask about adoption")}</button>{!user && <p className="mt-3 text-xs text-ink-500">{language === "ru" ? "Войдите, чтобы отслеживать статус усыновления." : "Sign in to keep track of your adoption interest."}</p>}</section></div></div>;
}

function ListingForm({ initial = listingFields, onSubmit, submitLabel }) {
  const { t } = useLanguage();
  const [form, setForm] = useState(initial);
  const set = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));
  return <form className={`${card} space-y-4`} onSubmit={(event) => { event.preventDefault(); onSubmit({ ...form, age: Number(form.age) }); }}>
    <div><h1 className="text-2xl font-extrabold">{submitLabel === "Publish listing" ? t("adoption.create_listing", "Publish an adoption listing") : t("common.edit", "Edit listing")}</h1><p className="mt-2 text-sm text-ink-500">{t("adoption.subtitle", "Share the details that will help a pet find a good home.")}</p></div>
    <label className="block text-xs font-bold">{t("pets.pet_photo", "Photo")}<div className="mt-2"><PhotoUpload label="Adoption animal photo" value={form.photo || ""} onChange={(photo) => setForm((current) => ({ ...current, photo }))} /></div></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-xs font-bold">{t("pets.pet_name", "Animal name")}<input required className={`${input} mt-2`} value={form.name} onChange={set("name")} /></label>
      <label className="block text-xs font-bold">{t("adoption.filter_type", "Type")}<select className={`${input} mt-2`} value={form.type} onChange={set("type")}>{animalTypes.map((type) => <option key={type} value={type}>{t(`common.${type.toLowerCase()}`, type)}</option>)}</select></label>
      <label className="block text-xs font-bold">{t("pets.breed", "Breed")}<input className={`${input} mt-2`} value={form.breed} onChange={set("breed")} /></label>
      <label className="block text-xs font-bold">{t("pets.age", "Age in years")}<input required type="number" min="0" className={`${input} mt-2`} value={form.age} onChange={set("age")} /></label>
      <label className="block text-xs font-bold">{t("pets.gender", "Gender")}<select className={`${input} mt-2`} value={form.gender} onChange={set("gender")}><option value="Female">{t("common.female", "Female")}</option><option value="Male">{t("common.male", "Male")}</option></select></label>
      <label className="block text-xs font-bold">{t("cart.city", "City")}<input required className={`${input} mt-2`} value={form.city} onChange={set("city")} /></label>
      <label className="block text-xs font-bold sm:col-span-2">{t("adoption.medical_info", "Health information")}<input className={`${input} mt-2`} value={form.health} onChange={set("health")} /></label>
      <label className="block text-xs font-bold sm:col-span-2">{t("store.about_product", "Description")}<textarea required rows="4" className={`${input} mt-2`} value={form.description} onChange={set("description")} /></label>
    </div>
    <Button>{submitLabel}</Button>
  </form>;
}

export function AdoptionNew() {
  const { user, createAdoptionListing, showToast } = useApp();
  const { t } = useLanguage();
  const navigate = useNavigate();
  if (!user) return <div className="mx-auto max-w-xl py-8"><EmptyState title={t("bookings.login_required", "Please log in to publish a listing")} description="Sign in to manage your adoption posts." icon={PawPrint} action={<Link to="/login" state={{ from: "/adoption/new" }} className={btn}>{t("nav.log_in", "Log in")}</Link>} /></div>;
  return <div className="mx-auto max-w-3xl"><Link to="/adoption" className="mb-5 inline-flex items-center gap-2 text-sm font-bold text-primary-700"><ArrowLeft size={16} /> {t("nav.adoption", "Adoption")}</Link><ListingForm submitLabel={t("adoption.create_listing", "Publish listing")} onSubmit={async (listing) => { await createAdoptionListing(listing); showToast("Adoption listing published."); navigate("/adoption/my-listings"); }} /></div>;
}

export function MyAdoptionListings() {
  const { user, adoptionListings, updateAdoptionListing, deleteAdoptionListing, showToast } = useApp();
  const { t, language } = useLanguage();
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const mine = adoptionListings.filter((listing) => listing.ownerId === user?.email);
  if (!user) return <div className="mx-auto max-w-xl py-8"><EmptyState title={t("bookings.login_required", "Please log in to manage listings")} icon={PawPrint} action={<Link to="/login" state={{ from: "/adoption/my-listings" }} className={btn}>{t("nav.log_in", "Log in")}</Link>} /></div>;
  return <div><header className="mb-7 flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">{t("adoption.my_listings", "Your posts")}</p><h1 className="mt-2 text-3xl font-extrabold">{t("adoption.my_listings", "My adoption listings")}</h1></div><Link to="/adoption/new" className={btn}><Plus size={16} /> {t("adoption.create_listing", "Publish listing")}</Link></header>{mine.length ? <div className="grid gap-4 md:grid-cols-2">{mine.map((listing) => <article key={listing.id} className={`${card} flex gap-4`}><Media src={getPhoto(listing)} alt={listing.name} className="size-24 shrink-0 rounded-xl object-cover" /><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><h2 className="truncate font-extrabold">{listing.name}</h2><Badge variant={listing.status === "Available" ? "success" : "neutral"}>{listing.status}</Badge></div><p className="mt-1 text-xs text-ink-500">{listing.type} · {listing.city}</p><div className="mt-3 flex flex-wrap gap-2"><button className={btn2} onClick={() => setEditing(listing)}>{t("common.edit", "Edit")}</button><select aria-label={`Change status for ${listing.name}`} className={`${input} min-h-9 w-auto py-1`} value={listing.status} onChange={async (event) => { await updateAdoptionListing(listing.id, { status: event.target.value }); showToast("Listing status updated."); }}><option value="Available">{language === "ru" ? "Ищет дом" : "Available"}</option><option value="Adopted">{language === "ru" ? "Усыновлен" : "Adopted"}</option></select><button aria-label={`Delete ${listing.name}`} onClick={() => setDeleting(listing)} className="grid size-9 place-items-center rounded-lg text-danger-600 hover:bg-red-50"><Trash2 size={15} /></button></div></div></article>)}</div> : <EmptyState title="No adoption listings yet" description="Publish an animal listing and manage it here." icon={PawPrint} action={<Link className={btn} to="/adoption/new">{t("adoption.create_listing", "Publish listing")}</Link>} />}
    <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={t("common.edit", "Edit adoption listing")}>{editing && <ListingForm key={editing.id} initial={{ ...listingFields, ...editing, photo: getPhoto(editing) }} submitLabel={t("common.save", "Save changes")} onSubmit={async (changes) => { await updateAdoptionListing(editing.id, changes); setEditing(null); showToast("Listing updated."); }} />}</Modal>
    <Modal open={Boolean(deleting)} onClose={() => setDeleting(null)} title={t("common.delete", "Delete this listing?")}><p className="text-sm text-ink-500">{t("common.confirm", "This adoption listing will be removed.")}</p><div className="mt-5 flex justify-end gap-2"><Button variant="secondary" onClick={() => setDeleting(null)}>{t("common.cancel", "Keep listing")}</Button><Button variant="danger" onClick={async () => { await deleteAdoptionListing(deleting.id); setDeleting(null); showToast("Listing deleted."); }}>{t("common.delete", "Delete listing")}</Button></div></Modal>
  </div>;
}
