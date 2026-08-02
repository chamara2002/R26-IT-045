import { HeartPulse, ShieldAlert, Syringe, Thermometer, ArrowRight } from "lucide-react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper, { PageHeader } from "../components/PageWrapper";
import { Card, Button } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";

export default function ModuleSelectionPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const modules = useMemo(
    () => [
      {
        key: "mastitis",
        title: t("modules.mastitis"),
        icon: HeartPulse,
        description: t("modules.mastitisDesc"),
        // calmer green palette for eye comfort
        color: "from-emerald-500 to-emerald-600",
        bgColor: "bg-emerald-50 dark:bg-emerald-900/10",
        iconBg: "bg-emerald-100 dark:bg-emerald-900/20",
        iconColor: "text-emerald-600 dark:text-emerald-400",
      },
      {
        key: "fmd",
        title: t("modules.fmd"),
        icon: ShieldAlert,
        description: t("modules.fmdDesc"),
        // softened amber
        color: "from-amber-500 to-amber-600",
        bgColor: "bg-amber-50 dark:bg-amber-900/10",
        iconBg: "bg-amber-100 dark:bg-amber-900/20",
        iconColor: "text-amber-600 dark:text-amber-400",
      },
      {
        key: "lumpy",
        title: t("modules.lumpy"),
        icon: Syringe,
        description: t("modules.lumpyDesc"),
        // cooler indigo for contrast without harshness
        color: "from-indigo-500 to-indigo-600",
        bgColor: "bg-indigo-50 dark:bg-indigo-900/10",
        iconBg: "bg-indigo-100 dark:bg-indigo-900/20",
        iconColor: "text-indigo-600 dark:text-indigo-400",
      },
      {
        key: "milk-fever",
        title: t("modules.milkFever"),
        icon: Thermometer,
        description: t("modules.milkFeverDesc"),
        // pleasant teal tones
        color: "from-teal-500 to-teal-600",
        bgColor: "bg-teal-50 dark:bg-teal-900/10",
        iconBg: "bg-teal-100 dark:bg-teal-900/20",
        iconColor: "text-teal-600 dark:text-teal-400",
      },
    ],
    [t]
  );

  // animations provided by PageWrapper and PageHeader

  return (
    <PageWrapper className="space-y-8">
      <PageHeader title={t("modules.title")} subtitle={t("modules.subtitle")} />

      {/* Modules Grid */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 gap-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        {modules.map((module) => {
          const Icon = module.icon;
          return (
            <motion.div key={module.key} whileHover={{ y: -8 }} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }} onClick={() => navigate(`/detect/${module.key}`)}>
              <Card hover className="p-6 h-full flex flex-col cursor-pointer group">
                {/* Icon */}
                <div className={`h-14 w-14 rounded-xl ${module.iconBg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`h-7 w-7 ${module.iconColor}`} />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  {module.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-6 flex-1">
                  {module.description}
                </p>

                {/* Button */}
                <Button
                  className={`w-full gap-2 bg-gradient-to-r ${module.color} text-white hover:shadow-lg transition-all duration-300`}
                  onClick={(e) => {
                    e.preventDefault();
                    navigate(`/detect/${module.key}`);
                  }}
                >
                  Start Check
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Info Section */}
      <motion.div className="bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 rounded-xl p-6" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-800">
              <span className="text-lg font-bold text-slate-700 dark:text-slate-200">ℹ️</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-1">
              How It Works
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Take a photo of your cow and upload it. You can also add details about the cow's milk and behaviour. The app will then tell you if the cow may be sick and what to do.
            </p>
          </div>
        </div>
      </motion.div>
    </PageWrapper>
  );
}
