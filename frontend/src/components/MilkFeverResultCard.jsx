import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Thermometer, AlertCircle, FileText, CheckCircle2, PhoneCall, RefreshCw, Bookmark, ArrowRight, AlertTriangle, Loader2 } from "lucide-react";
import { Badge, Button } from "./ui/index.jsx";
import { saveMilkFeverAssessment } from "../services/api";

const MF_STAGE_COLORS = {
  Subclinical: {
    bg: "bg-blue-50 dark:bg-blue-950/20",
    border: "border-blue-300 dark:border-blue-800",
    badge: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200",
    text: "text-blue-700 dark:text-blue-300",
    bar: "bg-blue-500",
  },
  Mild: {
    bg: "bg-amber-50 dark:bg-amber-950/20",
    border: "border-amber-300 dark:border-amber-800",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    text: "text-amber-700 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  Moderate: {
    bg: "bg-orange-50 dark:bg-orange-950/20",
    border: "border-orange-300 dark:border-orange-800",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-200",
    text: "text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
  },
  Critical: {
    bg: "bg-red-50 dark:bg-red-950/20",
    border: "border-red-400 dark:border-red-800",
    badge: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-200",
    text: "text-red-700 dark:text-red-300",
    bar: "bg-red-600",
  },
};

const STAGE_EXPLANATIONS = {
  Subclinical:
    "Blood calcium levels are slightly below normal, but the cow is standing and showing few outward symptoms. Milk production may drop slightly and risk of secondary diseases is elevated.",
  Mild:
    "Early stage milk fever (Stage 1). The cow is ambulatory but may show restlessness, muscle tremors, head bobbing, or ear twitching. Immediate oral calcium supplementation can prevent worsening.",
  Moderate:
    "Clinical milk fever (Stage 2 / Sternal Recumbency). The cow is down on her chest with an 'S-shaped' neck curve and unable to rise. Subcutaneous or IV calcium borogluconate is required urgently.",
  Critical:
    "Severe milk fever (Stage 3 / Lateral Recumbency). The cow is lying flat on her side, unresponsive, and at extreme risk of bloat, coma, and death. Emergency IV calcium therapy is needed immediately.",
};

const STAGE_SUGGESTIONS = {
  Subclinical: {
    nutrition: [
      "Administer oral calcium paste / bolus (50g Ca) at calving and again 12h later",
      "Ensure adequate magnesium intake (0.4% DM in pre-calving diet)",
      "Avoid high potassium forages before calving",
    ],
    management: [
      "Monitor cow twice daily for tremors or cold extremities",
      "Check rumen fill and eating behavior",
      "Do not fully milk out for the first 24-48 hours",
    ],
  },
  Mild: {
    nutrition: [
      "Administer 1-2 oral calcium boluses immediately",
      "Provide warm water with electrolytes and molasses",
      "Review DCAD (Dietary Cation-Anion Difference) of pre-calving feed",
    ],
    management: [
      "Move cow to a deeply bedded, non-slip recovery pen",
      "Keep cow in sternal position — do not let her lie flat",
      "Call your veterinarian if no improvement within 2-4 hours",
    ],
  },
  Moderate: {
    nutrition: [
      "Do NOT administer oral liquids/drenches — cow may aspirate into lungs",
      "Prepare 400ml 23% Calcium Borogluconate solution for veterinary administration",
    ],
    management: [
      "CALL VETERINARIAN IMMEDIATELY for IV calcium infusion",
      "Prop cow upright with straw bales to prevent regurgitation and bloat",
      "Massage legs to restore circulation while awaiting vet arrival",
    ],
  },
  Critical: {
    nutrition: [
      "DO NOT ATTEMPT ANY ORAL FEEDING OR DRENCHING — HIGH RISK OF ASPIRATION",
    ],
    management: [
      "CALL EMERGENCY VET IMMEDIATELY — MINUTES COUNT",
      "Roll cow from side onto her sternum (chest) immediately",
      "Keep airway clear; keep head elevated",
      "Emergency hotline: +94 11 2 888 888",
    ],
  },
};

export default function MilkFeverResultCard({ result, cowId, cows = [], onCowSelect, onReset }) {
  const navigate = useNavigate();
  const [selectedCowId, setSelectedCowId] = useState(cowId || result?.cow_id || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  if (!result) return null;

  const effectiveCowId = selectedCowId || cowId || result?.cow_id || "";
  const linkedCow = cows.find((c) => String(c.id) === String(effectiveCowId));
  const effectiveCowName = linkedCow?.name || (effectiveCowId ? `Cow #${effectiveCowId}` : "Cow");

  const handleSaveResult = async () => {
    if (!effectiveCowId) {
      setSaveError("Please select a cow to save this assessment to their medical profile.");
      return;
    }

    setIsSaving(true);
    setSaveError("");
    setSaveSuccessMsg("");

    try {
      const payload = {
        cow_id: effectiveCowId,
        result: {
          ...result,
          stage: result.stage,
          prediction: result.stage || result.prediction || "Milk Fever Assessed",
          confidence: result.confidence_score || result.confidence || 0.9,
          calcium_estimate: result.calcium_estimate,
          risk_level: result.stage === "Critical" ? "High" : result.stage === "Moderate" ? "Medium" : "Low",
          recommendations: suggestions,
          recommendation: explanation,
        },
      };

      const res = await saveMilkFeverAssessment(payload);
      setIsSaved(true);
      setSaveSuccessMsg(res?.message || `Milk Fever Assessment saved to ${effectiveCowName}'s medical history.`);
    } catch (err) {
      console.error("Save Milk Fever assessment error:", err);
      setSaveError(err.message || "Unable to save assessment. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const colors = MF_STAGE_COLORS[result.stage] || MF_STAGE_COLORS.Mild;
  const explanation = STAGE_EXPLANATIONS[result.stage] || result.clinical_assessment || "";
  const suggestions = STAGE_SUGGESTIONS[result.stage] || STAGE_SUGGESTIONS.Mild;
  const stages = ["Subclinical", "Mild", "Moderate", "Critical"];
  const currentIdx = stages.indexOf(result.stage);

  const generatePDF = async () => {
    let jsPDFClass = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFClass) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        jsPDFClass = window.jspdf?.jsPDF || window.jsPDF;
      } catch (err) {
        console.warn("Could not load jsPDF from CDN, downloading text report fallback:", err);
      }
    }

    const date = new Date().toLocaleDateString("en-GB");
    const time = new Date().toLocaleTimeString("en-GB");

    if (jsPDFClass) {
      const doc = new jsPDFClass();
      doc.setFillColor(27, 58, 107);
      doc.rect(0, 0, 210, 38, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("CATTLESENSE — Milk Fever Veterinary Report", 15, 14);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${date} at ${time}`, 15, 23);
      doc.text("Milk Fever Detection Module", 15, 30);

      const stageColorMap = {
        Subclinical: [41, 128, 185],
        Mild: [243, 156, 18],
        Moderate: [230, 126, 34],
        Critical: [231, 76, 60],
      };
      const sc = stageColorMap[result.stage] || [100, 100, 100];
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
      doc.text(`Disease: ${result.disease || "Milk Fever"}`, 15, 78);

      doc.setDrawColor(200, 200, 200);
      doc.line(15, 85, 195, 85);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Clinical Assessment:", 15, 93);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const explLines = doc.splitTextToSize(explanation, 175);
      doc.text(explLines, 15, 101);

      let y = 101 + explLines.length * 6 + 6;

      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, 195, y);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Recommended Action:", 15, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const advLines = doc.splitTextToSize(result.advice || "", 175);
      doc.text(advLines, 15, y);
      y += advLines.length * 6 + 8;

      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, 195, y);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Nutrition Recommendations:", 15, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      (suggestions?.nutrition || []).forEach((tip) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }
        const lines = doc.splitTextToSize(`• ${tip}`, 170);
        doc.text(lines, 18, y);
        y += lines.length * 6 + 1;
      });

      y += 4;
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
      doc.setDrawColor(200, 200, 200);
      doc.line(15, y, 195, y);
      y += 8;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text("Management Actions:", 15, y);
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      (suggestions?.management || []).forEach((tip) => {
        if (y > 265) {
          doc.addPage();
          y = 20;
        }
        const lines = doc.splitTextToSize(`• ${tip}`, 170);
        doc.text(lines, 18, y);
        y += lines.length * 6 + 1;
      });

      if (result.stage === "Critical") {
        y += 6;
        if (y > 245) {
          doc.addPage();
          y = 20;
        }
        doc.setFillColor(231, 76, 60);
        doc.rect(15, y, 180, 22, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("⚠ EMERGENCY — Contact Veterinarian IMMEDIATELY", 105, y + 9, { align: "center" });
        doc.setFontSize(10);
        doc.text("Emergency Vet Hotline: +94 11 2 888 888", 105, y + 17, { align: "center" });
      }

      doc.setTextColor(150, 150, 150);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.text("Generated by CattleSense — ML-Based Cattle Disease Detection Platform (SLIIT Research Project)", 105, 284, { align: "center" });
      doc.text("Present this report to your veterinarian for faster, more accurate diagnosis and treatment.", 105, 289, { align: "center" });

      doc.save(`MilkFever_${result.stage}_Report_${date.replace(/\//g, "-")}.pdf`);
    } else {
      const text = `================================================================================
CATTLESENSE — MILK FEVER VETERINARY REPORT
Generated: ${date} at ${time}
Milk Fever Detection Module | SLIIT Research Project
================================================================================
Stage:             ${result.stage}
Risk Score:        ${result.risk_score}/100
Model Confidence:  ${(result.confidence * 100).toFixed(1)}%
Disease:           ${result.disease || "Milk Fever"}

Clinical Assessment:
${explanation}

Recommended Action:
${result.advice || "Consult veterinary officer."}

Nutrition Recommendations:
${(suggestions?.nutrition || []).map((t) => `• ${t}`).join("\n")}

Management Actions:
${(suggestions?.management || []).map((t) => `• ${t}`).join("\n")}
================================================================================`;
      const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `MilkFever_${result.stage}_Report_${date.replace(/\//g, "-")}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <section className={`rounded-3xl border-2 ${colors.border} ${colors.bg} p-6 sm:p-8 shadow-sm space-y-6`}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
              <Thermometer className="h-6 w-6" />
            </div>
            <div>
              <h3 className={`text-xl font-black ${colors.text}`}>Milk Fever Assessment</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {(Number(result.confidence) * 100).toFixed(1)}% model confidence
              </p>
            </div>
          </div>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${colors.badge}`}>
            {result.stage}
          </span>
        </div>

        {/* Progression Stage Tracker */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-4 border border-slate-200/80 dark:border-slate-800">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-3">
            Disease Progression Tracker
          </p>
          <div className="grid grid-cols-4 gap-2">
            {stages.map((stg, i) => {
              const isPast = i <= currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <div
                  key={stg}
                  className={`text-center py-2 px-1 rounded-xl text-xs font-semibold transition-all ${
                    isCurrent
                      ? `${colors.bar} text-white shadow-sm ring-2 ring-offset-1 ring-teal-500`
                      : isPast
                        ? "bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300"
                        : "bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500"
                  }`}
                >
                  <span className="block text-[10px] opacity-75">Stage {i + 1}</span>
                  <span className="text-[11px] truncate block">{stg}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Clinical Assessment Explanation */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-5 border border-slate-200/80 dark:border-slate-800 space-y-2">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Clinical Explanation
          </p>
          <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {explanation}
          </p>
        </div>

        {/* Recommendations */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-5 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Nutrition Actions
            </p>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {(suggestions?.nutrition || []).map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-teal-500 font-bold">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-2xl bg-white/80 dark:bg-slate-900/80 p-5 border border-slate-200/80 dark:border-slate-800 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
              Management & Care
            </p>
            <ul className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
              {(suggestions?.management || []).map((tip, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="text-teal-500 font-bold">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Emergency Banner for Critical */}
        {result.stage === "Critical" && (
          <div className="rounded-2xl bg-red-600 text-white p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 shrink-0" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider">Emergency Veterinary Alert</p>
                <p className="text-xs opacity-90">Downer cow at risk of coma. Seek IV calcium immediately.</p>
              </div>
            </div>
            <a
              href="tel:+94112888888"
              className="px-4 py-2 rounded-xl bg-white text-red-600 text-xs font-bold hover:bg-red-50 shrink-0 flex items-center gap-1"
            >
              <PhoneCall className="h-3.5 w-3.5" />
              Hotline
            </a>
          </div>
        )}

        {/* ── Linked Cow Profile & Save Result Card ── */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-4 sm:p-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Cow Profile Medical Record
              </h4>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {effectiveCowId ? `Linked: ${effectiveCowName}` : "Unlinked Assessment"}
                </span>
                {linkedCow?.tag_id && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                    Tag: {linkedCow.tag_id}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {!effectiveCowId && cows.length > 0 && (
                <select
                  value={selectedCowId}
                  onChange={(e) => {
                    setSelectedCowId(e.target.value);
                    if (onCowSelect) onCowSelect(e.target.value);
                  }}
                  className="text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 max-w-[200px] truncate"
                >
                  <option value="">Select a cow to link...</option>
                  {cows.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || `Cow #${c.id}`} ({c.tag_id || "No Tag"})
                    </option>
                  ))}
                </select>
              )}

              {!isSaved ? (
                <Button
                  type="button"
                  onClick={handleSaveResult}
                  disabled={isSaving || !effectiveCowId}
                  variant="primary"
                  size="sm"
                  className="gap-2 rounded-xl text-xs font-semibold px-4 py-2 shrink-0 whitespace-nowrap bg-teal-600 hover:bg-teal-700"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Bookmark className="h-3.5 w-3.5" />
                      <span>Save Result</span>
                    </>
                  )}
                </Button>
              ) : (
                <div className="flex items-center justify-end gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-bold shrink-0 whitespace-nowrap">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>✓ Result Saved</span>
                  </span>

                  {effectiveCowId && (
                    <Button
                      type="button"
                      onClick={() => navigate(`/cows/${effectiveCowId}/records`)}
                      variant="outline"
                      size="sm"
                      className="gap-1.5 rounded-xl text-xs font-semibold shrink-0 whitespace-nowrap"
                    >
                      <span>View Cow Records</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>

          {saveSuccessMsg && (
            <p className="mt-2.5 text-xs font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </p>
          )}
          {saveError && (
            <p className="mt-2.5 text-xs font-medium text-red-600 dark:text-red-400 flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{saveError}</span>
            </p>
          )}
        </div>

        {/* Action Buttons: PDF Download + Reset */}
        <div className="pt-2 flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={generatePDF}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold py-3 px-4 shadow-sm transition"
          >
            <FileText className="h-4 w-4" />
            <span>Download Veterinary Report (PDF)</span>
          </button>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold py-3 px-5 text-xs sm:text-sm transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>New Check</span>
            </button>
          )}
        </div>
      </section>
    </motion.div>
  );
}
