/**
 * DetectionPage — Disease-specific detection form for each of the 4 ML modules.
 * Route: /detect/:moduleKey  (mastitis | fmd | lumpy | milk-fever)
 *
 * Each disease renders its own form with the correct inputs, colour theme,
 * and disease information panel. All four call the shared backend proxy at
 * /api/modules/<moduleKey>/predict-assisted (image modules) or
 * /api/modules/<moduleKey>/predict (JSON-only Milk Fever).
 */

import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper from "../components/PageWrapper";
import {
  Upload, ArrowLeft, CheckCircle, AlertCircle, Loader,
  HeartPulse, ShieldAlert, Syringe, Thermometer,
  Info, Camera, Stethoscope,
} from "lucide-react";
import { Card, Button, Input, Alert, Badge } from "../components/ui/index.jsx";
import { useToast } from "../hooks/useToast";
import { useI18n } from "../i18n/language-context";
import DetectionResultCard from "../components/DetectionResultCard";
import { getCows, predictMastitisAssisted, predictFMDAssisted, predictLSDAssisted, predictMilkFeverAssisted } from "../services/api";

// ─── Per-module metadata ────────────────────────────────────────────────────

const MODULE_META = {
  mastitis: {
    title: "Mastitis Detection",
    icon: HeartPulse,
    badge: "Udder Health",
    color: {
      gradient: "from-emerald-500 to-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      icon: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
      badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
      button: "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
      ring: "ring-emerald-500",
      dot: "bg-emerald-500",
    },
    about: "Mastitis is an inflammatory reaction of the udder caused by bacterial infection. It is one of the most costly diseases in dairy farming. Early detection significantly reduces treatment cost and prevents milk loss.",
    howItWorks: "This module combines udder image analysis (CNN), optional milk data (temperature, yield, clotting), and behavioural signals to produce a fused multimodal prediction.",
    requires: "Udder photograph (required) + optional milk & behaviour data",
  },
  fmd: {
    title: "Foot-and-Mouth Disease",
    icon: ShieldAlert,
    badge: "Highly Contagious",
    color: {
      gradient: "from-orange-500 to-orange-600",
      bg: "bg-orange-50 dark:bg-orange-900/20",
      border: "border-orange-200 dark:border-orange-800",
      icon: "text-orange-600 dark:text-orange-400",
      iconBg: "bg-orange-100 dark:bg-orange-900/30",
      badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
      button: "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
      ring: "ring-orange-500",
      dot: "bg-orange-500",
    },
    about: "Foot-and-Mouth Disease (FMD) is a highly contagious viral disease affecting cloven-hoofed animals. It causes fever, blistering lesions in the mouth, feet and udder. Early detection is critical to prevent herd spread.",
    howItWorks: "This module uses a deep CNN to detect characteristic FMD lesions in uploaded photographs of the mouth and hoof areas, combined with clinical symptom inputs.",
    requires: "Mouth/hoof photograph (required) + symptom checklist",
  },
  lumpy: {
    title: "Lumpy Skin Disease",
    icon: Syringe,
    badge: "Skin Condition",
    color: {
      gradient: "from-violet-500 to-violet-600",
      bg: "bg-violet-50 dark:bg-violet-900/20",
      border: "border-violet-200 dark:border-violet-800",
      icon: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-100 dark:bg-violet-900/30",
      badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
      button: "bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700",
      ring: "ring-violet-500",
      dot: "bg-violet-500",
    },
    about: "Lumpy Skin Disease (LSD) is a viral disease characterized by fever and the appearance of nodules across the skin of cattle. It spreads through insects and direct contact, causing significant production and trade losses.",
    howItWorks: "This module applies a CNN-based object detection model to identify and count characteristic skin nodules in photographs, assisting with disease staging.",
    requires: "Full-body or skin photograph (required) + nodule & fever data",
  },
  "milk-fever": {
    title: "Milk Fever Detection",
    icon: Thermometer,
    badge: "Post-Calving",
    color: {
      gradient: "from-teal-500 to-teal-600",
      bg: "bg-teal-50 dark:bg-teal-900/20",
      border: "border-teal-200 dark:border-teal-800",
      icon: "text-teal-600 dark:text-teal-400",
      iconBg: "bg-teal-100 dark:bg-teal-900/30",
      badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300",
      button: "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700",
      ring: "ring-teal-500",
      dot: "bg-teal-500",
    },
    about: "Milk Fever (hypocalcaemia) occurs in dairy cows around calving when blood calcium drops rapidly. It causes muscle weakness, inability to rise, and can be fatal if untreated. Early identification is critical.",
    howItWorks: "This module analyses a combination of clinical symptom data (post-calving period, neurological and muscular signs) using a trained ML classification model.",
    requires: "Clinical symptom checklist (required) + optional body photograph",
  },
};

// ─── Shared sub-components ──────────────────────────────────────────────────

function DiseaseInfoPanel({ meta }) {
  const { color } = meta;
  const Icon = meta.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border ${color.border} ${color.bg} p-6`}
    >
      <div className="flex items-start gap-4">
        <div className={`h-12 w-12 rounded-xl flex-shrink-0 ${color.iconBg} flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${color.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{meta.title}</h2>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${color.badge}`}>
              {meta.badge}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            {meta.about}
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Stethoscope className={`h-4 w-4 flex-shrink-0 mt-0.5 ${color.icon}`} />
              <p className="text-xs text-slate-500 dark:text-slate-400">{meta.howItWorks}</p>
            </div>
            <div className="flex gap-2">
              <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${color.icon}`} />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">{meta.requires}</p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CowSelector({ cows, value, onChange, color }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
        Select Cow (optional — links result to cattle record)
      </label>
      <select
        name="cowId"
        value={value}
        onChange={onChange}
        className={`w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${color.ring} focus:ring-offset-0`}
      >
        <option value="">No specific cow (general check)</option>
        {cows.map((cow) => (
          <option key={cow.id} value={cow.id}>
            {cow.name} — {cow.breed}
          </option>
        ))}
      </select>
    </div>
  );
}

function ImageUpload({ id, imagePreview, onFileChange, color }) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
        <Camera className={`h-4 w-4 ${color.icon}`} />
        Upload Photograph
      </label>
      <input
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="sr-only"
        id={id}
      />
      <label
        htmlFor={id}
        className={`block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 p-8 text-center
          hover:border-current hover:bg-opacity-50 transition-all duration-200 ${color.icon}`}
      >
        <Upload className="h-10 w-10 mx-auto mb-3 opacity-60" />
        <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
          Click to upload or drag & drop
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400">PNG, JPG up to 10 MB</p>
      </label>

      {imagePreview && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative rounded-2xl overflow-hidden"
        >
          <img
            src={imagePreview}
            alt="Uploaded preview"
            className="w-full h-56 object-cover rounded-2xl border border-slate-200 dark:border-slate-700"
          />
          <Badge className="absolute top-3 right-3" variant="success">
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Ready
          </Badge>
        </motion.div>
      )}
    </div>
  );
}

function SectionHeader({ label, optional = false, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {optional && (
        <span className="inline-block px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold">
          Optional
        </span>
      )}
      <h3 className="text-base font-bold text-slate-900 dark:text-white">{label}</h3>
    </div>
  );
}

function CheckboxGrid({ items, values, onChange }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
      {items.map(([name, label]) => (
        <label
          key={name}
          className="flex items-center gap-3 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
        >
          <input
            type="checkbox"
            name={name}
            checked={Boolean(values[name])}
            onChange={onChange}
            className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">{label}</span>
        </label>
      ))}
    </div>
  );
}

// ─── Module-specific forms ──────────────────────────────────────────────────

function MastitisForm({ form, onChange, onFileChange, imagePreview, cows, color }) {
  return (
    <div className="space-y-8">
      <CowSelector cows={cows} value={form.cowId} onChange={onChange} color={color} />

      <ImageUpload id="mastitis-image" imagePreview={imagePreview} onFileChange={onFileChange} color={color} />

      <div className="space-y-4">
        <SectionHeader label="Milk & Health Details" optional />
        <p className="text-sm text-slate-500 dark:text-slate-400">Adding these details improves prediction accuracy.</p>
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
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Clotting</label>
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

      <div className="space-y-4">
        <SectionHeader label="Signs You Have Noticed" optional />
        <p className="text-sm text-slate-500 dark:text-slate-400">Tick anything you have seen in the cow.</p>
        <CheckboxGrid
          items={[
            ["reducedAppetite", "Reduced appetite"],
            ["restlessOrDiscomfort", "Restless or discomfort"],
            ["kickingDuringMilking", "Kicking during milking"],
            ["swollenUdder", "Swollen udder"],
            ["warmOrPainfulUdder", "Warm or painful udder"],
            ["clotsInMilk", "Clots in milk"],
          ]}
          values={form}
          onChange={onChange}
        />
      </div>
    </div>
  );
}

function FMDForm({ form, onChange, onFileChange, imagePreview, cows, color }) {
  return (
    <div className="space-y-8">
      <CowSelector cows={cows} value={form.cowId} onChange={onChange} color={color} />

      <ImageUpload id="fmd-image" imagePreview={imagePreview} onFileChange={onFileChange} color={color} />

      <div className="space-y-4">
        <SectionHeader label="FMD Clinical Symptoms" optional />
        <p className="text-sm text-slate-500 dark:text-slate-400">Select all symptoms you have observed.</p>
        <CheckboxGrid
          items={[
            ["lesionsInMouth", "Lesions / blisters in mouth or tongue"],
            ["lesionsOnHooves", "Lesions or sores on hooves"],
            ["excessiveDrooling", "Excessive drooling / salivation"],
            ["highFever", "High fever (≥ 40°C)"],
            ["lamenessOrLimping", "Lameness / limping"],
            ["reducedFeedIntake", "Reduced feed intake"],
            ["reluctanceToWalk", "Reluctance to walk or stand"],
            ["milkDropInDairy", "Sudden drop in milk production"],
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
            placeholder="e.g. 40.5"
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Lesion Location</label>
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

function LSDForm({ form, onChange, onFileChange, imagePreview, cows, color }) {
  return (
    <div className="space-y-8">
      <CowSelector cows={cows} value={form.cowId} onChange={onChange} color={color} />

      <ImageUpload id="lsd-image" imagePreview={imagePreview} onFileChange={onFileChange} color={color} />

      <div className="space-y-4">
        <SectionHeader label="LSD Clinical Symptoms" optional />
        <p className="text-sm text-slate-500 dark:text-slate-400">Select all symptoms visible in the cattle.</p>
        <CheckboxGrid
          items={[
            ["skinNodules", "Firm skin nodules on body"],
            ["noduleOnHead", "Nodules on head / neck"],
            ["noduleOnLegs", "Nodules on legs / lower body"],
            ["highFever", "High fever (≥ 40°C)"],
            ["swollenLymphNodes", "Swollen lymph nodes"],
            ["nasalDischarge", "Nasal or ocular discharge"],
            ["reducedMilkProduction", "Reduced milk production"],
            ["decreasedAppetite", "Decreased appetite / lethargy"],
          ]}
          values={form}
          onChange={onChange}
        />
      </div>

      <div className="space-y-4">
        <SectionHeader label="Lesion Details" optional />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Approximate Nodule Count"
            type="number"
            name="noduleCount"
            value={form.noduleCount || ""}
            onChange={onChange}
            placeholder="e.g. 15"
          />
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
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nodule Distribution</label>
          <select
            name="noduleDistribution"
            value={form.noduleDistribution || ""}
            onChange={onChange}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ring-violet-500"
          >
            <option value="">Select…</option>
            <option value="localised">Localised (few areas)</option>
            <option value="scattered">Scattered across body</option>
            <option value="widespread">Widespread / generalised</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function MilkFeverForm({ form, onChange, onFileChange, imagePreview, cows, color }) {
  return (
    <div className="space-y-8">
      <CowSelector cows={cows} value={form.cowId} onChange={onChange} color={color} />

      <div className="space-y-4">
        <SectionHeader label="Post-Calving Details" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Days Since Calving"
            type="number"
            name="daysSinceCalving"
            value={form.daysSinceCalving || ""}
            onChange={onChange}
            placeholder="e.g. 1"
          />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Parity (Calving Number)</label>
            <select
              name="parity"
              value={form.parity || ""}
              onChange={onChange}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ring-teal-500"
            >
              <option value="">Select…</option>
              <option value="1">1st calving</option>
              <option value="2">2nd calving</option>
              <option value="3">3rd calving</option>
              <option value="4+">4th or more</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader label="Clinical Symptoms" />
        <p className="text-sm text-slate-500 dark:text-slate-400">Select all signs you have observed in the cow.</p>
        <CheckboxGrid
          items={[
            ["muscleTremors", "Muscle tremors / twitching"],
            ["inabilityToRise", "Inability to rise or stand"],
            ["staggeringGait", "Staggering or wobbly gait"],
            ["coldExtremities", "Cold ears / extremities"],
            ["reducedConsciousness", "Dull / reduced consciousness"],
            ["reducedRumenMovements", "Reduced rumen movements"],
            ["hypocalcaemiaHistory", "Previous history of milk fever"],
            ["lowBloodCalcium", "Known low blood calcium"],
          ]}
          values={form}
          onChange={onChange}
        />
      </div>

      <div className="space-y-4">
        <SectionHeader label="Body Photograph" optional />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          An optional photograph of the cow's posture or condition can improve prediction accuracy.
        </p>
        <ImageUpload id="milkfever-image" imagePreview={imagePreview} onFileChange={onFileChange} color={color} />
      </div>
    </div>
  );
}

// ─── Generic result card for non-mastitis modules ───────────────────────────
// (Mastitis has its own bespoke DetectionResultCard)

function SimpleResultCard({ result }) {
  if (!result) return null;

  const prediction = result.prediction ?? result.stage ?? result.disease ?? result.result ?? "Unknown";
  const confidence = result.confidence != null
    ? `${(Number(result.confidence) * 100).toFixed(1)}%`
    : null;
  const message = result.message || result.details || "";

  const isPositive = String(prediction).toLowerCase().includes("positive")
    || String(prediction).toLowerCase().includes("detected")
    || String(prediction).toLowerCase().includes("sick")
    || Number(result.label) === 1;

  const panelClass = isPositive
    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
    : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <article className={`rounded-2xl border p-6 shadow-sm ${panelClass}`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Detection Result</p>
            <h3 className="text-2xl font-black">{String(prediction)}</h3>
          </div>
          <span className={`rounded-full border px-3 py-1 text-xs font-bold ${isPositive ? "border-red-300 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "border-emerald-300 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300"}`}>
            {isPositive ? "Disease Detected" : "Appears Healthy"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3 text-sm">
          {confidence && (
            <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3 backdrop-blur">
              <p className="font-semibold text-xs uppercase tracking-wider opacity-70 mb-1">Confidence</p>
              <p className="text-xl font-bold">{confidence}</p>
            </div>
          )}
          {message && (
            <div className="rounded-xl bg-white/60 dark:bg-black/20 p-3 backdrop-blur">
              <p className="font-semibold text-xs uppercase tracking-wider opacity-70 mb-1">Note</p>
              <p className="leading-relaxed">{message}</p>
            </div>
          )}
        </div>

        <div className="mt-4 p-4 rounded-xl bg-white/60 dark:bg-black/20 backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-2">
            {isPositive ? "⚠️ Recommended Action" : "✅ Continue Monitoring"}
          </p>
          <p className="text-sm leading-relaxed">
            {isPositive
              ? "Consult a veterinarian as soon as possible. Isolate the animal from the herd to prevent potential spread. Record the detection result in the cattle health log."
              : "The animal does not show strong signs of disease at this time. Continue regular health monitoring and re-check if symptoms develop."}
          </p>
        </div>
      </article>
    </motion.div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function DetectionPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { moduleKey } = useParams();
  const { showSuccess, showError } = useToast();
  const cowIdFromQuery = searchParams.get("cowId") || searchParams.get("cow_id") || "";

  const meta = MODULE_META[moduleKey] || MODULE_META.mastitis;
  const { color } = meta;
  const Icon = meta.icon;

  const [cows, setCows] = useState([]);
  const [form, setForm] = useState({
    cowId: cowIdFromQuery,
    image: null,
    // Mastitis
    milkTemperature: "", milkYield: "", clotting: "",
    reducedAppetite: false, restlessOrDiscomfort: false, kickingDuringMilking: false,
    swollenUdder: false, warmOrPainfulUdder: false, clotsInMilk: false,
    // FMD
    lesionsInMouth: false, lesionsOnHooves: false, excessiveDrooling: false,
    highFever: false, lamenessOrLimping: false, reducedFeedIntake: false,
    reluctanceToWalk: false, milkDropInDairy: false,
    bodyTemperature: "", lesionLocation: "",
    // LSD
    skinNodules: false, noduleOnHead: false, noduleOnLegs: false,
    swollenLymphNodes: false, nasalDischarge: false, reducedMilkProduction: false,
    decreasedAppetite: false,
    noduleCount: "", noduleDistribution: "",
    // Milk Fever
    daysSinceCalving: "", parity: "",
    muscleTremors: false, inabilityToRise: false, staggeringGait: false,
    coldExtremities: false, reducedConsciousness: false, reducedRumenMovements: false,
    hypocalcaemiaHistory: false, lowBloodCalcium: false,
  });

  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  // Reset result when module changes
  useEffect(() => {
    setResult(null);
    setError("");
    setImagePreview("");
    setForm(prev => ({ ...prev, image: null }));
  }, [moduleKey]);

  useEffect(() => {
    getCows()
      .then(r => setCows(r.cows || []))
      .catch(() => setCows([]));
  }, []);

  useEffect(() => {
    return () => { if (imagePreview) URL.revokeObjectURL(imagePreview); };
  }, [imagePreview]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm(prev => ({ ...prev, image: file }));
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      showSuccess("Image selected successfully");
    }
  };

  // ── Submit handlers per module ────────────────────────────────────────────

  const handleMastitisSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.image) { const m = "Please upload an udder photograph"; setError(m); showError(m); return; }
    if (!form.cowId) { const m = "Please select a cow to link this result"; setError(m); showError(m); return; }

    const payload = new FormData();
    payload.append("image", form.image);
    payload.append("cow_id", form.cowId);

    const hasHealth = form.milkTemperature !== "" || form.milkYield !== "" || form.clotting !== "";
    if (hasHealth) {
      payload.append("health_inputs", JSON.stringify({
        milk_temperature: form.milkTemperature === "" ? null : Number(form.milkTemperature),
        milk_yield: form.milkYield === "" ? null : Number(form.milkYield),
        clotting: form.clotting || null,
      }));
    }

    const behaviorSignals = {
      reduced_appetite: form.reducedAppetite,
      restless_or_discomfort: form.restlessOrDiscomfort,
      kicking_during_milking: form.kickingDuringMilking,
      swollen_udder: form.swollenUdder,
      warm_or_painful_udder: form.warmOrPainfulUdder,
      clots_in_milk: form.clotsInMilk,
    };
    if (Object.values(behaviorSignals).some(Boolean)) {
      payload.append("behavior_signals", JSON.stringify(behaviorSignals));
    }

    try {
      setIsSubmitting(true);
      const response = await predictMastitisAssisted(payload);
      if (!response?.success || !response?.data) throw new Error(response?.error || "Server error");
      setResult({ type: "mastitis", data: response.data });
      showSuccess("Detection completed successfully");
    } catch (err) {
      setResult(null);
      const m = err.message || "Server error";
      setError(m); showError(m);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFMDSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.image) { const m = "Please upload a photograph"; setError(m); showError(m); return; }

    const payload = new FormData();
    payload.append("image", form.image);
    if (form.cowId) payload.append("cow_id", form.cowId);

    const symptoms = {
      lesions_in_mouth: form.lesionsInMouth,
      lesions_on_hooves: form.lesionsOnHooves,
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
      const response = await predictFMDAssisted(payload);
      setResult({ type: "generic", data: response?.data || response });
      showSuccess("FMD detection completed");
    } catch (err) {
      setResult(null);
      const m = err.message || "Server error";
      setError(m); showError(m);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLSDSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.image) { const m = "Please upload a skin/body photograph"; setError(m); showError(m); return; }

    const payload = new FormData();
    payload.append("image", form.image);
    if (form.cowId) payload.append("cow_id", form.cowId);

    const symptoms = {
      skin_nodules: form.skinNodules,
      nodule_on_head: form.noduleOnHead,
      nodule_on_legs: form.noduleOnLegs,
      high_fever: form.highFever,
      swollen_lymph_nodes: form.swollenLymphNodes,
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
      const response = await predictLSDAssisted(payload);
      setResult({ type: "generic", data: response?.data || response });
      showSuccess("LSD detection completed");
    } catch (err) {
      setResult(null);
      const m = err.message || "Server error";
      setError(m); showError(m);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMilkFeverSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const payload = new FormData();
    if (form.image) payload.append("image", form.image);
    if (form.cowId) payload.append("cow_id", form.cowId);

    const clinical = {
      days_since_calving: form.daysSinceCalving || null,
      parity: form.parity || null,
      muscle_tremors: form.muscleTremors,
      inability_to_rise: form.inabilityToRise,
      staggering_gait: form.staggeringGait,
      cold_extremities: form.coldExtremities,
      reduced_consciousness: form.reducedConsciousness,
      reduced_rumen_movements: form.reducedRumenMovements,
      hypocalcaemia_history: form.hypocalcaemiaHistory,
      low_blood_calcium: form.lowBloodCalcium,
    };
    payload.append("clinical", JSON.stringify(clinical));

    try {
      setIsSubmitting(true);
      const response = await predictMilkFeverAssisted(payload);
      setResult({ type: "generic", data: response?.data || response });
      showSuccess("Milk Fever detection completed");
    } catch (err) {
      setResult(null);
      const m = err.message || "Server error";
      setError(m); showError(m);
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
  const canSubmit = requiresImage ? !!form.image : true;

  return (
    <PageWrapper className="max-w-3xl mx-auto space-y-6">

      {/* Back navigation */}
      <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
        <button
          onClick={() => navigate("/modules")}
          className={`inline-flex items-center gap-2 text-sm font-medium ${color.icon} hover:opacity-80 transition-opacity`}
        >
          <ArrowLeft className="h-4 w-4" />
          {t("detection.backToChecks") || "Back to Detection Hub"}
        </button>
      </motion.div>

      {/* Disease info panel */}
      <DiseaseInfoPanel meta={meta} />

      {/* Main form card */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, delay: 0.05 }}>
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {moduleKey === "mastitis" && (
              <MastitisForm form={form} onChange={handleChange} onFileChange={handleFileChange} imagePreview={imagePreview} cows={cows} color={color} />
            )}
            {moduleKey === "fmd" && (
              <FMDForm form={form} onChange={handleChange} onFileChange={handleFileChange} imagePreview={imagePreview} cows={cows} color={color} />
            )}
            {moduleKey === "lumpy" && (
              <LSDForm form={form} onChange={handleChange} onFileChange={handleFileChange} imagePreview={imagePreview} cows={cows} color={color} />
            )}
            {moduleKey === "milk-fever" && (
              <MilkFeverForm form={form} onChange={handleChange} onFileChange={handleFileChange} imagePreview={imagePreview} cows={cows} color={color} />
            )}

            {error && <Alert variant="error" message={error} />}

            <div className="pt-5 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting || !canSubmit}
                className={`w-full gap-2 text-white font-bold py-3.5 rounded-xl shadow-lg transition-all duration-200 ${color.button}`}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" />
                    Running ML Detection…
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Run {meta.title}
                  </>
                )}
              </Button>
              {requiresImage && !form.image && (
                <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-2">
                  Upload a photograph above to enable the detection
                </p>
              )}
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Results */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {result.type === "mastitis"
            ? <DetectionResultCard result={result.data} />
            : <SimpleResultCard result={result.data} />
          }
        </motion.div>
      )}

    </PageWrapper>
  );
}
