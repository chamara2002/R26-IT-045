import { useEffect, useState } from "react";
import { Card } from "../components/ui/index.jsx";
import PageWrapper, { PageHeader } from "../components/PageWrapper";
import { useI18n } from "../i18n/language-context";
import contactsData from "../data/srilanka_contacts";
import {
  Thermometer,
  Droplet,
  Eye,
  Calendar,
  PhoneCall,
  Home,
  ShieldCheck,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  HeartPulse,
  Syringe,
  ShieldAlert,
  Phone,
} from "lucide-react";
import { motion } from "framer-motion";

const appGuidance = [
  {
    icon: Home,
    title: "1. Check Dashboard",
    text: "View your herd summary, recent milk production, health alerts, and quick actions.",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: ShieldCheck,
    title: "2. Register Cattle",
    text: "Add your cattle ear tag ID, breed, and lactation info to track individual records.",
    color: "from-emerald-500 to-emerald-600",
  },
  {
    icon: TrendingUp,
    title: "3. Log Milk Daily",
    text: "Record milk yield each day. The system alerts if there's a sudden drop — an early sign of sickness.",
    color: "from-teal-500 to-teal-600",
  },
  {
    icon: AlertCircle,
    title: "4. Run AI Disease Checks",
    text: "Take a photo of udder, skin, or mouth. Instant AI analysis predicts disease risk and severity.",
    color: "from-orange-500 to-amber-600",
  },
  {
    icon: CheckCircle,
    title: "5. Follow Care Advice",
    text: "Based on results, follow recommended steps. Low risk? Watch daily. High risk? Contact a vet immediately.",
    color: "from-rose-500 to-red-600",
  },
];

const riskLevels = [
  {
    level: "Low Risk (Healthy)",
    badge: "Routine Care",
    color: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-100",
    badgeColor: "bg-emerald-600 text-white",
    action: "Cow looks healthy. Keep clean water, fresh feed, and sanitize milking gear. Watch daily for changes.",
  },
  {
    level: "Mild Warning",
    badge: "Close Monitoring",
    color: "bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-950 dark:text-amber-100",
    badgeColor: "bg-amber-500 text-white",
    action: "Early signs detected. Provide clean bedding, extra water, and reduce stress. If no improvement by tomorrow, call vet.",
  },
  {
    level: "Moderate Risk",
    badge: "Action Required",
    color: "bg-orange-50 dark:bg-orange-950/40 border-orange-300 dark:border-orange-800 text-orange-950 dark:text-orange-100",
    badgeColor: "bg-orange-600 text-white",
    action: "Clear infection signs detected. Isolate the cow from healthy herd. Contact your local veterinary officer today.",
  },
  {
    level: "Critical / Severe",
    badge: "EMERGENCY",
    color: "bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-950 dark:text-red-100",
    badgeColor: "bg-red-600 text-white animate-pulse",
    action: "Emergency stage. Isolate animal immediately to prevent spread or collapse. Call veterinary surgeon RIGHT NOW.",
  },
];

const diseases = [
  {
    name: "Mastitis (Udder Infection)",
    icon: HeartPulse,
    signs: "Swollen, hot, red or painful udder. Clots, flakes, or blood in milk. Sudden drop in daily milk yield.",
    color: "text-emerald-600 dark:text-emerald-400",
  },
  {
    name: "Foot and Mouth Disease (FMD)",
    icon: ShieldAlert,
    signs: "High fever, excessive ropy drooling, blisters on mouth & tongue. Severe lameness and hoof sores.",
    color: "text-orange-600 dark:text-orange-400",
  },
  {
    name: "Lumpy Skin Disease (LSD)",
    icon: Syringe,
    signs: "Raised circular skin lumps (2–5cm) across body. High fever, eye/nasal discharge, loss of appetite.",
    color: "text-violet-600 dark:text-violet-400",
  },
  {
    name: "Milk Fever (Hypocalcaemia)",
    icon: Thermometer,
    signs: "Occurs around calving: downer cow unable to stand, cold ears, muscle tremors, S-curve neck posture.",
    color: "text-teal-600 dark:text-teal-400",
  },
];

const steps = [
  {
    icon: Eye,
    title: "1. Observe Udder",
    text: "Look for swelling, redness, hardness, or pain when touching the quarters.",
    color: "from-emerald-400 to-emerald-600",
  },
  {
    icon: Droplet,
    title: "2. Inspect Milk",
    text: "Strip first streams of milk into a cup. Check for watery consistency, clots, or discoloration.",
    color: "from-teal-400 to-teal-600",
  },
  {
    icon: Thermometer,
    title: "3. Check Temperature",
    text: "Measure cow or milk temperature. Normal cow body temp is 38.0°C – 39.3°C (101.5°F – 103.5°F).",
    color: "from-amber-400 to-amber-600",
  },
  {
    icon: Calendar,
    title: "4. Track Yield Daily",
    text: "Log daily milk volumes in the app — sudden drops indicate subclinical illness early.",
    color: "from-indigo-400 to-indigo-600",
  },
  {
    icon: PhoneCall,
    title: "5. Contact Vet Early",
    text: "If symptoms persist for more than 12 hours, call your local veterinary officer immediately.",
    color: "from-red-400 to-red-600",
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

export default function GuidancePage() {
  const { t } = useI18n();
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    setContacts(Array.isArray(contactsData) ? contactsData : []);
  }, []);

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title={t("guidance.title") || "Farmer Guidance & Health Protocols"}
        subtitle={t("guidance.subtitle") || "Practical steps for daily herd monitoring and emergency veterinary support."}
      />

      {/* Emergency Contacts with Direct Click to Call */}
      <Card className="p-5 sm:p-6 border-red-200 dark:border-red-900/60 bg-gradient-to-br from-red-50/40 via-white to-red-50/20 dark:from-red-950/20 dark:via-slate-900 dark:to-red-950/10">
        <div className="flex items-center gap-2 mb-4">
          <div className="h-10 w-10 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t("guidance.emergencyContactsTitle") || "Emergency Veterinary Contacts (Sri Lanka)"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t("guidance.emergencyContactsSub") || "Tap any number below to call directly from your mobile phone."}
            </p>
          </div>
        </div>

        {contacts.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            No emergency contacts available. Please contact your nearest Divisional Veterinary Surgeon office.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {contacts.map((c, idx) => {
              const cleanPhone = c.phone.replace(/[^0-9+]/g, "");
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                      {c.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {c.location}
                    </p>
                    <p className="text-xs font-mono font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {c.phone}
                    </p>
                  </div>
                  <a
                    href={`tel:${cleanPhone}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold shrink-0 transition-all shadow-xs"
                    aria-label={`Call ${c.name}`}
                  >
                    <Phone className="h-3.5 w-3.5" />
                    <span>{t("guidance.callNow") || "Call Now"}</span>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Risk Level Actions (Green/Amber/Red Guidelines) */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold mb-3 text-slate-900 dark:text-slate-100">
          {t("guidance.riskGuidelinesTitle") || "What To Do Based on Risk Levels"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {riskLevels.map((r, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              transition={{ delay: i * 0.05 }}
              className={`p-4 rounded-xl border ${r.color} flex flex-col justify-between gap-2 shadow-2xs`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <h3 className="font-bold text-sm">{r.level}</h3>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.badgeColor}`}>
                    {r.badge}
                  </span>
                </div>
                <p className="text-xs leading-relaxed opacity-90">{r.action}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Common Disease Signs */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold mb-3 text-slate-900 dark:text-slate-100">
          {t("guidance.diseaseSignsTitle") || "Common Cattle Diseases & Warning Signs"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {diseases.map((disease, i) => {
            const Icon = disease.icon;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: i * 0.05 }}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <Icon className={`h-5 w-5 ${disease.color} shrink-0`} />
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                    {disease.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  <span className="font-semibold text-slate-700 dark:text-slate-200">{t("detection.symptomsChecklist") || "Signs"}: </span>
                  {disease.signs}
                </p>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* How to Use App Steps */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold mb-3 text-slate-900 dark:text-slate-100">
          {t("guidance.howToUseTitle") || "How to Use CattleSense on Your Phone"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {appGuidance.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div
                key={i}
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                transition={{ delay: i * 0.05 }}
              >
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs h-full">
                  <div className={`h-11 w-11 rounded-xl bg-gradient-to-r ${item.color} flex items-center justify-center mb-3 text-white shadow-2xs`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.text}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* 5 Routine Mastitis Checks */}
      <Card className="p-5 sm:p-6">
        <h2 className="text-base sm:text-lg font-bold mb-3 text-slate-900 dark:text-slate-100">
          {t("guidance.dailyStepsTitle") || "5 Daily Steps for Udder Health"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div
                key={i}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs"
              >
                <div className={`h-11 w-11 rounded-xl bg-gradient-to-r ${s.color} flex items-center justify-center mb-3 text-white shadow-2xs`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-1">
                  {s.title}
                </h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {s.text}
                </p>
              </div>
            );
          })}
        </div>
      </Card>
    </PageWrapper>
  );
}

