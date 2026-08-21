import { useState } from "react";
import { Download, FileText, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "./ui/index.jsx";

export default function ClinicalReportGenerator({ result, cowName, farmerName, imageUrl }) {
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  if (!result) return null;

  const handleDownloadPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const payload = {
        result,
        cattle_info: {
          name: cowName || "Cow",
          tag_id: cowName || "Not recorded",
        },
        farmer_info: {
          name: farmerName || "Registered Farmer",
        },
        heatmap_id: result.heatmap_id,
      };

      // Try mastitis direct service first, then proxy endpoint fallback
      let response = null;
      try {
        response = await fetch("http://localhost:5002/api/report/generate-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch (err) {
        // Fallback to proxy
        response = await fetch("/api/modules/mastitis/report/pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      if (!response || !response.ok) {
        throw new Error("Failed to generate PDF from server");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `CattleSense-Mastitis-Veterinary-Report-${cowName || "Cow"}-${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation error:", err);
      alert("Could not generate PDF report. You can still download the text handover document.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

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

    const confidenceStr = typeof result.confidence === "number"
      ? `${(result.confidence * 100).toFixed(1)}%`
      : result.confidence || "Pending Evaluation";

    const imageConfidenceStr = typeof result.image_prediction?.confidence === "number"
      ? `${(result.image_prediction.confidence * 100).toFixed(1)}%`
      : result.image_prediction?.confidence || "Pending Evaluation";

    const numericalConfidenceStr = typeof result.numerical_prediction?.confidence === "number"
      ? `${(result.numerical_prediction.confidence * 100).toFixed(1)}%`
      : result.numerical_prediction?.confidence || "N/A";

    const numericalData = result.numerical_measurements;
    const hasNumerical = Boolean(result.model_2_used) && numericalData && Object.values(numericalData).some((v) => v !== null && v !== undefined && v !== "");

    const clinicalObs = result.clinical_observations;
    const hasClinical = clinicalObs && Object.values(clinicalObs).some((v) => v !== null && v !== undefined && v !== "");

    const modeDisplay = result.mode === "multimodal_image_numerical"
      ? "Hybrid Analysis"
      : result.mode === "image_only"
      ? "Image Analysis"
      : result.mode === "numerical_only"
      ? "Numerical Analysis"
      : (result.mode || "Assisted");

    const report = `
================================================================================
           CATTLESENSE CLINICAL MASTITIS DECISION SUPPORT REPORT
             MASTITIS ASSESSMENT & VETERINARY REVIEW REPORT
================================================================================

1. REPORT METADATA & CASE SUMMARY
--------------------------------------------------------------------------------
Report Generated:    ${timestamp}
Cow ID / Name:       ${cowName || "Not recorded"}
Farmer / Farm:       ${farmerName || "Registered Farmer"}
System:              CattleSense Dairy Diagnostic Assistant (v1.0)
Analysis Mode:       ${modeDisplay}

Final Assessment:    ${result.prediction || "Not available"}
Severity Staging:    ${result.stage || "Not available"}
Model Confidence:    ${confidenceStr}
Priority:            ${result.prediction === "Mastitis" ? "VETERINARY CONSULTATION RECOMMENDED" : "Routine Monitoring"}

================================================================================
2. MODEL PREDICTION (MULTIMODAL AI INFERENCE)
================================================================================
• Image Model (Model 1 - MobileNetV2):
  - Status:           ${result.image_prediction?.status || "Ready"}
  - Prediction:       ${result.image_prediction?.prediction || "Not evaluated"}
  - Confidence:       ${imageConfidenceStr}
  - Architecture:     MobileNetV2 (block_13_expand_relu activation maps)

• Numerical Model (Model 2 - Logistic Regression Pipeline):
  - Status:           ${result.model_2_used ? "Evaluated (5 required milk parameters)" : "Unavailable"}
  - Prediction:       ${result.numerical_prediction?.prediction || "N/A"}
  - Confidence:       ${numericalConfidenceStr}

================================================================================
3. MODEL INPUT FEATURES (MODEL 2)
================================================================================
${hasNumerical
        ? `• Milk Temperature:         ${numericalData.Milk_Temperature ?? numericalData.milk_temperature ?? numericalData.Temperature ?? "Not provided"} °C
• Milk pH:                  ${numericalData.Milk_pH ?? numericalData.milk_ph ?? "Not provided"}
• Milk Conductivity:        ${numericalData.Milk_Conductivity ?? numericalData.milk_conductivity ?? "Not provided"} mS/cm
• Milk Yield:               ${numericalData.Milk_Yield ?? numericalData.milk_yield ?? "Not provided"} L/day
• Milk Clotting:            ${numericalData.Clotting !== undefined ? (Number(numericalData.Clotting) === 1 ? "1 (Clots Present)" : "0 (No Clotting)") : (numericalData.clotting !== undefined ? (Number(numericalData.clotting) === 1 ? "1 (Clots Present)" : "0 (No Clotting)") : "Not provided")}`
        : "Model features: Not provided"}
      }

================================================================================
4. FARMER-REPORTED CLINICAL OBSERVATIONS (NON-ML TRIAGE)
================================================================================
${hasClinical
        ? `• Milk Yield Change:       ${clinicalObs.milk_yield_change ?? "Not answered"}
• Milk Appearance:         ${clinicalObs.milk_appearance ?? "Not answered"}
• Milk Clotting:           ${clinicalObs.milk_clotting ?? "Not answered"}
• Udder Swelling:          ${clinicalObs.udder_swelling ?? "Not answered"}
• Udder Warmth:            ${clinicalObs.udder_warmth ?? "Not answered"}
• Udder Pain:              ${clinicalObs.udder_pain ?? "Not answered"}
• Body Temperature:        ${clinicalObs.body_temperature ?? "Not answered"}
• Appetite:                ${clinicalObs.appetite ?? "Not answered"}`
        : "Clinical observations: Not provided"
      }

================================================================================
5. EXPLAINABLE AI — GRAD-CAM ANALYSIS (RESEARCH NOVELTY)
================================================================================
Udder Photograph:    Received & preprocessed (224x224 RGB)
Grad-CAM Heatmap:    ${result.heatmap_id ? `Generated (Reference ID: ${result.heatmap_id})` : "Available for Model 1 image inference"}
Visual Explanation:  Warm hues indicate image regions exerting strongest positive
                     predictive contribution on the MobileNetV2 classifier.
Interpretability:    Grad-CAM provides model-attention visualization and does not
                     perform anatomical segmentation or lesion localization.

================================================================================
6. WHAT THE FARMER SHOULD DO NOW (CONSERVATIVE GUIDANCE)
================================================================================
${result.recommendation || "Maintain routine udder hygiene and monitor the cow closely."}

Safety Directive:
Do not administer veterinary antibiotics or prescription drugs based solely on
this automated AI screening. All medical decisions must be made by a licensed
veterinarian following clinical examination and diagnostic testing.

================================================================================
7. VETERINARY CLINICAL HANDOVER SECTION (TO BE COMPLETED BY VET)
================================================================================
Veterinarian Assessment:    ___________________________________________________
Clinical Diagnosis:         ___________________________________________________
Diagnostic Tests Ordered:   ___________________________________________________
Treatment / Plan:           ___________________________________________________
Veterinarian Name:          ___________________________________________________
Registration / License No:  ___________________________________________________
Date & Signature:           Date: _________________  Sig: ____________________

================================================================================
8. AI NOTICE & VETERINARY REFERENCES
================================================================================
This automated report is designed strictly for early-warning and veterinary
decision support. Consult a licensed veterinarian before administering treatments.

References:
1. Merck Veterinary Manual: "Mastitis in Cattle", Ken Leslie, DVM, MSc.
2. Merck Veterinary Manual: "Overview of Mastitis in Large Animals".
================================================================================
`.trim();

    return report;
  };

  const handleDownloadTxt = () => {
    const content = generateTextReport();
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `CattleSense-Mastitis-Handover-${cowName || "Cow"}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Severity check: Veterinary report is exclusively for Critical / Severe mastitis cases
  const rawPrediction = String(result.prediction || "Normal");
  const stageStr = String(result.stage || result.severity?.severity_label || "").toLowerCase();
  const severityLevel = String(result.severity?.severity_level || "").toLowerCase();

  const isCritical =
    stageStr.includes("severe") ||
    stageStr.includes("critical") ||
    severityLevel === "severe" ||
    severityLevel === "critical" ||
    severityLevel === "3";

  // If case is Normal, Mild, or Moderate, do NOT generate veterinary PDF by default
  if (!isCritical) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border-2 border-red-300 dark:border-red-900/80 bg-red-50/40 dark:bg-red-950/20 p-5 shadow-md space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-red-200/80 dark:border-red-900/60">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-red-950 dark:text-red-100 flex items-center gap-2">
              <span>Veterinary Assessment & Case Handover Report</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-red-600 text-white shadow-2xs">
                Critical Case Handover
              </span>
            </h3>
            <p className="text-xs text-red-700 dark:text-red-300">
              Complete diagnostic record and fillable handover form for the attending veterinarian
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleDownloadPdf}
            disabled={isDownloadingPdf}
            variant="default"
            size="sm"
            className="gap-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm px-4 py-2"
          >
            {isDownloadingPdf ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{isDownloadingPdf ? "Generating PDF..." : "Download Veterinary Assessment PDF"}</span>
          </Button>

          <Button
            onClick={handleDownloadTxt}
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-semibold rounded-xl border-red-200 dark:border-red-800 text-red-900 dark:text-red-200 hover:bg-red-100/50"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>.TXT Handover</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-red-900 dark:text-red-200">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
          <span>4-Panel Grad-CAM Explainability (Photo, ROI, Heatmap, Overlay)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
          <span>Complete numerical biomarker profile & missingness routing</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
          <span>Clinical severity staging & immediate farmer safety instructions</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400 shrink-0" />
          <span>Fillable physical exam & clinical handover section for attending veterinarian</span>
        </div>
      </div>
    </motion.div>
  );
}
