import React from "react";
import { motion } from "framer-motion";
import { ShieldAlert, AlertTriangle, CheckCircle2, Info, CloudSun, FileText } from "lucide-react";
import { Badge } from "./ui/index.jsx";

export default function FMDResultCard({ result, onReset }) {
  if (!result) return null;

  const hybrid = result.hybrid_assessment || {};
  const weather = result.weather_risk || {};
  const imagePositive = String(result.predicted_label) === "1";

  const overall =
    hybrid.overall_assessment ||
    (imagePositive ? "POSSIBLE FMD" : "LOW CURRENT CONCERN");
  const overallIsUrgent =
    overall === "HIGH CONCERN" || overall === "POSSIBLE FMD";

  const displayedRiskLevel = weather.environmental_level ?? weather.level;
  const weatherBadgeClass =
    displayedRiskLevel === "HIGH"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : displayedRiskLevel === "MEDIUM"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : displayedRiskLevel === "LOW"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      <article
        className={`rounded-3xl border p-6 shadow-sm ${
          overallIsUrgent
            ? "bg-red-50/90 dark:bg-red-950/20 border-red-200 dark:border-red-800"
            : "bg-emerald-50/90 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`h-5 w-5 ${overallIsUrgent ? "text-red-600" : "text-emerald-600"}`} />
            <p className="text-xs font-black uppercase tracking-wider">
              Foot-and-Mouth Disease (FMD) Assessment
            </p>
          </div>
          <Badge variant={overallIsUrgent ? "destructive" : "success"}>
            {overall}
          </Badge>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {/* Image analysis */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Photographic Lesion Analysis
            </p>
            <p className="mt-2 text-base font-bold text-slate-900 dark:text-white">
              {hybrid.image_result ||
                (imagePositive
                  ? "FMD-consistent lesions detected"
                  : "No visible FMD lesions detected")}
            </p>
            {result.confidence && (
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                Model Confidence: <strong>{result.confidence}</strong>
              </p>
            )}
          </div>

          {/* Weather + seasonal (environmental) risk */}
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                Environmental & Weather Risk
              </p>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${weatherBadgeClass}`}>
                {displayedRiskLevel || "STANDBY"}
              </span>
            </div>
            {weather.available ? (
              <div className="mt-2 text-xs space-y-1 text-slate-700 dark:text-slate-300">
                <p><strong>Weather Risk:</strong> {weather.level}</p>
                <p><strong>Temperature:</strong> {weather.temperature} °C | <strong>Humidity:</strong> {weather.humidity} %</p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                {weather.message || "Microclimate transmission analysis active."}
              </p>
            )}
          </div>
        </div>

        {/* Clinical Recommendation */}
        <div className="mt-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">
            Recommended Veterinary Action
          </p>
          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200">
            {hybrid.recommendation || result.recommendation || result.advice || (
              overallIsUrgent
                ? "Isolate the animal immediately. Notify your local veterinary officer and restrict movement on the farm to prevent transmission."
                : "No urgent signs of FMD detected. Continue standard biosecurity protocols and monitor the herd regularly."
            )}
          </p>
          <p className="mt-2 text-[11px] italic text-slate-400 dark:text-slate-500">
            * This AI tool is intended for rapid screening and farm decision-support. Always consult a licensed veterinarian for definitive clinical confirmation.
          </p>
        </div>
      </article>
    </motion.div>
  );
}
