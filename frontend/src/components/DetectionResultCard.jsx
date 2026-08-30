import { useState, useEffect } from "react";
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
  Sparkles,
  HelpCircle,
} from "lucide-react";
import { Button } from "./ui/index.jsx";
import {
  saveMastitisAssessment,
  getCowAssessmentComparison,
  getCowRiskTrend,
} from "../services/api";
import GradCAMVisualization from "./GradCAMVisualization";
import ClinicalReportGenerator from "./ClinicalReportGenerator";
import FarmerProtectionGuidance from "./FarmerProtectionGuidance";
import AssessmentComparisonCard from "./AssessmentComparisonCard";
import RiskTrendAlert from "./RiskTrendAlert";

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
  const [comparisonData, setComparisonData] = useState(null);
  const [riskEvaluation, setRiskEvaluation] = useState(null);

  // Reset saved status and messages whenever a new prediction result arrives
  useEffect(() => {
    setIsSaved(false);
    setSaveSuccessMsg("");
    setSaveError("");
  }, [result]);

  // Sync selected cow when cowId prop updates
  useEffect(() => {
    if (cowId) {
      setSelectedCowId(cowId);
    }
  }, [cowId]);

  const effectiveCowId = cowId || selectedCowId;
  const currentCow = cows.find((c) => String(c.id) === String(effectiveCowId));
  const effectiveCowName = cowName || currentCow?.name || (effectiveCowId ? `Cow #${effectiveCowId}` : null);

  useEffect(() => {
    if (!effectiveCowId) return;

    let isMounted = true;
    const fetchCowLongitudinal = async () => {
      try {
        const [compRes, riskRes] = await Promise.allSettled([
          getCowAssessmentComparison(effectiveCowId),
          getCowRiskTrend(effectiveCowId),
        ]);

        if (isMounted && compRes.status === "fulfilled") {
          setComparisonData(compRes.value);
        }
        if (isMounted && riskRes.status === "fulfilled") {
          setRiskEvaluation(riskRes.value.risk_evaluation);
        }
      } catch {
        // Safe fallback
      }
    };

    fetchCowLongitudinal();
    return () => {
      isMounted = false;
    };
  }, [effectiveCowId]);

  const handleSaveResult = async () => {
    if (!effectiveCowId) {
      setSaveError(t("records.selectCowToSave") || "Please select a cow to associate this assessment with their medical profile.");
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
        uncertainty_level: result.uncertainty_level,
        is_borderline: result.is_borderline,
        uncertainty_note: result.uncertainty_note,
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

  const isInsufficientData =
    !isPending &&
    !isHealthy &&
    (severityLevel === "insufficient_data" || stageStr.includes("insufficient"));

  const isMild =
    !isPending &&
    !isHealthy &&
    !isCritical &&
    !isModerate &&
    !isInsufficientData;

  const isBorderline = Boolean(
    result.is_borderline ||
    result.uncertainty_level === "borderline_uncertain"
  );
  const uncertaintyNote = isBorderline
    ? (t("mastitisResult.uncertaintyNote") || result.uncertainty_note || "This result is close to the decision boundary. Consider a follow-up test or veterinary consultation for confirmation.")
    : (result.uncertainty_note || "This result is close to the decision boundary. Consider a follow-up test or veterinary consultation for confirmation.");

  const confidenceValue =
    typeof result.confidence === "number"
      ? `${(result.confidence * 100).toFixed(1)}%`
      : result.confidence || null;

  // Numerical measurements handling (only considered active if Model 2 executed)
  const numericalData = result.numerical_measurements;
  const hasNumericalData =
    Boolean(result.model_2_used) &&
    numericalData &&
    Object.values(numericalData).some(
      (v) => v !== null && v !== undefined && v !== ""
    );

  // Clinical observations questionnaire handling
  const rawObs = result.clinical_observations || {};
  const rawSymptoms = result.symptom_assessment?.symptoms_raw || result.symptoms || {};
  const mergedObs = { ...rawSymptoms, ...rawObs };

  const hasClinicalObs =
    mergedObs &&
    Object.values(mergedObs).some(
      (v) => v !== null && v !== undefined && v !== ""
    );

  const clinicalQuestionsMap = [
    { key: "milk_has_clots", altKeys: ["milk_clotting", "clots_in_milk"], label: t("mastitisDetection.symptoms.milk_has_clots") || "Visible Clots / Lumps in Milk" },
    { key: "milk_color_changed", altKeys: ["milk_appearance"], label: t("mastitisDetection.symptoms.milk_color_changed") || "Milk Color / Consistency" },
    { key: "udder_feels_warm", altKeys: ["udder_warmth", "warm_or_painful_udder"], label: t("mastitisDetection.symptoms.udder_feels_warm") || "Udder Warmth / Heat" },
    { key: "udder_swollen", altKeys: ["udder_swelling", "swollen_udder"], label: t("mastitisDetection.symptoms.udder_swollen") || "Udder Swelling / Hardness" },
    { key: "milk_yield_dropped", altKeys: ["milk_yield_change"], label: t("mastitisDetection.symptoms.milk_yield_dropped") || "Milk Yield Change" },
    { key: "cow_uneasy_during_milking", altKeys: ["udder_pain", "kicking_during_milking"], label: t("mastitisDetection.symptoms.cow_uneasy_during_milking") || "Uneasy / Kicking During Milking" },
  ];

  const stageLabelMap = {
    "Healthy": t("mastitisResult.healthyUdder") || "Healthy Udder",
    "Normal": t("mastitisResult.healthyUdder") || "Healthy Udder",
    "No Mastitis": t("mastitisResult.noMastitis") || "No Mastitis",
    "Mild": t("mastitisResult.mildMastitis") || "Mild Mastitis",
    "Mild Mastitis": t("mastitisResult.mildMastitis") || "Mild Mastitis",
    "Moderate": t("mastitisResult.moderateMastitis") || "Moderate Mastitis",
    "Moderate Mastitis": t("mastitisResult.moderateMastitis") || "Moderate Mastitis",
    "Severe": t("mastitisResult.criticalMastitis") || "Severe Mastitis",
    "Severe Mastitis": t("mastitisResult.criticalMastitis") || "Severe Mastitis",
    "Critical": t("mastitisResult.criticalMastitis") || "Critical / Severe",
    "Insufficient Data": t("mastitisResult.insufficientData") || "Insufficient Data",
  };

  const localizedStage = stageLabelMap[result.stage] || stageLabelMap[result.severity?.severity_label] || (isHealthy ? (t("mastitisResult.healthyUdder") || "Healthy Udder") : isCritical ? (t("mastitisResult.criticalMastitis") || "Severe Mastitis") : isModerate ? (t("mastitisResult.moderateMastitis") || "Moderate Mastitis") : isMild ? (t("mastitisResult.mildMastitis") || "Mild Mastitis") : isInsufficientData ? (t("mastitisResult.insufficientData") || "Insufficient Data") : result.stage);

  const sourceNameMap = {
    "udder_image": t("mastitisDetection.quickGuideStep1") || "Udder Photograph",
    "udder image": t("mastitisDetection.quickGuideStep1") || "Udder Photograph",
    "clinical_observations": t("mastitisDetection.quickGuideStep3") || "Clinical Observations",
    "clinical observations": t("mastitisDetection.quickGuideStep3") || "Clinical Observations",
    "symptom_checklist": t("mastitisResult.symptomReviewTitle") || "Symptom Checklist",
    "symptom checklist": t("mastitisResult.symptomReviewTitle") || "Symptom Checklist",
    "biomarkers": t("mastitisDetection.quickGuideStep2") || "Laboratory Biomarkers",
    "numerical_measurements": t("mastitisDetection.quickGuideStep2") || "Laboratory Biomarkers",
  };
  const localizedSources = result.sources_used?.map(s => sourceNameMap[String(s).toLowerCase()] || String(s).replace(/_/g, " ")).join(", ") || (t("mastitisDetection.quickGuideStep1") || "Udder Photograph");

  return (
    <div className="space-y-6">
      {/* ── Feature 3: Risk Escalation & Critical Veterinary Alert ───────── */}
      {(isCritical || (riskEvaluation && riskEvaluation.is_critical)) && (
        <RiskTrendAlert
          riskEvaluation={
            riskEvaluation || {
              is_critical: true,
              risk_level: "critical",
              title: "🚨 CRITICAL VETERINARY ATTENTION REQUIRED",
              message:
                "CattleSense assessment indicates findings associated with a potentially serious mastitis case. Please contact or visit a qualified veterinarian promptly.",
              supporting_context: "Immediate veterinary examination, isolation, and supportive care strongly advised.",
            }
          }
          onFindVet={() => navigate("/guidance")}
          onDownloadReport={() => {
            const el = document.getElementById("clinical-veterinary-report-section");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          }}
        />
      )}

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
            : isInsufficientData
            ? "border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20 text-blue-950 dark:text-blue-100"
            : "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isPending ? (
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              ) : isCritical ? (
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              ) : isModerate ? (
                <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              ) : isMild ? (
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              ) : isInsufficientData ? (
                <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              ) : (
                <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="text-xs font-bold uppercase tracking-wider opacity-75">
                {t("mastitisResult.diagnosticResult") || t("detection.resultPrefix") || "AI Diagnostic Result"}
              </span>
            </div>
            <h3 className="text-2xl font-black tracking-tight">
              {isPending
                ? (t("detection.modelReady") || "Model Ready for Training")
                : isCritical
                ? (t("mastitisResult.criticalMastitis") || t("stages.critical") || "Critical / Severe Mastitis")
                : isModerate
                ? (t("mastitisResult.moderateMastitis") || t("stages.high") || "Moderate Mastitis Detected")
                : isMild
                ? (t("mastitisResult.mildMastitis") || t("stages.medium") || "Mild Mastitis Detected")
                : isInsufficientData
                ? "Mastitis Detected (Stage Indeterminate)"
                : (t("mastitisResult.healthyUdder") || t("stages.low") || "Healthy Udder (Normal)")}
            </h3>
            <p className="text-xs sm:text-sm opacity-90 max-w-xl">
              {result.recommendation ||
                (isHealthy
                  ? (t("mastitisResult.healthyDesc") || t("detection.low") || "Udder appears healthy with no significant indicators of infection.")
                  : isCritical
                  ? (t("mastitisResult.criticalDesc") || t("detection.critical") || "Severe acute mastitis detected. Immediate emergency veterinary intervention required.")
                  : isModerate
                  ? (t("mastitisResult.moderateDesc") || t("detection.high") || "Clear mastitis indicators detected. Veterinary consultation and isolation recommended.")
                  : isInsufficientData
                  ? "Insufficient clinical detail to determine severity stage — please answer the symptom checklist or provide biomarker measurements."
                  : (t("mastitisResult.mildDesc") || t("detection.medium") || "Mild inflammation detected. Early monitoring and udder hygiene advised."))}
            </p>
          </div>

          <div className="flex flex-row sm:flex-col sm:items-end items-start gap-2 shrink-0 self-start sm:self-start pt-1">
            <span
              className={`inline-flex items-center justify-center px-3.5 py-1.5 rounded-full text-xs font-bold border tracking-wide whitespace-nowrap shadow-2xs ${
                isPending
                  ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                  : isCritical
                  ? "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300 dark:border-red-700"
                  : isModerate
                  ? "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200 border-orange-300 dark:border-orange-700"
                  : isMild
                  ? "bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-700"
                  : isInsufficientData
                  ? "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700"
                  : "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-700"
              }`}
            >
              {localizedStage}
            </span>
            {(isCritical || isModerate) && (
              <button
                type="button"
                onClick={() => navigate("/guidance")}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm active:scale-95 transition-all cursor-pointer whitespace-nowrap"
              >
                <span>{t("detection.emergencyGuidance") || "Emergency Vet Guidance"}</span>
                <ChevronRight size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Confidence & Mode Details */}
        <div className="mt-5 pt-4 border-t border-current/10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <span className="opacity-70">{t("mastitisResult.modelConfidence") || "Model Confidence"}: </span>
            <span className="font-bold">
              {confidenceValue ? confidenceValue : "Available after Model Training"}
            </span>
            {isBorderline && (
              <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-200/90 text-amber-950 dark:bg-amber-900/70 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700">
                {t("mastitisResult.borderlineBadge") || "Borderline"}
              </span>
            )}
          </div>
          <div>
            <span className="opacity-70">{t("mastitisResult.analysisMode") || "Analysis Mode"}: </span>
            <span className="font-bold">
              {result.mode === "multimodal_image_numerical"
                ? (t("mastitisResult.hybridMode") || "Hybrid Analysis")
                : result.mode === "image_only"
                ? (t("mastitisResult.imageMode") || "Image Analysis")
                : result.mode === "numerical_only"
                ? (t("mastitisResult.numericalMode") || "Biomarker Analysis")
                : (result.mode?.replace(/_/g, " ") || "Assisted Detection")}
            </span>
          </div>
          <div>
            <span className="opacity-70">{t("mastitisResult.evidenceUsed") || "Evidence Used"}: </span>
            <span className="font-bold">
              {localizedSources}
            </span>
          </div>
        </div>
      </article>

      {/* ── Feature: Statistical Uncertainty & Borderline Advisory Banner ── */}
      {isBorderline && (
        <article className="rounded-2xl border border-amber-300/90 dark:border-amber-700/70 bg-gradient-to-r from-amber-50/90 via-amber-50/60 to-slate-50/90 dark:from-amber-950/40 dark:via-amber-950/20 dark:to-slate-900/40 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="h-10 w-10 rounded-xl bg-amber-500/15 dark:bg-amber-400/15 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5 border border-amber-500/20">
                <HelpCircle className="h-5 w-5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-200/80 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300/80 dark:border-amber-700/60">
                    {t("mastitisResult.borderlineBadge") || "Borderline / Statistical Uncertainty"}
                  </span>
                  {result.threshold_distance !== undefined && result.threshold_distance !== null && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      ({t("mastitisResult.distanceToThreshold") || "Distance to threshold:"} {(result.threshold_distance * 100).toFixed(1)}%)
                    </span>
                  )}
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {t("mastitisResult.borderlineTitle") || "Borderline Prediction — Veterinary Confirmation Advised"}
                </h4>
                <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed max-w-2xl">
                  {uncertaintyNote}
                </p>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 font-medium">
                  💡 <strong>{t("mastitisResult.recommendationLabel") || "Recommendation:"}</strong> {t("mastitisResult.recommendationTip") || "Do not treat this result as definitive. Perform on-field verification (e.g. California Mastitis Test - CMT) or consult a licensed veterinarian for confirmation."}
                </p>
              </div>
            </div>

            <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0 self-end sm:self-center">
              <button
                type="button"
                onClick={() => navigate("/guidance")}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white dark:bg-amber-500 dark:hover:bg-amber-600 dark:text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Stethoscope className="h-3.5 w-3.5" />
                <span>{t("mastitisResult.consultVet") || "Consult Veterinarian"}</span>
              </button>
            </div>
          </div>
        </article>
      )}

      {/* ── Save Result to Cow Profile Action Bar (Optional Saving) ────────── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                {t("mastitisResult.saveTitle") || "Save to Cow Assessment History"}
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {effectiveCowName
                ? (t("mastitisResult.saveDescWithCow")
                    ? t("mastitisResult.saveDescWithCow").replace("{cowName}", effectiveCowName)
                    : `Optionally store this diagnostic record under ${effectiveCowName}'s medical history for veterinary review.`)
                : (t("mastitisResult.saveDescNoCow") || "Select a cow to link and save this diagnostic assessment to their herd history.")}
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
                <option value="">{t("mastitisResult.selectCowPlaceholder") || "Select a cow..."}</option>
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
                    <span>{t("common.saving") || "Saving..."}</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>{t("mastitisResult.saveResultBtn") || "Save Result"}</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-end gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shrink-0 whitespace-nowrap">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t("mastitisResult.resultSavedBadge") || "✓ Result Saved"}</span>
                </span>

                {effectiveCowId && (
                  <Button
                    onClick={() => navigate(`/cows/${effectiveCowId}/records`)}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap"
                  >
                    <span>{t("mastitisResult.viewCowHistoryBtn") || "View Cow History"}</span>
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
                {t("mastitisResult.retryNotice") || "Your prediction result is still intact. You can retry saving anytime."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Feature 2: Previous vs Current Assessment Comparison (if available) ─ */}
      {comparisonData?.has_comparison && (
        <AssessmentComparisonCard
          comparisonData={comparisonData}
          cowName={effectiveCowName}
        />
      )}

      {/* ── Numerical Measurements Card ──────────────────────────────────── */}
      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("mastitisResult.modelFeaturesTitle") || "Submitted Laboratory Biomarkers"}
            </h4>
          </div>
          <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-900/40 px-2.5 py-0.5 rounded-full">
            {result.data_source || (hasNumericalData ? (t("mastitisResult.farmerProvided") || "Farmer Provided") : (t("mastitisResult.requiredFeatures") || "Required Features"))}
          </span>
        </div>

        {hasNumericalData ? (
          <>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Milk Temperature */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("mastitisResult.milkTemp") || "Milk Temperature"}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {numericalData.Milk_Temperature !== undefined && numericalData.Milk_Temperature !== null
                    ? `${numericalData.Milk_Temperature} °C`
                    : numericalData.milk_temperature !== undefined && numericalData.milk_temperature !== null
                      ? `${numericalData.milk_temperature} °C`
                      : numericalData.Temperature !== undefined && numericalData.Temperature !== null
                        ? `${numericalData.Temperature} °C`
                        : (t("mastitisResult.notProvided") || "Not provided")}
                </p>
              </div>

              {/* Milk pH */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("mastitisResult.milkPh") || "Milk pH"}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {numericalData.Milk_pH !== undefined && numericalData.Milk_pH !== null
                    ? numericalData.Milk_pH
                    : numericalData.milk_ph !== undefined && numericalData.milk_ph !== null
                      ? numericalData.milk_ph
                      : (t("mastitisResult.notProvided") || "Not provided")}
                </p>
              </div>

              {/* Milk Conductivity */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("mastitisResult.conductivity") || "Conductivity"}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {numericalData.Milk_Conductivity !== undefined && numericalData.Milk_Conductivity !== null
                    ? `${numericalData.Milk_Conductivity} mS/cm`
                    : numericalData.milk_conductivity !== undefined && numericalData.milk_conductivity !== null
                      ? `${numericalData.milk_conductivity} mS/cm`
                      : (t("mastitisResult.notProvided") || "Not provided")}
                </p>
              </div>

              {/* Milk Yield */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("mastitisResult.milkYield") || "Milk Yield"}</p>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {numericalData.Milk_Yield !== undefined && numericalData.Milk_Yield !== null
                    ? `${numericalData.Milk_Yield} L/day`
                    : numericalData.milk_yield !== undefined && numericalData.milk_yield !== null
                      ? `${numericalData.milk_yield} L/day`
                      : (t("mastitisResult.notProvided") || "Not provided")}
                </p>
              </div>

              {/* Clotting */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700/60 col-span-2 sm:col-span-1">
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("mastitisResult.clotting") || "Milk Flow & Clots"}</p>
                <p className={`text-xs font-bold mt-0.5 ${
                  Number(numericalData.Clotting ?? numericalData.clotting) === 1
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  {Number(numericalData.Clotting ?? numericalData.clotting) === 1
                    ? (t("mastitisResult.clotsPresent") || "Clots / Flakes Present")
                    : (t("mastitisResult.normalFlow") || "Normal Flow (No Clots)")}
                </p>
              </div>
            </div>

            {/* Model Probabilities Bar (if returned) */}
            {(result.normal_probability !== undefined || result.mastitis_probability !== undefined) && (
              <div className="mt-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-700/60 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-500 dark:text-slate-400">{t("mastitisResult.normalProb") || "Normal Probability"}:</span>
                  <strong className="ml-1 text-emerald-600 dark:text-emerald-400">
                    {result.normal_probability !== undefined ? `${(result.normal_probability * 100).toFixed(1)}%` : "N/A"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500 dark:text-slate-400">{t("mastitisResult.mastitisProb") || "Mastitis Probability"}:</span>
                  <strong className="ml-1 text-rose-600 dark:text-rose-400">
                    {result.mastitis_probability !== undefined ? `${(result.mastitis_probability * 100).toFixed(1)}%` : "N/A"}
                  </strong>
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic">
            {t("mastitisResult.biomarkersNotEvaluated") || "Laboratory Biomarkers: Not evaluated (Photo screening mode was used)"}
          </p>
        )}
      </article>

      {/* ── Symptom Assessment Transparency Card (Farmer-Reported Checklist Adjustment) ─ */}
      {result.symptom_assessment?.adjustment_applied && (
        <article className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-emerald-100 dark:border-emerald-900/40 gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  {t("mastitisResult.symptomReviewTitle") || "Farmer Symptom Review & Probability Adjustment"}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t("mastitisResult.symptomReviewSubtitle") || "Symptom checklist blended as a supporting clinical signal (15% weight) with ML model prediction (85% weight)."}
                </p>
              </div>
            </div>
            <span className="self-start sm:self-center px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs font-bold shrink-0">
              {t("mastitisResult.scoreLabel") || "Score:"} {(result.symptom_assessment.symptom_score * 100).toFixed(0)}%
            </span>
          </div>

          <div className="mt-4 space-y-3">
            {/* Probability Adjustment Comparison Badge */}
            <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-emerald-200/80 dark:border-emerald-800/60 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-slate-600 dark:text-slate-400 font-medium">{t("mastitisResult.modelOutput") || "Model Output:"}</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                  {(result.symptom_assessment.probability_before_adjustment * 100).toFixed(1)}%
                </span>
                <span className="text-slate-400">→</span>
                <span className="text-slate-600 dark:text-slate-400 font-medium">{t("mastitisResult.adjustedWithSymptoms") || "Adjusted with Symptoms:"}</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                  {(result.symptom_assessment.probability_after_adjustment * 100).toFixed(1)}%
                </span>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 italic">
                {result.symptom_assessment.probability_after_adjustment >= result.symptom_assessment.probability_before_adjustment
                  ? `+${((result.symptom_assessment.probability_after_adjustment - result.symptom_assessment.probability_before_adjustment) * 100).toFixed(1)}% ${t("mastitisResult.adjustmentLabel") || "adjustment"}`
                  : `${((result.symptom_assessment.probability_after_adjustment - result.symptom_assessment.probability_before_adjustment) * 100).toFixed(1)}% ${t("mastitisResult.adjustmentLabel") || "adjustment"}`}
              </span>
            </div>

            {/* Reported Symptoms List */}
            <div>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                {t("mastitisResult.reportedSymptomsTitle") || "Reported Positive Symptoms"}
              </p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(result.symptom_assessment.symptoms_reported || {}).length > 0 ? (
                  Object.keys(result.symptom_assessment.symptoms_reported).map((sKey) => {
                    const symptomNames = {
                      milk_has_clots: "Visible Clots / Lumps in Milk",
                      milk_color_changed: "Unusual Milk Color",
                      udder_feels_warm: "Warm Udder to Touch",
                      udder_swollen: "Swollen Udder",
                      milk_yield_dropped: "Sudden Milk Yield Drop",
                      cow_uneasy_during_milking: "Uneasy / Kicking During Milking",
                    };
                    const label = t(`mastitisDetection.symptoms.${sKey}`) || symptomNames[sKey] || sKey.replace(/_/g, " ");
                    return (
                      <span
                        key={sKey}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700/60 text-emerald-800 dark:text-emerald-200 text-xs font-semibold shadow-xs"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>{label}</span>
                      </span>
                    );
                  })
                ) : (
                  <span className="text-xs text-slate-500 italic">
                    {t("mastitisResult.noSymptomsFlagged") || "No positive symptoms flagged (score: 0%)"}
                  </span>
                )}
              </div>
            </div>
          </div>
        </article>
      )}

      {/* ── Clinical Observations Card ───────────────────────────────────── */}
      <article className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              {t("mastitisResult.clinicalObsTitle") || "Clinical Observations (Farmer-Reported Questionnaire)"}
            </h4>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {hasClinicalObs ? (t("mastitisResult.recordedBadge") || "Recorded") : (t("mastitisResult.optionalSectionBadge") || "Optional Section")}
          </span>
        </div>

        {hasClinicalObs ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {clinicalQuestionsMap.map(({ key, altKeys, label }) => {
              let val = mergedObs[key];
              if ((val === null || val === undefined || val === "") && altKeys) {
                for (const alt of altKeys) {
                  if (mergedObs[alt] !== null && mergedObs[alt] !== undefined && mergedObs[alt] !== "") {
                    val = mergedObs[alt];
                    break;
                  }
                }
              }

              let displayVal = val;
              if (val === true || String(val).toLowerCase() === "true" || String(val) === "1" || String(val).toLowerCase() === "yes") {
                displayVal = t("common.yes") || "Yes";
              } else if (val === false || String(val).toLowerCase() === "false" || String(val) === "0" || String(val).toLowerCase() === "no") {
                displayVal = t("common.no") || "No";
              }

              const isPositive =
                val === true ||
                String(val).toLowerCase() === "true" ||
                String(val) === "1" ||
                String(val).toLowerCase() === "yes" ||
                String(displayVal).toLowerCase().includes("clot") ||
                String(displayVal).toLowerCase().includes("decreased") ||
                String(displayVal).toLowerCase().includes("pain") ||
                String(displayVal).toLowerCase().includes("warm") ||
                String(displayVal).toLowerCase().includes("swollen") ||
                String(displayVal).toLowerCase().includes("changed");

              const translatedLabel = t(`mastitisDetection.symptoms.${key}`) || t(`detectionForms.${key}`) || label;
              return (
                <div
                  key={key}
                  className={`p-3 rounded-xl border transition-all ${
                    isPositive
                      ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60"
                      : "bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-700/60"
                  }`}
                >
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{translatedLabel}</p>
                  <p className={`text-xs sm:text-sm font-semibold mt-0.5 ${
                    isPositive
                      ? "text-amber-700 dark:text-amber-300"
                      : "text-slate-800 dark:text-slate-200"
                  }`}>
                    {displayVal !== null && displayVal !== undefined && displayVal !== ""
                      ? displayVal
                      : (t("mastitisResult.notAnswered") || "Not answered")}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400 italic">
            {t("mastitisResult.notProvidedClinical") || "Clinical observations: Not provided"}
          </p>
        )}
      </article>

      {/* ── Farmer Protection & Prevention Guidance (Severity-Aware) ─────── */}
      <FarmerProtectionGuidance result={result} />

      {/* ── Grad-CAM Explainability (Connected to Model 1) ───────────────── */}
      <GradCAMVisualization
        imageUrl={imageUrl}
        heatmapId={result.heatmap_id}
        heatmapData={result.heatmap_data}
        heatmapOverlayUrl={result.heatmap_overlay_url || (result.heatmap_overlay_base64 ? `data:image/png;base64,${result.heatmap_overlay_base64}` : null)}
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
