import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { onAdminAuth } from "./adminApi.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function AdminEntryLink({ onClick, className = "" }) {
  const [allowed, setAllowed] = useState(false);
  const { language } = useLanguage();
  useEffect(() => onAdminAuth(({ isAdmin }) => setAllowed(isAdmin)), []);
  if (!allowed) return null;
  return <Link to="/admin" role="menuitem" onClick={onClick} className={className || "flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-semibold text-primary-700 hover:bg-primary-50"}><ShieldCheck size={18}/>{language === "ru" ? "Панель администратора" : "Admin Dashboard"}</Link>;
}
