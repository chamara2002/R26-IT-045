/**
 * DetectionPage — Disease-specific detection form for each of the 4 ML modules.
 * Route: /detect/:moduleKey  (mastitis | fmd | lumpy | milk-fever)
 *
 * Each disease renders its own form matching the Disease Detection Modules 1st page
 * design system (clean, minimal, professional, consistent cards & clinical sign pills).
 */

import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper from "../components/PageWrapper";
import {
  Upload,
  ArrowLeft,
  CheckCircle,
  Loader,
  HeartPulse,
  ShieldAlert,
  Syringe,
  Thermometer,
  Info,
  Camera,
  Stethoscope,
  AlertCircle,
  Activity,
  Sparkles,
  CloudSun,
  MapPin,
  RefreshCw,
  Clock,
  ChevronRight,
  Droplets,
  Crop,
  Check,
  RotateCcw,
} from "lucide-react";
import { Card, Button, Input, Alert, Badge } from "../components/ui/index.jsx";
import { useToast } from "../hooks/useToast";
import { useI18n } from "../i18n/language-context";
import DetectionResultCard from "../components/DetectionResultCard";
import UdderCropEditor from "../components/UdderCropEditor";
import {
  getCows,
  predictMastitisAssisted,
  predictFMDAssisted,
  predictLSDAssisted,
  predictMilkFever,
} from "../services/api";

// ─── Constants for Milk Fever ───────────────────────────────────────────────

const BEHAVIORAL_OPTIONS = [
  { value: "normal", label: "Normal behavior (alert & active)", score: 100 },
  { value: "reduced_movement", label: "Reduced movement / sluggish gait", score: 40 },
  { value: "muscle_tremors", label: "Muscle tremors / visible shivering", score: 20 },
  { value: "unable_to_stand", label: "Unable to stand / sternal or lateral recumbency", score: 5 },
];

const BCS_OPTIONS = [
  { value: 2.0, label: "Very Thin (BCS 1–2)" },
  { value: 2.5, label: "Thin (BCS 2–2.5)" },
  { value: 3.0, label: "Normal (BCS 3.0)" },
  { value: 3.5, label: "Good / Well conditioned (BCS 3.5)" },
  { value: 4.5, label: "Over-conditioned / Fat (BCS 4–5)" },
];

const EATING_OPTIONS = [
  { value: 100, label: "Eating normally (100%)" },
  { value: 60, label: "Eating less than usual (approx 60%)" },
  { value: 20, label: "Barely eating / picking (approx 20%)" },
  { value: 5, label: "Not eating at all (anorexic)" },
];

const STAGE_COLORS = {
  Subclinical: {
    bg: "bg-blue-50/70 dark:bg-blue-950/30",
    border: "border-blue-200 dark:border-blue-900/60",
    text: "text-blue-800 dark:text-blue-300",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  },
  Mild: {
    bg: "bg-amber-50/70 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900/60",
    text: "text-amber-800 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
  },
  Moderate: {
    bg: "bg-orange-50/70 dark:bg-orange-950/30",
    border: "border-orange-200 dark:border-orange-900/60",
    text: "text-orange-800 dark:text-orange-300",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  },
  Critical: {
    bg: "bg-red-50/70 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900/60",
    text: "text-red-800 dark:text-red-300",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  },
};

// ─── Per-module metadata (Synced with ModuleSelectionPage) ──────────────────

const MODULE_META = {
  mastitis: {
    key: "mastitis",
    title: "Mastitis Detection",
    subtitle: "Udder health, milk quality & inflammation check",
    icon: HeartPulse,
    badge: "Udder Health",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg:
      "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40",
    about:
      "Mastitis is an inflammatory reaction of the udder caused by bacterial infection. Early detection significantly reduces treatment cost and prevents permanent milk production loss.",
    howItWorks:
      "Analyzes udder photographs using CNN computer vision, fused with optional milk data (temperature, yield, clots) and behavioural signals.",
    requires: "Udder photograph (required) + optional milk & behaviour signs",
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
    about:
      "Foot-and-Mouth Disease (FMD) is a highly contagious viral disease affecting cloven-hoofed animals. It causes fever and blistering lesions on the mouth, tongue, and hooves.",
    howItWorks:
      "Deep convolutional neural network trained on characteristic FMD vesicular lesions in mouth and hoof photographs, combined with clinical signs.",
    requires: "Mouth/hoof photograph (required) + symptom checklist",
    method: "Lesion Classifier",
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
    about:
      "Lumpy Skin Disease (LSD) is a poxviral infection characterized by firm, round skin nodules across the body, fever, and enlarged superficial lymph nodes.",
    howItWorks:
      "Applies computer vision object detection to identify, localize, and count characteristic nodular skin lesions across photographs.",
    requires: "Full-body or skin photograph (required) + nodule & fever data",
    method: "Nodule Detection AI",
    symptoms: [
      "Raised skin lumps (2–5cm)",
      "Eye & nasal discharge",
      "Swollen lymph nodes",
      "Fever & loss of appetite",
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
    about:
      "Milk Fever (parturient paresis / hypocalcaemia) occurs around calving when blood calcium drops sharply. It causes muscle weakness, downer paralysis, and collapse if untreated.",
    howItWorks:
      "Evaluates clinical observations, parity, days since calving, body condition score (BCS), and neurological symptoms without requiring blood lab work.",
    requires: "Clinical observation responses (required)",
    method: "Clinical Assessment",
    symptoms: [
      "Downer cow unable to stand",
      "Cold ears & low body temp",
      "Muscle tremors & S-curve neck",
      "Glassy eyes & weakness",
    ],
  },
};

// ─── Shared Sub-Components ──────────────────────────────────────────────────

function DiseaseInfoPanel({ meta }) {
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
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {subtitle}
            </p>
          </div>
        </div>

        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
          {badge}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
        {about}
      </p>

      {/* Key Clinical Signs Pills (Matching ModuleSelectionPage) */}
      {meta.symptoms && (
        <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            <AlertCircle size={12} className="text-amber-500" />
            <span>{t("detection.keySignsToCheck") || "Key Clinical Signs to Check:"}</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {meta.symptoms.map((symptom, sIdx) => (
              <span
                key={sIdx}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-medium"
              >
                {t(`modules.symptoms.${modKey}.${sIdx}`) || symptom}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/40">
          {method}
        </span>
        <span className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
          <Info size={12} />
          {requires}
        </span>
      </div>
    </motion.div>
  );
}

function CowSelector({ cows, value, onChange }) {
  const { t } = useI18n();

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
        {t("detection.selectCattle") || "Select Cattle"} <span className="text-slate-400 font-normal">({t("detection.selectCattleOpt") || "Optional — links result to cattle profile"})</span>
      </label>
      <select
        name="cowId"
        value={value}
        onChange={onChange}
        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2.5 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-shadow"
      >
        <option value="">{t("detection.noSpecificCow") || "No specific cow (general herd assessment)"}</option>
        {cows.map((cow) => (
          <option key={cow.id} value={cow.id}>
            {cow.tag_id || cow.name} — {cow.breed} ({cow.gender || "Female"})
          </option>
        ))}
      </select>
    </div>
  );
}

function ImageUpload({ id, imagePreview, onFileChange, title, subtitle = "JPG, PNG up to 10 MB" }) {
  const { t } = useI18n();
  const cameraInputId = `${id}-camera`;
  const galleryInputId = `${id}-gallery`;
  const defaultTitle = t("detection.cowImage") || "Upload Photograph";

  return (
    <div className="space-y-2.5">
      <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
        <span>{title || defaultTitle}</span>
        <span className="text-rose-500 font-bold ml-1">*</span>
      </label>

      {/* Hidden file inputs: one with capture="environment" for rear camera, one for gallery */}
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onFileChange}
        className="hidden"
        id={cameraInputId}
      />
      <input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="hidden"
        id={galleryInputId}
      />

      {!imagePreview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Option 1: Mobile Camera Direct */}
          <label
            htmlFor={cameraInputId}
            className="flex sm:flex-col items-center justify-center gap-3 cursor-pointer rounded-2xl border-2 border-dashed border-emerald-300 dark:border-emerald-700/80 bg-emerald-50/50 dark:bg-emerald-950/30 p-4 sm:p-6 text-center hover:bg-emerald-100/50 dark:hover:bg-emerald-900/40 active:scale-[0.98] transition-all shadow-2xs"
          >
            <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Camera className="h-6 w-6" />
            </div>
            <div className="text-left sm:text-center">
              <p className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                {t("detection.snapCamera") || "Snap Photo (Camera)"}
              </p>
              <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 mt-0.5">
                {t("detection.cowImage") || "Use device camera"}
              </p>
            </div>
          </label>

          {/* Option 2: Choose from Photos/Gallery */}
          <label
            htmlFor={galleryInputId}
            className="flex sm:flex-col items-center justify-center gap-3 cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800/40 p-4 sm:p-6 text-center hover:bg-slate-50 dark:hover:bg-slate-800 active:scale-[0.98] transition-all shadow-2xs"
          >
            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Upload className="h-6 w-6" />
            </div>
            <div className="text-left sm:text-center">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {t("detection.chooseGallery") || "Choose from Gallery"}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {subtitle}
              </p>
            </div>
          </label>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 shadow-md"
        >
          <img
            src={imagePreview}
            alt="Uploaded preview"
            className="w-full max-h-72 sm:max-h-80 object-contain mx-auto"
          />
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg backdrop-blur-xs">
              <CheckCircle className="h-4 w-4" />
              {t("detection.imageUploaded") || "Photo Loaded"}
            </span>
            <div className="flex gap-2 pointer-events-auto">
              <label
                htmlFor={cameraInputId}
                className="px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-bold cursor-pointer transition-all backdrop-blur-md active:scale-95 shadow-md flex items-center gap-1"
              >
                <Camera className="h-3.5 w-3.5" />
                {t("detection.retakePhoto") || "Retake"}
              </label>
              <label
                htmlFor={galleryInputId}
                className="px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 text-white text-xs font-bold cursor-pointer transition-all backdrop-blur-md active:scale-95 shadow-md flex items-center gap-1"
              >
                <Upload className="h-3.5 w-3.5" />
                {t("detection.changePhoto") || "Change"}
              </label>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function SectionHeader({ label, optional = false, className = "" }) {
  return (
    <div className={`flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800 ${className}`}>
      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
        {label}
      </h3>
      {optional && (
        <span className="text-xs font-normal text-slate-400 dark:text-slate-500">
          (Optional)
        </span>
      )}
    </div>
  );
}

function CheckboxGrid({ items, values, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {items.map(([name, label]) => {
        const checked = Boolean(values[name]);
        return (
          <label
            key={name}
            className={`flex items-center gap-3 p-3 sm:p-3.5 rounded-xl border transition-all cursor-pointer text-xs sm:text-sm font-medium active:scale-[0.99] select-none ${checked
                ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 text-emerald-900 dark:text-emerald-100 shadow-2xs"
                : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
              }`}
          >
            <input
              type="checkbox"
              name={name}
              checked={checked}
              onChange={onChange}
              className="h-5 w-5 rounded-md border-slate-300 dark:border-slate-600 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
            />
            <span className="leading-snug">{label}</span>
          </label>
        );
      })}
    </div>
  );
}

// ─── Module-Specific Forms ──────────────────────────────────────────────────

function MastitisForm({
  form,
  onChange,
  onFileChange,
  imagePreview,
  cows,
  originalImageFile,
  originalPreviewUrl,
  croppedImageFile,
  cropPreviewUrl,
  roiCoordinates,
  isCroppingUdder,
  onConfirmUdderCrop,
  onCancelUdderCrop,
  onStartUdderCrop,
  onRetakeUdderPhoto,
}) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <CowSelector cows={cows} value={form.cowId} onChange={onChange} />

      {/* ── Udder Image & Farmer-Guided ROI Crop Selection ─────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <SectionHeader label={t("detectionForms.uploadUdderHeader") || "Udder Photograph & Region Focus"} />
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {t("detectionForms.uploadUdderBadge") || "Udder photo required for visual check"}
          </span>
        </div>

        {/* ── Farmer Photo Reference Guide (Sample Udder Image) ─────────────── */}
        <div className="rounded-2xl border border-emerald-200/90 dark:border-emerald-800/70 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/60 dark:from-emerald-950/30 dark:via-slate-900 dark:to-teal-950/20 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4">
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-xl overflow-hidden border-2 border-emerald-500 shadow-md bg-slate-900 mx-auto sm:mx-0">
              <img
                src="/images/udder.jpg"
                alt="Sample Cattle Udder Photograph"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1 inset-x-1 text-center px-1 py-0.5 rounded bg-emerald-700/90 text-white text-[10px] font-bold shadow-xs">
                ✓ Sample Photo
              </span>
            </div>
            <div className="space-y-2 flex-1 text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {t("detection.photoGuideTitle") || "Sample Udder Photo Guide"}
                </h4>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {t("detection.photoGuideDesc") || "Take a clear, well-lit photo of the cow's udder like this sample image (all quarters & teats visible):"}
              </p>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100/70 dark:bg-emerald-900/40 text-emerald-900 dark:text-emerald-200 text-[11px] font-medium border border-emerald-200/60 dark:border-emerald-800/50">
                {t("detection.photoGuideTips") || "✓ Good Lighting  •  ✓ Full Udder Visible  •  ✓ Clean Camera Lens"}
              </div>
            </div>
          </div>
        </div>

        {isCroppingUdder && originalPreviewUrl ? (
          <UdderCropEditor
            imageUrl={originalPreviewUrl}
            imageFile={originalImageFile}
            onConfirmCrop={onConfirmUdderCrop}
            onCancel={onCancelUdderCrop}
            onRetake={onRetakeUdderPhoto}
          />
        ) : croppedImageFile && cropPreviewUrl ? (
          <div className="rounded-2xl border border-teal-200 dark:border-teal-900/60 bg-teal-50/40 dark:bg-teal-950/20 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-900 dark:text-teal-200">
                <CheckCircle className="h-4 w-4 text-teal-600 dark:text-teal-400" />
                Udder Focus Area Confirmed
              </span>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onStartUdderCrop}
                  className="gap-1.5 text-xs font-semibold rounded-xl"
                >
                  <Crop className="h-3.5 w-3.5 text-teal-600" />
                  <span>Adjust Area</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={onRetakeUdderPhoto}
                  className="text-xs font-semibold rounded-xl text-slate-500 hover:text-slate-700"
                >
                  Retake Photo
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Original Photograph */}
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-900 relative">
                <img
                  src={originalPreviewUrl || imagePreview}
                  alt="Original Udder Photograph"
                  className="w-full h-44 object-contain"
                />
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-medium backdrop-blur-xs">
                  Original Photograph (Report Evidence)
                </span>
              </div>

              {/* Selected Udder ROI (Model 1 Input) */}
              <div className="rounded-xl overflow-hidden border-2 border-teal-500 bg-slate-900 relative shadow-sm">
                <img
                  src={cropPreviewUrl}
                  alt="Selected Udder Region"
                  className="w-full h-44 object-contain"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-teal-600 text-white text-[10px] font-bold shadow-xs">
                  Selected Udder Area
                </div>
                <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/70 text-teal-300 text-[10px] font-mono backdrop-blur-xs">
                  ROI: {roiCoordinates?.width || 224} × {roiCoordinates?.height || 224} px
                </span>
              </div>
            </div>

            <p className="text-[11px] text-teal-800 dark:text-teal-300/90 leading-relaxed">
              <strong>Focus Optimization:</strong> Background stall and leg elements are excluded so the AI focuses accurately on the udder and teats.
            </p>
          </div>
        ) : (
          <ImageUpload
            id="mastitis-image"
            imagePreview={imagePreview}
            onFileChange={onFileChange}
            title={t("detectionForms.uploadUdderPhoto") || "Upload ONE Udder Photograph"}
            subtitle={t("detectionForms.uploadUdderSubtitle") || "Clear photo of the udder & teats (JPG, PNG up to 10 MB). Step 1 of 2: Upload, then select udder area."}
          />
        )}
      </div>

      {/* ── Required Health Parameters (5 Features) ───────────────────────── */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <SectionHeader label={t("detectionForms.requiredClinicalParameters") || "Required Cow Health Details"} />
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
            {t("detectionForms.mastitisParametersSubtitle") || "All 5 health details required for analysis"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Milk_Temperature */}
          <div className="space-y-1.5">
            <Input
              label={t("detectionForms.milkTemperature") || "Milk Temperature (°C)"}
              type="number"
              step="0.01"
              min="30"
              max="45"
              name="milkTemperature"
              value={form.milkTemperature}
              onChange={onChange}
              placeholder={t("detectionForms.milkTemperaturePlaceholder") || "e.g. 36.5"}
              required
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {t("detectionForms.milkTemperatureHelp") || "Fresh milk temperature (normal range: 35.0 – 37.0 °C, milk temp, not rectal/body)"}
            </p>
          </div>

          {/* 2. Milk_pH */}
          <div className="space-y-1.5">
            <Input
              label={t("detectionForms.milkPh") || "Milk pH"}
              type="number"
              step="0.01"
              min="6.0"
              max="8.0"
              name="milkPh"
              value={form.milkPh}
              onChange={onChange}
              placeholder={t("detectionForms.milkPhPlaceholder") || "e.g. 6.65"}
              required
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {t("detectionForms.milkPhHelp") || "Milk acidity/pH level (normal fresh milk: 6.5 – 6.8)"}
            </p>
          </div>

          {/* 3. Milk_Conductivity */}
          <div className="space-y-1.5">
            <Input
              label={t("detectionForms.milkConductivity") || "Milk Conductivity (mS/cm)"}
              type="number"
              step="0.01"
              min="3.0"
              max="10.0"
              name="milkConductivity"
              value={form.milkConductivity}
              onChange={onChange}
              placeholder={t("detectionForms.milkConductivityPlaceholder") || "e.g. 4.85"}
              required
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {t("detectionForms.milkConductivityHelp") || "Electrical conductivity of milk (normal: 4.0 – 5.5 mS/cm)"}
            </p>
          </div>

          {/* 4. Milk_Yield */}
          <div className="space-y-1.5">
            <Input
              label={t("detectionForms.milkYieldLiters") || "Milk Yield (L/day)"}
              type="number"
              step="0.1"
              min="0"
              max="50"
              name="milkYield"
              value={form.milkYield}
              onChange={onChange}
              placeholder={t("detectionForms.milkYieldPlaceholder") || "e.g. 18.5"}
              required
            />
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {t("detectionForms.milkYieldHelp") || "Current daily milk production volume in Liters"}
            </p>
          </div>

          {/* 5. Clotting */}
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
              {t("detectionForms.clotting") || "Milk Clotting"} <span className="text-rose-500 font-bold ml-1">*</span>
            </label>
            <select
              name="clotting"
              value={form.clotting !== undefined ? String(form.clotting) : "0"}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-sm h-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900"
              required
            >
              <option value="0">{t("detectionForms.noClotting") || "0 - No Clotting (Normal)"}</option>
              <option value="1">{t("detectionForms.clottingPresent") || "1 - Clotting / Flakes Present"}</option>
            </select>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              {t("detectionForms.clottingHelp") || "Presence of visible clots, flakes, or abnormal curdling in milk"}
            </p>
          </div>
        </div>
      </div>

      {/* ── Optional Clinical Observations (Farmer Questionnaire) ──────────── */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800">
          <SectionHeader label={t("detectionForms.clinicalObservations") || "Clinical Observations"} optional />
          <span className="text-[11px] text-slate-400 dark:text-slate-500">
            {t("detectionForms.easyFarmerQuestionnaire") || "Easy farmer questionnaire"}
          </span>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("detectionForms.farmerQuestionnaireNote") || "Optional clinical questions designed to be easy for farmers to record visible signs."}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("detectionForms.milkYieldChange") || "Milk Yield Change"}
            </label>
            <select
              name="milkYieldChange"
              value={form.milkYieldChange}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-sm h-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900"
            >
              <option value="">{t("detectionForms.select") || "Select…"}</option>
              <option value="Normal">{t("detectionForms.normal") || "Normal"}</option>
              <option value="Decreased">{t("detectionForms.decreased") || "Decreased"}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("detectionForms.milkAppearance") || "Milk Appearance"}
            </label>
            <select
              name="milkAppearance"
              value={form.milkAppearance}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-sm h-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900"
            >
              <option value="">{t("detectionForms.select") || "Select…"}</option>
              <option value="Normal">{t("detectionForms.normal") || "Normal"}</option>
              <option value="Watery">{t("detectionForms.watery") || "Watery"}</option>
              <option value="Clots / Flakes">{t("detectionForms.clotsFlakes") || "Clots / Flakes"}</option>
              <option value="Blood-stained">{t("detectionForms.bloodStained") || "Blood-stained"}</option>
              <option value="Other">{t("detectionForms.other") || "Other"}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("detectionForms.milkClotting") || "Milk Clotting"}
            </label>
            <select
              name="milkClotting"
              value={form.milkClotting}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-sm h-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900"
            >
              <option value="">{t("detectionForms.select") || "Select…"}</option>
              <option value="No">{t("common.no") || "No"}</option>
              <option value="Yes">{t("common.yes") || "Yes"}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("detectionForms.udderSwelling") || "Udder Swelling"}
            </label>
            <select
              name="udderSwelling"
              value={form.udderSwelling}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-sm h-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900"
            >
              <option value="">{t("detectionForms.select") || "Select…"}</option>
              <option value="No">{t("common.no") || "No"}</option>
              <option value="Yes">{t("common.yes") || "Yes"}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("detectionForms.udderWarmth") || "Udder Warmth"}
            </label>
            <select
              name="udderWarmth"
              value={form.udderWarmth}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-sm h-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900"
            >
              <option value="">{t("detectionForms.select") || "Select…"}</option>
              <option value="Normal">{t("detectionForms.normal") || "Normal"}</option>
              <option value="Increased">{t("detectionForms.increased") || "Increased"}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("detectionForms.udderPain") || "Udder Pain"}
            </label>
            <select
              name="udderPain"
              value={form.udderPain}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-sm h-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900"
            >
              <option value="">{t("detectionForms.select") || "Select…"}</option>
              <option value="No">{t("common.no") || "No"}</option>
              <option value="Yes">{t("common.yes") || "Yes"}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("detectionForms.bodyTemperature") || "Body Temperature"}
            </label>
            <select
              name="bodyTemperature"
              value={form.bodyTemperature}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-sm h-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900"
            >
              <option value="">{t("detectionForms.select") || "Select…"}</option>
              <option value="Normal">{t("detectionForms.normal") || "Normal"}</option>
              <option value="High">{t("detectionForms.high") || "High"}</option>
              <option value="Not Known">{t("detectionForms.notKnown") || "Not Known"}</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("detectionForms.appetite") || "Appetite"}
            </label>
            <select
              name="appetite"
              value={form.appetite}
              onChange={onChange}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-3.5 py-2 text-xs sm:text-sm h-10 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900"
            >
              <option value="">{t("detectionForms.select") || "Select…"}</option>
              <option value="Normal">{t("detectionForms.normal") || "Normal"}</option>
              <option value="Reduced">{t("detectionForms.reduced") || "Reduced"}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function FMDForm({ form, onChange, onFileChange, imagePreview, cows }) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <CowSelector cows={cows} value={form.cowId} onChange={onChange} />
      <ImageUpload
        id="fmd-image"
        imagePreview={imagePreview}
        onFileChange={onFileChange}
        title={t("detectionForms.uploadFMDPhoto") || "Upload Mouth or Hoof Photograph"}
        subtitle={t("detectionForms.uploadFMDSubtitle") || "Clear photo of dental pad, tongue, muzzle, or interdigital hoof cleft"}
      />

      <div className="space-y-3 pt-2">
        <SectionHeader label={t("detectionForms.fmdClinicalSymptoms") || "FMD Clinical Symptoms"} optional />
        <CheckboxGrid
          items={[
            ["lesionsInMouth", t("detectionForms.lesionsInMouth") || "Blisters / ulcers in mouth or tongue"],
            ["lesionsOnHooves", t("detectionForms.lesionsOnHooves") || "Lesions or sores between hooves"],
            ["excessiveDrooling", t("detectionForms.excessiveDrooling") || "Excessive ropy drooling / salivation"],
            ["highFever", t("detectionForms.highFever") || "High fever (≥ 40°C / 104°F)"],
            ["lamenessOrLimping", t("detectionForms.lamenessOrLimping") || "Severe lameness / limping"],
            ["reluctanceToWalk", t("detectionForms.reluctanceToWalk") || "Reluctance to stand or walk"],
            ["milkDropInDairy", t("detectionForms.milkDropInDairy") || "Sudden sharp drop in milk yield"],
            ["reducedFeedIntake", t("detectionForms.reducedFeedIntake") || "Loss of appetite / unable to chew"],
          ]}
          values={form}
          onChange={onChange}
        />
      </div>

      <div className="space-y-3 pt-2">
        <SectionHeader label={t("detectionForms.additionalMeasurements") || "Additional Clinical Measurements"} optional />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("detectionForms.bodyTemperatureC") || "Body Temperature (°C)"}
            type="number"
            step="0.1"
            name="bodyTemperature"
            value={form.bodyTemperature || ""}
            onChange={onChange}
            placeholder="e.g. 40.5"
          />
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              {t("detectionForms.primaryLesionLocation") || "Primary Lesion Location"}
            </label>
            <select
              name="lesionLocation"
              value={form.lesionLocation || ""}
              onChange={onChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t("detectionForms.selectLocation") || "Select location…"}</option>
              <option value="mouth_only">{t("detectionForms.mouthOnly") || "Mouth / Tongue only"}</option>
              <option value="hooves_only">{t("detectionForms.hoovesOnly") || "Hooves / Feet only"}</option>
              <option value="both">{t("detectionForms.bothMouthFeet") || "Both mouth and feet"}</option>
              <option value="udder">{t("detectionForms.teatsUdder") || "Teats / Udder"}</option>
              <option value="multiple">{t("detectionForms.multipleRegions") || "Multiple body regions"}</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}

function LSDForm({ form, onChange, onFileChange, imagePreview, cows }) {
  const { t } = useI18n();

  return (
    <div className="space-y-6">
      <CowSelector cows={cows} value={form.cowId} onChange={onChange} />
      <ImageUpload
        id="lsd-image"
        imagePreview={imagePreview}
        onFileChange={onFileChange}
        title={t("detectionForms.uploadLSDPhoto") || "Upload Skin or Body Photograph"}
        subtitle={t("detectionForms.uploadLSDSubtitle") || "Clear photo showing skin nodules, neck, limbs, or body surface"}
      />

      <div className="space-y-3 pt-2">
        <SectionHeader label={t("detectionForms.lsdClinicalSymptoms") || "LSD Clinical Symptoms"} optional />
        <CheckboxGrid
          items={[
            ["skinNodules", t("detectionForms.skinNodules") || "Firm, raised nodules (2–5 cm) on body"],
            ["noduleOnHead", t("detectionForms.noduleOnHead") || "Nodules on head, neck or muzzle"],
            ["noduleOnLegs", t("detectionForms.noduleOnLegs") || "Nodules on legs / lower limbs"],
            ["swollenLymphNodes", t("detectionForms.swollenLymphNodes") || "Enlarged prescapular lymph nodes"],
            ["highFever", t("detectionForms.highFever") || "High fever (≥ 40°C / 104°F)"],
            ["nasalDischarge", t("detectionForms.nasalDischarge") || "Nasal or ocular discharge"],
            ["reducedMilkProduction", t("detectionForms.reducedMilkProduction") || "Reduced milk production"],
            ["decreasedAppetite", t("detectionForms.decreasedAppetite") || "Decreased appetite / lethargy"],
          ]}
          values={form}
          onChange={onChange}
        />
      </div>

      <div className="space-y-3 pt-2">
        <SectionHeader label={t("detectionForms.lesionQuantification") || "Lesion Quantification"} optional />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t("detectionForms.approxNoduleCount") || "Approximate Nodule Count"}
            type="number"
            name="noduleCount"
            value={form.noduleCount || ""}
            onChange={onChange}
            placeholder="e.g. 15"
          />
          <Input
            label={t("detectionForms.bodyTemperatureC") || "Body Temperature (°C)"}
            type="number"
            step="0.1"
            name="bodyTemperature"
            value={form.bodyTemperature || ""}
            onChange={onChange}
            placeholder="e.g. 40.8"
          />
        </div>
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
            {t("detectionForms.noduleDistribution") || "Nodule Distribution Pattern"}
          </label>
          <select
            name="noduleDistribution"
            value={form.noduleDistribution || ""}
            onChange={onChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">{t("detectionForms.selectDistribution") || "Select distribution…"}</option>
            <option value="localised">{t("detectionForms.localised") || "Localised (isolated few lumps)"}</option>
            <option value="scattered">{t("detectionForms.scattered") || "Scattered across neck/body"}</option>
            <option value="widespread">{t("detectionForms.widespread") || "Widespread / generalized eruption"}</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function MilkFeverForm({ form, onChange, cows }) {
  const { t } = useI18n();

  const bcsOptions = [
    { value: 2.0, label: t("detectionForms.bcs1") || "Very Thin (BCS 1–2)" },
    { value: 2.5, label: t("detectionForms.bcs2") || "Thin (BCS 2–2.5)" },
    { value: 3.0, label: t("detectionForms.bcs3") || "Normal (BCS 3.0)" },
    { value: 3.5, label: t("detectionForms.bcs4") || "Good / Well conditioned (BCS 3.5)" },
    { value: 4.5, label: t("detectionForms.bcs5") || "Over-conditioned / Fat (BCS 4–5)" },
  ];

  const eatingOptions = [
    { value: 100, label: t("detectionForms.eating100") || "Eating normally (100%)" },
    { value: 60, label: t("detectionForms.eating60") || "Eating less than usual (approx 60%)" },
    { value: 20, label: t("detectionForms.eating20") || "Barely eating / picking (approx 20%)" },
    { value: 5, label: t("detectionForms.eating5") || "Not eating at all (anorexic)" },
  ];

  const behavioralOptions = [
    { value: "normal", label: t("detectionForms.behaviorNormal") || "Normal behavior (alert & active)", score: 100 },
    { value: "reduced_movement", label: t("detectionForms.behaviorReduced") || "Reduced movement / sluggish gait", score: 40 },
    { value: "muscle_tremors", label: t("detectionForms.behaviorTremors") || "Muscle tremors / visible shivering", score: 20 },
    { value: "unable_to_stand", label: t("detectionForms.behaviorUnable") || "Unable to stand / sternal or lateral recumbency", score: 5 },
  ];

  return (
    <div className="space-y-6">
      <CowSelector cows={cows} value={form.cowId} onChange={onChange} />

      <div className="space-y-3 pt-2">
        <SectionHeader label={t("detectionForms.calvingHistory") || "Calving History & Timing"} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("detectionForms.parity") || "Number of Previous Calvings (Parity)"} <span className="text-rose-500 font-bold ml-0.5">*</span>
            </label>
            <select
              name="parity"
              value={form.parity}
              onChange={onChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t("detectionForms.selectParity") || "-- Select Parity --"}</option>
              <option value="1">{t("detectionForms.parity1") || "1st calving (Heifer)"}</option>
              <option value="2">{t("detectionForms.parity2") || "2nd calving"}</option>
              <option value="3">{t("detectionForms.parity3") || "3rd calving (Higher risk)"}</option>
              <option value="4">{t("detectionForms.parity4") || "4th calving (High risk)"}</option>
              <option value="5">{t("detectionForms.parity5") || "5th+ calving (Very high risk)"}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("detectionForms.calvingDate") || "Date of Calving (Giving Birth)"} <span className="text-rose-500 font-bold ml-0.5">*</span>
            </label>
            <input
              type="date"
              name="calving_date"
              value={form.calving_date}
              onChange={onChange}
              max={new Date().toISOString().split("T")[0]}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <SectionHeader label={t("detectionForms.physicalDietary") || "Physical & Dietary Assessment"} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("detectionForms.bcsLabel") || "Body Condition Score (BCS)"}
            </label>
            <select
              name="bcs"
              value={form.bcs}
              onChange={onChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {bcsOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("detectionForms.eatingLabel") || "Appetite & Eating Status"}
            </label>
            <select
              name="eating"
              value={form.eating}
              onChange={onChange}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {eatingOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-2">
        <SectionHeader label={t("detectionForms.neurologicalSigns") || "Current Neurological & Posture Signs"} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {behavioralOptions.map((o) => (
            <label
              key={o.value}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors text-xs sm:text-sm ${form.behavioral === o.value
                  ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold"
                  : "border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300"
                }`}
            >
              <input
                type="radio"
                name="behavioral"
                value={o.value}
                checked={form.behavioral === o.value}
                onChange={onChange}
                className="accent-emerald-600 h-4 w-4"
              />
              <span>{o.label}</span>
            </label>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
          <label className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs sm:text-sm">
            <input
              type="checkbox"
              name="cannot_stand"
              checked={Boolean(form.cannot_stand)}
              onChange={onChange}
              className="accent-emerald-600 w-4 h-4 rounded border-slate-300"
            />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {t("detectionForms.cannotStandCheck") || "Cow cannot stand up or keeps collapsing"}
            </span>
          </label>

          <label className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs sm:text-sm">
            <input
              type="checkbox"
              name="muscle_tremors"
              checked={Boolean(form.muscle_tremors)}
              onChange={onChange}
              className="accent-emerald-600 w-4 h-4 rounded border-slate-300"
            />
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              {t("detectionForms.muscleTremorsCheck") || "Visible muscle shivering or S-curve neck"}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

// ─── Result Cards ───────────────────────────────────────────────────────────

function MilkFeverResultCard({ result }) {
  if (!result) return null;
  const colors = STAGE_COLORS[result.stage] || STAGE_COLORS.Mild;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`rounded-2xl border ${colors.border} ${colors.bg} p-6 shadow-xs space-y-4`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Milk Fever Assessment
            </p>
            <h3 className={`text-xl font-bold mt-0.5 ${colors.text}`}>
              {result.stage} Risk
            </h3>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${colors.badge}`}>
            {result.stage}
          </span>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5 font-semibold">
            <span className="text-slate-600 dark:text-slate-300">Calculated Risk Index</span>
            <span className={colors.text}>{result.risk_score}/100</span>
          </div>
          <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-2.5">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${result.stage === "Critical"
                  ? "bg-red-500"
                  : result.stage === "Moderate"
                    ? "bg-orange-500"
                    : result.stage === "Mild"
                      ? "bg-amber-500"
                      : "bg-blue-500"
                }`}
              style={{ width: `${result.risk_score}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
            Recommended Action
          </p>
          <p className="text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
            {result.advice || result.message}
          </p>
        </div>

        {result.stage === "Critical" && (
          <div className="rounded-xl bg-red-600 text-white p-4 text-center shadow-sm">
            <p className="font-bold text-sm flex items-center justify-center gap-1.5 mb-0.5">
              <ShieldAlert className="h-4 w-4" />
              EMERGENCY VETERINARY CALL
            </p>
            <p className="text-xs opacity-90">
              Administer calcium borogluconate IV under veterinary supervision immediately.
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SimpleResultCard({ result }) {
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
        className={`rounded-2xl border p-6 shadow-xs space-y-4 ${isCritical
            ? "bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60"
            : isWarning
              ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60"
              : "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60"
          }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Diagnostic Assessment
            </p>
            <h3
              className={`text-xl font-bold mt-0.5 ${isCritical
                  ? "text-red-900 dark:text-red-300"
                  : isWarning
                    ? "text-amber-900 dark:text-amber-300"
                    : "text-emerald-900 dark:text-emerald-300"
                }`}
            >
              {String(prediction)}
            </h3>
          </div>
          <Badge
            variant={isCritical ? "error" : isWarning ? "warning" : "success"}
            className="text-xs font-bold"
          >
            {isCritical ? "Critical / Action Required" : isWarning ? "Consultation Recommended" : "Normal / Healthy"}
          </Badge>
        </div>

        {recommendation && (
          <div className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Veterinary Advice
            </p>
            <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
              {recommendation}
            </p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {confidence && <span>Model Confidence: {confidence}</span>}
          {riskLevel && <span>Risk Level: {riskLevel}</span>}
        </div>
      </div>
    </motion.div>
  );
}

// ─── FMD Weather Risk Component ─────────────────────────────────────────────

function FMDWeatherDashboard() {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchWeather = async (lat, lon) => {
    try {
      setLoading(true);
      const url =
        lat && lon
          ? `/api/modules/fmd/weather-risk?lat=${lat}&lon=${lon}`
          : "/api/modules/fmd/weather-risk";
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setWeatherData(json);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(null, null),
        { timeout: 6000 }
      );
    } else {
      fetchWeather(null, null);
    }
  }, []);

  if (!weatherData && !loading) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 shadow-xs flex items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-orange-50 dark:bg-orange-950/50 border border-orange-100 dark:border-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
          <CloudSun className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-900 dark:text-white">
            Regional FMD Weather Risk Alert
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {loading ? "Analyzing microclimate humidity & wind..." : `Current Condition: ${weatherData?.risk_level || "Low"} environmental transmission risk`}
          </p>
        </div>
      </div>

      <Badge variant="secondary" className="text-[11px] font-bold shrink-0">
        {weatherData?.risk_level || "Active"}
      </Badge>
    </div>
  );
}

// ─── Main DetectionPage ─────────────────────────────────────────────────────

const getInitialFormState = (cowId = "") => ({
  cowId: cowId || "",
  image: null,
  // Mastitis - 5 Required Model Features (Decision Tree Model 2)
  milkTemperature: "",
  milkPh: "",
  milkConductivity: "",
  milkYield: "",
  clotting: "0",
  // Legacy aliases
  breed: "Jersey",
  monthsAfterGivingBirth: "",
  previousMastitisStatus: "0",
  temperature: "",
  // Mastitis - Clinical Observations (Optional Questionnaire)
  milkYieldChange: "",
  milkAppearance: "",
  milkClotting: "",
  udderSwelling: "",
  udderWarmth: "",
  udderPain: "",
  bodyTemperature: "",
  appetite: "",
  // FMD
  lesionsInMouth: false,
  lesionsOnHooves: false,
  excessiveDrooling: false,
  highFever: false,
  lamenessOrLimping: false,
  reducedFeedIntake: false,
  reluctanceToWalk: false,
  milkDropInDairy: false,
  bodyTemperatureFMD: "",
  lesionLocation: "",
  // LSD
  skinNodules: false,
  noduleOnHead: false,
  noduleOnLegs: false,
  swollenLymphNodes: false,
  nasalDischarge: false,
  reducedMilkProduction: false,
  decreasedAppetite: false,
  noduleCount: "",
  noduleDistribution: "",
  // Milk Fever
  parity: "2",
  calving_date: new Date().toISOString().split("T")[0],
  bcs: 3.0,
  eating: 100,
  behavioral: "normal",
  cannot_stand: false,
  muscle_tremors: false,
});

export default function DetectionPage() {
  const { moduleKey } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const { t } = useI18n();

  const meta = MODULE_META[moduleKey] || MODULE_META.mastitis;

  const [cows, setCows] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [imagePreview, setImagePreview] = useState(null);

  // Mastitis Udder Region of Interest (ROI) State
  const [originalImageFile, setOriginalImageFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [croppedImageFile, setCroppedImageFile] = useState(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState(null);
  const [roiCoordinates, setRoiCoordinates] = useState(null);
  const [isCroppingUdder, setIsCroppingUdder] = useState(false);

  const [form, setForm] = useState(() => getInitialFormState(searchParams.get("cowId") || ""));

  // ── Reset state completely when switching between the 4 disease forms ──────
  useEffect(() => {
    setImagePreview(null);
    setOriginalImageFile(null);
    setOriginalPreviewUrl(null);
    setCroppedImageFile(null);
    setCropPreviewUrl(null);
    setRoiCoordinates(null);
    setIsCroppingUdder(false);
    setResult(null);
    setError("");
    setIsSubmitting(false);

    setForm((prev) => getInitialFormState(searchParams.get("cowId") || prev.cowId));
  }, [moduleKey]);

  useEffect(() => {
    const fetchCows = async () => {
      try {
        const res = await getCows();
        setCows(res?.cows || []);
      } catch {
        // Silent fallback
      }
    };
    fetchCows();
  }, []);

  // ── Auto-fill breed from selected cow ──────────────────────────────────────
  useEffect(() => {
    if (!form.cowId || !cows.length) return;
    const selectedCow = cows.find((c) => String(c.id) === String(form.cowId));
    if (selectedCow && selectedCow.breed) {
      const lower = selectedCow.breed.toLowerCase();
      let matchedBreed = "Jersey";
      if (lower.includes("holstein") || lower.includes("hostlene")) {
        matchedBreed = "hostlene";
      } else if (lower.includes("jersey")) {
        matchedBreed = "Jersey";
      }
      setForm((prev) => ({
        ...prev,
        breed: matchedBreed,
      }));
    }
  }, [form.cowId, cows]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (moduleKey === "mastitis") {
        setOriginalImageFile(file);
        const url = URL.createObjectURL(file);
        setOriginalPreviewUrl(url);
        setImagePreview(url);
        setCroppedImageFile(null);
        setCropPreviewUrl(null);
        setRoiCoordinates(null);
        setIsCroppingUdder(true);
      } else {
        setForm((prev) => ({ ...prev, image: file }));
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const handleConfirmUdderCrop = ({ originalFile, croppedFile, croppedPreviewUrl, coordinates }) => {
    setOriginalImageFile(originalFile);
    setCroppedImageFile(croppedFile);
    setCropPreviewUrl(croppedPreviewUrl);
    setRoiCoordinates(coordinates);
    setForm((prev) => ({ ...prev, image: croppedFile }));
    setIsCroppingUdder(false);
    showSuccess("Udder area confirmed. Focus area ready for Model 1 analysis.");
  };

  const handleCancelUdderCrop = () => {
    setIsCroppingUdder(false);
  };

  const handleStartUdderCrop = () => {
    setIsCroppingUdder(true);
  };

  const handleRetakeUdderPhoto = () => {
    setOriginalImageFile(null);
    setOriginalPreviewUrl(null);
    setCroppedImageFile(null);
    setCropPreviewUrl(null);
    setRoiCoordinates(null);
    setIsCroppingUdder(false);
    setImagePreview(null);
    setForm((prev) => ({ ...prev, image: null }));
  };

  const handleMastitisSubmit = async (e) => {
    e.preventDefault();
    const finalImage = croppedImageFile || form.image;

    // Check if the 5 Model 2 numerical features are provided and valid
    const hasMilkTemp =
      form.milkTemperature !== "" &&
      form.milkTemperature !== null &&
      !isNaN(Number(form.milkTemperature)) &&
      Number(form.milkTemperature) >= 30 &&
      Number(form.milkTemperature) <= 45;
    const hasMilkPh =
      form.milkPh !== "" &&
      form.milkPh !== null &&
      !isNaN(Number(form.milkPh)) &&
      Number(form.milkPh) >= 6.0 &&
      Number(form.milkPh) <= 8.0;
    const hasMilkCond =
      form.milkConductivity !== "" &&
      form.milkConductivity !== null &&
      !isNaN(Number(form.milkConductivity)) &&
      Number(form.milkConductivity) >= 3.0 &&
      Number(form.milkConductivity) <= 10.0;
    const hasMilkYield =
      form.milkYield !== "" &&
      form.milkYield !== null &&
      !isNaN(Number(form.milkYield)) &&
      Number(form.milkYield) >= 0 &&
      Number(form.milkYield) <= 50;
    const hasClotting =
      form.clotting !== "" &&
      form.clotting !== null &&
      ["0", "1", 0, 1].includes(form.clotting);

    const allNumericalValid = hasMilkTemp && hasMilkPh && hasMilkCond && hasMilkYield && hasClotting;

    if (!finalImage && !allNumericalValid) {
      if (!finalImage) {
        showError("Please upload an udder photograph (or provide all 5 required milk parameters for numerical analysis).");
      } else if (!hasMilkTemp) {
        showError("Milk temperature is required and must be between 30.0 and 45.0 °C (e.g. 36.5).");
      } else if (!hasMilkPh) {
        showError("Milk pH is required and must be between 6.0 and 8.0 (e.g. 6.65).");
      } else if (!hasMilkCond) {
        showError("Milk conductivity is required and must be between 3.0 and 10.0 mS/cm (e.g. 4.85).");
      } else if (!hasMilkYield) {
        showError("Milk yield is required and must be between 0.0 and 50.0 L/day (e.g. 18.5).");
      } else if (!hasClotting) {
        showError("Milk clotting status is required (0: No Clotting, 1: Clots Present).");
      }
      return;
    }

    const payload = new FormData();
    if (finalImage) {
      payload.append("image", finalImage);
      payload.append("file", finalImage);
    }
    if (originalImageFile) {
      payload.append("original_image", originalImageFile);
    }
    if (roiCoordinates) {
      payload.append("roi_coordinates", JSON.stringify(roiCoordinates));
      payload.append("roi_applied", "true");
    }
    if (form.cowId) payload.append("cow_id", form.cowId);

    if (allNumericalValid) {
      const milkTempClean = parseFloat(form.milkTemperature);
      const milkPhClean = parseFloat(form.milkPh);
      const milkCondClean = parseFloat(form.milkConductivity);
      const milkYieldClean = parseFloat(form.milkYield);
      const clottingClean = parseInt(form.clotting, 10);

      // Exact feature names expected by decision_tree_model.joblib Model 2
      payload.append("Milk_Temperature", milkTempClean);
      payload.append("Milk_pH", milkPhClean);
      payload.append("Milk_Conductivity", milkCondClean);
      payload.append("Milk_Yield", milkYieldClean);
      payload.append("Clotting", clottingClean);

      const numericalMeasurements = {
        "Milk_Temperature": milkTempClean,
        "Milk_pH": milkPhClean,
        "Milk_Conductivity": milkCondClean,
        "Milk_Yield": milkYieldClean,
        "Clotting": clottingClean,
        "milk_temperature": milkTempClean,
        "milk_ph": milkPhClean,
        "milk_conductivity": milkCondClean,
        "milk_yield": milkYieldClean,
        "clotting": clottingClean,
      };
      payload.append("numerical_measurements", JSON.stringify(numericalMeasurements));
    }

    const clinicalObservations = {
      milk_yield_change: form.milkYieldChange || null,
      milk_appearance: form.milkAppearance || null,
      milk_clotting: form.milkClotting || null,
      udder_swelling: form.udderSwelling || null,
      udder_warmth: form.udderWarmth || null,
      udder_pain: form.udderPain || null,
      body_temperature: form.temperature ? String(form.temperature) : null,
      appetite: form.appetite || null,
    };
    payload.append("clinical_observations", JSON.stringify(clinicalObservations));

    try {
      setIsSubmitting(true);
      setError("");
      const response = await predictMastitisAssisted(payload);
      const responseData = response?.data || response;
      setResult({
        type: "mastitis",
        data: {
          ...responseData,
          data_source: allNumericalValid ? "Farmer Entered (4 required features)" : "Image Analysis",
        },
      });
      showSuccess("Mastitis detection completed");
    } catch (err) {
      setResult(null);
      const msg = err.message || "Server error";
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFMDSubmit = async (e) => {
    e.preventDefault();
    if (!form.image) {
      showError("Please upload a mouth or hoof photograph");
      return;
    }

    const payload = new FormData();
    payload.append("image", form.image);
    if (form.cowId) payload.append("cow_id", form.cowId);

    const symptoms = {
      lesions_mouth: form.lesionsInMouth,
      lesions_hooves: form.lesionsOnHooves,
      excessive_drooling: form.excessiveDrooling,
      high_fever: form.highFever,
      lameness: form.lamenessOrLimping,
      reduced_feed_intake: form.reducedFeedIntake,
      reluctance_to_walk: form.reluctanceToWalk,
      milk_drop: form.milkDropInDairy,
      body_temperature: form.bodyTemperature || null,
      lesion_location: form.lesionLocation || null,
    };
    payload.append("symptoms", JSON.stringify(symptoms));

    try {
      setIsSubmitting(true);
      setError("");
      const response = await predictFMDAssisted(payload);
      setResult({ type: "generic", data: response?.data || response });
      showSuccess("FMD detection completed");
    } catch (err) {
      setResult(null);
      const msg = err.message || "Server error";
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLSDSubmit = async (e) => {
    e.preventDefault();
    if (!form.image) {
      showError("Please upload a skin photograph");
      return;
    }

    const payload = new FormData();
    payload.append("image", form.image);
    if (form.cowId) payload.append("cow_id", form.cowId);

    const symptoms = {
      skin_nodules: form.skinNodules,
      nodule_head_neck: form.noduleOnHead,
      nodule_legs: form.noduleOnLegs,
      swollen_lymph_nodes: form.swollenLymphNodes,
      high_fever: form.highFever,
      nasal_discharge: form.nasalDischarge,
      reduced_milk: form.reducedMilkProduction,
      decreased_appetite: form.decreasedAppetite,
      nodule_count: form.noduleCount || null,
      nodule_distribution: form.noduleDistribution || null,
      body_temperature: form.bodyTemperature || null,
    };
    payload.append("symptoms", JSON.stringify(symptoms));

    try {
      setIsSubmitting(true);
      setError("");
      const response = await predictLSDAssisted(payload);
      setResult({ type: "generic", data: response?.data || response });
      showSuccess("LSD detection completed");
    } catch (err) {
      setResult(null);
      const msg = err.message || "Server error";
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMilkFeverSubmit = async (e) => {
    e.preventDefault();
    if (!form.parity || !form.calving_date) {
      showError("Please fill in Parity and Calving Date");
      return;
    }

    const behaviorOption = BEHAVIORAL_OPTIONS.find((o) => o.value === form.behavioral);
    const activityLevel = behaviorOption ? behaviorOption.score : 50;

    let daysToCalving = 0;
    if (form.calving_date) {
      const calving = new Date(form.calving_date);
      const today = new Date();
      const diffDays = Math.round((calving - today) / (1000 * 60 * 60 * 24));
      daysToCalving = Math.max(0, Math.min(30, diffDays + 3));
    }

    let bloodCalcium = 9.0;
    if (form.cannot_stand) bloodCalcium -= 2.5;
    if (form.muscle_tremors) bloodCalcium -= 1.5;
    if (form.behavioral === "unable_to_stand") bloodCalcium -= 2.0;
    if (form.behavioral === "muscle_tremors") bloodCalcium -= 1.0;
    if (form.behavioral === "reduced_movement") bloodCalcium -= 0.5;
    bloodCalcium = Math.max(3.5, bloodCalcium);

    const calculatedData = {
      parity: parseInt(form.parity, 10) || 1,
      blood_calcium: bloodCalcium,
      blood_phosphorus: 5.5,
      bcs: parseFloat(form.bcs),
      days_to_calving: daysToCalving,
      milk_yield_day1: (parseFloat(form.eating) / 100) * 20,
      activity_level: activityLevel,
      dcad: parseInt(form.parity, 10) >= 3 ? 20 : -30,
    };

    const payload = { data: calculatedData };
    if (form.cowId) payload.cow_id = form.cowId;

    try {
      setIsSubmitting(true);
      setError("");
      const response = await predictMilkFever(payload);
      setResult({ type: "milk-fever", data: response?.data || response });
      showSuccess("Milk Fever assessment completed");
    } catch (err) {
      setResult(null);
      const msg = err.message || "Server error";
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (e) => {
    if (moduleKey === "mastitis") return handleMastitisSubmit(e);
    if (moduleKey === "fmd") return handleFMDSubmit(e);
    if (moduleKey === "lumpy") return handleLSDSubmit(e);
    if (moduleKey === "milk-fever") return handleMilkFeverSubmit(e);
    e.preventDefault();
  };

  const requiresImage = moduleKey !== "milk-fever";
  const canSubmit = requiresImage ? Boolean(form.image) : true;

  return (
    <PageWrapper className="max-w-3xl mx-auto space-y-6">
      {/* ── Top Bar with Back Navigation ──────────────────────────────────── */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/modules"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Disease Modules</span>
        </Link>
        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500">
          Module: {moduleKey}
        </span>
      </div>

      {/* ── Disease Info Banner (Matching ModuleSelectionPage) ─────────────── */}
      <DiseaseInfoPanel meta={meta} />

      {/* ── FMD Microclimate Weather Alert (Optional) ────────────────────── */}
      {moduleKey === "fmd" && <FMDWeatherDashboard />}

      {/* ── Main Form Card (Strictly Isolated per Disease) ────────────────── */}
      <Card key={moduleKey} className="p-6 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <form key={moduleKey} onSubmit={handleSubmit} className="space-y-6">
          {moduleKey === "mastitis" && (
            <MastitisForm
              form={form}
              onChange={handleChange}
              onFileChange={handleFileChange}
              imagePreview={imagePreview}
              cows={cows}
              originalImageFile={originalImageFile}
              originalPreviewUrl={originalPreviewUrl}
              croppedImageFile={croppedImageFile}
              cropPreviewUrl={cropPreviewUrl}
              roiCoordinates={roiCoordinates}
              isCroppingUdder={isCroppingUdder}
              onConfirmUdderCrop={handleConfirmUdderCrop}
              onCancelUdderCrop={handleCancelUdderCrop}
              onStartUdderCrop={handleStartUdderCrop}
              onRetakeUdderPhoto={handleRetakeUdderPhoto}
            />
          )}
          {moduleKey === "fmd" && (
            <FMDForm
              form={form}
              onChange={handleChange}
              onFileChange={handleFileChange}
              imagePreview={imagePreview}
              cows={cows}
            />
          )}
          {moduleKey === "lumpy" && (
            <LSDForm
              form={form}
              onChange={handleChange}
              onFileChange={handleFileChange}
              imagePreview={imagePreview}
              cows={cows}
            />
          )}
          {moduleKey === "milk-fever" && (
            <MilkFeverForm form={form} onChange={handleChange} cows={cows} />
          )}

          {error && <Alert variant="error" message={error} />}

          {/* Submit Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              type="submit"
              variant="primary"
              isLoading={isSubmitting}
              disabled={isSubmitting || !canSubmit}
              className="w-full gap-2 text-xs sm:text-sm font-bold py-3 rounded-xl shadow-xs"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>{t("detection.processingAi") || "Processing Diagnostic AI…"}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  <span>{t("detection.runCheck") || `Run ${t(`modules.${moduleKey === "milk-fever" ? "milkFever" : moduleKey}`) || meta.title}`}</span>
                </>
              )}
            </Button>

            {requiresImage && !form.image && (
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                {t("detection.uploadClearPhoto") || "Upload a clear photograph above to proceed with the diagnostic check"}
              </p>
            )}
          </div>
        </form>
      </Card>

      {/* ── Results Display ───────────────────────────────────────────────── */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
              {t("detection.analysisResults") || "Analysis Results"}
            </h3>
          </div>
          {result.type === "mastitis" && (
            <DetectionResultCard
              result={result.data}
              cowId={form.cowId}
              cows={cows}
              cowName={cows.find((c) => String(c.id) === String(form.cowId))?.name || (form.cowId ? `Cow #${form.cowId}` : null)}
              onCowSelect={(id) => setForm((prev) => ({ ...prev, cowId: id }))}
              imageUrl={imagePreview}
            />
          )}
          {result.type === "milk-fever" && <MilkFeverResultCard result={result.data} />}
          {result.type === "generic" && <SimpleResultCard result={result.data} />}
        </div>
      )}
    </PageWrapper>
  );
}