import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { onAdminAuth } from "./adminApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function AdminEntryLink({ onClick, className = "", menuItem = false, compact = false }) {
  const [allowed, setAllowed] = useState(false);
  const { language } = useLanguage();
  useEffect(() => onAdminAuth(({ isAdmin }) => setAllowed(isAdmin)), []);
  if (!allowed) return null;
  const label = language === "ru" ? "Панель администратора" : "Admin Dashboard";
  return (
    <Link
      to="/admin"
      role={menuItem ? "menuitem" : undefined}
      aria-label={label}
      title={label}
      onClick={onClick}
      className={className || "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"}
    >
      <ShieldCheck size={18} aria-hidden="true" className="shrink-0" />
      <span className={compact ? "hidden xl:inline" : ""}>{label}</span>
    </Link>
  );
}
