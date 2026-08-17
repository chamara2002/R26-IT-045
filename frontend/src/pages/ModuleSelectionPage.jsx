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
  Camera,
  CheckCircle2,
  Sparkles,
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            {t("modules.title") || "Disease Detection Hub"}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t("modules.subtitle") || "Tap a health check below to evaluate symptoms and diagnose clinical signs."}
          </p>
        </div>
      </div>

      {/* ── Farmer Quick Guide Banner ────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 dark:from-emerald-950/40 dark:via-teal-950/30 dark:to-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
            {t("landing.howItWorksTitle") || "How It Works for Farmers"}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="flex items-start gap-2.5 bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 shadow-2xs">
            <span className="h-6 w-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">1</span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{t("landing.step1Title") || "Choose Disease"}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{t("landing.step1Desc") || "Select the condition you want to test"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 shadow-2xs">
            <span className="h-6 w-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">2</span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{t("landing.step2Title") || "Take / Pick Photo"}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{t("landing.step2Desc") || "Snap udder, skin, or mouth photo"}</p>
            </div>
          </div>
          <div className="flex items-start gap-2.5 bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-emerald-100 dark:border-emerald-900/40 shadow-2xs">
            <span className="h-6 w-6 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center shrink-0 text-xs">3</span>
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{t("landing.step3Title") || "Instant AI Diagnosis"}</p>
              <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">{t("landing.step3Desc") || "Get risk level and veterinary advice"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Minimal Disease Cards ─────────────────────────────────────────── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5"
      >
        {MODULES_CONFIG.map((mod) => {
          const Icon = mod.icon;
          return (
            <motion.div
              key={mod.key}
              variants={fadeUp}
              whileTap={{ scale: 0.98 }}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 flex flex-col justify-between gap-4 shadow-xs hover:shadow-md transition-all cursor-pointer group active:border-emerald-500"
              onClick={() => navigate(`/detect/${mod.key}`)}
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-3 gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-12 w-12 rounded-xl ${mod.iconBg} flex items-center justify-center shrink-0 shadow-2xs`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate">
                        {t(mod.titleKey) || mod.title}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {t(`modules.subtitles.${mod.key === 'milk-fever' ? 'milkFever' : mod.key}`) || t(mod.subtitleKey) || "AI Diagnostic Check"}
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                    {t(`modules.badges.${mod.key === 'milk-fever' ? 'milkFever' : mod.key}`) || mod.badge}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
                  {t(mod.descKey)}
                </p>

                {/* Clean Symptom Pills */}
                <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <AlertCircle size={13} className="text-amber-500 shrink-0" />
                    <span>{t("detection.symptomsChecklist") || "Key Signs to Look For:"}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {mod.symptoms.map((symptom, sIdx) => (
                      <span
                        key={sIdx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-medium"
                      >
                        {t(`modules.symptoms.${mod.key === 'milk-fever' ? 'milkFever' : mod.key}.${sIdx}`) || symptom}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer with large tap button */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                  {t(`modules.methods.${mod.key === 'milk-fever' ? 'milkFever' : mod.key}`) || mod.method}
                </span>
                <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs sm:text-sm shadow-xs group-hover:bg-emerald-700 transition-colors">
                  <span>{t("modules.fastCheck") || "Start Check"}</span>
                  <ArrowRight size={15} />
                </div>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </PageWrapper>
  );
}

