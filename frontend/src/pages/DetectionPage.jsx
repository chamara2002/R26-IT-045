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
} from "lucide-react";
import { Card, Button, Input, Alert, Badge } from "../components/ui/index.jsx";
import { useToast } from "../hooks/useToast";
import { useI18n } from "../i18n/language-context";
import DetectionResultCard from "../components/DetectionResultCard";
<<<<<<< HEAD
import { getCows, predictMastitisAssisted, predictFMDAssisted, predictLSDAssisted, predictMilkFever } from "../services/api";
import jsPDF from 'jspdf';
=======
import LSDResultCard from "../components/LSDResultCard";
import {
  getCows,
  predictMastitisAssisted,
  predictFMDAssisted,
  predictLSDAssisted,
  predictMilkFever,
} from "../services/api";

// ─── Constants for Milk Fever ───────────────────────────────────────────────

const BEHAVIORAL_OPTIONS = [
  { value: "normal", label: "Normal behavior", score: 100 },
  {
    value: "reduced_movement",
    label: "Reduced movement / sluggish",
    score: 40,
  },
  { value: "muscle_tremors", label: "Muscle tremors / shivering", score: 20 },
  { value: "unable_to_stand", label: "Unable to stand / collapsed", score: 5 },
];

const BCS_OPTIONS = [
  { value: 2.0, label: "Very Thin (1-2)" },
  { value: 2.5, label: "Thin (2-3)" },
  { value: 3.0, label: "Normal (3)" },
  { value: 3.5, label: "Good (3-4)" },
  { value: 4.5, label: "Fat (4-5)" },
];

const EATING_OPTIONS = [
  { value: 100, label: "Eating normally" },
  { value: 60, label: "Eating less than usual" },
  { value: 20, label: "Barely eating" },
  { value: 5, label: "Not eating at all" },
];

const STAGE_COLORS = {
  Subclinical: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-400 dark:border-blue-800",
    text: "text-blue-800 dark:text-blue-300",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
  },
  Mild: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-400 dark:border-yellow-800",
    text: "text-yellow-800 dark:text-yellow-300",
    badge:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
  },
  Moderate: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-400 dark:border-orange-800",
    text: "text-orange-800 dark:text-orange-300",
    badge:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
  },
  Critical: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-500 dark:border-red-800",
    text: "text-red-800 dark:text-red-300",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
  },
};
>>>>>>> e64b1efc1d738fa9efc7508e87430e73a02165f4

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
      "This module detects and classifies skin nodules from the photograph (YOLOv8 + ResNet50), then combines that result with any reported clinical symptoms into a single weighted prediction.",
    requires:
      "Full-body or skin photograph (required) + clinical symptom checklist",
  },
  "milk-fever": {
    key: "milk-fever",
    title: "Milk Fever Detection",
    subtitle: "Hypocalcaemia & downer cow risk analysis",
    icon: Thermometer,
    badge: "Post-Calving",
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
    <div className="space-y-8">
      <CowSelector
        cows={cows}
        value={form.cowId}
        onChange={onChange}
        color={color}
      />
      <ImageUpload
        id="mastitis-image"
        imagePreview={imagePreview}
        onFileChange={onFileChange}
        color={color}
      />

      {/* ── Udder Image & Farmer-Guided ROI Crop Selection ─────────────────── */}
      <div className="space-y-4">
        <SectionHeader label="Milk & Health Details" optional />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Adding these details improves prediction accuracy.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Milk Temperature (°C)"
            type="number"
            step="0.01"
            name="milkTemperature"
            value={form.milkTemperature}
            onChange={onChange}
            placeholder="e.g. 38.5"
          />
          <Input
            label="Milk Yield (L)"
            type="number"
            step="0.01"
            name="milkYield"
            value={form.milkYield}
            onChange={onChange}
            placeholder="e.g. 20"
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Clotting
            </label>
            <select
              name="clotting"
              value={form.clotting}
              onChange={onChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ring-emerald-500"
            >
              <option value="">Select…</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
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
    <div className="space-y-8">
      <CowSelector
        cows={cows}
        value={form.cowId}
        onChange={onChange}
        color={color}
      />
      <ImageUpload
        id="fmd-image"
        imagePreview={imagePreview}
        onFileChange={onFileChange}
        color={color}
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
            label="Body Temperature (°C)"
            type="number"
            step="0.1"
            name="bodyTemperature"
            value={form.bodyTemperature || ""}
            onChange={onChange}
            placeholder="e.g. 40.5"
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Lesion Location
            </label>
            <select
              name="lesionLocation"
              value={form.lesionLocation || ""}
              onChange={onChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ring-orange-500"
            >
              <option value="">Select…</option>
              <option value="mouth_only">Mouth only</option>
              <option value="hooves_only">Hooves only</option>
              <option value="both">Both mouth and hooves</option>
              <option value="udder">Udder area</option>
              <option value="multiple">Multiple locations</option>
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
    <div className="space-y-8">
      <CowSelector
        cows={cows}
        value={form.cowId}
        onChange={onChange}
        color={color}
      />
      <ImageUpload
        id="lsd-image"
        imagePreview={imagePreview}
        onFileChange={onFileChange}
        color={color}
      />

      <div className="space-y-4">
        <SectionHeader label="LSD Clinical Symptoms" optional />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Nodule presence, location, and count are already assessed from the
          photograph — these are additional signs the camera can't see.
        </p>
        <CheckboxGrid
          items={[
            ["highFever", "High fever (≥ 40°C)"],
            ["swollenLymphNodes", "Swollen lymph nodes"],
            ["noseDischarge", "Nose discharge"],
            ["eyeDischarge", "Eye discharge"],
            ["reducedMilkProduction", "Reduced milk production"],
            ["decreasedAppetite", "Decreased appetite / lethargy"],
          ]}
          values={form}
          onChange={onChange}
        />
      </div>

      <div className="space-y-4">
        <SectionHeader label="Additional Details" optional />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Body Temperature (°C)"
            type="number"
            step="0.1"
            name="bodyTemperature"
            value={form.bodyTemperature || ""}
            onChange={onChange}
            placeholder="e.g. 41.0"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Milk Fever Constants ────────────────────────────────────────────────────

const BEHAVIORAL_OPTIONS = [
  { value: "normal",           label: "Normal behavior",             score: 100 },
  { value: "reduced_movement", label: "Reduced movement / sluggish",  score: 40  },
  { value: "muscle_tremors",   label: "Muscle tremors / shivering",   score: 20  },
  { value: "unable_to_stand",  label: "Unable to stand / collapsed",  score: 5   },
];

const BCS_OPTIONS = [
  { value: 2.0, label: "Very Thin (1-2)" },
  { value: 2.5, label: "Thin (2-3)"      },
  { value: 3.0, label: "Normal (3)"      },
  { value: 3.5, label: "Good (3-4)"      },
  { value: 4.5, label: "Fat (4-5)"       },
];

const EATING_OPTIONS = [
  { value: 100, label: "Eating normally"        },
  { value: 60,  label: "Eating less than usual" },
  { value: 20,  label: "Barely eating"          },
  { value: 5,   label: "Not eating at all"      },
];

const MF_STAGE_COLORS = {
  Subclinical: {
    bg: "bg-blue-50 dark:bg-blue-900/20", border: "border-blue-400 dark:border-blue-700",
    text: "text-blue-800 dark:text-blue-300", badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    header: "bg-blue-700", card: "bg-blue-50 dark:bg-blue-900/20", cborder: "border-blue-200 dark:border-blue-700",
    dot: "text-blue-600", bar: "bg-blue-500", btn: "bg-blue-600 hover:bg-blue-700",
  },
  Mild: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-400 dark:border-yellow-700",
    text: "text-yellow-800 dark:text-yellow-300", badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
    header: "bg-yellow-600", card: "bg-yellow-50 dark:bg-yellow-900/20", cborder: "border-yellow-200 dark:border-yellow-700",
    dot: "text-yellow-600", bar: "bg-yellow-500", btn: "bg-yellow-600 hover:bg-yellow-700",
  },
  Moderate: {
    bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-400 dark:border-orange-700",
    text: "text-orange-800 dark:text-orange-300", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
    header: "bg-orange-600", card: "bg-orange-50 dark:bg-orange-900/20", cborder: "border-orange-200 dark:border-orange-700",
    dot: "text-orange-600", bar: "bg-orange-500", btn: "bg-orange-600 hover:bg-orange-700",
  },
  Critical: {
    bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-500 dark:border-red-700",
    text: "text-red-800 dark:text-red-300", badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    header: "bg-red-700", card: "bg-red-50 dark:bg-red-900/20", cborder: "border-red-200 dark:border-red-700",
    dot: "text-red-600", bar: "bg-red-500", btn: "bg-red-600 hover:bg-red-700",
  },
};

const STAGE_EXPLANATIONS = {
  Subclinical: "Early-stage calcium deficiency detected. No visible symptoms yet, but preventive action now prevents progression.",
  Mild:        "Mild calcium deficiency detected. Your cow may show early weakness signs. Begin treatment immediately.",
  Moderate:    "Moderate calcium deficiency detected. Your cow needs on-farm treatment now. Contact a livestock officer urgently.",
  Critical:    "Critical calcium deficiency detected. This is a life-threatening emergency. Call a veterinarian immediately.",
};

const STAGE_SUGGESTIONS = {
  Subclinical: {
    nutrition: [
      "Increase dietary calcium — add limestone or calcium carbonate to feed",
      "Ensure DCAD is negative (−50 to −100 mEq/kg DM) in the dry period",
      "Provide Vitamin D3 supplement (1,000,000 IU) 2–3 days before expected calving",
      "Add magnesium oxide to diet — low magnesium reduces calcium absorption",
      "Reduce grain feeding 2 weeks before calving to prevent over-conditioning",
    ],
    management: [
      "Monitor cow twice daily — morning and evening",
      "Record milk yield and eating behaviour in daily log",
      "Ensure fresh clean water is always available",
      "Separate cow from herd for easier individual monitoring",
    ],
  },
  Mild: {
    nutrition: [
      "Administer oral calcium bolus immediately (calcium propionate or calcium chloride gel)",
      "Increase hay and roughage — reduce high-energy concentrates",
      "Add oral calcium drench: 50g calcium borogluconate in 2L warm water",
      "Supplement with phosphorus — mix dicalcium phosphate into feed",
      "Continue negative DCAD diet — do not switch diet abruptly",
    ],
    management: [
      "Monitor cow every 4–6 hours",
      "Isolate cow in a comfortable, dry pen with good bedding",
      "Reduce milking frequency to once daily to lower calcium demand",
      "Contact a livestock extension officer for guidance",
      "If no improvement within 12 hours, escalate to Moderate protocol",
    ],
  },
  Moderate: {
    nutrition: [
      "Do NOT administer further oral calcium — risk of overdose if IV calcium is also given",
      "Offer small amounts of high-quality hay only — no concentrates",
      "Provide electrolyte solution with warm water to maintain hydration",
      "Withhold milking completely until cow is stable and able to stand",
      "After recovery, gradually reintroduce calcium-rich diet over 3–5 days",
    ],
    management: [
      "Contact a veterinarian or livestock extension officer immediately",
      "Keep cow in sternal recumbency (lying on chest, not on side) — prevents bloat",
      "Provide warmth — blanket in cold or wet conditions",
      "Turn cow every 2 hours to prevent pressure sores",
      "Do NOT force the cow to stand — serious injury risk",
      "Prepare all cow history and symptom information for veterinarian",
    ],
  },
  Critical: {
    nutrition: [
      "Do NOT give any oral calcium — cow cannot swallow safely",
      "IV calcium borogluconate (400–500 mL of 23% solution) by veterinarian ONLY",
      "After IV treatment, follow with oral calcium bolus after 12 hours",
      "Provide 50% dextrose solution if cow shows signs of concurrent ketosis",
      "Reintroduce feed very gradually only after cow regains ability to stand",
    ],
    management: [
      "Call a veterinarian IMMEDIATELY — life-threatening emergency",
      "Keep cow in sternal recumbency at all times — never on her side",
      "Do NOT leave the cow unattended at any time",
      "Provide maximum warmth — blanket and shelter from wind and rain",
      "Download and bring the PDF veterinary report to your vet",
      "Record the exact time symptoms began — critical for treatment",
    ],
  },
};

// ─── Milk Fever Weather Risk Panel ──────────────────────────────────────────────────────

function WeatherRiskPanel() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=7.8731&longitude=80.7718&current=temperature_2m,relative_humidity_2m&timezone=Asia%2FColombo'
      );
      const data = await res.json();
      const temp     = data.current.temperature_2m;
      const humidity = data.current.relative_humidity_2m;
      const thi      = (1.8 * temp + 32) - ((0.55 - 0.0055 * humidity) * ((1.8 * temp + 32) - 58));
      setWeather({ temp, humidity, thi: Math.round(thi) });
    } catch {
      setWeather({ error: true });
    }
    setLoading(false);
  };

  const getThiStatus = (thi) => {
    if (thi < 68) return { label: 'No Heat Stress',       color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   risk: 'Low milk fever risk from heat stress. Conditions are comfortable.' };
    if (thi < 72) return { label: 'Mild Heat Stress',     color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', risk: 'Moderate risk — ensure shade, ventilation, and fresh water access.' };
    if (thi < 80) return { label: 'Moderate Heat Stress', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', risk: 'High risk — heat stress significantly increases milk fever susceptibility.' };
    return             { label: 'Severe Heat Stress',     color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       risk: 'Critical risk — immediate cooling and veterinary attention advised.' };
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-base">🌤️</span>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            Sri Lanka Heat Stress Check
          </p>
        </div>
        <button
          type="button"
          onClick={fetchWeather}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {loading ? '⏳ Loading...' : 'Check Weather'}
        </button>
      </div>
      <div className="p-4">
        {!weather && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            High temperatures increase milk fever risk. Click to check current Sri Lanka THI (Temperature-Humidity Index).
          </p>
        )}
        {weather?.error && (
          <p className="text-xs text-red-500">Could not fetch weather data. Check internet connection.</p>
        )}
        {weather && !weather.error && (() => {
          const status = getThiStatus(weather.thi);
          return (
            <div className={`rounded-lg border ${status.bg} p-3`}>
              <div className="flex justify-between items-center mb-2">
                <span className={`text-sm font-bold ${status.color}`}>{status.label}</span>
                <span className="text-xs font-mono font-semibold text-slate-500 bg-white dark:bg-slate-700 px-2 py-0.5 rounded">
                  THI: {weather.thi}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400 mb-2">
                <span>🌡️ {weather.temp}°C</span>
                <span>💧 {weather.humidity}% humidity</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{status.risk}</p>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ─── Milk Fever Form ─────────────────────────────────────────────────────────

function MilkFeverForm({ form, onChange, cows, color }) {
  return (
    <div className="space-y-6">
      <CowSelector
        cows={cows}
        value={form.cowId}
        onChange={onChange}
        color={color}
      />

      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          How many times has this cow calved before?{" "}
          <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
          Count only previous calvings, not this one
        </p>
        <select
          name="parity"
          value={form.parity}
          onChange={onChange}
          className={`w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${color.ring}`}
        >
          <option value="">-- Select --</option>
          <option value="1">First time (1st calving)</option>
          <option value="2">Once before (2nd calving)</option>
          <option value="3">Twice before (3rd calving)</option>
          <option value="4">3 times before (4th calving)</option>
          <option value="5">4+ times before (5th+ calving)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          When did the cow calve (give birth)?{" "}
          <span className="text-red-500">*</span>
        </label>
        <input
          type="date"
          name="calving_date"
          value={form.calving_date}
          onChange={onChange}
          max={new Date().toISOString().split("T")[0]}
          className={`w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${color.ring}`}
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          How does the cow's body look?
        </label>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">
          Look at the cow's ribs and hip bones
        </p>
        <select
          name="bcs"
          value={form.bcs}
          onChange={onChange}
          className={`w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${color.ring}`}
        >
          {BCS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Is the cow eating normally?
        </label>
        <select
          name="eating"
          value={form.eating}
          onChange={onChange}
          className={`w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${color.ring}`}
        >
          {EATING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
          What is the cow's behavior right now?
        </label>
        <div className="grid gap-2">
          {BEHAVIORAL_OPTIONS.map((o) => (
            <label
              key={o.value}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition
                ${form.behavioral === o.value ? `border-teal-500 bg-teal-50 dark:bg-teal-900/20` : `border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600`}`}
            >
              <input
                type="radio"
                name="behavioral"
                value={o.value}
                checked={form.behavioral === o.value}
                onChange={onChange}
                className="accent-teal-600 h-4 w-4"
              />
              <span className="text-sm text-slate-700 dark:text-slate-300">
                {o.label}
              </span>
            </label>
          ))}
        </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Additional symptoms:
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600">
          <input
            type="checkbox"
            name="cannot_stand"
            checked={form.cannot_stand}
            onChange={onChange}
            className="accent-teal-600 w-4 h-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Cow cannot stand up or keeps falling
          </span>
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600">
          <input
            type="checkbox"
            name="muscle_tremors"
            checked={form.muscle_tremors}
            onChange={onChange}
            className="accent-teal-600 w-4 h-4 rounded border-slate-300"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            Visible muscle tremors or shivering
          </span>
        </label>
      </div>

      <WeatherRiskPanel />
    </div>
  );
}

// ─── Milk Fever Result Card ───────────────────────────────────────────────────

function MilkFeverResultCard({ result, onReset }) {
  if (!result) return null;

  const colors = MF_STAGE_COLORS[result.stage] || MF_STAGE_COLORS.Mild;
  const explanation = STAGE_EXPLANATIONS[result.stage] || '';
  const suggestions = STAGE_SUGGESTIONS[result.stage];
  const stages = ['Subclinical', 'Mild', 'Moderate', 'Critical'];
  const currentIdx = stages.indexOf(result.stage);

  const generatePDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString('en-GB');
    const time = new Date().toLocaleTimeString('en-GB');

    doc.setFillColor(27, 58, 107);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('CATTLESENSE — Milk Fever Veterinary Report', 15, 14);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${date} at ${time}`, 15, 23);
    doc.text('Component IV — Milk Fever Detection Module | SLIIT Research Project', 15, 30);

    const stageColorMap = {
      Subclinical: [41, 128, 185],
      Mild:        [243, 156, 18],
      Moderate:    [230, 126, 34],
      Critical:    [231, 76, 60],
    };
    const sc = stageColorMap[result.stage] || [100, 100, 100];
    doc.setFillColor(...sc);
    doc.roundedRect(130, 43, 65, 13, 3, 3, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`Stage: ${result.stage}`, 162, 52, { align: 'center' });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Detection Summary', 15, 52);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(`Risk Score: ${result.risk_score}/100`, 15, 62);
    doc.text(`Model Confidence: ${(result.confidence * 100).toFixed(1)}%`, 15, 70);
    doc.text(`Disease: ${result.disease}`, 15, 78);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 85, 195, 85);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Clinical Assessment:', 15, 93);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const explLines = doc.splitTextToSize(explanation, 175);
    doc.text(explLines, 15, 101);

    let y = 101 + explLines.length * 6 + 6;

    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Recommended Action:', 15, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const advLines = doc.splitTextToSize(result.advice || '', 175);
    doc.text(advLines, 15, y);
    y += advLines.length * 6 + 8;

    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Nutrition Recommendations:', 15, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    (suggestions?.nutrition || []).forEach(tip => {
      if (y > 265) { doc.addPage(); y = 20; }
      const lines = doc.splitTextToSize(`• ${tip}`, 170);
      doc.text(lines, 18, y);
      y += lines.length * 6 + 1;
    });

    y += 4;
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y);
    y += 8;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('Management Actions:', 15, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    (suggestions?.management || []).forEach(tip => {
      if (y > 265) { doc.addPage(); y = 20; }
      const lines = doc.splitTextToSize(`• ${tip}`, 170);
      doc.text(lines, 18, y);
      y += lines.length * 6 + 1;
    });

    if (result.stage === 'Critical') {
      y += 6;
      if (y > 245) { doc.addPage(); y = 20; }
      doc.setFillColor(231, 76, 60);
      doc.rect(15, y, 180, 22, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('⚠ EMERGENCY — Contact Veterinarian IMMEDIATELY', 105, y + 9, { align: 'center' });
      doc.setFontSize(10);
      doc.text('Emergency Vet Hotline: +94 11 2 888 888', 105, y + 17, { align: 'center' });
    }

    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.text('Generated by CattleSense — ML-Based Cattle Disease Detection Platform (SLIIT Research Project)', 105, 284, { align: 'center' });
    doc.text('Present this report to your veterinarian for faster, more accurate diagnosis and treatment.', 105, 289, { align: 'center' });

    doc.save(`MilkFever_${result.stage}_Report_${date.replace(/\//g, '-')}.pdf`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <section className={`rounded-2xl border-2 ${colors.border} ${colors.bg} p-6 shadow-md space-y-5`}>

        {/* 1. Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className={`text-xl font-black ${colors.text}`}>Detection Result</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {(Number(result.confidence) * 100).toFixed(1)}% model confidence
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold border border-current flex-shrink-0 ${colors.badge}`}>
            {result.stage}
          </span>
        </div>

        {/* 2. Stage Progression Indicator */}
        <div className="pt-1">
          <div className="relative">
            <div className="absolute top-2.5 left-0 right-0 h-0.5 bg-slate-200 dark:bg-slate-700 mx-5" />
            <div
              className={`absolute top-2.5 left-0 h-0.5 ${colors.bar} mx-5 transition-all duration-700`}
              style={{ width: `calc(${(currentIdx / (stages.length - 1)) * 100}% - 40px * ${currentIdx / (stages.length - 1)})` }}
            />
            <div className="relative flex justify-between">
              {stages.map((s, i) => (
                <div key={s} className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold z-10
                    ${i === currentIdx
                      ? `${colors.bar} border-transparent text-white shadow-md`
                      : i < currentIdx
                      ? 'bg-slate-400 border-transparent text-white'
                      : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600'}`}>
                    {i < currentIdx ? '✓' : ''}
                  </div>
                  <span className={`text-[10px] mt-1 font-semibold whitespace-nowrap
                    ${i === currentIdx ? colors.text : 'text-slate-400 dark:text-slate-500'}`}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Risk Score Bar */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-500 dark:text-slate-400 uppercase tracking-wider">Risk Score</span>
            <span className={`font-bold ${colors.text}`}>{result.risk_score} / 100</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${colors.bar}`}
              style={{ width: `${result.risk_score}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Low risk</span>
            <span>High risk</span>
          </div>
        </div>

        {/* 4. Stage Explanation */}
        <div className={`rounded-xl border ${colors.cborder} bg-white/60 dark:bg-black/20 p-3`}>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{explanation}</p>
        </div>

        {/* 5. Nutrition Recommendations */}
        {suggestions && (
          <div className={`rounded-xl border ${colors.cborder} ${colors.card} overflow-hidden`}>
            <div className={`${colors.header} px-4 py-2.5 flex items-center gap-2`}>
              <span>🥗</span>
              <p className="text-white font-bold text-sm">Nutrition Recommendations</p>
            </div>
            <ul className="p-4 space-y-2">
              {suggestions.nutrition.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className={`${colors.dot} font-bold mt-0.5 flex-shrink-0`}>•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 6. Management Actions */}
        {suggestions && (
          <div className={`rounded-xl border ${colors.cborder} ${colors.card} overflow-hidden`}>
            <div className={`${colors.header} px-4 py-2.5 flex items-center gap-2`}>
              <span>🐄</span>
              <p className="text-white font-bold text-sm">Management Actions</p>
            </div>
            <ul className="p-4 space-y-2">
              {suggestions.management.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className={`${colors.dot} font-bold mt-0.5 flex-shrink-0`}>•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 7. Recommended Action */}
        <div className={`rounded-xl border ${colors.border} bg-white/70 dark:bg-black/20 p-4`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Recommended Action
          </p>
          <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
            {result.advice || result.message}
          </p>
        </div>

        {/* 8. Critical Emergency Alert */}
        {result.stage === "Critical" && (
          <div className="rounded-xl bg-red-600 text-white p-4 text-center shadow-lg">
            <p className="font-black text-lg mb-1 flex items-center justify-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              EMERGENCY
            </p>
            <p className="text-sm font-medium">
              Contact a veterinarian IMMEDIATELY
            </p>
            <p className="text-sm mt-1 opacity-90">
              Call: <strong>+94 11 2 888 888</strong>
            </p>
          </div>
        )}

        {/* 9. Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
             onClick={generatePDF}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white transition-colors shadow-sm bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-500"
         >
             📄 Download Veterinary Report (PDF)
          </button>
          <button
  onClick={() => {
    if (onReset) onReset();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }}
  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
>
  🔄 Check Another Cow
</button>
</div>

      </section>
    </motion.div>
  );
}

function FMDWeatherDashboard({ color }) {
  const [weatherData, setWeatherData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [trendData, setTrendData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedDistrict, setSavedDistrict] = useState(null);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [districtChoice, setDistrictChoice] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  // Farmer id comes from the logged-in account (set on login/signup), not manual entry.
  const farmerId = useMemo(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("cattlesense_user") || "null",
      );
      return stored?.id ? String(stored.id) : "demo";
    } catch {
      return "demo";
    }
  }, []);

  const fmdBaseUrl =
    import.meta.env.VITE_FMD_API_URL || "http://127.0.0.1:5002";

  // Weather-based FMD risk uses the farm location the farmer has chosen for
  // this feature (saved district, below) — never the browser's GPS.
  const fetchWeather = async () => {
    setLoading(true);
    setError("");

    try {
      const weatherRes = await fetch(
        `${fmdBaseUrl}/weather/current-risk?farmer_id=${encodeURIComponent(farmerId)}`,
      );
      const weatherJson = await weatherRes.json();
      if (!weatherRes.ok || weatherJson.error) {
        if (weatherRes.status === 400) setNeedsLocation(true);
        throw new Error(weatherJson.error || "Weather service unavailable");
      }
      setNeedsLocation(false);
      setWeatherData(weatherJson);

      const [historyRes, trendRes] = await Promise.all([
        fetch(
          `${fmdBaseUrl}/weather/history?farmer_id=${encodeURIComponent(farmerId)}`,
        ),
        fetch(
          `${fmdBaseUrl}/weather/trend?farmer_id=${encodeURIComponent(farmerId)}`,
        ),
      ]);
      const historyJson = await historyRes.json();
      setHistoryData(Array.isArray(historyJson) ? historyJson : []);
      const trendJson = await trendRes.json();
      setTrendData(Array.isArray(trendJson.history) ? trendJson.history : []);
    } catch (err) {
      setError(
        err.message ||
          "Weather risk is currently unavailable. Image assessment is still available.",
      );
      setWeatherData(null);
      setHistoryData([]);
      setTrendData([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSavedLocationAndWeather = async () => {
    try {
      const locRes = await fetch(
        `${fmdBaseUrl}/weather/location?farmer_id=${encodeURIComponent(farmerId)}`,
      );
      if (locRes.status === 404) {
        setSavedDistrict(null);
        setNeedsLocation(true);
        setShowLocationPicker(true);
        setLoading(false);
        return;
      }
      const locJson = await locRes.json();
      setSavedDistrict(locJson.district || null);
      await fetchWeather();
    } catch {
      setNeedsLocation(true);
      setShowLocationPicker(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetch(`${fmdBaseUrl}/weather/districts`)
      .then((r) => r.json())
      .then((json) =>
        setDistricts(Array.isArray(json.districts) ? json.districts : []),
      )
      .catch(() => setDistricts([]));
    loadSavedLocationAndWeather();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveDistrict = async (event) => {
    event.preventDefault();
    if (!districtChoice) return;
    setSavingLocation(true);
    setError("");
    try {
      const saveRes = await fetch(`${fmdBaseUrl}/weather/location`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmer_id: farmerId, district: districtChoice }),
      });
      const saveJson = await saveRes.json();
      if (!saveRes.ok)
        throw new Error(saveJson.error || "Could not save location");
      setSavedDistrict(saveJson.district);
      setNeedsLocation(false);
      setShowLocationPicker(false);
      await fetchWeather();
    } catch (err) {
      setError(err.message || "Could not save location");
    } finally {
      setSavingLocation(false);
    }
  };

  const riskClass =
    weatherData?.risk_level === "HIGH"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : weatherData?.risk_level === "MEDIUM"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border ${color.border} ${color.bg} p-6`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Weather-based FMD spread risk
          </p>
          <h3 className="text-xl font-black text-slate-900 dark:text-white">
            Weather Risk Dashboard
          </h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Current Location:{" "}
            <strong>
              {savedDistrict || (loading ? "Loading…" : "Not set")}
            </strong>
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-bold ${riskClass}`}
        >
          {weatherData?.risk_level || (loading ? "LOADING…" : "—")}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {savedDistrict
            ? "This is your saved farm location for weather-based FMD risk. This is separate from the individual animal image assessment."
            : "Select your farm's district once — it will be remembered for future weather-based FMD risk checks."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowLocationPicker((v) => !v)}
            className="inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200"
          >
            {savedDistrict ? "Change Location" : "Set Location"}
          </button>
          {savedDistrict && (
            <button
              type="button"
              onClick={fetchWeather}
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white ${color.button}`}
              disabled={loading}
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {(needsLocation || showLocationPicker) && (
        <form
          onSubmit={handleSaveDistrict}
          className="mt-3 grid gap-3 md:grid-cols-3 items-end"
        >
          {needsLocation && (
            <p className="md:col-span-3 text-xs text-slate-500 dark:text-slate-400">
              Please set your current farm location before using weather-based
              FMD risk prediction.
            </p>
          )}
          <div className="md:col-span-2 space-y-1">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300">
              District
            </label>
            <select
              value={districtChoice}
              onChange={(e) => setDistrictChoice(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="">Select district…</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={!districtChoice || savingLocation}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white ${color.button} disabled:opacity-50`}
          >
            {savingLocation ? "Saving…" : "Save Location"}
          </button>
        </form>
      )}

      {weatherData && (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-xl bg-white/70 p-3 dark:bg-black/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Current weather
            </p>
            <p className="mt-1 text-sm">
              <strong>Temperature:</strong> {weatherData.temperature} °C
            </p>
            <p className="text-sm">
              <strong>Humidity:</strong> {weatherData.humidity} %
            </p>
            <p className="text-sm">
              <strong>Rainfall:</strong> {weatherData.rainfall} mm
            </p>
            <p className="text-sm">
              <strong>Alert:</strong> {weatherData.alert_message}
            </p>
          </div>
          <div className="rounded-xl bg-white/70 p-3 dark:bg-black/20">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Risk summary
            </p>
            <p className="mt-1 text-sm">
              <strong>Weather Risk:</strong> {weatherData.risk_level}
            </p>
            <p className="text-sm">
              <strong>Environmental FMD Risk:</strong>{" "}
              {weatherData.environmental_risk}
            </p>
            <p className="text-sm">
              <strong>Banner color:</strong> {weatherData.banner_color}
            </p>
            <p className="text-sm">
              <strong>Timestamp:</strong> {weatherData.timestamp}
            </p>
          </div>
        </div>
      )}

      {weatherData && (
        <div className="mt-4 rounded-xl bg-white/70 p-3 dark:bg-black/20">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Seasonal Context
            </p>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                weatherData.seasonal_active
                  ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {weatherData.seasonal_active ? "ACTIVE" : "NORMAL"}
            </span>
          </div>
          <p className="mt-2 text-sm">
            <strong>Current month:</strong>{" "}
            {new Date().toLocaleString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </p>
          <p className="text-sm">
            <strong>Historical period:</strong> {weatherData.seasonal_period}
          </p>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {weatherData.seasonal_explanation}
          </p>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            Source: {weatherData.seasonal_source}
          </p>
          <p className="mt-2 text-xs italic text-slate-500 dark:text-slate-400">
            {weatherData.seasonal_disclaimer}
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            30-day history
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {historyData.length ? (
              historyData.map((item) => (
                <li
                  key={item.date}
                  className="rounded-lg bg-white/70 px-3 py-2 dark:bg-black/20"
                >
                  {item.date}: {item.predicted_risk} (rain {item.rainfall}, temp{" "}
                  {item.temperature}, hum {item.humidity})
                </li>
              ))
            ) : (
              <li className="text-slate-500">No weather history yet.</li>
            )}
          </ul>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            7-day trend
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {trendData.length ? (
              trendData.map((item) => (
                <li
                  key={item.date}
                  className="rounded-lg bg-white/70 px-3 py-2 dark:bg-black/20"
                >
                  {item.date}: {item.predicted_risk}
                </li>
              ))
            ) : (
              <li className="text-slate-500">No trend data yet.</li>
            )}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}

// FMD-specific result: shows the image model and weather-risk model as two
// distinct signals, then the transparent hybrid assessment that combines
// them (never a single opaque score) — per the FMD hybrid decision layer.
function FMDResultCard({ result }) {
  if (!result) return null;

  const hybrid = result.hybrid_assessment || {};
  const weather = result.weather_risk || {};
  const imagePositive = String(result.predicted_label) === "1";

  const overall =
    hybrid.overall_assessment ||
    (imagePositive ? "POSSIBLE FMD" : "LOW CURRENT CONCERN");
  const overallIsUrgent =
    overall === "HIGH CONCERN" || overall === "POSSIBLE FMD";

  // The badge reflects environmental_level (weather + DAPH seasonal
  // escalation) since that's the value actually used for the hybrid
  // decision below — but the raw weather-only level is still shown in the
  // body text, never hidden.
  const displayedRiskLevel = weather.environmental_level ?? weather.level;
  const weatherBadgeClass =
    displayedRiskLevel === "HIGH"
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      : displayedRiskLevel === "MEDIUM"
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
        : displayedRiskLevel === "LOW"
          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"
          : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <article
        className={`rounded-3xl border p-6 shadow-sm ${overallIsUrgent ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"}`}
      >
        <p className="text-[11px] font-black uppercase tracking-[0.28em] opacity-70">
          FMD Assessment
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Image analysis */}
          <div className="rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-black/20">
            <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">
              Image Analysis
            </p>
            <p className="mt-2 text-lg font-bold">
              {hybrid.image_result ||
                (imagePositive
                  ? "FMD-consistent lesions detected"
                  : "No visible FMD lesions detected")}
            </p>
            {result.confidence && (
              <p className="mt-1 text-sm opacity-80">
                Confidence: <strong>{result.confidence}</strong>
              </p>
            )}
          </div>

          {/* Weather + seasonal (environmental) risk */}
          <div className="rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-black/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">
                Environmental FMD Risk
              </p>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${weatherBadgeClass}`}
              >
                {displayedRiskLevel || "N/A"}
              </span>
            </div>
            {weather.available ? (
              <div className="mt-2 text-sm space-y-1">
                <p>
                  <strong>Weather Risk:</strong> {weather.level}
                </p>
                <p>
                  <strong>Temperature:</strong> {weather.temperature} °C
                </p>
                <p>
                  <strong>Humidity:</strong> {weather.humidity} %
                </p>
                <p>
                  <strong>Rainfall:</strong> {weather.rainfall} mm
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm opacity-80">
                {weather.message || "Weather risk is currently unavailable."}
              </p>
            )}
            {weather.seasonal_explanation && (
              <div
                className={`mt-3 rounded-xl border p-2.5 ${
                  weather.seasonal_active
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
                    : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700"
                }`}
              >
                <p
                  className={`text-xs font-bold ${
                    weather.seasonal_active
                      ? "text-amber-800 dark:text-amber-300"
                      : "text-slate-600 dark:text-slate-300"
                  }`}
                >
                  Seasonal Context:{" "}
                  {weather.seasonal_active ? "ACTIVE" : "NORMAL"}
                  {weather.seasonal_period
                    ? ` (${weather.seasonal_period})`
                    : ""}
                </p>
                <p
                  className={`mt-1 text-xs ${
                    weather.seasonal_active
                      ? "text-amber-700 dark:text-amber-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {weather.seasonal_explanation}
                </p>
                {weather.seasonal_disclaimer && (
                  <p className="mt-2 text-[11px] italic opacity-60">
                    {weather.seasonal_disclaimer}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-black/20">
          <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">
            Overall Assessment
          </p>
          <p className="mt-2 text-xl font-black">{overall}</p>
          {hybrid.explanation && (
            <p className="mt-2 text-sm opacity-80">{hybrid.explanation}</p>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-black/20">
          <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">
            Recommendation
          </p>
          <p className="mt-2 text-sm leading-6">
            {hybrid.recommendation || result.recommendation || result.advice}
          </p>
          <p className="mt-3 text-xs italic opacity-60">
            This is a decision-support estimate, not a confirmed veterinary
            diagnosis. Always seek veterinary confirmation for suspected cases.
          </p>
        </div>
      </article>
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

// ─── Main page ──────────────────────────────────────────────────────────────

export default function DetectionPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { moduleKey } = useParams();
  const { showSuccess, showError } = useToast();
  const cowIdFromQuery =
    searchParams.get("cowId") || searchParams.get("cow_id") || "";

  const meta = MODULE_META[moduleKey] || MODULE_META.mastitis;
  const { color } = meta;
  const Icon = meta.icon;

  const [cows, setCows] = useState([]);
  const [form, setForm] = useState({
    cowId: cowIdFromQuery,
    image: null,
    // Mastitis
    milkTemperature: "",
    milkYield: "",
    clotting: "",
    reducedAppetite: false,
    restlessOrDiscomfort: false,
    kickingDuringMilking: false,
    swollenUdder: false,
    warmOrPainfulUdder: false,
    clotsInMilk: false,
    // FMD
    lesionsInMouth: false,
    lesionsOnHooves: false,
    excessiveDrooling: false,
    highFever: false,
    lamenessOrLimping: false,
    reducedFeedIntake: false,
    reluctanceToWalk: false,
    milkDropInDairy: false,
    bodyTemperature: "",
    lesionLocation: "",
    // LSD
    swollenLymphNodes: false,
    noseDischarge: false,
    eyeDischarge: false,
    reducedMilkProduction: false,
    decreasedAppetite: false,
    // Milk Fever (New variables)
    parity: "",
    calving_date: "",
    behavioral: "normal",
    eating: "100",
    bcs: "3.0",
    cannot_stand: false,
    muscle_tremors: false,
  });

  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
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
    if (form.bodyTemperature)
      payload.append("body_temperature", form.bodyTemperature);

    // Needed so the FMD module can look up this farmer's saved district
    // location for the weather-risk half of the hybrid assessment.
    try {
      const stored = JSON.parse(
        localStorage.getItem("cattlesense_user") || "null",
      );
      if (stored?.id) payload.append("farmer_id", String(stored.id));
    } catch {
      // no-op: hybrid assessment will just report weather as unavailable
    }

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
      setResult({ type: "fmd", data: response?.data || response });
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
      high_fever: form.highFever,
      swollen_lymph_nodes: form.swollenLymphNodes,
      nose_discharge: form.noseDischarge,
      eye_discharge: form.eyeDischarge,
      reduced_milk: form.reducedMilkProduction,
      decreased_appetite: form.decreasedAppetite,
      body_temperature: form.bodyTemperature || null,
    };
    payload.append("symptoms", JSON.stringify(symptoms));

    try {
      setIsSubmitting(true);
      setError("");
      const response = await predictLSDAssisted(payload);
      setResult({ type: "lsd", data: response?.data || response });
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
      const m = "Please fill in all required fields (Parity & Calving Date).";
      setError(m);
      showError(m);
      return;
    }

    // ── Payload Calculation Logic from Custom Component ──
    const behaviorOption = BEHAVIORAL_OPTIONS.find(
      (o) => o.value === form.behavioral,
    );
    const activityLevel = behaviorOption ? behaviorOption.score : 50;

    let daysToCalving = 0;
    if (form.calving_date) {
      const calving = new Date(form.calving_date);
      const today = new Date();
      const diffDays = Math.round((calving - today) / (1000 * 60 * 60 * 24));
      daysTocalving = Math.max(0, Math.min(30, diffDays + 3));
    }

    let bloodCalcium = 9.0;
    if (form.cannot_stand) bloodCalcium -= 2.5;
    if (form.muscle_tremors) bloodCalcium -= 1.5;
    if (form.behavioral === "unable_to_stand") bloodCalcium -= 2.0;
    if (form.behavioral === "muscle_tremors") bloodCalcium -= 1.0;
    if (form.behavioral === "reduced_movement") bloodCalcium -= 0.5;
    bloodCalcium = Math.max(3.5, bloodCalcium);

    const calculatedData = {
      parity: parseInt(form.parity) || 1,
      blood_calcium: bloodCalcium,
      blood_phosphorus: 5.5,
      bcs: parseFloat(form.bcs),
      days_to_calving: daysTocalving,
      milk_yield_day1: (parseFloat(form.eating) / 100) * 20,
      activity_level: activityLevel,
      dcad: parseInt(form.parity) >= 3 ? 20 : -30,
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

      {/* Main form card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.05 }}
      >
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {moduleKey === "mastitis" && (
              <MastitisForm
                form={form}
                onChange={handleChange}
                onFileChange={handleFileChange}
                imagePreview={imagePreview}
                cows={cows}
                color={color}
              />
            )}
            {moduleKey === "fmd" && (
              <FMDForm
                form={form}
                onChange={handleChange}
                onFileChange={handleFileChange}
                imagePreview={imagePreview}
                cows={cows}
                color={color}
              />
            )}
            {moduleKey === "lumpy" && (
              <LSDForm
                form={form}
                onChange={handleChange}
                onFileChange={handleFileChange}
                imagePreview={imagePreview}
                cows={cows}
                color={color}
              />
            )}
            {moduleKey === "milk-fever" && (
              <MilkFeverForm
                form={form}
                onChange={handleChange}
                cows={cows}
                color={color}
              />
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {result.type === "mastitis" && (
            <DetectionResultCard result={result.data} />
          )}
          {result.type === "milk-fever" && (
            <MilkFeverResultCard result={result.data} />
          )}
          {result.type === "fmd" && <FMDResultCard result={result.data} />}
          {result.type === "generic" && (
            <SimpleResultCard result={result.data} />
          )}
        </motion.div>
      )}
    </PageWrapper>
  );
}
