import { Languages } from "lucide-react";

import { useI18n } from "../i18n/language-context";

export default function LanguageSwitcher() {
  const { language, setLanguage, t } = useI18n();

  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-2 py-1">
      <Languages size={16} className="text-slate-600" />
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`rounded-xl px-2 py-1 text-xs font-semibold ${
          language === "en" ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        {t("lang.shortEn")}
      </button>
      <button
        type="button"
        onClick={() => setLanguage("si")}
        className={`rounded-xl px-2 py-1 text-xs font-semibold ${
          language === "si" ? "bg-emerald-600 text-white" : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        {t("lang.shortSi")}
      </button>
    </div>
  );
}
