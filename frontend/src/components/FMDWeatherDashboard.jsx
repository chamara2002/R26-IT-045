import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { CloudSun, RefreshCw, MapPin, AlertTriangle, ShieldCheck, Info } from "lucide-react";
import { Badge } from "./ui/index.jsx";

export default function FMDWeatherDashboard({ color = { border: "border-orange-200 dark:border-orange-800", bg: "bg-orange-50 dark:bg-orange-900/20", button: "bg-orange-600 hover:bg-orange-700" } }) {
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
  // this feature (saved district) — never the browser's GPS.
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
      className={`rounded-2xl border ${color.border || "border-orange-200"} ${color.bg || "bg-orange-50"} p-5 sm:p-6 shadow-xs space-y-4`}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-900/40 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
            <CloudSun className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                FMD Regional Weather Risk Alert
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              District: <strong>{savedDistrict || (loading ? "Detecting…" : "Not set")}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-3 py-1 rounded-full text-xs font-bold ${riskClass}`}>
            {weatherData?.risk_level ? `${weatherData.risk_level} RISK` : (loading ? "CHECKING…" : "STANDBY")}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
        <p className="text-xs text-slate-600 dark:text-slate-300">
          {savedDistrict
            ? "Live microclimate analysis for airborne virus transmission in your district."
            : "Select your farm district once to enable automatic regional spread alerts."}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowLocationPicker((v) => !v)}
            className="inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            {savedDistrict ? "Change District" : "Set District"}
          </button>
          {savedDistrict && (
            <button
              type="button"
              onClick={fetchWeather}
              className={`inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-semibold text-white ${color.button || "bg-orange-600 hover:bg-orange-700"} transition`}
              disabled={loading}
            >
              <RefreshCw className={`h-3 w-3 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}

      {(needsLocation || showLocationPicker) && (
        <form
          onSubmit={handleSaveDistrict}
          className="grid gap-3 sm:grid-cols-3 items-end p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700"
        >
          {needsLocation && (
            <p className="sm:col-span-3 text-xs text-slate-500 dark:text-slate-400">
              Please set your current farm district for weather-based FMD risk predictions:
            </p>
          )}
          <div className="sm:col-span-2 space-y-1">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Select Farm District
            </label>
            <select
              value={districtChoice}
              onChange={(e) => setDistrictChoice(e.target.value)}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-xs text-slate-900 dark:text-slate-100"
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
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-xs font-bold text-white ${color.button || "bg-orange-600 hover:bg-orange-700"} disabled:opacity-50`}
          >
            {savingLocation ? "Saving…" : "Save District"}
          </button>
        </form>
      )}

      {weatherData && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 p-3.5 border border-slate-200/60 dark:border-slate-700/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Current Weather Conditions
            </p>
            <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
              <p><strong>Temperature:</strong> {weatherData.temperature} °C</p>
              <p><strong>Humidity:</strong> {weatherData.humidity} %</p>
              <p><strong>Rainfall:</strong> {weatherData.rainfall} mm</p>
              {weatherData.alert_message && (
                <p className="text-orange-600 dark:text-orange-400 font-semibold pt-1">
                  ⚠️ {weatherData.alert_message}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-white/70 dark:bg-slate-800/60 p-3.5 border border-slate-200/60 dark:border-slate-700/60">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Transmission Risk Analysis
            </p>
            <div className="mt-2 space-y-1 text-xs text-slate-700 dark:text-slate-200">
              <p><strong>Weather Risk Score:</strong> {weatherData.risk_level}</p>
              <p><strong>Environmental Spread:</strong> {weatherData.environmental_risk || "Low"}</p>
              <p><strong>Updated:</strong> {weatherData.timestamp || "Just now"}</p>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}
