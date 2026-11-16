import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, ClipboardCheck, Home, LogOut, Settings, Stethoscope } from "lucide-react";
import { useApp } from "../store.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { logoutUser } from "../services/authService.js";
import LanguageSwitcher from "./LanguageSwitcher.jsx";
import { ToastStack } from "./ui.jsx";

// Clinic managers get a separate work-only shell: no public store, adoption,
// owner bookings, pet-owner footer or public floating chat navigation.
const links = [
  ["dashboard", Home, "Home", "Главная"],
  ["requests", ClipboardCheck, "Booking requests", "Заявки"],
  ["appointments", CalendarDays, "Appointments", "Записи"],
  ["calendar", CalendarDays, "Calendar", "Календарь"],
  ["services", Stethoscope, "Services", "Услуги"],
  ["settings", Settings, "Settings", "Настройки"],
];
export default function ClinicShell({ children, toastItems, onDismiss }) {
  const { user, setUser, showToast } = useApp();
  const { language, t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const section = new URLSearchParams(location.search).get("section") || "dashboard";
  const active = links.some(([key]) => key === section) ? section : "dashboard";
  const label = (en, ru) => language === "ru" ? ru : en;

  const signOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await logoutUser();
      setUser(null);
      navigate("/login", { replace: true });
    } catch {
      showToast("Unable to sign out. Please try again.", "error");
    } finally { setSigningOut(false); }
  };

  return (
    <div className="min-h-screen bg-stone-50">
      <header className="sticky top-0 z-40 border-b border-stone-200 bg-white">
        <div className="mx-auto flex min-h-[72px] max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <Link to="/clinic" aria-label={label("Clinic home", "Главная клиники")}
            className="flex items-center gap-2.5 text-ink-900">
            <span className="grid size-10 place-items-center rounded-xl bg-primary-700 text-white">
              <Stethoscope size={21} />
            </span>
            <span className="text-lg font-extrabold">PetCare <span className="text-primary-700">{label("Clinic", "Клиника")}</span></span>
          </Link>
          <nav aria-label={label("Clinic navigation", "Навигация клиники")}
            className="order-3 flex w-full items-center gap-1 overflow-x-auto pb-1 md:order-none md:w-auto md:pb-0">
            {links.map(([key, Icon, en, ru]) => (
              <Link key={key} to={key === "dashboard" ? "/clinic" : "/clinic?section=" + key}
                aria-current={active === key ? "page" : undefined}
                className={"flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold sm:text-sm " +
                  (active === key ? "bg-primary-50 text-primary-800" : "text-ink-600 hover:bg-stone-100")}>
                <Icon size={16}/>{label(en, ru)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitcher/>
            <span className="hidden max-w-28 truncate text-xs text-ink-600 lg:inline" title={user?.email || ""}>{user?.name || user?.email || ""}</span>
            <button type="button" onClick={signOut} disabled={signingOut}
              className="flex items-center gap-1 rounded-lg border border-stone-200 px-3 py-2 text-xs font-semibold text-ink-700 hover:bg-stone-100 disabled:opacity-50"
              aria-label={t("nav.log_out", "Log out")}>
              <LogOut size={16}/><span className="hidden sm:inline">{t("nav.log_out", "Log out")}</span>
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto min-h-[85vh] max-w-7xl px-4 py-7 sm:px-6 lg:px-8">
        {children}
      </main>
      <ToastStack items={toastItems} onDismiss={onDismiss}/>
    </div>
  );
}
