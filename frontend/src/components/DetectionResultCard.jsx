// Result card with mastitis stage summary and next-step guidance.
import { useI18n } from "../i18n/language-context";
import { getMastitisStageMeta } from "../utils/mastitisStage";

export default function DetectionResultCard({ result }) {
  const { t } = useI18n();

  if (!result) {
    return null;
  }

  if (result.overall_prediction) {
    const stageMeta = getMastitisStageMeta(result);
    const severityPayload = result.severity || stageMeta.source || {};
    const overallConfidence = typeof result.overall_prediction.confidence === "number"
      ? `${(result.overall_prediction.confidence * 100).toFixed(1)}%`
      : result.overall_prediction.confidence;

    const imageConfidence = typeof result.image_prediction?.mastitis_confidence === "number"
      ? `${(result.image_prediction.mastitis_confidence * 100).toFixed(1)}%`
      : result.image_prediction?.mastitis_confidence;

    const healthConfidence = typeof result.health_prediction?.mastitis_confidence === "number"
      ? `${(result.health_prediction.mastitis_confidence * 100).toFixed(1)}%`
      : null;

    const behaviorConfidence = typeof result.behavior_assessment?.confidence === "number"
      ? `${(result.behavior_assessment.confidence * 100).toFixed(1)}%`
      : null;

    return (
      <div className="grid gap-4">
        <article className={`rounded-2xl border p-4 shadow-sm ${stageMeta.panel}`}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide opacity-80">Overall Result</p>
              <h3 className="mt-1 text-2xl font-bold">
                {stageMeta.displayLabel || stageMeta.label}
              </h3>
              <p className="mt-2 max-w-2xl text-sm leading-6">{stageMeta.summary}</p>
            </div>
            <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold ${stageMeta.chip}`}>
              {stageMeta.displayLabel || stageMeta.label}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-white/70 p-3 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">What to do now</p>
              <ul className="mt-2 space-y-2 text-sm leading-6">
                {stageMeta.doNow.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-current opacity-70" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl bg-white/70 p-3 shadow-sm backdrop-blur">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Veterinarian guidance</p>
              <p className="mt-2 text-sm leading-6">{stageMeta.vet}</p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
            <p><span className="font-semibold">Overall confidence:</span> {overallConfidence}</p>
            <p><span className="font-semibold">Sources used:</span> {result.overall_prediction.sources_used?.join(", ") || "image"}</p>
            {severityPayload.confidence_score !== undefined && (
              <p><span className="font-semibold">Severity score:</span> {Number(severityPayload.confidence_score).toFixed(2)}</p>
            )}
            {severityPayload.action && (
              <p><span className="font-semibold">Action:</span> {severityPayload.action}</p>
            )}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Image analysis</h3>
          <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
            <p><span className="font-semibold">Prediction:</span> {result.image_prediction?.label === 1 ? "Mastitis" : "Normal"}</p>
            <p><span className="font-semibold">Confidence:</span> {imageConfidence}</p>
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Health data analysis</h3>
          {result.health_prediction ? (
            <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              <p><span className="font-semibold">Prediction:</span> {result.health_prediction.label === 1 ? "Mastitis" : "Normal"}</p>
              <p><span className="font-semibold">Confidence:</span> {healthConfidence}</p>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No numerical health inputs were provided. Image analysis was used alone.</p>
          )}

          {result.input_summary?.health_inputs && (
            <div className="mt-4 grid gap-2 rounded-2xl bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2">
              <p><span className="font-semibold">Milk Temperature (°C):</span> {result.input_summary.health_inputs.milk_temperature ?? "Not provided"}</p>
              <p><span className="font-semibold">Milk Yield (L):</span> {result.input_summary.health_inputs.milk_yield ?? "Not provided"}</p>
              <p><span className="font-semibold">Clotting:</span> {result.input_summary.health_inputs.clotting ?? "Not provided"}</p>
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Behavior questions</h3>
          {result.behavior_assessment ? (
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <div className="grid gap-2 sm:grid-cols-2">
                <p><span className="font-semibold">Risk level:</span> {result.behavior_assessment.risk_label}</p>
                <p><span className="font-semibold">Behavior confidence:</span> {behaviorConfidence}</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {Object.entries(result.behavior_assessment.signals || {}).map(([name, value]) => (
                  <p key={name}><span className="font-semibold">{name.replace(/_/g, " ")}:</span> {value ? "Yes" : "No"}</p>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-600">No behavior questions were answered.</p>
          )}
        </article>

        {result.input_summary?.behavior_signals && (
          <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900">Input summary</h3>
            <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
              {Object.entries(result.input_summary.behavior_signals).map(([label, value]) => (
                <p key={label}><span className="font-semibold">{label.replace(/_/g, " ")}:</span> {value ? "Yes" : "No"}</p>
              ))}
            </div>
          </article>
        )}
      </div>
    );
  }

  if (result.prediction) {
    const confidence = typeof result.confidence === "number" ? `${(result.confidence * 100).toFixed(1)}%` : result.confidence;
    const stageMeta = getMastitisStageMeta(result);
    const severityPayload = result.severity || stageMeta.source || {};

    return (
      <article className={`rounded-2xl border p-4 shadow-sm ${stageMeta.panel}`}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">
            {t("detection.resultPrefix")} {stageMeta.displayLabel || stageMeta.label}
          </h3>
          <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stageMeta.chip}`}>
            {stageMeta.displayLabel || stageMeta.label}
          </span>
        </div>
        <p className="mt-2 text-sm">{stageMeta.summary}</p>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="rounded-xl bg-white/70 p-3 shadow-sm">
            <p className="font-semibold">What to do now</p>
            <p className="mt-1 leading-6">{stageMeta.doNow[0]}</p>
          </div>
          <div className="rounded-xl bg-white/70 p-3 shadow-sm">
            <p className="font-semibold">Veterinarian guidance</p>
            <p className="mt-1 leading-6">{stageMeta.vet}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="font-semibold">Confidence:</span> {confidence}</p>
          {result.details?.image?.label !== undefined && (
            <p><span className="font-semibold">Model label:</span> {result.details.image.label}</p>
          )}
          {severityPayload.confidence_score !== undefined && (
            <p><span className="font-semibold">Severity score:</span> {Number(severityPayload.confidence_score).toFixed(2)}</p>
          )}
        </div>
      </article>
    );
  }

  const stageMeta = getMastitisStageMeta(result);

  return (
    <article className={`rounded-2xl border p-4 shadow-sm ${stageMeta.panel}`}>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold">{t("detection.resultPrefix")} {stageMeta.displayLabel || stageMeta.label}</h3>
        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${stageMeta.chip}`}>
          {stageMeta.displayLabel || stageMeta.label}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6">{stageMeta.summary}</p>
      <p className="mt-3 text-sm leading-6">{result.message}</p>
    </article>
  );
}
