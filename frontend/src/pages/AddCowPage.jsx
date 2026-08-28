import { useState, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Tag,
  Calendar,
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  PlusCircle,
  HelpCircle,
  Clock,
  MapPin,
  Sparkles,
} from "lucide-react";
import PageWrapper, { PageHeader } from "../components/PageWrapper";
import { Card, Button, Input, Badge } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import { addCow } from "../services/api";

export const CATTLE_BREEDS = [
  "Friesian (Holstein)",
  "Jersey",
  "Ayrshire",
  "Sahiwal",
  "Sindhi (Red Sindhi)",
  "Girolando",
  "Crossbred",
  "Indigenous / Local (Lanka Cattle)",
  "Other",
];

export const CATTLE_SOURCES = [
  "Born on Farm",
  "Purchased",
  "Other",
];

export function calculateAgeDisplay(dobString) {
  if (!dobString) return null;
  const dob = new Date(dobString);
  const today = new Date();
  if (isNaN(dob.getTime()) || dob > today) return null;

  let years = today.getFullYear() - dob.getFullYear();
  let months = today.getMonth() - dob.getMonth();
  let days = today.getDate() - dob.getDate();

  if (days < 0) {
    months -= 1;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (years === 0 && months === 0) {
    return "Less than 1 month old";
  }
  if (years === 0) {
    return `${months} month${months > 1 ? "s" : ""} old`;
  }
  if (months === 0) {
    return `${years} year${years > 1 ? "s" : ""} old`;
  }
  return `${years} yr${years > 1 ? "s" : ""}, ${months} mo${months > 1 ? "s" : ""} (${years} years)`;
}

export function calculateCompletedYears(dobString) {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const today = new Date();
  if (isNaN(dob.getTime()) || dob > today) return 0;
  let years = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    years--;
  }
  return Math.max(0, years);
}

export function AddCowForm({ onSuccess, onCancel }) {
  const { t } = useI18n();
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [formData, setFormData] = useState({
    tag_id: "",
    name: "",
    breed: "",
    date_of_birth: "",
    gender: "Female",
    lactation_count: "",
    current_lactation: "",
    date_acquired: "",
    source: "",
    source_details: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const calculatedAge = useMemo(
    () => calculateAgeDisplay(formData.date_of_birth),
    [formData.date_of_birth]
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "source" && value !== "Other") {
        updated.source_details = "";
      }
      return updated;
    });

    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: "" }));
    }
    if (serverError) {
      setServerError("");
    }
  };

  const validate = () => {
    const errors = {};

    // 1. Cow ID / Tag Number (Required)
    if (!formData.tag_id.trim()) {
      errors.tag_id = "Cow ID / Tag Number is required";
    }

    // 2. Date of Birth (Required)
    if (!formData.date_of_birth) {
      errors.date_of_birth = "Date of Birth is required";
    } else {
      const dobDate = new Date(formData.date_of_birth);
      const today = new Date();
      if (dobDate > today) {
        errors.date_of_birth = "Date of Birth cannot be in the future";
      }
    }

    // 3. Gender (Required)
    if (!formData.gender || !["Female", "Male"].includes(formData.gender)) {
      errors.gender = "Please select Gender (Female or Male)";
    }

    // 4. Number of Lactations (Optional, ≥ 0)
    let totalLactations = null;
    if (formData.lactation_count !== "") {
      const num = Number(formData.lactation_count);
      if (isNaN(num) || num < 0 || !Number.isInteger(num)) {
        errors.lactation_count = "Number of Lactations must be a non-negative whole number (≥ 0)";
      } else {
        totalLactations = num;
      }
    }

    // 5. Current Lactation Number (Optional, ≥ 1)
    let currentLactation = null;
    if (formData.current_lactation !== "") {
      const num = Number(formData.current_lactation);
      if (isNaN(num) || num < 1 || !Number.isInteger(num)) {
        errors.current_lactation = "Current Lactation Number must be a positive whole number (≥ 1)";
      } else {
        currentLactation = num;
      }
    }

    // Consistency Check
    if (totalLactations !== null && currentLactation !== null) {
      if (currentLactation > totalLactations) {
        errors.current_lactation = `Current Lactation (${currentLactation}) cannot exceed Total Lactations (${totalLactations})`;
      }
    }

    // 6. Date Acquired (Optional, ≤ today)
    if (formData.date_acquired) {
      const acqDate = new Date(formData.date_acquired);
      const today = new Date();
      if (acqDate > today) {
        errors.date_acquired = "Date Acquired cannot be in the future";
      }
    }

    // 7. Source & Specify Source (Required if Source == 'Other')
    if (formData.source === "Other" && !formData.source_details.trim()) {
      errors.source_details = "Please specify the source";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = validate();

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstError = Object.values(errors)[0];
      setServerError(firstError);
      showError(firstError);
      return;
    }

    setFieldErrors({});
    setServerError("");
    setIsLoading(true);

    try {
      const completedAge = calculateCompletedYears(formData.date_of_birth);

      const payload = {
        tag_id: formData.tag_id.trim(),
        name: formData.name.trim() || formData.tag_id.trim(),
        breed: formData.breed.trim() || "Other",
        date_of_birth: formData.date_of_birth,
        age: completedAge,
        gender: formData.gender,
        lactation_count: formData.lactation_count !== "" ? parseInt(formData.lactation_count, 10) : 0,
        current_lactation: formData.current_lactation !== "" ? parseInt(formData.current_lactation, 10) : undefined,
        date_acquired: formData.date_acquired || undefined,
        source: formData.source || undefined,
        source_details: formData.source === "Other" ? formData.source_details.trim() : undefined,
      };

      const res = await addCow(payload);
      showSuccess(res.message || `Cow '${formData.tag_id}' registered successfully!`);

      if (onSuccess) {
        onSuccess(res.cow);
      } else {
        navigate("/cows");
      }
    } catch (err) {
      const errorMsg = err.message || "Failed to register cow. Please verify details.";
      setServerError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Server Error Alert */}
      {serverError && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs sm:text-sm font-medium flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </motion.div>
      )}

      {/* ── Section 1: Cow Details ─────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <Tag className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {t("auth.personalDetails") ? t("auth.personalDetails").replace("Personal", "Cow") : "1. Cow Details"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Cow ID / Tag Number (Required) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("cowManagement.tagId") || "Ear Tag ID / Number"} <span className="text-emerald-600 dark:text-emerald-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                name="tag_id"
                required
                value={formData.tag_id}
                onChange={handleChange}
                placeholder={t("cowManagement.tagIdPlaceholder") || "e.g. COW-001 or EAR-842"}
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border ${
                  fieldErrors.tag_id
                    ? "border-red-400 focus:ring-red-400"
                    : "border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
              />
            </div>
            {fieldErrors.tag_id && (
              <p className="text-[11px] text-red-500 mt-1">{fieldErrors.tag_id}</p>
            )}
          </div>

          {/* Cow Name (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("cowManagement.name") || "Cow Name"} <span className="text-slate-400 font-normal">({t("common.optional") || "Optional"})</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder={t("cowManagement.namePlaceholder") || "e.g. Daisy, Bella"}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Breed (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("cowManagement.breed") || "Breed"} <span className="text-slate-400 font-normal">({t("common.optional") || "Optional"})</span>
            </label>
            <select
              name="breed"
              value={formData.breed}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t("cowManagement.selectBreed") || "Select Breed (Optional)"}</option>
              {CATTLE_BREEDS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Gender (Required) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("cowManagement.gender") || "Gender"} <span className="text-emerald-600 dark:text-emerald-400">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {["Female", "Male"].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => ({ ...prev, gender: g }));
                    if (fieldErrors.gender) {
                      setFieldErrors((prev) => ({ ...prev, gender: "" }));
                    }
                  }}
                  className={`py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl border transition-all ${
                    formData.gender === g
                      ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300 shadow-xs"
                      : "border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  {g === "Female" ? `♀ ${t("cowCard.female") || "Female (Cow)"}` : `♂ ${t("cowCard.male") || "Male (Bull)"}`}
                </button>
              ))}
            </div>
            {fieldErrors.gender && (
              <p className="text-[11px] text-red-500 mt-1">{fieldErrors.gender}</p>
            )}
          </div>

          {/* Date of Birth / Age (Required) */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("cowManagement.dateOfBirth") || "Date of Birth"} <span className="text-emerald-600 dark:text-emerald-400">*</span>
            </label>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="date"
                  name="date_of_birth"
                  required
                  max={todayStr}
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border ${
                    fieldErrors.date_of_birth
                      ? "border-red-400 focus:ring-red-400"
                      : "border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
                  } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
                />
              </div>

              {/* Dynamic Age Preview Chip */}
              {calculatedAge && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-semibold shrink-0"
                >
                  <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t("cowManagement.age") || "Age"}: {calculatedAge}</span>
                </motion.div>
              )}
            </div>
            {fieldErrors.date_of_birth && (
              <p className="text-[11px] text-red-500 mt-1">{fieldErrors.date_of_birth}</p>
            )}
          </div>

          {/* Number of Lactations (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("cowManagement.lactationCount") || "Total Lactations"} <span className="text-slate-400 font-normal">({t("common.optional") || "Optional"})</span>
            </label>
            <input
              type="number"
              min="0"
              step="1"
              name="lactation_count"
              value={formData.lactation_count}
              onChange={handleChange}
              placeholder="e.g. 2"
              className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border ${
                fieldErrors.lactation_count
                  ? "border-red-400 focus:ring-red-400"
                  : "border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
              } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
            />
            {fieldErrors.lactation_count && (
              <p className="text-[11px] text-red-500 mt-1">{fieldErrors.lactation_count}</p>
            )}
          </div>

          {/* Current Lactation Number (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("cowManagement.currentLactation") || "Current Lactation"} <span className="text-slate-400 font-normal">({t("common.optional") || "Optional"})</span>
            </label>
            <input
              type="number"
              min="1"
              step="1"
              name="current_lactation"
              value={formData.current_lactation}
              onChange={handleChange}
              placeholder="e.g. 2"
              className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border ${
                fieldErrors.current_lactation
                  ? "border-red-400 focus:ring-red-400"
                  : "border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
              } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
            />
            {fieldErrors.current_lactation && (
              <p className="text-[11px] text-red-500 mt-1">{fieldErrors.current_lactation}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 2: Farm Details ────────────────────────────────────── */}
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
          <MapPin className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            {t("auth.farmDetails") || "2. Farm Details"}
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Date Acquired (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("cowManagement.dateAcquired") || "Date Acquired"} <span className="text-slate-400 font-normal">({t("common.optional") || "Optional"})</span>
            </label>
            <input
              type="date"
              name="date_acquired"
              max={todayStr}
              value={formData.date_acquired}
              onChange={handleChange}
              className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border ${
                fieldErrors.date_acquired
                  ? "border-red-400 focus:ring-red-400"
                  : "border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
              } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
            />
          </div>

          {/* Source (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t("cowManagement.source") || "Source / Origin"} <span className="text-slate-400 font-normal">({t("common.optional") || "Optional"})</span>
            </label>
            <select
              name="source"
              value={formData.source}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t("cowManagement.source") || "Select Origin Source"}</option>
              {CATTLE_SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Specify Source (Required only when Source = 'Other') */}
          {formData.source === "Other" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="sm:col-span-2"
            >
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t("cowManagement.sourceDetails") || "Specify Source"} <span className="text-emerald-600 dark:text-emerald-400">*</span>
              </label>
              <input
                type="text"
                name="source_details"
                required
                value={formData.source_details}
                onChange={handleChange}
                placeholder="e.g. Government subsidy, gifted"
                className={`w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-xl border ${
                  fieldErrors.source_details
                    ? "border-red-400 focus:ring-red-400"
                    : "border-slate-300 dark:border-slate-700 focus:ring-emerald-500"
                } bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2`}
              />
              {fieldErrors.source_details && (
                <p className="text-[11px] text-red-500 mt-1">{fieldErrors.source_details}</p>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── Form Actions ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="px-5 py-2.5 text-xs sm:text-sm"
          >
            {t("common.cancel") || "Cancel"}
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          disabled={isLoading}
          isLoading={isLoading}
          className="px-6 py-2.5 text-xs sm:text-sm gap-2"
        >
          <PlusCircle className="h-4 w-4" />
          <span>{isLoading ? (t("common.saving") || "Saving...") : (t("cowManagement.addCowButton") || "Register Cow")}</span>
        </Button>
      </div>
    </form>
  );
}

export default function AddCowPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  return (
    <PageWrapper className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link
            to="/cows"
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t("cowManagement.addCow") || "Register New Cow"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              {t("cowManagement.subtitle") || "Add cattle identification, birth information, and herd profile details."}
            </p>
          </div>
        </div>
      </div>

      {/* Card container */}
      <Card className="p-6 sm:p-8">
        <AddCowForm
          onSuccess={() => navigate("/cows")}
          onCancel={() => navigate("/cows")}
        />
      </Card>
    </PageWrapper>
  );
}
