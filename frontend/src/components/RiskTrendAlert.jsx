import { motion } from "framer-motion";
import {
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Info,
  PhoneCall,
  FileDown,
  Stethoscope,
  Activity,
  ArrowRight,
} from "lucide-react";
import { Button } from "./ui/index.jsx";
import { useI18n } from "../i18n/language-context";

export default function RiskTrendAlert({
  riskEvaluation,
  onFindVet,
  onDownloadReport,
  onCreateFollowUp,
}) {
  const { t } = useI18n();

  if (!riskEvaluation) return null;

  const { is_critical, risk_level, title, message, supporting_context } = riskEvaluation;

  if (is_critical) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="rounded-2xl p-5 sm:p-6 bg-gradient-to-br from-red-50 via-rose-50 to-red-100/60 dark:from-red-950/70 dark:via-red-900/40 dark:to-rose-950/50 border-2 border-red-500 shadow-md space-y-4"
      >
        <div className="flex items-start gap-3.5">
          <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
            <AlertOctagon className="h-6 w-6 sm:h-7 sm:w-7" />
          </div>
          <div className="space-y-1.5 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider">
              {t("riskAlert.criticalPriority") || "Urgent Clinical Action"}
            </div>
            <h3 className="text-base sm:text-lg font-bold text-red-950 dark:text-red-100">
              {title || (t("riskAlert.criticalTitle") || "🚨 CRITICAL VETERINARY ATTENTION REQUIRED")}
            </h3>
            <p className="text-xs sm:text-sm text-red-900 dark:text-red-200 leading-relaxed font-medium">
              {message || (t("riskAlert.criticalMessage") || "CattleSense assessment indicates findings associated with a potentially serious mastitis case. Please contact or visit a qualified veterinarian promptly.")}
            </p>
            {supporting_context && (
              <p className="text-xs text-red-800/80 dark:text-red-300/80 italic pt-0.5">
                {supporting_context}
              </p>
            )}
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-red-200 dark:border-red-800/60">
          {onFindVet && (
            <Button
              type="button"
              variant="danger"
              onClick={onFindVet}
              className="px-4 py-2 text-xs sm:text-sm font-bold shadow-sm gap-2"
            >
              <PhoneCall className="h-4 w-4" />
              <span>{t("riskAlert.findVet") || "Find Veterinary Assistance"}</span>
            </Button>
          )}

          {onDownloadReport && (
            <Button
              type="button"
              variant="outline"
              onClick={onDownloadReport}
              className="px-4 py-2 text-xs sm:text-sm font-semibold border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 bg-white/80 dark:bg-slate-900 gap-2"
            >
              <FileDown className="h-4 w-4 text-red-600" />
              <span>{t("riskAlert.downloadReport") || "Download Veterinary Report"}</span>
            </Button>
          )}

          {onCreateFollowUp && (
            <Button
              type="button"
              variant="ghost"
              onClick={onCreateFollowUp}
              className="px-3.5 py-2 text-xs sm:text-sm font-semibold text-red-800 dark:text-red-300 hover:bg-red-100/60 dark:hover:bg-red-950/40 gap-1.5"
            >
              <Stethoscope className="h-4 w-4" />
              <span>{t("riskAlert.recordFollowUp") || "Record Vet Visit"}</span>
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  if (risk_level === "warning") {
    return (
      <div className="rounded-2xl p-4 sm:p-5 bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/60 space-y-2">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-orange-950 dark:text-orange-200">
              {title || (t("riskAlert.worseningTitle") || "⚠️ Worsening Trend Detected")}
            </h4>
            <p className="text-xs text-orange-900 dark:text-orange-300 leading-relaxed">
              {message}
            </p>
            {supporting_context && (
              <p className="text-[11px] text-orange-800/80 dark:text-orange-400/80 italic">
                {supporting_context}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (risk_level === "positive") {
    return (
      <div className="rounded-2xl p-4 sm:p-5 bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 space-y-1">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <h4 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
              {title || (t("riskAlert.improvingTitle") || "🟢 Assessment Trend is Improving")}
            </h4>
            <p className="text-xs text-emerald-900 dark:text-emerald-300">
              {message}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
