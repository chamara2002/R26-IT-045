import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import {
  CloudSun,
  RefreshCw,
  MapPin,
  AlertTriangle,
  ShieldCheck,
  Info,
  Thermometer,
  Droplets,
  CalendarClock,
  Check,
  ChevronDown,
  Wind,
} from "lucide-react";
import { useI18n } from "../i18n/language-context";
import { Badge } from "./ui/index.jsx";
import {
  getFMDWeatherDistricts,
  getFMDWeatherLocation,
  saveFMDWeatherLocation,
  getFMDWeatherCurrentRisk,
  getFMDWeatherHistory,
  getFMDWeatherTrend,
} from "../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Verified figures from DAPH Sri Lanka Annual Report 2022 (Table 3.2).
const DISTRICT_REFERENCE_2022 = {
  anuradhapura: { cases: 896, vsRangesAffected: 12, months: ["January", "April", "May"] },
  polonnaruwa: { cases: 176, vsRangesAffected: 1, months: ["January"] },
  kurunegala: { cases: 19, vsRangesAffected: 3, months: ["January", "February"] },
  puttalam: { cases: 401, vsRangesAffected: 6, months: ["January", "February"] },
  gampaha: { cases: 91, vsRangesAffected: 4, months: ["January", "February"] },
  kalutara: { cases: 14, vsRangesAffected: 3, months: ["January"] },
  colombo: { cases: 143, vsRangesAffected: 2, months: ["January"] },
  mullaitivu: { cases: 85, vsRangesAffected: 2, months: ["August", "December"] },
  mannar: { cases: 2, vsRangesAffected: 1, months: ["October"] },
  kandy: { cases: 80, vsRangesAffected: 4, months: ["January", "February", "June"] },
  matale: { cases: 32, vsRangesAffected: 1, months: ["February"] },
  ampara: { cases: 187, vsRangesAffected: 5, months: ["March", "August", "December"] },
  trincomalee: { cases: 716, vsRangesAffected: 6, months: ["January", "March", "December"] },
  batticaloa: { cases: 72, vsRangesAffected: 2, months: ["March", "April"] },
  kegalle: { cases: 13, vsRangesAffected: 2, months: ["February", "May"] },
  badulla: { cases: 154, vsRangesAffected: 3, months: ["February", "May", "June", "December"] },
  monaragala: { cases: 50, vsRangesAffected: 1, months: ["December"] },
  hambantota: { cases: 35, vsRangesAffected: 1, months: ["October"] },
  galle: { cases: 3, vsRangesAffected: 1, months: ["May"] },
  matara: { cases: 0, vsRangesAffected: 0, months: ["None reported in 2022"] },
  nuwara_eliya: { cases: 0, vsRangesAffected: 0, months: ["None reported in 2022"] },
  jaffna: { cases: 0, vsRangesAffected: 0, months: ["None reported in 2022"] },
  kilinochchi: { cases: 0, vsRangesAffected: 0, months: ["None reported in 2022"] },
  vavuniya: { cases: 0, vsRangesAffected: 0, months: ["None reported in 2022"] },
  ratnapura: { cases: 0, vsRangesAffected: 0, months: ["None reported in 2022"] },
};

function getDistrictReference(districtName) {
  if (!districtName) return null;
  const key = districtName.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return DISTRICT_REFERENCE_2022[key] || null;
}

const RISK_COLORS = {
  LOW: {
    dot: "bg-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800",
  },
  MEDIUM: {
    dot: "bg-amber-500",
    text: "text-amber-700 dark:text-amber-300",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800",
  },
  HIGH: {
    dot: "bg-red-500",
    text: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 border border-red-200 dark:border-red-800",
  },
};

function formatShortDate(isoDate) {
  try {
    return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  } catch {
    return isoDate;
  }
}

export default function FMDWeatherDashboard({
  color = {
    border: "border-orange-200 dark:border-orange-800/60",
    bg: "bg-orange-50/70 dark:bg-orange-950/20",
    button: "bg-orange-600 hover:bg-orange-700 text-white",
  },
}) {
  const { t } = useI18n();
  const [weatherData, setWeatherData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savedDistrict, setSavedDistrict] = useState(null);
  const [needsLocation, setNeedsLocation] = useState(false);
  const [districts, setDistricts] = useState([]);
  const [districtChoice, setDistrictChoice] = useState("");
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);

  // Derive farmer ID from logged-in session
  const farmerId = useMemo(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("cattlesense_user") || "null"
      );
      return stored?.id ? String(stored.id) : "demo";
    } catch {
      return "demo";
    }
  }, []);

  const fallbackFmdBase =
    import.meta.env.VITE_FMD_API_URL || "http://127.0.0.1:5005";

  const fetchWeather = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      let weatherJson;
      try {
        weatherJson = await getFMDWeatherCurrentRisk({ farmer_id: farmerId });
      } catch {
        // Direct microservice fallback
        const weatherRes = await fetch(
          `${fallbackFmdBase}/weather/current-risk?farmer_id=${encodeURIComponent(farmerId)}`
        );
        weatherJson = await weatherRes.json();
        if (!weatherRes.ok || weatherJson.error) {
          if (weatherRes.status === 400) setNeedsLocation(true);
          throw new Error(weatherJson.error || "Weather service unavailable");
        }
      }

      setNeedsLocation(false);
      setWeatherData(weatherJson);

      let historyJson = [];
      try {
        historyJson = await getFMDWeatherHistory(farmerId);
      } catch {
        const histRes = await fetch(
          `${fallbackFmdBase}/weather/history?farmer_id=${encodeURIComponent(farmerId)}`
        );
        historyJson = await histRes.json();
      }
      setHistoryData(Array.isArray(historyJson) ? historyJson : []);
    } catch (err) {
      setError(
        err.message ||
          "Weather risk is currently initializing. Image lesion analysis remains fully active."
      );
      setWeatherData(null);
      setHistoryData([]);
    } finally {
      setLoading(false);
    }
  }, [farmerId, fallbackFmdBase]);

  const loadSavedLocationAndWeather = useCallback(async () => {
    try {
      let locJson;
      try {
        locJson = await getFMDWeatherLocation(farmerId);
      } catch {
        const locRes = await fetch(
          `${fallbackFmdBase}/weather/location?farmer_id=${encodeURIComponent(farmerId)}`
        );
        if (locRes.status === 404) {
          setSavedDistrict(null);
          setNeedsLocation(true);
          setShowLocationPicker(true);
          setLoading(false);
          return;
        }
        locJson = await locRes.json();
      }

      if (locJson?.district) {
        setSavedDistrict(locJson.district);
        setDistrictChoice(locJson.district);
        await fetchWeather();
      } else {
        setNeedsLocation(true);
        setShowLocationPicker(true);
        setLoading(false);
      }
    } catch {
      setNeedsLocation(true);
      setShowLocationPicker(true);
      setLoading(false);
    }
  }, [farmerId, fallbackFmdBase, fetchWeather]);

  useEffect(() => {
    getFMDWeatherDistricts()
      .then((json) =>
        setDistricts(Array.isArray(json.districts) ? json.districts : [])
      )
      .catch(async () => {
        try {
          const res = await fetch(`${fallbackFmdBase}/weather/districts`);
          const json = await res.json();
          setDistricts(Array.isArray(json.districts) ? json.districts : []);
        } catch {
          setDistricts([
            "Anuradhapura", "Polonnaruwa", "Kurunegala", "Puttalam", "Gampaha",
            "Kalutara", "Colombo", "Mullaitivu", "Mannar", "Kandy", "Matale",
            "Ampara", "Trincomalee", "Batticaloa", "Kegalle", "Badulla",
            "Monaragala", "Hambantota", "Galle", "Matara", "Nuwara Eliya",
            "Jaffna", "Kilinochchi", "Vavuniya", "Ratnapura"
          ]);
        }
      });

    loadSavedLocationAndWeather();
  }, [fallbackFmdBase, loadSavedLocationAndWeather]);

  const handleSaveDistrict = async (event) => {
    if (event) event.preventDefault();
    if (!districtChoice) return;
    setSavingLocation(true);
    setError("");

    try {
      let saveJson;
      try {
        saveJson = await saveFMDWeatherLocation({
          farmer_id: farmerId,
          district: districtChoice,
        });
      } catch {
        const saveRes = await fetch(`${fallbackFmdBase}/weather/location`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ farmer_id: farmerId, district: districtChoice }),
        });
        saveJson = await saveRes.json();
        if (!saveRes.ok)
          throw new Error(saveJson.error || "Could not save location");
      }

      setSavedDistrict(saveJson.district || districtChoice);
      setNeedsLocation(false);
      setShowLocationPicker(false);
      await fetchWeather();
    } catch (err) {
      setError(err.message || "Could not save location");
    } finally {
      setSavingLocation(false);
    }
  };

  const districtChoiceReference = useMemo(
    () => getDistrictReference(districtChoice || savedDistrict),
    [districtChoice, savedDistrict]
  );

  const activeRiskLevel =
    weatherData?.environmental_risk || weatherData?.risk_level || "LOW";

  const riskBadgeClass =
    activeRiskLevel === "HIGH"
      ? RISK_COLORS.HIGH.badge
      : activeRiskLevel === "MEDIUM"
      ? RISK_COLORS.MEDIUM.badge
      : RISK_COLORS.LOW.badge;

  const chronologicalHistory = useMemo(
    () => [...historyData].reverse(),
    [historyData]
  );
  const hasEnoughForChart = chronologicalHistory.length >= 2;

  const isDarkMode =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const temperatureChartData = useMemo(() => {
    if (!hasEnoughForChart) return null;
    return {
      labels: chronologicalHistory.map((row) => formatShortDate(row.date)),
      datasets: [
        {
          label: "Temperature (°C)",
          data: chronologicalHistory.map((row) => row.temperature),
          borderColor: "#ea580c",
          backgroundColor: isDarkMode
            ? "rgba(234, 88, 12, 0.18)"
            : "rgba(234, 88, 12, 0.12)",
          borderWidth: 2.5,
          pointBackgroundColor: "#ea580c",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [chronologicalHistory, hasEnoughForChart, isDarkMode]);

  const temperatureChartOptions = useMemo(() => {
    const textColor = isDarkMode ? "#cbd5e1" : "#475569";
    const gridColor = isDarkMode ? "#1e293b" : "#f1f5f9";
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDarkMode ? "#0f172a" : "#ffffff",
          titleColor: isDarkMode ? "#f8fafc" : "#0f172a",
          bodyColor: isDarkMode ? "#cbd5e1" : "#334155",
          borderColor: isDarkMode ? "#334155" : "#e2e8f0",
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: (context) => ` Temperature: ${context.parsed.y} °C`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { size: 11, weight: "500" } },
        },
        y: {
          ticks: {
            color: textColor,
            font: { size: 11, weight: "600" },
            callback: (value) => `${value}°C`,
          },
          grid: { color: gridColor },
        },
      },
    };
  }, [isDarkMode]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28 }}
      className={`rounded-2xl border ${color.border} ${color.bg} p-5 sm:p-6 shadow-xs space-y-4`}
    >
      {/* ── Header Row ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-orange-100 dark:bg-orange-950/70 border border-orange-200 dark:border-orange-900/50 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0 shadow-2xs">
            <CloudSun className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {t("fmdWeather.title") || "FMD Regional Microclimate Weather Risk"}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-orange-500" />
              <span>{t("fmdWeather.district") || "District:"}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200">
                {savedDistrict || (loading ? (t("fmdWeather.detectingLocation") || "Detecting location…") : (t("fmdWeather.notConfigured") || "Not configured"))}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${riskBadgeClass}`}>
            {weatherData?.risk_level
              ? `${weatherData.environmental_risk || weatherData.risk_level} ${t("fmdWeather.transmissionRisk") || "TRANSMISSION RISK"}`
              : loading
              ? (t("fmdWeather.checkingLiveData") || "CHECKING LIVE DATA…")
              : (t("fmdWeather.standby") || "STANDBY")}
          </div>
        </div>
      </div>

      {/* ── Description & Actions Toolbar ───────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-200/60 dark:border-slate-800/80">
        <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl">
          {savedDistrict
            ? (t("fmdWeather.descConfigured") || "Real-time microclimate & humidity assessment for airborne Foot-and-Mouth Disease transmission.")
            : (t("fmdWeather.descUnconfigured") || "Select your farm district to activate automated regional spread analysis and DAPH seasonal alerts.")}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowLocationPicker((v) => !v)}
            className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition cursor-pointer"
          >
            <MapPin className="h-3 w-3 mr-1 text-slate-400" />
            {savedDistrict ? (t("fmdWeather.changeDistrict") || "Change District") : (t("fmdWeather.setDistrict") || "Set District")}
          </button>
          {savedDistrict && (
            <button
              type="button"
              onClick={fetchWeather}
              className={`inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold ${color.button} transition cursor-pointer disabled:opacity-50`}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              {t("fmdWeather.refresh") || "Refresh"}
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 p-3 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ── District Selection Form ─────────────────────────────────────────── */}
      <AnimatePresence>
        {(needsLocation || showLocationPicker) && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSaveDistrict}
            className="grid gap-3 sm:grid-cols-3 items-end p-4 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-2xs"
          >
            {needsLocation && (
              <p className="sm:col-span-3 text-xs text-slate-500 dark:text-slate-400 font-medium">
                📍 Please select your farm district to enable weather-based FMD risk calculations:
              </p>
            )}
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Select Farm District (Sri Lanka)
              </label>
              <select
                value={districtChoice}
                onChange={(e) => setDistrictChoice(e.target.value)}
                className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 font-medium focus:ring-2 focus:ring-orange-500 focus:outline-none"
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
              className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-bold ${color.button} disabled:opacity-50 transition cursor-pointer`}
            >
              {savingLocation ? "Saving…" : "Save District"}
            </button>

            {districtChoiceReference && (
              <div className="sm:col-span-3 rounded-lg bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-900/40 px-3.5 py-2.5 text-[11px] text-slate-700 dark:text-slate-300 flex items-start gap-2">
                <Info className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                <p>
                  <strong>{districtChoice || savedDistrict}</strong>:{" "}
                  {districtChoiceReference.cases > 0 ? (
                    <>
                      {districtChoiceReference.cases} FMD case
                      {districtChoiceReference.cases === 1 ? "" : "s"} reported across{" "}
                      {districtChoiceReference.vsRangesAffected} Veterinary Surgeon range
                      {districtChoiceReference.vsRangesAffected === 1 ? "" : "s"} in{" "}
                      {districtChoiceReference.months.join(", ")} (DAPH Sri Lanka Annual Report 2022).
                    </>
                  ) : (
                    <>
                      No major outbreaks recorded in 2022 DAPH Annual Report. Ongoing surveillance active.
                    </>
                  )}
                </p>
              </div>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      {/* ── Current Conditions & Transmission Risk ─────────────────────────── */}
      {weatherData && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Live weather metrics */}
            <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5 text-orange-500" />
                Current Microclimate Conditions
              </p>
              <div className="mt-2.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500">Air Temperature:</span>
                  <span className="font-bold">{weatherData.temperature ?? "—"} °C</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500">Relative Humidity:</span>
                  <span className="font-bold">{weatherData.humidity ?? "—"} %</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">Rainfall:</span>
                  <span className="font-bold">{weatherData.rainfall ?? "—"} mm</span>
                </div>
                {weatherData.alert_message && (
                  <p className="text-orange-600 dark:text-orange-400 font-semibold pt-1.5 text-[11px] flex items-center gap-1">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    {weatherData.alert_message}
                  </p>
                )}
              </div>
            </div>

            {/* Airborne Transmission Analysis */}
            <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Airborne Transmission Analysis
              </p>
              <div className="mt-2.5 space-y-1.5 text-xs text-slate-700 dark:text-slate-200">
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500">Weather Risk Score:</span>
                  <span className="font-bold uppercase text-orange-600 dark:text-orange-400">
                    {weatherData.risk_level || "LOW"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500">Environmental Spread:</span>
                  <span className="font-bold uppercase text-slate-800 dark:text-slate-100">
                    {weatherData.environmental_risk || "Low"}
                  </span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-500">Last Synced:</span>
                  <span className="font-medium text-slate-600 dark:text-slate-300">
                    {weatherData.timestamp || "Just now"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Summary Key Metric Cards ────────────────────────────────────── */}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                  RISK_COLORS[activeRiskLevel]?.badge || RISK_COLORS.LOW.badge
                }`}
              >
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Today's Risk Level
                </p>
                <p
                  className={`text-sm font-bold ${
                    RISK_COLORS[activeRiskLevel]?.text || "text-slate-900 dark:text-white"
                  }`}
                >
                  {activeRiskLevel}
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800 flex items-center justify-center shrink-0">
                <Droplets className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Today's Rainfall
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  {weatherData.rainfall ?? 0} mm
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 border ${
                  weatherData.seasonal_active
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700"
                }`}
              >
                <CalendarClock className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  DAPH Seasonal Window
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {weatherData.seasonal_active ? "Active Peak" : "Standard"}
                  </p>
                  <span className="text-[10px] text-slate-400 font-medium">
                    ({weatherData.seasonal_period || "Dec–Feb"})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Temperature Trend Chart & 30-Day Strip ─────────────────────── */}
          <div className="pt-2 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                  <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                  Regional Temperature Trend Line
                </p>
                {chronologicalHistory.length > 0 && (
                  <span className="text-[11px] text-slate-400">
                    {chronologicalHistory.length} recorded day{chronologicalHistory.length === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {hasEnoughForChart ? (
                <div className="h-44 sm:h-52 w-full rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-3 shadow-2xs">
                  <Line data={temperatureChartData} options={temperatureChartOptions} />
                </div>
              ) : (
                <div className="rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-4 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Live temperature graph populates as daily records accumulate (at least 2 days needed).
                  </p>
                </div>
              )}
            </div>

            {/* Daily Risk History Strip */}
            {chronologicalHistory.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Recorded Daily Risk Matrix
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {chronologicalHistory.map((row) => {
                    const risk =
                      row.environmental_risk || row.predicted_risk || "LOW";
                    const colors = RISK_COLORS[risk] || RISK_COLORS.LOW;
                    return (
                      <div
                        key={row.date}
                        title={`${row.date}: ${risk} Risk${
                          row.seasonal_active ? " (DAPH Seasonal Window)" : ""
                        }`}
                        className={`h-6 w-6 sm:h-7 sm:w-7 rounded-md ${colors.dot} flex items-center justify-center shadow-2xs hover:scale-110 transition-transform cursor-pointer`}
                      >
                        {row.seasonal_active && (
                          <span className="h-1.5 w-1.5 rounded-full bg-white/90" />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 pt-1">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" /> Low Risk
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-xs bg-amber-500" /> Medium Risk
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2.5 w-2.5 rounded-xs bg-red-500" /> High Risk
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-slate-400" /> Seasonal Peak
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </motion.section>
  );
}
