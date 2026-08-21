// Result card for Lumpy Skin Disease detection — shows the hybrid fusion
// breakdown (vision pipeline vs. symptom checklist) so the ratio behind the
// final decision is visible, not just a single number.
import { useState } from "react";
import { motion } from "framer-motion"; // eslint-disable-line no-unused-vars -- used via <motion.div>, false positive (see pre-existing DetectionPage.jsx import)
import { ShieldAlert, FileDown, Loader2 } from "lucide-react";
import { downloadLSDReportPdf } from "../services/api";

const RISK_STYLES = {
  "LOW RISK": {
    panel: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100",
    badge: "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200",
    bar: "bg-emerald-500",
  },
  "MODERATE RISK": {
    panel: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100",
    badge: "border-amber-300 bg-amber-100 text-amber-700 dark:border-amber-700 dark:bg-amber-900/30 dark:text-amber-200",
    bar: "bg-amber-500",
  },
  "HIGH RISK": {
    panel: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100",
    badge: "border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200",
    bar: "bg-red-500",
  },
};

const SIGNAL_LABELS = {
  high_fever: "High fever (≥ 40°C)",
  swollen_lymph_nodes: "Swollen lymph nodes",
  nose_discharge: "Nose discharge",
  eye_discharge: "Eye discharge",
  reduced_milk: "Reduced milk production",
  decreased_appetite: "Decreased appetite / lethargy",
};

const pct = (value) => `${(Number(value) * 100).toFixed(1)}%`;

export default function LSDResultCard({ result }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  if (!result) return null;

  const riskLevel = result.risk_level || result.stage || "LOW RISK";
  const styles = RISK_STYLES[riskLevel] || RISK_STYLES["LOW RISK"];
  const overall = result.overall_prediction || {};
  const imagePrediction = result.image_prediction || {};
  const symptomPrediction = result.symptom_prediction;
  const imageWeight = overall.image_weight ?? 1;
  const symptomWeight = overall.symptom_weight ?? 0;

  const handleDownloadReport = async () => {
    setDownloadError("");
    setIsDownloading(true);
    try {
      const response = await downloadLSDReportPdf(result);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lsd-detection-report-${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError("Could not generate the PDF report. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="grid gap-4"
    >
      <article className={`rounded-2xl border-2 p-6 shadow-sm ${styles.panel}`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">LSD Detection Result</p>
            <h3 className="mt-1 text-2xl font-black">{result.prediction}</h3>
            <p className="mt-2 text-sm leading-6">{result.recommendation || result.advice}</p>
          </div>
          <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-sm font-bold ${styles.badge}`}>
            {riskLevel}
          </span>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex justify-between text-sm">
            <span className="font-semibold uppercase tracking-wider text-xs opacity-70">Overall LSD Probability</span>
            <span className="font-bold">{pct(overall.probability ?? result.confidence ?? 0)}</span>
          </div>
          <div className="h-3 w-full rounded-full bg-black/10 dark:bg-white/10">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${styles.bar}`}
              style={{ width: `${Math.min(100, (overall.probability ?? result.confidence ?? 0) * 100)}%` }}
            />
          </div>
        </div>

        {riskLevel === "HIGH RISK" && (
          <div className="mt-4 rounded-xl bg-red-600 text-white p-4 text-center shadow-lg">
            <p className="font-bold text-lg mb-1 flex items-center justify-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              Immediate Action Recommended
            </p>
            <p className="text-sm font-medium">Isolate the animal and contact a veterinarian promptly.</p>
          </div>
        )}
      </article>

      {/* Hybrid breakdown: how the image and symptom checklist each contributed */}
      <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">
          How this result was calculated
        </h4>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Photo Analysis (YOLOv8 + ResNet50)</p>
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{Math.round(imageWeight * 100)}% weight</span>
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{pct(imagePrediction.probability ?? 0)}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {imagePrediction.num_detections > 0
                ? `${imagePrediction.num_detections} nodule region(s) detected in the photograph.`
                : "No suspicious nodule regions detected in the photograph."}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Symptom Checklist</p>
              <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{Math.round(symptomWeight * 100)}% weight</span>
            </div>
            {symptomPrediction ? (
              <>
                <p className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{pct(symptomPrediction.probability)}</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Reported clinical risk: <strong>{symptomPrediction.risk_label}</strong>
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                No symptoms were reported — this result is based on the photograph alone.
              </p>
            )}
          </div>
        </div>

        {symptomPrediction && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {Object.entries(symptomPrediction.signals || {}).map(([name, value]) => (
              <p key={name} className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-semibold">{SIGNAL_LABELS[name] || name.replace(/_/g, " ")}:</span>{" "}
                {typeof value === "boolean" ? (value ? "Yes" : "No") : String(value)}
              </p>
            ))}
          </div>
        )}
      </article>

      {result.annotated_image && (
        <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h4 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">
            Detected Regions
          </h4>
          <img
            src={result.annotated_image}
            alt="Annotated detection result"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700"
          />
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Boxes mark detected nodule regions. Exact per-region confidence is intentionally not shown — the combined probability above is the meaningful number.
          </p>
        </article>
      )}

      <div>
        <button
          type="button"
          onClick={handleDownloadReport}
          disabled={isDownloading}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 disabled:opacity-60 text-white font-bold py-3 shadow-lg transition-all duration-200"
        >
          {isDownloading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Generating report…
            </>
          ) : (
            <>
              <FileDown className="h-5 w-5" />
              Download PDF Report
            </>
          )}
        </button>
        {downloadError && <p className="mt-2 text-center text-sm text-red-600">{downloadError}</p>}
      </div>
    </motion.div>
  );
}
