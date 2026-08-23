import { useState } from "react";
import {
  X,
  Calendar,
  Activity,
  Droplet,
  Thermometer,
  FileText,
  Eye,
  CheckCircle2,
  AlertTriangle,
  Download,
  Loader2,
  Stethoscope,
  ClipboardList,
  ShieldCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Badge } from "./ui/index.jsx";
import FarmerProtectionGuidance from "./FarmerProtectionGuidance.jsx";

export default function AssessmentDetailsModal({ assessment, isOpen, onClose }) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!isOpen || !assessment) return null;

  const rawPrediction = String(assessment.prediction || "Normal");
  const stageStr = String(assessment.stage || assessment.severity_level || "").toLowerCase();
  const severityLevel = String(assessment.severity_level || "").toLowerCase();

  const isCritical =
    stageStr.includes("severe") ||
    stageStr.includes("critical") ||
    severityLevel === "severe" ||
    severityLevel === "critical" ||
    severityLevel === "3";

  const isModerate =
    !isCritical && (stageStr.includes("moderate") || severityLevel === "moderate" || severityLevel === "2");
  const isMild = !isCritical && !isModerate && (stageStr.includes("mild") || severityLevel === "mild" || severityLevel === "1");
  const isHealthy = !isCritical && !isModerate && !isMild;

  const confidenceStr =
    typeof assessment.confidence === "number"
      ? `${(assessment.confidence * 100).toFixed(1)}%`
      : assessment.confidence || "N/A";

  const numericalData = assessment.numerical_measurements || {};
  const clinicalObs = assessment.clinical_observations || {};

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const payload = {
        result: {
          prediction: assessment.prediction,
          confidence: assessment.confidence,
          stage: assessment.stage,
          severity: {
            severity_level: assessment.severity_level,
            severity_code: assessment.severity_code,
            severity_label: assessment.stage,
          },
          numerical_measurements: assessment.numerical_measurements,
          clinical_observations: assessment.clinical_observations,
          image_prediction: assessment.image_prediction,
          numerical_prediction: assessment.numerical_prediction,
          model_2_used: assessment.model_2_used,
          numerical_model_type: assessment.numerical_model_type,
          missing_numerical_features: assessment.missing_numerical_features,
          roi_applied: assessment.roi_applied,
          image_source: assessment.image_source,
          roi_coordinates: assessment.roi_coordinates,
        },
        cattle_info: {
          name: assessment.cow_name || "Cow",
          tag_id: assessment.cow_tag || `COW-${assessment.cow_id}`,
        },
        heatmap_id: assessment.heatmap_id,
      };

      const response = await fetch("/api/modules/mastitis/report/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Failed to generate PDF");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CattleSense-Mastitis-Veterinary-Report-${assessment.cow_name || "Cow"}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Unable to generate PDF report at this time.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  Mastitis Assessment Record
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {new Date(assessment.assessment_datetime || assessment.created_at).toLocaleString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
                <span>•</span>
                <span>
                  Cow: <strong>{assessment.cow_name || `#${assessment.cow_id}`}</strong> ({assessment.cow_tag || "Tag N/A"})
                </span>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  isCritical
                    ? "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800"
                    : isModerate
                    ? "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-300 dark:border-orange-800"
                    : isMild
                    ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800"
                    : "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800"
                }`}
              >
                {assessment.stage || assessment.prediction}
              </span>
            </div>
          </div>

          {/* Diagnostic Result Banner */}
          <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Prediction</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{assessment.prediction}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Confidence</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{confidenceStr}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Model 2 Type</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 capitalize">
                {assessment.numerical_model_type || (assessment.model_2_used ? "Complete" : "Unavailable")}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">ROI Focused</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                {assessment.roi_applied ? "Yes (Farmer ROI)" : "No (Full Photo)"}
              </p>
            </div>
          </div>

          {/* Model Features Profile */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>Model Input Features (Model 2)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Milk Temperature</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {numericalData.Milk_Temperature !== undefined && numericalData.Milk_Temperature !== null
                    ? `${numericalData.Milk_Temperature} °C`
                    : numericalData.milk_temperature !== undefined && numericalData.milk_temperature !== null
                      ? `${numericalData.milk_temperature} °C`
                      : numericalData.Temperature !== undefined && numericalData.Temperature !== null
                        ? `${numericalData.Temperature} °C`
                        : "Not provided"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Milk pH</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {numericalData.Milk_pH !== undefined && numericalData.Milk_pH !== null
                    ? numericalData.Milk_pH
                    : numericalData.milk_ph !== undefined && numericalData.milk_ph !== null
                      ? numericalData.milk_ph
                      : "Not provided"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Conductivity</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {numericalData.Milk_Conductivity !== undefined && numericalData.Milk_Conductivity !== null
                    ? `${numericalData.Milk_Conductivity} mS/cm`
                    : numericalData.milk_conductivity !== undefined && numericalData.milk_conductivity !== null
                      ? `${numericalData.milk_conductivity} mS/cm`
                      : "Not provided"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Milk Yield</span>
                <span className="font-semibold text-slate-900 dark:text-white">
                  {numericalData.Milk_Yield !== undefined && numericalData.Milk_Yield !== null
                    ? `${numericalData.Milk_Yield} L/day`
                    : numericalData.milk_yield !== undefined && numericalData.milk_yield !== null
                      ? `${numericalData.milk_yield} L/day`
                      : "Not provided"}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs col-span-2 sm:col-span-1">
                <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Milk Flow & Clots</span>
                <span className={`font-semibold ${
                  Number(numericalData.Clotting ?? numericalData.clotting) === 1
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {Number(numericalData.Clotting ?? numericalData.clotting) === 1
                    ? "Clots / Flakes Present"
                    : "Normal Flow (No Clots)"}
                </span>
              </div>
            </div>
          </div>

          {/* Clinical Observations Q&A */}
          {Object.keys(clinicalObs).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Clinical Questionnaire Observations</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(clinicalObs).map(([k, v]) => (
                  <div key={k} className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 block text-[10px] capitalize">
                      {k.replace(/_/g, " ")}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {v || "Not answered"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Farmer Protection Guidance Snapshot */}
          <FarmerProtectionGuidance result={assessment} />

          {/* Critical Veterinary PDF Download (If Critical/Severe) */}
          {isCritical && (
            <div className="rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-red-950 dark:text-red-100 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span>Veterinary Assessment PDF Report</span>
                </h4>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                  Generated clinical handover document with Grad-CAM visual evidence
                </p>
              </div>
              <Button
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                variant="default"
                size="sm"
                className="gap-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shrink-0"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                <span>{isDownloadingPdf ? "Generating..." : "Download Veterinary PDF"}</span>
              </Button>
            </div>
          )}

          {/* Footer controls */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <Button variant="secondary" onClick={onClose} className="rounded-xl text-xs">
              Close Record
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
