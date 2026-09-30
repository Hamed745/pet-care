import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Activity, ChevronDown, Heart, Home, Menu, PawPrint, Search, ShoppingBag, ShoppingCart, Stethoscope, Scissors, UserRound, X, MapPin, Bot, CalendarDays, LogOut, Phone } from "lucide-react";
import { useApp } from "../store.jsx";
import { btn, btn2, btnDanger, btnGhost } from "../ui.js";

const serviceLinks = [
  ["/services/vet", "Veterinary", "Trusted health care and checkups.", Stethoscope],
  ["/services/grooming", "Grooming", "Thoughtful care from nose to tail.", Scissors],
  ["/services/sitting", "Pet Sitting", "Reliable help at home or outdoors.", Home],
  ["/emergency", "Emergency", "Find urgent local care.", Activity],
  ["/ai", "AI Assistant", "Get quick answers for everyday care.", Bot],
];

function Brand() {
  return <Link to="/" aria-label="PetCare home" className="flex shrink-0 items-center gap-2.5 text-ink-900">
    <span className="grid size-10 place-items-center rounded-2xl bg-primary-600 text-white shadow-sm"><PawPrint size={21} strokeWidth={2.4} /></span>
    <span className="text-lg font-extrabold tracking-normal">PetCare<span className="text-primary-600">.</span></span>
  </Link>;
}

function Navbar() {
  const { cart, user, setUser } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);

  useEffect(() => {
    setMobileOpen(false);
    setServicesOpen(false);
    setCommunityOpen(false);
    setUserOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") { setMobileOpen(false); setServicesOpen(false); setCommunityOpen(false); setUserOpen(false); } };
    const onPointer = (event) => { if (!event.target.closest("[data-menu-root]")) { setServicesOpen(false); setCommunityOpen(false); setUserOpen(false); } };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => { document.removeEventListener("keydown", onKey); document.removeEventListener("pointerdown", onPointer); };
  }, []);

  const mainLink = ({ isActive }) => `relative flex min-h-10 items-center px-3 text-sm font-semibold transition hover:text-primary-700 after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary-600 after:transition ${isActive ? "text-primary-700 after:scale-x-100" : "text-ink-700 after:scale-x-0 hover:after:scale-x-100"}`;
  const closeMenus = () => { setServicesOpen(false); setCommunityOpen(false); setUserOpen(false); };

  return <>
    <header className="sticky top-0 z-40 border-b border-stone-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          <NavLink to="/" end className={mainLink}>Home</NavLink>
          <div className="relative" data-menu-root>
            <button type="button" aria-expanded={servicesOpen} onClick={() => { setServicesOpen(!servicesOpen); setCommunityOpen(false); setUserOpen(false); }} className={`${mainLink({ isActive: location.pathname.startsWith("/services") })} gap-1`}>Services <ChevronDown size={15} className={`transition ${servicesOpen ? "rotate-180" : ""}`} /></button>
            {servicesOpen && <div className="absolute left-0 top-full z-50 mt-4 w-[340px] rounded-2xl border border-stone-200 bg-white p-2 shadow-xl">
              {serviceLinks.map(([to, title, description, Icon]) => <Link key={to} to={to} onClick={closeMenus} className="flex gap-3 rounded-xl p-3 transition hover:bg-primary-50"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700"><Icon size={19} /></span><span><span className="block text-sm font-bold text-ink-900">{title}</span><span className="mt-0.5 block text-xs leading-5 text-ink-500">{description}</span></span></Link>)}
            </div>}
          </div>
          <NavLink to="/store" className={mainLink}>Store</NavLink>
          <NavLink to="/adoption" className={mainLink}>Adoption</NavLink>
          <div className="relative" data-menu-root>
            <button type="button" aria-expanded={communityOpen} onClick={() => { setCommunityOpen(!communityOpen); setServicesOpen(false); setUserOpen(false); }} className={`${mainLink({ isActive: location.pathname === "/lost-found" })} gap-1`}>Community <ChevronDown size={15} className={`transition ${communityOpen ? "rotate-180" : ""}`} /></button>
            {communityOpen && <div className="absolute left-0 top-full z-50 mt-4 w-60 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl"><Link to="/lost-found" onClick={closeMenus} className="flex items-center gap-3 rounded-xl p-3 text-sm font-semibold hover:bg-primary-50"><MapPin size={18} className="text-primary-600" /> Lost &amp; Found</Link></div>}
          </div>
        </nav>
        <div className="hidden items-center gap-2 lg:flex">
          <Link aria-label="Search services" title="Search services" to="/services" className={`${btnGhost} size-10 min-h-10 p-0`}><Search size={19} /></Link>
          <Link aria-label={`Cart, ${count} items`} title="Cart" to="/cart" className={`${btnGhost} relative size-10 min-h-10 p-0`}><ShoppingCart size={19} />{count > 0 && <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-accent-500 text-[10px] font-bold text-ink-900">{count}</span>}</Link>
          <Link to="/emergency" className={`${btnDanger} min-h-10 px-3`}><Phone size={16} /> Emergency</Link>
          {user ? <div className="relative" data-menu-root><button type="button" aria-expanded={userOpen} onClick={() => { setUserOpen(!userOpen); setServicesOpen(false); setCommunityOpen(false); }} className="ml-1 flex items-center gap-2 rounded-full p-1.5 pr-3 transition hover:bg-stone-100"><span className="grid size-9 place-items-center rounded-full bg-primary-100 font-bold text-primary-700">{user.name?.slice(0, 1).toUpperCase()}</span><span className="max-w-24 truncate text-sm font-semibold">{user.name}</span><ChevronDown size={14} /></button>
            {userOpen && <div className="absolute right-0 top-full z-50 mt-3 w-52 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl"><Link to="/profile" onClick={closeMenus} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-stone-50"><UserRound size={17} /> Profile</Link><Link to="/pets" onClick={closeMenus} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-stone-50"><PawPrint size={17} /> My Pets</Link><Link to="/bookings" onClick={closeMenus} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-stone-50"><CalendarDays size={17} /> Bookings</Link><button onClick={() => { setUser(null); setUserOpen(false); navigate("/"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-danger-600 hover:bg-red-50"><LogOut size={17} /> Log out</button></div>}
          </div> : <><Link to="/login" className={btnGhost}>Log in</Link><Link to="/register" className={btn}>Sign up</Link></>}
        </div>
        <button type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} aria-expanded={mobileOpen} onClick={() => setMobileOpen(!mobileOpen)} className="grid size-11 place-items-center rounded-xl border border-stone-200 text-ink-900 lg:hidden">{mobileOpen ? <X size={21} /> : <Menu size={21} />}</button>
      </div>
      {mobileOpen && <div className="fixed inset-x-0 bottom-16 top-[72px] z-40 overflow-y-auto bg-white px-5 pb-5 pt-5 lg:hidden">
        <div className="mx-auto max-w-xl">
          <div className="mb-7 flex items-center justify-between rounded-2xl bg-primary-50 p-4"><span><span className="block text-sm font-bold">Care that fits your day</span><span className="mt-1 block text-xs text-ink-500">Everything your pet needs, together.</span></span><PawPrint className="text-primary-600" /></div>
          <p className="mb-2 px-3 text-xs font-bold uppercase tracking-wider text-ink-500">Explore</p>
          <div className="grid gap-1"><Link onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 font-semibold hover:bg-stone-50" to="/">Home</Link><Link onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 font-semibold hover:bg-stone-50" to="/services">All services</Link>
            {serviceLinks.map(([to, title, , Icon]) => <Link key={to} onClick={() => setMobileOpen(false)} to={to} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-ink-700 hover:bg-stone-50"><Icon size={18} className="text-primary-600" />{title}</Link>)}
            <Link onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 font-semibold hover:bg-stone-50" to="/store">Store</Link><Link onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 font-semibold hover:bg-stone-50" to="/adoption">Adoption</Link><Link onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 font-semibold hover:bg-stone-50" to="/lost-found">Lost &amp; Found</Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">{user ? <><Link onClick={() => setMobileOpen(false)} to="/profile" className={btn2}>Profile</Link><Link onClick={() => setMobileOpen(false)} to="/bookings" className={btn2}>Bookings</Link></> : <><Link onClick={() => setMobileOpen(false)} to="/login" className={btn2}>Log in</Link><Link onClick={() => setMobileOpen(false)} to="/register" className={btn}>Sign up</Link></>}<Link onClick={() => setMobileOpen(false)} to="/emergency" className={`${btnDanger} col-span-2`}><Phone size={17} /> Emergency care</Link></div>
        </div>
      </div>}
    </header>
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur lg:hidden">
      {[ ["/", "Home", Home], ["/services", "Services", Stethoscope], ["/store", "Store", ShoppingBag], ["/pets", "My Pets", PawPrint], [user ? "/profile" : "/login", user ? "Profile" : "Sign in", UserRound] ].map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${isActive ? "text-primary-700" : "text-ink-500"}`}><Icon size={19} strokeWidth={2} /><span>{label}</span></NavLink>)}
    </nav>
  </>;
}

function Footer() {
  return <footer className="mt-16 border-t border-stone-200 bg-white">
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
      <div><Brand /><p className="mt-4 max-w-xs text-sm leading-6 text-ink-500">Thoughtful care, trusted services, and a happier everyday for the pets we love.</p><div className="mt-5 flex gap-2"><a aria-label="Instagram" href="https://instagram.com" className="grid size-9 place-items-center rounded-full bg-stone-100 text-ink-700 hover:bg-primary-50 hover:text-primary-700"><Heart size={17} /></a><a aria-label="Contact" href="mailto:hello@petcare.example" className="grid size-9 place-items-center rounded-full bg-stone-100 text-ink-700 hover:bg-primary-50 hover:text-primary-700"><Phone size={16} /></a></div></div>
      <div><h2 className="text-sm font-bold">Explore</h2><div className="mt-4 grid gap-3 text-sm text-ink-500"><Link className="hover:text-primary-700" to="/services">Services</Link><Link className="hover:text-primary-700" to="/store">Store</Link><Link className="hover:text-primary-700" to="/adoption">Adoption</Link><Link className="hover:text-primary-700" to="/lost-found">Lost &amp; Found</Link></div></div>
      <div><h2 className="text-sm font-bold">Your account</h2><div className="mt-4 grid gap-3 text-sm text-ink-500"><Link className="hover:text-primary-700" to="/pets">My Pets</Link><Link className="hover:text-primary-700" to="/bookings">Bookings</Link><Link className="hover:text-primary-700" to="/profile">Profile</Link><Link className="hover:text-primary-700" to="/login">Sign in</Link></div></div>
      <div><h2 className="text-sm font-bold">Need help?</h2><div className="mt-4 grid gap-3 text-sm text-ink-500"><Link className="hover:text-primary-700" to="/emergency">Emergency care</Link><Link className="hover:text-primary-700" to="/ai">Pet care assistant</Link><a className="flex items-center gap-2 hover:text-primary-700" href="mailto:hello@petcare.example"><Phone size={15} /> hello@petcare.example</a></div></div>
    </div>
    <div className="border-t border-stone-100"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-ink-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><span>Copyright 2026 PetCare. Made for the ones who love them.</span><span className="flex items-center gap-1"><Heart size={12} className="text-danger-600" /> Here for every paw and whisker</span></div></div>
  </footer>;
}

export default function Layout({ children }) {
  const location = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [location.pathname]);
  return <div className="min-h-screen"><Navbar /><main key={location.pathname} className="page-enter mx-auto min-h-[60vh] max-w-7xl px-4 py-8 pb-24 sm:px-6 md:py-10 lg:px-8 lg:pb-10">{children}</main><Footer /></div>;
}