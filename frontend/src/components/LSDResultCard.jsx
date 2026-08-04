// Result card for the Lumpy Skin Disease (LSD) detection module.
// Surfaces the fused ResNet-50 image probability + optional symptom checklist
// exactly as produced by lumpy-module/inference/symptom_engine.py, following
// the Low/Medium/High risk thresholds and guidance text from the LSD
// component proposal (Chapter 3.6).
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Stethoscope, Camera, ClipboardList } from "lucide-react";
import GradCAMVisualization from "./GradCAMVisualization";

const RISK_META = {
  low: {
    label: "Low Risk",
    panel: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700",
    icon: CheckCircle2,
    gaugeStage: "Low",
  },
  medium: {
    label: "Moderate Risk",
    panel: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700",
    icon: AlertTriangle,
    gaugeStage: "Medium",
  },
  high: {
    label: "High Risk",
    panel: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100",
    chip: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 border-red-300 dark:border-red-700",
    icon: AlertTriangle,
    gaugeStage: "High",
  },
};

const pct = (value) => (typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "—");

export default function LSDResultCard({ result, imagePreview }) {
  if (!result) return null;

  const riskLevel = result.risk_level || (result.label === 1 ? "high" : "low");
  const meta = RISK_META[riskLevel] || RISK_META.low;
  const Icon = meta.icon;
  const symptomAssessment = result.symptom_assessment;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid gap-4"
    >
      {/* Overall probability + risk banner */}
      <article className={`rounded-2xl border p-6 shadow-sm ${meta.panel}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">LSD Detection Result</p>
            <h3 className="text-2xl font-black flex items-center gap-2">
              <Icon className="h-6 w-6" />
              {result.stage || meta.label}
            </h3>
          </div>
          <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold ${meta.chip}`}>
            {pct(result.confidence)} probability
          </span>
        </div>

        <p className="mt-4 text-sm leading-relaxed">{result.message || result.recommendation}</p>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3 backdrop-blur">
            <p className="font-semibold text-xs uppercase tracking-wider opacity-70 mb-1">LSD Probability</p>
            <p className="text-xl font-bold">{pct(result.confidence)}</p>
          </div>
          <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3 backdrop-blur">
            <p className="font-semibold text-xs uppercase tracking-wider opacity-70 mb-1">Signals Used</p>
            <p className="text-sm font-medium capitalize">
              {(result.overall_prediction?.sources_used || ["image"]).join(" + ")}
            </p>
          </div>
        </div>
      </article>

      {/* Image-based classification breakdown */}
      <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <Camera className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          ResNet-50 Photo Analysis
        </h3>
        {result.image_prediction ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-700 dark:text-slate-300">
            <p><span className="font-semibold">Classification:</span> {result.image_prediction.class_name}</p>
            <p><span className="font-semibold">Model confidence:</span> {pct(result.image_prediction.confidence)}</p>
            <p className="sm:col-span-2"><span className="font-semibold">LSD-class probability:</span> {pct(result.image_prediction.lsd_probability)}</p>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">No image analysis available.</p>
        )}
      </article>

      {/* Symptom checklist breakdown */}
      <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <ClipboardList className="h-4 w-4 text-violet-600 dark:text-violet-400" />
          Clinical Symptom Checklist
        </h3>
        {symptomAssessment ? (
          <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <p><span className="font-semibold">Symptom-based risk:</span> {symptomAssessment.risk_label}</p>
              <p><span className="font-semibold">Symptom score:</span> {Number(symptomAssessment.score).toFixed(2)}</p>
              {symptomAssessment.nodule_count && (
                <p><span className="font-semibold">Nodule count:</span> {symptomAssessment.nodule_count}</p>
              )}
              {symptomAssessment.nodule_distribution && (
                <p><span className="font-semibold">Distribution:</span> {symptomAssessment.nodule_distribution}</p>
              )}
              {symptomAssessment.body_temperature && (
                <p><span className="font-semibold">Body temperature:</span> {symptomAssessment.body_temperature}°C</p>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
              {Object.entries(symptomAssessment.signals || {}).map(([name, value]) => (
                <p key={name} className="text-xs">
                  <span className="font-semibold">{name.replace(/_/g, " ")}:</span> {value ? "Yes" : "No"}
                </p>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No symptom checklist was entered — this result is based on the photograph only.
          </p>
        )}
      </article>

      {/* Grad-CAM explainability (imagePreview is optional — when re-opening a
          past detection from history there's no local file, but the saved
          heatmap PNG is still fetched straight from the module) */}
      {result.heatmap_id && (
        <GradCAMVisualization
          imageUrl={imagePreview}
          heatmapId={result.heatmap_id}
          stage={meta.gaugeStage}
          moduleKey="lumpy"
          title="AI-Generated Skin Analysis (Grad-CAM)"
          description="Red/orange areas indicate the skin regions that most influenced the LSD prediction."
        />
      )}

      <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm flex gap-3">
        <Stethoscope className="h-5 w-5 flex-shrink-0 text-violet-600 dark:text-violet-400 mt-0.5" />
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          This screening result is generated by an automated image classifier and is not a substitute
          for veterinary diagnosis. Always confirm with a qualified veterinarian, especially for
          Moderate or High risk results.
        </p>
      </article>
    </motion.div>
  );
}
