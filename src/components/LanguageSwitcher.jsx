import { Globe } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export default function LanguageSwitcher({ variant = "pill", className = "" }) {
  const { language, setLanguage, t } = useLanguage();

  if (variant === "mobile") {
    return (
      <div className={`flex items-center justify-between rounded-xl bg-stone-50 p-3 border border-stone-200 ${className}`}>
        <span className="flex items-center gap-2 text-sm font-semibold text-ink-800">
          <Globe size={18} className="text-primary-600" />
          <span>{t("nav.language", "Language")}</span>
        </span>
        <div role="group" aria-label={t("nav.language", "Language")} className="flex items-center rounded-lg bg-stone-200/70 p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setLanguage("en")}
            aria-pressed={language === "en"}
            className={`rounded-md px-3 py-1.5 transition-all ${
              language === "en"
                ? "bg-white text-primary-700 shadow-sm"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            English
          </button>
          <button
            type="button"
            onClick={() => setLanguage("ru")}
            aria-pressed={language === "ru"}
            className={`rounded-md px-3 py-1.5 transition-all ${
              language === "ru"
                ? "bg-white text-primary-700 shadow-sm"
                : "text-ink-600 hover:text-ink-900"
            }`}
          >
            Русский
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t("nav.language", "Language")}
      className={`inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100/90 p-0.5 text-xs font-bold text-stone-600 shadow-inner ${className}`}
    >
      <Globe size={14} className="ms-1.5 shrink-0 text-primary-600" aria-hidden="true" />
      <button
        type="button"
        aria-pressed={language === "en"}
        title="English"
        onClick={() => setLanguage("en")}
        className={`rounded-full px-2.5 py-1 text-xs transition-all ${
          language === "en"
            ? "bg-white text-primary-700 font-extrabold shadow-sm"
            : "text-stone-500 hover:text-stone-900"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        aria-pressed={language === "ru"}
        title="Русский"
        onClick={() => setLanguage("ru")}
        className={`rounded-full px-2.5 py-1 text-xs transition-all ${
          language === "ru"
            ? "bg-white text-primary-700 font-extrabold shadow-sm"
            : "text-stone-500 hover:text-stone-900"
        }`}
      >
        RU
      </button>
    </div>
  );
}
