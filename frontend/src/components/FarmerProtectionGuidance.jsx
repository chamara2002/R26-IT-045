import {
  ShieldCheck,
  AlertTriangle,
  HeartPulse,
  Droplets,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  PhoneCall,
  Activity,
  ClipboardList,
} from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from "../i18n/language-context";

/**
 * FarmerProtectionGuidance Component
 * Dynamic, severity-tailored protection, prevention, and safety instructions for farmers.
 * Based on authoritative clinical protocols (Merck Veterinary Manual).
 */
export default function FarmerProtectionGuidance({ result }) {
  const { t } = useI18n();

  if (!result) return null;

  const rawPrediction = String(result.prediction || "Normal");
  const stageStr = String(result.stage || result.severity?.severity_label || "").toLowerCase();
  const severityLevel = String(result.severity?.severity_level || "").toLowerCase();

  const isPending =
    rawPrediction.toLowerCase().includes("pending") || stageStr.includes("pending");

  const isHealthy =
    !isPending &&
    (rawPrediction.toLowerCase() === "normal" ||
      stageStr.includes("no mastitis") ||
      stageStr.includes("healthy") ||
      severityLevel === "negative" ||
      severityLevel === "0");

  const isCritical =
    !isPending &&
    !isHealthy &&
    (stageStr.includes("severe") ||
      stageStr.includes("critical") ||
      severityLevel === "severe" ||
      severityLevel === "critical" ||
      severityLevel === "3");

  const isModerate =
    !isPending &&
    !isHealthy &&
    !isCritical &&
    (stageStr.includes("moderate") || severityLevel === "moderate" || severityLevel === "2");

  const isMild = !isPending && !isHealthy && !isCritical && !isModerate;

  // ── Guidance Content Configuration ─────────────────────────────────────────
  let guidanceConfig = {
    title: t("farmerGuidance.healthyTitle") || "Cattle Protection & Mastitis Prevention",
    subtitle: t("farmerGuidance.healthySubtitle") || "Routine Udder Health & Preventive Farm Protocols",
    priority: t("farmerGuidance.healthyPriority") || "Routine Observation & Prevention",
    badgeColor: "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    containerBorder: "border-emerald-200 dark:border-emerald-900/60",
    containerBg: "bg-emerald-50/30 dark:bg-emerald-950/10",
    icon: <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
    summary:
      t("farmerGuidance.healthySummary") ||
      "The current assessment does not indicate mastitis. Continue routine milking hygiene, clean bedding, and regular observation to protect the herd and prevent future infection.",
    actionGroups: [
      {
        heading: t("farmerGuidance.healthyAction1Heading") || "1. Keep the Udder and Teats Clean & Dry",
        items: [
          t("farmerGuidance.healthyAction1Item1") || "Maintain clean, dry bedding in cattle housing and loafing areas at all times.",
          t("farmerGuidance.healthyAction1Item2") || "Ensure teats and udder base are thoroughly cleaned and dried with individual towels before cluster attachment.",
          t("farmerGuidance.healthyAction1Item3") || "Avoid unnecessary contamination of teat ends during pre-milking prep.",
          t("farmerGuidance.healthyAction1Item4") || "Prevent cows from lying down on wet surfaces immediately after milking while teat canals remain open.",
        ],
      },
      {
        heading: t("farmerGuidance.healthyAction2Heading") || "2. Maintain Strict Milking Hygiene",
        items: [
          t("farmerGuidance.healthyAction2Item1") || "Follow a consistent hygienic milking routine (prep, forestrip, wipe, attach within 60–90 seconds).",
          t("farmerGuidance.healthyAction2Item2") || "Sanitize hands/gloves and cluster equipment appropriately between cows.",
          t("farmerGuidance.healthyAction2Item3") || "Apply an effective post-milking teat disinfectant dip covering at least 75% of each teat.",
          t("farmerGuidance.healthyAction2Item4") || "Check milking machine vacuum levels and liner condition regularly.",
        ],
      },
      {
        heading: t("farmerGuidance.healthyAction3Heading") || "3. Continuous Cow Monitoring",
        items: [
          t("farmerGuidance.healthyAction3Item1") || "Watch for sudden drops in daily milk yield or changes in milk conductivity.",
          t("farmerGuidance.healthyAction3Item2") || "Inspect for abnormal milk consistency (watery milk, flakes, clots, or discoloration).",
          t("farmerGuidance.healthyAction3Item3") || "Check for local udder changes (heat, swelling, hardness, or discomfort during palpation).",
          t("farmerGuidance.healthyAction3Item4") || "Observe appetite, systemic temperature, and alertness daily.",
        ],
      },
    ],
    safetyNote:
      t("farmerGuidance.healthySafetyNote") ||
      "Good udder hygiene, dry bedding, and proper teat dipping remain the most cost-effective prevention against environmental and contagious pathogens.",
    merckRef: t("farmerGuidance.healthyMerckRef") || "Merck Veterinary Manual — Mastitis in Cattle (Prevention & Hygiene)",
  };

  if (isMild) {
    guidanceConfig = {
      title: t("farmerGuidance.mildTitle") || "Mastitis Detected — Protect the Cow",
      subtitle: t("farmerGuidance.mildSubtitle") || "Close Observation & Hygiene Escalation",
      priority: t("farmerGuidance.mildPriority") || "Close Monitoring Required",
      badgeColor: "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      containerBorder: "border-amber-200 dark:border-amber-900/60",
      containerBg: "bg-amber-50/30 dark:bg-amber-950/10",
      icon: <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
      summary:
        t("farmerGuidance.mildSummary") ||
        "The system detected findings associated with mild mastitis. Monitor the cow carefully and maintain strict hygiene to prevent infection progression or spread.",
      actionGroups: [
        {
          heading: t("farmerGuidance.mildActionHeading") || "Immediate Farmer Actions",
          items: [
            t("farmerGuidance.mildActionItem1") || "Maintain strict hygienic milking; milk the affected cow last or with a dedicated separate unit.",
            t("farmerGuidance.mildActionItem2") || "Keep the affected cow and udder clean, dry, and comfortably bedded.",
            t("farmerGuidance.mildActionItem3") || "Pay close attention to changes in milk appearance (flakes, clots, watery texture).",
            t("farmerGuidance.mildActionItem4") || "Monitor daily milk yield and quarter-level swelling, warmth, or tenderness.",
            t("farmerGuidance.mildActionItem5") || "Record observations in the farm logbook and follow your herd's established mastitis protocol.",
            t("farmerGuidance.mildActionItem6") || "Contact a veterinarian if symptoms worsen, persist beyond 48 hours, or if systemic signs develop.",
          ],
        },
      ],
      safetyNote:
        t("farmerGuidance.mildSafetyNote") ||
        "Do not start antibiotics or other prescription medicines without veterinary direction. Treatment decisions should be based on veterinary clinical assessment and, where appropriate, milk testing/culture to reduce unnecessary antimicrobial use.",
      merckRef: t("farmerGuidance.mildMerckRef") || "Merck Veterinary Manual — Clinical Mastitis Management",
    };
  } else if (isModerate) {
    guidanceConfig = {
      title: t("farmerGuidance.moderateTitle") || "Mastitis Detected — Veterinary Advice Recommended",
      subtitle: t("farmerGuidance.moderateSubtitle") || "Clinical Care & Infection Containment",
      priority: t("farmerGuidance.moderatePriority") || "Veterinary Consultation Recommended",
      badgeColor: "bg-orange-100 dark:bg-orange-950 text-orange-800 dark:text-orange-300 border-orange-200 dark:border-orange-800",
      containerBorder: "border-orange-200 dark:border-orange-900/60",
      containerBg: "bg-orange-50/30 dark:bg-orange-950/10",
      icon: <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400" />,
      summary:
        t("farmerGuidance.moderateSummary") ||
        "Clinical indicators and biomarkers suggest moderate mastitis. Prompt veterinary consultation is recommended to assess the infected quarter and determine appropriate therapeutic management.",
      actionGroups: [
        {
          heading: t("farmerGuidance.moderateAction1Heading") || "What the Farmer Should Do Now",
          items: [
            t("farmerGuidance.moderateAction1Item1") || "Monitor the cow closely and check rectal body temperature.",
            t("farmerGuidance.moderateAction1Item2") || "Maintain clean and dry udder and bedding conditions.",
            t("farmerGuidance.moderateAction1Item3") || "Follow hygienic milking procedures; discard or segregate milk from the affected quarter.",
            t("farmerGuidance.moderateAction1Item4") || "Record the cow's symptoms, milk yield changes, and clinical observations.",
            t("farmerGuidance.moderateAction1Item5") || "Contact a licensed veterinarian for clinical assessment and treatment advice.",
          ],
        },
        {
          heading: t("farmerGuidance.moderateAction2Heading") || "Escalation Warnings (Seek Prompt Veterinary Examination)",
          items: [
            t("farmerGuidance.moderateAction2Item1") || "Fever (>39.2 °C / 102.5 °F) or shivering.",
            t("farmerGuidance.moderateAction2Item2") || "Loss of appetite or reluctance to stand/walk.",
            t("farmerGuidance.moderateAction2Item3") || "Marked weakness, depression, or rapid deterioration.",
            t("farmerGuidance.moderateAction2Item4") || "Severe quarter swelling, extreme heat, or intense pain.",
            t("farmerGuidance.moderateAction2Item5") || "Abnormal milk containing substantial clots, blood, or serum-like secretion.",
          ],
        },
      ],
      safetyNote:
        t("farmerGuidance.moderateSafetyNote") ||
        "Do not administer prescription medications or intra-mammary infusions without veterinary diagnosis and prescription. Follow all veterinary instructions regarding milk withholding periods.",
      merckRef: t("farmerGuidance.moderateMerckRef") || "Merck Veterinary Manual — Treatment Protocols for Clinical Mastitis",
    };
  } else if (isCritical) {
    guidanceConfig = {
      title: t("farmerGuidance.criticalTitle") || "CRITICAL VETERINARY ATTENTION REQUIRED",
      subtitle: t("farmerGuidance.criticalSubtitle") || "Emergency Clinical Protocol & Systemic Risk Warning",
      priority: t("farmerGuidance.criticalPriority") || "Urgent Veterinary Examination",
      badgeColor: "bg-red-100 dark:bg-red-950 text-red-800 dark:text-red-200 border-red-200 dark:border-red-800",
      containerBorder: "border-red-300 dark:border-red-900/80",
      containerBg: "bg-red-50/40 dark:bg-red-950/20",
      icon: <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />,
      summary:
        t("farmerGuidance.criticalSummary") ||
        "The CattleSense assessment identified findings associated with a severe or potentially systemic mastitis case. Severe mastitis can involve acute systemic illness (fever, anorexia, toxic shock) and requires prompt veterinary clinical examination.",
      actionGroups: [
        {
          heading: t("farmerGuidance.criticalActionHeading") || "What the Farmer Should Do Immediately",
          items: [
            t("farmerGuidance.criticalActionItem1") || "Contact a licensed veterinarian promptly for urgent clinical examination and supportive therapy.",
            t("farmerGuidance.criticalActionItem2") || "Keep the affected cow under close, continuous observation in a clean, quiet, deeply bedded isolation stall.",
            t("farmerGuidance.criticalActionItem3") || "Keep the cow and affected udder clean and dry; provide clean drinking water and palatable feed.",
            t("farmerGuidance.criticalActionItem4") || "Follow veterinary/farm protocols regarding segregation and safe disposal of affected milk.",
            t("farmerGuidance.criticalActionItem5") || "Record vital signs: rectal temperature, appetite, milk volume changes, and udder condition.",
            t("farmerGuidance.criticalActionItem6") || "Download and hand the complete CattleSense Veterinary Assessment Report to the attending veterinarian.",
            t("farmerGuidance.criticalActionItem7") || "Do NOT independently administer prescription antibiotics or injectable drugs without veterinary authorization.",
            t("farmerGuidance.criticalActionItem8") || "Strictly observe all veterinary instructions regarding milk discarding and drug withdrawal periods.",
          ],
        },
      ],
      safetyNote:
        t("farmerGuidance.criticalSafetyNote") ||
        "Severe mastitis requires professional veterinary examination, supportive care, and targeted therapy. AI decision support does not replace direct veterinary diagnosis.",
      merckRef: t("farmerGuidance.criticalMerckRef") || "Merck Veterinary Manual — Acute & Toxic Mastitis in Dairy Cattle",
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`rounded-2xl border p-5 sm:p-6 shadow-xs space-y-4 ${guidanceConfig.containerBorder} ${guidanceConfig.containerBg} bg-white dark:bg-slate-900`}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200/60 dark:border-slate-700">
            {guidanceConfig.icon}
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {guidanceConfig.title}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {guidanceConfig.subtitle}
            </p>
          </div>
        </div>

        <span
          className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold border shrink-0 ${guidanceConfig.badgeColor}`}
        >
          {guidanceConfig.priority}
        </span>
      </div>

      {/* Summary Banner */}
      <p className="text-xs sm:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
        {guidanceConfig.summary}
      </p>

      {/* Action Checklists */}
      <div className="space-y-4 pt-1">
        {guidanceConfig.actionGroups.map((group, gIdx) => (
          <div
            key={gIdx}
            className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 p-4 space-y-2.5 shadow-2xs"
          >
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-200 flex items-center gap-1.5">
              <ClipboardList className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
              <span>{group.heading}</span>
            </h4>
            <ul className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
              {group.items.map((item, iIdx) => (
                <li key={iIdx} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                  <span className="leading-normal">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Medical Safety & Antibiotic Warning Banner */}
      <div className="rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 text-xs space-y-1">
        <p className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5 text-teal-600 dark:text-teal-400" />
          <span>{t("farmerGuidance.veterinarySafetyDirective") || "Veterinary Safety & Antimicrobial Stewardship Directive"}</span>
        </p>
        <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
          {guidanceConfig.safetyNote}
        </p>
      </div>

      {/* Source Citation */}
      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1">
          <span>{t("farmerGuidance.authoritySource") || "Authority Source:"}</span>
          <strong className="text-slate-600 dark:text-slate-400">{guidanceConfig.merckRef}</strong>
        </span>
      </div>
    </motion.div>
  );
}
