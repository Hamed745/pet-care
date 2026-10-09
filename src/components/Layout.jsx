import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Activity, Bell, CalendarDays, ChevronDown, Heart, Home, LogOut, MapPin, Menu, PawPrint, Phone, ShoppingBag, Stethoscope, Scissors, UserRound, X, Bot } from "lucide-react";
import { useApp } from "../store.jsx";
import { LOST_FOUND_ENABLED } from "../config.js";
import { btn, btn2, btnGhost } from "../ui.js";
import FloatingChat, { ChatProvider } from "./ChatWidget.jsx";
import PetAvatar from "./PetAvatar.jsx";
import PetBagIcon from "./icons/PetBagIcon.jsx";
import { ToastStack } from "./ui.jsx";

const serviceLinks = [
  ["/services/veterinary", "Veterinary", "Trusted health care and checkups.", Stethoscope],
  ["/services/grooming", "Grooming", "Thoughtful care from nose to tail.", Scissors],
  ["/services/pet-sitting", "Pet Sitting", "Reliable help at home or outdoors.", Home],
  ["/emergency", "Emergency", "Find urgent local care.", Activity],
  ["/ai", "AI Assistant", "Get quick answers for everyday care.", Bot],
];

function Brand() {
  return <Link to="/" aria-label="PetCare home" className="flex shrink-0 items-center gap-2.5 text-ink-900">
    <span className="grid size-10 place-items-center rounded-xl bg-primary-600 text-white"><PawPrint size={21} strokeWidth={2.2} /></span>
    <span className="text-lg font-extrabold tracking-normal">PetCare<span className="text-primary-600">.</span></span>
  </Link>;
}

function Navbar() {
  const { cart, user, setUser, notifications = [] } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [communityOpen, setCommunityOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const unreadNotifications = notifications.filter((item) => !item.read).length;

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

  const mainLink = ({ isActive }) => `relative flex min-h-10 items-center px-3 text-sm font-medium transition-colors hover:text-primary-700 after:absolute after:inset-x-3 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary-600 after:transition-transform ${isActive ? "text-primary-700 after:scale-x-100" : "text-ink-700 after:scale-x-0 hover:after:scale-x-100"}`;
  const closeMenus = () => { setServicesOpen(false); setCommunityOpen(false); setUserOpen(false); };

  return <>
    <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Brand />
        <nav aria-label="Main navigation" className="hidden items-center gap-1 lg:flex">
          <NavLink to="/" end className={mainLink}>Home</NavLink>
          <div className="relative" data-menu-root>
            <button type="button" aria-expanded={servicesOpen} onClick={() => { setServicesOpen(!servicesOpen); setCommunityOpen(false); setUserOpen(false); }} className={`${mainLink({ isActive: location.pathname.startsWith("/services") })} gap-1`}>Services <ChevronDown size={15} className={`transition ${servicesOpen ? "rotate-180" : ""}`} /></button>
            {servicesOpen && <div className="absolute left-0 top-full z-50 mt-3 w-[340px] rounded-xl border border-stone-200 bg-white p-2 shadow-lg">
              {serviceLinks.map(([to, title, description, Icon]) => <Link key={to} to={to} onClick={closeMenus} className="flex gap-3 rounded-xl p-3 transition hover:bg-primary-50"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-50 text-primary-700"><Icon size={19} /></span><span><span className="block text-sm font-bold text-ink-900">{title}</span><span className="mt-0.5 block text-xs leading-5 text-ink-500">{description}</span></span></Link>)}
            </div>}
          </div>
          <NavLink to="/store" className={mainLink}>Store</NavLink>
          <NavLink to="/adoption" className={mainLink}>Adoption</NavLink>
          <div className="relative" data-menu-root>
            <button type="button" aria-expanded={communityOpen} onClick={() => { setCommunityOpen(!communityOpen); setServicesOpen(false); setUserOpen(false); }} className={`${mainLink({ isActive: location.pathname.startsWith("/lost-found") })} gap-1`}>Community <ChevronDown size={15} className={`transition ${communityOpen ? "rotate-180" : ""}`} /></button>
            {communityOpen && <div className="absolute left-0 top-full z-50 mt-3 w-60 rounded-xl border border-stone-200 bg-white p-2 shadow-lg"><Link to="/lost-found" onClick={closeMenus} className="flex items-center gap-3 rounded-lg p-3 text-sm font-medium hover:bg-primary-50"><MapPin size={18} className="text-primary-600" /> Lost &amp; Found {!LOST_FOUND_ENABLED && <span className="ms-auto rounded-full bg-primary-50 px-2 py-1 text-[10px] font-bold text-primary-700">Coming Soon</span>}</Link></div>}
          </div>
        </nav>
        <div className="hidden items-center gap-3 lg:flex">
          <Link aria-label={count > 0 ? `Cart, ${count} items` : "Cart"} title="Cart" to="/cart" className="relative grid size-10 shrink-0 scale-100 place-items-center rounded-full bg-stone-100 text-stone-800 transition hover:scale-[0.97] hover:bg-stone-200 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"><PetBagIcon size={20} className="text-current" />{count > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary-600 px-1 text-[11px] font-semibold leading-none text-white ring-2 ring-white">{count > 9 ? "9+" : count}</span>}</Link>
          {user && <Link aria-label={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"} title="Notifications" to="/notifications" className="relative grid size-10 place-items-center rounded-full bg-stone-100 text-ink-700 hover:bg-stone-200"><Bell size={19} />{unreadNotifications > 0 && <span className="absolute -right-0.5 -top-0.5 grid size-[18px] place-items-center rounded-full bg-danger-600 text-[10px] font-bold text-white ring-2 ring-white">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}</Link>}
          {user ? <div className="relative" data-menu-root><button type="button" aria-label="Account menu" aria-haspopup="menu" aria-expanded={userOpen} onClick={() => { setUserOpen(!userOpen); setServicesOpen(false); setCommunityOpen(false); }} className="flex items-center gap-1 rounded-full p-0.5 transition hover:bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"><PetAvatar name={user.name} photo={user.avatar} className="size-10 bg-primary-100 text-primary-800" iconSize={12} /><ChevronDown size={15} className={`me-1 text-ink-700 transition ${userOpen ? "rotate-180" : ""}`} /></button>
            {userOpen && <div role="menu" aria-label="Account menu" className="absolute right-0 top-full z-50 mt-3 w-72 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl"><div className="flex items-center gap-3 px-3 py-3"><PetAvatar name={user.name} photo={user.avatar} className="size-11 bg-primary-100 text-primary-800" iconSize={13} /><span className="min-w-0"><span className="block max-w-[200px] truncate text-sm font-bold text-ink-900">{user.name || "PetCare member"}</span><span className="mt-0.5 block max-w-[200px] truncate text-xs text-ink-500">{user.email || ""}</span></span></div><div className="border-t border-stone-100 pt-2"><Link role="menuitem" to="/profile" onClick={closeMenus} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-700 hover:bg-stone-50"><UserRound size={18} /> Profile</Link><Link role="menuitem" to="/pets" onClick={closeMenus} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-700 hover:bg-stone-50"><PawPrint size={18} /> My Pets</Link><Link role="menuitem" to="/bookings" onClick={closeMenus} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-700 hover:bg-stone-50"><CalendarDays size={18} /> Bookings</Link><Link role="menuitem" to="/calendar" onClick={closeMenus} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-700 hover:bg-stone-50"><CalendarDays size={18} /> Calendar</Link><Link role="menuitem" to="/notifications" onClick={closeMenus} className="flex h-11 items-center justify-between rounded-lg px-3 text-sm font-medium text-ink-700 hover:bg-stone-50"><span className="flex items-center gap-3"><Bell size={18} /> Notifications</span>{unreadNotifications > 0 && <span className="rounded-full bg-danger-600 px-2 py-0.5 text-[10px] font-bold text-white">{unreadNotifications}</span>}</Link><Link role="menuitem" to="/wishlist" onClick={closeMenus} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-700 hover:bg-stone-50"><Heart size={18} /> Wishlist</Link><Link role="menuitem" to="/orders" onClick={closeMenus} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-ink-700 hover:bg-stone-50"><ShoppingBag size={18} /> Orders</Link></div><div className="mt-2 border-t border-stone-100 pt-2"><button role="menuitem" onClick={() => { setUser(null); setUserOpen(false); navigate("/"); }} className="flex h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold text-danger-600 hover:bg-red-50"><LogOut size={18} /> Log out</button></div></div>}
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
            <Link onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 font-semibold hover:bg-stone-50" to="/store">Store</Link><Link onClick={() => setMobileOpen(false)} className="rounded-xl px-3 py-3 font-semibold hover:bg-stone-50" to="/adoption">Adoption</Link><Link onClick={() => setMobileOpen(false)} className="flex items-center justify-between rounded-xl px-3 py-3 font-semibold hover:bg-stone-50" to="/lost-found">Lost &amp; Found {!LOST_FOUND_ENABLED && <span className="rounded-full bg-primary-50 px-2 py-1 text-[10px] font-bold text-primary-700">Coming Soon</span>}</Link>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">{user ? <><Link onClick={() => setMobileOpen(false)} to="/profile" className={btn2}>Profile</Link><Link onClick={() => setMobileOpen(false)} to="/bookings" className={btn2}>Bookings</Link><Link onClick={() => setMobileOpen(false)} to="/calendar" className={btn2}>Calendar</Link><Link onClick={() => setMobileOpen(false)} to="/notifications" className={btn2}>Notifications{unreadNotifications > 0 ? ` (${unreadNotifications})` : ""}</Link><Link onClick={() => setMobileOpen(false)} to="/wishlist" className={btn2}>Wishlist</Link><Link onClick={() => setMobileOpen(false)} to="/orders" className={btn2}>Orders</Link></> : <><Link onClick={() => setMobileOpen(false)} to="/login" className={btn2}>Log in</Link><Link onClick={() => setMobileOpen(false)} to="/register" className={btn}>Sign up</Link></>}</div>
        </div>
      </div>}
    </header>
    <nav aria-label="Quick navigation" className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-stone-200 bg-white px-1 pb-[env(safe-area-inset-bottom)] pt-1 lg:hidden">
      {[ ["/", "Home", Home], ["/services", "Services", Stethoscope], ["/store", "Store", ShoppingBag], ["/pets", "My Pets", PawPrint], [user ? "/profile" : "/login", user ? "Profile" : "Sign in", UserRound] ].map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => `flex min-h-14 flex-col items-center justify-center gap-1 text-[10px] font-semibold ${isActive ? "text-primary-700" : "text-ink-500"}`}><Icon size={19} strokeWidth={2} /><span>{label}</span></NavLink>)}
    </nav>
  </>;
}

function Footer() {
  return <footer data-site-footer="true" className="mt-14 border-t border-stone-200 bg-white">
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr] lg:px-8">
      <div><Brand /><p className="mt-4 max-w-xs text-sm leading-6 text-ink-500">Thoughtful care, trusted services, and a happier everyday for the pets we love.</p><div className="mt-5 flex gap-2"><a aria-label="Instagram" href="https://instagram.com" className="grid size-9 place-items-center rounded-full bg-stone-100 text-ink-700 hover:bg-primary-50 hover:text-primary-700"><Heart size={17} /></a><a aria-label="Contact" href="mailto:hello@petcare.example" className="grid size-9 place-items-center rounded-full bg-stone-100 text-ink-700 hover:bg-primary-50 hover:text-primary-700"><Phone size={16} /></a></div></div>
      <div><h2 className="text-sm font-bold">Explore</h2><div className="mt-4 grid gap-3 text-sm text-ink-500"><Link className="hover:text-primary-700" to="/services">Services</Link><Link className="hover:text-primary-700" to="/store">Store</Link><Link className="hover:text-primary-700" to="/adoption">Adoption</Link><Link className="flex items-center gap-2 hover:text-primary-700" to="/lost-found">Lost &amp; Found {!LOST_FOUND_ENABLED && <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[10px] font-bold text-primary-700">Coming Soon</span>}</Link></div></div>
      <div><h2 className="text-sm font-bold">Your account</h2><div className="mt-4 grid gap-3 text-sm text-ink-500"><Link className="hover:text-primary-700" to="/pets">My Pets</Link><Link className="hover:text-primary-700" to="/bookings">Bookings</Link><Link className="hover:text-primary-700" to="/calendar">Calendar</Link><Link className="hover:text-primary-700" to="/notifications">Notifications</Link><Link className="hover:text-primary-700" to="/profile">Profile</Link><Link className="hover:text-primary-700" to="/login">Sign in</Link></div></div>
      <div><h2 className="text-sm font-bold">Need help?</h2><div className="mt-4 grid gap-3 text-sm text-ink-500"><Link className="hover:text-primary-700" to="/emergency">Emergency care</Link><Link className="hover:text-primary-700" to="/ai">Pet care assistant</Link><a className="flex items-center gap-2 hover:text-primary-700" href="mailto:hello@petcare.example"><Phone size={15} /> hello@petcare.example</a></div></div>
    </div>
    <div className="border-t border-stone-100"><div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-4 text-xs text-ink-500 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8"><span>Copyright 2026 PetCare. Made for the ones who love them.</span><span className="flex items-center gap-1"><Heart size={12} className="text-danger-600" /> Here for every paw and whisker</span></div></div>
  </footer>;
}

export default function Layout({ children }) {
  const { storageError, dismissStorageError, notice, dismissToast } = useApp();
  const location = useLocation();
  const isForgotPassword = location.pathname === "/forgot-password";
  useEffect(() => { window.scrollTo({ top: 0, behavior: "instant" }); }, [location.pathname]);
  const toastItems = [...notice, ...(storageError ? [{ id: "storage-error", message: storageError, variant: "danger" }] : [])].slice(0, 3);
  const dismissNotice = (id) => id === "storage-error" ? dismissStorageError() : dismissToast(id);
  return <ChatProvider><div className="min-h-screen">{!isForgotPassword && <Navbar />}<main key={location.pathname} className={isForgotPassword ? "min-h-screen" : "page-enter mx-auto min-h-[60vh] max-w-7xl px-4 py-8 pb-24 sm:px-6 md:py-10 lg:px-8 lg:pb-10"}>{children}</main>{!isForgotPassword && <><Footer /><FloatingChat /></>}<ToastStack items={toastItems} onDismiss={dismissNotice} /></div></ChatProvider>;
}