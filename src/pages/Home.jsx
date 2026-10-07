import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, Bell, CalendarCheck, CalendarDays, Cat, Check, ChevronDown, Clock3, Dog, Heart, House, MapPin, PawPrint, Scissors, Search, ShoppingBag, Siren, Stethoscope, Star, Tag, Bird, HandHeart } from "lucide-react";
import { adoptions, products, providers } from "../data.js";
import { useApp } from "../store.jsx";
import Media from "../components/Media.jsx";
import { Button, Card, Rating, SectionTitle } from "../components/ui.jsx";
import { btn, btn2 } from "../ui.js";
import PetAvatar from "../components/PetAvatar.jsx";

const serviceTiles = [
  { to: "/services/vet", title: "Veterinary", description: "Expert health care", Icon: Stethoscope, color: "bg-primary-50 text-primary-700" },
  { to: "/services/grooming", title: "Grooming", description: "Fresh, comfortable pets", Icon: Scissors, color: "bg-accent-50 text-amber-800" },
  { to: "/services/sitting", title: "Pet Sitting", description: "Trusted help at home", Icon: House, color: "bg-sky-50 text-sky-800" },
  { to: "/store", title: "Store", description: "Everyday pet essentials", Icon: ShoppingBag, color: "bg-rose-50 text-rose-700" },
  { to: "/adoption", title: "Adoption", description: "Find a friend for life", Icon: Heart, color: "bg-orange-50 text-orange-800" },
  { to: "/lost-found", title: "Lost & Found", description: "Help a pet find their way home", Icon: MapPin, color: "bg-red-50 text-danger-600" },
];

const steps = [
  { number: "01", title: "Find", description: "Explore local providers and services.", Icon: MapPin },
  { number: "02", title: "Book", description: "Choose your pet, date, and time.", Icon: CalendarCheck },
  { number: "03", title: "Care", description: "Make more room for happy moments.", Icon: HandHeart },
];

const testimonials = [
  ["They made finding a vet feel easy.", "Maya & Milo"],
  ["Everything for Luna, finally in one place.", "Omar & Luna"],
  ["The sitter updates gave us real peace of mind.", "Nour & Coco"],
];

function Band({ id, tone, children, className = "" }) {
  return <section id={id} aria-labelledby={`${id}-title`} className={`home-band ${tone} ${className}`}><div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 md:py-24 lg:px-8">{children}</div></section>;
}

function Intro({ id, eyebrow, title, subtitle, action }) {
  return <div className="mb-8 md:mb-10"><p className="mb-2 text-xs font-extrabold uppercase tracking-[0.12em] text-primary-700">{eyebrow}</p><SectionTitle title={title} description={subtitle} action={action} className="mb-0" /><span id={id} className="sr-only">{title}</span></div>;
}

function petPhoto(type) {
  return adoptions.find((animal) => animal.type.toLowerCase() === String(type).toLowerCase())?.image || adoptions[0]?.image;
}

function HeroSelect({ id, label, options, value, onChange, Icon, open, setOpen }) {
  const triggerRef = useRef(null);
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selected = options[selectedIndex] || options[0];

  useEffect(() => {
    if (open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const closeOutside = (event) => {
      if (!event.target.closest(".home-search-bar")) setOpen(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    return () => document.removeEventListener("pointerdown", closeOutside);
  }, [open, setOpen]);

  const showList = () => {
    setActiveIndex(selectedIndex);
    setOpen(id);
  };
  const choose = (option) => {
    onChange(option.value);
    setOpen(null);
    triggerRef.current?.focus();
  };
  const onTriggerKeyDown = (event) => {
    if (!open && ["Enter", " ", "ArrowDown"].includes(event.key)) {
      event.preventDefault();
      showList();
      return;
    }
    if (!open) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % options.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + options.length) % options.length);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      choose(options[activeIndex]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(null);
      triggerRef.current?.focus();
    } else if (event.key === "Tab") {
      setOpen(null);
    }
  };

  return <div className="home-search-control">
    <button ref={triggerRef} type="button" data-chat-control="true" id={`${id}-trigger`} aria-haspopup="listbox" aria-expanded={open} aria-controls={`${id}-listbox`} aria-labelledby={`${id}-label ${id}-value`} aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined} onClick={() => open ? setOpen(null) : showList()} onKeyDown={onTriggerKeyDown} className="home-search-field">
      <Icon className="home-search-field-icon" size={20} aria-hidden="true" />
      <span className="home-search-field-copy"><span id={`${id}-label`}>{label}</span><span id={`${id}-value`} className="home-search-field-value">{selected.label}</span></span>
      <ChevronDown className={`home-search-chevron ${open ? "is-open" : ""}`} size={16} aria-hidden="true" />
    </button>
    {open && <div id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`} className="home-search-listbox">
      {options.map((option, index) => <button key={option.value} id={`${id}-option-${index}`} type="button" tabIndex={-1} data-chat-control="true" role="option" aria-selected={option.value === value} onMouseEnter={() => setActiveIndex(index)} onMouseDown={(event) => event.preventDefault()} onClick={() => choose(option)} className={`home-search-option ${index === activeIndex ? "is-active" : ""}`}>
        {option.Icon ? <option.Icon className="home-search-option-icon" size={18} aria-hidden="true" /> : <span className="home-search-option-spacer" />}
        <span>{option.label}</span>
        {option.value === value && <Check className="home-search-option-check" size={17} aria-hidden="true" />}
      </button>)}
    </div>}
  </div>;
}

function HeroPhoto({ src }) {
  const [failed, setFailed] = useState(false);
  return <div className="home-hero-photo-wrap">
    {failed ? <div role="img" aria-label="Pet photo unavailable" className="home-hero-photo-fallback"><PawPrint size={44} aria-hidden="true" /></div> : <img src={src} alt="A happy dog enjoying time outdoors" loading="eager" onError={() => setFailed(true)} className="home-hero-photo" />}
  </div>;
}

export default function Home() {
  const { user, pets, bookings, calendarEvents, notifications } = useApp();
  const navigate = useNavigate();
  const [service, setService] = useState("vet");
  const [city, setCity] = useState("");
  const [petType, setPetType] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);
  const nextBooking = bookings.find((booking) => booking.status === "Upcoming");
  const healthReminders = pets.flatMap((pet) => [
    ...(pet.vaccines || []).filter((vaccine) => vaccine.next).map((vaccine, index) => ({ id: `home-vaccine-${pet.id}-${index}`, title: `${vaccine.name} vaccination`, date: vaccine.next, petName: pet.name })),
    ...(pet.meds || []).filter((medication) => medication.time).map((medication, index) => ({ id: `home-medication-${pet.id}-${index}`, title: `${medication.name} medication`, date: medication.end || "Daily", petName: pet.name })),
  ]);
  const reminders = [...calendarEvents, ...healthReminders].sort((a, b) => String(a.date).localeCompare(String(b.date))).slice(0, 3);
  const featuredProviders = providers.slice(0, 3);
  const featuredProducts = products.slice(0, 4);
  const featuredAdoptions = adoptions.slice(0, 3);
  const searchProviders = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (petType) params.set("pet", petType);
    navigate(`/services/${service}${params.size ? `?${params.toString()}` : ""}`);
  };

  return <div className="home-page">
    <style>{`
      .home-hero-shell { background: #f0fdfa; }
      .home-search-bar { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: center; gap: 8px; }
      .home-search-control { position: relative; min-width: 0; }
      .home-search-field { display: flex; width: 100%; min-width: 0; min-height: 48px; align-items: center; gap: 10px; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; padding: 0 12px; text-align: start; transition: background-color 150ms ease, border-color 150ms ease; }
      .home-search-field:hover, .home-search-control:focus-within .home-search-field { border-color: #99f6e4; background: #f8fafc; }
      .home-search-field-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 1px; }
      .home-search-field-copy > span:first-child { color: #64748b; font-size: 11px; font-weight: 500; line-height: 15px; }
      .home-search-field-copy > .home-search-field-value { overflow: hidden; color: #0f172a; font-size: 14px; font-weight: 600; line-height: 19px; text-overflow: ellipsis; white-space: nowrap; }
      .home-search-field-icon, .home-search-chevron { flex: 0 0 auto; color: #0f766e; }
      .home-search-chevron { transition: transform 120ms ease; }
      .home-search-chevron.is-open { transform: rotate(180deg); }
      .home-search-listbox { position: absolute; inset-inline: 0; top: calc(100% + 6px); z-index: 30; max-height: 240px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 10px; background: #fff; padding: 4px; box-shadow: 0 8px 24px rgb(15 23 42 / 12%); }
      .home-search-option { display: flex; width: 100%; min-height: 40px; align-items: center; gap: 9px; border: 0; border-radius: 7px; background: transparent; padding: 0 9px; color: #0f172a; font: inherit; font-size: 13px; text-align: start; }
      .home-search-option.is-active, .home-search-option:hover { background: #f0fdfa; }
      .home-search-option-icon, .home-search-option-check { flex: 0 0 auto; color: #0f766e; }
      .home-search-option-check { margin-inline-start: auto; }
      .home-hero-photo-wrap { position: relative; min-width: 0; }
      .home-hero-photo-wrap::before { position: absolute; z-index: -1; right: -14px; bottom: -14px; width: 70%; height: 62%; border-radius: 18px; background: #ccfbf1; content: ""; }
      .home-hero-photo, .home-hero-photo-fallback { display: block; width: 100%; aspect-ratio: 5 / 4; border-radius: 18px; object-fit: cover; }
      .home-hero-photo-fallback { display: grid; place-items: center; background: #ccfbf1; color: #0f766e; }
      @media (max-width: 767px) { .home-search-bar { grid-template-columns: minmax(0, 1fr); gap: 6px; padding: 10px; } .home-search-field { min-height: 44px; } .home-hero-photo-wrap::before { right: -8px; bottom: -8px; } }
    `}</style>

    <section className="rounded-2xl border border-primary-100 bg-primary-50 px-5 py-6 sm:px-8 sm:py-8 lg:px-10 lg:py-9">
      <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_.9fr] lg:gap-12">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white px-3 py-1.5 text-xs font-semibold text-primary-700"><PawPrint size={15} /> Pet care, all in one place</p>
          <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-tight text-ink-900 sm:text-5xl">Everything Your Pet Needs <span className="text-primary-700">in One Place</span></h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-ink-500">Healthcare, grooming, pet sitting, adoption, and everyday essentials for the family member who makes every day better.</p>
          <form onSubmit={searchProviders} className="home-search-bar mt-6 rounded-2xl border border-stone-200 bg-white p-3 shadow-sm">
            <HeroSelect id="service" label="Service" Icon={Stethoscope} value={service} onChange={setService} open={openDropdown === "service"} setOpen={setOpenDropdown} options={[{ value: "vet", label: "Veterinary", Icon: Stethoscope }, { value: "grooming", label: "Grooming", Icon: Scissors }, { value: "sitting", label: "Pet Sitting", Icon: House }]} />
            <HeroSelect id="city" label="City" Icon={MapPin} value={city} onChange={setCity} open={openDropdown === "city"} setOpen={setOpenDropdown} options={[{ value: "", label: "All cities" }, { value: "Cairo", label: "Cairo" }, { value: "Giza", label: "Giza" }, { value: "Alexandria", label: "Alexandria" }]} />
            <Button type="submit" data-chat-control="true" className="w-full sm:w-auto"><Search size={17} /> Find a service</Button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Filter by pet type">{[{ value: "dog", label: "Dogs", Icon: Dog }, { value: "cat", label: "Cats", Icon: Cat }, { value: "bird", label: "Birds", Icon: Bird }, { value: "other", label: "Other", Icon: PawPrint }].map(({ value, label, Icon }) => <button key={value} type="button" aria-pressed={petType === value} onClick={() => setPetType((current) => current === value ? "" : value)} className={`inline-flex min-h-9 items-center gap-2 rounded-full border px-3 text-xs font-semibold transition ${petType === value ? "border-primary-600 bg-primary-600 text-white" : "border-stone-200 bg-white text-ink-700 hover:border-primary-200 hover:text-primary-700"}`}><Icon size={14} />{label}</button>)}</div>
          <div className="mt-5 flex flex-wrap gap-3"><Link to="/store" className={btn2}><ShoppingBag size={16} /> Explore Store <ArrowRight size={15} /></Link><Link to="/emergency" className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-danger-600 hover:bg-red-50"><Siren size={16} /> Emergency care</Link></div>
          <p className="mt-4 text-xs font-medium text-ink-500">Trusted local providers <span className="mx-2 text-stone-300">·</span> Simple booking <span className="mx-2 text-stone-300">·</span> Free to use</p>
        </div>
        <div className="mx-auto w-full max-w-xl lg:max-w-none"><HeroPhoto src={adoptions[0]?.image} /></div>
      </div>
    </section>

    <section className="mt-9" aria-labelledby="home-shortcuts-title"><div className="mb-4 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Explore PetCare</p><h2 id="home-shortcuts-title" className="mt-1 text-xl font-semibold">What do you need today?</h2></div></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{serviceTiles.map(({ to, title, description, Icon, color }) => <Link key={to} to={to} className="group flex min-h-36 flex-col rounded-2xl border border-stone-200 bg-white p-4 transition duration-150 hover:border-primary-200 hover:shadow-md"><span className={`grid size-10 place-items-center rounded-xl ${color}`}><Icon size={20} /></span><b className="mt-4 text-sm font-semibold">{title}</b><span className="mt-1 text-xs leading-5 text-ink-500">{description}</span></Link>)}</div></section>

    {user && <section className="mt-10" aria-label="Your pet dashboard"><div className="mb-4"><p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Your dashboard</p><h2 className="mt-1 text-xl font-semibold">Your family at a glance</h2></div><div className="grid gap-4 lg:grid-cols-[1.15fr_1fr_.75fr]">
      <Card className="!p-5"><div className="flex items-center justify-between gap-3"><div><h3 className="text-base font-semibold">My pets</h3><p className="mt-1 text-xs text-ink-500">{pets.length} profiles</p></div><Link to="/pets/new" className="text-sm font-semibold text-primary-700">Add pet <ArrowRight size={14} className="inline" /></Link></div>{pets.length ? <div className="mt-4 grid grid-cols-2 gap-3">{pets.slice(0, 2).map((pet) => <Link key={pet.id} to={`/pets/${pet.id}`} className="flex items-center gap-3 rounded-xl bg-stone-50 p-3 transition hover:bg-primary-50"><PetAvatar name={pet.name} photo={pet.photo} alt={`${pet.name}, ${pet.type}`} className="size-12" /><span className="min-w-0"><b className="block truncate text-sm">{pet.name}</b><span className="text-xs text-ink-500">{pet.type} · {pet.healthStatus || "Healthy"}</span></span></Link>)}</div> : <p className="mt-4 text-sm text-ink-500">Add a pet profile to keep their care together.</p>}</Card>
      <Card className="!p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="text-base font-semibold">Upcoming care</h3><p className="mt-1 text-xs text-ink-500">Appointments and reminders</p></div><Link to="/calendar" aria-label="Open calendar" className="grid size-9 place-items-center rounded-lg bg-primary-50 text-primary-700"><CalendarDays size={17} /></Link></div>{nextBooking ? <div className="mt-4 rounded-xl bg-primary-50 p-3"><b className="block truncate text-sm">{nextBooking.provider.name}</b><span className="mt-1 block text-xs text-ink-700">{nextBooking.date} · {nextBooking.time}</span><span className="block text-xs text-ink-500">For {nextBooking.pet?.name || "your pet"}</span></div> : reminders.length ? <div className="mt-3 space-y-2">{reminders.slice(0, 2).map((event) => <div key={event.id} className="rounded-lg bg-stone-50 px-3 py-2"><b className="block truncate text-xs font-semibold">{event.title}</b><span className="mt-1 block text-[11px] text-ink-500">{event.petName || "Pet"} · {event.date}</span></div>)}</div> : <p className="mt-4 text-sm text-ink-500">No upcoming care scheduled.</p>}</Card>
      <Card className="!p-5"><h3 className="text-base font-semibold">Quick actions</h3><div className="mt-3 grid gap-2"><Link to="/services" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-700 hover:bg-primary-50"><Stethoscope size={16} className="text-primary-700" /> Book a service</Link><Link to="/calendar" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-700 hover:bg-primary-50"><CalendarDays size={16} className="text-primary-700" /> Open calendar</Link><Link to="/notifications" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-700 hover:bg-primary-50"><Bell size={16} className="text-primary-700" /> Notifications</Link><Link to="/bookings" className="flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink-700 hover:bg-primary-50"><CalendarCheck size={16} className="text-primary-700" /> My bookings</Link></div></Card>
    </div></section>}

    <section className="mt-12" aria-labelledby="home-providers-title"><div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Local professionals</p><h2 id="home-providers-title" className="mt-1 text-2xl font-semibold">Featured services</h2></div><Link to="/services" className="text-sm font-semibold text-primary-700">Explore all <ArrowRight size={15} className="inline" /></Link></div><div className="grid gap-4 md:grid-cols-3">{featuredProviders.map((provider) => <Card key={provider.id} as="article" className="overflow-hidden !p-0"><Link to={`/services/${provider.type}/${provider.id}`}><Media src={provider.image} alt={provider.name} className="aspect-[4/3] w-full object-cover" /></Link><div className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-semibold">{provider.name}</h3><p className="mt-1 flex items-center gap-1 text-sm text-ink-500"><MapPin size={14} /> {provider.city}</p></div><Rating value={provider.rating} /></div><div className="mt-4 flex items-center justify-between border-t border-stone-100 pt-3"><span className="text-sm text-ink-500">From <b className="text-ink-900">{provider.price} EGP</b></span><Link to={`/services/${provider.type}/${provider.id}`} className="text-sm font-semibold text-primary-700">Details</Link></div></div></Card>)}</div></section>

    <section className="mt-12 grid gap-8 lg:grid-cols-[1.5fr_1fr]" aria-label="Community and adoption"><div><div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-accent-500">Find a friend</p><h2 className="mt-1 text-2xl font-semibold">Adoption</h2></div><Link to="/adoption" className="text-sm font-semibold text-primary-700">View listings <ArrowRight size={15} className="inline" /></Link></div><div className="grid gap-3 sm:grid-cols-3">{featuredAdoptions.map((animal) => <Card key={animal.id} className="overflow-hidden !p-0"><Link to={`/adoption/${animal.id}`}><Media src={animal.image} alt={`${animal.name}, ${animal.breed}`} className="aspect-square w-full object-cover" /></Link><div className="p-3"><b className="block text-sm">{animal.name}</b><span className="mt-1 block truncate text-xs text-ink-500">{animal.breed} · {animal.city}</span></div></Card>)}</div></div><Card as="aside" className="relative isolate flex min-h-64 flex-col justify-end overflow-hidden !p-6 text-white"><Media src={adoptions.find((animal) => animal.type === "Cat")?.image} alt="Cat in the community" className="absolute inset-0 -z-20 size-full object-cover" /><div className="absolute inset-0 -z-10 bg-gradient-to-t from-primary-700/95 via-primary-700/55 to-primary-700/15" /><p className="text-xs font-semibold uppercase tracking-wider">Community help</p><h2 className="mt-2 text-2xl font-semibold">Lost &amp; Found</h2><p className="mt-2 text-sm leading-6 text-white/90">Help bring a missing pet home or reunite a found pet with family.</p><Link to="/lost-found" className="mt-4 inline-flex min-h-10 items-center gap-2 self-start rounded-xl bg-white px-4 text-sm font-semibold text-primary-700">Open reports <ArrowRight size={15} /></Link></Card></section>

    <section className="mt-12 pb-4" aria-labelledby="home-products-title"><div className="mb-5 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-primary-700">Shop for every pet</p><h2 id="home-products-title" className="mt-1 text-2xl font-semibold">Everyday favourites</h2></div><Link to="/store" className="text-sm font-semibold text-primary-700">Visit store <ArrowRight size={15} className="inline" /></Link></div><div className="grid grid-cols-2 gap-3 md:grid-cols-4">{featuredProducts.map((product) => <Card key={product.id} className="overflow-hidden !p-0"><Link to={`/store/${product.id}`}><Media src={product.images?.[0] || product.image} alt={product.name} className="aspect-square w-full object-cover" /></Link><div className="p-4"><span className="text-xs font-semibold text-ink-500">{product.category || product.cat}</span><h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-semibold">{product.name}</h3><p className="mt-2 text-sm font-semibold text-primary-700">{product.price} EGP</p></div></Card>)}</div></section>
  </div>;
}