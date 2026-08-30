import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Droplets,
  Activity,
  HeartPulse,
  CalendarDays,
  FileDown,
  Loader2,
  FileText,
  Stethoscope,
  ShieldAlert,
  Syringe,
  Thermometer,
  Sparkles,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Alert, Badge, Button, Card, EmptyState, Skeleton } from "../components/ui/index.jsx";
import { useToast } from "../hooks/useToast";
import { useI18n } from "../i18n/language-context";
import {
  getCowRecords,
  downloadLSDReportPdf,
  getCowHealthTrend,
  getCowAssessmentComparison,
  getCowVeterinaryFollowUps,
} from "../services/api";
import CowHealthTrendChart from "../components/CowHealthTrendChart.jsx";
import AssessmentComparisonCard from "../components/AssessmentComparisonCard.jsx";
import RiskTrendAlert from "../components/RiskTrendAlert.jsx";
import VeterinaryFollowUpTracker from "../components/VeterinaryFollowUpTracker.jsx";
import AssessmentDetailsModal from "../components/AssessmentDetailsModal.jsx";

const formatCheckName = (name, t) => {
  if (!name) return t?.("records.healthChecks") || "Health Check";
  const clean = String(name).replace(/-module$/i, "").toLowerCase();
  if (clean === "mastitis") return t?.("modules.mastitis") || "Mastitis Check";
  if (clean === "fmd") return t?.("modules.fmd") || "Foot & Mouth Check";
  if (clean === "lumpy") return t?.("modules.lumpy") || "Lumpy Skin Check";
  if (clean === "milk-fever" || clean === "milk_fever") return t?.("modules.milkFever") || "Milk Fever Check";
  return clean.charAt(0).toUpperCase() + clean.slice(1) + " Check";
};

const isLumpyLog = (moduleName) => String(moduleName || "").toLowerCase().replace(/-module$/i, "") === "lumpy";

// Mirrors lumpy-module/config.py's risk_guidance() — historical records only
// retain the final result/confidence, not the full breakdown, so the risk
// level and guidance text are re-derived from the same thresholds here.
const deriveLSDRisk = (confidence) => {
  const probability = Number(confidence) || 0;
  if (probability < 0.3) {
    return { risk_level: "LOW RISK", recommendation: "Continue monitoring. Maintain regular health checks." };
  }
  if (probability < 0.7) {
    return { risk_level: "MODERATE RISK", recommendation: "Isolate the animal and monitor closely. Consider consulting a veterinarian." };
  }
  return { risk_level: "HIGH RISK", recommendation: "Immediate veterinary consultation strongly advised. Isolate the animal from the herd." };
};

export default function CowRecordsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { cowId } = useParams();
  const { showError } = useToast();

  const [data, setData] = useState(null);
  const [healthTrend, setHealthTrend] = useState(null);
  const [riskEvaluation, setRiskEvaluation] = useState(null);
  const [comparisonData, setComparisonData] = useState(null);
  const [followUps, setFollowUps] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [downloadingLogId, setDownloadingLogId] = useState(null);
  const [selectedAssessment, setSelectedAssessment] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDownloadLSDReport = async (log) => {
    setDownloadingLogId(log.id);
    try {
      const fallback = deriveLSDRisk(log.confidence);
      const sessionData = log.session_data || {};
      const response = await downloadLSDReportPdf({
        prediction: log.result,
        confidence: log.confidence,
        risk_level: sessionData.risk_level || fallback.risk_level,
        recommendation: sessionData.recommendation || fallback.recommendation,
        annotated_image: sessionData.annotated_image,
        detected_at: log.created_at,
        cow_name: data?.cow?.name,
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lsd-report-${log.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      showError(err.message || "Could not generate the PDF report");
    } finally {
      setDownloadingLogId(null);
    }
  };

  const loadAllCowData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [recordsRes, trendRes, compRes, followUpsRes] = await Promise.allSettled([
        getCowRecords(cowId),
        getCowHealthTrend(cowId),
        getCowAssessmentComparison(cowId),
        getCowVeterinaryFollowUps(cowId),
      ]);

      if (recordsRes.status === "fulfilled") {
        setData(recordsRes.value);
      } else {
        throw new Error(recordsRes.reason?.message || "Failed to load cow records");
      }

      if (trendRes.status === "fulfilled") {
        setHealthTrend(trendRes.value.health_trend);
        setRiskEvaluation(trendRes.value.risk_evaluation);
      }

      if (compRes.status === "fulfilled") {
        setComparisonData(compRes.value);
      }

      if (followUpsRes.status === "fulfilled") {
        setFollowUps(followUpsRes.value.follow_ups || []);
      }
    } catch (err) {
      const message = err.message || "Failed to load cow records";
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  }, [cowId, showError]);

  useEffect(() => {
    loadAllCowData();
  }, [loadAllCowData]);

  const milkLogs = data?.milk_yield || [];
  const healthLogs = data?.detection_logs || [];
  const mastitisAssessments = data?.mastitis_assessments || [];

  const [selectedDiseaseTab, setSelectedDiseaseTab] = useState("all");

  const allDiseaseRecords = useMemo(() => {
    const list = [];

    // 1. Mastitis Assessments
    mastitisAssessments.forEach((a) => {
      const rawStage = String(a.stage || a.prediction || "").toLowerCase();
      const isSevere = rawStage.includes("severe") || rawStage.includes("critical");
      const isModerate = !isSevere && rawStage.includes("moderate");
      const isMild = !isSevere && !isModerate && rawStage.includes("mild");
      const isNormal = rawStage.includes("no mastitis") || rawStage.includes("normal") || rawStage.includes("negative");

      let title = a.stage || a.prediction || "Mastitis Assessment";
      if (isNormal) title = t("records.noMastitis") || "No Mastitis";
      else if (isMild) title = t("healthTrend.mild") || "Mild Mastitis";
      else if (isModerate) title = t("healthTrend.moderate") || "Moderate Mastitis";
      else if (isSevere) title = t("healthTrend.severe") || "Severe Mastitis";

      let statusDisplay = a.prediction || (isNormal ? "Normal" : "Detected");
      if (isNormal) statusDisplay = t("records.normalStatus") || "Normal / Healthy";

      list.push({
        id: `mastitis-${a.id}`,
        diseaseKey: "mastitis",
        diseaseName: t("modules.mastitis") || "Mastitis (Udder Infection)",
        shortName: "Mastitis",
        icon: HeartPulse,
        colorTheme: "emerald",
        datetime: a.assessment_datetime || a.created_at,
        title,
        statusDisplay,
        confidence: a.confidence,
        is_borderline: a.is_borderline,
        isSevere,
        isModerate,
        isMild,
        isNormal,
        tags: [
          a.model_2_used && { label: "Multimodal", variant: "info" },
          a.roi_applied && { label: "ROI", variant: "default" },
        ].filter(Boolean),
        actionType: "modal",
        rawData: a,
      });
    });

    // 2. Detection Logs (FMD, LSD, Milk Fever)
    healthLogs.forEach((log) => {
      const mod = String(log.module_name || "").toLowerCase().replace(/-module$/i, "");
      const res = String(log.result || "").toLowerCase();

      let diseaseKey = "fmd";
      let diseaseName = t("modules.fmd") || "Foot-and-Mouth (FMD)";
      let shortName = "FMD";
      let icon = ShieldAlert;
      let colorTheme = "orange";
      let tags = [];
      let actionType = null;

      if (mod.includes("fmd")) {
        diseaseKey = "fmd";
        diseaseName = t("modules.fmd") || "Foot-and-Mouth Disease (FMD)";
        shortName = "FMD";
        icon = ShieldAlert;
        colorTheme = "orange";
        tags = [{ label: "Weather Risk AI", variant: "warning" }];
      } else if (mod.includes("lump") || mod.includes("lsd")) {
        diseaseKey = "lumpy";
        diseaseName = t("modules.lumpy") || "Lumpy Skin Disease (LSD)";
        shortName = "LSD";
        icon = Syringe;
        colorTheme = "violet";
        tags = [{ label: "Nodule AI", variant: "default" }];
        actionType = "download_lsd";
      } else if (mod.includes("milk")) {
        diseaseKey = "milk-fever";
        diseaseName = t("modules.milkFever") || "Milk Fever (Hypocalcaemia)";
        shortName = "Milk Fever";
        icon = Thermometer;
        colorTheme = "teal";
        tags = [{ label: "Non-Invasive ML", variant: "info" }];
      } else {
        diseaseKey = "general";
        diseaseName = formatCheckName(log.module_name);
        shortName = diseaseName;
        icon = Activity;
        colorTheme = "emerald";
      }

      const isSevere = res.includes("severe") || res.includes("critical") || res.includes("stage 2") || res.includes("stage 3") || res.includes("positive") || res.includes("high risk");
      const isModerate = !isSevere && (res.includes("moderate") || res.includes("stage 1") || res.includes("medium"));
      const isMild = !isSevere && !isModerate && (res.includes("mild") || res.includes("low risk") || res.includes("suspected"));
      const isNormal = res.includes("normal") || res.includes("negative") || res.includes("healthy") || res.includes("no disease") || res.includes("unaffected");

      let statusDisplay = log.result || (isNormal ? "Normal" : "Detected");
      if (isNormal) statusDisplay = t("records.normalStatus") || "Normal / Healthy";

      list.push({
        id: `log-${log.id}`,
        diseaseKey,
        diseaseName,
        shortName,
        icon,
        colorTheme,
        datetime: log.created_at,
        title: log.result,
        statusDisplay,
        confidence: log.confidence,
        is_borderline: false,
        isSevere,
        isModerate,
        isMild,
        isNormal,
        tags,
        actionType,
        rawData: log,
      });
    });

    return list.sort((a, b) => new Date(b.datetime) - new Date(a.datetime));
  }, [mastitisAssessments, healthLogs, t]);

  const filteredDiseaseRecords = useMemo(() => {
    if (selectedDiseaseTab === "all") return allDiseaseRecords;
    return allDiseaseRecords.filter((r) => r.diseaseKey === selectedDiseaseTab);
  }, [allDiseaseRecords, selectedDiseaseTab]);

  const tabCounts = useMemo(() => ({
    all: allDiseaseRecords.length,
    mastitis: allDiseaseRecords.filter((r) => r.diseaseKey === "mastitis").length,
    fmd: allDiseaseRecords.filter((r) => r.diseaseKey === "fmd").length,
    lumpy: allDiseaseRecords.filter((r) => r.diseaseKey === "lumpy").length,
    "milk-fever": allDiseaseRecords.filter((r) => r.diseaseKey === "milk-fever").length,
  }), [allDiseaseRecords]);

  const getDiseaseTabEmptyState = () => {
    switch (selectedDiseaseTab) {
      case "mastitis":
        return {
          icon: HeartPulse,
          title: "No Mastitis assessments yet",
          desc: "Run a Mastitis screening with udder photography and milk sensor data to record diagnostic history.",
          actionLabel: "Run Mastitis Check",
          link: `/detect/mastitis?cowId=${cowId}`,
        };
      case "fmd":
        return {
          icon: ShieldAlert,
          title: "No Foot-and-Mouth (FMD) checks yet",
          desc: "Run an FMD diagnostic screening with mouth/hoof lesions and microclimate weather risk analysis.",
          actionLabel: "Run FMD Check",
          link: `/detect/fmd?cowId=${cowId}`,
        };
      case "lumpy":
        return {
          icon: Syringe,
          title: "No Lumpy Skin (LSD) checks yet",
          desc: "Run an LSD screening with skin nodule detection and clinical symptom staging.",
          actionLabel: "Run LSD Check",
          link: `/detect/lsd?cowId=${cowId}`,
        };
      case "milk-fever":
        return {
          icon: Thermometer,
          title: "No Milk Fever checks yet",
          desc: "Run a non-invasive post-calving hypocalcaemia risk analysis for this cow.",
          actionLabel: "Run Milk Fever Check",
          link: `/detect/milk-fever?cowId=${cowId}`,
        };
      default:
        return {
          icon: Stethoscope,
          title: t("records.noHealthChecks") || "No disease checks yet",
          desc: t("records.noHealthChecksDesc") || "Run a disease check on this cow to keep its health history complete.",
          actionLabel: t("modules.startDetection") || "Run Disease Check",
          link: `/modules?cowId=${cowId}`,
        };
    }
  };

  const emptyStateInfo = getDiseaseTabEmptyState();

  const summaryCards = useMemo(() => {
    const summary = data?.summary || {};
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const currentMonthTotal = milkLogs.reduce((total, log) => {
      return log.date?.startsWith(currentMonthKey) ? total + (Number(log.milk_quantity) || 0) : total;
    }, 0);

    return [
      { label: t("records.milkRecords") || "Milk Records", value: summary.milk_records ?? 0, icon: Droplets },
      { label: t("records.thisMonth") || "This Month", value: `${currentMonthTotal.toFixed(2)} L`, icon: CalendarDays },
      { label: t("records.totalMilk") || "Total Milk", value: `${summary.milk_total ?? 0} L`, icon: HeartPulse },
      { label: t("records.savedAssessments") || "Disease Checks", value: allDiseaseRecords.length ?? 0, icon: FileText },
      { label: t("followUp.titleShort") || "Vet Visits", value: followUps.length ?? 0, icon: Stethoscope },
    ];
  }, [data, milkLogs, allDiseaseRecords, followUps, t]);

  const trendData = useMemo(() => {
    const orderedLogs = [...milkLogs].sort((left, right) => left.date.localeCompare(right.date));

    return {
      labels: orderedLogs.map((log) => {
        const date = new Date(log.date);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }),
      datasets: [
        {
          label: `${t("milk.title") || "Milk Yield"} (L)`,
          data: orderedLogs.map((log) => log.milk_quantity),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          borderWidth: 3,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [milkLogs, t]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate("/cows")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back") || "Back to cattle list"}
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              {data?.cow?.name || "Cow"} <span className="text-slate-500 font-normal">({data?.cow?.tag_id || `#${cowId}`})</span>
            </h1>
            {data?.cow?.breed && (
              <Badge variant="default" className="text-xs font-semibold">{data.cow.breed}</Badge>
            )}
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-400">
            {t("records.subtitle") || "Longitudinal health trend, previous vs current comparison, veterinary follow-up, and milk records."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
          <Button variant="secondary" onClick={() => navigate("/milk")} className="w-full sm:w-auto">
            {t("milk.logMilk") || "Log Milk"}
          </Button>
          <Button onClick={() => navigate(`/modules?cowId=${cowId}`)} className="w-full sm:w-auto shadow-xs">
            {t("modules.startDetection") || "Start Check"}
          </Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} />}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4, 5].map((item) => (
            <Card key={item} className="p-5">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </Card>
          ))}
        </div>
      ) : !data ? null : (
        <>
          {/* ── Feature 3: Risk Escalation & Critical Veterinary Alert ───────── */}
          {riskEvaluation && (
            <RiskTrendAlert
              riskEvaluation={riskEvaluation}
              onFindVet={() => navigate("/guidance")}
              onDownloadReport={() => {
                const latestWithReport = mastitisAssessments.find((a) => a.has_veterinary_report || a.veterinary_report_path);
                if (latestWithReport) {
                  setSelectedAssessment(latestWithReport);
                  setIsModalOpen(true);
                } else if (mastitisAssessments.length > 0) {
                  setSelectedAssessment(mastitisAssessments[0]);
                  setIsModalOpen(true);
                }
              }}
              onCreateFollowUp={() => {
                // Scroll to veterinary follow-up section
                const el = document.getElementById("vet-follow-up-section");
                if (el) el.scrollIntoView({ behavior: "smooth" });
              }}
            />
          )}

          {/* ── 5 Summary Metric Cards ───────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {summaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="p-4 sm:p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.label}</p>
                      <p className="mt-1.5 text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
                        {item.value}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 shrink-0">
                      <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          {/* ── Feature 1: Cow Longitudinal Health Trend Chart ────────────────── */}
          <CowHealthTrendChart
            healthTrend={healthTrend}
            cowName={data.cow.name || data.cow.tag_id}
          />

          {/* ── Feature 2: Previous vs Current Assessment Comparison ─────────── */}
          <AssessmentComparisonCard
            comparisonData={comparisonData}
            cowName={data.cow.name || data.cow.tag_id}
          />

          {/* ── Feature 4: Veterinary Follow-Up & Clinical Handover Tracking ──── */}
          <div id="vet-follow-up-section">
            <VeterinaryFollowUpTracker
              cowId={cowId}
              cowName={data.cow.name || data.cow.tag_id}
              followUps={followUps}
              onFollowUpUpdated={loadAllCowData}
            />
          </div>

          {/* ── Milk Yield Trend & Milk Log Table ────────────────────────────── */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {t("records.milkTrendTitle") || "Individual Milk Yield History"}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {t("records.milkTrendSubtitle") || `Production trend line strictly for ${data.cow.name || "this cow"}.`}
                </p>
              </div>
              <Badge variant="success">{t("records.separateTrend") || "Cow Milk Trend"}</Badge>
            </div>

            <div className="mt-6 h-72 sm:h-80 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50">
              {milkLogs.length === 0 ? (
                <EmptyState
                  icon={Droplets}
                  title={t("milk.noRecords") || "No milk yield trend data yet"}
                  message={t("milk.noRecords") || "Add daily milk records for this cow to visualize production trend."}
                />
              ) : (
                <Line
                  data={trendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        display: true,
                        labels: {
                          usePointStyle: true,
                          padding: 16,
                          font: { size: 12, weight: "600" },
                          color: document.documentElement.classList.contains("dark") ? "#cbd5e1" : "#334155",
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: { color: document.documentElement.classList.contains("dark") ? "#1e293b" : "#e2e8f0" },
                        ticks: { color: document.documentElement.classList.contains("dark") ? "#cbd5e1" : "#64748b" },
                      },
                      y: {
                        beginAtZero: true,
                        grid: { color: document.documentElement.classList.contains("dark") ? "#1e293b" : "#e2e8f0" },
                        ticks: { color: document.documentElement.classList.contains("dark") ? "#cbd5e1" : "#64748b" },
                      },
                    },
                  }}
                />
              )}
            </div>
          </Card>

          {/* ── Unified 4-Disease Diagnostic Records History ─────────────── */}
          <Card className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  <span>{t("records.diseaseHistoryTitle") || "Disease Diagnostic History"}</span>
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {t("records.diseaseHistorySub") || `Complete screening records across Mastitis, Foot-and-Mouth (FMD), Lumpy Skin (LSD), and Milk Fever for ${data.cow.name || "this cow"}.`}
                </p>
              </div>
              <Badge variant="success" className="self-start sm:self-auto font-bold">
                {allDiseaseRecords.length} {t("records.allChecks") || "Total Assessments"}
              </Badge>
            </div>

            {/* Disease Filter Tabs (All 4 Diseases) */}
            <div className="mt-5 flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {[
                { key: "all", label: t("records.allDiseases") || "All Diseases", count: tabCounts.all, icon: Stethoscope, color: "text-slate-600 dark:text-slate-300" },
                { key: "mastitis", label: "Mastitis", count: tabCounts.mastitis, icon: HeartPulse, color: "text-emerald-600 dark:text-emerald-400" },
                { key: "fmd", label: "Foot & Mouth (FMD)", count: tabCounts.fmd, icon: ShieldAlert, color: "text-orange-600 dark:text-orange-400" },
                { key: "lumpy", label: "Lumpy Skin (LSD)", count: tabCounts.lumpy, icon: Syringe, color: "text-violet-600 dark:text-violet-400" },
                { key: "milk-fever", label: "Milk Fever", count: tabCounts["milk-fever"], icon: Thermometer, color: "text-teal-600 dark:text-teal-400" },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = selectedDiseaseTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setSelectedDiseaseTab(tab.key)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 active:scale-95 ${
                      active
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${active ? "text-white" : tab.color}`} />
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                        active
                          ? "bg-white/20 text-white"
                          : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Disease Records Grid / Empty State */}
            <div className="mt-6 space-y-4">
              {filteredDiseaseRecords.length === 0 ? (
                <EmptyState
                  icon={emptyStateInfo.icon}
                  title={emptyStateInfo.title}
                  message={emptyStateInfo.desc}
                  action={
                    <Button onClick={() => navigate(emptyStateInfo.link)}>
                      {emptyStateInfo.actionLabel}
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredDiseaseRecords.map((rec) => {
                    const Icon = rec.icon;

                    return (
                      <div
                        key={rec.id}
                        onClick={() => {
                          if (rec.actionType === "modal") {
                            setSelectedAssessment(rec.rawData);
                            setIsModalOpen(true);
                          }
                        }}
                        className={`rounded-2xl border p-5 space-y-3.5 transition-all ${
                          rec.actionType === "modal" ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5" : "hover:shadow-xs"
                        } ${
                          rec.isSevere
                            ? "border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/10"
                            : rec.isModerate
                            ? "border-orange-200 dark:border-orange-900/60 bg-orange-50/30 dark:bg-orange-950/10"
                            : rec.isMild
                            ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/10"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        }`}
                      >
                        {/* Top Header Row */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                                rec.colorTheme === "emerald"
                                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60"
                                  : rec.colorTheme === "orange"
                                  ? "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border border-orange-200/60 dark:border-orange-800/60"
                                  : rec.colorTheme === "violet"
                                  ? "bg-violet-50 text-violet-700 dark:bg-violet-950/60 dark:text-violet-300 border border-violet-200/60 dark:border-violet-800/60"
                                  : "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60"
                              }`}
                            >
                              <Icon className="h-3 w-3 shrink-0" />
                              <span>{rec.shortName}</span>
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(rec.datetime).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </p>
                          </div>

                          {/* Severity Status Pill + Borderline Badge */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            {rec.is_borderline && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                {t("records.borderlineTag") || "Borderline"}
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                rec.isSevere
                                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200"
                                  : rec.isModerate
                                  ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200"
                                  : rec.isMild
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
                              }`}
                            >
                              {rec.statusDisplay}
                            </span>
                          </div>
                        </div>

                        {/* Middle Diagnosis Title */}
                        <div>
                          <h3 className="text-base font-bold text-slate-900 dark:text-white capitalize">
                            {rec.title}
                          </h3>
                        </div>

                        {/* Bottom Row: Confidence, AI Tags & Action Button */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex flex-wrap items-center gap-2">
                            {typeof rec.confidence === "number" && (
                              <span>
                                {t("records.confidence") || "Confidence"}:{" "}
                                <strong className="text-slate-700 dark:text-slate-300">
                                  {Math.round(rec.confidence * 100)}%
                                </strong>
                              </span>
                            )}
                            {rec.tags?.map((tg, idx) => (
                              <Badge key={idx} variant={tg.variant || "default"}>
                                {tg.label}
                              </Badge>
                            ))}
                          </div>

                          {/* Action Links */}
                          {rec.actionType === "modal" ? (
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 inline-flex items-center gap-1 hover:underline">
                              {t("records.viewDetails") || "View Report"}
                              <ArrowRight className="h-3.5 w-3.5" />
                            </span>
                          ) : rec.actionType === "download_lsd" ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadLSDReport(rec.rawData);
                              }}
                              disabled={downloadingLogId === rec.rawData.id}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:underline disabled:opacity-60"
                            >
                              {downloadingLogId === rec.rawData.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <FileDown className="h-3.5 w-3.5" />
                              )}
                              <span>{t("records.downloadReport") || "Download PDF"}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/detect/${rec.diseaseKey}?cowId=${cowId}`);
                              }}
                              className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white inline-flex items-center gap-1"
                            >
                              <span>Re-check</span>
                              <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{t("records.healthChecks") || "Health Checks"}</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">{t("records.healthChecksSub") || "Disease detection history for this cow."}</p>
            <div className="mt-4 space-y-3">
              {healthLogs.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title={t("records.noHealthChecks") || "No health checks yet"}
                  message={t("records.noHealthChecksDesc") || "Run a disease check on this cow to keep its health history complete."}
                  action={<Button onClick={() => navigate(`/modules?cowId=${cowId}`)}>{t("modules.startDetection") || "Run Health Check"}</Button>}
                />
              ) : (
                healthLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {formatCheckName(log.module_name, t)} - {log.result}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{log.created_at}</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          {t("records.confidence") || "Confidence"}: {typeof log.confidence === "number" ? `${Math.round(log.confidence * 100)}%` : "N/A"}
                        </p>
                        {isLumpyLog(log.module_name) && (
                          <button
                            type="button"
                            onClick={() => handleDownloadLSDReport(log)}
                            disabled={downloadingLogId === log.id}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-violet-300 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-60 dark:border-violet-700 dark:bg-violet-900/30 dark:text-violet-300 dark:hover:bg-violet-900/50"
                          >
                            {downloadingLogId === log.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <FileDown className="h-3.5 w-3.5" />
                            )}
                            {t("records.downloadReport") || "Download PDF Report"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </>
      )}

      {/* ── Assessment Details Modal ───────────────────────────────────────── */}
      <AssessmentDetailsModal
        assessment={selectedAssessment}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedAssessment(null);
        }}
      />
    </motion.div>
  );
}