import { motion } from "framer-motion";
import {
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Thermometer,
  Droplets,
  Activity,
  Calendar,
  Layers,
  HelpCircle,
} from "lucide-react";
import { Badge, Card } from "./ui/index.jsx";
import { useI18n } from "../i18n/language-context";

export default function AssessmentComparisonCard({ comparisonData, cowName }) {
  const { t } = useI18n();

  if (!comparisonData || !comparisonData.has_comparison) {
    return (
      <Card className="p-5 sm:p-6 space-y-3 border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-slate-400" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            {t("comparison.title") || "Previous vs Current Assessment Comparison"}
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {comparisonData?.message || (t("comparison.noPrevious") || "At least two saved assessments are required for automated side-by-side comparison.")}
        </p>
      </Card>
    );
  }

  const comp = comparisonData.comparison || {};
  const sev = comp.severity || {};
  const metrics = comp.metrics || {};
  const obs = comp.clinical_observations || {};

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold">
              <Layers className="h-4 w-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t("comparison.title") || "Previous vs Current Assessment Comparison"}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("comparison.subtitle") || `Automated delta tracking between the two most recent saved screenings for ${cowName || "this cow"}.`}
          </p>
        </div>

        {/* Date Transition Pill */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold">
          <Calendar className="h-3.5 w-3.5 text-slate-400" />
          <span>{comp.previous_date || "Previous"}</span>
          <ArrowRight className="h-3 w-3 text-slate-400" />
          <span className="text-slate-900 dark:text-white font-bold">{comp.current_date || "Current"}</span>
        </div>
      </div>

      {/* Severity & Confidence Delta Header Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Severity Comparison Tile */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-800/80 dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t("comparison.severityShift") || "Severity Classification"}
          </p>
          <div className="flex items-center gap-3">
            <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
              {sev.previous || "N/A"}
            </span>
            <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
            <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              {sev.current || "N/A"}
            </span>
            <span
              className={`ml-auto px-2 py-0.5 rounded-md text-[11px] font-bold ${
                sev.change === "Increased"
                  ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                  : sev.change === "Decreased"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"
              }`}
            >
              {sev.change === "Increased" ? `⚠️ ${t("comparison.increased") || "Increased"}` : sev.change === "Decreased" ? `🟢 ${t("comparison.decreased") || "Decreased"}` : `⚪ ${t("comparison.unchanged") || "Unchanged"}`}
            </span>
          </div>
        </div>

        {/* Confidence Comparison Tile */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-indigo-50/40 dark:from-slate-800/80 dark:to-indigo-950/20 border border-slate-200/80 dark:border-slate-700/80 space-y-2">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t("comparison.confidenceShift") || "Assessment Confidence"}
          </p>
          {comp.confidence?.available ? (
            <div className="flex items-center gap-3">
              <span className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400">
                {comp.confidence.previous}
              </span>
              <ArrowRight className="h-4 w-4 text-slate-400 shrink-0" />
              <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                {comp.confidence.current}
              </span>
              <span className="ml-auto px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 text-[11px] font-mono font-bold">
                {comp.confidence.delta}
              </span>
            </div>
          ) : (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">
              {t("comparison.notAvailable") || "Not available for comparison"}
            </p>
          )}
        </div>
      </div>

      {/* Numerical Model Features Comparison Grid */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {t("comparison.numericalBiomarkers") || "Model Features Delta"}
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Milk Temperature */}
          <MetricDeltaTile
            label={t("detectionForms.milkTemperature") || "Milk Temp"}
            metric={metrics.milk_temperature || metrics.temperature}
            icon={Thermometer}
            preferred="lower"
          />
          {/* Milk Conductivity */}
          <MetricDeltaTile
            label={t("detectionForms.milkConductivity") || "Conductivity"}
            metric={metrics.milk_conductivity}
            icon={Activity}
            preferred="lower"
          />
          {/* Milk pH */}
          <MetricDeltaTile
            label={t("detectionForms.milkPh") || "Milk pH"}
            metric={metrics.milk_ph}
            icon={Layers}
            preferred="none"
          />
          {/* Milk Yield */}
          <MetricDeltaTile
            label={t("detectionForms.milkYieldLiters") || "Milk Yield"}
            metric={metrics.milk_yield}
            icon={Activity}
            preferred="higher"
          />
          {/* Milk Clotting */}
          <MetricDeltaTile
            label={t("detectionForms.clotting") || "Milk Clotting"}
            metric={metrics.clotting}
            icon={Layers}
            preferred="lower"
          />
        </div>
      </div>

      {/* Clinical Questionnaire Observations */}
      <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          {t("comparison.clinicalObservations") || "Clinical Observations Comparison"}
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          <ClinicalObsRow label={t("detectionForms.udderSwelling") || "Udder Swelling"} obs={obs.swelling} />
          <ClinicalObsRow label={t("detectionForms.udderPain") || "Udder Pain"} obs={obs.pain} />
          <ClinicalObsRow label={t("detectionForms.udderWarmth") || "Udder Warmth"} obs={obs.warmth} />
          <ClinicalObsRow label={t("detectionForms.milkAppearance") || "Milk Appearance"} obs={obs.appearance} />
          <ClinicalObsRow label={t("detectionForms.appetite") || "Appetite"} obs={obs.appetite} />
        </div>
      </div>
    </Card>
  );
}

function MetricDeltaTile({ label, metric, icon: Icon, preferred = "lower" }) {
  const { t } = useI18n();

  if (!metric || !metric.available) {
    return (
      <div className="p-3.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 space-y-1">
        <div className="flex items-center gap-1.5 text-slate-400">
          <Icon className="h-3.5 w-3.5" />
          <p className="text-[11px] font-semibold">{label}</p>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500 italic">
          {t("comparison.notAvailable") || "Not available for comparison"}
        </p>
      </div>
    );
  }

  const isGood =
    preferred === "lower"
      ? metric.direction === "decreased"
      : metric.direction === "increased";

  const isBad =
    preferred === "lower"
      ? metric.direction === "increased"
      : metric.direction === "decreased";

  return (
    <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-800/70 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <Icon className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          <p className="text-[11px] font-semibold">{label}</p>
        </div>
        {metric.direction !== "unchanged" && (
          <span
            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
              isGood
                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                : isBad
                ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                : "bg-slate-100 text-slate-700"
            }`}
          >
            {metric.pct_change}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="text-slate-500 dark:text-slate-400">{metric.previous}</span>
        <ArrowRight className="h-3 w-3 text-slate-400 shrink-0" />
        <span className="font-bold text-slate-900 dark:text-white">{metric.current}</span>
      </div>
    </div>
  );
}

function ClinicalObsRow({ label, obs }) {
  const { t } = useI18n();

  if (!obs || !obs.available) {
    return (
      <div className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-800/20 text-[11px]">
        <p className="text-slate-400 dark:text-slate-500 font-medium">{label}</p>
        <p className="text-slate-400 italic text-[10px]">{t("comparison.notAvailable") || "Not recorded"}</p>
      </div>
    );
  }

  return (
    <div className={`p-2.5 rounded-lg border text-[11px] ${
      obs.changed
        ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/40 dark:bg-amber-950/20"
        : "border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-800/50"
    }`}>
      <p className="font-semibold text-slate-700 dark:text-slate-300">{label}</p>
      <div className="flex items-center gap-1.5 mt-0.5 text-[10px]">
        <span className="text-slate-500">{obs.previous}</span>
        <ArrowRight className="h-2.5 w-2.5 text-slate-400" />
        <span className={`font-bold ${obs.changed ? "text-amber-800 dark:text-amber-300" : "text-slate-800 dark:text-slate-200"}`}>
          {obs.current}
        </span>
      </div>
    </div>
  );
}
