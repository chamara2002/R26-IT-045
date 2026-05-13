import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import PageWrapper, { PageHeader } from "../components/PageWrapper";
import { Upload, ArrowLeft, CheckCircle, AlertCircle, Loader, ShieldCheck } from "lucide-react";
import { Card, Button, Input, Alert, Badge } from "../components/ui/index.jsx";
import { useI18n } from "../i18n/language-context";
import { useToast } from "../hooks/useToast";
import DetectionResultCard from "../components/DetectionResultCard";
import GradCAMVisualization from "../components/GradCAMVisualization";
import { getCows, predictMastitisAssisted } from "../services/api";

export default function DetectionPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { moduleKey } = useParams();
  const { showSuccess, showError } = useToast();
  const cowIdFromQuery = searchParams.get("cowId") || searchParams.get("cow_id") || "";

  const [cows, setCows] = useState([]);

  const [form, setForm] = useState({
    cowId: cowIdFromQuery,
    image: null,
    milkTemperature: "",
    milkYield: "",
    clotting: "",
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
  const [imagePreview, setImagePreview] = useState("");

  useEffect(() => {
    const loadCows = async () => {
      try {
        const response = await getCows();
        const availableCows = response.cows || [];
        setCows(availableCows);
        if (cowIdFromQuery && availableCows.some((cow) => String(cow.id) === String(cowIdFromQuery))) {
          setForm((prev) => ({ ...prev, cowId: String(cowIdFromQuery) }));
        }
      } catch {
        setCows([]);
      }
    };

    loadCows();
  }, [cowIdFromQuery]);

  const moduleTitle = useMemo(() => {
    if (moduleKey === "mastitis") return t("modules.mastitis");
    if (moduleKey === "fmd") return t("modules.fmd");
    if (moduleKey === "lumpy") return t("modules.lumpy");
    if (moduleKey === "milk-fever") return t("modules.milkFever");
    return t("detection.diseaseModule");
  }, [moduleKey, t]);

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, image: file }));
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      showSuccess("Image selected successfully");
    }
  };

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleMastitisSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.image) {
      const errorMsg = "Please select an image";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    if (!form.cowId) {
      const errorMsg = "Please select a cattle record so this health check is saved to the correct cow";
      setError(errorMsg);
      showError(errorMsg);
      return;
    }

    const payload = new FormData();
    payload.append("image", form.image);
    payload.append("cow_id", form.cowId);

    const hasAnyHealthInput =
      form.milkTemperature !== "" ||
      form.milkYield !== "" ||
      form.clotting !== "";

    if (hasAnyHealthInput) {
      payload.append(
        "health_inputs",
        JSON.stringify({
          milk_temperature: form.milkTemperature === "" ? null : Number(form.milkTemperature),
          milk_yield: form.milkYield === "" ? null : Number(form.milkYield),
          clotting: form.clotting === "" ? null : form.clotting,
        })
      );
    }

    const behaviorSignals = {
      reduced_appetite: form.reducedAppetite,
      restless_or_discomfort: form.restlessOrDiscomfort,
      kicking_during_milking: form.kickingDuringMilking,
      swollen_udder: form.swollenUdder,
      warm_or_painful_udder: form.warmOrPainfulUdder,
      clots_in_milk: form.clotsInMilk,
    };

    const hasAnyBehavior = Object.values(behaviorSignals).some(Boolean);
    if (hasAnyBehavior) {
      payload.append("behavior_signals", JSON.stringify(behaviorSignals));
    }

    try {
      setIsSubmitting(true);
      const response = await predictMastitisAssisted(payload);
      if (!response?.success || !response?.data) {
        throw new Error(response?.error || response?.message || t("common.serverError"));
      }

      setResult(response.data);
      showSuccess("Detection completed successfully");
    } catch (submitError) {
      setResult(null);
      const errorMsg = submitError.message || t("common.serverError");
      setError(errorMsg);
      showError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Page animations handled by PageWrapper and PageHeader

  return (
    <PageWrapper className="max-w-3xl mx-auto space-y-6">
      <PageHeader
        title={`${moduleTitle} Detection`}
        subtitle={"Upload an image and optional health metrics for accurate disease detection"}
        actions={(
          <button
            onClick={() => navigate("/modules")}
            className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Modules
          </button>
        )}
      />

      {/* Main Form Card */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
        <Card className="p-8">
          <form onSubmit={handleMastitisSubmit} className="space-y-8">
            {/* Cow Selector */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Select Cow
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Choose the cow this health check belongs to so the result appears in that cow's records.
              </p>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Cow
                </label>
                <select
                  name="cowId"
                  value={form.cowId}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:focus:ring-offset-slate-900"
                >
                  <option value="">Select a cow</option>
                  {cows.map((cow) => (
                    <option key={cow.id} value={cow.id}>
                      {cow.name} - {cow.breed}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Image Upload Section */}
            <div className="space-y-4">
              <label className="block text-lg font-semibold text-slate-900 dark:text-white">
                Upload Cattle Image
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="sr-only"
                  id="image-upload"
                />
                <label
                  htmlFor="image-upload"
                  className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/50 p-8 text-center hover:border-emerald-500 dark:hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all duration-200"
                >
                  <Upload className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-slate-900 dark:text-white mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    PNG, JPG, GIF up to 10MB
                  </p>
                </label>
              </div>

              {imagePreview && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative rounded-xl overflow-hidden"
                >
                  <img
                    src={imagePreview}
                    alt="Selected cow"
                    className="w-full h-64 object-cover rounded-xl border border-slate-200 dark:border-slate-700"
                  />
                  <Badge className="absolute top-3 right-3" variant="success">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Selected
                  </Badge>
                </motion.div>
              )}
            </div>

            {/* Numerical Health Inputs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-block px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-sm font-medium">
                  Optional
                </span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Health Metrics
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Providing additional health data improves detection accuracy
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Milk Temperature (°C)"
                  type="number"
                  step="0.01"
                  name="milkTemperature"
                  value={form.milkTemperature}
                  onChange={handleChange}
                  placeholder="e.g., 38.5"
                />
                <Input
                  label="Milk Yield (L)"
                  type="number"
                  step="0.01"
                  name="milkYield"
                  value={form.milkYield}
                  onChange={handleChange}
                  placeholder="e.g., 20"
                />
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Clotting
                  </label>
                  <select
                    name="clotting"
                    value={form.clotting}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-0 dark:focus:ring-offset-slate-900"
                  >
                    <option value="">Select...</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Behavior Signals */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="inline-block px-3 py-1 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 text-sm font-medium">
                  Optional
                </span>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Behavior Signals
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Check any observed behavioral signs
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  ["reducedAppetite", "Reduced appetite"],
                  ["restlessOrDiscomfort", "Restless or discomfort"],
                  ["kickingDuringMilking", "Kicking during milking"],
                  ["swollenUdder", "Swollen udder"],
                  ["warmOrPainfulUdder", "Warm or painful udder"],
                  ["clotsInMilk", "Clots in milk"],
                ].map(([name, label]) => (
                  <label
                    key={name}
                    className="flex items-center gap-3 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      name={name}
                      checked={Boolean(form[name])}
                      onChange={handleChange}
                      className="h-5 w-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {error && <Alert variant="error" message={error} />}

            {/* Submit Button */}
            <div className="flex gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
              <Button
                type="submit"
                isLoading={isSubmitting}
                disabled={isSubmitting || !form.image}
                className="gap-2 flex-1"
                size="lg"
              >
                {isSubmitting ? (
                  "Analyzing Image..."
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Run Detection
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </motion.div>

      {/* Results Section */}
      {result && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="space-y-6"
        >
          {/* Primary Result */}
          <DetectionResultCard result={result} />

          {/* Grad-CAM Heatmap Visualization - HIDDEN */}
          {false && imagePreview && (
            <GradCAMVisualization
              imageUrl={imagePreview}
              heatmapOverlayUrl={result.heatmap_overlay_url}
              heatmapData={result.heatmap_data}
              heatmapId={result.heatmap_id}
              stage={result.severity?.stage || result.stage}
            />
          )}

        </motion.div>
      )}
    </PageWrapper>
  );
}
