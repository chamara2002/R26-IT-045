import { Languages } from "lucide-react";

import { useI18n } from "../i18n/language-context";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 px-2 py-1 transition-colors">
      <Languages size={15} className="text-slate-500 dark:text-slate-400" />
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-lg px-2 py-0.5 text-xs font-semibold transition-colors ${
          language === "en" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
        }`}
      >
        {t("lang.shortEn")}
      </button>
      <button
        type="button"
        onClick={() => setLanguage("si")}
        className={`rounded-lg px-2 py-0.5 text-xs font-semibold transition-colors ${
          language === "si" ? "bg-emerald-600 text-white shadow-sm" : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
        }`}
      >
        {t("lang.shortSi")}
      </button>
    </div>
  );
}
