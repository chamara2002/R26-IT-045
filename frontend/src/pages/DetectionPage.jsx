/**
 * DetectionPage — Disease-specific detection form for each of the 4 ML modules.
 * Route: /detect/:moduleKey  (mastitis | fmd | lumpy | milk-fever)
 *
 * Each disease renders its own form with the correct inputs, colour theme,
 * and disease information panel. All four call the shared backend proxy at
 * /api/modules/<moduleKey>/predict-assisted (image modules) or
 * /api/modules/<moduleKey>/predict (JSON-only Milk Fever).
 */

import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper from "../components/PageWrapper";
import {
  Upload, ArrowLeft, CheckCircle, Loader,
  HeartPulse, ShieldAlert, Syringe, Thermometer,
  Info, Camera, Stethoscope,
} from "lucide-react";
import { Card, Button, Input, Alert, Badge } from "../components/ui/index.jsx";
import { useToast } from "../hooks/useToast";
import { useI18n } from "../i18n/language-context";
import DetectionResultCard from "../components/DetectionResultCard";
import { getCows, predictMastitisAssisted, predictFMDAssisted, predictLSDAssisted, predictMilkFever } from "../services/api";

// ─── Constants for Milk Fever ───────────────────────────────────────────────

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

const STAGE_COLORS = {
  Subclinical: { bg: "bg-blue-50 dark:bg-blue-900/20",   border: "border-blue-400 dark:border-blue-800",   text: "text-blue-800 dark:text-blue-300",   badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200"   },
  Mild:        { bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-400 dark:border-yellow-800", text: "text-yellow-800 dark:text-yellow-300", badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200" },
  Moderate:    { bg: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-400 dark:border-orange-800", text: "text-orange-800 dark:text-orange-300", badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200" },
  Critical:    { bg: "bg-red-50 dark:bg-red-900/20",    border: "border-red-500 dark:border-red-800",    text: "text-red-800 dark:text-red-300",    badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200"      },
};

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
      badge:
        "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
      button:
        "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700",
      ring: "ring-emerald-500",
    },
    about:
      "Mastitis is an inflammatory reaction of the udder caused by bacterial infection. It is one of the most costly diseases in dairy farming. Early detection significantly reduces treatment cost and prevents milk loss.",
    howItWorks:
      "This module combines udder image analysis (CNN), optional milk data (temperature, yield, clotting), and behavioural signals to produce a fused multimodal prediction.",
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
      badge:
        "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300",
      button:
        "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700",
      ring: "ring-orange-500",
    },
    about:
      "Foot-and-Mouth Disease (FMD) is a highly contagious viral disease affecting cloven-hoofed animals. It causes fever, blistering lesions in the mouth, feet and udder. Early detection is critical to prevent herd spread.",
    howItWorks:
      "This module uses a deep CNN to detect characteristic FMD lesions in uploaded photographs of the mouth and hoof areas, combined with clinical symptom inputs.",
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
      badge:
        "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300",
      button:
        "bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700",
      ring: "ring-violet-500",
    },
    about:
      "Lumpy Skin Disease (LSD) is a viral disease characterized by fever and the appearance of nodules across the skin of cattle. It spreads through insects and direct contact, causing significant production and trade losses.",
    howItWorks:
      "This module applies a CNN-based object detection model to identify and count characteristic skin nodules in photographs, assisting with disease staging.",
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
      button:
        "bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700",
      ring: "ring-teal-500",
    },
    about: "Milk Fever (hypocalcaemia) occurs in dairy cows around calving when blood calcium drops rapidly. It causes muscle weakness, inability to rise, and can be fatal if untreated. Early identification is critical.",
    howItWorks: "This module analyses clinical observations and historical data (parity, days to calving, behavior, BCS) to predict the risk and stage of Milk Fever without lab tests.",
    requires: "Clinical observation answers (required)",
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
        <div
          className={`h-12 w-12 rounded-xl flex-shrink-0 ${color.iconBg} flex items-center justify-center`}
        >
          <Icon className={`h-6 w-6 ${color.icon}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {meta.title}
            </h2>
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${color.badge}`}
            >
              {meta.badge}
            </span>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
            {meta.about}
          </p>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Stethoscope
                className={`h-4 w-4 flex-shrink-0 mt-0.5 ${color.icon}`}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {meta.howItWorks}
              </p>
            </div>
            <div className="flex gap-2">
              <Info className={`h-4 w-4 flex-shrink-0 mt-0.5 ${color.icon}`} />
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {meta.requires}
              </p>
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
      <label className="flex text-sm font-semibold text-slate-700 dark:text-slate-300 items-center gap-2">
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
        <p className="text-xs text-slate-500 dark:text-slate-400">
          PNG, JPG up to 10 MB
        </p>
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
      <h3 className="text-base font-bold text-slate-900 dark:text-white">
        {label}
      </h3>
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
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {label}
          </span>
        </label>
      ))}
    </div>
  );
}

// ─── Module-specific forms ──────────────────────────────────────────────────

function MastitisForm({
  form,
  onChange,
  onFileChange,
  imagePreview,
  cows,
  color,
}) {
  return (
    <div className="space-y-8">
      <CowSelector cows={cows} value={form.cowId} onChange={onChange} color={color} />
      <ImageUpload id="mastitis-image" imagePreview={imagePreview} onFileChange={onFileChange} color={color} />

      <div className="space-y-4">
        <SectionHeader label="Milk & Health Details" optional />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Adding these details improves prediction accuracy.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input label="Milk Temperature (°C)" type="number" step="0.01" name="milkTemperature" value={form.milkTemperature} onChange={onChange} placeholder="e.g. 38.5" />
          <Input label="Milk Yield (L)" type="number" step="0.01" name="milkYield" value={form.milkYield} onChange={onChange} placeholder="e.g. 20" />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Clotting</label>
            <select name="clotting" value={form.clotting} onChange={onChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ring-emerald-500">
              <option value="">Select…</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <SectionHeader label="Signs You Have Noticed" optional />
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
          <Input label="Body Temperature (°C)" type="number" step="0.1" name="bodyTemperature" value={form.bodyTemperature || ""} onChange={onChange} placeholder="e.g. 40.5" />
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Lesion Location</label>
            <select name="lesionLocation" value={form.lesionLocation || ""} onChange={onChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ring-orange-500">
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
          <Input label="Approximate Nodule Count" type="number" name="noduleCount" value={form.noduleCount || ""} onChange={onChange} placeholder="e.g. 15" />
          <Input label="Body Temperature (°C)" type="number" step="0.1" name="bodyTemperature" value={form.bodyTemperature || ""} onChange={onChange} placeholder="e.g. 41.0" />
        </div>
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Nodule Distribution</label>
          <select name="noduleDistribution" value={form.noduleDistribution || ""} onChange={onChange} className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ring-violet-500">
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

function MilkFeverForm({ form, onChange, cows, color }) {
  return (
    <div className="space-y-6">
      <CowSelector cows={cows} value={form.cowId} onChange={onChange} color={color} />

      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">
          How many times has this cow calved before? <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Count only previous calvings, not this one</p>
        <select name="parity" value={form.parity} onChange={onChange}
          className={`w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${color.ring}`}>
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
          When did the cow calve (give birth)? <span className="text-red-500">*</span>
        </label>
        <input type="date" name="calving_date" value={form.calving_date} onChange={onChange}
          max={new Date().toISOString().split("T")[0]}
          className={`w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${color.ring}`} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">How does the cow's body look?</label>
        <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">Look at the cow's ribs and hip bones</p>
        <select name="bcs" value={form.bcs} onChange={onChange}
          className={`w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${color.ring}`}>
          {BCS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Is the cow eating normally?</label>
        <select name="eating" value={form.eating} onChange={onChange}
          className={`w-full rounded-2xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-3 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 ${color.ring}`}>
          {EATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">What is the cow's behavior right now?</label>
        <div className="grid gap-2">
          {BEHAVIORAL_OPTIONS.map(o => (
            <label key={o.value}
              className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition
                ${form.behavioral === o.value ? `border-teal-500 bg-teal-50 dark:bg-teal-900/20` : `border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600`}`}>
              <input type="radio" name="behavioral" value={o.value}
                checked={form.behavioral === o.value} onChange={onChange}
                className="accent-teal-600 h-4 w-4" />
              <span className="text-sm text-slate-700 dark:text-slate-300">{o.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1">Additional symptoms:</label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600">
          <input type="checkbox" name="cannot_stand" checked={form.cannot_stand} onChange={onChange}
            className="accent-teal-600 w-4 h-4 rounded border-slate-300" />
          <span className="text-sm text-slate-700 dark:text-slate-300">Cow cannot stand up or keeps falling</span>
        </label>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:border-slate-300 dark:hover:border-slate-600">
          <input type="checkbox" name="muscle_tremors" checked={form.muscle_tremors} onChange={onChange}
            className="accent-teal-600 w-4 h-4 rounded border-slate-300" />
          <span className="text-sm text-slate-700 dark:text-slate-300">Visible muscle tremors or shivering</span>
        </label>
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
      <section className={`rounded-2xl border-2 ${colors.border} ${colors.bg} p-6 shadow-sm`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className={`text-xl font-black ${colors.text}`}>Detection Result</h3>
          <span className={`px-3 py-1 rounded-full text-sm font-bold border border-current ${colors.badge}`}>
            {result.stage}
          </span>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm mb-1.5">
            <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-xs">Risk Score</span>
            <span className={`font-bold ${colors.text}`}>{result.risk_score}/100</span>
          </div>
          <div className="w-full bg-black/10 dark:bg-white/10 rounded-full h-3">
            <div className={`h-3 rounded-full transition-all duration-500
              ${result.stage === "Critical" ? "bg-red-500" :
                result.stage === "Moderate" ? "bg-orange-500" :
                result.stage === "Mild"     ? "bg-yellow-500" : "bg-blue-500"}`}
              style={{ width: `${result.risk_score}%` }} />
          </div>
        </div>

        {result.confidence != null && (
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 font-medium">
            Model confidence: <strong>{(Number(result.confidence) * 100).toFixed(1)}%</strong>
          </p>
        )}

        <div className={`rounded-xl border ${colors.border} bg-white/60 dark:bg-black/20 backdrop-blur p-4 mb-4`}>
          <p className="text-xs font-bold uppercase tracking-wider opacity-70 mb-1">Recommended Action</p>
          <p className="text-sm font-medium leading-relaxed">{result.advice || result.message}</p>
        </div>

        {result.stage === "Critical" && (
          <div className="rounded-xl bg-red-600 text-white p-4 text-center shadow-lg">
            <p className="font-bold text-lg mb-1 flex items-center justify-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              EMERGENCY
            </p>
            <p className="text-sm font-medium">Contact a veterinarian IMMEDIATELY</p>
            <p className="text-sm mt-1 opacity-90">Call: <strong>+94 11 2 888 888</strong></p>
          </div>
        )}
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
      setError(err.message || "Weather risk is currently unavailable. Image assessment is still available.");
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
      .then((json) => setDistricts(Array.isArray(json.districts) ? json.districts : []))
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
      if (!saveRes.ok) throw new Error(saveJson.error || "Could not save location");
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
            <strong>{savedDistrict || (loading ? "Loading…" : "Not set")}</strong>
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
                <option key={d} value={d}>{d}</option>
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
              <strong>Environmental FMD Risk:</strong> {weatherData.environmental_risk}
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
            {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
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

  const overall = hybrid.overall_assessment || (imagePositive ? "POSSIBLE FMD" : "LOW CURRENT CONCERN");
  const overallIsUrgent = overall === "HIGH CONCERN" || overall === "POSSIBLE FMD";

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
      <article className={`rounded-3xl border p-6 shadow-sm ${overallIsUrgent ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800" : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"}`}>
        <p className="text-[11px] font-black uppercase tracking-[0.28em] opacity-70">FMD Assessment</p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {/* Image analysis */}
          <div className="rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-black/20">
            <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">Image Analysis</p>
            <p className="mt-2 text-lg font-bold">{hybrid.image_result || (imagePositive ? "FMD-consistent lesions detected" : "No visible FMD lesions detected")}</p>
            {result.confidence && (
              <p className="mt-1 text-sm opacity-80">Confidence: <strong>{result.confidence}</strong></p>
            )}
          </div>

          {/* Weather + seasonal (environmental) risk */}
          <div className="rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-black/20">
            <div className="flex items-center justify-between">
              <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">Environmental FMD Risk</p>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${weatherBadgeClass}`}>
                {displayedRiskLevel || "N/A"}
              </span>
            </div>
            {weather.available ? (
              <div className="mt-2 text-sm space-y-1">
                <p><strong>Weather Risk:</strong> {weather.level}</p>
                <p><strong>Temperature:</strong> {weather.temperature} °C</p>
                <p><strong>Humidity:</strong> {weather.humidity} %</p>
                <p><strong>Rainfall:</strong> {weather.rainfall} mm</p>
              </div>
            ) : (
              <p className="mt-2 text-sm opacity-80">{weather.message || "Weather risk is currently unavailable."}</p>
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
                  Seasonal Context: {weather.seasonal_active ? "ACTIVE" : "NORMAL"}
                  {weather.seasonal_period ? ` (${weather.seasonal_period})` : ""}
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
                  <p className="mt-2 text-[11px] italic opacity-60">{weather.seasonal_disclaimer}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-black/20">
          <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">Overall Assessment</p>
          <p className="mt-2 text-xl font-black">{overall}</p>
          {hybrid.explanation && (
            <p className="mt-2 text-sm opacity-80">{hybrid.explanation}</p>
          )}
        </div>

        <div className="mt-4 rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-black/20">
          <p className="text-xs font-black uppercase tracking-[0.24em] opacity-70">Recommendation</p>
          <p className="mt-2 text-sm leading-6">{hybrid.recommendation || result.recommendation || result.advice}</p>
          <p className="mt-3 text-xs italic opacity-60">
            This is a decision-support estimate, not a confirmed veterinary diagnosis. Always seek veterinary confirmation for suspected cases.
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
    "Unknown";
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

  const predictionText = String(prediction).toLowerCase();
  const isPositive =
    predictionText.includes("positive") ||
    predictionText.includes("detected") ||
    predictionText.includes("sick") ||
    predictionText.includes("suspected") ||
    String(riskLevel || "")
      .toLowerCase()
      .includes("high") ||
    String(riskLevel || "")
      .toLowerCase()
      .includes("critical") ||
    Number(result.label) === 1;

  const panelClass = isPositive
    ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-900 dark:text-red-100"
    : "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100";

  const badgeClass = isPositive
    ? "border-red-300 bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-200"
    : "border-emerald-300 bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200";

  const urgencyText = isPositive
    ? "Immediate veterinary review is advised."
    : "Routine monitoring is appropriate for now.";

  const summaryText = isPositive
    ? "The case shows clinical signs consistent with a possible contagious disease and should be handled as a priority concern."
    : "The current findings are not strongly indicative of disease, but reassessment is recommended if symptoms change.";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <article className={`rounded-3xl border p-6 shadow-sm ${panelClass}`}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] opacity-70">
              Veterinary summary
            </p>
            <h3 className="mt-2 text-2xl font-black leading-tight">
              {String(prediction)}
            </h3>
            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-200">
              {summaryText}
            </p>
          </div>
          <div
            className={`rounded-2xl border px-4 py-3 text-sm font-semibold ${badgeClass}`}
          >
            <div className="text-[11px] uppercase tracking-[0.24em] opacity-70">
              Status
            </div>
            <div className="mt-1">
              {isPositive ? "Priority review" : "Monitor closely"}
            </div>
          </div>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-black/20">
            <p className="text-sm font-black uppercase tracking-[0.24em] opacity-70">
              Clinical impression
            </p>
            <ul className="mt-3 space-y-2 text-sm leading-6">
              <li className="flex gap-2">
                <span className="mt-2 h-2 w-2 rounded-full bg-current opacity-80" />
                <span>{urgencyText}</span>
              </li>
              {riskLevel && (
                <li className="flex gap-2">
                  <span className="mt-2 h-2 w-2 rounded-full bg-current opacity-80" />
                  <span>Risk level recorded as {riskLevel}.</span>
                </li>
              )}
              <li className="flex gap-2">
                <span className="mt-2 h-2 w-2 rounded-full bg-current opacity-80" />
                <span>
                  Assessment should be documented in the herd health record.
                </span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-black/20">
              <p className="text-sm font-black uppercase tracking-[0.24em] opacity-70">
                Key indicators
              </p>
              <div className="mt-3 space-y-3 text-sm">
                {confidence && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-60">
                      Confidence
                    </p>
                    <p className="mt-1 font-semibold">{confidence}</p>
                  </div>
                )}
                {riskLevel && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-60">
                      Risk
                    </p>
                    <p className="mt-1 font-semibold">{riskLevel}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.24em] opacity-60">
                    Recommendation
                  </p>
                  <p className="mt-1 font-semibold leading-6">
                    {recommendation ||
                      (isPositive
                        ? "Isolate the animal and contact a veterinarian promptly."
                        : "Continue routine monitoring and re-check if signs worsen.")}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl bg-white/70 p-4 shadow-sm backdrop-blur dark:bg-black/20">
              <p className="text-sm font-black uppercase tracking-[0.24em] opacity-70">
                Action required
              </p>
              <p className="mt-3 text-sm leading-7">
                {recommendation ||
                  (isPositive
                    ? "Consult a veterinarian as soon as possible. Isolate the animal from the herd to reduce spread risk and record the outcome in the health log."
                    : "The animal does not show strong signs of disease at this time. Continue regular monitoring and re-check if symptoms develop.")}
              </p>
            </div>
          </div>
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
    skinNodules: false,
    noduleOnHead: false,
    noduleOnLegs: false,
    swollenLymphNodes: false,
    nasalDischarge: false,
    reducedMilkProduction: false,
    decreasedAppetite: false,
    noduleCount: "", noduleDistribution: "",
    // Milk Fever (New variables)
    parity: "", calving_date: "", behavioral: "normal",
    eating: "100", bcs: "3.0", cannot_stand: false, muscle_tremors: false,
  });

  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState("");

  const renderWeatherPanel = moduleKey === "fmd";

  // Reset result when module changes
  useEffect(() => {
    setResult(null);
    setError("");
    setImagePreview("");
    setForm((prev) => ({ ...prev, image: null }));
  }, [moduleKey]);

  useEffect(() => {
    getCows()
      .then((r) => setCows(r.cows || []))
      .catch(() => setCows([]));
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, image: file }));
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      showSuccess("Image selected successfully");
    }
  };

  // ── Submit handlers per module ────────────────────────────────────────────

  const handleMastitisSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.image) {
      const m = "Please upload an udder photograph";
      setError(m);
      showError(m);
      return;
    }
    if (!form.cowId) {
      const m = "Please select a cow to link this result";
      setError(m);
      showError(m);
      return;
    }

    const payload = new FormData();
    payload.append("image", form.image);
    payload.append("cow_id", form.cowId);

    const hasHealth =
      form.milkTemperature !== "" ||
      form.milkYield !== "" ||
      form.clotting !== "";
    if (hasHealth) {
      payload.append(
        "health_inputs",
        JSON.stringify({
          milk_temperature:
            form.milkTemperature === "" ? null : Number(form.milkTemperature),
          milk_yield: form.milkYield === "" ? null : Number(form.milkYield),
          clotting: form.clotting || null,
        }),
      );
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
      if (!response?.success || !response?.data)
        throw new Error(response?.error || "Server error");
      setResult({ type: "mastitis", data: response.data });
      showSuccess("Detection completed successfully");
    } catch (err) {
      setResult(null);
      const m = err.message || "Server error";
      setError(m);
      showError(m);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFMDSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.image) {
      const m = "Please upload a photograph";
      setError(m);
      showError(m);
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
      const stored = JSON.parse(localStorage.getItem("cattlesense_user") || "null");
      if (stored?.id) payload.append("farmer_id", String(stored.id));
    } catch {
      // no-op: hybrid assessment will just report weather as unavailable
    }

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
      setResult({ type: "fmd", data: response?.data || response });
      showSuccess("FMD detection completed");
    } catch (err) {
      setResult(null);
      const m = err.message || "Server error";
      setError(m);
      showError(m);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLSDSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.image) {
      const m = "Please upload a skin/body photograph";
      setError(m);
      showError(m);
      return;
    }

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
      setError(m);
      showError(m);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMilkFeverSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.parity || !form.calving_date) {
      const m = "Please fill in all required fields (Parity & Calving Date).";
      setError(m); showError(m); return;
    }

    // ── Payload Calculation Logic from Custom Component ──
    const behaviorOption = BEHAVIORAL_OPTIONS.find(o => o.value === form.behavioral);
    const activityLevel  = behaviorOption ? behaviorOption.score : 50;

    let daysTocalving = 0;
    if (form.calving_date) {
      const calving  = new Date(form.calving_date);
      const today    = new Date();
      const diffDays = Math.round((calving - today) / (1000 * 60 * 60 * 24));
      daysTocalving  = Math.max(0, Math.min(30, diffDays + 3));
    }

    let bloodCalcium = 9.0;
    if (form.cannot_stand)   bloodCalcium -= 2.5;
    if (form.muscle_tremors) bloodCalcium -= 1.5;
    if (form.behavioral === "unable_to_stand")  bloodCalcium -= 2.0;
    if (form.behavioral === "muscle_tremors")   bloodCalcium -= 1.0;
    if (form.behavioral === "reduced_movement") bloodCalcium -= 0.5;
    bloodCalcium = Math.max(3.5, bloodCalcium);

    const calculatedData = {
      parity:           parseInt(form.parity) || 1,
      blood_calcium:    bloodCalcium,
      blood_phosphorus: 5.5,
      bcs:              parseFloat(form.bcs),
      days_to_calving:  daysTocalving,
      milk_yield_day1:  parseFloat(form.eating) / 100 * 20,
      activity_level:   activityLevel,
      dcad:             parseInt(form.parity) >= 3 ? 20 : -30,
    };

    // Build JSON payload for Milk Fever (no image upload required)
    const payload = {
      data: calculatedData,
    };
    if (form.cowId) payload.cow_id = form.cowId;

    try {
      setIsSubmitting(true);
      const response = await predictMilkFever(payload);
      setResult({ type: "milk-fever", data: response?.data || response });
      showSuccess("Milk Fever detection completed");
    } catch (err) {
      setResult(null);
      const m = err.message || "Server error";
      setError(m);
      showError(m);
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
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
      >
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

      {renderWeatherPanel && <FMDWeatherDashboard color={color} />}

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
              <MilkFeverForm form={form} onChange={handleChange} cows={cows} color={color} />
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
          {result.type === "mastitis" && <DetectionResultCard result={result.data} />}
          {result.type === "milk-fever" && <MilkFeverResultCard result={result.data} />}
          {result.type === "fmd" && <FMDResultCard result={result.data} />}
          {result.type === "generic" && <SimpleResultCard result={result.data} />}
        </motion.div>
      )}
    </PageWrapper>
  );
}