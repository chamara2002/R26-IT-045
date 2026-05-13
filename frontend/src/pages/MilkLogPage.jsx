import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import PageWrapper, { PageHeader } from "../components/PageWrapper";
import { Plus, TrendingUp, Calendar, Droplet } from "lucide-react";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
  Filler,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { Card, Button, Input, Modal, Alert, EmptyState, Skeleton } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import { getCows, getMilkYieldHistory, logMilkYield } from "../services/api";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

export default function MilkLogPage() {
  const { t } = useI18n();
  const { showSuccess, showError } = useToast();
  const [cows, setCows] = useState([]);
  const [history, setHistory] = useState([]);
  const [formData, setFormData] = useState({ cow_id: "", date: "", milk_quantity: "" });
  const [error, setError] = useState("");
  const [lastAlert, setLastAlert] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  const loadData = useCallback(async () => {
    setDataLoading(true);
    try {
      const [cowsResponse, milkResponse] = await Promise.all([
        getCows(),
        getMilkYieldHistory(),
      ]);
      setCows(cowsResponse.cows || []);
      setHistory(milkResponse.milk_yield || []);
    } catch {
      showError(t("common.serverError"));
    } finally {
      setDataLoading(false);
    }
  }, [t, showError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const resetForm = () => {
    setFormData({ cow_id: "", date: "", milk_quantity: "" });
    setError("");
    setLastAlert("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.cow_id || !formData.milk_quantity) {
      const errorMsg = t("common.fillAllFields");
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    setIsLoading(true);
    try {
      const response = await logMilkYield({
        cow_id: Number(formData.cow_id),
        date: formData.date || undefined,
        milk_quantity: Number(formData.milk_quantity),
      });

      // Backend may return an "alert" when a significant drop is detected
      if (response?.alert) {
        // Keep the modal open and surface the alert inside it so user sees immediately
        setLastAlert(response.alert);
        showError(response.alert);
        // Reload data so chart/summary reflect the saved record while modal remains open
        await loadData();
        // Do not reset form or close modal so farmer can review alert
      } else {
        setLastAlert("");
        showSuccess(t("milk.saved") || "Milk log saved successfully");
        resetForm();
        setIsFormOpen(false);
        await loadData();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || t("common.serverError");
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
    const last30 = sorted.slice(-30); // Show last 30 entries

    return {
      labels: last30.map((item) => {
        const date = new Date(item.date);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }),
      datasets: [
        {
          label: "Milk Yield (L)",
          data: last30.map((item) => item.milk_quantity),
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          borderWidth: 3,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
          tension: 0.4,
          fill: true,
        },
      ],
    };
  }, [history]);

  const totalMilk = useMemo(() => {
    return history.reduce((sum, item) => sum + (Number(item.milk_quantity) || 0), 0).toFixed(2);
  }, [history]);

  const averageMilk = useMemo(() => {
    return history.length > 0 ? (totalMilk / history.length).toFixed(2) : "0.00";
  }, [history, totalMilk]);

  // Page animations handled by PageWrapper and PageHeader

  return (
    <PageWrapper className="space-y-6">
      {lastAlert && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <Alert variant="warning" message={lastAlert} />
        </motion.div>
      )}

      <PageHeader
        title={t("milk.title")}
        subtitle={t("milk.subtitle")}
        actions={
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              onClick={() => {
                resetForm();
                setIsFormOpen(true);
              }}
              className="gap-2"
              size="lg"
            >
              <Plus className="h-5 w-5" />
              Log Milk
            </Button>
          </motion.div>
        }
      />

      {/* Stats Cards */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Total Milk Yield
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {totalMilk}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {history.length} records
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Droplet className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Average Daily
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {averageMilk}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  liters per day
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  Cattle Tracked
                </p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {cows.length}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  in your herd
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </Card>
        </motion.div>
      </motion.div>

      {/* Add Milk Log Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          resetForm();
          setIsFormOpen(false);
        }}
        title="Log Milk Yield"
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Select Cattle
            </label>
            <select
              name="cow_id"
              value={formData.cow_id}
              onChange={handleChange}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900"
            >
              <option value="">{t("milk.selectCow")}</option>
              {cows.map((cow) => (
                <option key={cow.id} value={cow.id}>
                  {cow.name} - {cow.breed}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Date"
              type="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
            />
            <Input
              label="Milk Quantity (L)"
              type="number"
              min="0"
              step="0.1"
              name="milk_quantity"
              value={formData.milk_quantity}
              onChange={handleChange}
              placeholder="e.g., 15.5"
            />
          </div>

          {error && <Alert variant="error" message={error} />}
          {lastAlert && (
            <div className="mt-3">
              <Alert variant="warning" message={lastAlert} />
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                resetForm();
                setIsFormOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isLoading} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Record"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Trend Chart */}
      {dataLoading ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <Card className="p-8">
            <Skeleton className="h-64 rounded-lg" />
          </Card>
        </motion.div>
      ) : history.length === 0 ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <EmptyState
            icon={TrendingUp}
            title="No milk records yet"
            message="Start logging your cattle's milk yield to see trends and patterns over time"
            action={
              <Button
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
                className="gap-2"
              >
                <Plus className="h-5 w-5" />
                Add First Record
              </Button>
            }
          />
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
          <Card className="p-8">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {t("milk.trendTitle")}
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6">
              {t("milk.trendSubtitle")}
            </p>
            <div className="w-full h-80 bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4">
              <Line
                data={chartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      labels: {
                        usePointStyle: true,
                        padding: 20,
                        font: { size: 12, weight: "600" },
                        color: document.documentElement.classList.contains("dark")
                          ? "#cbd5e1"
                          : "#334155",
                      },
                    },
                  },
                  scales: {
                    x: {
                      grid: {
                        color: document.documentElement.classList.contains("dark")
                          ? "#1e293b"
                          : "#e2e8f0",
                      },
                      ticks: {
                        color: document.documentElement.classList.contains("dark")
                          ? "#cbd5e1"
                          : "#64748b",
                      },
                    },
                    y: {
                      beginAtZero: true,
                      grid: {
                        color: document.documentElement.classList.contains("dark")
                          ? "#1e293b"
                          : "#e2e8f0",
                      },
                      ticks: {
                        color: document.documentElement.classList.contains("dark")
                          ? "#cbd5e1"
                          : "#64748b",
                      },
                    },
                  },
                }}
              />
            </div>
          </Card>
        </motion.div>
      )}
    </PageWrapper>
  );
}
