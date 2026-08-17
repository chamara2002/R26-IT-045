import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Stethoscope,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  FileText,
  User,
  ShieldCheck,
  Edit2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Badge, Button, Card } from "./ui/index.jsx";
import { createCowVeterinaryFollowUp, updateVeterinaryFollowUp } from "../services/api";
import { useToast } from "../hooks/useToast";
import { useI18n } from "../i18n/language-context";

const FOLLOW_UP_STATUSES = [
  "Pending",
  "Vet Contacted",
  "Vet Visit Completed",
  "Under Treatment",
  "Follow-up Required",
  "Resolved",
];

const DIAGNOSTIC_OPTIONS = [
  "Clinical examination",
  "California Mastitis Test (CMT)",
  "Milk culture & sensitivity",
  "Somatic cell count (SCC) laboratory test",
  "Other diagnostic test",
];

export default function VeterinaryFollowUpTracker({
  cowId,
  cowName,
  followUps = [],
  onFollowUpUpdated,
}) {
  const { t } = useI18n();
  const { showSuccess, showError } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    status: "Vet Contacted",
    visit_date: new Date().toISOString().split("T")[0],
    veterinarian_name: "",
    registration_number: "",
    diagnosis: "",
    diagnostic_tests: ["Clinical examination"],
    treatment_plan: "",
    follow_up_date: "",
    notes: "",
  });

  const openCreateModal = () => {
    setEditingFollowUp(null);
    setFormData({
      status: "Vet Contacted",
      visit_date: new Date().toISOString().split("T")[0],
      veterinarian_name: "",
      registration_number: "",
      diagnosis: "",
      diagnostic_tests: ["Clinical examination"],
      treatment_plan: "",
      follow_up_date: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const openEditModal = (fu) => {
    setEditingFollowUp(fu);
    setFormData({
      status: fu.status || "Pending",
      visit_date: fu.visit_date || "",
      veterinarian_name: fu.veterinarian_name || "",
      registration_number: fu.registration_number || "",
      diagnosis: fu.diagnosis || "",
      diagnostic_tests: fu.diagnostic_tests || [],
      treatment_plan: fu.treatment_plan || "",
      follow_up_date: fu.follow_up_date || "",
      notes: fu.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (editingFollowUp) {
        await updateVeterinaryFollowUp(editingFollowUp.id, formData);
        showSuccess(t("followUp.updateSuccess") || "Veterinary follow-up record updated successfully!");
      } else {
        await createCowVeterinaryFollowUp(cowId, formData);
        showSuccess(t("followUp.createSuccess") || "Veterinary follow-up record created successfully!");
      }
      setIsModalOpen(false);
      if (onFollowUpUpdated) {
        onFollowUpUpdated();
      }
    } catch (err) {
      showError(err.message || "Failed to save veterinary follow-up");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestToggle = (testName) => {
    setFormData((prev) => {
      const exists = prev.diagnostic_tests.includes(testName);
      return {
        ...prev,
        diagnostic_tests: exists
          ? prev.diagnostic_tests.filter((t) => t !== testName)
          : [...prev.diagnostic_tests, testName],
      };
    });
  };

  // Find any overdue follow-up
  const overdueItem = followUps.find((fu) => fu.is_overdue);
  const dueSoonItem = followUps.find((fu) => fu.is_due_soon && !fu.is_overdue);

  return (
    <Card className="p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-purple-100 dark:bg-purple-950/60 flex items-center justify-center text-purple-700 dark:text-purple-300 font-bold">
              <Stethoscope className="h-4 w-4" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {t("followUp.title") || "Veterinary Follow-Up & Clinical Handover"}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("followUp.subtitle") || `Track veterinary visits, diagnostic findings, treatment notes, and scheduled re-examinations for ${cowName || "this cow"}.`}
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreateModal}
          className="text-xs sm:text-sm font-semibold gap-1.5 self-start sm:self-auto"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{t("followUp.addRecord") || "Log Vet Visit"}</span>
        </Button>
      </div>

      {/* Overdue Reminder Banner */}
      {overdueItem && (
        <div className="rounded-2xl p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-red-900 dark:text-red-200">
              {t("followUp.overdueTitle") || "⚠️ Veterinary Follow-up Overdue"}
            </h4>
            <p className="text-xs text-red-800 dark:text-red-300">
              {t("followUp.overdueDesc") || `Scheduled re-examination date (${overdueItem.follow_up_date}) has passed. Please confirm clinical recovery or schedule a follow-up visit with your veterinarian.`}
            </p>
          </div>
        </div>
      )}

      {dueSoonItem && !overdueItem && (
        <div className="rounded-2xl p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex items-start gap-3">
          <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
              {t("followUp.dueSoonTitle") || "🩺 Veterinary Follow-up Due Soon"}
            </h4>
            <p className="text-xs text-amber-800 dark:text-amber-300">
              {t("followUp.dueSoonDesc") || `Scheduled follow-up date is approaching on ${dueSoonItem.follow_up_date}.`}
            </p>
          </div>
        </div>
      )}

      {/* Follow-up Timeline List */}
      {followUps.length === 0 ? (
        <div className="text-center py-6 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/40 dark:bg-slate-900/20 p-6 space-y-2">
          <Stethoscope className="h-8 w-8 text-slate-400 mx-auto" />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            {t("followUp.noRecords") || "No veterinary follow-up records logged yet"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
            {t("followUp.noRecordsDesc") || "When a veterinarian examines or treats this cow following a mastitis alert, log their clinical findings and next appointment date here."}
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={openCreateModal}
            className="mt-2 text-xs font-semibold"
          >
            {t("followUp.logFirst") || "Log First Vet Visit"}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {followUps.map((fu) => {
            const isResolved = fu.status === "Resolved";
            const isUnderTreatment = fu.status === "Under Treatment";

            return (
              <div
                key={fu.id}
                className={`rounded-2xl border p-4 sm:p-5 space-y-3 transition-all ${
                  isResolved
                    ? "border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/30 dark:bg-emerald-950/10"
                    : isUnderTreatment
                    ? "border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/10"
                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isResolved
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : isUnderTreatment
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300"
                      }`}
                    >
                      {fu.status}
                    </span>
                    {fu.visit_date && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {fu.visit_date}
                      </span>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditModal(fu)}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-800 self-end sm:self-auto gap-1"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>{t("common.edit") || "Update Status"}</span>
                  </Button>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {fu.veterinarian_name && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {t("followUp.veterinarian") || "Veterinarian"}:
                      </span>
                      <strong className="ml-1 text-slate-800 dark:text-slate-200">
                        {fu.veterinarian_name} {fu.registration_number ? `(${fu.registration_number})` : ""}
                      </strong>
                    </div>
                  )}

                  {fu.follow_up_date && (
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {t("followUp.followUpDue") || "Re-examination Date"}:
                      </span>
                      <strong className={`ml-1 ${fu.is_overdue ? "text-red-600 font-bold" : "text-slate-800 dark:text-slate-200"}`}>
                        {fu.follow_up_date} {fu.is_overdue ? "(Overdue)" : ""}
                      </strong>
                    </div>
                  )}

                  {fu.diagnosis && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {t("followUp.diagnosis") || "Clinical Diagnosis"}:
                      </span>
                      <p className="mt-0.5 text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                        {fu.diagnosis}
                      </p>
                    </div>
                  )}

                  {fu.diagnostic_tests?.length > 0 && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">
                        {t("followUp.testsConducted") || "Diagnostic Tests"}:
                      </span>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {fu.diagnostic_tests.map((test) => (
                          <span
                            key={test}
                            className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-medium"
                          >
                            ✓ {test}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {fu.treatment_plan && (
                    <div className="sm:col-span-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                        {t("followUp.treatmentPlan") || "Veterinarian Prescribed Management"}
                      </span>
                      <p className="mt-1 text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                        {fu.treatment_plan}
                      </p>
                    </div>
                  )}

                  {fu.notes && (
                    <div className="sm:col-span-2">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">{t("followUp.notes") || "Farmer Observations"}:</span>
                      <p className="mt-0.5 text-slate-700 dark:text-slate-300 italic">{fu.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Log / Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Stethoscope className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingFollowUp ? (t("followUp.editModalTitle") || "Update Veterinary Follow-up") : (t("followUp.newModalTitle") || "Log Veterinary Clinical Visit")}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Status Dropdown */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("followUp.status") || "Follow-up Status"} *
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  >
                    {FOLLOW_UP_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Visit Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t("followUp.visitDate") || "Visit Date"}
                    </label>
                    <input
                      type="date"
                      value={formData.visit_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, visit_date: e.target.value }))}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Scheduled Follow-up Date */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t("followUp.nextDate") || "Next Follow-up Due Date"}
                    </label>
                    <input
                      type="date"
                      value={formData.follow_up_date}
                      onChange={(e) => setFormData((prev) => ({ ...prev, follow_up_date: e.target.value }))}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* Veterinarian Name */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t("followUp.vetName") || "Veterinarian Name"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Dr. Bandara"
                      value={formData.veterinarian_name}
                      onChange={(e) => setFormData((prev) => ({ ...prev, veterinarian_name: e.target.value }))}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>

                  {/* License / Reg Number */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {t("followUp.regNumber") || "Vet License / Reg Number"}
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. VET-SL-4821"
                      value={formData.registration_number}
                      onChange={(e) => setFormData((prev) => ({ ...prev, registration_number: e.target.value }))}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Diagnostic Tests Checklist */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("followUp.diagnosticTests") || "Diagnostic Procedures Conducted"}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {DIAGNOSTIC_OPTIONS.map((test) => (
                      <label
                        key={test}
                        className="flex items-center gap-2 p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs"
                      >
                        <input
                          type="checkbox"
                          checked={formData.diagnostic_tests.includes(test)}
                          onChange={() => handleTestToggle(test)}
                          className="accent-purple-600 rounded"
                        />
                        <span className="text-slate-700 dark:text-slate-300">{test}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Clinical Diagnosis */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("followUp.diagnosis") || "Clinical Diagnosis"}
                  </label>
                  <textarea
                    rows="2"
                    placeholder="e.g. Subclinical / Clinical Mastitis in Right Fore Quarter"
                    value={formData.diagnosis}
                    onChange={(e) => setFormData((prev) => ({ ...prev, diagnosis: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                {/* Treatment / Management Plan */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("followUp.treatmentPlan") || "Veterinarian Treatment & Management Instructions"}
                  </label>
                  <textarea
                    rows="2"
                    placeholder="Record prescribed treatment, supportive care, or quarantine instructions as given by veterinarian..."
                    value={formData.treatment_plan}
                    onChange={(e) => setFormData((prev) => ({ ...prev, treatment_plan: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    * Record only instructions explicitly provided by a qualified veterinarian.
                  </p>
                </div>

                {/* Additional Notes */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {t("followUp.notes") || "Additional Farmer Observations"}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Appetite recovered, milking returned to normal..."
                    value={formData.notes}
                    onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                    disabled={isSubmitting}
                  >
                    {t("common.cancel") || "Cancel"}
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    disabled={isSubmitting}
                    isLoading={isSubmitting}
                  >
                    {editingFollowUp ? (t("common.update") || "Update Record") : (t("followUp.saveRecord") || "Save Follow-up")}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Card>
  );
}
