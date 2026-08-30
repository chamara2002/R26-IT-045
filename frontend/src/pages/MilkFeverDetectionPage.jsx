import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Thermometer, CheckCircle,
  CloudSun, RefreshCw, ChevronDown, ChevronUp,
  FlaskConical, Eye, AlertTriangle
} from "lucide-react";
import jsPDF from "jspdf";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Alert } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
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

const MF_STAGE_COLORS = {
  Subclinical: {
    bg: "bg-blue-50 dark:bg-blue-900/20",
    border: "border-blue-400 dark:border-blue-700",
    text: "text-blue-800 dark:text-blue-300",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    header: "bg-blue-700", cborder: "border-blue-200 dark:border-blue-700",
    dot: "text-blue-600", bar: "bg-blue-500", btn: "bg-blue-700 hover:bg-blue-800",
  },
  Mild: {
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
    border: "border-yellow-400 dark:border-yellow-700",
    text: "text-yellow-800 dark:text-yellow-300",
    badge: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-200",
    header: "bg-yellow-600", cborder: "border-yellow-200 dark:border-yellow-700",
    dot: "text-yellow-600", bar: "bg-yellow-500", btn: "bg-yellow-600 hover:bg-yellow-700",
  },
  Moderate: {
    bg: "bg-orange-50 dark:bg-orange-900/20",
    border: "border-orange-400 dark:border-orange-700",
    text: "text-orange-800 dark:text-orange-300",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
    header: "bg-orange-600", cborder: "border-orange-200 dark:border-orange-700",
    dot: "text-orange-600", bar: "bg-orange-500", btn: "bg-orange-600 hover:bg-orange-700",
  },
  Critical: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-400 dark:border-red-700",
    text: "text-red-700 dark:text-red-300",
    badge: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-200",
    header: "bg-red-600", cborder: "border-red-200 dark:border-red-700",
    dot: "text-red-500", bar: "bg-red-400", btn: "bg-red-600 hover:bg-red-700",
  },
};

const STAGE_EXPLANATIONS = {
  Subclinical: "Early-stage calcium deficiency detected. No visible symptoms yet, but preventive action now prevents progression.",
  Mild: "Mild calcium deficiency detected. Your cow may show early weakness signs. Begin treatment immediately.",
  Moderate: "Moderate calcium deficiency detected. Your cow needs on-farm treatment now. Contact a livestock officer urgently.",
  Critical: "Critical calcium deficiency detected. This is a life-threatening emergency. Call a veterinarian immediately.",
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
      "Keep cow in sternal recumbency (chest down, not on side) — prevents bloat",
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
    if (thi < 72) return {
      label: "Normal / Low Heat Stress",
      color: "text-emerald-700 dark:text-emerald-400",
      bg: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200",
      risk: "Weather conditions are favorable.",
      impact: "No additional risk adjustment",
      impactColor: "text-emerald-600",
    };
    if (thi < 79) return {
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

// ── Result Card ───────────────────────────────────────────────────────────────

function MilkFeverResultCard({ result, onReset }) {
  if (!result) return null;

  const colors = MF_STAGE_COLORS[result.stage] || MF_STAGE_COLORS.Mild;
  const explanation = STAGE_EXPLANATIONS[result.stage] || "";
  const suggestions = STAGE_SUGGESTIONS[result.stage];
  const stages = ["Subclinical", "Mild", "Moderate", "Critical"];
  const currentIdx = stages.indexOf(result.stage);
  const explanation_data = result.explanation;

  const generatePDF = () => {
    const doc = new jsPDF();
    const date = new Date().toLocaleDateString("en-GB");
    const time = new Date().toLocaleTimeString("en-GB");

    doc.setFillColor(27, 58, 107);
    doc.rect(0, 0, 210, 38, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.setFont("helvetica", "bold");
    doc.text("CATTLESENSE — Milk Fever Veterinary Report", 15, 14);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Generated: ${date} at ${time}`, 15, 23);
    doc.text("Component IV — Milk Fever Detection | SLIIT Research Project", 15, 30);

    const sc = { Subclinical: [41, 128, 185], Mild: [243, 156, 18], Moderate: [230, 126, 34], Critical: [231, 76, 60] }[result.stage] || [100, 100, 100];
    doc.setFillColor(...sc);
    doc.roundedRect(130, 43, 65, 13, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`Stage: ${result.stage}`, 162, 52, { align: "center" });

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Detection Summary", 15, 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Risk Score: ${result.risk_score}/100`, 15, 62);
    doc.text(`Model Confidence: ${(result.confidence * 100).toFixed(1)}%`, 15, 70);
    doc.text(`Heat Stress Adjustment: +${result.thi_adjustment || 0} points`, 15, 78);
    doc.text(`Lab Values Used: ${result.used_lab_values ? "Yes" : "No (symptom-estimated)"}`, 15, 86);

    doc.setDrawColor(200, 200, 200);
    doc.line(15, 93, 195, 93);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Clinical Assessment:", 15, 101);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const explLines = doc.splitTextToSize(explanation, 175);
    doc.text(explLines, 15, 109);

    let y = 109 + explLines.length * 6 + 6;

    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y); y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Recommended Action:", 15, y); y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const advLines = doc.splitTextToSize(result.advice || "", 175);
    doc.text(advLines, 15, y);
    y += advLines.length * 6 + 8;

    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, 195, y); y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Nutrition Recommendations:", 15, y); y += 8;
    doc.setFont("helvetica", "normal");
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
    doc.line(15, y, 195, y); y += 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Management Actions:", 15, y); y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    (suggestions?.management || []).forEach(tip => {
      if (y > 265) { doc.addPage(); y = 20; }
      const lines = doc.splitTextToSize(`• ${tip}`, 170);
      doc.text(lines, 18, y);
      y += lines.length * 6 + 1;
    });

    if (result.stage === "Critical") {
      y += 6;
      if (y > 245) { doc.addPage(); y = 20; }
      doc.setFillColor(231, 76, 60);
      doc.rect(15, y, 180, 22, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("EMERGENCY — Contact Veterinarian IMMEDIATELY", 105, y + 9, { align: "center" });
      doc.setFontSize(10);
      doc.text("Emergency Vet Hotline: +94 11 2 888 888", 105, y + 17, { align: "center" });
    }

    doc.setTextColor(150, 150, 150);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("Generated by CattleSense — ML-Based Cattle Disease Detection Platform (SLIIT)", 105, 284, { align: "center" });
    doc.text("Present this report to your veterinarian for faster, more accurate diagnosis.", 105, 289, { align: "center" });
    doc.save(`MilkFever_${result.stage}_${date.replace(/\//g, "-")}.pdf`);
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
              {result.used_lab_values && (
                <span className="ml-2 text-blue-600 font-semibold">• Lab values used</span>
              )}
            </p>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-bold border border-current flex-shrink-0 ${colors.badge}`}>
            {result.stage}
          </span>
        </div>

        {/* 2. Stage Progression */}
        <div className="pt-1">
          <div className="relative">
            <div className="absolute top-2.5 left-5 right-5 h-0.5 bg-slate-200 dark:bg-slate-700" />
            <div
              className={`absolute top-2.5 left-5 h-0.5 ${colors.bar} transition-all duration-700`}
              style={{ width: currentIdx === 0 ? "0%" : `calc(${(currentIdx / (stages.length - 1)) * 100}% - 10px)` }}
            />
            <div className="relative flex justify-between">
              {stages.map((s, i) => (
                <div key={s} className="flex flex-col items-center">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center text-[10px] font-bold z-10
                    ${i === currentIdx ? `${colors.bar} border-transparent text-white shadow-md`
                      : i < currentIdx ? "bg-slate-400 border-transparent text-white"
                        : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600"}`}>
                    {i < currentIdx ? "✓" : ""}
                  </div>
                  <span className={`text-[10px] mt-1 font-semibold whitespace-nowrap
                    ${i === currentIdx ? colors.text : "text-slate-400 dark:text-slate-500"}`}>
                    {s}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Risk Score */}
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-500 uppercase tracking-wider">Risk Score</span>
            <span className={`font-bold ${colors.text}`}>{result.risk_score} / 100</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3 overflow-hidden">
            <div className={`h-3 rounded-full transition-all duration-700 ${colors.bar}`}
              style={{ width: `${result.risk_score}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 mt-1">
            <span>Low risk</span>
            {result.thi_adjustment > 0 && (
              <span className="text-orange-500 font-semibold">
                +{result.thi_adjustment} from heat stress
              </span>
            )}
            <span>High risk</span>
          </div>
        </div>

        {/* 4. Stage Explanation */}
        <div className={`rounded-xl border ${colors.cborder} bg-white/60 dark:bg-black/20 p-3`}>
          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{explanation}</p>
        </div>

        {/* 5. AI Explanation — Why this prediction */}
        {explanation_data && (
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-slate-700 px-4 py-2.5 flex items-center gap-2">
              <Eye className="h-4 w-4 text-white" />
              <p className="text-white font-bold text-sm">
                🔍 Why this prediction?
              </p>
            </div>
            <div className="p-4 space-y-3">
              {explanation_data.warning_factors?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-wider mb-2">
                    ⚠️ Risk Factors Detected ({explanation_data.warning_factors.length})
                  </p>
                  <ul className="space-y-1.5">
                    {explanation_data.warning_factors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <span className="text-red-500 font-bold mt-0.5 flex-shrink-0">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {explanation_data.positive_factors?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2">
                    ✅ Positive Factors
                  </p>
                  <ul className="space-y-1.5">
                    {explanation_data.positive_factors.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <span className="text-green-500 font-bold mt-0.5 flex-shrink-0">•</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. Nutrition */}
        {suggestions && (
          <div className={`rounded-xl border ${colors.cborder} overflow-hidden`}>
            <div className={`${colors.header} px-4 py-2.5 flex items-center gap-2`}>
              <span>🥗</span>
              <p className="text-white font-bold text-sm">Nutrition Recommendations</p>
            </div>
            <ul className="p-4 space-y-2 bg-white/40 dark:bg-black/10">
              {suggestions.nutrition.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className={`${colors.dot} font-bold mt-0.5 flex-shrink-0`}>•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 7. Management */}
        {suggestions && (
          <div className={`rounded-xl border ${colors.cborder} overflow-hidden`}>
            <div className={`${colors.header} px-4 py-2.5 flex items-center gap-2`}>
              <span>🐄</span>
              <p className="text-white font-bold text-sm">Management Actions</p>
            </div>
            <ul className="p-4 space-y-2 bg-white/40 dark:bg-black/10">
              {suggestions.management.map((tip, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className={`${colors.dot} font-bold mt-0.5 flex-shrink-0`}>•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 8. Recommended Action */}
        <div className={`rounded-xl border ${colors.border} bg-white/70 dark:bg-black/20 p-4`}>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
            Recommended Action
          </p>
          <p className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
            {result.advice || result.message}
          </p>
        </div>

        {/* 9. Critical Emergency */}
        {result.stage === "Critical" && (
          <div className="rounded-xl bg-red-600 text-white p-4 text-center shadow-lg">
            <p className="font-black text-lg mb-1 flex items-center justify-center gap-2">
              ⚠️ EMERGENCY
            </p>
            <p className="text-sm font-semibold">Contact a veterinarian IMMEDIATELY</p>
            <p className="text-sm mt-1 opacity-90">
              Emergency Vet Hotline: <strong>+94 11 2 888 888</strong>
            </p>
          </div>
        )}

        {/* 10. Buttons */}
        <div className="space-y-2 pt-1">
          <button onClick={generatePDF}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white bg-slate-700 hover:bg-slate-800 transition-colors shadow-sm">
            📄 Download Veterinary Report (PDF)
          </button>
          <button
            onClick={() => { if (onReset) onReset(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
            🔄 Check Another Cow
          </button>
        </div>
      </section>
    </motion.div>
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
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLabSection, setShowLabSection] = useState(false);
  const [thi, setThi] = useState(null);

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
    getCows().then(r => setCows(r?.cows || [])).catch(() => { });
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
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
    if (form.cowId) payload.cow_id = form.cowId;

    try {
      setIsSubmitting(true);
      const response = await predictMilkFever(payload);
      setResult(response?.data || response);
      showSuccess(t("milkFeverDetection.analysisSuccess") || "Milk Fever assessment completed successfully");
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
        <Link to="/modules"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-teal-600 transition-colors">
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
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <CowSelector cows={cows} value={form.cowId} onChange={handleChange} />

            {/* ── Section 1: Basic Info ── */}
            <div className="rounded-xl border border-teal-200 dark:border-teal-800 overflow-hidden">
              <div className="bg-teal-700 px-4 py-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
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
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Higher parity = higher risk</p>
                    <select name="parity" value={form.parity} onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
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
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">Peak risk: first 3 days</p>
                    <input type="date" name="calving_date" value={form.calving_date} onChange={handleChange}
                      max={new Date().toISOString().split("T")[0]}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* BCS */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Body condition score (BCS)
                    </label>
                    <select name="bcs" value={form.bcs} onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                      {BCS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  {/* Eating */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                      Current appetite
                    </label>
                    <select name="eating" value={form.eating} onChange={handleChange}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500">
                      {EATING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 2: Observable Symptoms ── */}
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 overflow-hidden">
              <div className="bg-amber-600 px-4 py-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                <div>
                  <p className="text-white font-semibold text-sm">Section 2 — Observable symptoms</p>
                  <p className="text-amber-100 text-[11px]">What you can see right now — no lab tests needed</p>
                </div>
              </div>
              <div className="p-4 space-y-4">
                {/* Behavioral */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Behavioral state and mobility
                  </label>
                  <div className="grid gap-2">
                    {BEHAVIORAL_OPTIONS.map(o => (
                      <label key={o.value}
                        className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition select-none
                          ${form.behavioral === o.value
                            ? "border-teal-500 bg-teal-50 dark:bg-teal-900/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"}`}>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition
                          ${form.behavioral === o.value ? "border-teal-500" : "border-slate-300 dark:border-slate-600"}`}>
                          {form.behavioral === o.value && (
                            <div className="w-2 h-2 rounded-full bg-teal-500" />
                          )}
                        </div>
                        <input type="radio" name="behavioral" value={o.value}
                          checked={form.behavioral === o.value} onChange={handleChange}
                          className="sr-only" />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{o.label}</span>
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
                    { name: "cannot_stand", label: "Cannot stand up or keeps collapsing (downer cow)" },
                    { name: "muscle_tremors", label: "Visible muscle tremors, shivering, or ear twitching" },
                    { name: "excessive_drooling", label: "Excessive drooling or salivation" },
                    { name: "cold_ears", label: "Cold ears or cold extremities" },
                  ].map(s => (
                    <label key={s.name}
                      className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer select-none transition-colors
                        ${form[s.name] ? "border-teal-400 bg-teal-50 dark:bg-teal-900/20" : "border-slate-200 dark:border-slate-700 hover:border-slate-300"}`}>
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition
                        ${form[s.name] ? "bg-teal-500 border-teal-500" : "border-slate-300 dark:border-slate-600"}`}>
                        {form[s.name] && (
                          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                      <input type="checkbox" name={s.name}
                        checked={form[s.name] || false} onChange={handleChange}
                        className="sr-only" />
                      <span className="text-sm text-slate-700 dark:text-slate-300">{s.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Section 3: Lab Results (Optional) ── */}
            <div className="rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
              <button type="button"
                onClick={() => setShowLabSection(!showLabSection)}
                className="w-full bg-blue-700 hover:bg-blue-800 px-4 py-3 flex items-center justify-between transition-colors">
                <div className="flex items-center gap-2 text-left">
                  <FlaskConical className="h-4 w-4 text-white flex-shrink-0" />
                  <div>
                    <p className="text-white font-semibold text-sm flex items-center gap-2">
                      Section 3 — Lab results
                      <span className="text-[10px] font-normal bg-blue-600 px-2 py-0.5 rounded-full">
                        Optional — improves accuracy
                      </span>
                    </p>
                    <p className="text-blue-200 text-[11px]">Tap to {showLabSection ? "hide" : "add"} lab values</p>
                  </div>
                </div>
                {showLabSection ? <ChevronUp className="h-4 w-4 text-white flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-white flex-shrink-0" />}
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
                          { name: "blood_calcium_lab", label: "Blood calcium (mg/dL)", hint: "Normal: 8.5–10.5", placeholder: "e.g. 7.2" },
                          { name: "blood_phosphorus_lab", label: "Blood phosphorus (mg/dL)", hint: "Normal: 4.0–8.0", placeholder: "e.g. 5.5" },
                          { name: "milk_yield_lab", label: "Milk yield day 1 (kg)", hint: "Normal: 15–25 kg", placeholder: "e.g. 18.0" },
                        ].map(f => (
                          <div key={f.name}>
                            <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">{f.label}</label>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-1.5">{f.hint}</p>
                            <input type="number" step="0.1" name={f.name}
                              value={form[f.name] || ""} onChange={handleChange}
                              placeholder={f.placeholder}
                              className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2.5 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── Weather ── */}
            <WeatherRiskPanel onWeatherFetched={(thiValue) => setThi(thiValue)} />

            {error && <Alert variant="error" message={error} />}

            {/* Submit */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <button type="submit" disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold py-3.5 rounded-xl transition-colors">
                {isSubmitting ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    <span>Estimating blood calcium and stage…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>Run milk fever assessment</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </motion.div>

      {/* Result */}
      {result && (
        <MilkFeverResultCard
          result={result}
          onReset={() => { setResult(null); setError(""); }}
        />
      )}
    </PageWrapper>
  );
}