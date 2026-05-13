// Disease module card with icon, summary, and action button.
import { useI18n } from "../i18n/language-context";

export default function DiseaseModuleCard({ icon, title, description, onStart }) {
  const { t } = useI18n();
  const IconComponent = icon;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="inline-flex rounded-xl bg-emerald-50 p-3 text-emerald-700">
        <IconComponent size={24} />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <button
        type="button"
        onClick={onStart}
        className="mt-5 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        {t("modules.startDetection")}
      </button>
    </article>
  );
}
