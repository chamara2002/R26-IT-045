import { Download, FileText } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/index.jsx";

export default function ClinicalReportGenerator({ result, cowName, imageUrl }) {
  const generateTextReport = () => {
    const timestamp = new Date().toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      timeZoneName: "short",
    });

    const imageConfidence = result.image_prediction?.mastitis_confidence
      ? (result.image_prediction.mastitis_confidence * 100).toFixed(1)
      : "N/A";

    const healthConfidence = result.health_prediction?.mastitis_confidence
      ? (result.health_prediction.mastitis_confidence * 100).toFixed(1)
      : "N/A";

    const overallConfidence = result.overall_prediction?.confidence
      ? (result.overall_prediction.confidence * 100).toFixed(1)
      : "N/A";

    const report = `
╔══════════════════════════════════════════════════════════════════════════╗
║               CATTLESENSE CLINICAL MASTITIS DETECTION REPORT             ║
║                          Farmer-to-Veterinarian Handover                  ║
╚══════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════
1. REPORT METADATA
═══════════════════════════════════════════════════════════════════════════

Report Generated: ${timestamp}
Cow Name/ID: ${cowName || "Not provided"}
System: CattleSense AI v1.0 (CNN + Grad-CAM Multimodal Analysis)

═══════════════════════════════════════════════════════════════════════════
2. FINAL DIAGNOSIS & SEVERITY
═══════════════════════════════════════════════════════════════════════════

Prediction: ${result.prediction || "Not available"}
Severity Stage: ${result.stage || "Not available"}
Recommendation: ${result.recommendation || result.message || "No specific recommendation"}
Overall Confidence: ${overallConfidence}%

═══════════════════════════════════════════════════════════════════════════
3. MULTIMODAL ANALYSIS BREAKDOWN
═══════════════════════════════════════════════════════════════════════════

A. IMAGE ANALYSIS (CNN + Grad-CAM Heatmap)
   ─────────────────────────────────────────
   Prediction: ${result.image_prediction?.label === 1 ? "Mastitis" : "Normal"}
   Confidence: ${imageConfidence}%
   Analysis Type: Convolutional Neural Network with Grad-CAM visualization
   Note: Heatmap overlay highlights affected udder regions in red/orange.

B. HEALTH PARAMETERS ANALYSIS
   ─────────────────────────────────────────
   ${result.health_prediction ? `Prediction: ${result.health_prediction.label === 1 ? "Mastitis" : "Normal"}` : "No health parameters provided"}
   ${result.health_prediction ? `Confidence: ${healthConfidence}%` : ""}
   
   Input Data:
   • Milk Temperature: ${result.input_summary?.health_inputs?.milk_temperature || "Not provided"}°C
   • Milk Yield: ${result.input_summary?.health_inputs?.milk_yield || "Not provided"} L
   • Clotting Status: ${result.input_summary?.health_inputs?.clotting || "Not provided"}

C. BEHAVIORAL OBSERVATION
   ─────────────────────────────────────────
   ${
     result.behavior_assessment
       ? `Risk Level: ${result.behavior_assessment.risk_label}
   Confidence: ${result.behavior_assessment.confidence ? (result.behavior_assessment.confidence * 100).toFixed(1) : "N/A"}%
   
   Farmer-Reported Signs:
   ${
     result.behavior_assessment.signals
       ? Object.entries(result.behavior_assessment.signals)
           .map(([name, value]) => `   • ${name.replace(/_/g, " ")}: ${value ? "Present" : "Absent"}`)
           .join("\n")
       : "   No behavioral signals recorded"
   }`
       : "   No behavioral assessment provided"
   }

═══════════════════════════════════════════════════════════════════════════
4. SEVERITY CLASSIFICATION & FARMER ACTION GUIDE
═══════════════════════════════════════════════════════════════════════════

${getSeverityGuidance(result.stage)}

═══════════════════════════════════════════════════════════════════════════
5. DATA FUSION METHODOLOGY
═══════════════════════════════════════════════════════════════════════════

CattleSense uses HYBRID MULTIMODAL FUSION:
• Primary: CNN-based image analysis with Grad-CAM heatmap overlay for visual 
  identification of affected udder regions (not visible to human eye)
• Secondary: Numerical health parameters (milk temperature, yield, clotting)
• Tertiary: Farmer behavioral observations (restlessness, appetite, etc.)

Consensus Result: ${result.overall_prediction?.sources_used?.join(" + ") || "image"}
The final diagnosis represents the weighted consensus of all available data sources.

═══════════════════════════════════════════════════════════════════════════
6. VETERINARIAN NOTES
═══════════════════════════════════════════════════════════════════════════

This report is provided by CattleSense to support early detection and should NOT 
replace professional veterinary diagnosis. Please use this as a reference for:

✓ Early warning system for subclinical mastitis
✓ Decision support for timely veterinary consultation
✓ Baseline data for trending over time
✓ Documentation of health checks

Recommended Actions:
${getVeterinarianRecommendations(result.stage)}

═══════════════════════════════════════════════════════════════════════════
7. SYSTEM DISCLAIMER
═══════════════════════════════════════════════════════════════════════════

CattleSense is an AI-assisted detection system designed specifically for 
Sri Lankan smallholder farmers. Results are estimates and should be validated
by a qualified veterinarian before treatment decisions.

═══════════════════════════════════════════════════════════════════════════
Report End
═══════════════════════════════════════════════════════════════════════════
    `.trim();

    return report;
  };

  const getSeverityGuidance = (stage) => {
    const guidance = {
      Low: `
  STAGE: LOW RISK ✓
  ─────────────────────────────────────────
  • Cow appears healthy with minimal signs
  • Continue normal management practices
  • Monitor daily for any changes
  • Routine milking hygiene recommended
  • Next check: Monitor within 7 days
`,
      Medium: `
  STAGE: MEDIUM RISK ⚠️
  ─────────────────────────────────────────
  • Some warning signs detected
  • Increase observation frequency
  • Ensure clean water and rest
  • Maintain strict milking hygiene
  • Call veterinarian if no improvement by tomorrow
  • Isolate from herd if possible
`,
      High: `
  STAGE: HIGH RISK 🚨
  ─────────────────────────────────────────
  • Serious signs of mastitis detected
  • IMMEDIATE ACTION REQUIRED
  • Isolate cow from healthy herd immediately
  • Contact veterinarian TODAY for treatment
  • Reduce stress and provide clean space
  • Monitor temperature and appetite closely
  • Do NOT delay veterinary care
`,
      Critical: `
  STAGE: CRITICAL 🆘
  ─────────────────────────────────────────
  • EMERGENCY: Severe mastitis indicated
  • CONTACT VETERINARIAN IMMEDIATELY
  • Separate cow from herd at once
  • Prepare for possible hospitalization
  • Monitor vital signs closely
  • This is a medical emergency - ACT NOW
`,
    };

    return guidance[stage] || guidance.Medium;
  };

  const getVeterinarianRecommendations = (stage) => {
    if (stage === "Critical")
      return "☆ Emergency consultation required immediately\n  ☆ Consider inpatient treatment\n  ☆ Antibiotic therapy recommended\n  ☆ Monitor for systemic infection";
    if (stage === "High")
      return "☆ Urgent consultation within 24 hours\n  ☆ Consider antibiotic treatment\n  ☆ Milking plan adjustment\n  ☆ Follow-up exam in 48 hours";
    if (stage === "Medium")
      return "☆ Consultation within 48 hours\n  ☆ Preventive treatment options\n  ☆ Hygiene protocol review\n  ☆ Monitor and reassess in 72 hours";
    return "☆ Routine monitoring sufficient\n  ☆ Preventive practices reinforcement\n  ☆ Follow-up in 2 weeks\n  ☆ Good management practices";
  };

  const handleDownloadReport = () => {
    const report = generateTextReport();
    const element = document.createElement("a");
    const file = new Blob([report], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `CattleSense-Report-${cowName || "Cow"}-${Date.now()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 shadow-sm"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">
            <FileText className="h-6 w-6 text-slate-700 dark:text-slate-300" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Clinical Report for Veterinarian
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Comprehensive diagnosis & handover document
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <p className="text-sm text-slate-700 dark:text-slate-300">
          This structured clinical report includes:
        </p>
        <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Multimodal analysis (image + health + behavior)
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            CNN + Grad-CAM heatmap interpretation
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Four-stage severity classification
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Plain-language action guidance
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Veterinarian consultation recommendations
          </li>
        </ul>
      </div>

      <Button
        onClick={handleDownloadReport}
        className="w-full gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white hover:shadow-lg transition-all"
        size="lg"
      >
        <Download className="h-5 w-5" />
        Download Full Report (.txt)
      </Button>

      <p className="text-xs text-slate-600 dark:text-slate-400 mt-4 text-center">
        Share this report with your veterinarian for professional evaluation.
      </p>
    </motion.div>
  );
}
