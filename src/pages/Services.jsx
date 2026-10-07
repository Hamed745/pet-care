import { useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Activity, ArrowLeft, ArrowRight, Bath, CalendarDays, Check, Clock3, Heart, Home, MapPin, Scissors, Search, ShieldCheck, Star, Stethoscope, UserRound } from "lucide-react";
import { providers } from "../data.js";
import { useApp } from "../store.jsx";
import Media from "../components/Media.jsx";
import PetAvatar from "../components/PetAvatar.jsx";
import { btn, btn2, card, input } from "../ui.js";
export const titles = { vet: "Veterinary", grooming: "Grooming", sitting: "Pet Sitting" };
const serviceIcons = { vet: Stethoscope, grooming: Scissors, sitting: Home };
const providerIcons = { clinic: Activity, stethoscope: Stethoscope, hospital: Activity, scissors: Scissors, bath: Bath, home: Home, walk: UserRound };
const serviceSlugs = { vet: "veterinary", grooming: "grooming", sitting: "pet-sitting" };
const typeFromSlug = (slug) => ({ veterinary: "vet", "pet-sitting": "sitting" })[slug] || slug;

const providerMeta = {
  1: { hours: "Open 24 hours", specialties: ["General Care", "Vaccination", "Emergency"], services: ["General checkup", "Vaccination", "Emergency assessment"], doctors: ["Dr. Leila Hassan", "Dr. Karim Nabil"] },
  2: { hours: "Daily, 9:00 AM to 8:00 PM", specialties: ["General Care", "Dental Care", "Dermatology"], services: ["Consultation", "Dental care", "Skin check"], doctors: ["Dr. Salma" ] },
  3: { hours: "Open 24 hours", specialties: ["General Care", "Surgery", "Emergency"], services: ["Consultation", "Surgery assessment", "Emergency care"], doctors: ["Dr. Youssef Adel", "Dr. Mariam Tarek"] },
  4: { hours: "Daily, 10:00 AM to 7:00 PM", services: ["Basic Care", "Full Grooming", "Premium Care"], packages: { "Basic Care": 200, "Full Grooming": 360, "Premium Care": 520 } },
  5: { hours: "Sat-Thu, 9:00 AM to 6:00 PM", services: ["Bath", "Haircut", "Nail care", "Full Grooming"], packages: { Bath: 180, Haircut: 260, "Nail care": 120, "Full Grooming": 420 } },
  6: { hours: "By appointment, 7:00 AM to 10:00 PM", experience: "5 years of pet care", availability: "Daily", services: ["2 hours", "4 hours", "8 hours"], packages: { "2 hours": 150, "4 hours": 280, "8 hours": 520 } },
  7: { hours: "Weekdays, 7:00 AM to 6:00 PM", experience: "5 years of dog walking", availability: "Weekdays", services: ["30-minute walk", "60-minute walk", "Visit"], packages: { "30-minute walk": 100, "60-minute walk": 180, Visit: 130 } },
};
const serviceMetadata = (provider) => providerMeta[provider.id] || {};

function ServicesDirectory({ categoryType = "" }) {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState(searchParams.get("city") || "");
  const [activeType, setActiveType] = useState("");
  const [petType, setPetType] = useState(searchParams.get("pet") || "");
  const [maxPrice, setMaxPrice] = useState(500);
  const [minRating, setMinRating] = useState(0);
  const [sort, setSort] = useState("recommended");
  const [specialty, setSpecialty] = useState("");
  const [serviceFilter, setServiceFilter] = useState("");
  const availableProviders = providers.filter((provider) => !categoryType || provider.type === categoryType);
  const cities = [...new Set(availableProviders.map((provider) => provider.city))].sort();
  const serviceTypes = [...new Set(providers.map((provider) => provider.type))];
  const petTypes = [...new Set(availableProviders.flatMap((provider) => provider.petTypes || []))];
  const specialties = [...new Set(availableProviders.flatMap((provider) => serviceMetadata(provider).specialties || []))];
  const serviceOptions = [...new Set(availableProviders.flatMap((provider) => serviceMetadata(provider).services || []))];
  const filteredProviders = availableProviders.filter((provider) => {
    const searchable = `${provider.name} ${provider.city} ${provider.info} ${titles[provider.type]} ${(serviceMetadata(provider).services || []).join(" ")} ${(serviceMetadata(provider).specialties || []).join(" ")}`.toLowerCase();
    return (!query || searchable.includes(query.trim().toLowerCase()))
      && (!city || provider.city === city)
      && (categoryType || !activeType || provider.type === activeType)
      && (!petType || provider.petTypes?.includes(petType))
      && provider.price <= maxPrice
      && provider.rating >= minRating
      && (!specialty || serviceMetadata(provider).specialties?.includes(specialty))
      && (!serviceFilter || serviceMetadata(provider).services?.includes(serviceFilter));
  }).sort((a, b) => sort === "price" ? a.price - b.price : sort === "rating" ? b.rating - a.rating : b.rating - a.price / 1000);
  const resetFilters = () => {
    setQuery("");
    setCity("");
    setActiveType("");
    setPetType("");
    setMaxPrice(500);
    setMinRating(0);
    setSort("recommended");
    setSpecialty("");
    setServiceFilter("");
  };

  const heroProvider = availableProviders[0] || providers[0];
  const pageTitle = categoryType ? `${titles[categoryType] || "Pet Care"} Services` : "Find the Best Care for Your Pet";
  const pageDescriptions = { vet: "Find trusted veterinary care for your pet.", grooming: "Find trusted grooming services for your pet.", sitting: "Find trusted pet sitting for your pet." };
  const pageDescription = categoryType ? pageDescriptions[categoryType] : "Trusted local professionals for every paw, whisker, and stage of life.";

  return <div className="services-directory">
    <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs font-medium text-ink-500">
      <Link to="/" className="hover:text-primary-700">Home</Link><span aria-hidden="true">/</span><Link to="/services" className="hover:text-primary-700">Services</Link>{categoryType && <><span aria-hidden="true">/</span><span className="text-ink-700">{titles[categoryType]}</span></>}
    </nav>

    <section className="relative isolate mb-5 overflow-hidden rounded-2xl border border-stone-200 bg-white px-5 py-6 sm:px-7 lg:min-h-[184px] lg:px-9">
      <div className="relative z-10 max-w-2xl">
        <p className="text-xs font-bold uppercase tracking-wider text-primary-700">{categoryType ? titles[categoryType] : "PetCare services"}</p>
        <h1 className="mt-2 max-w-lg text-3xl font-extrabold leading-tight text-ink-900 sm:text-4xl">{categoryType ? pageTitle : <>Find the Best Care<br className="hidden sm:block" /> for Your Pet</>}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-ink-500">{pageDescription}</p>
      </div>
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[38%] overflow-hidden lg:block">
        <img src={heroProvider?.image} alt={`${titles[heroProvider?.type] || "Pet"} care`} className="absolute inset-0 size-full object-cover object-center opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/70 to-transparent" />
      </div>
    </section>

    <form role="search" onSubmit={(event) => event.preventDefault()} className="mb-4 grid gap-2 rounded-xl border border-stone-200 bg-white p-2 shadow-sm sm:grid-cols-[minmax(0,1fr)_190px_48px]">
      <label className="relative block min-w-0">
        <span className="sr-only">Search services, clinics, or location</span>
        <Search size={17} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-500" />
        <input aria-label="Search services, clinics, or location" className={`${input} min-h-11 border-0 bg-transparent pl-10 shadow-none focus:ring-0`} placeholder={categoryType ? `Search ${titles[categoryType]?.toLowerCase()} providers...` : "Search services, clinics, or location..."} value={query} onChange={(event) => setQuery(event.target.value)} />
      </label>
      <label className="relative block min-w-0">
        <span className="sr-only">Filter by city</span>
        <MapPin size={16} aria-hidden="true" className="absolute left-3.5 top-1/2 -translate-y-1/2 text-primary-700" />
        <select aria-label="Filter by city" className={`${input} min-h-11 appearance-none bg-white pl-10 pr-8`} value={city} onChange={(event) => setCity(event.target.value)}>
          <option value="">All locations</option>{cities.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </label>
      <button aria-label="Search providers" type="submit" className="grid min-h-11 place-items-center rounded-lg bg-primary-700 text-white transition hover:bg-primary-800"><Search size={18} /></button>
    </form>

    <nav aria-label="Service categories" className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-5">
      <Link to="/services" aria-current={!categoryType ? "page" : undefined} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition ${!categoryType ? "bg-primary-700 text-white" : "border border-stone-200 bg-white text-ink-700 hover:border-primary-200"}`}><Activity size={15} /> All services</Link>
      {serviceTypes.map((type) => {
        const Icon = serviceIcons[type] || Stethoscope;
        const isActive = categoryType === type;
        return <Link key={type} to={`/services/${serviceSlugs[type]}`} aria-current={isActive ? "page" : undefined} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg px-3 text-xs font-bold transition ${isActive ? "bg-primary-700 text-white" : "border border-stone-200 bg-white text-ink-700 hover:border-primary-200"}`}><Icon size={15} />{titles[type]}</Link>;
      })}
      <Link to="/emergency" className="flex min-h-10 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-3 text-xs font-bold text-ink-700 transition hover:border-primary-200"><Activity size={15} className="text-primary-700" /> Emergency</Link>
    </nav>

    <div className="grid items-start gap-5 lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside aria-label="Provider filters" className="rounded-xl border border-stone-200 bg-white p-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="text-sm font-extrabold text-ink-900">Filters</h2><button type="button" onClick={resetFilters} className="text-xs font-semibold text-primary-700 hover:underline">Clear all</button></div>
        <div className="space-y-4 divide-y divide-stone-100">
          <section className="pb-4">
            <h3 className="mb-2 text-xs font-bold text-ink-800">Location</h3>
            <label className="sr-only" htmlFor="services-city-filter">City</label>
            <select id="services-city-filter" aria-label="City filter" className={`${input} min-h-9 py-1.5 text-xs`} value={city} onChange={(event) => setCity(event.target.value)}><option value="">All cities</option>{cities.map((name) => <option key={name} value={name}>{name}</option>)}</select>
          </section>
          <section className="pb-4">
            <h3 className="mb-2 text-xs font-bold text-ink-800">Service Type</h3>
            <div className="space-y-2">{serviceTypes.map((type) => <div key={type} className="flex items-center justify-between gap-2"><label className={`flex items-center gap-2 text-xs text-ink-700 ${categoryType ? "cursor-default" : "cursor-pointer"}`}><input type="checkbox" className="size-3.5 accent-primary-700" checked={categoryType ? categoryType === type : activeType === type} disabled={Boolean(categoryType)} onChange={() => setActiveType(activeType === type ? "" : type)} />{titles[type]}</label><Link to={`/services/${serviceSlugs[type]}`} aria-label={`Browse ${titles[type]} providers`} className="grid size-6 place-items-center rounded text-primary-700 hover:bg-primary-50"><ArrowRight size={13} /></Link></div>)}</div>
          </section>
          <section className="pb-4">
            <div className="mb-2 flex items-center justify-between"><h3 className="text-xs font-bold text-ink-800">Price Range</h3><span className="text-[11px] text-ink-500">Up to {maxPrice} EGP</span></div>
            <input aria-label="Maximum price in EGP" type="range" min="100" max="500" step="25" value={maxPrice} onChange={(event) => setMaxPrice(Number(event.target.value))} className="h-2 w-full cursor-pointer accent-primary-700" />
            <div className="mt-1 flex justify-between text-[10px] text-ink-500"><span>100 EGP</span><span>500 EGP</span></div>
          </section>
          <section className="pb-4">
            <h3 className="mb-2 text-xs font-bold text-ink-800">Rating</h3>
            <div className="space-y-2">{[4.8, 4.5, 4, 0].map((rating) => <label key={rating} className="flex cursor-pointer items-center gap-2 text-xs text-ink-700"><input type="radio" name="provider-rating" className="size-3.5 accent-primary-700" checked={minRating === rating} onChange={() => setMinRating(rating)} /><span className="flex items-center gap-1"><Star size={12} fill="currentColor" className="text-amber-400" />{rating ? `${rating}+` : "Any rating"}</span></label>)}</div>
          </section>
          {specialties.length > 0 && <section className="pb-4"><h3 className="mb-2 text-xs font-bold text-ink-800">Specialty</h3><select aria-label="Filter by specialty" className={`${input} min-h-9 py-1.5 text-xs`} value={specialty} onChange={(event) => setSpecialty(event.target.value)}><option value="">All specialties</option>{specialties.map((item) => <option key={item}>{item}</option>)}</select></section>}
          {serviceOptions.length > 0 && <section className="pb-4"><h3 className="mb-2 text-xs font-bold text-ink-800">Service</h3><select aria-label="Filter by service" className={`${input} min-h-9 py-1.5 text-xs`} value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}><option value="">All services</option>{serviceOptions.map((item) => <option key={item}>{item}</option>)}</select></section>}
          <section>
            <h3 className="mb-2 text-xs font-bold text-ink-800">Pet Type</h3>
            <div className="space-y-2">{petTypes.map((type) => <label key={type} className="flex cursor-pointer items-center gap-2 text-xs capitalize text-ink-700"><input type="checkbox" className="size-3.5 accent-primary-700" checked={petType === type} onChange={() => setPetType(petType === type ? "" : type)} />{type === "other" ? "Other pets" : `${type}s`}</label>)}</div>
          </section>
        </div>
      </aside>

      <section aria-label="Service providers" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-xs font-semibold text-ink-600"><strong className="text-ink-900">{filteredProviders.length}</strong> providers found</p>
          <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xs text-ink-500">Sort by
            <select aria-label="Sort providers" className={`${input} min-h-8 w-auto py-1 pl-2 pr-7 text-xs`} value={sort} onChange={(event) => setSort(event.target.value)}><option value="recommended">Recommended</option><option value="rating">Top rated</option><option value="price">Price: low to high</option></select>
          </label>
        </div>
        {filteredProviders.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProviders.map((provider) => {
            const Icon = providerIcons[provider.icon] || serviceIcons[provider.type] || Stethoscope;
            const meta = serviceMetadata(provider);
            const tags = (meta.specialties || meta.services || []).slice(0, 2);
            return <article key={provider.id} className="group overflow-hidden rounded-xl border border-stone-200 bg-white transition duration-150 hover:-translate-y-0.5 hover:border-primary-200 hover:shadow-md">
              <Link to={`/services/${provider.type}/${provider.id}`} aria-label={`View ${provider.name} details`} className="relative block aspect-[3/2] overflow-hidden bg-stone-100">
                <Media src={provider.image} alt={provider.name} className="size-full object-cover transition duration-300 group-hover:scale-[1.02]" />
                <span className="absolute left-3 top-3 grid size-8 place-items-center rounded-lg bg-white/95 text-primary-700 shadow-sm"><Icon size={16} /></span>
                <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-white/95 px-2 py-1 text-xs font-bold text-ink-900"><Star size={12} fill="currentColor" className="text-amber-400" />{provider.rating.toFixed(1)}</span>
              </Link>
              <div className="p-3.5">
                <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><h2 className="truncate text-sm font-extrabold text-ink-900">{provider.name}</h2><p className="mt-1 flex items-center gap-1 text-xs text-ink-500"><MapPin size={12} />{provider.city}</p></div><span className="shrink-0 rounded-full bg-primary-50 px-2 py-1 text-[10px] font-bold text-primary-800">{titles[provider.type]}</span></div>
                <p className="mt-2 line-clamp-1 text-xs text-ink-600">{provider.info}</p>
                <div className="mt-2 flex min-h-6 flex-wrap gap-1.5">{tags.map((tag) => <span key={tag} className="rounded-md bg-teal-50 px-2 py-1 text-[10px] font-semibold text-primary-800">{tag}</span>)}</div>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-stone-100 pt-2.5"><span className="text-[11px] text-ink-500">From <strong className="text-ink-900">{provider.price} EGP</strong></span><Link to={`/services/${provider.type}/${provider.id}`} className="inline-flex min-h-8 items-center gap-1 rounded-md bg-primary-700 px-2.5 text-[11px] font-bold text-white transition hover:bg-primary-800">View Details<ArrowRight size={13} /></Link></div>
                {meta.hours && <p className="mt-2 flex items-center gap-1 text-[10px] text-ink-500"><Clock3 size={11} className="text-primary-700" />{meta.hours}</p>}
              </div>
            </article>;
          })}
        </div> : <div className="rounded-xl border border-stone-200 bg-white px-5 py-14 text-center"><Search size={24} className="mx-auto text-primary-700" /><h2 className="mt-3 text-base font-bold text-ink-900">No providers match those filters</h2><p className="mt-1 text-sm text-ink-500">Try a different city, service, or price range.</p><button type="button" onClick={resetFilters} className="mt-4 text-sm font-bold text-primary-700 hover:underline">Clear filters</button></div>}
      </section>
    </div>
  </div>;
}

export function ServicesHome() {
  return <ServicesDirectory />;
}

export function ServiceList() {
  const { type } = useParams();
  return <ServicesDirectory categoryType={typeFromSlug(type)} />;
}

export function ServiceDetails() {
  const { id } = useParams();
  const nav = useNavigate();
  const { pets, createBooking } = useApp();
  const provider = providers.find((item) => item.id === Number(id));
  const meta = provider ? serviceMetadata(provider) : {};
  const serviceOptions = meta.services || ["Consultation"];
  const [activeTab, setActiveTab] = useState("Overview");
  const [form, setForm] = useState({ pet: pets[0]?.id || "", service: serviceOptions[0] || "Consultation", doctor: meta.doctors?.[0] || "", duration: "2 hours", date: "", time: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const setField = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  if (!provider) return <div className={`${card} mx-auto max-w-lg py-14 text-center`}><h1 className="text-2xl font-extrabold">Provider not found</h1><Link to="/services" className={`${btn} mt-5`}>Browse services</Link></div>;

  const selectedPrice = meta.packages?.[form.service] ?? provider.price;
  const bookingDuration = provider.type === "sitting" ? form.service : undefined;
  const tabs = ["Overview", "Services", ...(meta.doctors?.length ? ["Doctors"] : []), "Location"];
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      await createBooking({ provider: { ...provider, price: selectedPrice, selectedService: form.service, doctor: form.doctor || undefined, duration: bookingDuration }, pet: pets.find((pet) => pet.id === Number(form.pet)), service: form.service, doctor: form.doctor || undefined, duration: bookingDuration, date: form.date, time: form.time, notes: form.notes });
      nav("/bookings", { state: { toast: "Your appointment request is confirmed." } });
    } finally {
      setSaving(false);
    }
  };

  return <div>
    <nav aria-label="Breadcrumb" className="mb-5 flex flex-wrap items-center gap-2 text-xs font-medium text-ink-500">
      <Link to="/" className="hover:text-primary-700">Home</Link><span aria-hidden="true">/</span>
      <Link to="/services" className="hover:text-primary-700">Services</Link><span aria-hidden="true">/</span>
      <Link to={`/services/${serviceSlugs[provider.type]}`} className="hover:text-primary-700">{titles[provider.type]}</Link><span aria-hidden="true">/</span>
      <span className="text-ink-700">{provider.name}</span>
    </nav>

    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
      <main className="min-w-0">
        <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-stone-200 bg-stone-100 sm:aspect-[16/7]">
          <Media src={provider.image} alt={`${provider.name} service location`} className="size-full object-cover" />
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-ink-800 shadow-sm"><Clock3 size={15} className="text-primary-700" />{meta.hours || "By appointment"}</span>
        </div>

        <header className="flex flex-wrap items-start justify-between gap-4 py-5">
          <div className="min-w-0">
            <p className="text-xs font-bold text-primary-700">{titles[provider.type]}</p>
            <h1 className="mt-1 text-2xl font-extrabold text-ink-900 sm:text-3xl">{provider.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
              <span className="inline-flex items-center gap-1.5 font-semibold text-ink-800"><Star size={15} fill="currentColor" className="text-amber-400" />{provider.rating.toFixed(1)}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin size={15} />{provider.city}</span>
              <span className="inline-flex items-center gap-1.5 text-primary-700"><ShieldCheck size={15} />Trusted provider</span>
            </div>
          </div>
          <span className="rounded-full bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-800">{titles[provider.type]}</span>
        </header>

        <nav role="tablist" aria-label="Provider details" className="flex gap-5 overflow-x-auto border-b border-stone-200">
          {tabs.map((tab) => <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} onClick={() => setActiveTab(tab)} className={`relative min-h-11 shrink-0 px-1 text-sm font-semibold transition ${activeTab === tab ? "text-primary-700 after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary-700" : "text-ink-500 hover:text-ink-900"}`}>{tab}</button>)}
        </nav>

        <section role="tabpanel" className="py-5">
          {activeTab === "Overview" && <div className="space-y-5">
            <section><h2 className="text-base font-extrabold text-ink-900">About</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-ink-600">{provider.info}</p></section>
            <section className="border-t border-stone-200 pt-5"><div className="flex items-end justify-between gap-3"><div><h2 className="text-base font-extrabold text-ink-900">Services</h2><p className="mt-1 text-xs text-ink-500">Available at {provider.name}</p></div><button type="button" onClick={() => setActiveTab("Services")} className="text-xs font-bold text-primary-700 hover:underline">View all</button></div>
              <div className="mt-3 divide-y divide-stone-100">{serviceOptions.slice(0, 4).map((service) => <div key={service} className="flex items-center justify-between gap-4 py-3 text-sm"><span className="flex min-w-0 items-center gap-2 font-medium text-ink-800"><Check size={15} className="shrink-0 text-primary-700" />{service}</span><span className="shrink-0 font-bold text-ink-900">{meta.packages?.[service] ? `${meta.packages[service]} EGP` : `From ${provider.price} EGP`}</span></div>)}</div>
            </section>
            <section className="grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
              <div><h2 className="text-sm font-extrabold text-ink-900">Opening hours</h2><p className="mt-2 flex items-center gap-2 text-sm text-ink-600"><Clock3 size={15} className="text-primary-700" />{meta.hours || "By appointment"}</p></div>
              <div><h2 className="text-sm font-extrabold text-ink-900">Location</h2><p className="mt-2 flex items-center gap-2 text-sm text-ink-600"><MapPin size={15} className="text-primary-700" />{provider.city}</p></div>
              {(meta.specialties?.length || provider.petTypes?.length) > 0 && <div className="sm:col-span-2"><h2 className="text-sm font-extrabold text-ink-900">Care and pets</h2><div className="mt-2 flex flex-wrap gap-2">{(meta.specialties || []).map((specialty) => <span key={specialty} className="rounded-md bg-primary-50 px-2.5 py-1 text-xs font-semibold text-primary-800">{specialty}</span>)}{(provider.petTypes || []).map((petType) => <span key={petType} className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-700">{petType === "other" ? "Other pets" : `${petType}s`}</span>)}</div></div>}
            </section>
          </div>}
          {activeTab === "Services" && <section><h2 className="text-base font-extrabold text-ink-900">Services & pricing</h2><div className="mt-3 divide-y divide-stone-200">{serviceOptions.map((service) => <div key={service} className="flex items-center justify-between gap-4 py-4"><div className="flex min-w-0 items-start gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700"><Check size={16} /></span><span className="min-w-0"><b className="block text-sm text-ink-900">{service}</b><span className="mt-1 block text-xs text-ink-500">{provider.info}</span></span></div><b className="shrink-0 text-sm text-ink-900">{meta.packages?.[service] ? `${meta.packages[service]} EGP` : `${provider.price} EGP`}</b></div>)}</div></section>}
          {activeTab === "Doctors" && meta.doctors?.length > 0 && <section><h2 className="text-base font-extrabold text-ink-900">Care team</h2><p className="mt-1 text-sm text-ink-500">Choose a provider in the appointment form.</p><div className="mt-4 grid gap-3 sm:grid-cols-2">{meta.doctors.map((doctor) => <div key={doctor} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-4"><span className="grid size-10 place-items-center rounded-full bg-primary-50 text-primary-700"><UserRound size={18} /></span><span><b className="block text-sm text-ink-900">{doctor}</b><span className="mt-1 block text-xs text-ink-500">{titles[provider.type]} care team</span></span></div>)}</div></section>}
          {activeTab === "Location" && <section><h2 className="text-base font-extrabold text-ink-900">Location</h2><div className="mt-3 flex items-start gap-3 rounded-xl border border-stone-200 bg-white p-4"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-50 text-primary-700"><MapPin size={17} /></span><div><b className="text-sm text-ink-900">{provider.city}</b><p className="mt-1 text-sm text-ink-500">City-level location provided for this listing.</p></div></div></section>}
        </section>
      </main>

      <aside className="min-w-0 lg:sticky lg:top-24">
        <form onSubmit={submit} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wide text-primary-700">Appointment</p><h2 className="mt-1 text-lg font-extrabold text-ink-900">Book an Appointment</h2></div><span className="rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-extrabold text-primary-800">{provider.price} EGP+</span></div>
          <div className="mt-4 space-y-3.5">
            {pets.length ? <label className="block text-xs font-bold text-ink-800">Select Pet<select required aria-label="Choose your pet" className={`${input} mt-1.5 min-h-10 text-sm`} value={form.pet} onChange={setField("pet")}>{pets.map((pet) => <option key={pet.id} value={pet.id}>{pet.name} ({pet.type})</option>)}</select></label> : <p className="rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">Add a pet before booking this service.</p>}
            {meta.doctors?.length > 0 && <label className="block text-xs font-bold text-ink-800">Select Doctor<select required aria-label="Select doctor" className={`${input} mt-1.5 min-h-10 text-sm`} value={form.doctor} onChange={setField("doctor")}>{meta.doctors.map((doctor) => <option key={doctor}>{doctor}</option>)}</select></label>}
            <label className="block text-xs font-bold text-ink-800">Select Service<select required aria-label="Select service" className={`${input} mt-1.5 min-h-10 text-sm`} value={form.service} onChange={setField("service")}>{serviceOptions.map((service) => <option key={service} value={service}>{service}{meta.packages?.[service] ? ` · ${meta.packages[service]} EGP` : ""}</option>)}</select></label>
            <label className="block text-xs font-bold text-ink-800">Select Date<input required aria-label="Appointment date" type="date" className={`${input} mt-1.5 min-h-10 text-sm`} value={form.date} onChange={setField("date")} /></label>
            {provider.type === "sitting" ? <label className="block text-xs font-bold text-ink-800">Select Time<select aria-label="Appointment time" className={`${input} mt-1.5 min-h-10 text-sm`} value={form.time} onChange={setField("time")}><option value="">Choose a time</option><option>09:00</option><option>13:00</option><option>17:00</option></select></label> : <label className="block text-xs font-bold text-ink-800">Select Time<input aria-label="Appointment time" type="time" className={`${input} mt-1.5 min-h-10 text-sm`} value={form.time} onChange={setField("time")} /></label>}
            <label className="block text-xs font-bold text-ink-800">Notes <span className="font-normal text-ink-500">(optional)</span><textarea aria-label="Booking notes" rows="3" className={`${input} mt-1.5 resize-y text-sm`} placeholder="Add any notes..." value={form.notes} onChange={setField("notes")} /></label>
          </div>
          <div className="mt-4 border-t border-stone-100 pt-4"><div className="mb-3 flex items-center justify-between text-sm"><span className="text-ink-500">Starting price</span><b className="text-ink-900">{selectedPrice} EGP</b></div><button type="submit" disabled={!pets.length || saving} className={`${btn} w-full justify-center`}>{saving ? "Booking..." : <><CalendarDays size={16} /> Confirm Booking</>}</button><p className="mt-2 text-center text-[11px] text-ink-500">No payment is collected now.</p></div>
        </form>
      </aside>
    </div>
  </div>;
}
