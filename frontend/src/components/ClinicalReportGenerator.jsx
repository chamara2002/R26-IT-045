import { useState, useEffect } from "react";
import { Download, FileText, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/index.jsx";
import { useI18n } from "../i18n/language-context";

export default function ClinicalReportGenerator({ result, cowName, farmerName, imageUrl }) {
  const { t, language: currentLang } = useI18n();
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [language, setLanguage] = useState(currentLang === "si" ? "si" : "en");

  useEffect(() => {
    if (currentLang) {
      setLanguage(currentLang === "si" ? "si" : "en");
    }
  }, [currentLang]);

  const authToken = localStorage.getItem("cattlesense_token") || localStorage.getItem("admin_token") || "";

  if (!result) return null;

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const payload = {
        result,
        cattle_info: {
          name: cowName || "Cow",
          tag_id: cowName || "Not recorded",
        },
        farmer_info: {
          name: farmerName || "Registered Farmer",
        },
        heatmap_id: result.heatmap_id,
        language,
      };

      let response = null;
      try {
        response = await fetch("/api/modules/mastitis/report-pdf", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // Network/proxy fallback
      }

      if (!response || !response.ok) {
        response = await fetch("http://localhost:5002/api/report/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response || !response.ok) {
        throw new Error("Failed to generate PDF from server");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CattleSense-Mastitis-Veterinary-Report-${cowName || "Cow"}-${language}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Could not generate PDF report.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Severity check
  const rawPrediction = String(result.prediction || "Normal");
  const stageStr = String(result.stage || result.severity?.severity_label || "").toLowerCase();
  const severityLevel = String(result.severity?.severity_level || "").toLowerCase();

  const isCritical =
    stageStr.includes("severe") ||
    stageStr.includes("critical") ||
    severityLevel === "severe" ||
    severityLevel === "critical" ||
    severityLevel === "3";

  const isModerate =
    !isCritical && (stageStr.includes("moderate") || severityLevel === "moderate" || severityLevel === "2");
  const isMild =
    !isCritical && !isModerate && (stageStr.includes("mild") || severityLevel === "mild" || severityLevel === "1");

  // Determine color scheme based on severity
  const containerClasses = isCritical
    ? "border-red-300 dark:border-red-900/80 bg-red-50/40 dark:bg-red-950/20 text-red-900 dark:text-red-200"
    : isModerate
    ? "border-amber-300 dark:border-amber-900/80 bg-amber-50/40 dark:bg-amber-950/20 text-amber-900 dark:text-amber-200"
    : isMild
    ? "border-yellow-300 dark:border-yellow-900/80 bg-yellow-50/40 dark:bg-yellow-950/20 text-yellow-900 dark:text-yellow-200"
    : "border-teal-300 dark:border-teal-900/80 bg-teal-50/40 dark:bg-teal-950/20 text-teal-900 dark:text-teal-200";

  const iconBgClasses = isCritical
    ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800"
    : isModerate
    ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
    : isMild
    ? "bg-yellow-100 dark:bg-yellow-900/50 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800"
    : "bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800";

  const btnClasses = isCritical
    ? "bg-red-600 hover:bg-red-700 text-white"
    : isModerate
    ? "bg-amber-600 hover:bg-amber-700 text-white"
    : isMild
    ? "bg-yellow-600 hover:bg-yellow-700 text-white"
    : "bg-teal-600 hover:bg-teal-700 text-white";

  const badgeText = isCritical
    ? (t("clinicalReport.criticalBadge") || "Critical Case Handover")
    : isModerate
    ? (t("clinicalReport.moderateBadge") || "Moderate Assessment")
    : isMild
    ? (t("clinicalReport.mildBadge") || "Mild Assessment")
    : (t("clinicalReport.standardBadge") || "Standard Record");

  const badgeBg = isCritical
    ? "bg-red-600"
    : isModerate
    ? "bg-amber-600"
    : isMild
    ? "bg-yellow-600"
    : "bg-teal-600";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border-2 p-5 shadow-sm space-y-4 ${containerClasses}`}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-black/10 dark:border-white/10">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`p-2.5 rounded-xl border shrink-0 ${iconBgClasses}`}>
            <FileText className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {t("clinicalReport.title") || "Veterinary Assessment & Diagnostic Report"}
              </h3>
              <span className={`whitespace-nowrap inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider text-white shadow-xs shrink-0 ${badgeBg}`}>
                {badgeText}
              </span>
            </div>
            <p className="text-xs opacity-80 mt-1 leading-relaxed">
              {t("clinicalReport.subtitle") || "Complete diagnostic record, biomarkers, and clinical report for the attending veterinarian"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 sm:self-end lg:self-center shrink-0">
          {/* Language Toggle */}
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

          <Button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            variant="default"
            size="sm"
            className={`gap-2 text-xs font-bold rounded-xl shadow-xs px-4 py-2.5 whitespace-nowrap cursor-pointer hover:shadow-md transition-all ${btnClasses}`}
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            ) : (
              <Download className="h-4 w-4 shrink-0" />
            )}
            <span>
              {isDownloadingPdf
                ? (t("clinicalReport.generatingPdf") || "Generating PDF...")
                : language === "si"
                ? (t("clinicalReport.downloadBtnSi") || "PDF වාර්තාව බාගත කරන්න")
                : (t("clinicalReport.downloadBtn") || "Download Veterinary Assessment PDF")}
            </span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs opacity-90">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{t("clinicalReport.bullet1") || "Visual image evidence (Photo, Focus area, Heatmap & Overlay)"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{t("clinicalReport.bullet2") || "Laboratory milk biomarker measurements & evaluation"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{t("clinicalReport.bullet3") || "Clinical severity staging & immediate farmer safety instructions"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          <span>{t("clinicalReport.bullet4") || "AI clinical notice & transparent decision-support disclaimers"}</span>
        </div>
      </div>
    </motion.div>
  );
}
