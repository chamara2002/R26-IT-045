import React, { useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  HeartPulse,
  ShieldAlert,
  Syringe,
  Thermometer,
  Sparkles,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Activity,
  Calendar,
  Layers,
  ArrowRight,
} from "lucide-react";
import { useI18n } from "../../i18n/language-context";
import { Badge } from "../ui/index.jsx";

// ─── Module Metadata ─────────────────────────────────────────────────────────

export const MODULE_META = {
  mastitis: {
    key: "mastitis",
    title: "Mastitis Detection",
    subtitle: "Udder health, milk quality & inflammation check",
    icon: HeartPulse,
    badge: "Udder Health",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg:
      "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40",
    color: {
      gradient: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      badge:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
      button:
        "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
      ring: "ring-emerald-500",
    },
    about:
      "Mastitis is an inflammatory reaction of the udder caused by bacterial infection. Early detection significantly reduces treatment cost and prevents permanent milk production loss.",
    howItWorks:
      "Analyzes udder photographs using CNN computer vision, fused with optional milk data (temperature, yield, clots) and behavioural signals.",
    requires: "Udder photograph (required) + 5 milk quality measurements",
    method: "Image + Sensor AI",
    symptoms: [
      "Swollen, hard or hot udder",
      "Clotted, watery or bloody milk",
      "Sudden milk yield drop",
      "Milking pain / kicking",
    ],
  },
  fmd: {
    key: "fmd",
    title: "Foot-and-Mouth Disease",
    subtitle: "Viral blister & lesion identification",
    icon: ShieldAlert,
    badge: "Contagious Alert",
    iconColor: "text-orange-600 dark:text-orange-400",
    iconBg:
      "bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-900/40",
    color: {
      gradient: "from-orange-500 to-orange-600",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-200 dark:border-orange-800",
      icon: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      badge:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
      button:
        "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
      ring: "ring-orange-500",
    },
    about:
      "Foot-and-Mouth Disease (FMD) is a highly contagious viral disease affecting cloven-hoofed animals. It causes fever and blistering lesions on the mouth, tongue, and hooves.",
    howItWorks:
      "Deep convolutional neural network trained on characteristic FMD vesicular lesions in mouth and hoof photographs, combined with clinical signs and regional weather risk.",
    requires: "Mouth/hoof photograph (required) + symptom checklist",
    method: "Lesion Classifier + Weather Risk",
    symptoms: [
      "Blisters on tongue & mouth",
      "Excessive ropy drooling",
      "Severe lameness & hoof sores",
      "High fever (104°F+)",
    ],
  },
  lumpy: {
    key: "lumpy",
    title: "Lumpy Skin Disease",
    subtitle: "Cutaneous nodule & lesion detection",
    icon: Syringe,
    badge: "Skin Condition",
    iconColor: "text-violet-600 dark:text-violet-400",
    iconBg:
      "bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-900/40",
    color: {
      gradient: "from-violet-500 to-violet-600",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      border: "border-violet-200 dark:border-violet-800",
      icon: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-100 dark:bg-violet-900/30",
      badge:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
      button:
        "bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700",
      ring: "ring-violet-500",
    },
    about:
      "Lumpy Skin Disease (LSD) is a poxviral infection characterized by firm, round skin nodules across the body, fever, and enlarged superficial lymph nodes.",
    howItWorks:
      "This module detects and classifies skin nodules from the photograph (YOLOv8 + ResNet50), then combines that result with any reported clinical symptoms into a single weighted prediction.",
    requires:
      "Full-body or skin photograph (required) + clinical symptom checklist",
    method: "YOLOv8 + Clinical Staging",
    symptoms: [
      "Firm round skin nodules",
      "High fever (≥ 40°C)",
      "Swollen superficial lymph nodes",
      "Nose & eye discharge",
    ],
  },
  "milk-fever": {
    key: "milk-fever",
    title: "Milk Fever Detection",
    subtitle: "Hypocalcaemia & downer cow risk analysis",
    icon: Thermometer,
    badge: "Post-Calving",
    iconColor: "text-teal-600 dark:text-teal-400",
    iconBg:
      "bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-900/40",
    color: {
      gradient: "from-teal-500 to-teal-600",
      bg: "bg-teal-50 dark:bg-teal-900/20",
      border: "border-teal-200 dark:border-teal-800",
      icon: "text-teal-600 dark:text-teal-400",
      iconBg: "bg-teal-100 dark:bg-teal-900/30",
      badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
      button:
        "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700",
      ring: "ring-teal-500",
    },
    about:
      "Milk Fever (hypocalcaemia) occurs in dairy cows around calving when blood calcium drops rapidly. It causes muscle weakness, inability to rise, and can be fatal if untreated. Early identification is critical.",
    howItWorks:
      "This module analyses clinical observations and historical data (parity, days to calving, behavior, BCS) to predict the risk and stage of Milk Fever without lab tests.",
    requires: "Clinical observation answers (required)",
    method: "Non-invasive ML Classifier",
    symptoms: [
      "Muscle tremors or shivering",
      "Stiffness and inability to stand",
      "Cold extremities & subnormal temp",
      "Loss of appetite & dullness",
    ],
  },
};

// ─── Disease Info Panel ─────────────────────────────────────────────────────

export function DiseaseInfoPanel({ meta }) {
  const { t } = useI18n();
  const Icon = meta.icon;
  const modKey = meta.key === "milk-fever" ? "milkFever" : meta.key;

  const title = t(`modules.${modKey}`) || meta.title;
  const subtitle = t(`modules.subtitles.${modKey}`) || meta.subtitle;
  const badge = t(`modules.badges.${modKey}`) || meta.badge;
  const about = t(`modules.about.${modKey}`) || meta.about;
  const method = t(`modules.methods.${modKey}`) || meta.method;
  const requires = t(`modules.requires.${modKey}`) || meta.requires;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs space-y-4"
    >
      {/* Top row: Icon, Title, Subtitle, Category Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`h-11 w-11 rounded-xl ${meta.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                {title}
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Sparkles className="h-2.5 w-2.5" />
                AI
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-[11px] font-bold shrink-0">
          {badge}
        </Badge>
      </div>

      {/* Disease description */}
      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
        {about}
      </p>

      {/* Quick metadata chips */}
      <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
          <Activity className="h-3 w-3 text-slate-400" />
          <span className="font-semibold">{t("detection.method") || "Method"}:</span>
          <span>{method}</span>
        </div>
        <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300">
          <Layers className="h-3 w-3 text-slate-400" />
          <span className="font-semibold">{t("detection.input") || "Input"}:</span>
          <span className="truncate max-w-[200px] sm:max-w-xs">{requires}</span>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Cow Selector ───────────────────────────────────────────────────────────

export function CowSelector({ cows = [], value, onChange, disabled }) {
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {t("detectionForms.selectCow") || "Select Registered Cow"}
        </label>
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {t("detectionForms.optionalForLog") || "(Optional — saves to cow history)"}
        </span>
      </div>

      <select
        name="cowId"
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
      >
        <option value="">{t("detectionForms.noCowSelected") || "— Do not link to a cow profile —"}</option>
        {cows.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name || `Cow #${c.id}`} {c.tag_number ? `(${c.tag_number})` : ""} {c.breed ? `— ${c.breed}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

// ─── Image Upload Card ──────────────────────────────────────────────────────

export function ImageUpload({
  id = "detection-image",
  imagePreview,
  onFileChange,
  title,
  helperText,
  accept = "image/*",
}) {
  const { t } = useI18n();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const displayTitle = title || t("detectionForms.uploadUdderPhoto") || "Upload Clear Photograph";
  const displayHelper = helperText || t("detectionForms.uploadUdderSubtitle") || "PNG, JPG up to 15MB";

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
          {displayTitle} <span className="text-red-500">*</span>
        </label>
        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
          {displayHelper}
        </span>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={onFileChange}
        className="hidden"
        id={id}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept={accept}
        capture="environment"
        onChange={onFileChange}
        className="hidden"
        id={`${id}-camera`}
      />

      {imagePreview ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-900 group">
          <img
            src={imagePreview}
            alt="Upload preview"
            className="w-full h-64 object-contain bg-slate-950/40"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 rounded-xl bg-white/90 text-slate-900 text-xs font-bold hover:bg-white transition"
            >
              {t("detection.changePhoto") || "Change Photo"}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all text-center group cursor-pointer"
          >
            <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Camera className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t("detectionForms.takeUdderPhoto") || t("detection.snapCamera") || "Take Photo with Camera"}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              {t("detectionForms.liveCamera") || "Live smartphone / device camera"}
            </span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 dark:hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 transition-all text-center group cursor-pointer"
          >
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
              <Upload className="h-5 w-5" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {t("detectionForms.uploadUdderPhoto") || t("detection.chooseGallery") || "Choose from Gallery / Files"}
            </span>
            <span className="text-[11px] text-slate-400 mt-0.5">
              {t("detectionForms.fromGallery") || "Select existing photo from storage"}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Section Header ─────────────────────────────────────────────────────────

export function SectionHeader({ label, optional, badge }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
        {label}
      </h3>
      <div className="flex items-center gap-2">
        {badge && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
            {badge}
          </span>
        )}
        {optional && (
          <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
            ({t("common.optional") || "Optional"})
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Checkbox Grid ──────────────────────────────────────────────────────────

export function CheckboxGrid({ items = [], values = {}, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {items.map(([key, label]) => {
        const checked = Boolean(values[key]);
        return (
          <label
            key={key}
            className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer select-none transition-colors ${
              checked
                ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-950 dark:text-emerald-100"
                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300"
            }`}
          >
            <input
              type="checkbox"
              name={key}
              checked={checked}
              onChange={onChange}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-medium leading-snug">{label}</span>
          </label>
        );
      })}
    </div>
  );
}

// ─── Simple Generic Result Card ─────────────────────────────────────────────

export function SimpleResultCard({ result }) {
  if (!result) return null;

  const prediction =
    result.predicted_label ||
    result.prediction ||
    result.stage ||
    result.disease ||
    result.result ||
    "Result Available";

  const confidenceValue = result.confidence_score ?? result.confidence;
  const confidence =
    typeof confidenceValue === "number"
      ? `${(confidenceValue * 100).toFixed(1)}%`
      : confidenceValue != null
        ? String(confidenceValue)
        : null;

  const riskLevel = result.risk_level || result.stage || null;
  const recommendation =
    result.recommendation ||
    result.advice ||
    result.message ||
    result.details ||
    "";

  const predStr = String(prediction || "").toLowerCase();
  const riskStr = String(riskLevel || "").toLowerCase();

  const isHealthy =
    predStr === "normal" ||
    predStr.includes("healthy") ||
    predStr.includes("no mastitis") ||
    predStr.includes("negative") ||
    riskStr.includes("healthy") ||
    riskStr.includes("negative") ||
    riskStr.includes("low");

  const isCritical =
    !isHealthy &&
    (predStr.includes("severe") ||
      predStr.includes("critical") ||
      riskStr.includes("severe") ||
      riskStr.includes("critical") ||
      riskStr.includes("high"));

  const isWarning = !isHealthy && !isCritical;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div
        className={`rounded-2xl border p-6 shadow-xs space-y-4 ${
          isCritical
            ? "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60"
            : isWarning
              ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60"
              : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isCritical ? (
              <XCircle className="h-5 w-5 text-red-600" />
            ) : isWarning ? (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            )}
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Assessment Summary
            </h3>
          </div>
          {riskLevel && (
            <Badge
              variant={isCritical ? "destructive" : isWarning ? "warning" : "success"}
            >
              {riskLevel}
            </Badge>
          )}
        </div>

        <div className="text-lg font-bold text-slate-900 dark:text-white">
          {prediction}
        </div>

        {recommendation && (
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            {recommendation}
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-500">
          {confidence && <span>Model Confidence: {confidence}</span>}
          {riskLevel && <span>Risk Level: {riskLevel}</span>}
        </div>
      </div>
    </motion.div>
  );
}
