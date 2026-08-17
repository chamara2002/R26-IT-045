import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  AlertOctagon,
  ChevronRight,
  TrendingUp,
  Clock,
  Calendar,
  Layers,
  Sparkles,
  HeartPulse,
} from "lucide-react";
import { Badge, Button, Card } from "./ui/index.jsx";
import { useI18n } from "../i18n/language-context";

export default function HerdHealthOverviewCard({ herdOverview }) {
  const { t } = useI18n();
  const navigate = useNavigate();

  const totalCattle = herdOverview?.total_cattle || 0;
  const breakdown = herdOverview?.breakdown || {
    normal: 0,
    mild: 0,
    moderate: 0,
    severe: 0,
    not_assessed: 0,
  };
  const criticalCount = herdOverview?.critical_count || 0;
  const priorityList = herdOverview?.priority_list || [];
  const recent7d = herdOverview?.recent_7d || { normal: 0, mild: 0, moderate: 0, severe: 0, total: 0 };
  const recent30d = herdOverview?.recent_30d || { normal: 0, mild: 0, moderate: 0, severe: 0, total: 0 };

  // Seasonal awareness alert check (July 1 - Sept 30)
  const isSeasonalAlertActive = useMemo(() => {
    const today = new Date();
    const month = today.getMonth() + 1; // 1-indexed (July = 7, Aug = 8, Sept = 9)
    return month >= 7 && month <= 9;
  }, []);

  return (
    <Card className="p-5 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold">
              <HeartPulse className="h-4 w-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t("herdOverview.title") || "Herd Mastitis Health Overview"}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("herdOverview.subtitle") || "Real-time clinical screening distribution across your registered herd based on latest saved assessments."}
          </p>
        </div>

        <Badge variant={criticalCount > 0 ? "danger" : "success"}>
          {criticalCount > 0 ? `🚨 ${criticalCount} ${t("herdOverview.urgentCases") || "Urgent Cases"}` : `✓ ${t("herdOverview.allGood") || "Herd Stable"}`}
        </Badge>
      </div>

      {/* Herd Status Banner */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border flex items-start gap-3.5 transition-all ${
          criticalCount > 0
            ? "border-red-300 dark:border-red-800 bg-red-50/80 dark:bg-red-950/40 text-red-900 dark:text-red-200"
            : "border-emerald-200 dark:border-emerald-800 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200"
        }`}
      >
        {criticalCount > 0 ? (
          <AlertOctagon className="h-6 w-6 text-red-600 dark:text-red-400 shrink-0 mt-0.5 animate-pulse" />
        ) : (
          <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <h4 className="text-sm font-bold">
            {criticalCount > 0
              ? `${criticalCount} ${criticalCount === 1 ? (t("herdOverview.cowRequiresAttention") || "cow requires urgent veterinary attention") : (t("herdOverview.cowsRequireAttention") || "cows require urgent veterinary attention")}`
              : (t("herdOverview.noCriticalMsg") || "✓ No cows currently require urgent veterinary attention based on saved CattleSense assessments.")}
          </h4>
          <p className="text-xs opacity-90 leading-relaxed">
            {criticalCount > 0
              ? (t("herdOverview.criticalNotice") || "Follow up promptly with your local veterinary surgeon or DAPH veterinary officer.")
              : (t("herdOverview.routineNotice") || "Maintain standard post-milking teat disinfection and regular diagnostic screening.")}
          </p>
        </div>
      </div>

      {/* 5-Card Herd Breakdown Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Total Cattle */}
        <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/80 space-y-1">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t("herdOverview.totalCattle") || "Total Cattle"}
          </p>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalCattle}</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{t("herdOverview.registeredHerd") || "Registered herd"}</p>
        </div>

        {/* Normal */}
        <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/40 space-y-1">
          <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
            <span>🟢</span> {t("healthTrend.normal") || "Normal"}
          </p>
          <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-200">{breakdown.normal}</p>
          <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80">{t("herdOverview.healthy") || "No mastitis detected"}</p>
        </div>

        {/* Mild */}
        <div className="p-3.5 rounded-2xl bg-yellow-50/60 dark:bg-yellow-950/20 border border-yellow-200/80 dark:border-yellow-900/40 space-y-1">
          <p className="text-[11px] font-semibold text-yellow-700 dark:text-yellow-400 uppercase tracking-wider flex items-center gap-1">
            <span>🟡</span> {t("healthTrend.mild") || "Mild"}
          </p>
          <p className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">{breakdown.mild}</p>
          <p className="text-[10px] text-yellow-700/80 dark:text-yellow-400/80">{t("herdOverview.monitorEarly") || "Early monitoring"}</p>
        </div>

        {/* Moderate */}
        <div className="p-3.5 rounded-2xl bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900/40 space-y-1">
          <p className="text-[11px] font-semibold text-orange-700 dark:text-orange-400 uppercase tracking-wider flex items-center gap-1">
            <span>🟠</span> {t("healthTrend.moderate") || "Moderate"}
          </p>
          <p className="text-2xl font-bold text-orange-900 dark:text-orange-200">{breakdown.moderate}</p>
          <p className="text-[10px] text-orange-700/80 dark:text-orange-400/80">{t("herdOverview.closeCare") || "Close care advised"}</p>
        </div>

        {/* Severe / Critical */}
        <div className="p-3.5 rounded-2xl bg-red-50/60 dark:bg-red-950/20 border border-red-200/80 dark:border-red-900/40 space-y-1 col-span-2 sm:col-span-1">
          <p className="text-[11px] font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider flex items-center gap-1">
            <span>🔴</span> {t("healthTrend.severe") || "Severe"}
          </p>
          <p className="text-2xl font-bold text-red-900 dark:text-red-200">{breakdown.severe}</p>
          <p className="text-[10px] text-red-700/80 dark:text-red-400/80">{t("herdOverview.vetAttention") || "Veterinary required"}</p>
        </div>
      </div>

      {/* ── Priority List: Cows Requiring Immediate Attention ────────────────── */}
      {priorityList.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-red-700 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-4 w-4" />
              <span>{t("herdOverview.priorityTitle") || "Veterinary Attention Priority List"}</span>
            </h4>
            <span className="text-[11px] text-slate-500">
              {priorityList.length} {t("herdOverview.cowsFlagged") || "flagged animal(s)"}
            </span>
          </div>

          <div className="space-y-2.5">
            {priorityList.map((cow) => (
              <div
                key={cow.cow_id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/40 dark:bg-red-950/20 gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 font-bold flex items-center justify-center text-sm shrink-0">
                    🚨
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      {cow.name} <span className="text-slate-500 dark:text-slate-400 font-medium">({cow.tag_id})</span>
                    </h5>
                    <p className="text-[11px] text-red-700 dark:text-red-300 font-semibold mt-0.5">
                      {cow.severity} • {cow.assessment_date}
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => navigate(`/cows/${cow.cow_id}/records`)}
                  className="self-end sm:self-auto text-xs font-bold gap-1 shadow-xs"
                >
                  <span>{t("herdOverview.viewCow") || "View Cow"}</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Herd Activity Trend (7 Days & 30 Days) ───────────────────── */}
      <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <Activity className="h-4 w-4 text-teal-600" />
          <span>{t("herdOverview.recentActivityTitle") || "Recent Herd Assessment Activity"}</span>
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Last 7 Days */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-teal-600" />
                {t("herdOverview.last7Days") || "Last 7 Days"}
              </span>
              <Badge variant="info">{recent7d.total} {t("herdOverview.checks") || "Checks"}</Badge>
            </div>
            {recent7d.total === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                {t("herdOverview.noActivity7d") || "No screening activity recorded in the past 7 days."}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <p className="text-[10px] text-slate-500">🟢 Normal</p>
                  <p className="font-bold text-slate-900 dark:text-white">{recent7d.normal}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">🟡 Mild</p>
                  <p className="font-bold text-yellow-600 dark:text-yellow-400">{recent7d.mild}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">🟠 Moderate</p>
                  <p className="font-bold text-orange-600 dark:text-orange-400">{recent7d.moderate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">🔴 Severe</p>
                  <p className="font-bold text-red-600 dark:text-red-400">{recent7d.severe}</p>
                </div>
              </div>
            )}
          </div>

          {/* Last 30 Days */}
          <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-200/60 dark:border-slate-700/60">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                {t("herdOverview.last30Days") || "Last 30 Days"}
              </span>
              <Badge variant="default">{recent30d.total} {t("herdOverview.checks") || "Checks"}</Badge>
            </div>
            {recent30d.total === 0 ? (
              <p className="text-xs text-slate-400 dark:text-slate-500 italic py-1">
                {t("herdOverview.noActivity30d") || "No screening activity recorded in the past 30 days."}
              </p>
            ) : (
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <p className="text-[10px] text-slate-500">🟢 Normal</p>
                  <p className="font-bold text-slate-900 dark:text-white">{recent30d.normal}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">🟡 Mild</p>
                  <p className="font-bold text-yellow-600 dark:text-yellow-400">{recent30d.mild}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">🟠 Moderate</p>
                  <p className="font-bold text-orange-600 dark:text-orange-400">{recent30d.moderate}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">🔴 Severe</p>
                  <p className="font-bold text-red-600 dark:text-red-400">{recent30d.severe}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Seasonal Alert Banner (Informational Only: July 1 - Sept 30) */}
      {isSeasonalAlertActive && (
        <div className="rounded-2xl p-4 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-amber-950 dark:text-amber-200">
              {t("herdOverview.seasonalTitle") || "Seasonal Mastitis Awareness Alert (July–September)"}
            </h4>
            <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
              {t("herdOverview.seasonalDesc") || "High monsoon humidity increases bacterial proliferation in cattle stalls. Maintain strict parlor hygiene, clean bedding, and frequent diagnostic checks."}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
