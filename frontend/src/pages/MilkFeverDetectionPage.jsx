import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Thermometer, CheckCircle, Loader, CloudSun, RefreshCw } from "lucide-react";
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
  { value: "60", label: "Eating less than usual (about half to 60%)" },
  { value: "20", label: "Barely eating / refusing feed (20% or less)" },
  { value: "5", label: "Completely stopped eating (0-5%)" },
];

const BEHAVIORAL_OPTIONS = [
  { value: "normal", label: "Standing normally, alert and active", score: 85 },
  { value: "reduced_movement", label: "Moving slowly, unsteady or dull", score: 55 },
  { value: "muscle_tremors", label: "Visible shivering, trembling or twitching", score: 30 },
  { value: "unable_to_stand", label: "Down on ground, cannot get up (recumbent)", score: 10 },
];

function WeatherRiskPanel() {
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchWeather = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        "https://api.open-meteo.com/v1/forecast?latitude=7.8731&longitude=80.7718&current=temperature_2m,relative_humidity_2m&timezone=Asia%2FColombo",
      );
      const data = await res.json();
      const temp = data?.current?.temperature_2m;
      const humidity = data?.current?.relative_humidity_2m;
      if (temp != null && humidity != null) {
        const thi = Math.round(
          0.8 * temp + (humidity / 100) * (temp - 14.4) + 46.4,
        );
        setWeather({ temp, humidity, thi });
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
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200",
        risk: "Weather conditions are favorable. Normal metabolic baseline.",
      };
    if (thi < 79)
      return {
        label: "Mild Heat Stress (THI 72-78)",
        color: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200",
        risk: "Mild stress reduces feed intake slightly. Ensure clean fresh water.",
      };
    return {
      label: "Moderate to Severe Heat Stress (THI 79+)",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-950/20 border-red-200",
      risk: "Elevated heat stress significantly impairs calcium mobilization in freshly calved cows.",
    };
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60">
        <div className="flex items-center gap-2">
          <CloudSun className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-200">
            Regional Temperature-Humidity Index (THI)
          </span>
        </div>
        <button
          type="button"
          onClick={fetchWeather}
          disabled={loading}
          className="text-xs px-3 py-1.5 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-1"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? "Checking…" : "Check Heat Stress"}
        </button>
      </div>
      <div className="p-4">
        {!weather && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            High ambient temperatures and humidity reduce feed intake and exacerbate post-calving calcium crash. Click to check live Sri Lanka THI conditions.
          </p>
        )}
        {weather?.error && (
          <p className="text-xs text-red-500">Could not fetch weather data. Check internet connection.</p>
        )}
        {weather && !weather.error && (() => {
          const status = getThiStatus(weather.thi);
          return (
            <div className={`rounded-xl border ${status.bg} p-3.5 space-y-1.5`}>
              <div className="flex justify-between items-center">
                <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
                <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 px-2 py-0.5 rounded-lg shadow-xs">
                  THI: {weather.thi}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-300">
                <span>🌡️ {weather.temp} °C</span>
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

export default function MilkFeverDetectionPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const cowIdFromQuery = searchParams.get("cowId") || searchParams.get("cow_id") || "";

  const meta = MODULE_META["milk-fever"];

  const [cows, setCows] = useState([]);
  const [form, setForm] = useState({
    cowId: cowIdFromQuery,
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

  useEffect(() => {
    const fetchCows = async () => {
      try {
        const res = await getCows();
        setCows(res?.cows || []);
      } catch {
        // Fallback
      }
    };
    fetchCows();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.parity) {
      setError("Please select how many times the cow has calved before (Parity).");
      return;
    }
    if (!form.calving_date) {
      setError("Please enter the calving date.");
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
      setResult(response?.data || response);
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
    <PageWrapper className="max-w-3xl mx-auto space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/modules"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t("modules.backToModules") || "Disease Modules"}</span>
        </Link>
        <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold">
          Milk Fever Non-Invasive AI
        </span>
      </div>

      {/* Disease Info Banner */}
      <DiseaseInfoPanel meta={meta} />

      {/* Main Detection Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
      >
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cow Selector */}
            <CowSelector
              cows={cows}
              value={form.cowId}
              onChange={handleChange}
            />

            {/* Parity */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                How many times has this cow calved before? <span className="text-red-500">*</span>
              </label>
              <p className="text-[11px] text-slate-400">
                Count only previous completed calvings
              </p>
              <select
                name="parity"
                value={form.parity}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="">-- Select Parity --</option>
                <option value="1">First time heifer (1st calving)</option>
                <option value="2">Once before (2nd calving)</option>
                <option value="3">Twice before (3rd calving)</option>
                <option value="4">3 times before (4th calving)</option>
                <option value="5">4+ times before (5th+ calving — Higher Risk)</option>
              </select>
            </div>

            {/* Calving Date */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                When did the cow calve (give birth)? <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="calving_date"
                value={form.calving_date}
                onChange={handleChange}
                max={new Date().toISOString().split("T")[0]}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Body Condition Score */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Body Condition Score (BCS)
              </label>
              <select
                name="bcs"
                value={form.bcs}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {BCS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Eating status */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Current Feed Intake / Appetite
              </label>
              <select
                name="eating"
                value={form.eating}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                {EATING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Behavior */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Behavioral State & Mobility
              </label>
              <div className="grid gap-2">
                {BEHAVIORAL_OPTIONS.map((o) => (
                  <label
                    key={o.value}
                    className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition select-none ${
                      form.behavioral === o.value
                        ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                        : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="behavioral"
                      value={o.value}
                      checked={form.behavioral === o.value}
                      onChange={handleChange}
                      className="accent-teal-600 h-4 w-4"
                    />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {o.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Additional critical signs */}
            <div className="space-y-2 pt-2">
              <SectionHeader label="Severe Symptoms Check" optional />
              <div className="grid gap-2">
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:border-slate-300 select-none">
                  <input
                    type="checkbox"
                    name="cannot_stand"
                    checked={form.cannot_stand}
                    onChange={handleChange}
                    className="accent-teal-600 w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Cow cannot stand up or keeps collapsing (Downer cow state)
                  </span>
                </label>
                <label className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3 cursor-pointer hover:border-slate-300 select-none">
                  <input
                    type="checkbox"
                    name="muscle_tremors"
                    checked={form.muscle_tremors}
                    onChange={handleChange}
                    className="accent-teal-600 w-4 h-4 rounded border-slate-300"
                  />
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Visible muscle tremors, shivering, or ear twitching
                  </span>
                </label>
              </div>
            </div>

            {/* Live Weather THI Panel */}
            <WeatherRiskPanel />

            {error && <Alert variant="error" message={error} />}

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="w-full gap-2 text-xs sm:text-sm font-bold py-3 rounded-xl shadow-xs bg-teal-600 hover:bg-teal-700"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>{t("detection.processingAi") || "Estimating Blood Calcium & Stage…"}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>{t("detection.runMilkFeverCheck") || "Run Milk Fever Assessment"}</span>
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Results Display */}
      {result && <MilkFeverResultCard result={result} />}
    </PageWrapper>
  );
}
