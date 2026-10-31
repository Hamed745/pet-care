import { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import en from "./en.js";
import ru from "./ru.js";
import { catalogEn, catalogRu } from "./catalog.js";

const translations = {
  en: { ...en, catalog: catalogEn },
  ru: { ...ru, catalog: catalogRu },
};
const STORAGE_KEY = "petcare_language";

function buildValueToPath(obj, prefix = "", map = {}) {
  for (const key of Object.keys(obj || {})) {
    const val = obj[key];
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === "string") map[val.trim().toLowerCase()] = path;
    else if (val && typeof val === "object") buildValueToPath(val, path, map);
  }
  return map;
}

const enValueToPath = buildValueToPath(translations.en);

const LanguageContext = createContext(null);

// Helper to look up nested property by dot notation (e.g. "nav.home")
function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === "object" && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return typeof current === "string" ? current : undefined;
}

// Flat reverse-lookup for direct strings (e.g. t("All cities") or t("Store"))
function buildDirectMap(sourceObj) {
  const map = {};
  function walk(current) {
    if (!current || typeof current !== "object") return;
    for (const key of Object.keys(current)) {
      const val = current[key];
      if (typeof val === "string") {
        map[val.toLowerCase()] = val;
      } else if (typeof val === "object") {
        walk(val);
      }
    }
  }
  walk(sourceObj);
  return map;
}

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "ru" || saved === "en") return saved;
      // Also check browser language preference
      if (typeof navigator !== "undefined" && navigator.language?.startsWith("ru")) {
        return "ru";
      }
    } catch {
      // ignore
    }
    return "en";
  });

  const setLanguage = useCallback((newLang) => {
    const lang = newLang === "ru" ? "ru" : "en";
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch {
      // ignore
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === "en" ? "ru" : "en");
  }, [language, setLanguage]);

  useEffect(() => {
    try {
      document.documentElement.lang = language;
    } catch {
      // ignore
    }
  }, [language]);

  /**
   * Translate function
   * @param {string} key - Translation key (e.g. "nav.home") or direct English string
   * @param {string|object} [fallbackOrParams] - Fallback string or interpolation params
   * @param {object} [params] - Interpolation params when fallback is provided
   */
  const t = useCallback((key, fallbackOrParams, params) => {
    if (!key) return "";
    let actualFallback = typeof fallbackOrParams === "string" ? fallbackOrParams : "";
    let actualParams = typeof fallbackOrParams === "object" && fallbackOrParams !== null ? fallbackOrParams : (params || {});

    const currentDict = translations[language] || translations.en;
    const fallbackDict = translations.en;

    // 1. Try dot-path in active language
    let text = getNestedValue(currentDict, key);

    // 2. If not found and language is Russian, try dot-path in English
    if (!text && language !== "en") {
      text = getNestedValue(fallbackDict, key);
    }

    // 3. If still not found, treat the key as an English string and map it to the active language
    if (!text) {
      const matchedPath = enValueToPath[String(key).trim().toLowerCase()];
      if (matchedPath) {
        text = getNestedValue(currentDict, matchedPath) || (language === "en" ? key : getNestedValue(fallbackDict, matchedPath));
      }
    }

    // 4. Default to fallback or key
    if (!text) {
      text = actualFallback || key;
    }

    // 5. Interpolate variables e.g. {count}, {name}, {price}
    if (actualParams && typeof text === "string") {
      Object.keys(actualParams).forEach((p) => {
        text = text.replace(new RegExp(`\\{${p}\\}`, "g"), String(actualParams[p]));
      });
    }

    return text;
  }, [language]);

  const productName = useCallback((product) => {
    if (!product) return "";
    return t(`catalog.p${product.id}`, product.name);
  }, [t]);

  const productDescription = useCallback((product) => {
    if (!product) return "";
    if (product.description) return product.description;
    const petsKey = product.petType === "small"
      ? "common.small_pets"
      : product.petType === "fish"
        ? "common.fish"
        : `common.${product.petType}s`;
    return t("catalog.description", {
      detail: t(`catalog.cat_${product.category}`, ""),
      pets: t(petsKey, product.petType),
    });
  }, [t]);

  const productDetails = useCallback((product) => {
    if (!product) return [];
    const petsKey = product.petType === "small"
      ? "common.small_pets"
      : product.petType === "fish"
        ? "common.fish"
        : `common.${product.petType}s`;
    const stage = t(`catalog.age_${product.ageGroup}`, product.ageGroup);
    return [
      t(`catalog.cat_${product.category}`, ""),
      t("catalog.suitable", { pets: t(petsKey, product.petType) }),
      t("catalog.life_stage", { stage }),
      t("catalog.packed"),
    ];
  }, [t]);

  const variantLabel = useCallback((label) => {
    const map = { Small: "catalog.size_small", Medium: "catalog.size_medium", Large: "catalog.size_large", "2 kg": "catalog.size_2kg", "6 kg": "catalog.size_6kg" };
    return map[label] ? t(map[label], label) : t(label, label);
  }, [t]);

  const value = useMemo(() => ({
    language,
    setLanguage,
    toggleLanguage,
    isRussian: language === "ru",
    isEnglish: language === "en",
    t,
    productName,
    productDescription,
    productDetails,
    variantLabel,
  }), [language, setLanguage, toggleLanguage, t, productName, productDescription, productDetails, variantLabel]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}

export const useTranslation = useLanguage;
