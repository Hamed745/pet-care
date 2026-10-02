import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BadgeCheck, CalendarCheck, Cat, Check, ChevronDown, Clock3, Dog, Heart, House, MapPin, PawPrint, Scissors, Search, ShoppingBag, Siren, Stethoscope, Star, Tag, Bird, HandHeart } from "lucide-react";
import { adoptions, products, providers } from "../data.js";
import { useApp } from "../store.jsx";
import Media from "../components/Media.jsx";
import { Button, Card, Rating, SectionTitle } from "../components/ui.jsx";
import { btn } from "../ui.js";
import PetAvatar from "../components/PetAvatar.jsx";

const serviceTiles = [
  { to: "/services/vet", title: "Veterinary", description: "Expert health care", Icon: Stethoscope, color: "bg-primary-50 text-primary-700" },
  { to: "/services/grooming", title: "Grooming", description: "Fresh, comfortable pets", Icon: Scissors, color: "bg-accent-50 text-amber-800" },
  { to: "/services/sitting", title: "Pet Sitting", description: "Trusted help at home", Icon: House, color: "bg-sky-50 text-sky-800" },
  { to: "/store", title: "Store", description: "Everyday pet essentials", Icon: ShoppingBag, color: "bg-rose-50 text-rose-700" },
  { to: "/adoption", title: "Adoption", description: "Find a friend for life", Icon: Heart, color: "bg-orange-50 text-orange-800" },
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
  const { user, pets, bookings } = useApp();
  const navigate = useNavigate();
  const [service, setService] = useState("vet");
  const [city, setCity] = useState("");
  const [petType, setPetType] = useState("");
  const [openDropdown, setOpenDropdown] = useState(null);
  const nextBooking = bookings.find((booking) => booking.status === "Upcoming");
  const featuredProviders = providers.slice(0, 3);
  const featuredProducts = products.slice(0, 4);
  const featuredAdoptions = adoptions.slice(0, 4);

  const searchProviders = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (petType) params.set("pet", petType);
    navigate(`/services/${service}${params.size ? `?${params.toString()}` : ""}`);
  };

  return <div className="home-page">
    <style>{`
      .home-reveal { opacity: 1; transform: none; }
      .home-hero-shell { background: #eaf7f4; }
      .home-hero-layout { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); align-items: start; gap: 48px; max-width: 1000px; margin-inline: auto; }
      .home-hero-copy { min-width: 0; padding-top: 24px; }
      .home-hero-title { max-width: 620px; font-size: clamp(40px, 3.35vw, 48px); line-height: 1.08; letter-spacing: 0; word-spacing: normal; }
      .home-search-bar { display: grid; grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr) auto; align-items: center; gap: 0; height: 64px; padding: 8px; border: 1px solid #e7ebe9; border-radius: 16px; background: #fff; box-shadow: 0 8px 24px -12px rgba(23,49,47,.25); }
      .home-search-control { position: relative; min-width: 0; }
      .home-search-field { position: relative; display: flex; width: 100%; height: 46px; min-width: 0; align-items: center; gap: 12px; border: 0; border-radius: 8px; background: transparent; padding: 0 16px; text-align: start; transition: background-color 160ms ease, box-shadow 160ms ease; }
      .home-search-field:hover, .home-search-field:focus-visible, .home-search-control:focus-within .home-search-field { background: #fafaf9; }
      .home-search-field:focus-visible { outline: none; box-shadow: inset 0 0 0 2px rgb(22 133 117 / 30%); }
      .home-search-field-icon { flex: 0 0 auto; color: #116e62; }
      .home-search-field-copy { display: flex; min-width: 0; flex: 1; flex-direction: column; gap: 1px; }
      .home-search-field-copy > span { color: #758884; font-size: 12px; font-weight: 600; line-height: 16px; }
      .home-search-field-copy > .home-search-field-value { overflow: hidden; color: #17312f; font-size: 15px; font-weight: 600; line-height: 20px; text-overflow: ellipsis; white-space: nowrap; }
      .home-search-chevron { position: absolute; inset-inline-end: 15px; top: 50%; pointer-events: none; color: #758884; transform: translateY(-50%); transition: transform 120ms ease; }
      .home-search-chevron.is-open { transform: translateY(-50%) rotate(180deg); }
      .home-search-divider { width: 1px; height: 32px; background: #e7ebe9; }
      .home-search-submit { display: inline-flex; height: 48px; min-height: 48px; min-width: 120px; align-items: center; justify-content: center; gap: 9px; border-radius: 8px; background: #116e62; padding: 0 22px; color: white; font-size: 14px; font-weight: 700; transition: background-color 160ms ease; }
      .home-search-submit:hover { background: #0f5b52; }
      .home-search-submit:focus-visible { outline: 2px solid #168575; outline-offset: 2px; }
      .home-search-listbox { position: absolute; inset-inline: 0; top: calc(100% + 8px); z-index: 70; max-height: 280px; overflow-y: auto; border: 1px solid #e7ebe9; border-radius: 12px; background: white; padding: 6px; box-shadow: 0 14px 30px -14px rgba(23,49,47,.3); animation: home-dropdown-enter 120ms ease-out both; }
      .home-search-option { display: flex; width: 100%; height: 44px; align-items: center; gap: 10px; border: 0; border-radius: 8px; background: transparent; padding: 0 10px; color: #17312f; font: inherit; font-size: 14px; text-align: start; }
      .home-search-option.is-active, .home-search-option:hover { background: #fafaf9; }
      .home-search-option:focus-visible { outline: 2px solid rgb(22 133 117 / 35%); outline-offset: -2px; }
      .home-search-option-icon, .home-search-option-check { flex: 0 0 auto; color: #116e62; }
      .home-search-option-spacer { width: 18px; }
      .home-search-option-check { margin-inline-start: auto; }
      @keyframes home-dropdown-enter { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      .home-hero-photo-wrap { position: relative; z-index: 0; min-width: 0; }
      .home-hero-photo-wrap::before { position: absolute; z-index: -1; right: -24px; bottom: -24px; width: 78%; height: 72%; border-radius: 44% 56% 48% 52% / 54% 44% 56% 46%; background: #d0eee7; content: ""; }
      .home-hero-photo, .home-hero-photo-fallback { display: block; width: 100%; aspect-ratio: 4 / 5; border-radius: 24px; object-fit: cover; box-shadow: 0 20px 50px -28px rgba(23,49,47,.36); }
      .home-hero-photo-fallback { display: grid; place-items: center; background: linear-gradient(145deg, #d0eee7, #f1f6f3); color: #116e62; }
      .home-hero-photo { position: relative; z-index: 1; }
      .home-pet-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
      .home-pet-chip { display: inline-flex; height: 36px; align-items: center; gap: 7px; border: 1px solid #dfe6e3; border-radius: 999px; background: #fff; padding: 0 12px; color: #385451; font-size: 12px; font-weight: 600; transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease; }
      .home-pet-chip:hover { background: #eaf7f4; border-color: #d0eee7; }
      .home-pet-chip[aria-pressed="true"] { border-color: #116e62; background: #116e62; color: #fff; }
      .home-pet-chip:focus-visible { outline: 2px solid rgb(22 133 117 / 40%); outline-offset: 2px; }
      @media (max-width: 639px) {
        .home-search-bar { width: calc(100% - 40px); grid-template-columns: minmax(0, 1fr); height: auto; gap: 0; padding: 8px; }
        .home-search-field { height: 58px; padding-inline: 12px; }
        .home-search-field-copy > span { font-size: 12px; }
        .home-search-chevron { inset-inline-end: 12px; bottom: 18px; }
        .home-search-divider { width: auto; height: 1px; margin-inline: 12px; }
        .home-search-submit { width: 100%; height: 48px; min-height: 48px; margin-top: 8px; }
        .home-search-listbox { position: relative; inset: auto; max-height: 280px; margin-top: 8px; }
      }
      @media (min-width: 640px) and (max-width: 1023px) { .home-search-bar { width: calc(100% - 72px); } }
      @media (min-width: 1024px) { .home-hero-shell > div { padding-block: 20px; } }
      @media (max-width: 1023px) { .home-hero-layout { grid-template-columns: minmax(0, 1fr); gap: 32px; max-width: none; } .home-hero-photo { aspect-ratio: 16 / 10; } }
      @media (min-width: 640px) and (max-width: 1023px) { .home-hero-photo-wrap { max-width: 600px; width: 100%; justify-self: start; } }
      @media (prefers-reduced-motion: reduce) { .home-search-listbox { animation: none; } }
      .home-service-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      @media (min-width: 48rem) { .home-service-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
      @media (min-width: 64rem) { .home-service-grid { grid-template-columns: repeat(5, minmax(0, 1fr)); } }
      .home-scroll-rail { scroll-snap-type: x mandatory; }
      .home-scroll-rail > * { flex: 0 0 var(--home-card-width); min-width: var(--home-card-width); scroll-snap-align: start; }
      .home-provider-rail { --home-card-width: 82%; }
      .home-product-rail { --home-card-width: 68%; }
      .home-community-rail { --home-card-width: 78%; }
      .home-testimonial-rail { --home-card-width: 84%; }
      @media (min-width: 40rem) {
        .home-provider-rail { --home-card-width: 45%; }
        .home-product-rail { --home-card-width: 40%; }
        .home-community-rail { --home-card-width: 44%; }
        .home-testimonial-rail { --home-card-width: 55%; }
      }
      @media (min-width: 48rem) {
        .home-testimonial-rail { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); }
        .home-testimonial-rail > * { min-width: 0; }
      }
      @media (min-width: 64rem) {
        .home-provider-rail { --home-card-width: 0%; }
        .home-provider-rail > *, .home-product-rail > *, .home-community-rail > * { flex: initial; min-width: 0; }
      }
      @supports (animation-timeline: view()) {
        .home-reveal { animation: home-fade-in linear both; animation-timeline: view(); animation-range: entry 0% entry 22%; }
      }
      @keyframes home-fade-in { from { opacity: 0.25; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
      @media (prefers-reduced-motion: reduce) { .home-reveal { animation: none !important; opacity: 1; transform: none; } }
    `}</style>

    <section aria-labelledby="home-hero-title" className="home-band home-hero-shell">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8 lg:py-8">
        <div className="home-hero-layout">
          <div className="home-hero-copy">
            <p className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-white px-3 py-1.5 text-xs font-bold text-primary-700"><PawPrint size={15} /> Pet care, all in one place</p>
            <h1 id="home-hero-title" className="home-hero-title mt-5 font-extrabold text-ink-900">Book trusted care for your pet <span className="text-primary-700">in minutes</span></h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-ink-500">Find thoughtful local care and make more good days together.</p>
            <form onSubmit={searchProviders} className="home-search-bar mt-6">
              <HeroSelect id="service" label="Service" Icon={Stethoscope} value={service} onChange={setService} open={openDropdown === "service"} setOpen={setOpenDropdown} options={[{ value: "vet", label: "Veterinary", Icon: Stethoscope }, { value: "grooming", label: "Grooming", Icon: Scissors }, { value: "sitting", label: "Pet Sitting", Icon: House }]} />
              <span className="home-search-divider" aria-hidden="true" />
              <HeroSelect id="city" label="City" Icon={MapPin} value={city} onChange={setCity} open={openDropdown === "city"} setOpen={setOpenDropdown} options={[{ value: "", label: "All cities" }, { value: "Cairo", label: "Cairo" }, { value: "Giza", label: "Giza" }, { value: "Alexandria", label: "Alexandria" }]} />
              <Button type="submit" data-chat-control="true" className="home-search-submit"><Search size={18} aria-hidden="true" /> Search</Button>
            </form>
            <div className="home-pet-chips" aria-label="Filter by pet type">{[{ value: "dog", label: "Dogs", Icon: Dog }, { value: "cat", label: "Cats", Icon: Cat }, { value: "bird", label: "Birds", Icon: Bird }, { value: "other", label: "Other", Icon: PawPrint }].map(({ value, label, Icon }) => <button key={value} type="button" data-chat-control="true" aria-pressed={petType === value} onClick={() => setPetType((current) => current === value ? "" : value)} className="home-pet-chip"><Icon size={15} aria-hidden="true" />{label}</button>)}</div>
            <Link to="/emergency" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-danger-600 transition hover:text-red-800"><Siren size={16} /> Emergency? Get help now <ArrowRight size={14} /></Link>
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-semibold text-ink-700"><span className="inline-flex items-center gap-2"><BadgeCheck size={16} className="text-primary-600" /> Verified providers</span><span className="inline-flex items-center gap-2"><CalendarCheck size={16} className="text-primary-600" /> Easy booking</span><span className="inline-flex items-center gap-2"><Tag size={16} className="text-primary-600" /> Free to use</span></div>
          </div>
          <HeroPhoto src={adoptions[0]?.image} />
        </div>
      </div>
    </section>

    <Band id="services" tone="bg-white" className="home-reveal">
      <Intro id="services-title" eyebrow="A little help goes a long way" title="Care for every kind of day" subtitle="Find the right support for your pet, all in one place." action={<Link to="/services" className="text-sm font-bold text-primary-700 hover:text-primary-900">View all services <ArrowRight size={15} className="ml-1 inline" /></Link>} />
      <div className="home-service-grid grid gap-3 sm:gap-4">{serviceTiles.map(({ to, title, description, Icon, color }) => <Link key={to} to={to} className="group flex min-h-40 flex-col justify-between rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_8px_30px_-22px_rgba(23,49,47,0.28)] transition duration-200 hover:-translate-y-1 hover:border-primary-100 hover:shadow-lg focus-visible:outline-offset-4 sm:p-5"><span className={`grid size-12 place-items-center rounded-2xl ${color}`}><Icon size={23} strokeWidth={1.9} /></span><span className="mt-5"><b className="block text-sm font-extrabold sm:text-base">{title}</b><span className="mt-1 block text-xs leading-5 text-ink-500">{description}</span></span></Link>)}</div>
    </Band>

    <Band id="my-space" tone="bg-stone-50" className="home-reveal">
      <Intro id="my-space-title" eyebrow="A place for your family" title="Your pet's little corner" subtitle="Keep the important details close and the next good day in sight." action={user && <Link to="/pets" className="text-sm font-bold text-primary-700">View all pets <ArrowRight size={15} className="ml-1 inline" /></Link>} />
      {user ? <div className="grid gap-5 lg:grid-cols-2">
        <Card className="!p-5 sm:!p-6"><div className="flex items-center justify-between gap-3"><div><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">My family</p><h3 className="mt-1 text-lg font-extrabold">My pets</h3></div><Link to="/pets/new" className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-bold text-white transition hover:bg-primary-700"><PawPrint size={16} /> Add pet</Link></div>{pets.length ? <div className="mt-5 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">{pets.map((pet) => <Link key={pet.id} to={`/pets/${pet.id}`} className="flex min-w-36 snap-start flex-col items-center rounded-xl border border-stone-100 bg-stone-50 p-4 text-center transition hover:border-primary-100 hover:bg-primary-50"><PetAvatar name={pet.name} photo={pet.photo} alt={`${pet.name}, ${pet.type}`} className="size-16" /><b className="mt-3 text-sm">{pet.name}</b><span className="mt-0.5 text-xs text-ink-500">{pet.type}</span></Link>)}</div> : <div className="mt-5 rounded-xl bg-stone-50 p-5"><p className="text-sm text-ink-500">Add a profile for your pet to keep their care details together.</p><Link to="/pets/new" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-primary-700">Add your first pet <ArrowRight size={15} /></Link></div>}</Card>
        <Card className="flex flex-col !p-5 sm:!p-6"><p className="text-xs font-extrabold uppercase tracking-wider text-primary-700">Coming up</p><h3 className="mt-1 text-lg font-extrabold">Next booking</h3>{nextBooking ? <div className="mt-5 flex flex-1 items-start gap-4 rounded-xl bg-primary-50 p-4"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-primary-700"><CalendarCheck size={21} /></span><div className="min-w-0"><b className="block truncate text-sm">{nextBooking.provider.name}</b><p className="mt-1 text-sm text-ink-700">{nextBooking.date} at {nextBooking.time}</p><p className="mt-1 text-xs text-ink-500">For {nextBooking.pet?.name || "your pet"}</p><Link to="/bookings" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-primary-700">View booking <ArrowRight size={15} /></Link></div></div> : <div className="mt-5 flex flex-1 flex-col items-start justify-center rounded-xl bg-white p-5"><span className="grid size-10 place-items-center rounded-xl bg-accent-50 text-amber-800"><CalendarCheck size={19} /></span><p className="mt-3 text-sm text-ink-500">Nothing booked yet. Find a time that works for you.</p><Link to="/services" className={`${btn} mt-4`}><CalendarCheck size={16} /> Book now</Link></div>}</Card>
      </div> : <Card className="flex flex-col items-start justify-between gap-5 border-primary-100 bg-primary-50 !p-6 sm:flex-row sm:items-center sm:!p-8"><div className="flex items-start gap-4"><span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-primary-700"><PawPrint size={24} /></span><div><h3 className="text-lg font-extrabold">Add your pet and keep their health record in one place</h3><p className="mt-2 text-sm text-ink-500">Create a home for their appointments, vaccinations, and everyday details.</p></div></div><Link to="/register" className={`${btn} shrink-0`}>Create account <ArrowRight size={16} /></Link></Card>}
    </Band>

    <Band id="how-it-works" tone="bg-primary-50" className="home-reveal">
      <Intro id="how-it-works-title" eyebrow="Simple from the start" title="Good care in three steps" subtitle="A few clear steps bring the right care within reach." />
      <div className="grid gap-4 md:grid-cols-3">{steps.map(({ number, title, description, Icon }) => <Card key={number} className="relative overflow-hidden bg-white !p-6 sm:!p-7"><span className="absolute right-5 top-4 text-5xl font-extrabold text-primary-50">{number}</span><span className="relative grid size-12 place-items-center rounded-2xl bg-primary-100 text-primary-700"><Icon size={23} /></span><h3 className="mt-6 text-lg font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-ink-500">{description}</p></Card>)}</div>
    </Band>

    <Band id="providers" tone="bg-white" className="home-reveal">
      <Intro id="providers-title" eyebrow="Loved by local pet parents" title="Meet trusted providers" subtitle="Good people, close by, ready to care for your pet." action={<Link to="/services" className="text-sm font-bold text-primary-700 hover:text-primary-900">View all providers <ArrowRight size={15} className="ml-1 inline" /></Link>} />
      <div className="home-scroll-rail home-provider-rail -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3">{featuredProviders.map((provider) => <Card key={provider.id} as="article" className="overflow-hidden !p-0 hover:-translate-y-1 hover:shadow-lg"><Link to={`/services/${provider.type}/${provider.id}`} aria-label={`View ${provider.name}`}><div className="aspect-[4/3] overflow-hidden"><Media src={provider.image} alt={provider.name} className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" /></div></Link><div className="p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-extrabold">{provider.name}</h3><p className="mt-1 flex items-center gap-1 text-sm text-ink-500"><MapPin size={14} />{provider.city}</p></div><Rating value={provider.rating} /></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-stone-100 pt-4"><p className="text-sm text-ink-500">From <b className="text-ink-900">{provider.price} EGP</b></p><Link to={`/services/${provider.type}/${provider.id}`} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-bold text-white transition hover:bg-primary-700">Book <ArrowRight size={15} /></Link></div></div></Card>)}</div>
    </Band>

    <Band id="store" tone="bg-stone-50" className="home-reveal">
      <Intro id="store-title" eyebrow="A few good things" title="Everyday favourites" subtitle="Useful little finds for playtime, mealtime, and rest." action={<Link to="/store" className="text-sm font-bold text-primary-700 hover:text-primary-900">Visit the store <ArrowRight size={15} className="ml-1 inline" /></Link>} />
      <div className="home-scroll-rail home-product-rail -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4">{featuredProducts.map((product) => <Card key={product.id} as="article" className="overflow-hidden !p-0 hover:-translate-y-1 hover:shadow-lg"><Link to="/store" aria-label={`Find ${product.name} in the store`}><div className="aspect-square overflow-hidden"><Media src={product.image} alt={product.name} className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" /></div></Link><div className="p-4"><span className="text-xs font-bold text-ink-500">{product.cat}</span><h3 className="mt-1 min-h-10 text-sm font-extrabold leading-5">{product.name}</h3><p className="mt-2 font-extrabold text-primary-700">{product.price} EGP</p></div></Card>)}</div>
    </Band>

    <Band id="community" tone="bg-white" className="home-reveal">
      <Intro id="community-title" eyebrow="Good things happen together" title="Meet your community" subtitle="Discover pets looking for a home and lend a hand nearby." action={<Link to="/adoption" className="text-sm font-bold text-primary-700 hover:text-primary-900">View all pets <ArrowRight size={15} className="ml-1 inline" /></Link>} />
      <div className="grid gap-5 lg:grid-cols-[1fr_280px] lg:items-stretch"><div className="home-scroll-rail home-community-rail -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-2">{featuredAdoptions.map((animal) => <Card key={animal.id} as="article" className="overflow-hidden !p-0 hover:-translate-y-1 hover:shadow-lg"><Link to="/adoption" aria-label={`Learn about ${animal.name}`}><div className="aspect-[4/3] overflow-hidden"><Media src={animal.image} alt={`${animal.name}, ${animal.breed}`} className="h-full w-full object-cover transition duration-300 hover:scale-[1.03]" /></div></Link><div className="p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-extrabold">{animal.name}</h3><span className="rounded-full bg-primary-50 px-2.5 py-1 text-[10px] font-extrabold text-primary-700">{animal.health}</span></div><p className="mt-1 text-xs text-ink-500">{animal.breed} · {animal.age} years · {animal.city}</p></div></Card>)}</div><Card as="aside" className="relative isolate flex min-h-64 flex-col items-start justify-end overflow-hidden !p-6 text-white"><Media src={adoptions.find((animal) => animal.type === "Cat")?.image} alt="A cat waiting to be found" className="absolute inset-0 -z-20 h-full w-full object-cover" /><div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#17312f]/95 via-[#17312f]/55 to-[#17312f]/15" /><span className="grid size-10 place-items-center rounded-xl bg-white/15"><MapPin size={19} /></span><h3 className="mt-4 text-xl font-extrabold">Lost &amp; Found</h3><p className="mt-2 text-sm leading-6 text-white/80">Help bring a missing pet home or reunite a found pet with their family.</p><Link to="/lost-found" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-bold text-primary-700 transition hover:bg-primary-50">Visit Lost &amp; Found <ArrowRight size={15} /></Link></Card></div>
    </Band>

    <Band id="testimonials" tone="bg-stone-50" className="home-reveal">
      <Intro id="testimonials-title" eyebrow="Kind words from the community" title="Little moments, better care" subtitle="Pet parents sharing what made a difference." />
      {/* Sample content for the visual prototype; replace with verified customer testimonials before launch. */}
      <div className="home-scroll-rail home-testimonial-rail -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-3">{testimonials.map(([quote, name]) => <Card as="blockquote" key={name} className="!p-6"><div className="flex gap-1 text-accent-500" aria-label="Rated 5 out of 5">{Array.from({ length: 5 }, (_, index) => <Star key={index} size={14} fill="currentColor" aria-hidden="true" />)}</div><p className="mt-4 text-sm font-semibold leading-6 text-ink-900">“{quote}”</p><footer className="mt-4 text-xs font-bold text-ink-500">{name}</footer></Card>)}</div>
    </Band>

    <Band id="final-cta" tone="bg-primary-50" className="home-reveal">
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-primary-700 px-6 py-8 text-white sm:flex-row sm:items-center sm:px-10 sm:py-10"><div><p className="text-xs font-extrabold uppercase tracking-[0.12em] text-accent-400">For every stage and every day</p><h2 id="final-cta-title" className="mt-2 text-2xl font-extrabold sm:text-3xl">Everything your pet needs, in one place</h2><p className="mt-2 text-sm text-white/75">Make it easier to give them the care they deserve.</p></div><Link to={user ? "/services" : "/register"} className="inline-flex min-h-12 shrink-0 items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-primary-700 transition hover:bg-primary-50">{user ? "Book a service" : "Create your free account"}<ArrowRight size={16} /></Link></div>
    </Band>
  </div>;
}