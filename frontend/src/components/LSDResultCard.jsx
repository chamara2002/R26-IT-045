import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShieldAlert, FileDown, Loader2, Bookmark, CheckCircle2, ArrowRight, RefreshCw, AlertTriangle } from "lucide-react";
import { Button } from "./ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { downloadLSDReportPdf, saveLSDAssessment } from "../services/api";

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

function NoduleVisualizer({ imageUrl, regions = [], numDetections = 0, isPositive = false }) {
  const [imgDim, setImgDim] = useState(null);
  const [showBoxes, setShowBoxes] = useState(true);

  const handleImageLoad = (e) => {
    const { naturalWidth, naturalHeight } = e.target;
    if (naturalWidth && naturalHeight) {
      setImgDim({ width: naturalWidth, height: naturalHeight });
    }
  };

  const hasVectorRegions = Boolean(regions && regions.length > 0 && imgDim && imgDim.width > 0);

  return (
    <div className="space-y-2">
      <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 flex items-center justify-center min-h-[220px]">
        <div className="relative inline-block w-full max-w-full">
          <img
            src={imageUrl}
            alt="LSD Detection Result"
            onLoad={handleImageLoad}
            className="w-full h-auto max-h-[500px] object-contain mx-auto block rounded-xl"
          />

          {/* Client-side vector overlay for nodule bounding boxes */}
          {hasVectorRegions && showBoxes && (
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox={`0 0 ${imgDim.width} ${imgDim.height}`}
              preserveAspectRatio="xMidYMid meet"
            >
              {regions.map((region, idx) => {
                const bbox = region.bbox || (Array.isArray(region) ? region : null);
                if (!Array.isArray(bbox) || bbox.length < 4) return null;
                const [x1, y1, x2, y2] = bbox;
                const w = Math.max(0, x2 - x1);
                const h = Math.max(0, y2 - y1);
                const conf = region.detection_confidence != null ? Math.round(region.detection_confidence * 100) : null;

                const strokeW = Math.max(3, Math.round(imgDim.width / 220));
                const badgeH = Math.max(22, Math.round(imgDim.height / 32));
                const badgeW = conf ? Math.max(90, Math.round(imgDim.width / 12)) : Math.max(65, Math.round(imgDim.width / 16));
                const fontSize = Math.max(13, Math.round(imgDim.width / 70));

                return (
                  <g key={idx}>
                    {/* Glowing highlight box */}
                    <rect
                      x={x1}
                      y={y1}
                      width={w}
                      height={h}
                      fill="rgba(249, 115, 22, 0.18)"
                      stroke="#f97316"
                      strokeWidth={strokeW}
                      rx="4"
                    />
                    {/* Tag label */}
                    <g transform={`translate(${x1}, ${Math.max(0, y1 - badgeH)})`}>
                      <rect
                        x="0"
                        y="0"
                        width={badgeW}
                        height={badgeH}
                        fill="#ea580c"
                        rx="3"
                      />
                      <text
                        x="6"
                        y={Math.round(badgeH * 0.7)}
                        fill="#ffffff"
                        fontSize={fontSize}
                        fontWeight="bold"
                        fontFamily="system-ui, -apple-system, sans-serif"
                      >
                        {conf ? `Nodule ${conf}%` : "Nodule"}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>

      {hasVectorRegions && (
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
          <span className="font-semibold text-amber-600 dark:text-amber-400">
            ✓ {regions.length} nodule region{regions.length > 1 ? "s" : ""} marked with confidence boxes
          </span>
          <button
            type="button"
            onClick={() => setShowBoxes(!showBoxes)}
            className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 hover:underline cursor-pointer"
          >
            {showBoxes ? "Hide Highlight Boxes" : "Show Highlight Boxes"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function LSDResultCard({ result, cowId, cows = [], imageUrl, onCowSelect, onReset }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const [selectedCowId, setSelectedCowId] = useState(cowId || result?.cow_id || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  if (!result) return null;

  const displayImage =
    result.annotated_image ||
    imageUrl ||
    result.image_url ||
    result.imageUrl ||
    result.uploaded_image ||
    result.image;

  const effectiveCowId = selectedCowId || cowId || result?.cow_id || "";
  const linkedCow = cows.find((c) => String(c.id) === String(effectiveCowId));
  const effectiveCowName = linkedCow?.name || (effectiveCowId ? `Cow #${effectiveCowId}` : "Cow");

  const riskLevel = result.risk_level || result.stage || "LOW RISK";
  const styles = RISK_STYLES[riskLevel] || RISK_STYLES["LOW RISK"];
  const overall = result.overall_prediction || {};
  const imagePrediction = result.image_prediction || {};
  const symptomPrediction = result.symptom_prediction;
  const imageWeight = overall.image_weight ?? 1;
  const symptomWeight = overall.symptom_weight ?? 0;
  const regions =
    (Array.isArray(result.regions) && result.regions.length > 0 ? result.regions : null) ||
    (Array.isArray(result.data?.regions) && result.data.regions.length > 0 ? result.data.regions : null) ||
    (Array.isArray(imagePrediction.regions) && imagePrediction.regions.length > 0 ? imagePrediction.regions : null) ||
    [];
  const numDetections = result.num_detections ?? imagePrediction.num_detections ?? regions.length ?? 0;
  const isPositive = String(result.prediction || "").toLowerCase().includes("positive") || riskLevel === "HIGH RISK" || riskLevel === "MODERATE RISK";

  const handleSaveResult = async () => {
    if (!effectiveCowId) {
      setSaveError("Please select a cow to save this assessment to their medical profile.");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveSuccessMsg("");

    try {
      const payload = {
        cow_id: effectiveCowId,
        result: {
          ...result,
          prediction: result.prediction,
          confidence: overall.probability ?? result.confidence ?? 0,
          stage: riskLevel,
          risk_level: riskLevel,
          recommendation: result.recommendation || result.advice,
          overall_prediction: overall,
          image_prediction: imagePrediction,
          symptom_prediction: symptomPrediction,
          symptoms: result.symptoms,
          annotated_image: displayImage,
        },
        symptoms: result.symptoms,
      };

      const res = await saveLSDAssessment(payload);
      setIsSaved(true);
      setSaveSuccessMsg(res?.message || `LSD Assessment saved to ${effectiveCowName}'s medical history.`);
    } catch (err) {
      console.error("Save LSD assessment error:", err);
      setSaveError(err.message || "Unable to save assessment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

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
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">Photo Analysis</p>
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

      {displayImage && (
        <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-slate-300">
              {numDetections > 0 ? "Detected Nodule Regions" : "Analyzed Skin Photograph"}
            </h4>
            <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
              numDetections > 0
                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-amber-300 dark:border-amber-700"
                : isPositive
                ? "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-300 border-violet-300 dark:border-violet-700"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700"
            }`}>
              {numDetections > 0
                ? `${numDetections} Nodule Region${numDetections > 1 ? "s" : ""} Marked`
                : isPositive
                ? "Generalized Texture / Clinical Signs Detected"
                : "No Elevated Nodules Detected"}
            </span>
          </div>

          <NoduleVisualizer
            imageUrl={displayImage}
            regions={regions}
            numDetections={numDetections}
            isPositive={isPositive}
          />

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {numDetections > 0
              ? "Orange boxes mark localized nodule regions detected on the skin. The combined probability above integrates both the visual nodule detections and clinical symptom evaluation."
              : isPositive
              ? "The AI vision and clinical assessment identified general risk signals. Follow the recommended veterinary advice above."
              : "No visible nodule lesions were detected on the skin photograph. Maintain regular herd health monitoring."}
          </p>
        </article>
      )}

      {/* ── Linked Cow Profile & Save Result Card ── */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t("resultCards.linkCowTitle") || "Cow Profile Medical Record"}
            </h4>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {effectiveCowId ? `${t("resultCards.savedBadge") || "Linked"}: ${effectiveCowName}` : (t("detectionForms.noCowSelected") || "Unlinked Assessment")}
              </span>
              {linkedCow?.tag_id && (
                <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                  Tag: {linkedCow.tag_id}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {!effectiveCowId && cows.length > 0 && (
              <select
                value={selectedCowId}
                onChange={(e) => {
                  setSelectedCowId(e.target.value);
                  if (onCowSelect) onCowSelect(e.target.value);
                }}
                className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-violet-500 max-w-[200px] truncate"
              >
                <option value="">{t("resultCards.selectCowLabel") || "Select a cow to link..."}</option>
                {cows.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || `Cow #${c.id}`} ({c.tag_id || "No Tag"})
                  </option>
                ))}
              </select>
            )}

            {!isSaved ? (
              <Button
                type="button"
                onClick={handleSaveResult}
                disabled={isSaving || !effectiveCowId}
                variant="primary"
                size="sm"
                className="gap-2 rounded-xl text-xs font-semibold px-4 py-2 shrink-0 whitespace-nowrap bg-violet-600 hover:bg-violet-700"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>{t("resultCards.savingRecord") || "Saving..."}</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="h-3.5 w-3.5" />
                    <span>{t("resultCards.saveToProfile") || "Save Result"}</span>
                  </>
                )}
              </Button>
            ) : (
              <div className="flex items-center justify-end gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shrink-0 whitespace-nowrap">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>✓ {t("resultCards.assessmentSaved") || "Result Saved"}</span>
                </span>

                {effectiveCowId && (
                  <Button
                    type="button"
                    onClick={() => navigate(`/cows/${effectiveCowId}/records`)}
                    variant="outline"
                    size="sm"
                    className="gap-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap"
                  >
                    <span>{t("resultCards.viewCowRecords") || "View Cow Records"}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {saveSuccessMsg && (
          <p className="mt-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </p>
        )}
        {saveError && (
          <p className="mt-2.5 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{saveError}</span>
          </p>
        )}
      </div>

      {/* Action Buttons: PDF Download + Reset */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={handleDownloadReport}
          disabled={isDownloading}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 disabled:opacity-60 text-white font-bold py-3 shadow-md transition-all duration-200 text-xs sm:text-sm"
        >
          {isDownloading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t("resultCards.downloading") || "Generating report…"}</span>
            </>
          ) : (
            <>
              <FileDown className="h-4 w-4" />
              <span>{t("resultCards.downloadReport") || "Download PDF Diagnostic Report"}</span>
            </>
          )}
        </button>

        {onReset && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-3 px-5 text-xs sm:text-sm transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{t("detection.retakeTest") || "New Check"}</span>
          </button>
        )}
      </div>
      {downloadError && <p className="mt-2 text-center text-sm text-red-600">{downloadError}</p>}
    </motion.div>
  );
}
