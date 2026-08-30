import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Thermometer,
  CheckCircle,
  CloudSun,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Alert } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import MilkFeverResultCard from "../components/MilkFeverResultCard";
import {
  MODULE_META,
  DiseaseInfoPanel,
  CowSelector,
  SectionHeader,
} from "../components/detection/DetectionShared";
import { getCows, predictMilkFever } from "../services/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const BCS_OPTIONS = [
  { value: "2.0", label: "Very Thin (BCS 2.0) — Bones very visible, no fat" },
  { value: "2.5", label: "Thin (BCS 2.5) — Ribs easily visible" },
  { value: "3.0", label: "Ideal (BCS 3.0) — Ribs covered, healthy appearance" },
  { value: "3.5", label: "Slightly Fat (BCS 3.5) — Smooth rounded hips" },
  { value: "4.0", label: "Fat (BCS 4.0) — Heavy fat cover, bones not visible" },
  { value: "4.5", label: "Very Fat (BCS 4.5) — Extremely heavy fat deposit" },
];

const EATING_OPTIONS = [
  { value: "100", label: "Eating normally (100% feed intake)" },
  { value: "60", label: "Eating less than usual (about 60%)" },
  { value: "20", label: "Barely eating / refusing feed (20% or less)" },
  { value: "5", label: "Completely stopped eating (0–5%)" },
];

const BEHAVIORAL_OPTIONS = [
  { value: "normal", label: "Standing normally, alert and active", score: 85 },
  { value: "reduced_movement", label: "Moving slowly, unsteady or dull", score: 55 },
  { value: "muscle_tremors", label: "Visible shivering, trembling or twitching", score: 30 },
  { value: "unable_to_stand", label: "Down on ground, cannot get up (recumbent)", score: 10 },
];

// ── Weather Panel ─────────────────────────────────────────────────────────────

function WeatherRiskPanel({ onWeatherFetched }) {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=7.8731&longitude=80.7718&current=temperature_2m,relative_humidity_2m&timezone=Asia%2FColombo"
      );
      const data = await res.json();
      const temp = data?.current?.temperature_2m;
      const humidity = data?.current?.relative_humidity_2m;
      if (temp != null && humidity != null) {
        const thi = Math.round(
          0.8 * temp + (humidity / 100) * (temp - 14.4) + 46.4
        );
        setWeather({ temp, humidity, thi });
        if (onWeatherFetched) onWeatherFetched(thi);
      }
    } catch {
      setWeather({ error: true });
    } finally {
      setLoading(false);
    }
  };

  const getThiStatus = (thi) => {
    if (thi < 72)
      return {
        label: "Normal / Low Heat Stress",
        color: "text-emerald-700 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200",
        risk: "Weather conditions are favorable.",
        impact: "No additional risk adjustment",
        impactColor: "text-emerald-600",
      };
    if (thi < 79)
      return {
        label: "Mild Heat Stress (THI 72–78)",
        color: "text-amber-700 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200",
        risk: "Mild stress reduces feed intake. Ensure clean fresh water.",
        impact: "+5 points added to risk score",
        impactColor: "text-amber-600",
      };
    return {
      label: "Moderate–Severe Heat Stress (THI 79+)",
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/20 border-red-200",
      risk: "High heat stress significantly impairs calcium mobilization.",
      impact: "+10–15 points added to risk score",
      impactColor: "text-red-600",
    };
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <CloudSun className="h-4 w-4 text-white" />
          <div>
            <span className="text-sm font-semibold text-white">Section 4 — Heat stress check (THI)</span>
            <p className="text-[11px] text-slate-300">Factored into risk score calculation</p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchWeather}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Checking…" : "Check weather"}
        </button>
      </div>
      <div className="p-4 bg-white dark:bg-slate-900">
        {!weather && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            High temperature and humidity reduce calcium absorption in freshly calved cows. Weather data is factored directly into the risk score.
          </p>
        )}
        {weather?.error && (
          <p className="text-xs text-red-500">Could not fetch weather data. Check internet connection.</p>
        )}
        {weather && !weather.error && (() => {
          const status = getThiStatus(weather.thi);
          return (
            <div className={`rounded-lg border ${status.bg} p-3 space-y-2`}>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-semibold ${status.color}`}>{status.label}</span>
                <span className="text-[11px] font-mono font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded">
                  THI: {weather.thi}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                <span>{weather.temp}°C</span>
                <span>{weather.humidity}% humidity</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">{status.risk}</p>
              <div className={`text-xs font-semibold ${status.impactColor} flex items-center gap-1`}>
                <AlertTriangle className="h-3 w-3" />
                Risk score impact: {status.impact}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MilkFeverDetectionPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const cowIdFromQuery = searchParams.get("cowId") || searchParams.get("cow_id") || "";
  const meta = MODULE_META["milk-fever"];

  const [cows, setCows] = useState([]);
  const [result, setResult] = useState(null);
  const [resultCowId, setResultCowId] = useState(cowIdFromQuery);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLabSection, setShowLabSection] = useState(false);
  const [thi, setThi] = useState(null);

  const resultRef = useRef(null);

  const [form, setForm] = useState({
    cowId: cowIdFromQuery,
    parity: "",
    calving_date: "",
    behavioral: "normal",
    eating: "100",
    bcs: "3.0",
    cannot_stand: false,
    muscle_tremors: false,
    excessive_drooling: false,
    cold_ears: false,
    blood_calcium_lab: "",
    blood_phosphorus_lab: "",
    milk_yield_lab: "",
  });

  useEffect(() => {
    getCows()
      .then((r) => setCows(r?.cows || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (result && resultRef.current) {
      resultRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [result]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.parity) {
      setError("Please select how many times the cow has calved before (Parity).");
      return;
    }
    if (!form.calving_date) {
      setError("Please enter the calving date.");
      return;
    }

    const payload = {
      data: {
        parity: parseInt(form.parity, 10) || 1,
        calving_date: form.calving_date,
        behavioral: form.behavioral,
        eating: form.eating,
        bcs: form.bcs,
        cannot_stand: form.cannot_stand,
        muscle_tremors: form.muscle_tremors,
        excessive_drooling: form.excessive_drooling,
        cold_ears: form.cold_ears,
        blood_calcium_lab: form.blood_calcium_lab || "",
        blood_phosphorus_lab: form.blood_phosphorus_lab || "",
        milk_yield_lab: form.milk_yield_lab || "",
      },
      thi: thi || null,
    };

    if (form.cowId) {
      payload.cow_id = form.cowId;
    }

    try {
      setIsSubmitting(true);
      const response = await predictMilkFever(payload);
      const resData = response?.data || response;
      if (form.cowId && !resData.cow_id) {
        resData.cow_id = form.cowId;
      }
      setResult(resData);
      setResultCowId(form.cowId);
      showSuccess(t("detection.assessmentComplete") || "Milk Fever assessment completed");
    } catch (err) {
      setResult(null);
      const msg = err.message || "Server error";
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PageWrapper className="max-w-5xl mx-auto space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/modules"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Disease Modules</span>
        </Link>
        <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold">
          Component IV • Milk Fever Non-Invasive AI
        </span>
      </div>

      {/* Disease Info */}
      <DiseaseInfoPanel meta={meta} />

      {/* Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
      >
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <CowSelector cows={cows} value={form.cowId} onChange={handleChange} />

            {/* ── Section 1: Basic Info ── */}
            <div className="rounded-xl border border-teal-200 dark:border-teal-800 overflow-hidden">
              <div className="bg-teal-700 px-4 py-3 flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <div>
                  <p className="text-white font-semibold text-sm">Section 1 — Basic information</p>
                  <p className="text-teal-100 text-[11px]">Required fields</p>
                </div>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Parity */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Times calved before <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Higher parity = higher risk
                    </p>
                    <select
                      name="parity"
                      value={form.parity}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      <option value="">-- Select --</option>
                      <option value="1">First time (1st calving)</option>
                      <option value="2">Once before (2nd calving)</option>
                      <option value="3">Twice before (3rd calving)</option>
                      <option value="4">3 times before (4th calving)</option>
                      <option value="5">4+ times (5th+ calving)</option>
                    </select>
                  </div>
                  {/* Calving date */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Calving date <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Peak risk: first 3 days
                    </p>
                    <input
                      type="date"
                      name="calving_date"
                      value={form.calving_date}
                      onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* BCS */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Body condition score (BCS)
                    </label>
                    <select
                      name="bcs"
                      value={form.bcs}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      {BCS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Eating */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Current appetite
                    </label>
                    <select
                      name="eating"
                      value={form.eating}
                      onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    >
                      {EATING_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 2: Observable Symptoms ── */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
              <div className="bg-amber-600 px-4 py-3 flex items-center gap-2">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <div>
                  <p className="text-white font-semibold text-sm">Section 2 — Observable symptoms</p>
                  <p className="text-amber-100 text-[11px]">
                    What you can see right now — no lab tests needed
                  </p>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Behavioral */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Behavioral state and mobility
                  </label>
                  <div className="grid gap-2">
                    {BEHAVIORAL_OPTIONS.map((o) => (
                      <label
                        key={o.value}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition select-none
                          ${
                            form.behavioral === o.value
                              ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                              : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                          }`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                          ${
                            form.behavioral === o.value
                              ? "border-teal-500"
                              : "border-slate-300 dark:border-slate-600"
                          }`}
                        >
                          {form.behavioral === o.value && (
                            <div className="w-2 h-2 rounded-full bg-teal-500" />
                          )}
                        </div>
                        <input
                          type="radio"
                          name="behavioral"
                          value={o.value}
                          checked={form.behavioral === o.value}
                          onChange={handleChange}
                          className="sr-only"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">
                          {o.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
                {/* Checkboxes */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Additional symptoms
                  </label>
                  {[
                    {
                      name: "cannot_stand",
                      label: "Cannot stand up or keeps collapsing (downer cow)",
                    },
                    {
                      name: "muscle_tremors",
                      label: "Visible muscle tremors, shivering, or ear twitching",
                    },
                    {
                      name: "excessive_drooling",
                      label: "Excessive drooling or salivation",
                    },
                    {
                      name: "cold_ears",
                      label: "Cold ears or cold extremities",
                    },
                  ].map((s) => (
                    <label
                      key={s.name}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer select-none transition-colors
                        ${
                          form[s.name]
                            ? "border-teal-400 bg-teal-50 dark:bg-teal-900/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition
                        ${
                          form[s.name]
                            ? "bg-teal-500 border-teal-500"
                            : "border-slate-300 dark:border-slate-600"
                        }`}
                      >
                        {form[s.name] && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <input
                        type="checkbox"
                        name={s.name}
                        checked={form[s.name] || false}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <span className="text-sm text-slate-700 dark:text-slate-300">
                        {s.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Section 3: Lab Results (Optional) ── */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowLabSection(!showLabSection)}
                className="w-full bg-blue-700 hover:bg-blue-800 px-4 py-3 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-2 text-left">
                  <FlaskConical className="h-4 w-4 text-white flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-sm flex items-center gap-2">
                      Section 3 — Lab results
                      <span className="text-[10px] font-normal bg-blue-600 px-2 py-0.5 rounded-full">
                        Optional — improves accuracy
                      </span>
                    </p>
                    <p className="text-blue-200 text-[11px]">
                      Tap to {showLabSection ? "hide" : "add"} lab values
                    </p>
                  </div>
                </div>
                {showLabSection ? (
                  <ChevronUp className="h-4 w-4 text-white flex-shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white flex-shrink-0" />
                )}
              </button>

              <AnimatePresence>
                {showLabSection && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 space-y-4">
                      <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Leave blank if unavailable — the system estimates from symptoms automatically.
                        </p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {[
                          {
                            name: "blood_calcium_lab",
                            label: "Blood calcium (mg/dL)",
                            hint: "Normal: 8.5–10.5",
                            placeholder: "e.g. 7.2",
                          },
                          {
                            name: "blood_phosphorus_lab",
                            label: "Blood phosphorus (mg/dL)",
                            hint: "Normal: 4.0–8.0",
                            placeholder: "e.g. 5.5",
                          },
                          {
                            name: "milk_yield_lab",
                            label: "Milk yield day 1 (kg)",
                            hint: "Normal: 15–25 kg",
                            placeholder: "e.g. 18.0",
                          },
                        ].map((f) => (
                          <div key={f.name}>
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                              {f.label}
                            </label>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">
                              {f.hint}
                            </p>
                            <input
                              type="number"
                              step="0.1"
                              name={f.name}
                              value={form[f.name] || ""}
                              onChange={handleChange}
                              placeholder={f.placeholder}
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Section 4: Weather THI ── */}
            <WeatherRiskPanel onWeatherFetched={(thiValue) => setThi(thiValue)} />

            {error && <Alert variant="error" message={error} />}

            {/* Submit */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold py-3.5 rounded-xl transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>{t("detection.processingAi") || "Estimating Blood Calcium & Stage…"}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>{t("detection.runMilkFeverCheck") || "Run Milk Fever Assessment"}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Results Display */}
      {result && (
        <div ref={resultRef}>
          <MilkFeverResultCard
            result={result}
            cowId={resultCowId}
            cows={cows}
            onCowSelect={(id) => setResultCowId(id)}
            onReset={() => {
              setResult(null);
              setError("");
            }}
          />
        </div>
      )}
    </PageWrapper>
  );
}