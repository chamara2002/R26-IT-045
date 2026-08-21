import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper, { PageHeader } from "../components/PageWrapper";
import {
  Droplets,
  TrendingUp,
  AlertCircle,
  Plus,
  Activity,
  Heart,
  ShieldCheck,
} from "lucide-react";
import { Card, Badge, Button, Skeleton } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { getDashboardData } from "../services/api";
import HerdHealthOverviewCard from "../components/HerdHealthOverviewCard";

const fadeUp = { hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      setError("");
      try {
        const response = await getDashboardData();
        setData(response);
      } catch {
        setError(t("common.serverError"));
      } finally {
        setIsLoading(false);
      }
    };
    loadDashboard();
  }, [t]);

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="font-semibold text-red-700 dark:text-red-300">{t("common.error")}</p>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <PageWrapper className="space-y-8">
      <motion.div
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.15 }}
      >
        {/* Total Cows */}
        <Card hover className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <Badge variant="success">{isLoading ? "-" : (t("dashboard.active") || "Active")}</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("dashboard.totalCows")}</p>
          {isLoading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data?.summary?.cow_count || 0}
            </p>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("dashboard.totalInHerd") || "Total in herd"}</p>
        </Card>

        {/* Milk Production */}
        <Card hover className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Droplets className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <Badge variant="info">{isLoading ? "-" : (t("dashboard.thisWeek") || "This Week")}</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("milk.title") || "Milk Production"}</p>
          {isLoading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data?.summary?.milk_log_count || 0} L
            </p>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("dashboard.litresThisWeek") || "Litres this week"}</p>
        </Card>

        {/* Health Alerts */}
        <Card hover className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Heart className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <Badge variant={data?.summary?.critical_mastitis_count > 0 ? "danger" : "warning"}>
              {data?.summary?.critical_mastitis_count > 0 ? "Urgent" : (t("cowCard.checkDisease") || "Alert")}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("dashboard.healthAlerts") || "Critical Cases"}</p>
          {isLoading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data?.summary?.critical_mastitis_count || 0}
            </p>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("dashboard.requiringAttention") || "Requiring attention"}</p>
        </Card>

        {/* Recent Detections */}
        <Card hover className="p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="h-10 w-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Activity className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            </div>
            <Badge variant="default">{t("modules.title") || "Latest"}</Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">{t("dashboard.recentDetections") || "Recent Detections"}</p>
          {isLoading ? (
            <Skeleton className="h-7 w-12" />
          ) : (
            <p className="text-2xl font-bold text-slate-900 dark:text-white">
              {data?.herd_health_overview?.recent_30d?.total || 0}
            </p>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t("dashboard.thisMonth") || "This month"}</p>
        </Card>
      </motion.div>

      {/* ── Mobile-Friendly Quick Actions Bar ───────────────────────────────── */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-4 gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.18 }}
      >
        <button
          type="button"
          onClick={() => navigate("/modules")}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xs transition-all text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs sm:text-sm leading-tight truncate">{t("dashboard.checkDisease") || "Check Disease"}</p>
            <p className="text-[10px] text-emerald-100 mt-0.5 truncate">{t("dashboard.checkDiseaseSub") || "AI Diagnosis"}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/milk")}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white shadow-xs transition-all text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Droplets className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs sm:text-sm leading-tight truncate">{t("dashboard.logMilk") || "Log Milk"}</p>
            <p className="text-[10px] text-blue-100 mt-0.5 truncate">{t("dashboard.logMilkSub") || "Daily Yield"}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/cows")}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-800 dark:bg-slate-800 hover:bg-slate-700 active:scale-95 text-white shadow-xs transition-all text-left border border-slate-700"
        >
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs sm:text-sm leading-tight truncate">{t("dashboard.myHerd") || "My Herd"}</p>
            <p className="text-[10px] text-slate-300 mt-0.5 truncate">{t("dashboard.myHerdSub") || "Cattle List"}</p>
          </div>
        </button>

        <button
          type="button"
          onClick={() => navigate("/guidance")}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white shadow-xs transition-all text-left"
        >
          <div className="h-10 w-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Heart className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-xs sm:text-sm leading-tight truncate">{t("dashboard.farmerHelp") || "Farmer Help"}</p>
            <p className="text-[10px] text-amber-100 mt-0.5 truncate">{t("dashboard.farmerHelpSub") || "Vet Contacts"}</p>
          </div>
        </button>
      </motion.div>

      {/* ── Feature 5: Herd-Level Mastitis Overview ──────────────────────────── */}
      {!isLoading && data?.herd_health_overview && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, delay: 0.2 }}
        >
          <HerdHealthOverviewCard herdOverview={data.herd_health_overview} />
        </motion.div>
      )}

      {/* ── 3. My Cattle ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.22 }}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {t("dashboard.myCows")}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {isLoading ? t("common.loading") : `${data?.cows?.length || 0} ${t("dashboard.cattleRegistered") || "cattle registered"}`}
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => navigate("/cows")} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              {t("cowManagement.addCow")}
            </Button>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-5">
                <Skeleton className="h-10 w-10 rounded-lg mb-3" />
                <Skeleton className="h-5 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </Card>
            ))}
          </div>
        ) : data?.cows?.length === 0 ? (
          <Card className="p-10 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <ShieldCheck className="h-7 w-7 text-slate-400" />
              </div>
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white mb-2">{t("cowManagement.noCows")}</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-5 text-sm max-w-sm mx-auto">
              {t("dashboard.noCows")}
            </p>
            <Button onClick={() => navigate("/cows")} className="gap-2" size="sm">
              <Plus className="h-4 w-4" />
              {t("cowManagement.addCow")}
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.cows.slice(0, 6).map((cow) => (
              <motion.div
                key={cow.id}
                whileHover={{ y: -4 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28 }}
              >
                <Card hover className="p-5 cursor-pointer">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-slate-900 dark:text-white">{cow.name}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{t("cowCard.cowId")}: {cow.id}</p>
                    </div>
                    <Badge variant={cow.health_status === "healthy" ? "success" : "warning"}>
                      {cow.health_status || t("dashboard.active")}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{t("cowCard.age")}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{cow.age || "N/A"} {t("cowCard.years")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{t("cowCard.breed")}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{cow.breed || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">{t("milk.quantity")}</span>
                      <span className="font-medium text-slate-900 dark:text-white">{cow.milk_yield || "0"} L</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate("/modules")}
                      className="flex-1 text-xs"
                    >
                      {t("cowCard.checkDisease")}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/milk")}
                      className="flex-1 text-xs"
                    >
                      {t("milk.title")}
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && data?.cows?.length > 6 && (
          <motion.div
            className="mt-5 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.32 }}
          >
            <Button variant="outline" onClick={() => navigate("/cows")} className="gap-2" size="sm">
              {t("cowCard.viewRecords")} ({data.cows.length})
              <TrendingUp className="h-4 w-4" />
            </Button>
          </motion.div>
        )}
      </motion.div>
    </PageWrapper>
  );
}
