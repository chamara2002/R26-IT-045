import { Languages } from "lucide-react";

import { useI18n } from "../i18n/language-context";

export default function LanguageSwitcher({ transparent = false }) {
  const { language, setLanguage, t } = useI18n();

  return (
    <div
      className={`inline-flex items-center h-8 sm:h-9 md:h-10 gap-1 sm:gap-1.5 rounded-xl border px-1.5 sm:px-2.5 transition-all duration-300 shrink-0 ${
        transparent
          ? "border-white/20 bg-slate-900/40 backdrop-blur-md text-white shadow-sm"
          : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80"
      }`}
    >
      <Languages className={`h-3.5 sm:h-4 w-3.5 sm:w-4 shrink-0 ${transparent ? "text-slate-200" : "text-slate-500 dark:text-slate-400"}`} />
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-lg px-1.5 sm:px-2 py-0.5 text-[11px] sm:text-xs font-semibold transition-colors ${
          language === "en"
            ? "bg-emerald-600 text-white shadow-sm"
            : transparent
            ? "text-slate-200 hover:bg-white/20 hover:text-white"
            : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
        }`}
      >
        {t("lang.shortEn")}
      </button>
      <button
        type="button"
        onClick={() => setLanguage("si")}
        className={`rounded-lg px-1.5 sm:px-2 py-0.5 text-[11px] sm:text-xs font-semibold transition-colors ${
          language === "si"
            ? "bg-emerald-600 text-white shadow-sm"
            : transparent
            ? "text-slate-200 hover:bg-white/20 hover:text-white"
            : "text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700"
        }`}
      >
        {t("lang.shortSi")}
      </button>
    </div>
  );
}
