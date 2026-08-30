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
  Info,
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
  CheckboxGrid,
} from "../components/detection/DetectionShared";
import { getCows, predictMilkFever } from "../services/api";

// ── Weather Panel (Harmonized with CattleSense Design) ─────────────────────────

function WeatherRiskPanel({ onWeatherFetched }) {
  const { t } = useI18n();
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
        label: t("milkFeverDetection.thiNormal") || "Normal / Low Heat Stress",
        color: "text-emerald-700 dark:text-emerald-400",
        bg: "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50",
        risk: t("milkFeverDetection.thiFavorable") || "Temperature and humidity conditions are favorable.",
        impact: t("milkFeverDetection.noAdjustment") || "No risk adjustment",
        impactColor: "text-emerald-600 dark:text-emerald-400",
      };
    if (thi < 79)
      return {
        label: t("milkFeverDetection.thiMild") || "Mild Heat Stress (THI 72–78)",
        color: "text-amber-700 dark:text-amber-400",
        bg: "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50",
        risk: t("milkFeverDetection.thiMildTip") || "Mild heat stress reduces feed intake. Ensure clean fresh water.",
        impact: t("milkFeverDetection.thiMildImpact") || "+5 points risk impact",
        impactColor: "text-amber-600 dark:text-amber-400",
      };
    return {
      label: t("milkFeverDetection.thiSevere") || "Moderate–Severe Heat Stress (THI 79+)",
      color: "text-red-700 dark:text-red-400",
      bg: "bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-800/50",
      risk: t("milkFeverDetection.thiSevereTip") || "High heat stress impairs calcium mobilization.",
      impact: t("milkFeverDetection.thiSevereImpact") || "+10–15 points risk impact",
      impactColor: "text-red-600 dark:text-red-400",
    };
  };

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <SectionHeader
          label={t("milkFeverDetection.section4Title") || "4. Heat Stress Check (THI)"}
          badge={t("milkFeverDetection.temperatureFactor") || "Temperature Factor"}
        />
        <button
          type="button"
          onClick={fetchWeather}
          disabled={loading}
          className="text-xs px-2.5 py-1 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-800/60 hover:bg-teal-100 font-semibold disabled:opacity-50 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          {loading ? (t("milkFeverDetection.checking") || "Checking…") : (t("milkFeverDetection.checkTemperature") || "Check Temperature")}
        </button>
      </div>

      {!weather && (
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {t("milkFeverDetection.temperatureNote") ||
            "High temperature and humidity reduce calcium absorption in freshly calved cows. Tap \"Check Temperature\" to factor ambient temperature and humidity into the risk calculation."}
        </p>
      )}

      {weather?.error && (
        <p className="text-xs text-red-500 dark:text-red-400">
          {t("milkFeverDetection.thiError") || "Could not fetch live temperature. System will proceed with standard baseline calculations."}
        </p>
      )}

      {weather && !weather.error && (() => {
        const status = getThiStatus(weather.thi);
        return (
          <div className={`rounded-xl border ${status.bg} p-3 space-y-2`}>
            <div className="flex justify-between items-center">
              <span className={`text-xs font-bold ${status.color}`}>{status.label}</span>
              <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                THI: {weather.thi}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-slate-600 dark:text-slate-400">
              <span>{weather.temp}°C</span>
              <span>{weather.humidity}% humidity</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{status.risk}</p>
            <div className={`text-xs font-semibold ${status.impactColor} flex items-center gap-1`}>
              <AlertTriangle className="h-3 w-3" />
              <span>{status.impact}</span>
            </div>
          </div>
        );
      })()}
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

  const bcsOptions = [
    { value: "2.0", label: t("milkFeverDetection.bcs20") || "Very Thin (BCS 2.0) — Bones visible, no fat" },
    { value: "2.5", label: t("milkFeverDetection.bcs25") || "Thin (BCS 2.5) — Ribs easily visible" },
    { value: "3.0", label: t("milkFeverDetection.bcs30") || "Ideal (BCS 3.0) — Ribs covered, healthy condition" },
    { value: "3.5", label: t("milkFeverDetection.bcs35") || "Slightly Fat (BCS 3.5) — Smooth rounded hips" },
    { value: "4.0", label: t("milkFeverDetection.bcs40") || "Fat (BCS 4.0) — Heavy fat cover" },
    { value: "4.5", label: t("milkFeverDetection.bcs45") || "Very Fat (BCS 4.5) — Extremely heavy fat deposit" },
  ];

  const eatingOptions = [
    { value: "100", label: t("milkFeverDetection.eating100") || "Eating normally (100% feed intake)" },
    { value: "60", label: t("milkFeverDetection.eating60") || "Eating less than usual (about 60%)" },
    { value: "20", label: t("milkFeverDetection.eating20") || "Barely eating / refusing feed (20% or less)" },
    { value: "5", label: t("milkFeverDetection.eating5") || "Completely stopped eating (0–5%)" },
  ];

  const behavioralOptions = [
    { value: "normal", label: t("milkFeverDetection.behaviorNormal") || "Standing normally, alert and active", score: 85 },
    { value: "reduced_movement", label: t("milkFeverDetection.behaviorReduced") || "Moving slowly, unsteady or dull", score: 55 },
    { value: "muscle_tremors", label: t("milkFeverDetection.behaviorTremors") || "Visible shivering, trembling or twitching", score: 30 },
    { value: "unable_to_stand", label: t("milkFeverDetection.behaviorUnable") || "Down on ground, cannot get up (recumbent)", score: 10 },
  ];

  useEffect(() => {
    getCows()
      .then((r) => setCows(r?.cows || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (result && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }, 120);
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
      setError("");
      const response = await predictMilkFever(payload);
      const resData = response?.data || response;
      if (form.cowId && !resData.cow_id) {
        resData.cow_id = form.cowId;
      }
      resData.inputs = { ...form };
      setResult(resData);
      setResultCowId(form.cowId);
      showSuccess(t("detection.milkFeverComplete") || "Milk Fever assessment completed successfully");

      setForm({
        cowId: "",
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
    <PageWrapper className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/modules"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t("modules.backToModules") || "Disease Modules"}</span>
        </Link>
        <span className="text-[11px] font-mono text-teal-600 dark:text-teal-400 font-bold">
          {t("modules.short.milkFever") || "Milk Fever AI"}
        </span>
      </div>

      <DiseaseInfoPanel meta={meta} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
      >
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <CowSelector cows={cows} value={form.cowId} onChange={handleChange} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 space-y-4">
                  <SectionHeader
                    label={t("milkFeverDetection.section1Title") || "1. Basic Information & Calving Status"}
                    badge={t("common.required") || "Required"}
                  />
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {t("milkFeverDetection.parityLabel") || "Times calved before"} <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="parity"
                        value={form.parity}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        <option value="">{t("milkFeverDetection.selectParity") || "-- Select Parity --"}</option>
                        <option value="1">{t("milkFeverDetection.parity1") || "First time (1st calving)"}</option>
                        <option value="2">{t("milkFeverDetection.parity2") || "Once before (2nd calving)"}</option>
                        <option value="3">{t("milkFeverDetection.parity3") || "Twice before (3rd calving)"}</option>
                        <option value="4">{t("milkFeverDetection.parity4") || "3 times before (4th calving)"}</option>
                        <option value="5">{t("milkFeverDetection.parity5") || "4+ times (5th+ calving)"}</option>
                      </select>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {t("milkFeverDetection.parityTip") || "Higher parity increases metabolic risk"}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {t("milkFeverDetection.calvingDateLabel") || "Calving date"} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        name="calving_date"
                        value={form.calving_date}
                        onChange={handleChange}
                        max={new Date().toISOString().split("T")[0]}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <p className="text-[10px] text-slate-400 dark:text-slate-500">
                        {t("milkFeverDetection.calvingDateTip") || "Peak risk occurs within first 72 hours"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {t("milkFeverDetection.bcsLabel") || "Body condition score (BCS)"}
                      </label>
                      <select
                        name="bcs"
                        value={form.bcs}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      >
                        {bcsOptions.map((o) => (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {t("milkFeverDetection.appetiteLabel") || "Current appetite"}
                      </label>
                      <select
                        name="eating"
                        value={form.eating}
                        onChange={handleChange}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
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

                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <SectionHeader label={t("milkFeverDetection.section3Title") || "3. Laboratory Biomarkers"} optional />
                    <button
                      type="button"
                      onClick={() => setShowLabSection(!showLabSection)}
                      className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <FlaskConical className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
                      <span>{showLabSection ? (t("milkFeverDetection.hideLabInputs") || "Hide Lab Inputs") : (t("milkFeverDetection.addLabValues") || "Add Lab Values")}</span>
                      {showLabSection ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {showLabSection && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden space-y-3 pt-2"
                      >
                        <div className="rounded-xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200/60 dark:border-teal-800/50 p-3 text-xs text-teal-800 dark:text-teal-300 flex items-start gap-2">
                          <Info className="h-4 w-4 shrink-0 mt-0.5" />
                          <span>{t("milkFeverDetection.labNote") || "Leave blank if unavailable — non-invasive AI estimates stage accurately from observable clinical signs alone."}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {[
                            {
                              name: "blood_calcium_lab",
                              label: t("milkFeverDetection.bloodCalcium") || "Blood Calcium",
                              unit: "mg/dL (Normal: 8.5–10.5)",
                              placeholder: "e.g. 7.2",
                            },
                            {
                              name: "blood_phosphorus_lab",
                              label: t("milkFeverDetection.phosphorus") || "Phosphorus",
                              unit: "mg/dL (Normal: 4.0–8.0)",
                              placeholder: "e.g. 5.5",
                            },
                            {
                              name: "milk_yield_lab",
                              label: t("milkFeverDetection.milkYieldDay1") || "Milk Yield Day 1",
                              unit: "kg (Normal: 15–25)",
                              placeholder: "e.g. 18.0",
                            },
                          ].map((f) => (
                            <div key={f.name} className="space-y-1">
                              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                {f.label}
                              </label>
                              <input
                                type="number"
                                step="0.1"
                                name={f.name}
                                value={form[f.name] || ""}
                                onChange={handleChange}
                                placeholder={f.placeholder}
                                className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                              />
                              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                                {f.unit}
                              </p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 p-4 space-y-4">
                  <SectionHeader
                    label={t("milkFeverDetection.section2Title") || "2. Observable Clinical Symptoms"}
                    badge={t("milkFeverDetection.visualSigns") || "Visual Signs"}
                  />

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t("milkFeverDetection.behavioralState") || "Behavioral State & Mobility"}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {behavioralOptions.map((o) => {
                        const isChecked = form.behavioral === o.value;
                        return (
                          <label
                            key={o.value}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-colors ${
                              isChecked
                                ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-950 dark:text-teal-100"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="behavioral"
                              value={o.value}
                              checked={isChecked}
                              onChange={handleChange}
                              className="mt-0.5 h-4 w-4 border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-xs font-medium leading-snug">
                              {o.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t("milkFeverDetection.additionalClinicalIndicators") || "Additional Clinical Indicators"}
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          name: "cannot_stand",
                          label: t("milkFeverDetection.cannotStand") || "Cannot stand / downer cow",
                        },
                        {
                          name: "muscle_tremors",
                          label: t("milkFeverDetection.muscleTremors") || "Muscle tremors / shivering",
                        },
                        {
                          name: "excessive_drooling",
                          label: t("milkFeverDetection.excessiveDrooling") || "Excessive drooling / salivation",
                        },
                        {
                          name: "cold_ears",
                          label: t("milkFeverDetection.coldEars") || "Cold ears or extremities",
                        },
                      ].map((s) => {
                        const checked = Boolean(form[s.name]);
                        return (
                          <label
                            key={s.name}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer select-none transition-colors ${
                              checked
                                ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/20 text-teal-950 dark:text-teal-100"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-800/40 text-slate-700 dark:text-slate-300"
                            }`}
                          >
                            <input
                              type="checkbox"
                              name={s.name}
                              checked={checked}
                              onChange={handleChange}
                              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                            />
                            <span className="text-xs font-medium leading-snug">
                              {s.label}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <WeatherRiskPanel onWeatherFetched={(thiValue) => setThi(thiValue)} />
              </div>
            </div>

            {error && <Alert variant="error" message={error} />}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting}
                className="w-full gap-2 text-xs sm:text-sm font-bold py-3.5 rounded-xl shadow-xs bg-teal-600 hover:bg-teal-700"
                size="lg"
              >
                {isSubmitting ? (
                  <span>{t("detection.processingAi") || "Estimating Blood Calcium & Stage…"}</span>
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