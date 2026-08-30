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
  ShieldAlert,
  Syringe,
  CloudSun,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button, Badge } from "./ui/index.jsx";
import FarmerProtectionGuidance from "./FarmerProtectionGuidance.jsx";
import GradCAMVisualization from "./GradCAMVisualization.jsx";
import {
  downloadMastitisReportPdf,
  downloadFMDReportPdf,
  downloadLSDReportPdf,
} from "../services/api";

const pct = (val) => `${Math.round((Number(val) || 0) * 100)}%`;

export default function AssessmentDetailsModal({ assessment, isOpen, onClose }) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [language, setLanguage] = useState("en");

  if (!isOpen || !assessment) return null;

  // Identify Disease Module
  const modStr = String(assessment.diseaseKey || assessment.module_name || "").toLowerCase();
  const isFMD = modStr.includes("fmd") || modStr.includes("foot");
  const isLSD = modStr.includes("lump") || modStr.includes("lsd");
  const isMilkFever = modStr.includes("milk-fever") || modStr.includes("milk_fever");
  const isMastitis = !isFMD && !isLSD && !isMilkFever;

  // Extract structured session data & fallbacks
  const sessionData = assessment.session_data || {};
  const resData = (typeof sessionData.result === "object" && sessionData.result) ? sessionData.result : assessment;
  const weatherRisk = sessionData.weather_risk || resData.weather_risk || {};
  const hybridAssessment = sessionData.hybrid_assessment || resData.hybrid_assessment || {};
  const recommendation =
    sessionData.recommendation ||
    resData.recommendation ||
    resData.advice ||
    assessment.recommendation ||
    "";
  const rawSymptoms =
    sessionData.symptoms ||
    resData.symptoms ||
    assessment.symptoms ||
    assessment.clinical_observations ||
    assessment.symptom_assessment?.symptoms_raw ||
    {};
  const clinicalObs = typeof rawSymptoms === "object" && rawSymptoms !== null ? rawSymptoms : {};

  const rawPrediction = String(assessment.prediction || resData.prediction || resData.stage || "Assessed");
  const stageStr = String(assessment.stage || resData.stage || assessment.severity_level || rawPrediction).toLowerCase();
  const severityLevel = String(assessment.severity_level || resData.risk_level || "").toLowerCase();

  const isCritical =
    stageStr.includes("severe") ||
    stageStr.includes("critical") ||
    stageStr.includes("stage 3") ||
    stageStr.includes("high concern") ||
    stageStr.includes("high risk") ||
    severityLevel === "severe" ||
    severityLevel === "critical" ||
    severityLevel === "high" ||
    severityLevel === "3";

  const isModerate =
    !isCritical &&
    (stageStr.includes("moderate") ||
      stageStr.includes("stage 2") ||
      stageStr.includes("stage 1") ||
      severityLevel === "moderate" ||
      severityLevel === "medium" ||
      severityLevel === "2");

  const isMild =
    !isCritical &&
    !isModerate &&
    (stageStr.includes("mild") ||
      stageStr.includes("subclinical") ||
      stageStr.includes("low risk") ||
      stageStr.includes("possible") ||
      severityLevel === "mild" ||
      severityLevel === "1");

  const isHealthy = !isCritical && !isModerate && !isMild;

  let rawConf = assessment.confidence ?? resData.confidence_score ?? resData.confidence ?? (resData.overall_prediction?.probability);
  if (typeof rawConf === "string") {
    rawConf = parseFloat(rawConf.replace("%", "")) / (rawConf.includes("%") ? 100 : 1);
  }
  const confidenceStr =
    typeof rawConf === "number" && !isNaN(rawConf)
      ? `${(rawConf > 1 ? rawConf : rawConf * 100).toFixed(1)}%`
      : "Assessed";

  const numericalData = assessment.numerical_measurements || resData.numerical_measurements || {};

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);

      if (isFMD) {
        const response = await downloadFMDReportPdf({
          result: {
            ...resData,
            predicted_label: resData.predicted_label || (rawPrediction.toLowerCase().includes("positive") ? "1" : "0"),
            confidence_score: rawConf,
            hybrid_assessment: hybridAssessment,
            weather_risk: weatherRisk,
            recommendation,
          },
          cow_id: assessment.cow_id,
          symptoms: clinicalObs,
        });
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CattleSense-FMD-Report-${assessment.cow_name || "Cow"}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (isLSD) {
        const response = await downloadLSDReportPdf({
          ...resData,
          prediction: rawPrediction,
          confidence: rawConf,
          risk_level: assessment.stage || resData.risk_level || "LOW RISK",
          recommendation,
          symptoms: clinicalObs,
          cow_id: assessment.cow_id,
        });
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CattleSense-LSD-Report-${assessment.cow_name || "Cow"}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else if (isMilkFever) {
        // Milk Fever client-side PDF download fallback
        let jsPDFClass = window.jspdf?.jsPDF || window.jsPDF;
        if (!jsPDFClass) {
          try {
            await new Promise((resolve, reject) => {
              const script = document.createElement("script");
              script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
            jsPDFClass = window.jspdf?.jsPDF || window.jsPDF;
          } catch (e) {
            console.warn("jsPDF fallback error", e);
          }
        }
        if (jsPDFClass) {
          const doc = new jsPDFClass();
          doc.setFillColor(15, 118, 110);
          doc.rect(0, 0, 210, 35, "F");
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(16);
          doc.setFont("helvetica", "bold");
          doc.text("CATTLESENSE — Milk Fever Diagnostic Report", 15, 14);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(`Patient Cow: ${assessment.cow_name || "Cow"} (${assessment.cow_tag || `ID: ${assessment.cow_id}`})`, 15, 24);

          doc.setTextColor(30, 41, 59);
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`Assessment Result: ${rawPrediction}`, 15, 48);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text(`Recorded Date: ${new Date(assessment.created_at || Date.now()).toLocaleDateString()}`, 15, 56);
          doc.text(`Estimated Calcium Status: ${resData.calcium_estimate || "Evaluated by Clinical Model"}`, 15, 64);
          doc.text(`Clinical Recommendation:`, 15, 76);
          doc.setFontSize(9);
          doc.text(doc.splitTextToSize(recommendation || "Maintain standard post-calving monitoring.", 180), 15, 84);

          doc.save(`CattleSense-MilkFever-Report-${assessment.cow_name || "Cow"}-${Date.now()}.pdf`);
        } else {
          alert(`Milk Fever Report:\nCow: ${assessment.cow_name || "Cow"}\nResult: ${rawPrediction}\nRecommendation: ${recommendation}`);
        }
      } else {
        // Mastitis PDF
        const payload = {
          cow_id: assessment.cow_id,
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
            id: assessment.cow_id,
            name: assessment.cow_name || "Cow",
            tag_id: assessment.cow_tag || `COW-${assessment.cow_id}`,
          },
          heatmap_id: assessment.heatmap_id,
          language,
        };

        const response = await downloadMastitisReportPdf(payload);
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `CattleSense-Mastitis-Veterinary-Report-${assessment.cow_name || "Cow"}-${language}-${Date.now()}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Could not generate PDF report. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Title and Icon Configuration
  let ModalIcon = Stethoscope;
  let modalTitle = "Mastitis Assessment Record";
  let themeColor = "emerald";

  if (isFMD) {
    ModalIcon = ShieldAlert;
    modalTitle = "Foot-and-Mouth Disease (FMD) Screening Record";
    themeColor = "orange";
  } else if (isLSD) {
    ModalIcon = Syringe;
    modalTitle = "Lumpy Skin Disease (LSD) Screening Record";
    themeColor = "violet";
  } else if (isMilkFever) {
    ModalIcon = Thermometer;
    modalTitle = "Milk Fever (Hypocalcaemia) Screening Record";
    themeColor = "teal";
  }

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
                <ModalIcon
                  className={`h-5 w-5 ${
                    themeColor === "orange"
                      ? "text-orange-600 dark:text-orange-400"
                      : themeColor === "violet"
                      ? "text-violet-600 dark:text-violet-400"
                      : themeColor === "teal"
                      ? "text-teal-600 dark:text-teal-400"
                      : "text-emerald-600 dark:text-emerald-400"
                  }`}
                />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {modalTitle}
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
                {assessment.stage || resData.stage || rawPrediction}
              </span>
            </div>
          </div>

          {/* Diagnostic Result Overview Banner */}
          <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <p className="text-slate-500 dark:text-slate-400">Diagnosis</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 capitalize">{rawPrediction}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Confidence</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{confidenceStr}</p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Diagnostic Pipeline</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 capitalize">
                {isMastitis ? "Multimodal AI (CNN + Tree)" : isFMD ? "CNN + Weather AI" : isLSD ? "Vision + Symptom Fusion" : "Non-Invasive ML"}
              </p>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400">Severity Staging</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5 capitalize">
                {assessment.stage || resData.stage || (isCritical ? "Severe" : isModerate ? "Moderate" : isMild ? "Mild" : "Normal")}
              </p>
            </div>
          </div>

          {/* FMD Weather Risk Details (if FMD) */}
          {isFMD && (
            <div className="p-4 rounded-xl border border-orange-200 dark:border-orange-900/50 bg-orange-50/40 dark:bg-orange-950/20 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-orange-900 dark:text-orange-200 flex items-center gap-1.5">
                  <CloudSun className="h-4 w-4 text-orange-600" />
                  <span>Microclimate Transmission & Epidemiological Risk</span>
                </h4>
                {weatherRisk.level && (
                  <Badge variant={weatherRisk.level === "HIGH" ? "danger" : weatherRisk.level === "MEDIUM" ? "warning" : "success"}>
                    {weatherRisk.level} AIRBORNE RISK
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs text-slate-700 dark:text-slate-300">
                <div><strong>Temperature:</strong> {weatherRisk.temperature ? `${weatherRisk.temperature} °C` : "Regional Avg"}</div>
                <div><strong>Humidity:</strong> {weatherRisk.humidity ? `${weatherRisk.humidity} %` : "Standard"}</div>
                <div><strong>Seasonal Period:</strong> {weatherRisk.seasonal_active ? "Peak Spread (Dec–Feb)" : "Standard"}</div>
                <div><strong>Transmission:</strong> {weatherRisk.level || "Evaluated"}</div>
              </div>
            </div>
          )}

          {/* Submitted Laboratory Biomarkers (if Mastitis) */}
          {isMastitis && Object.keys(numericalData).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Thermometer className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Submitted Laboratory Biomarkers</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Milk Temperature</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {numericalData.Milk_Temperature ?? numericalData.milk_temperature ?? "Not provided"} °C
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Milk pH</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {numericalData.Milk_pH ?? numericalData.milk_ph ?? "Not provided"}
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Conductivity</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {numericalData.Milk_Conductivity ?? numericalData.milk_conductivity ?? "Not provided"} mS/cm
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Milk Yield</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {numericalData.Milk_Yield ?? numericalData.milk_yield ?? "Not provided"} L/day
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs col-span-2 sm:col-span-1">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">Milk Flow & Clots</span>
                  <span className={`font-semibold ${Number(numericalData.Clotting ?? numericalData.clotting) === 1 ? "text-amber-600" : "text-emerald-600"}`}>
                    {Number(numericalData.Clotting ?? numericalData.clotting) === 1 ? "Clots / Flakes Present" : "Normal Flow"}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Clinical Observations / Symptoms Q&A */}
          {Object.keys(clinicalObs).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Stethoscope className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span>Clinical Observations & Physical Signs</span>
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.entries(clinicalObs).map(([k, v]) => {
                  let displayVal = v;
                  if (v === true || String(v).toLowerCase() === "true" || String(v) === "1") displayVal = "Yes";
                  else if (v === false || String(v).toLowerCase() === "false" || String(v) === "0") displayVal = "No";
                  return (
                    <div key={k} className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-xs">
                      <span className="text-slate-500 dark:text-slate-400 block text-[10px] capitalize">
                        {k.replace(/_/g, " ")}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {displayVal || "Not observed"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Veterinary Action & Recommendations */}
          {recommendation && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/40 space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Recommended Action & Advisory
              </h4>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed">
                {recommendation}
              </p>
            </div>
          )}

          {/* Farmer Protection Guidance Snapshot (Mastitis) */}
          {isMastitis && <FarmerProtectionGuidance result={assessment} />}

          {/* AI Visual Attention Heatmap (if available) */}
          {isMastitis && (assessment.heatmap_id || assessment.gradcam_overlay_path) && (
            <GradCAMVisualization
              heatmapId={assessment.heatmap_id}
              heatmapOverlayUrl={assessment.gradcam_overlay_path}
              stage={assessment.stage || assessment.prediction || "Normal"}
              roiApplied={assessment.roi_applied}
            />
          )}

          {/* Veterinary Assessment PDF Download Banner */}
          <div
            className={`rounded-2xl border p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-2xs ${
              isCritical
                ? "border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-950/20"
                : isModerate
                ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20"
                : isMild
                ? "border-yellow-200 dark:border-yellow-900/60 bg-yellow-50/50 dark:bg-yellow-950/20"
                : "border-teal-200 dark:border-teal-900/60 bg-teal-50/50 dark:bg-teal-950/20"
            }`}
          >
            <div className="min-w-0">
              <h4
                className={`text-sm font-bold flex items-center gap-1.5 ${
                  isCritical
                    ? "text-red-950 dark:text-red-100"
                    : isModerate
                    ? "text-amber-950 dark:text-amber-100"
                    : isMild
                    ? "text-yellow-950 dark:text-yellow-100"
                    : "text-teal-950 dark:text-teal-100"
                }`}
              >
                {isCritical ? (
                  <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                ) : (
                  <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400 shrink-0" />
                )}
                <span>Download Official Diagnostic PDF Report</span>
              </h4>
              <p
                className={`text-xs mt-1 leading-relaxed ${
                  isCritical
                    ? "text-red-700 dark:text-red-300"
                    : isModerate
                    ? "text-amber-700 dark:text-amber-300"
                    : isMild
                    ? "text-yellow-700 dark:text-yellow-300"
                    : "text-teal-700 dark:text-teal-300"
                }`}
              >
                Generated clinical diagnostic report with health metrics & evidence
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:self-end lg:self-center shrink-0">
              {isMastitis && (
                <div className="inline-flex items-center bg-black/5 dark:bg-white/10 p-1 rounded-xl border border-black/10 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setLanguage("en")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-none ${
                      language === "en"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    English
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("si")}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all focus:outline-none ${
                      language === "si"
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    සිංහල
                  </button>
                </div>
              )}

              <Button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf}
                variant="default"
                size="sm"
                className={`gap-2 text-xs font-bold rounded-xl shadow-xs px-4 py-2.5 whitespace-nowrap cursor-pointer hover:shadow-md transition-all text-white shrink-0 ${
                  themeColor === "orange"
                    ? "bg-orange-600 hover:bg-orange-700"
                    : themeColor === "violet"
                    ? "bg-violet-600 hover:bg-violet-700"
                    : themeColor === "teal"
                    ? "bg-teal-600 hover:bg-teal-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                {isDownloadingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                ) : (
                  <Download className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {isDownloadingPdf
                    ? "Generating..."
                    : isMastitis && language === "si"
                    ? "පශු වෛද්‍ය PDF"
                    : "Download Diagnostic PDF"}
                </span>
              </Button>
            </div>
          </div>

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
