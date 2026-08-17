import { useCallback, useMemo, useState } from "react";

import { LanguageContext } from "./language-context";
import { translations } from "./translations";

const storageKey = "cattlesense_language";

const getByPath = (obj, path) => {
  if (!path) {
    return undefined;
  }
  return path.split(".").reduce((current, part) => {
    if (current && Object.prototype.hasOwnProperty.call(current, part)) {
      return current[part];
    }
    return undefined;
  }, obj);
};

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    const saved = localStorage.getItem(storageKey);
    return saved === "si" ? "si" : "en";
  });

  const updateLanguage = (nextLanguage) => {
    const normalized = nextLanguage === "si" ? "si" : "en";
    setLanguage(normalized);
    localStorage.setItem(storageKey, normalized);
  };

  const t = useCallback((key, fallback) => {
    const languageValue = getByPath(translations[language], key);
    if (languageValue !== undefined && languageValue !== null && languageValue !== "") {
      return languageValue;
    }
    const fallbackValue = getByPath(translations.en, key);
    if (fallbackValue !== undefined && fallbackValue !== null && fallbackValue !== "") {
      return fallbackValue;
    }
    return fallback !== undefined ? fallback : undefined;
  }, [language]);

  const value = useMemo(
    () => ({
      language,
      setLanguage: updateLanguage,
      t,
    }),
    [language, t]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
