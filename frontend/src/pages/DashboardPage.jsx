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

  // Page animations handled by PageWrapper and PageHeader

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-6">
        <div className="flex items-center gap-3 mb-2">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
          <p className="font-semibold text-red-700 dark:text-red-300">{t("common.error")}</p>
        </div>
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <PageWrapper className="space-y-6">
      <PageHeader title={t("dashboard.welcome")} subtitle={t("dashboard.subtitle")} />

      {/* Stats Grid */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        {/* Total Cows */}
        <Card hover className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
              <ShieldCheck className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <Badge variant="success">{isLoading ? "-" : "Active"}</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            {t("dashboard.totalCows")}
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-12 mb-2" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {data?.summary?.cow_count || 0}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Total in herd
          </p>
        </Card>

        {/* Milk Production */}
        <Card hover className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Droplets className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <Badge variant="info">{isLoading ? "-" : "This Week"}</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            {t("Milk Production")}
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-12 mb-2" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {data?.summary?.milk_log_count || 0} L
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Litres recorded this week
          </p>
        </Card>

        {/* Health Status */}
        <Card hover className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <Heart className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <Badge variant="warning">Alert</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Health Alerts
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-12 mb-2" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {data?.summary?.alerts || 0}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Requiring attention
          </p>
        </Card>

        {/* Recent Detections */}
        <Card hover className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-12 w-12 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <Activity className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <Badge variant="default">Latest</Badge>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
            Recent Health Checks
          </p>
          {isLoading ? (
            <Skeleton className="h-8 w-12 mb-2" />
          ) : (
            <p className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {data?.summary?.recent_tests || 0}
            </p>
          )}
          <p className="text-xs text-slate-500 dark:text-slate-400">
            This month
          </p>
        </Card>
      </motion.div>

      {/* My Cows Section */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              {t("dashboard.myCows")}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              {isLoading ? "Loading..." : `You have ${data?.cows?.length || 0} cattle`}
            </p>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button onClick={() => navigate("/cows")} className="gap-2">
              <Plus className="h-5 w-5" />
              Add New Cow
            </Button>
          </motion.div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6">
                <Skeleton className="h-12 w-12 rounded-lg mb-4" />
                <Skeleton className="h-6 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </Card>
            ))}
          </div>
        ) : data?.cows?.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <ShieldCheck className="h-8 w-8 text-slate-400" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              No cattle yet
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-sm mx-auto">
              Start by adding your first cattle to track their health and productivity
            </p>
            <Button onClick={() => navigate("/cows")} className="gap-2">
              <Plus className="h-5 w-5" />
              Add Your First Cow
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.cows.slice(0, 6).map((cow, idx) => (
              <motion.div key={cow.id} whileHover={{ y: -5 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
                <Card hover className="p-6 cursor-pointer">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                        {cow.name}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        ID: {cow.id}
                      </p>
                    </div>
                    <Badge
                      variant={cow.health_status === "healthy" ? "success" : "warning"}
                    >
                      {cow.health_status || "Healthy"}
                    </Badge>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        Age
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {cow.age || "N/A"} years
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        Breed
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {cow.breed || "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600 dark:text-slate-400">
                        Milk Yield
                      </span>
                      <span className="font-medium text-slate-900 dark:text-white">
                        {cow.milk_yield || "0"} L/day
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => navigate("/modules")}
                      className="flex-1"
                    >
                      Test Health
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate("/milk")}
                      className="flex-1"
                    >
                      View Logs
                    </Button>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {!isLoading && data?.cows?.length > 6 && (
          <motion.div className="mt-6 text-center" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
            <Button
              variant="outline"
              onClick={() => navigate("/cows")}
              className="gap-2"
            >
              View All {data.cows.length} Cattle
              <TrendingUp className="h-5 w-5" />
            </Button>
          </motion.div>
        )}
      </motion.div>

      {/* Quick Actions */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Card hover className="p-6 cursor-pointer" onClick={() => navigate("/modules")}>
            <AlertCircle className="h-8 w-8 text-orange-600 dark:text-orange-400 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Check for Disease
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Upload a photo of your cow to check if it may be sick
            </p>
          </Card>

          <Card hover className="p-6 cursor-pointer" onClick={() => navigate("/cows")}>
            <Plus className="h-8 w-8 text-emerald-600 dark:text-emerald-400 mb-3" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
              Add Cattle
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Register new cattle to your herd
            </p>
          </Card>
        </div>
      </motion.div>
    </PageWrapper>
  );
}
