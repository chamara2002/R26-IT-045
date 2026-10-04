import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CloudSun } from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import FMDWeatherDashboardComponent from "../components/FMDWeatherDashboard";
import { useI18n } from "../i18n/language-context";

export default function FMDWeatherDashboardPage() {
  const { t } = useI18n();

  return (
    <PageWrapper className="max-w-4xl mx-auto space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/detect/fmd"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t("modules.backToFMD") || "Back to FMD Diagnostic Check"}</span>
        </Link>
        <div className="flex items-center gap-1.5 text-xs font-bold text-orange-600 dark:text-orange-400">
          <CloudSun className="h-4 w-4" />
          <span>FMD Weather & Airborne Risk Hub</span>
        </div>
      </div>

      {/* Full Weather Dashboard Component */}
      <FMDWeatherDashboardComponent />
    </PageWrapper>
  );
}
