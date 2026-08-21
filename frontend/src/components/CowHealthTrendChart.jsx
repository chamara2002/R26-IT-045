import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
  Info,
} from "lucide-react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Badge, Card } from "./ui/index.jsx";
import { useI18n } from "../i18n/language-context";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function CowHealthTrendChart({ healthTrend, cowName }) {
  const { t } = useI18n();

  const isDarkMode = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  const timeline = healthTrend?.timeline || [];
  const hasData = healthTrend?.has_data && timeline.length > 0;

  const chartData = useMemo(() => {
    if (!hasData) return null;

    const labels = timeline.map((item) => item.display_date || item.date);
    const dataPoints = timeline.map((item) => item.severity_code);

    // Determine primary line color based on trend direction
    let lineColor = "#10b981"; // green
    let bgColor = "rgba(16, 185, 129, 0.15)";

    if (healthTrend?.trend_direction === "rapidly_worsening" || healthTrend?.current_severity_code === 3) {
      lineColor = "#ef4444";
      bgColor = "rgba(239, 68, 68, 0.15)";
    } else if (healthTrend?.trend_direction === "worsening" || healthTrend?.current_severity_code === 2) {
      lineColor = "#f97316";
      bgColor = "rgba(249, 115, 22, 0.15)";
    } else if (healthTrend?.current_severity_code === 1) {
      lineColor = "#eab308";
      bgColor = "rgba(234, 179, 8, 0.15)";
    }

    return {
      labels,
      datasets: [
        {
          label: t("healthTrend.severityLevel") || "Severity Level",
          data: dataPoints,
          borderColor: lineColor,
          backgroundColor: bgColor,
          borderWidth: 3,
          pointBackgroundColor: dataPoints.map((code) => {
            if (code === 3) return "#ef4444";
            if (code === 2) return "#f97316";
            if (code === 1) return "#eab308";
            return "#10b981";
          }),
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 6,
          pointHoverRadius: 8,
          tension: 0.3,
          fill: true,
        },
      ],
    };
  }, [timeline, hasData, healthTrend, t]);

  const chartOptions = useMemo(() => {
    const textColor = isDarkMode ? "#cbd5e1" : "#475569";
    const gridColor = isDarkMode ? "#1e293b" : "#f1f5f9";

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
          titleColor: isDarkMode ? "#f8fafc" : "#0f172a",
          bodyColor: isDarkMode ? "#cbd5e1" : "#334155",
          borderColor: isDarkMode ? "#334155" : "#e2e8f0",
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (context) => {
              const code = context.parsed.y;
              const labels = [
                t("healthTrend.normal") || "Normal (0)",
                t("healthTrend.mild") || "Mild Mastitis (1)",
                t("healthTrend.moderate") || "Moderate Mastitis (2)",
                t("healthTrend.severe") || "Severe Mastitis (3)",
              ];
              return ` ${labels[code] || "Severity: " + code}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 11, weight: "500" } },
        },
        y: {
          min: 0,
          max: 3,
          ticks: {
            stepSize: 1,
            color: textColor,
            font: { size: 11, weight: "600" },
            callback: (value) => {
              switch (value) {
                case 0:
                  return `🟢 ${t("healthTrend.normal") || "Normal"}`;
                case 1:
                  return `🟡 ${t("healthTrend.mild") || "Mild"}`;
                case 2:
                  return `🟠 ${t("healthTrend.moderate") || "Moderate"}`;
                case 3:
                  return `🔴 ${t("healthTrend.severe") || "Severe"}`;
                default:
                  return value;
              }
            },
          },
          grid: { color: gridColor },
        },
      },
    };
  }, [isDarkMode, t]);

  const trendBadge = useMemo(() => {
    const dir = healthTrend?.trend_direction;
    if (dir === "rapidly_worsening") {
      return {
        variant: "danger",
        icon: TrendingUp,
        label: t("healthTrend.rapidlyWorsening") || "Rapidly Worsening",
        bg: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border-red-300 dark:border-red-800",
      };
    }
    if (dir === "worsening") {
      return {
        variant: "warning",
        icon: TrendingUp,
        label: t("healthTrend.worsening") || "Worsening Trend",
        bg: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300 dark:border-orange-800",
      };
    }
    if (dir === "improving") {
      return {
        variant: "success",
        icon: TrendingDown,
        label: t("healthTrend.improving") || "Improving Trend",
        bg: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800",
      };
    }
    if (dir === "stable") {
      return {
        variant: "default",
        icon: Activity,
        label: t("healthTrend.stable") || "Stable Condition",
        bg: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700",
      };
    }
    return {
      variant: "default",
      icon: Info,
      label: t("healthTrend.insufficientData") || "Insufficient Data",
      bg: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    };
  }, [healthTrend, t]);

  const TrendIcon = trendBadge.icon;

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-teal-100 dark:bg-teal-950/60 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold">
              <Activity className="h-4 w-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t("healthTrend.title") || "Cow Longitudinal Health Trend"}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("healthTrend.subtitle") || `Historical mastitis screening trajectory for ${cowName || "this cow"} based on saved assessments.`}
          </p>
        </div>

        <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold ${trendBadge.bg}`}>
          <TrendIcon className="h-4 w-4" />
          <span>{trendBadge.label}</span>
        </div>
      </div>

      {/* Summary Stat Tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t("healthTrend.totalChecks") || "Total Assessments"}</p>
          <p className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">{healthTrend?.total_assessments || 0}</p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t("healthTrend.currentSeverity") || "Current Status"}</p>
          <p className="text-sm sm:text-base font-bold text-slate-900 dark:text-white truncate">
            {healthTrend?.current_severity || (t("common.notAvailable") || "N/A")}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t("healthTrend.latestCheck") || "Latest Check"}</p>
          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            {healthTrend?.latest_assessment_date || (t("common.notAvailable") || "N/A")}
          </p>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 dark:border-slate-700/60 space-y-1">
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t("healthTrend.firstCheck") || "First Recorded"}</p>
          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            {healthTrend?.first_assessment_date || (t("common.notAvailable") || "N/A")}
          </p>
        </div>
      </div>

      {/* Recovery Trajectory Highlight (if recovering from prior elevated severity) */}
      {healthTrend?.recovery_trajectory?.is_recovering && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-start gap-3"
        >
          <Sparkles className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-emerald-950 dark:text-emerald-200">
              {t("healthTrend.recoveryTitle") || "Positive Recovery Trajectory Detected"}
            </h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">
              {healthTrend.recovery_trajectory.message}
            </p>
          </div>
        </motion.div>
      )}

      {/* Timeline Chart */}
      <div className="h-64 sm:h-72 w-full rounded-2xl bg-slate-50/70 dark:bg-slate-900/50 p-3 sm:p-4 border border-slate-200/60 dark:border-slate-800">
        {!hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4">
            <Info className="h-8 w-8 text-slate-400 mb-2" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("healthTrend.noChartData") || "No longitudinal trend data available yet"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              {t("healthTrend.noChartDataDesc") || "Run and save mastitis screenings over time to visualize health progression and early anomaly warnings."}
            </p>
          </div>
        ) : (
          <Line data={chartData} options={chartOptions} />
        )}
      </div>

      {/* Legend & Medical Safety Notice */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 text-[11px] text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <span>{t("healthTrend.scaleGuide") || "Severity Scale:"}</span>
          <span className="inline-flex items-center gap-1 font-medium text-emerald-600 dark:text-emerald-400">0: {t("healthTrend.normal") || "Normal"}</span>
          <span className="inline-flex items-center gap-1 font-medium text-yellow-600 dark:text-yellow-400">1: {t("healthTrend.mild") || "Mild"}</span>
          <span className="inline-flex items-center gap-1 font-medium text-orange-600 dark:text-orange-400">2: {t("healthTrend.moderate") || "Moderate"}</span>
          <span className="inline-flex items-center gap-1 font-medium text-red-600 dark:text-red-400">3: {t("healthTrend.severe") || "Severe"}</span>
        </div>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">
          {t("healthTrend.disclaimer") || "* Numeric values are visualization labels only and do not constitute independent medical diagnoses."}
        </span>
      </div>
    </Card>
  );
}
