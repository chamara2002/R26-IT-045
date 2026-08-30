import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShieldAlert, CheckCircle } from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Alert, Input } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import FMDWeatherDashboard from "../components/FMDWeatherDashboard";
import FMDResultCard from "../components/FMDResultCard";
import {
  MODULE_META,
  DiseaseInfoPanel,
  CowSelector,
  ImageUpload,
  SectionHeader,
  CheckboxGrid,
} from "../components/detection/DetectionShared";
import { getCows, predictFMDAssisted } from "../services/api";

export default function FMDDetectionPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const cowIdFromQuery = searchParams.get("cowId") || searchParams.get("cow_id") || "";

  const meta = MODULE_META.fmd;

  const [cows, setCows] = useState([]);
  const [resultCowId, setResultCowId] = useState(cowIdFromQuery);
  const [form, setForm] = useState({
    cowId: cowIdFromQuery,
    image: null,
    // FMD Symptoms
    lesionsInMouth: false,
    lesionsOnHooves: false,
    excessiveDrooling: false,
    highFever: false,
    lamenessOrLimping: false,
    reducedFeedIntake: false,
    reluctanceToWalk: false,
    milkDropInDairy: false,
    bodyTemperature: "",
    lesionLocation: "",
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
      setError("");
      setResult(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.image) {
      setError(t("detection.uploadClearPhoto") || "Please provide an image of the mouth or hoof lesions");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const formData = new FormData();
      formData.append("image", form.image);
      if (form.cowId) formData.append("cow_id", form.cowId);

      // Attach farmer ID for localized weather transmission analysis
      try {
        const stored = JSON.parse(localStorage.getItem("cattlesense_user") || "null");
        if (stored?.id) {
          formData.append("farmer_id", String(stored.id));
        }
      } catch {
        // Fallback
      }

      // Symptoms
      if (form.lesionsInMouth) formData.append("lesions_in_mouth", "true");
      if (form.lesionsOnHooves) formData.append("lesions_on_hooves", "true");
      if (form.excessiveDrooling) formData.append("excessive_drooling", "true");
      if (form.highFever) formData.append("high_fever", "true");
      if (form.lamenessOrLimping) formData.append("lameness_or_limping", "true");
      if (form.reducedFeedIntake) formData.append("reduced_feed_intake", "true");
      if (form.reluctanceToWalk) formData.append("reluctance_to_walk", "true");
      if (form.milkDropInDairy) formData.append("milk_drop_in_dairy", "true");
      if (form.bodyTemperature) formData.append("body_temperature", form.bodyTemperature);
      if (form.lesionLocation) formData.append("lesion_location", form.lesionLocation);

      const response = await predictFMDAssisted(formData);
      const resData = response?.data || response;
      if (form.cowId && !resData.cow_id) {
        resData.cow_id = form.cowId;
      }
      setResult(resData);
      setResultCowId(form.cowId);
      showSuccess(t("detection.fmdComplete") || "FMD assessment completed successfully");

      // Clear filled form automatically
      setForm({
        cowId: "",
        image: null,
        lesionsInMouth: false,
        lesionsOnHooves: false,
        excessiveDrooling: false,
        highFever: false,
        lamenessOrLimping: false,
        reducedFeedIntake: false,
        reluctanceToWalk: false,
        milkDropInDairy: false,
        bodyTemperature: "",
        lesionLocation: "",
      });
      setImagePreview(null);
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
    <PageWrapper className="space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/modules"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t("modules.backToModules") || "Disease Modules"}</span>
        </Link>
        <span className="text-[11px] font-mono text-orange-600 dark:text-orange-400 font-bold">
          FMD & Weather Risk AI
        </span>
      </div>

      {/* Disease Info Banner */}
      <DiseaseInfoPanel meta={meta} />

      {/* Regional FMD Microclimate Weather Risk Alert */}
      <FMDWeatherDashboard color={meta.color} />

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
            <Alert
              variant="warning"
              title={t("detectionForms.fmdPhotoScopeTitle") || "Mouth/tongue or hooves only"}
              message={
                t("detectionForms.fmdPhotoScopeMessage") ||
                "This tool only reads photos of the mouth/tongue or hooves. Photos of the udder, teats, or any other body part are outside its training and will not give a reliable result — please retake with the correct body part in frame."
              }
              className="mb-3"
            />
            <ImageUpload
              id="fmd-photo-upload"
              imagePreview={imagePreview}
              onFileChange={handleFileChange}
              title={t("detectionForms.uploadFMDPhoto") || "Mouth or Hoof Photograph"}
              helperText={t("detectionForms.uploadFMDSubtitle") || "Clear photo of blisters, tongue, or hooves (PNG, JPG)"}
              cameraLabel={t("detectionForms.takeMouthHoofPhoto") || "Take Mouth or Hoof Photo"}
              uploadLabel={t("detectionForms.uploadMouthHoofPhoto") || "Upload Mouth or Hoof Photo"}
              cameraSubtitle={t("detectionForms.liveCamera") || "Live camera capture"}
              uploadSubtitle={t("detectionForms.fromGallery") || "From storage / gallery"}
            />

            {/* Clinical Symptoms */}
            <div className="space-y-3 pt-2">
              <SectionHeader
                label={t("detectionForms.fmdClinicalSymptoms") || "Clinical Symptoms Checklist"}
                optional
              />
              <CheckboxGrid
                items={[
                  ["lesionsInMouth", t("detectionForms.lesionsInMouth") || "Blisters / ulcers in mouth or tongue"],
                  ["lesionsOnHooves", t("detectionForms.lesionsOnHooves") || "Lesions or sores between hooves"],
                  ["excessiveDrooling", t("detectionForms.excessiveDrooling") || "Excessive ropy drooling / salivation"],
                  ["highFever", t("detectionForms.highFever") || "High fever (≥ 40°C / 104°F)"],
                  ["lamenessOrLimping", t("detectionForms.lamenessOrLimping") || "Severe lameness / limping"],
                  ["reluctanceToWalk", t("detectionForms.reluctanceToWalk") || "Reluctance to stand or walk"],
                  ["milkDropInDairy", t("detectionForms.milkDropInDairy") || "Sudden sharp drop in milk yield"],
                  ["reducedFeedIntake", t("detectionForms.reducedFeedIntake") || "Loss of appetite / unable to chew"],
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
                  label={t("detection.temperature") || t("detectionForms.bodyTemperatureC") || "Body Temperature (°C)"}
                  type="number"
                  step="0.1"
                  name="bodyTemperature"
                  value={form.bodyTemperature}
                  onChange={handleChange}
                  placeholder="e.g. 40.5"
                />
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {t("detectionForms.primaryLesionLocation") || "Lesion Location"}
                  </label>
                  <select
                    name="lesionLocation"
                    value={form.lesionLocation}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">{t("detectionForms.selectLocation") || "Select location…"}</option>
                    <option value="mouth_only">{t("detectionForms.mouthOnly") || "Mouth / Tongue only"}</option>
                    <option value="hooves_only">{t("detectionForms.hoovesOnly") || "Hooves / Feet only"}</option>
                    <option value="both">{t("detectionForms.bothMouthFeet") || "Both mouth and hooves"}</option>
                    <option value="multiple">{t("detectionForms.multipleRegions") || "Multiple locations"}</option>
                  </select>
                </div>
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
                className="w-full gap-2 text-xs sm:text-sm font-bold py-3 rounded-xl shadow-xs bg-orange-600 hover:bg-orange-700"
                size="lg"
              >
                {isSubmitting ? (
                  <span>{t("detection.processingAi") || "Analyzing Lesions & Weather Transmission…"}</span>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>{t("detection.runFMDCheck") || "Run FMD Diagnostic Check"}</span>
                  </>
                )}
              </Button>

              {!form.image && (
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                  {t("detection.uploadClearPhoto") || "Upload a mouth or hoof photograph above to run the analysis"}
                </p>
              )}
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Results Display */}
      {result && (
        <FMDResultCard
          result={result}
          cowId={resultCowId}
          cows={cows}
          onCowSelect={(id) => setResultCowId(id)}
          onReset={() => setResult(null)}
        />
      )}
    </PageWrapper>
  );
}
