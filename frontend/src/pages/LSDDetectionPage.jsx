import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Syringe, CheckCircle, Loader } from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Alert, Input } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import LSDResultCard from "../components/LSDResultCard";
import {
  MODULE_META,
  DiseaseInfoPanel,
  CowSelector,
  ImageUpload,
  SectionHeader,
  CheckboxGrid,
} from "../components/detection/DetectionShared";
import { getCows, predictLSDAssisted } from "../services/api";

export default function LSDDetectionPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const cowIdFromQuery = searchParams.get("cowId") || searchParams.get("cow_id") || "";

  const meta = MODULE_META.lumpy;

  const [cows, setCows] = useState([]);
  const [form, setForm] = useState({
    cowId: cowIdFromQuery,
    image: null,
    // LSD Symptoms
    swollenLymphNodes: false,
    noseDischarge: false,
    eyeDischarge: false,
    reducedMilkProduction: false,
    decreasedAppetite: false,
    highFever: false,
    bodyTemperature: "",
  });

  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    const fetchCows = async () => {
      try {
        const res = await getCows();
        setCows(res?.cows || []);
      } catch {
        // Fallback
      }
    };
    fetchCows();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm((prev) => ({ ...prev, image: file }));
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.image) {
      setError(t("detection.photoRequired") || "Please upload a skin or body photograph");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const formData = new FormData();
      formData.append("image", form.image);
      if (form.cowId) formData.append("cow_id", form.cowId);

      // Symptoms
      if (form.swollenLymphNodes) formData.append("swollen_lymph_nodes", "true");
      if (form.noseDischarge) formData.append("nose_discharge", "true");
      if (form.eyeDischarge) formData.append("eye_discharge", "true");
      if (form.reducedMilkProduction) formData.append("reduced_milk_production", "true");
      if (form.decreasedAppetite) formData.append("decreased_appetite", "true");
      if (form.highFever) formData.append("high_fever", "true");
      if (form.bodyTemperature) formData.append("body_temperature", form.bodyTemperature);

      const response = await predictLSDAssisted(formData);
      setResult(response?.data || response);
      showSuccess(t("detection.assessmentComplete") || "LSD nodule analysis completed");
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
    <PageWrapper className="max-w-3xl mx-auto space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/modules"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t("modules.backToModules") || "Disease Modules"}</span>
        </Link>
        <span className="text-[11px] font-mono text-violet-600 dark:text-violet-400 font-bold">
          Component III • LSD & Nodule Detection AI
        </span>
      </div>

      {/* Disease Info Banner */}
      <DiseaseInfoPanel meta={meta} />

      {/* Main Detection Form Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32 }}
      >
        <Card className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Cow Selector */}
            <CowSelector
              cows={cows}
              value={form.cowId}
              onChange={handleChange}
            />

            {/* Photo Upload */}
            <ImageUpload
              id="lsd-photo-upload"
              imagePreview={imagePreview}
              onFileChange={handleFileChange}
              title={t("detectionForms.lsdPhotoTitle") || "Skin or Body Photograph"}
              helperText="Clear photo showing visible nodules or skin lesions (PNG, JPG)"
            />

            {/* Clinical Symptoms */}
            <div className="space-y-3 pt-2">
              <SectionHeader
                label={t("detectionForms.lsdClinicalSymptoms") || "LSD Clinical Symptoms Checklist"}
                optional
              />
              <CheckboxGrid
                items={[
                  ["swollenLymphNodes", t("detectionForms.swollenLymphNodes") || "Enlarged / swollen superficial lymph nodes"],
                  ["highFever", t("detectionForms.highFever") || "High fever (≥ 40°C / 104°F)"],
                  ["noseDischarge", t("detectionForms.noseDischarge") || "Persistent nasal discharge (mucus or watery)"],
                  ["eyeDischarge", t("detectionForms.eyeDischarge") || "Excessive lacrimation / eye discharge"],
                  ["reducedMilkProduction", t("detectionForms.reducedMilkProduction") || "Sudden drop in daily milk production"],
                  ["decreasedAppetite", t("detectionForms.decreasedAppetite") || "Loss of appetite / general depression"],
                ]}
                values={form}
                onChange={handleChange}
              />
            </div>

            {/* Additional Measurements */}
            <div className="space-y-3 pt-2">
              <SectionHeader
                label={t("detectionForms.additionalMeasurements") || "Additional Measurements"}
                optional
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Body Temperature (°C)"
                  type="number"
                  step="0.1"
                  name="bodyTemperature"
                  value={form.bodyTemperature}
                  onChange={handleChange}
                  placeholder="e.g. 40.2"
                />
              </div>
            </div>

            {error && <Alert variant="error" message={error} />}

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting || !form.image}
                className="w-full gap-2 text-xs sm:text-sm font-bold py-3 rounded-xl shadow-xs bg-violet-600 hover:bg-violet-700"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>{t("detection.processingAi") || "Detecting Nodules & Clinical Severity…"}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>{t("detection.runLSDCheck") || "Run LSD Diagnostic Check"}</span>
                  </>
                )}
              </Button>

              {!form.image && (
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                  {t("detection.uploadClearPhoto") || "Upload a skin or body photograph above to run the analysis"}
                </p>
              )}
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Results Display */}
      {result && <LSDResultCard result={result} />}
    </PageWrapper>
  );
}
