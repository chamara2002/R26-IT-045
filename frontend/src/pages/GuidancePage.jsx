import { useEffect, useState } from "react";
import { Card } from "../components/ui/index.jsx";
import PageWrapper, { PageHeader } from "../components/PageWrapper";
import { useI18n } from "../i18n/language-context";
import contactsData from "../data/srilanka_contacts";
import { Thermometer, Droplet, Eye, Calendar, PhoneCall, Home, ShieldCheck, TrendingUp, AlertCircle, CheckCircle } from "lucide-react";
import { motion } from "framer-motion";

const appGuidance = [
  {
    icon: Home,
    title: "Dashboard",
    text: "View your herd summary, recent milk production, health alerts, and quick access to all features.",
    color: "from-blue-400 to-blue-600",
  },
  {
    icon: ShieldCheck,
    title: "Register Cows",
    text: "Add your cattle records with name, breed, age, and lactation info. Update as needed.",
    color: "from-emerald-400 to-emerald-600",
  },
  {
    icon: TrendingUp,
    title: "Log Milk Daily",
    text: "Record milk yield each day. System alerts if there's a sudden drop — a sign of illness.",
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: AlertCircle,
    title: "Run Disease Checks",
    text: "Take a photo of your cow and add health data. AI analyzes and gives instant risk assessment.",
    color: "from-orange-400 to-orange-600",
  },
  {
    icon: CheckCircle,
    title: "Get Guidance",
    text: "Based on results, follow recommended actions. Low risk? Watch daily. High risk? Contact vet now.",
    color: "from-red-400 to-red-600",
  },
];

const riskLevels = [
  {
    level: "Low",
    color: "bg-emerald-100 dark:bg-emerald-900/30",
    borderColor: "border-emerald-300 dark:border-emerald-700",
    textColor: "text-emerald-900 dark:text-emerald-100",
    action: "Cow looks okay. Keep clean water and normal feeding. Watch daily for changes.",
  },
  {
    level: "Medium",
    color: "bg-amber-100 dark:bg-amber-900/30",
    borderColor: "border-amber-300 dark:border-amber-700",
    textColor: "text-amber-900 dark:text-amber-100",
    action: "Some warning signs found. Watch closely. Give rest, clean space, extra water. Call vet if no improvement by tomorrow.",
  },
  {
    level: "High",
    color: "bg-orange-100 dark:bg-orange-900/30",
    borderColor: "border-orange-300 dark:border-orange-700",
    textColor: "text-orange-900 dark:text-orange-100",
    action: "Serious signs detected. Act now. Isolate the cow, reduce stress, give clean space. Contact vet today.",
  },
  {
    level: "Critical",
    color: "bg-red-100 dark:bg-red-900/30",
    borderColor: "border-red-300 dark:border-red-700",
    textColor: "text-red-900 dark:text-red-100",
    action: "Emergency stage. Separate cow from herd immediately. Call vet RIGHT NOW.",
  },
];

const diseases = [
  {
    name: "Mastitis",
    signs: "Swollen, hot, red udder. Clots or blood in milk. Cow walks slowly or is uncomfortable.",
  },
  {
    name: "Foot and Mouth Disease (FMD)",
    signs: "Fever, drooling, mouth sores or blisters. Limp or painful feet.",
  },
  {
    name: "Lumpy Skin Disease",
    signs: "Bumps or lumps on skin. Fever. Loss of appetite. Swollen eyes or joints.",
  },
  {
    name: "Milk Fever",
    signs: "After calving: weakness, staggering, low temperature. Reluctant to stand or eat.",
  },
];

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

const steps = [
  {
    icon: Eye,
    title: "Observe",
    text: "Look for swelling, heat, redness or pain in the udder.",
    color: "from-emerald-400 to-emerald-600",
  },
  {
    icon: Droplet,
    title: "Check Milk",
    text: "Inspect milk for clots, discoloration or blood.",
    color: "from-teal-400 to-teal-600",
  },
  {
    icon: Thermometer,
    title: "Measure",
    text: "Take milk temperature and compare with normal range.",
    color: "from-amber-400 to-amber-600",
  },
  {
    icon: Calendar,
    title: "Record",
    text: "Log daily yields — sudden drops indicate issues.",
    color: "from-indigo-400 to-indigo-600",
  },
  {
    icon: PhoneCall,
    title: "Contact",
    text: "If signs persist, contact your local veterinarian immediately.",
    color: "from-red-400 to-red-600",
  },
];

export default function GuidancePage() {
  const { t } = useI18n();
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    setContacts(Array.isArray(contactsData) ? contactsData : []);
  }, []);

  return (
    <PageWrapper className="space-y-6">
      <PageHeader
        title={t("guidance.title") || "Farmer Guidance"}
        subtitle={t("guidance.subtitle") || "Quick steps to check your cow and when to contact a veterinarian."}
      />

      {/* How to Use App */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">How to Use CattleSense</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {appGuidance.map((item, i) => {
            const Icon = item.icon;
            return (
              <motion.div key={i} variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: i * 0.05 }}>
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors bg-white dark:bg-slate-900">
                  <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${item.color} flex items-center justify-center mb-3 text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{item.title}</div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">{item.text}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Disease Signs */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">Common Disease Signs to Watch For</h2>
        <div className="space-y-3">
          {diseases.map((disease, i) => (
            <motion.div key={i} variants={itemVariants} initial="hidden" animate="visible" transition={{ delay: i * 0.05 }}>
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className="font-semibold text-slate-900 dark:text-slate-100 mb-2">{disease.name}</div>
                <div className="text-sm text-slate-700 dark:text-slate-300">Signs: {disease.signs}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </Card>

      {/* Mastitis Quick Check */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">{t("Quick Checks") || "Quick Mastitis Checks"}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <div className={`h-12 w-12 rounded-lg bg-gradient-to-r ${s.color} flex items-center justify-center mb-3 text-white`}> 
                  <Icon className="h-6 w-6" />
                </div>
                <div className="font-semibold text-slate-900 dark:text-slate-100">{s.title}</div>
                <div className="text-sm text-slate-700 dark:text-slate-300">{s.text}</div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4 text-slate-900 dark:text-slate-100">{t("Emergency Contacts") || "Emergency Veterinary Contacts (Sri Lanka)"}</h2>

        {contacts.length === 0 ? (
          <p className="text-slate-600 dark:text-slate-400">No emergency contacts available. Please contact your local veterinary office.</p>
        ) : (
          <div className="space-y-3">
            {contacts.map((c, idx) => (
              <div key={idx} className="p-3 border rounded-lg bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700">
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{c.name}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">{c.location}</div>
                  <div className="text-sm text-slate-700 dark:text-slate-300">{c.phone}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </PageWrapper>
  );
}
