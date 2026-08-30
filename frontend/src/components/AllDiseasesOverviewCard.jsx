import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HeartPulse,
  ShieldAlert,
  Syringe,
  Thermometer,
  ShieldCheck,
  AlertOctagon,
  ArrowRight,
  Activity,
  Clock,
} from "lucide-react";
import { Card, Badge, Button } from "./ui/index.jsx";
import { useI18n } from "../i18n/language-context";

const DISEASE_CONFIG = {
  mastitis: {
    key: "mastitis",
    titleKey: "modules.mastitis",
    defaultTitle: "Mastitis (Udder Health)",
    icon: HeartPulse,
    color: "emerald",
    bgClass: "border-emerald-200/90 dark:border-emerald-800/70 bg-emerald-50/30 dark:bg-emerald-950/20 hover:border-emerald-500/70",
    textClass: "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40",
    badgeStable: "bg-emerald-100 text-emerald-950 border border-emerald-300 dark:bg-emerald-900/70 dark:text-emerald-200 dark:border-emerald-700/60 font-bold",
    btnClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs",
    statNormalColor: "text-emerald-600 dark:text-emerald-400 font-bold",
    route: "/detect/mastitis",
    methodKey: "dashboard.methodMastitis",
    defaultMethod: "Image CNN + 5 Biomarkers",
  },
  fmd: {
    key: "fmd",
    titleKey: "modules.fmd",
    defaultTitle: "Foot & Mouth Disease",
    icon: ShieldAlert,
    color: "orange",
    bgClass: "border-orange-200/90 dark:border-orange-800/70 bg-orange-50/30 dark:bg-orange-950/20 hover:border-orange-500/70",
    textClass: "text-orange-700 dark:text-orange-300",
    iconBg: "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/40",
    badgeStable: "bg-orange-100 text-orange-950 border border-orange-300 dark:bg-orange-900/70 dark:text-orange-200 dark:border-orange-700/60 font-bold",
    btnClass: "bg-orange-600 hover:bg-orange-700 text-white shadow-xs",
    statNormalColor: "text-orange-600 dark:text-orange-400 font-bold",
    route: "/detect/fmd",
    methodKey: "dashboard.methodFmd",
    defaultMethod: "CNN + Weather Risk",
  },
  lumpy: {
    key: "lumpy",
    titleKey: "modules.lumpy",
    defaultTitle: "Lumpy Skin Disease",
    icon: Syringe,
    color: "violet",
    bgClass: "border-violet-200/90 dark:border-violet-800/70 bg-violet-50/30 dark:bg-violet-950/20 hover:border-violet-500/70",
    textClass: "text-violet-700 dark:text-violet-300",
    iconBg: "bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40",
    badgeStable: "bg-violet-100 text-violet-950 border border-violet-300 dark:bg-violet-900/70 dark:text-violet-200 dark:border-violet-700/60 font-bold",
    btnClass: "bg-violet-600 hover:bg-violet-700 text-white shadow-xs",
    statNormalColor: "text-violet-600 dark:text-violet-400 font-bold",
    route: "/detect/lumpy",
    methodKey: "dashboard.methodLsd",
    defaultMethod: "YOLOv8s + ResNet50",
  },
  milk_fever: {
    key: "milk-fever",
    titleKey: "modules.milkFever",
    defaultTitle: "Milk Fever (Hypocalcemia)",
    icon: Thermometer,
    color: "teal",
    bgClass: "border-teal-200/90 dark:border-teal-800/70 bg-teal-50/30 dark:bg-teal-950/20 hover:border-teal-500/70",
    textClass: "text-teal-700 dark:text-teal-300",
    iconBg: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40",
    badgeStable: "bg-teal-100 text-teal-950 border border-teal-300 dark:bg-teal-900/70 dark:text-teal-200 dark:border-teal-700/60 font-bold",
    btnClass: "bg-teal-600 hover:bg-teal-700 text-white shadow-xs",
    statNormalColor: "text-teal-600 dark:text-teal-400 font-bold",
    route: "/detect/milk-fever",
    methodKey: "dashboard.methodMilkFever",
    defaultMethod: "RF + XGBoost Ensemble",
  },
};

export default function AllDiseasesOverviewCard({ allDiseasesData }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const summary = allDiseasesData?.summary || {
    total_cattle: 0,
    total_screenings_all: 0,
    urgent_cases_all: 0,
    healthy_index_pct: 100,
  };

  const diseases = allDiseasesData?.diseases || {};
  const recentActivities = allDiseasesData?.recent_activities || [];

  const urgentCount = summary.urgent_cases_all || 0;
  const healthIndex = summary.healthy_index_pct ?? 100;

  const getTranslatedStatus = (defaultStatus) => {
    if (!defaultStatus) return "";
    const lower = String(defaultStatus).toLowerCase();
    if (lower.includes("stable")) return t("dashboard.statusStableHerd") || "Stable Herd";
    if (lower.includes("contagion") || lower.includes("low")) return t("dashboard.statusLowContagion") || "Low Risk";
    if (lower.includes("clear") || lower.includes("no lesions")) return t("dashboard.statusNoLesions") || "Clear / No Lesions";
    if (lower.includes("optimal") || lower.includes("balance")) return t("dashboard.statusOptimalBalance") || "Optimal Balance";
    if (lower.includes("critical alert") || lower.includes("urgent")) return t("dashboard.statusCriticalAlert") || "Critical Alert";
    if (lower.includes("active cases") || lower.includes("active")) return t("dashboard.statusActiveCases") || "Active Cases";
    if (lower.includes("positive cases") || lower.includes("positive")) return t("dashboard.statusPositiveCases") || "Positive Cases";
    if (lower.includes("critical staging")) return t("dashboard.statusCriticalStaging") || "Critical Staging";
    return defaultStatus;
  };

  return (
    <Card className="p-5 sm:p-7 space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {t("dashboard.allDiseasesTitle") || "Herd Multi-Disease Health Overview"}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t("dashboard.allDiseasesSubtitle") || "Real-time AI diagnostic status and clinical screening across all 4 bovine conditions."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant={urgentCount > 0 ? "danger" : "success"} className="text-xs px-3 py-1 font-bold">
            {urgentCount > 0
              ? `🚨 ${urgentCount} ${t("dashboard.urgentAlerts") || "Urgent Alerts"}`
              : `✓ ${healthIndex}% ${t("dashboard.herdHealthIndex") || "Herd Health Index"}`}
          </Badge>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/modules")}
            className="gap-1.5 text-xs font-bold"
          >
            <span>{t("dashboard.detectionHub") || "Detection Hub"}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Status Alert Banner ─────────────────────────────────────────────── */}
      <div
        className={`rounded-2xl p-4 border flex items-start gap-3.5 transition-all ${
          urgentCount > 0
            ? "border-red-300 dark:border-red-800 bg-red-50/80 dark:bg-red-950/40 text-red-900 dark:text-red-200"
            : "border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
        }`}
      >
        {urgentCount > 0 ? (
          <AlertOctagon className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5 animate-pulse" />
        ) : (
          <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <h4 className="text-sm font-bold">
            {urgentCount > 0
              ? `${urgentCount} ${t("dashboard.urgentBannerMsg") || "cattle require urgent veterinary review or treatment."}`
              : (t("dashboard.allStableMsg") || "✓ All disease surveillance indicators are within stable parameters.")}
          </h4>
          <p className="text-xs opacity-90 leading-relaxed">
            {urgentCount > 0
              ? (t("dashboard.urgentBannerSub") || "Review the priority cases below and coordinate with your local veterinary surgeon immediately.")
              : (t("dashboard.allStableSub") || "Routine biosecurity, post-milking teat dip, and pre-calving dietary management are recommended.")}
          </p>
        </div>
      </div>

      {/* ── 4 Disease Diagnostic Cards Grid (Matching AI Detection Hub) ─────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Mastitis */}
        {(() => {
          const cfg = DISEASE_CONFIG.mastitis;
          const data = diseases.mastitis || {};
          const bd = data.breakdown || {};
          const isUrgent = (data.critical_count || 0) > 0;
          return (
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-all ${cfg.bgClass}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-11 w-11 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <cfg.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${isUrgent ? "bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/80 dark:text-red-200 dark:border-red-800 font-bold" : cfg.badgeStable}`}>
                    {getTranslatedStatus(data.status) || (t("dashboard.statusStableHerd") || "Stable Herd")}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {t(cfg.titleKey) || cfg.defaultTitle}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {t(cfg.methodKey) || cfg.defaultMethod}
                </p>

                <div className="mt-3.5 space-y-1.5 text-xs bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.totalChecks") || "Total Screenings"}:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{data.total_checks || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.normalCows") || "Healthy / Normal"}:</span>
                    <span className={cfg.statNormalColor}>{bd.normal || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.urgentCases") || "Severe Cases"}:</span>
                    <span className={isUrgent ? "text-red-600 dark:text-red-400 font-bold" : "text-slate-500"}>
                      {data.critical_count || 0}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(cfg.route)}
                className="w-full text-xs font-bold gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs"
              >
                <span>{t("modules.fastCheck") || t("modules.startDetection") || "Start Check"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          );
        })()}

        {/* 2. Foot and Mouth Disease */}
        {(() => {
          const cfg = DISEASE_CONFIG.fmd;
          const data = diseases.fmd || {};
          const bd = data.breakdown || {};
          const isUrgent = (data.positive_count || 0) > 0;
          return (
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-all ${cfg.bgClass}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-11 w-11 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <cfg.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${isUrgent ? "bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/80 dark:text-red-200 dark:border-red-800 font-bold" : cfg.badgeStable}`}>
                    {getTranslatedStatus(data.status) || (t("dashboard.statusLowContagion") || "Low Risk")}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {t(cfg.titleKey) || cfg.defaultTitle}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {t(cfg.methodKey) || cfg.defaultMethod}
                </p>

                <div className="mt-3.5 space-y-1.5 text-xs bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.totalChecks") || "Total Screenings"}:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{data.total_checks || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.negative") || "Negative / Clear"}:</span>
                    <span className={cfg.statNormalColor}>{bd.healthy || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.confirmedCases") || "Positive Cases"}:</span>
                    <span className={isUrgent ? "text-red-600 dark:text-red-400 font-bold" : "text-slate-500"}>
                      {data.positive_count || 0}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(cfg.route)}
                className="w-full text-xs font-bold gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs"
              >
                <span>{t("modules.fastCheck") || t("modules.startDetection") || "Start Check"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          );
        })()}

        {/* 3. Lumpy Skin Disease */}
        {(() => {
          const cfg = DISEASE_CONFIG.lumpy;
          const data = diseases.lumpy || {};
          const bd = data.breakdown || {};
          const isUrgent = (data.positive_count || 0) > 0;
          return (
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-all ${cfg.bgClass}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-11 w-11 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <cfg.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${isUrgent ? "bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/80 dark:text-red-200 dark:border-red-800 font-bold" : cfg.badgeStable}`}>
                    {getTranslatedStatus(data.status) || (t("dashboard.statusNoLesions") || "Clear")}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {t(cfg.titleKey) || cfg.defaultTitle}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {t(cfg.methodKey) || cfg.defaultMethod}
                </p>

                <div className="mt-3.5 space-y-1.5 text-xs bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.totalChecks") || "Total Screenings"}:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{data.total_checks || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.noLesions") || "No Nodules"}:</span>
                    <span className={cfg.statNormalColor}>{bd.healthy || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.nodulesDetected") || "LSD Positive"}:</span>
                    <span className={isUrgent ? "text-red-600 dark:text-red-400 font-bold" : "text-slate-500"}>
                      {data.positive_count || 0}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(cfg.route)}
                className="w-full text-xs font-bold gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs"
              >
                <span>{t("modules.fastCheck") || t("modules.startDetection") || "Start Check"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          );
        })()}

        {/* 4. Milk Fever */}
        {(() => {
          const cfg = DISEASE_CONFIG.milk_fever;
          const data = diseases.milk_fever || {};
          const bd = data.breakdown || {};
          const isUrgent = (data.critical_count || 0) > 0;
          return (
            <motion.div
              whileHover={{ y: -4 }}
              transition={{ duration: 0.2 }}
              className={`rounded-2xl border p-4 sm:p-5 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-all ${cfg.bgClass}`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`h-11 w-11 rounded-xl ${cfg.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                    <cfg.icon className="h-5 w-5" />
                  </div>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full ${isUrgent ? "bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/80 dark:text-red-200 dark:border-red-800 font-bold" : cfg.badgeStable}`}>
                    {getTranslatedStatus(data.status) || (t("dashboard.statusOptimalBalance") || "Optimal")}
                  </span>
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {t(cfg.titleKey) || cfg.defaultTitle}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 font-mono">
                  {t(cfg.methodKey) || cfg.defaultMethod}
                </p>

                <div className="mt-3.5 space-y-1.5 text-xs bg-white/70 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/80">
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.totalChecks") || "Total Screenings"}:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{data.total_checks || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.subclinicalMild") || "Subclinical / Mild"}:</span>
                    <span className={cfg.statNormalColor}>{(bd.subclinical || 0) + (bd.mild || 0)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600 dark:text-slate-300">
                    <span>{t("dashboard.criticalStaging") || "Moderate / Critical"}:</span>
                    <span className={isUrgent ? "text-red-600 dark:text-red-400 font-bold" : "text-slate-500"}>
                      {(bd.moderate || 0) + (bd.critical || 0)}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(cfg.route)}
                className="w-full text-xs font-bold gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 shadow-2xs"
              >
                <span>{t("modules.fastCheck") || t("modules.startDetection") || "Start Check"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </motion.div>
          );
        })()}
      </div>

      {/* ── Recent Multi-Disease Diagnostic Logs Feed ───────────────────────── */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-400" />
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t("dashboard.recentDiseaseChecks") || "Recent Multi-Disease Diagnostic Logs"}
            </h4>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {recentActivities.length} {t("dashboard.records") || "Records"}
          </span>
        </div>

        {recentActivities.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Activity className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("dashboard.noRecentChecks") || "No disease checks logged yet. Tap 'Run Check' on any disease module above to start."}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {recentActivities.map((act) => {
              const badgeColors = {
                emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
                orange: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
                purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
                teal: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800",
              };

              const modTitleKey = `modules.${act.module_key === "milk-fever" ? "milkFever" : act.module_key}`;
              const displayModuleName = t(modTitleKey) || act.module_name;

              return (
                <div
                  key={act.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 gap-2 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md border shrink-0 ${badgeColors[act.badge_color] || badgeColors.emerald}`}>
                      {displayModuleName}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                        {act.cow_name} {act.cow_tag && <span className="text-slate-400 font-normal">({act.cow_tag})</span>}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {act.date}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {act.confidence !== null && (
                      <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                        {act.confidence}% {t("dashboard.conf") || "Conf."}
                      </span>
                    )}
                    <Badge variant={act.status_color || "default"} className="text-[11px] font-bold">
                      {act.result}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
