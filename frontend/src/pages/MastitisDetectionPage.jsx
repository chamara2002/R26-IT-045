import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  HeartPulse,
  Crop,
  CheckCircle,
  Loader,
  AlertCircle,
  Sparkles,
  Info,
} from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Alert, Input } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import UdderCropEditor from "../components/UdderCropEditor";
import DetectionResultCard from "../components/DetectionResultCard";
import {
  MODULE_META,
  DiseaseInfoPanel,
  CowSelector,
  SectionHeader,
  CheckboxGrid,
} from "../components/detection/DetectionShared";
import { getCows, predictMastitisAssisted } from "../services/api";

export default function MastitisDetectionPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const cowIdFromQuery = searchParams.get("cowId") || searchParams.get("cow_id") || "";

  const meta = MODULE_META.mastitis;

  const [cows, setCows] = useState([]);
  const [form, setForm] = useState({
    cowId: cowIdFromQuery,
    image: null,
    // 5 Required Model 2 Numerical Features
    milkTemperature: "",
    milkPh: "",
    milkConductivity: "",
    milkYield: "",
    clotting: "0",
    // Optional Clinical Observations
    milkYieldChange: "",
    milkAppearance: "",
    milkClotting: "",
    udderSwelling: "",
    udderWarmth: "",
    udderPain: "",
    bodyTemperature: "",
    appetite: "",
    reducedAppetite: false,
    restlessOrDiscomfort: false,
    kickingDuringMilking: false,
    swollenUdder: false,
    warmOrPainfulUdder: false,
    clotsInMilk: false,
  });

  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Mastitis Udder ROI State
  const [originalImageFile, setOriginalImageFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [croppedImageFile, setCroppedImageFile] = useState(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState(null);
  const [roiCoordinates, setRoiCoordinates] = useState(null);
  const [isCroppingUdder, setIsCroppingUdder] = useState(false);

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
      setOriginalImageFile(file);
      const url = URL.createObjectURL(file);
      setOriginalPreviewUrl(url);
      setImagePreview(url);
      setCroppedImageFile(null);
      setCropPreviewUrl(null);
      setRoiCoordinates(null);
      setIsCroppingUdder(true);
    }
  };

  const handleConfirmUdderCrop = ({ originalFile, croppedFile, croppedPreviewUrl, coordinates }) => {
    setOriginalImageFile(originalFile);
    setCroppedImageFile(croppedFile);
    setCropPreviewUrl(croppedPreviewUrl);
    setRoiCoordinates(coordinates);
    setIsCroppingUdder(false);
    setForm((prev) => ({
      ...prev,
      image: croppedFile,
    }));
    setImagePreview(croppedPreviewUrl);
    showSuccess(t("detectionForms.cropApplied") || "Udder focus region confirmed");
  };

  const handleCancelUdderCrop = () => {
    setIsCroppingUdder(false);
    if (!croppedImageFile && originalImageFile) {
      setForm((prev) => ({ ...prev, image: originalImageFile }));
      setImagePreview(originalPreviewUrl);
    }
  };

  const handleStartUdderCrop = () => {
    if (originalImageFile) {
      setIsCroppingUdder(true);
    }
  };

  const handleRetakeUdderPhoto = () => {
    setImagePreview(null);
    setOriginalImageFile(null);
    setOriginalPreviewUrl(null);
    setCroppedImageFile(null);
    setCropPreviewUrl(null);
    setRoiCoordinates(null);
    setIsCroppingUdder(false);
    setForm((prev) => ({ ...prev, image: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const imageToSend = croppedImageFile || form.image;
    if (!imageToSend) {
      setError(t("detection.photoRequired") || "Please upload an udder photograph");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const formData = new FormData();
      formData.append("image", imageToSend);

      if (form.cowId) formData.append("cow_id", form.cowId);

      // Model 2 Numerical Features
      if (form.milkTemperature !== "") formData.append("milk_temperature", form.milkTemperature);
      if (form.milkPh !== "") formData.append("milk_ph", form.milkPh);
      if (form.milkConductivity !== "") formData.append("milk_conductivity", form.milkConductivity);
      if (form.milkYield !== "") formData.append("milk_yield", form.milkYield);
      if (form.clotting !== "") formData.append("clotting", form.clotting);

      // Optional Clinical signs
      if (form.reducedAppetite) formData.append("reduced_appetite", "true");
      if (form.restlessOrDiscomfort) formData.append("restless_or_discomfort", "true");
      if (form.kickingDuringMilking) formData.append("kicking_during_milking", "true");
      if (form.swollenUdder) formData.append("swollen_udder", "true");
      if (form.warmOrPainfulUdder) formData.append("warm_or_painful_udder", "true");
      if (form.clotsInMilk) formData.append("clots_in_milk", "true");
      if (form.bodyTemperature) formData.append("body_temperature", form.bodyTemperature);

      const response = await predictMastitisAssisted(formData);
      setResult(response?.data || response);
      showSuccess(t("detection.assessmentComplete") || "Mastitis analysis completed successfully");
    } catch (err) {
      setResult(null);
      const msg = err.message || "Server error";
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCow = cows.find((c) => String(c.id) === String(form.cowId));

  return (
    <PageWrapper className="max-w-3xl mx-auto space-y-6">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <Link
          to="/modules"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>{t("modules.backToModules") || "Disease Modules"}</span>
        </Link>
        <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
          Component I • Mastitis AI
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

            {/* Udder Photo Upload with ROI Cropping */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {t("detectionForms.udderPhotoLabel") || "Udder Photograph"} <span className="text-red-500">*</span>
                </label>
                <span className="text-[11px] font-medium text-slate-400">
                  {t("detectionForms.cropUdderTip") || "Camera / Gallery + Focus Cropper"}
                </span>
              </div>

              {isCroppingUdder && originalPreviewUrl ? (
                <div className="rounded-2xl border-2 border-emerald-500/80 bg-slate-950 p-3 sm:p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs text-white">
                    <span className="font-bold flex items-center gap-2">
                      <Crop className="h-4 w-4 text-emerald-400" />
                      {t("detectionForms.cropTitle") || "Select Udder Focus Area"}
                    </span>
                    <span className="text-slate-400 text-[11px]">
                      Drag corners to frame the udder
                    </span>
                  </div>

                  <UdderCropEditor
                    imageUrl={originalPreviewUrl}
                    originalFile={originalImageFile}
                    onConfirmCrop={handleConfirmUdderCrop}
                    onCancel={handleCancelUdderCrop}
                  />
                </div>
              ) : imagePreview ? (
                <div className="space-y-3">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 group">
                    <img
                      src={imagePreview}
                      alt="Udder preview"
                      className="w-full h-64 object-contain bg-slate-950/50"
                    />
                    <div className="absolute top-3 right-3 flex items-center gap-2">
                      {croppedImageFile && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500 text-white shadow-sm flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {t("detectionForms.croppedBadge") || "Udder Cropped"}
                        </span>
                      )}
                    </div>

                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-4">
                      {originalPreviewUrl && (
                        <button
                          type="button"
                          onClick={handleStartUdderCrop}
                          className="px-3 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5"
                        >
                          <Crop className="h-3.5 w-3.5" />
                          {t("detectionForms.reCrop") || "Adjust Crop"}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleRetakeUdderPhoto}
                        className="px-3 py-2 rounded-xl bg-white/90 text-slate-900 text-xs font-bold hover:bg-white transition"
                      >
                        {t("detectionForms.retake") || "Change Photo"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label
                      htmlFor="mastitis-camera-input"
                      className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50/30 transition-all text-center group cursor-pointer"
                    >
                      <input
                        id="mastitis-camera-input"
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <HeartPulse className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t("detectionForms.takeUdderPhoto") || "Take Udder Photo"}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        Camera capture
                      </span>
                    </label>

                    <label
                      htmlFor="mastitis-file-input"
                      className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50/30 transition-all text-center group cursor-pointer"
                    >
                      <input
                        id="mastitis-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                      <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Crop className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t("detectionForms.uploadUdderPhoto") || "Upload Photo"}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        From storage / gallery
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 5 Required Numerical Measurements */}
            <div className="space-y-4 pt-2">
              <SectionHeader
                label={t("detectionForms.numericalFeaturesTitle") || "Milk Sensor & Production Indicators"}
                badge="Model 2 Decision Tree"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={t("detectionForms.milkTemp") || "Milk Temperature (°C)"}
                  type="number"
                  step="0.1"
                  name="milkTemperature"
                  value={form.milkTemperature}
                  onChange={handleChange}
                  placeholder="30.0 - 45.0"
                />

                <Input
                  label={t("detectionForms.milkPh") || "Milk pH"}
                  type="number"
                  step="0.01"
                  name="milkPh"
                  value={form.milkPh}
                  onChange={handleChange}
                  placeholder="6.0 - 8.0"
                />

                <Input
                  label={t("detectionForms.milkConductivity") || "Milk Conductivity (mS/cm)"}
                  type="number"
                  step="0.1"
                  name="milkConductivity"
                  value={form.milkConductivity}
                  onChange={handleChange}
                  placeholder="3.0 - 10.0"
                />

                <Input
                  label={t("detectionForms.milkYield") || "Milk Yield (L / day)"}
                  type="number"
                  step="0.1"
                  name="milkYield"
                  value={form.milkYield}
                  onChange={handleChange}
                  placeholder="0.0 - 50.0"
                />

                <div className="space-y-2 sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    {t("detectionForms.milkClottingLabel") || "Milk Clotting Status"}
                  </label>
                  <select
                    name="clotting"
                    value={form.clotting}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="0">{t("detectionForms.clotting0") || "0: No Clotting (Normal Flow)"}</option>
                    <option value="1">{t("detectionForms.clotting1") || "1: Visible Clots / Flakes Present"}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Optional Clinical Observations */}
            <div className="space-y-4 pt-2">
              <SectionHeader
                label={t("detectionForms.clinicalObservations") || "Clinical Observations (Farmer Questionnaire)"}
                optional
              />

              <CheckboxGrid
                items={[
                  ["swollenUdder", t("detectionForms.swollenUdder") || "Swollen, hard or enlarged udder quarter"],
                  ["warmOrPainfulUdder", t("detectionForms.warmOrPainfulUdder") || "Warm or painful to touch"],
                  ["clotsInMilk", t("detectionForms.clotsInMilk") || "Watery, discoloured, or flaky milk"],
                  ["kickingDuringMilking", t("detectionForms.kickingDuringMilking") || "Restlessness / kicking during milking"],
                  ["reducedAppetite", t("detectionForms.reducedAppetite") || "Reduced feed intake / appetite loss"],
                  ["restlessOrDiscomfort", t("detectionForms.restlessOrDiscomfort") || "General discomfort or dullness"],
                ]}
                values={form}
                onChange={handleChange}
              />
            </div>

            {error && <Alert variant="error" message={error} />}

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting || !form.image}
                className="w-full gap-2 text-xs sm:text-sm font-bold py-3 rounded-xl shadow-xs bg-emerald-600 hover:bg-emerald-700"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader className="h-4 w-4 animate-spin" />
                    <span>{t("detection.processingAi") || "Analyzing Multimodal Data…"}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>{t("detection.runMastitisCheck") || "Run Mastitis Assessment"}</span>
                  </>
                )}
              </Button>

              {!form.image && (
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-2">
                  {t("detection.uploadClearPhoto") || "Upload an udder photograph above to run the analysis"}
                </p>
              )}
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Results Display */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DetectionResultCard
            result={result}
            cowId={form.cowId}
            cows={cows}
            cowName={selectedCow?.name || (form.cowId ? `Cow #${form.cowId}` : null)}
            onCowSelect={(id) => setForm((prev) => ({ ...prev, cowId: id }))}
            imageUrl={imagePreview}
          />
        </motion.div>
      )}
    </PageWrapper>
  );
}
