import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useI18n } from "../i18n/language-context";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Droplet,
  HeartPulse,
  Info,
  ShieldCheck,
  Stethoscope,
  Thermometer,
  Bookmark,
  CheckCircle2,
  ChevronRight,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Button } from "./ui/index.jsx";
import { saveMastitisAssessment } from "../services/api";
import GradCAMVisualization from "./GradCAMVisualization";
import ClinicalReportGenerator from "./ClinicalReportGenerator";
import FarmerProtectionGuidance from "./FarmerProtectionGuidance";

export default function DetectionResultCard({
  result,
  cowName,
  farmerName,
  imageUrl,
  cowId,
  cows = [],
  onCowSelect,
}) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const [selectedCowId, setSelectedCowId] = useState(cowId || (cows?.length === 1 ? cows[0].id : ""));
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  if (!result) {
    return null;
  }

  const effectiveCowId = cowId || selectedCowId;
  const currentCow = cows.find((c) => String(c.id) === String(effectiveCowId));
  const effectiveCowName = cowName || currentCow?.name || (effectiveCowId ? `Cow #${effectiveCowId}` : null);

  const handleSaveResult = async () => {
    if (!effectiveCowId) {
      setSaveError("Please select a cow to associate this assessment with their medical profile.");
      return;
    }

    try {
      setIsSaving(true);
      setSaveError("");

      const payload = {
        cow_id: parseInt(effectiveCowId, 10),
        prediction: result.prediction || "Normal",
        confidence: result.confidence,
        stage: result.stage,
        severity: result.severity,
        severity_level: result.severity?.severity_level,
        severity_code: result.severity?.severity_code,
        detection_mode: result.mode || "assisted",
        roi_applied: result.roi_applied,
        image_source: result.image_source,
        roi_coordinates: result.roi_coordinates,
        heatmap_id: result.heatmap_id,
        image_prediction: result.image_prediction,
        numerical_prediction: result.numerical_prediction,
        model_2_used: result.model_2_used,
        numerical_model_type: result.numerical_model_type,
        missing_numerical_features: result.missing_numerical_features,
        numerical_measurements: result.numerical_measurements,
        clinical_observations: result.clinical_observations,
        farmer_guidance: result.farmer_guidance,
        recommendation: result.recommendation,
      };

      const res = await saveMastitisAssessment(payload);
      setIsSaved(true);
      setSaveSuccessMsg(res?.message || `Assessment successfully saved to ${effectiveCowName}'s history`);
    } catch (err) {
      console.error("Save assessment error:", err);
      setSaveError(err.message || "Unable to save assessment. Your prediction result is still available. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  // Extract prediction, stage, and confidence
  const rawPrediction = result.prediction || "Normal";
  const stageStr = String(result.stage || result.severity?.severity_label || "").toLowerCase();
  const severityLevel = String(result.severity?.severity_level || "").toLowerCase();

  const isPending =
    rawPrediction.toLowerCase().includes("pending") ||
    stageStr.includes("pending");

  const isHealthy =
    !isPending &&
    (rawPrediction.toLowerCase() === "normal" ||
      stageStr.includes("no mastitis") ||
      stageStr.includes("healthy") ||
      severityLevel === "negative" ||
      severityLevel === "0");

  const isCritical =
    !isPending &&
    !isHealthy &&
    (stageStr.includes("severe") ||
      stageStr.includes("critical") ||
      severityLevel === "severe" ||
      severityLevel === "critical" ||
      severityLevel === "3");

  const isModerate =
    !isPending &&
    !isHealthy &&
    !isCritical &&
    (stageStr.includes("moderate") || severityLevel === "moderate" || severityLevel === "2");

  const isMild =
    !isPending &&
    !isHealthy &&
    !isCritical &&
    !isModerate;

  const confidenceValue =
    typeof result.confidence === "number"
      ? `${(result.confidence * 100).toFixed(1)}%`
      : result.confidence || null;

  // Numerical measurements handling
  const numericalData = result.numerical_measurements;
  const hasNumericalData =
    numericalData &&
    Object.values(numericalData).some(
      (v) => v !== null && v !== undefined && v !== ""
    );

  // Clinical observations questionnaire handling
  const clinicalObs = result.clinical_observations;
  const hasClinicalObs =
    clinicalObs &&
    Object.values(clinicalObs).some(
      (v) => v !== null && v !== undefined && v !== ""
    );

  const clinicalQuestionsMap = [
    { key: "milk_yield_change", label: "Milk Yield Change" },
    { key: "milk_appearance", label: "Milk Appearance" },
    { key: "udder_swelling", label: "Udder Swelling" },
    { key: "udder_warmth", label: "Udder Warmth" },
    { key: "udder_pain", label: "Udder Pain" },
    { key: "body_temperature", label: "Body Temperature" },
    { key: "appetite", label: "Appetite" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Main Diagnostic Banner ────────────────────────────────────────── */}
      <article
        className={`rounded-2xl border p-5 sm:p-6 shadow-xs ${
          isPending
            ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200"
            : isCritical
            ? "border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-950 dark:text-red-100"
            : isModerate
            ? "border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20 text-orange-950 dark:text-orange-100"
            : isMild
            ? "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 text-amber-950 dark:text-amber-100"
            : "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              {isPending ? (
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              ) : isCritical ? (
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : isModerate ? (
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              ) : isMild ? (
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                {t('detection.resultPrefix') || 'AI Diagnostic Result'}
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight">
              {isPending
                ? "Model Ready for Training"
                : isCritical
                ? (t('stages.critical') || "Critical / Severe Mastitis")
                : isModerate
                ? (t('stages.high') || "Moderate Mastitis Detected")
                : isMild
                ? (t('stages.medium') || "Mild Mastitis Detected")
                : (t('stages.low') || "Normal (Healthy Udder)")}
            </h3>
            <p className="text-xs sm:text-sm opacity-90 max-w-xl">
              {result.recommendation ||
                (isHealthy
                  ? t('detection.low') || "Udder appears healthy with no significant indicators of infection."
                  : t('detection.high') || "Inflammation signs detected. Early intervention reduces production loss.")}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold border ${
                isPending
                  ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                  : isCritical
                  ? "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700"
                  : isModerate
                  ? "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700"
                  : isMild
                  ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                  : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700"
              }`}
            >
              {result.stage || (isHealthy ? (t('stages.low') || "Healthy Udder") : isCritical ? (t('stages.critical') || "Severe Mastitis") : (t('stages.high') || "Mastitis Positive"))}
            </span>
            {(isCritical || isModerate) && (
              <button
                type="button"
                onClick={() => navigate("/guidance")}
                className="px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <span>{t('detection.emergencyGuidance') || 'Emergency Vet Guidance'}</span>
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Confidence & Mode Details */}
        <div className="mt-5 pt-4 border-t border-current/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="opacity-70">Model Confidence: </span>
            <span className="font-bold">
              {confidenceValue ? confidenceValue : "Available after Model Training"}
            </span>
          </div>
          <div>
            <span className="opacity-70">Analysis Mode: </span>
            <span className="font-bold capitalize">
              {result.mode?.replace(/_/g, " ") || "Assisted Detection"}
            </span>
          </div>
          <div>
            <span className="opacity-70">Evidence Used: </span>
            <span className="font-bold">
              {result.sources_used?.join(", ")?.replace(/_/g, " ") || "Udder Photograph"}
            </span>
          </div>
        </div>
      </article>

      {/* ── Save Result to Cow Profile Action Bar (Optional Saving) ────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Save to Cow Assessment History
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {effectiveCowName
                ? `Optionally store this diagnostic record under ${effectiveCowName}'s medical history for veterinary review.`
                : "Select a cow to link and save this diagnostic assessment to their herd history."}
            </p>
          </div>

          <div className="flex items-center justify-end gap-2.5 sm:shrink-0 sm:ml-auto">
            {/* If no cow was pre-selected, allow farmer to pick one */}
            {!cowId && !isSaved && cows?.length > 0 && (
              <select
                value={selectedCowId}
                onChange={(e) => {
                  setSelectedCowId(e.target.value);
                  if (onCowSelect) onCowSelect(e.target.value);
                }}
                className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 max-w-[200px] truncate"
              >
                <option value="">Select a cow...</option>
                {cows.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || `Cow #${c.id}`} ({c.tag_id || "No Tag"})
                  </option>
                ))}
              </select>
            )}

            {!isSaved ? (
              <Button
                onClick={handleSaveResult}
                disabled={isSaving || (!cowId && !selectedCowId)}
                variant="primary"
                size="sm"
                className="gap-2 rounded-xl text-xs font-semibold px-4 py-2 shrink-0 whitespace-nowrap"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>Save Result</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-end gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shrink-0 whitespace-nowrap">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>✓ Result Saved</span>
                </span>

                {effectiveCowId && (
                  <Button
                    onClick={() => navigate(`/cows/${effectiveCowId}/records`)}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap"
                  >
                    <span>View Cow History</span>
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Save confirmation / error feedback */}
        {isSaved && saveSuccessMsg && (
          <p className="mt-3 text-xs text-emerald-700 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </p>
        )}

        {saveError && (
          <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">{saveError}</p>
              <p className="text-[11px] text-red-600 dark:text-red-400">
                Your prediction result is still intact. You can retry saving anytime.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Numerical Measurements Card ──────────────────────────────────── */}
      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Numerical Measurements (Model 2 Features)
            </h4>
          </div>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 px-2.5 py-0.5 rounded-full">
            {result.data_source || (hasNumericalData ? "Farmer Provided" : "Optional Section")}
          </span>
        </div>

        {hasNumericalData ? (
          <>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Milk Temperature</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {numericalData.milk_temperature !== null && numericalData.milk_temperature !== undefined
                    ? `${numericalData.milk_temperature} °C`
                    : "Not provided"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Milk pH</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {numericalData.milk_ph !== null && numericalData.milk_ph !== undefined
                    ? numericalData.milk_ph
                    : "Not provided"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Milk Conductivity</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {numericalData.milk_conductivity !== null && numericalData.milk_conductivity !== undefined
                    ? `${numericalData.milk_conductivity} mS/cm`
                    : "Not provided"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Somatic Cell Count (SCC)</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {numericalData.somatic_cell_count !== null && numericalData.somatic_cell_count !== undefined
                    ? numericalData.somatic_cell_count
                    : "Not provided"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Milk Yield</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {numericalData.milk_yield !== null && numericalData.milk_yield !== undefined
                    ? `${numericalData.milk_yield} L`
                    : "Not provided"}
                </p>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">Clotting Observed</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {numericalData.clotting !== null && numericalData.clotting !== undefined
                    ? numericalData.clotting
                    : "Not provided"}
                </p>
              </div>
            </div>
            {result.numerical_model_status === "not_available" && (
              <p className="mt-3 text-xs text-amber-700 dark:text-amber-400/90 bg-amber-50/60 dark:bg-amber-950/20 p-2.5 rounded-xl border border-amber-200/50 dark:border-amber-900/40">
                Model 2 was skipped because not all 6 required features are available. Prediction is based on Model 1 udder image analysis.
              </p>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic">
            Numerical measurements: Not provided
          </p>
        )}
      </article>

      {/* ── Clinical Observations Card ───────────────────────────────────── */}
      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Clinical Observations (Farmer-Reported Questionnaire)
            </h4>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {hasClinicalObs ? "Recorded" : "Optional Section"}
          </span>
        </div>

        {hasClinicalObs ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {clinicalQuestionsMap.map(({ key, label }) => {
              const val = clinicalObs[key];
              return (
                <div
                  key={key}
                  className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60"
                >
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{label}</p>
                  <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                    {val !== null && val !== undefined && val !== "" ? val : "Not answered"}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic">
            Clinical observations: Not provided
          </p>
        )}
      </article>

      {/* ── Farmer Protection & Prevention Guidance (Severity-Aware) ─────── */}
      <FarmerProtectionGuidance result={result} />

      {/* ── Grad-CAM Explainability (Connected to Model 1) ───────────────── */}
      <GradCAMVisualization
        imageUrl={imageUrl}
        heatmapId={result.heatmap_id}
        stage={result.stage || "Normal"}
        roiApplied={result.roi_applied}
      />

      {/* ── Veterinary Clinical Report (Critical / Severe Cases Only) ─────── */}
      <ClinicalReportGenerator
        result={result}
        cowName={cowName}
        farmerName={farmerName}
        imageUrl={imageUrl}
      />
    </div>
  );
}
