import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper from "../components/PageWrapper";
import {
  HeartPulse,
  ShieldAlert,
  Syringe,
  Thermometer,
  ArrowRight,
  Stethoscope,
  Activity,
  AlertCircle,
} from "lucide-react";
import { useI18n } from "../i18n/language-context";

const MODULES_CONFIG = [
  {
    key: "mastitis",
    titleKey: "modules.mastitis",
    subtitleKey: "moduleSelection.subtitles.mastitis",
    descKey: "modules.mastitisDesc",
    badge: "Udder Health",
    symptoms: [
      "Swollen, hard or hot udder",
      "Clotted, watery or bloody milk",
      "Sudden milk yield drop",
      "Milking pain / kicking",
    ],
    icon: HeartPulse,
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40",
    method: "Image + Sensor AI",
  },
  {
    key: "fmd",
    titleKey: "modules.fmd",
    subtitleKey: "moduleSelection.subtitles.fmd",
    descKey: "modules.fmdDesc",
    badge: "Contagious Alert",
    symptoms: [
      "Blisters on tongue & mouth",
      "Excessive ropy drooling",
      "Severe lameness & hoof sores",
      "High fever (104°F+)",
    ],
    icon: ShieldAlert,
    iconColor: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/40",
    method: "Lesion Classifier",
  },
  {
    key: "lumpy",
    titleKey: "modules.lumpy",
    subtitleKey: "moduleSelection.subtitles.lumpy",
    descKey: "modules.lumpyDesc",
    badge: "Skin Condition",
    symptoms: [
      "Raised skin lumps (2–5cm)",
      "Eye & nasal discharge",
      "Swollen lymph nodes",
      "Fever & loss of appetite",
    ],
    icon: Syringe,
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40",
    method: "Nodule Detection AI",
  },
  {
    key: "milk-fever",
    titleKey: "modules.milkFever",
    subtitleKey: "moduleSelection.subtitles.milkFever",
    descKey: "modules.milkFeverDesc",
    badge: "Post-Calving",
    symptoms: [
      "Downer cow unable to stand",
      "Cold ears & low body temp",
      "Muscle tremors & S-curve neck",
      "Glassy eyes & weakness",
    ],
    icon: Thermometer,
    iconColor: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40",
    method: "Clinical Assessment",
  },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export default function ModuleSelectionPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <PageWrapper className="space-y-6">
      {/* ── Top Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Disease Detection Modules
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Select a specialized AI health check to evaluate symptoms and diagnose clinical signs.
          </p>
        </div>
      </div>

      {/* ── 4 Minimal Disease Cards ─────────────────────────────────────────── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
      >
        {MODULES_CONFIG.map((mod) => {
          const Icon = mod.icon;
          return (
            <motion.div
              key={mod.key}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-6 flex flex-col justify-between gap-5 shadow-xs hover:shadow-md transition-all cursor-pointer group"
              onClick={() => navigate(`/detect/${mod.key}`)}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`h-11 w-11 rounded-xl ${mod.iconBg} flex items-center justify-center`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {t(mod.titleKey)}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{t(mod.subtitleKey)}</p>
                    </div>
                  </div>

                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60">
                    {mod.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  {t(mod.descKey)}
                </p>

                {/* Clean Symptom Pills (Minimal) */}
                <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <AlertCircle size={12} className="text-amber-500" />
                    <span>Key Clinical Signs:</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mod.symptoms.map((symptom, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-medium"
                      >
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Minimal Card Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  {mod.method}
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold text-xs text-emerald-600 dark:text-emerald-400 group-hover:translate-x-0.5 transition-transform">
                  Fast Check
                  <ArrowRight size={14} />
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </PageWrapper>
  );
}
