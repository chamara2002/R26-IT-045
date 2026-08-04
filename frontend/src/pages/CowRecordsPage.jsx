import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Droplets, Activity, HeartPulse, CalendarDays } from "lucide-react";
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
import { getCowRecords } from "../services/api";

const formatCheckName = (name) => {
  if (!name) return "Health Check";
  const clean = String(name).replace(/-module$/i, "").toLowerCase();
  if (clean === "mastitis") return "Mastitis Check";
  if (clean === "fmd") return "Foot & Mouth Check";
  if (clean === "lumpy") return "Lumpy Skin Check";
  if (clean === "milk-fever" || clean === "milk_fever") return "Milk Fever Check";
  return clean.charAt(0).toUpperCase() + clean.slice(1) + " Check";
};

export default function CowRecordsPage() {
  const navigate = useNavigate();
  const { cowId } = useParams();
  const { showError } = useToast();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadRecords = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await getCowRecords(cowId);
        setData(response);
      } catch (err) {
        const message = err.message || "Failed to load cow records";
        setError(message);
        showError(message);
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [cowId, showError]);

  const milkLogs = data?.milk_yield || [];
  const healthLogs = data?.detection_logs || [];
  const summaryCards = useMemo(() => {
    const summary = data?.summary || {};
    const currentMonthKey = new Date().toISOString().slice(0, 7);
    const currentMonthTotal = milkLogs.reduce((total, log) => {
      return log.date?.startsWith(currentMonthKey) ? total + (Number(log.milk_quantity) || 0) : total;
    }, 0);

    return [
      { label: "Milk records", value: summary.milk_records ?? 0, icon: Droplets },
      { label: "This month", value: `${currentMonthTotal.toFixed(2)} L`, icon: CalendarDays },
      { label: "Total milk", value: `${summary.milk_total ?? 0} L`, icon: HeartPulse },
      { label: "Health checks", value: summary.health_checks ?? 0, icon: Activity },
      { label: "Average yield", value: `${summary.milk_average ?? 0} L`, icon: CalendarDays },
    ];
  }, [data, milkLogs]);
  const trendData = useMemo(() => {
    const orderedLogs = [...milkLogs].sort((left, right) => left.date.localeCompare(right.date));

    return {
      labels: orderedLogs.map((log) => {
        const date = new Date(log.date);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }),
      datasets: [
        {
          label: "Milk yield (L)",
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
  }, [milkLogs]);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={() => navigate("/cows")}
            className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to cattle list
          </button>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
            {data?.cow?.name || "Cow"} records
          </h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            Milk yield, health checks, and full activity history for this cow.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => navigate("/milk")}>Log Milk</Button>
          <Button onClick={() => navigate(`/detect/mastitis?cowId=${cowId}`)}>Run Health Check</Button>
        </div>
      </div>

      {error && <Alert variant="error" message={error} />}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[1, 2, 3, 4].map((item) => (
            <Card key={item} className="p-5">
              <Skeleton className="mb-3 h-4 w-24" />
              <Skeleton className="h-8 w-20" />
            </Card>
          ))}
        </div>
      ) : !data ? null : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {summaryCards.map((item) => {
              const Icon = item.icon;
              return (
                <Card key={item.label} className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{item.label}</p>
                      <p className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{item.value}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">Per-cow milk trend</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                  This chart shows only the milk yield history for {data.cow.name}.
                </p>
              </div>
              <Badge variant="success">Separate cow trend</Badge>
            </div>

            <div className="mt-6 h-80 rounded-2xl bg-slate-50 p-4 dark:bg-slate-900/50">
              {milkLogs.length === 0 ? (
                <EmptyState
                  icon={Droplets}
                  title="No trend data yet"
                  message="Add milk records for this cow to generate its production trend."
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
                          padding: 18,
                          font: { size: 12, weight: "600" },
                          color: document.documentElement.classList.contains("dark") ? "#cbd5e1" : "#334155",
                        },
                      },
                    },
                    scales: {
                      x: {
                        grid: {
                          color: document.documentElement.classList.contains("dark") ? "#1e293b" : "#e2e8f0",
                        },
                        ticks: {
                          color: document.documentElement.classList.contains("dark") ? "#cbd5e1" : "#64748b",
                        },
                      },
                      y: {
                        beginAtZero: true,
                        grid: {
                          color: document.documentElement.classList.contains("dark") ? "#1e293b" : "#e2e8f0",
                        },
                        ticks: {
                          color: document.documentElement.classList.contains("dark") ? "#cbd5e1" : "#64748b",
                        },
                      },
                    },
                  }}
                />
              )}
            </div>
          </Card>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <Card className="p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Milk yield records</h2>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Every milk entry for this cow.</p>
              <div className="mt-4 space-y-3">
                {milkLogs.length === 0 ? (
                  <EmptyState
                    icon={Droplets}
                    title="No milk records yet"
                    message="Log milk yield for this cow to start tracking production."
                    action={<Button onClick={() => navigate("/milk")}>Add Milk Record</Button>}
                  />
                ) : (
                  milkLogs.map((log) => (
                    <div key={log.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white">{log.milk_quantity} L</p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">{log.date}</p>
                        </div>
                        <Badge variant="info">Milk</Badge>
                      </div>
                    </div>
                  ))
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
                        </div>
                        <Badge variant={String(log.result).toLowerCase().includes("normal") ? "success" : "warning"}>
                          Health
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cow profile</h2>
            <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">Breed</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{data.cow.breed}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">Age</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{data.cow.age} years</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">Lactation count</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">{data.cow.lactation_count}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500 dark:text-slate-400">Cow ID</dt>
                <dd className="mt-1 font-semibold text-slate-900 dark:text-white">#{data.cow.id}</dd>
              </div>
            </dl>
          </Card>
        </>
      )}
    </motion.div>
  );
}