// Stage-specific guidance text for mastitis detection.
import { useI18n } from "../i18n/language-context";
import { getMastitisStageMeta } from "../utils/mastitisStage";

export default function FarmerGuidanceCard({ stage, result }) {
  const { t } = useI18n();
  const stageMeta = getMastitisStageMeta(result || { stage });

  if (!stageMeta) {
    return null;
  }

  return (
    <section className={`rounded-2xl border p-4 shadow-sm ${stageMeta.panel}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{t("guidance.title")}</h3>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stageMeta.chip}`}>
          {stageMeta.displayLabel || stageMeta.label}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6">
        <span className="font-semibold">{t("guidance.doNow")}</span> {stageMeta.summary}
      </p>
      <ul className="mt-3 space-y-2 text-sm leading-6">
        {stageMeta.doNow.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-1 h-2 w-2 rounded-full bg-current opacity-70" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-sm leading-6">
        <span className="font-semibold">{t("guidance.vetSupport")}</span> {stageMeta.vet}
      </p>
    </section>
  );
}
