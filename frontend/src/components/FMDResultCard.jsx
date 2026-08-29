import React, { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, ShieldCheck, FileDown, Loader2, RefreshCw, Info, CloudSun, AlertTriangle } from "lucide-react";
import { Badge, Button } from "./ui/index.jsx";
import { downloadFMDReportPdf } from "../services/api";

const pct = (val) => `${Math.round((Number(val) || 0) * 100)}%`;

export default function FMDResultCard({ result, onReset }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  if (!result) return null;

  const hybrid = result.hybrid_assessment || {};
  const weather = result.weather_risk || {};
  const imagePositive = String(result.predicted_label) === "1";

  const overall =
    hybrid.overall_assessment ||
    (imagePositive ? "POSSIBLE FMD" : "LOW CURRENT CONCERN");
  const overallIsUrgent =
    overall === "HIGH CONCERN" || overall === "POSSIBLE FMD" || String(result.risk_level).toUpperCase() === "HIGH";

  const displayedRiskLevel = weather.environmental_level ?? weather.level;
  const weatherBadgeClass =
    displayedRiskLevel === "HIGH"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : displayedRiskLevel === "MEDIUM"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : displayedRiskLevel === "LOW"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  const confNumber =
    typeof result.confidence_score === "number"
      ? result.confidence_score
      : parseFloat(String(result.confidence || "").replace("%", "")) / 100 || 0;

  const handleDownloadReport = async () => {
    setDownloadError("");
    setIsDownloading(true);
    try {
      const response = await downloadFMDReportPdf({
        result,
        cow_id: result.cow_id,
        symptoms: result.symptoms,
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `fmd_diagnostic_report_${Date.now()}.pdf`;
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-4 pt-2"
    >
      <article
        className={`rounded-3xl border p-6 sm:p-7 shadow-xs ${
          overallIsUrgent
            ? "bg-red-50/90 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            : "bg-emerald-50/90 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
        }`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center ${
                overallIsUrgent
                  ? "bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400"
                  : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {overallIsUrgent ? (
                <ShieldAlert className="h-5 w-5" />
              ) : (
                <ShieldCheck className="h-5 w-5" />
              )}
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                Foot-and-Mouth Disease (FMD) Assessment
              </p>
              <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {hybrid.image_result ||
                  (imagePositive
                    ? "FMD-Consistent Lesions Detected"
                    : "No Visible FMD Lesions Detected")}
              </h3>
            </div>
          </div>
          <Badge variant={overallIsUrgent ? "destructive" : "success"} className="self-start sm:self-auto text-xs px-3 py-1">
            {overall}
          </Badge>
        </div>

        {/* Probability Gauge Bar */}
        <div className="mt-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 p-4 border border-slate-200/70 dark:border-slate-800">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Lesion Classification Probability
            </span>
            <span className={`font-black text-sm ${overallIsUrgent ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              {pct(confNumber)}
            </span>
          </div>
          <div className="h-3 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                overallIsUrgent ? "bg-red-500" : "bg-emerald-500"
              }`}
              style={{ width: `${Math.min(100, Math.max(8, confNumber * 100))}%` }}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Photographic Analysis Details */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Photographic Lesion Finding
            </p>
            <p className="mt-2 text-sm font-bold text-slate-900 dark:text-white">
              {hybrid.image_result ||
                (imagePositive
                  ? "Positive (Oral / Coronary Lesions)"
                  : "Negative (Healthy / Baseline Tissue)")}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Confidence Score: <strong>{result.confidence || pct(confNumber)}</strong>
            </p>
          </div>

          {/* Environmental & Microclimate Transmission Details */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <CloudSun className="h-3.5 w-3.5 text-orange-500" />
                Airborne Spread Risk
              </p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${weatherBadgeClass}`}>
                {displayedRiskLevel ? `${displayedRiskLevel} RISK` : "STANDBY"}
              </span>
            </div>
            {weather.available ? (
              <div className="mt-2 text-xs space-y-1 text-slate-700 dark:text-slate-300">
                <p><strong>Temperature:</strong> {weather.temperature} °C | <strong>Humidity:</strong> {weather.humidity} %</p>
                <p><strong>Rainfall:</strong> {weather.rainfall} mm | <strong>Seasonal:</strong> {weather.seasonal_active ? "Active Peak (Dec–Feb)" : "Standard"}</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {weather.message || "Regional microclimate data incorporated."}
              </p>
            )}
          </div>
        </div>

        {/* Clinical Recommendation */}
        <div className="mt-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Recommended Veterinary Action &amp; Biosecurity
          </p>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {hybrid.recommendation || result.recommendation || result.advice || (
              overallIsUrgent
                ? "Isolate the suspected animal immediately. Restrict vehicle/personnel movement, sanitize pens with 4% sodium carbonate, and notify your Divisional Veterinary Surgeon."
                : "No urgent signs of FMD detected. Continue standard biosecurity protocols and routine herd surveillance."
            )}
          </p>
          <p className="mt-2 text-[11px] italic text-slate-400 dark:text-slate-500">
            * This AI tool is intended for rapid screening and farm decision-support. Always consult a licensed veterinarian for definitive clinical confirmation.
          </p>
        </div>

        {/* Action Buttons: PDF Download + Reset */}
        <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white font-bold py-3 px-4 shadow-sm transition-all duration-200 text-xs sm:text-sm"
          >
            {isDownloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Generating Diagnostic PDF…</span>
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                <span>Download Diagnostic PDF Report</span>
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
              <span>New Check</span>
            </button>
          )}
        </div>

        {downloadError && (
          <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400 font-medium">
            {downloadError}
          </p>
        )}
      </article>
    </motion.div>
  );
}
