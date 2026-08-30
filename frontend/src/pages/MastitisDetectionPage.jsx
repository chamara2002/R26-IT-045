import React, { useState, useEffect, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  HeartPulse,
  Crop,
  CheckCircle,
  Loader,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Info,
  Check,
  X,
  Camera,
} from "lucide-react";
import PageWrapper from "../components/PageWrapper";
import { Card, Button, Alert, Input } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import UdderCropEditor from "../components/UdderCropEditor";
import LiveCameraCaptureModal from "../components/LiveCameraCaptureModal";
import DetectionResultCard from "../components/DetectionResultCard";
import {
  MODULE_META,
  DiseaseInfoPanel,
  CowSelector,
  SectionHeader,
  CheckboxGrid,
} from "../components/detection/DetectionShared";
import { getCows, predictMastitisAssisted } from "../services/api";

const SYMPTOM_CHECKLIST_ITEMS = [
  {
    key: "milk_has_clots",
    label: "Visible clots or lumps in milk",
    description: "Milk shows flakes, curd-like clots, or thick discharge",
  },
  {
    key: "milk_color_changed",
    label: "Unusual milk color or consistency",
    description: "Watery, yellowish, brownish, or blood-tinged milk",
  },
  {
    key: "udder_feels_warm",
    label: "Udder feels warmer than usual",
    description: "Higher heat or feverish sensation when palpating udder quarters",
  },
  {
    key: "udder_swollen",
    label: "Udder looks swollen or hard",
    description: "Enlarged, tense, or firm quarter compared to other quarters",
  },
  {
    key: "milk_yield_dropped",
    label: "Sudden milk yield drop",
    description: "Noticeable reduction in milk output in recent milkings",
  },
  {
    key: "cow_uneasy_during_milking",
    label: "Cow uneasy or kicking during milking",
    description: "Fidgeting, stepping, or signs of pain when touching udder/teats",
  },
];

export default function MastitisDetectionPage() {
  const { t } = useI18n();
  const [searchParams] = useSearchParams();
  const { showSuccess, showError } = useToast();
  const cowIdFromQuery = searchParams.get("cowId") || searchParams.get("cow_id") || "";

  const meta = MODULE_META.mastitis;

  const resultsRef = useRef(null);
  const [cows, setCows] = useState([]);
  const [form, setForm] = useState({
    cowId: cowIdFromQuery,
    image: null,
    // 5 Required Model 2 Numerical Features
    milkTemperature: "",
    milkPh: "",
    milkConductivity: "",
    milkYield: "",
    clotting: "",
    // 6-Question Farmer Symptom Checklist (Yes: true, No: false, Unset: null)
    milk_has_clots: null,
    milk_color_changed: null,
    udder_feels_warm: null,
    udder_swollen: null,
    milk_yield_dropped: null,
    cow_uneasy_during_milking: null,
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
  
  useEffect(() => {
    if (result && resultsRef.current) {
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [result]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  // Mastitis Udder ROI State
  const [originalImageFile, setOriginalImageFile] = useState(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = useState(null);
  const [croppedImageFile, setCroppedImageFile] = useState(null);
  const [cropPreviewUrl, setCropPreviewUrl] = useState(null);
  const [roiCoordinates, setRoiCoordinates] = useState(null);
  const [isCroppingUdder, setIsCroppingUdder] = useState(false);
  const [isLiveCameraOpen, setIsLiveCameraOpen] = useState(false);

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
      setForm((prev) => ({ ...prev, image: file }));
      setIsCroppingUdder(true);
    }
  };

  const handleConfirmUdderCrop = ({ originalFile, croppedFile, croppedPreviewUrl, coordinates }) => {
    setOriginalImageFile(originalFile || originalImageFile);
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

  const handleLiveCameraCapture = (file, previewUrl) => {
    setOriginalImageFile(file);
    setOriginalPreviewUrl(previewUrl);
    setImagePreview(previewUrl);
    setCroppedImageFile(null);
    setCropPreviewUrl(null);
    setRoiCoordinates(null);
    setIsCroppingUdder(true);
    setIsLiveCameraOpen(false);
  };

  const handleRetakeUdderPhoto = () => {
    setImagePreview(null);
    setOriginalImageFile(null);
    setOriginalPreviewUrl(null);
    setCroppedImageFile(null);
    setCropPreviewUrl(null);
    setRoiCoordinates(null);
    setIsCroppingUdder(false);
    setIsLiveCameraOpen(false);
    setForm((prev) => ({ ...prev, image: null }));
  };

  const hasAllBiomarkers =
    form.milkTemperature !== "" &&
    form.milkPh !== "" &&
    form.milkConductivity !== "" &&
    form.milkYield !== "" &&
    form.clotting !== "";

  const hasAtLeastOneSymptom = [
    form.milk_has_clots,
    form.milk_color_changed,
    form.udder_feels_warm,
    form.udder_swollen,
    form.milk_yield_dropped,
    form.cow_uneasy_during_milking,
  ].some((v) => v === true || v === false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    const imageToSend = croppedImageFile || form.image;
    if (!imageToSend) {
      setError(t("detection.photoRequired") || "Please upload an udder photograph");
      return;
    }

    if (!hasAllBiomarkers && !hasAtLeastOneSymptom) {
      const msg =
        t("mastitisDetection.symptomsOrBiomarkersRequired") ||
        "Please answer at least one symptom checklist question, or provide all 5 numerical biomarker values, so we can assess disease severity accurately.";
      setError(msg);
      showError(msg);
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");

      const formData = new FormData();
      formData.append("image", imageToSend);
      if (originalImageFile && originalImageFile !== imageToSend) {
        formData.append("original_image", originalImageFile);
      }
      if (roiCoordinates) {
        formData.append("roi_coordinates", JSON.stringify(roiCoordinates));
      }

      if (form.cowId) formData.append("cow_id", form.cowId);

      // Model 2 Numerical Features
      if (form.milkTemperature !== "") formData.append("milk_temperature", form.milkTemperature);
      if (form.milkPh !== "") formData.append("milk_ph", form.milkPh);
      if (form.milkConductivity !== "") formData.append("milk_conductivity", form.milkConductivity);
      if (form.milkYield !== "") formData.append("milk_yield", form.milkYield);
      if (form.clotting !== "") formData.append("clotting", form.clotting);

      // 6-Question Farmer Symptom Checklist (Send true/false if answered, omit if null)
      if (form.milk_has_clots === true) formData.append("milk_has_clots", "true");
      else if (form.milk_has_clots === false) formData.append("milk_has_clots", "false");

      if (form.milk_color_changed === true) formData.append("milk_color_changed", "true");
      else if (form.milk_color_changed === false) formData.append("milk_color_changed", "false");

      if (form.udder_feels_warm === true) formData.append("udder_feels_warm", "true");
      else if (form.udder_feels_warm === false) formData.append("udder_feels_warm", "false");

      if (form.udder_swollen === true) formData.append("udder_swollen", "true");
      else if (form.udder_swollen === false) formData.append("udder_swollen", "false");

      if (form.milk_yield_dropped === true) formData.append("milk_yield_dropped", "true");
      else if (form.milk_yield_dropped === false) formData.append("milk_yield_dropped", "false");

      if (form.cow_uneasy_during_milking === true) formData.append("cow_uneasy_during_milking", "true");
      else if (form.cow_uneasy_during_milking === false) formData.append("cow_uneasy_during_milking", "false");

      // Optional Clinical signs
      if (form.reducedAppetite) formData.append("reduced_appetite", "true");
      if (form.restlessOrDiscomfort) formData.append("restless_or_discomfort", "true");
      if (form.kickingDuringMilking) formData.append("kicking_during_milking", "true");
      if (form.swollenUdder) formData.append("swollen_udder", "true");
      if (form.warmOrPainfulUdder) formData.append("warm_or_painful_udder", "true");
      if (form.clotsInMilk) formData.append("clots_in_milk", "true");
      if (form.bodyTemperature) formData.append("body_temperature", form.bodyTemperature);

      // Package full clinical observations dictionary
      const clinicalObsPayload = {};
      if (form.milk_has_clots !== null) clinicalObsPayload.milk_has_clots = form.milk_has_clots ? "Yes" : "No";
      if (form.milk_color_changed !== null) clinicalObsPayload.milk_color_changed = form.milk_color_changed ? "Yes" : "No";
      if (form.udder_feels_warm !== null) clinicalObsPayload.udder_feels_warm = form.udder_feels_warm ? "Yes" : "No";
      if (form.udder_swollen !== null) clinicalObsPayload.udder_swollen = form.udder_swollen ? "Yes" : "No";
      if (form.milk_yield_dropped !== null) clinicalObsPayload.milk_yield_dropped = form.milk_yield_dropped ? "Yes" : "No";
      if (form.cow_uneasy_during_milking !== null) clinicalObsPayload.cow_uneasy_during_milking = form.cow_uneasy_during_milking ? "Yes" : "No";

      if (form.milk_yield_dropped !== null) clinicalObsPayload.milk_yield_change = form.milk_yield_dropped ? "Decreased" : "Normal";
      if (form.milk_color_changed !== null) clinicalObsPayload.milk_appearance = form.milk_color_changed ? "Color Changed / Abnormal" : "Normal";
      if (form.milk_has_clots !== null || form.clotting !== "") {
        const hasClots = form.milk_has_clots === true || form.clotting === "1";
        clinicalObsPayload.milk_clotting = hasClots ? "Clots / Flakes Present" : "Normal Flow (No Clots)";
      }
      if (form.udder_swollen !== null) clinicalObsPayload.udder_swelling = form.udder_swollen ? "Yes" : "No";
      if (form.udder_feels_warm !== null) clinicalObsPayload.udder_warmth = form.udder_feels_warm ? "Increased (Warm)" : "Normal";
      if (form.cow_uneasy_during_milking !== null) clinicalObsPayload.udder_pain = form.cow_uneasy_during_milking ? "Yes (Pain / Kicking)" : "No";
      if (form.bodyTemperature) clinicalObsPayload.body_temperature = form.bodyTemperature;
      if (form.reducedAppetite) clinicalObsPayload.appetite = "Reduced";

      if (Object.keys(clinicalObsPayload).length > 0) {
        formData.append("clinical_observations", JSON.stringify(clinicalObsPayload));
      }

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
    <PageWrapper className="space-y-6">
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
          Mastitis AI
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
            {/* Farmer Quick Guide Steps */}
            <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 text-center text-xs">
              <div className="space-y-0.5">
                <span className="font-bold text-emerald-700 dark:text-emerald-400">
                  {t("detectionForms.step1UdderPhoto") || "1. Udder Photo"}
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {t("common.required") || "Required"} (CNN AI)
                </p>
              </div>
              <div className="space-y-0.5 border-x border-slate-200 dark:border-slate-700 px-1">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {t("detectionForms.step2MilkSensor") || "2. Milk Sensor"}
                </span>
                <p className="text-[10px] text-slate-400">
                  {t("common.optional") || "Optional"}
                </p>
              </div>
              <div className="space-y-0.5">
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {t("detectionForms.step3Symptoms") || "3. Symptoms"}
                </span>
                <p className="text-[10px] text-slate-400">
                  {t("common.optional") || "Optional"}
                </p>
              </div>
            </div>

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

              {/* Farmer Photo Capture Guide with Example Image */}
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <Sparkles className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                      {t("detection.photoGuideTitle") || "Photo Guide & Example"}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-800/60">
                    {t("detectionForms.recommendedFraming") || "Recommended Framing"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-center">
                  {/* Example Image Thumbnail */}
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-900 shadow-xs">
                    <img
                      src="/images/udder.jpg"
                      alt="Example udder photograph framing"
                      className="w-full h-32 sm:h-36 object-cover"
                    />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 text-center">
                      <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                        {t("detectionForms.examplePhoto") || "Example Photo"}
                      </span>
                    </div>
                  </div>

                  {/* Photography Tips for Farmers */}
                  <div className="sm:col-span-2 space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    <div className="flex items-start gap-2">
                      <span className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        1
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        <strong className="text-slate-800 dark:text-slate-200">{t("detectionForms.tipAngleTitle") || "Angle:"}</strong> {t("detectionForms.tipAngle") || "Stand safely behind or slightly to the side to capture all four quarters and teats clearly."}
                      </p>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        2
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        <strong className="text-slate-800 dark:text-slate-200">{t("detectionForms.tipLightingTitle") || "Lighting:"}</strong> {t("detectionForms.tipLighting") || "Ensure the udder area is well-lit without dark shadows obscuring inflammation or redness."}
                      </p>
                    </div>

                    <div className="flex items-start gap-2">
                      <span className="h-4 w-4 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                        3
                      </span>
                      <p className="text-[11px] leading-relaxed">
                        <strong className="text-slate-800 dark:text-slate-200">{t("detectionForms.tipFocusTitle") || "Focus:"}</strong> {t("detectionForms.tipFocus") || "Keep the camera steady and wipe excess mud off teats for highest AI accuracy."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {isCroppingUdder && originalPreviewUrl ? (
                <UdderCropEditor
                  imageUrl={originalPreviewUrl}
                  imageFile={originalImageFile}
                  originalFile={originalImageFile}
                  onConfirmCrop={handleConfirmUdderCrop}
                  onCancel={handleCancelUdderCrop}
                />
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
                    <button
                      type="button"
                      onClick={() => setIsLiveCameraOpen(true)}
                      className="flex flex-col items-center justify-center p-6 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-800/40 hover:bg-emerald-50/30 transition-all text-center group cursor-pointer"
                    >
                      <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                        <Camera className="h-5 w-5" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {t("detectionForms.takeUdderPhoto") || "Take Udder Photo"}
                      </span>
                      <span className="text-[11px] text-slate-400 mt-0.5">
                        {t("detectionForms.liveCamera") || "Live camera capture"}
                      </span>
                    </button>

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
                        {t("detectionForms.fromGallery") || "From storage / gallery"}
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* 5 Optional Numerical Measurements (Model 2) */}
            <div className="space-y-4 pt-2">
              <SectionHeader
                label={t("detectionForms.numericalFeaturesTitle") || "Milk Quality & Daily Yield"}
                optional
                badge={t("detectionForms.model2Badge") || "Model 2 Decision Tree"}
              />
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("detectionForms.mastitisParametersSubtitle") || "If you have milk testing equipment or daily production records, enter values below to boost precision. If left blank, AI evaluates from the photograph alone."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label={t("detectionForms.milkTemp") || "Milk Temperature (°C)"}
                    type="number"
                    step="0.1"
                    name="milkTemperature"
                    value={form.milkTemperature}
                    onChange={handleChange}
                    placeholder="e.g. 36.5 (Normal: 35.0 - 38.5)"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    {t("detectionForms.milkTemperatureHelp") || "Fresh milk temperature at milking time"}
                  </p>
                </div>

                <div>
                  <Input
                    label={t("detectionForms.milkPh") || "Milk pH Level"}
                    type="number"
                    step="0.01"
                    name="milkPh"
                    value={form.milkPh}
                    onChange={handleChange}
                    placeholder="e.g. 6.65 (Normal: 6.5 - 6.8)"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    {t("detectionForms.milkPhHelp") || "Acidity level from strip test or digital pH meter"}
                  </p>
                </div>

                <div>
                  <Input
                    label={t("detectionForms.milkConductivity") || "Electrical Conductivity (mS/cm)"}
                    type="number"
                    step="0.1"
                    name="milkConductivity"
                    value={form.milkConductivity}
                    onChange={handleChange}
                    placeholder="e.g. 4.80 (Normal: 4.0 - 5.5)"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    {t("detectionForms.milkConductivityHelp") || "Ion conductivity reading from cup or in-line sensor"}
                  </p>
                </div>

                <div>
                  <Input
                    label={t("detectionForms.milkYield") || "Daily Milk Yield (Liters/day)"}
                    type="number"
                    step="0.1"
                    name="milkYield"
                    value={form.milkYield}
                    onChange={handleChange}
                    placeholder="e.g. 18.5 (Daily production)"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1">
                    {t("detectionForms.milkYieldHelp") || "Total volume collected today across milkings"}
                  </p>
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      {t("detectionForms.milkClottingLabel") || "Milk Flow & Clotting"}
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {t("detectionForms.clottingHelp") || "Visual milk appearance"}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, clotting: prev.clotting === "0" ? "" : "0" }))}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${form.clotting === "0"
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs ring-1 ring-emerald-500"
                          : "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                    >
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${form.clotting === "0"
                          ? "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        }`}>
                        <Check className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {t("detectionForms.noClotting") || "Normal Flow (No Clots)"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {t("detectionForms.noClottingHelp") || "Smooth, clean liquid with no lumps or flakes"}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, clotting: prev.clotting === "1" ? "" : "1" }))}
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${form.clotting === "1"
                          ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs ring-1 ring-amber-500"
                          : "border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                    >
                      <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${form.clotting === "1"
                          ? "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        }`}>
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {t("detectionForms.clottingPresent") || "Clots or Flakes Present"}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {t("detectionForms.clottingPresentHelp") || "Curd-like clots, watery separation, or stringy flakes"}
                        </p>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 6-Question Farmer Symptom Checklist (Yes / No Selection) */}
            <div className="space-y-4 pt-2">
              <SectionHeader
                label={t("detectionForms.symptomChecklistTitle") || "Farmer Symptom Checklist"}
                optional
                badge={t("mastitisDetection.supportingSignalBadge") || "15% Supporting Signal"}
              />

              <div className="space-y-2.5">
                {SYMPTOM_CHECKLIST_ITEMS.map(({ key, label, description }) => {
                  const currentValue = form[key];
                  const translatedLabel = t(`mastitisDetection.symptoms.${key}`) || label;
                  const translatedDesc = t(`mastitisDetection.symptoms.${key}_desc`) || description;
                  return (
                    <div
                      key={key}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border transition-all gap-3 ${currentValue === true
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-xs"
                          : currentValue === false
                            ? "border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/30"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700"
                        }`}
                    >
                      <div className="space-y-0.5 pr-2">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {translatedLabel}
                        </p>
                        {translatedDesc && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {translatedDesc}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 self-start sm:self-center">
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              [key]: prev[key] === true ? null : true,
                            }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${currentValue === true
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                          {currentValue === true && <Check className="h-3 w-3" />}
                          <span>{t("common.yes") || "Yes"}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({
                              ...prev,
                              [key]: prev[key] === false ? null : false,
                            }))
                          }
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${currentValue === false
                              ? "bg-slate-700 dark:bg-slate-600 text-white shadow-xs"
                              : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                            }`}
                        >
                          {currentValue === false && <X className="h-3 w-3" />}
                          <span>{t("common.no") || "No"}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && <Alert variant="error" message={error} />}

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2.5">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                disabled={isSubmitting || !form.image}
                className="w-full gap-2 text-xs sm:text-sm font-bold py-3.5 rounded-xl shadow-xs bg-emerald-600 hover:bg-emerald-700"
                size="lg"
              >
                {isSubmitting ? (
                  <span>{t("mastitisDetection.analyzingAi") || "Analyzing with CattleSense AI Diagnostic Engine…"}</span>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    <span>{t("mastitisDetection.runDiagnosticCheck") || "Run Mastitis Diagnostic Assessment"}</span>
                  </>
                )}
              </Button>

              {!form.image ? (
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                  {t("detection.uploadClearPhoto") || "Please take or upload an udder photograph above to start the assessment."}
                </p>
              ) : hasAllBiomarkers || hasAtLeastOneSymptom ? (
                <p className="text-center text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  ✓ {t("detection.imageUploaded") || "Photo uploaded & ready for analysis"}. {hasAllBiomarkers ? (t("detection.biomarkersAndSymptomsFused") || "Biomarkers and symptoms will be fused.") : (t("detection.symptomsUsedForSeverityStaging") || "Symptom observations will be used for severity staging.")}
                </p>
              ) : null}
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Results Display */}
      {result && (
        <motion.div
          ref={resultsRef}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="scroll-mt-6"
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

      {/* Live Camera Viewfinder Modal */}
      <LiveCameraCaptureModal
        isOpen={isLiveCameraOpen}
        onClose={() => setIsLiveCameraOpen(false)}
        onCapture={handleLiveCameraCapture}
      />
    </PageWrapper>
  );
}
