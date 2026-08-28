import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ShieldCheck,
  FileText,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Search,
  BookOpen,
  Scale,
  Sparkles,
} from "lucide-react";
import { useI18n } from "../i18n/language-context";
import { TERMS_OF_SERVICE_DATA, PRIVACY_POLICY_DATA } from "../data/legalContent";

export default function LegalModal({
  isOpen,
  onClose,
  initialTab = "terms", // "terms" | "privacy"
  onAccept,
}) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const contentRef = useRef(null);

  // Sync initialTab when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab || "terms");
      setSearchQuery("");
      if (contentRef.current) {
        contentRef.current.scrollTop = 0;
      }
    }
  }, [isOpen, initialTab]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const currentData = activeTab === "terms" ? TERMS_OF_SERVICE_DATA : PRIVACY_POLICY_DATA;

  // Filter sections based on search query
  const filteredSections = currentData.sections.filter((sec) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = sec.title.toLowerCase().includes(q);
    const badgeMatch = sec.badge?.toLowerCase().includes(q);
    const contentMatch = sec.content.some((c) => c.toLowerCase().includes(q));
    return titleMatch || badgeMatch || contentMatch;
  });

  const handleAccept = () => {
    if (onAccept) {
      onAccept(activeTab);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 overflow-hidden">
        {/* Dark Backdrop with blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-md transition-opacity"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-white/10 overflow-hidden z-10 my-auto max-h-[90vh] flex flex-col"
        >
          {/* Header Banner */}
          <div className="relative bg-gradient-to-r from-emerald-700 via-emerald-800 to-teal-900 px-6 py-5 text-white flex items-center justify-between gap-4 border-b border-emerald-600/40 shrink-0">
            {/* Ambient background glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

            <div className="relative z-10">
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                {activeTab === "terms" ? "Terms of Service" : "Privacy Policy"}
              </h2>
              <p className="text-xs text-emerald-100/90 font-medium">
                CattleSense • Smart Cattle Health Platform
              </p>
            </div>

            {/* Close Button */}
            <div className="relative z-10">
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl bg-black/20 text-white/80 hover:text-white hover:bg-black/40 transition-colors"
                aria-label="Close legal modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Tab Switcher & Search Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/80 px-6 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            {/* Tabs */}
            <div className="flex bg-slate-200 dark:bg-slate-900/80 p-1 rounded-xl w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("terms");
                  setSearchQuery("");
                  if (contentRef.current) contentRef.current.scrollTop = 0;
                }}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "terms"
                    ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <FileText className="h-4 w-4" />
                <span>Terms of Service</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab("privacy");
                  setSearchQuery("");
                  if (contentRef.current) contentRef.current.scrollTop = 0;
                }}
                className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === "privacy"
                    ? "bg-white dark:bg-slate-800 text-emerald-700 dark:text-emerald-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Privacy Policy</span>
              </button>
            </div>

            {/* In-Modal Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search clauses (e.g. AI, data)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Quick Section Pills Bar */}
          <div className="bg-slate-100/60 dark:bg-slate-800/40 px-6 py-2 border-b border-slate-200/60 dark:border-slate-800/60 overflow-x-auto flex items-center gap-1.5 scrollbar-none text-[11px] shrink-0">
            <span className="text-slate-400 font-semibold uppercase tracking-wider text-[10px] mr-1 shrink-0">
              Jump to:
            </span>
            {currentData.sections.map((sec) => (
              <a
                key={sec.id}
                href={`#section-${sec.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  const el = document.getElementById(`section-${sec.id}`);
                  if (el) {
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
                className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-emerald-700 dark:hover:text-emerald-300 border border-slate-200 dark:border-slate-700/80 font-medium whitespace-nowrap transition-colors"
              >
                {sec.badge || sec.title.split(".")[1]?.trim() || sec.title}
              </a>
            ))}
          </div>

          {/* Main Content Body (Scrollable) */}
          <div
            ref={contentRef}
            className="p-6 sm:p-8 overflow-y-auto flex-1 space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed"
          >
            {/* Metadata Callout */}
            <div className="p-4 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5 text-emerald-900 dark:text-emerald-200 font-medium">
                <BookOpen className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  {activeTab === "terms"
                    ? "Official cattle health platform terms and conditions governing farmer use."
                    : "Comprehensive privacy statement detailing encryption, data ownership, and zero-sale guarantee."}
                </span>
              </div>
              <div className="text-[11px] text-emerald-800/80 dark:text-emerald-400 font-semibold whitespace-nowrap">
                Effective: {currentData.effectiveDate}
              </div>
            </div>

            {/* Sections */}
            {filteredSections.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-semibold">No matching clauses found for "{searchQuery}"</p>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="mt-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Clear search query
                </button>
              </div>
            ) : (
              filteredSections.map((section) => {
                const isHighlight = section.highlight;

                return (
                  <div
                    key={section.id}
                    id={`section-${section.id}`}
                    className={`rounded-2xl p-5 sm:p-6 transition-all ${
                      isHighlight
                        ? "bg-amber-500/10 dark:bg-amber-500/5 border-2 border-amber-500/30 dark:border-amber-500/20"
                        : "bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2">
                        {isHighlight ? (
                          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                        ) : activeTab === "terms" ? (
                          <Scale className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        ) : (
                          <Lock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        )}
                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                          {section.title}
                        </h3>
                      </div>

                      {section.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            isHighlight
                              ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700/60"
                              : "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700/60"
                          }`}
                        >
                          {section.badge}
                        </span>
                      )}
                    </div>

                    <div className="space-y-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                      {section.content.map((paragraph, pIdx) => {
                        const isBullet = paragraph.startsWith("•") || paragraph.startsWith("A.") || paragraph.startsWith("B.") || paragraph.startsWith("C.") || paragraph.startsWith("D.");
                        const isBoldPrefix = paragraph.includes(":");

                        return (
                          <p
                            key={pIdx}
                            className={`${
                              isBullet ? "pl-2 font-medium" : ""
                            } leading-relaxed`}
                          >
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Action Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/90 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
            <div className="text-xs text-slate-500 dark:text-slate-400 text-center sm:text-left">
              By checking the agreement box, you confirm consent to both documents.
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-all"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleAccept}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>I Understand & Accept</span>
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
