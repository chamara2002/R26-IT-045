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
  Brain,
  Camera,
  Activity,
  FlaskConical,
} from "lucide-react";
import { useI18n } from "../i18n/language-context";

const MODULES_CONFIG = [
  {
    key: "mastitis",
    titleKey: "modules.mastitis",
    subtitleKey: "moduleSelection.subtitles.mastitis",
    descKey: "modules.mastitisDesc",
    badgeKey: "moduleSelection.badges.udderHealth",
    inputKeys: [
      "moduleSelection.inputs.udderPhoto",
      "moduleSelection.inputs.milkTempYield",
      "moduleSelection.inputs.behaviourChecklist",
    ],
    icon: HeartPulse,
    gradient: "from-emerald-500 to-emerald-600",
    glow: "shadow-emerald-500/25",
    lightBg: "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10",
    border: "border-emerald-200/60 dark:border-emerald-800/40",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
    badgeStyle: "bg-emerald-100 text-emerald-900 border border-emerald-300 dark:bg-emerald-900/70 dark:text-emerald-200 dark:border-emerald-700/60 font-bold",
    ctaColor: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
    method: "CNN + Tabular Fusion",
  },
  {
    key: "fmd",
    titleKey: "modules.fmd",
    subtitleKey: "moduleSelection.subtitles.fmd",
    descKey: "modules.fmdDesc",
    badgeKey: "moduleSelection.badges.highlyContagious",
    inputKeys: [
      "moduleSelection.inputs.mouthHoofPhotos",
      "moduleSelection.inputs.lesionChecklist",
      "moduleSelection.inputs.feverLameness",
    ],
    icon: ShieldAlert,
    gradient: "from-orange-500 to-orange-600",
    glow: "shadow-orange-500/25",
    lightBg: "bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10",
    border: "border-orange-200/60 dark:border-orange-800/40",
    iconColor: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
    badgeStyle: "bg-orange-100 text-orange-950 border border-orange-300 dark:bg-orange-900/70 dark:text-orange-200 dark:border-orange-700/60 font-bold",
    ctaColor: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
    method: "Deep CNN Classifier",
  },
  {
    key: "lumpy",
    titleKey: "modules.lumpy",
    subtitleKey: "moduleSelection.subtitles.lumpy",
    descKey: "modules.lumpyDesc",
    badgeKey: "moduleSelection.badges.skinCondition",
    inputKeys: [
      "moduleSelection.inputs.skinPhotos",
      "moduleSelection.inputs.noduleCount",
      "moduleSelection.inputs.feverReadings",
    ],
    icon: Syringe,
    gradient: "from-violet-500 to-violet-600",
    glow: "shadow-violet-500/25",
    lightBg: "bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-900/20 dark:to-violet-800/10",
    border: "border-violet-200/60 dark:border-violet-800/40",
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg: "bg-violet-100 dark:bg-violet-900/40",
    badgeStyle: "bg-violet-100 text-violet-950 border border-violet-300 dark:bg-violet-900/70 dark:text-violet-200 dark:border-violet-700/60 font-bold",
    ctaColor: "bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700",
    method: "CNN Object Detection",
  },
  {
    key: "milk-fever",
    titleKey: "modules.milkFever",
    subtitleKey: "moduleSelection.subtitles.milkFever",
    descKey: "modules.milkFeverDesc",
    badgeKey: "moduleSelection.badges.postCalving",
    inputKeys: [
      "moduleSelection.inputs.postCalvingSymptoms",
      "moduleSelection.inputs.daysSinceCalving",
      "moduleSelection.inputs.muscleSigns",
    ],
    icon: Thermometer,
    gradient: "from-teal-500 to-teal-600",
    glow: "shadow-teal-500/25",
    lightBg: "bg-gradient-to-br from-teal-50 to-teal-100/50 dark:from-teal-900/20 dark:to-teal-800/10",
    border: "border-teal-200/60 dark:border-teal-800/40",
    iconColor: "text-teal-600 dark:text-teal-400",
    iconBg: "bg-teal-100 dark:bg-teal-900/40",
    badgeStyle: "bg-teal-100 text-teal-950 border border-teal-300 dark:bg-teal-900/70 dark:text-teal-200 dark:border-teal-700/60 font-bold",
    ctaColor: "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700",
    method: "AI Classification Model",
  },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

export default function ModuleSelectionPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  const platformFeatures = [
    { icon: Brain, label: t("moduleSelection.features.ml"), desc: t("moduleSelection.features.mlDesc") },
    { icon: Camera, label: t("moduleSelection.features.image"), desc: t("moduleSelection.features.imageDesc") },
    { icon: Activity, label: t("moduleSelection.features.early"), desc: t("moduleSelection.features.earlyDesc") },
    { icon: FlaskConical, label: t("moduleSelection.features.clinical"), desc: t("moduleSelection.features.clinicalDesc") },
  ];

  return (
    <PageWrapper className="space-y-12">
      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <motion.div
        variants={fadeUp}
        initial="hidden"
        animate="visible"
        className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-50/90 via-teal-50/60 to-slate-100 border border-emerald-200/70 text-slate-900 shadow-sm dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:border-slate-800 dark:text-white p-8 sm:p-12 transition-colors duration-300"
      >
        {/* Decorative orbs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/15 dark:bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-teal-400/15 dark:bg-teal-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300 dark:border-emerald-500/50 bg-emerald-100 dark:bg-emerald-950/80 px-4 py-1.5 text-sm font-bold text-emerald-900 dark:text-emerald-200 shadow-xs dark:shadow-emerald-950/50 backdrop-blur mb-6">
            <Stethoscope className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("moduleSelection.heroBadge")}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight mb-4 leading-tight text-slate-900 dark:text-white">
            {t("moduleSelection.heroTitle")}
          </h1>

          <p className="text-slate-600 dark:text-slate-300 max-w-2xl text-base sm:text-lg mb-8 leading-relaxed">
            {t("moduleSelection.heroSubtitle")}
          </p>

          {/* Mini stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              t("moduleSelection.stat1"),
              t("moduleSelection.stat2"),
              t("moduleSelection.stat3"),
              t("moduleSelection.stat4"),
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl bg-white/80 dark:bg-white/8 border border-emerald-200/60 dark:border-white/10 backdrop-blur px-4 py-3 text-center shadow-xs dark:shadow-none">
                <p className="text-sm font-bold text-slate-800 dark:text-white">{stat}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* ── 4 Module Cards ──────────────────────────────────────────────────── */}
      <div>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="mb-6 flex items-center gap-3"
        >
          <div className="h-1 flex-1 max-w-10 rounded-full bg-slate-200 dark:bg-slate-700" />
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
            {t("moduleSelection.selectModule")}
          </p>
          <div className="h-1 flex-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </motion.div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {MODULES_CONFIG.map((mod) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.key}
                variants={fadeUp}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                whileTap={{ scale: 0.98 }}
                className={`rounded-3xl border ${mod.border} ${mod.lightBg} p-6 sm:p-7 flex flex-col gap-5 cursor-pointer group hover:shadow-xl ${mod.glow} transition-all duration-300`}
                onClick={() => navigate(`/detect/${mod.key}`)}
              >
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className={`h-14 w-14 rounded-2xl ${mod.iconBg} flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className={`h-7 w-7 ${mod.iconColor}`} />
                  </div>
                  <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${mod.badgeStyle}`}>
                    {t(mod.badgeKey)}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                    {t(mod.titleKey)}
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t(mod.subtitleKey)}</p>
                </div>

                {/* Description */}
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t(mod.descKey)}
                </p>

                {/* What it needs */}
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
                    {t("moduleSelection.requiredInputs")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {mod.inputKeys.map((inpKey) => (
                      <span
                        key={inpKey}
                        className="text-xs bg-white/70 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-lg backdrop-blur"
                      >
                        {t(inpKey)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Method tag + CTA */}
                <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                    <Brain className="h-3.5 w-3.5" />
                    {mod.method}
                  </span>
                  <button
                    className={`inline-flex items-center gap-2 text-white text-sm font-bold px-4 py-2 rounded-xl ${mod.ctaColor} transition-all duration-200 shadow-lg ${mod.glow}`}
                    onClick={(e) => { e.stopPropagation(); navigate(`/detect/${mod.key}`); }}
                  >
                    {t("moduleSelection.startDetection")}
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      </div>

      {/* ── Platform Overview ────────────────────────────────────────────── */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        className="rounded-3xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 p-8"
      >
        <motion.div variants={fadeUp} className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            {t("moduleSelection.howItWorksTitle")}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 max-w-lg mx-auto text-sm">
            {t("moduleSelection.howItWorksSub")}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {platformFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.label}
                variants={fadeUp}
                className="text-center p-4 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60"
              >
                <div className="h-10 w-10 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center mx-auto mb-3">
                  <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">{f.label}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{f.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </PageWrapper>
  );
}
