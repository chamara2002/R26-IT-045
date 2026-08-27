import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Droplets, Activity, HeartPulse, CalendarDays, FileDown, Loader2, FileText, Stethoscope } from "lucide-react";
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

const formatCheckName = (name) => {
  if (!name) return "Health Check";
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
      { label: t("records.savedAssessments") || "Saved Assessments", value: mastitisAssessments.length ?? 0, icon: FileText },
      { label: t("followUp.titleShort") || "Vet Visits", value: followUps.length ?? 0, icon: Stethoscope },
    ];
  }, [data, milkLogs, mastitisAssessments, followUps, t]);

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
          <Button onClick={() => navigate(`/detect/mastitis?cowId=${cowId}`)} className="w-full sm:w-auto shadow-xs">
            {t("modules.startDetection") || "Run Mastitis Check"}
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
              onFindVet={() => navigate("/contact")}
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

          {/* ── Saved Mastitis Assessment History ──────────────────────────── */}
          <Card className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                  <span>{t("records.savedAssessments") || "Mastitis Assessment History"}</span>
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  {t("records.subtitle") || `Screening records, biomarker metrics, and veterinary handovers saved for ${data.cow.name || "this cow"}.`}
                </p>
              </div>
              <Badge variant="success">{mastitisAssessments.length} {t("records.savedAssessments") || "Saved Records"}</Badge>
            </div>

            <div className="mt-6 space-y-3">
              {mastitisAssessments.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title={t("records.noChecks") || "No saved mastitis assessments yet"}
                  message={t("records.noChecks") || "When you perform a mastitis screening, click 'Save Result' on the detection result card to keep a permanent diagnostic record."}
                  action={
                    <Button onClick={() => navigate(`/detect/mastitis?cowId=${cowId}`)}>
                      {t("modules.startDetection") || "Run Mastitis Detection"}
                    </Button>
                  }
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {mastitisAssessments.map((a) => {
                    const isSevere = String(a.stage || a.severity_level || "").toLowerCase().includes("severe") || String(a.stage || a.severity_level || "").toLowerCase().includes("critical");
                    const isModerate = !isSevere && String(a.stage || a.severity_level || "").toLowerCase().includes("moderate");
                    const isMild = !isSevere && !isModerate && String(a.stage || a.severity_level || "").toLowerCase().includes("mild");

                    return (
                      <div
                        key={a.id}
                        onClick={() => {
                          setSelectedAssessment(a);
                          setIsModalOpen(true);
                        }}
                        className={`rounded-2xl border p-5 space-y-3 transition-all cursor-pointer hover:shadow-md ${
                          isSevere
                            ? "border-red-200 dark:border-red-900/60 bg-red-50/30 dark:bg-red-950/10"
                            : isModerate
                            ? "border-orange-200 dark:border-orange-900/60 bg-orange-50/30 dark:bg-orange-950/10"
                            : isMild
                            ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/10"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(a.assessment_datetime || a.created_at).toLocaleDateString("en-US", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 dark:text-white mt-0.5">
                              {a.stage || a.prediction}
                            </h3>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {a.is_borderline && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                                Borderline
                              </span>
                            )}
                            <span
                              className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                                isSevere
                                  ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-200"
                                  : isModerate
                                  ? "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-200"
                                  : isMild
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200"
                                  : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200"
                              }`}
                            >
                              {a.prediction}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                          {typeof a.confidence === "number" && (
                            <span>Confidence: <strong className="text-slate-700 dark:text-slate-300">{Math.round(a.confidence * 100)}%</strong></span>
                          )}
                          {a.model_2_used && (
                            <Badge variant="info">Multimodal</Badge>
                          )}
                          {a.roi_applied && (
                            <Badge variant="default">ROI</Badge>
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
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Health checks</h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Disease detection history for this cow.</p>
            <div className="mt-4 space-y-3">
              {healthLogs.length === 0 ? (
                <EmptyState
                  icon={Activity}
                  title="No health checks yet"
                  message="Run a disease check on this cow to keep its health history complete."
                  action={<Button onClick={() => navigate(`/detect/mastitis?cowId=${cowId}`)}>Run Health Check</Button>}
                />
              ) : (
                healthLogs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {formatCheckName(log.module_name)} - {log.result}
                        </p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{log.created_at}</p>
                        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                          Confidence: {typeof log.confidence === "number" ? `${Math.round(log.confidence * 100)}%` : "N/A"}
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
                            Download PDF Report
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