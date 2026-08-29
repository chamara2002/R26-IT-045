import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Flame,
  Layers,
  Maximize2,
  Scan,
  Sparkles,
  X,
  ZoomIn,
} from "lucide-react";
import { useI18n } from "../i18n/language-context";
import { getMastitisHeatmap, getMastitisHeatmapMeta } from "../services/api";

export default function GradCAMVisualization({
  imageUrl,
  heatmapOverlayUrl,
  heatmapData,
  heatmapId,
  stage,
  roiApplied = false,
}) {
  const { t } = useI18n();

  // Layer selection: 'overlay' | 'heat' | 'crop' | 'orig'
  const [activeLayer, setActiveLayer] = useState("overlay");
  const [loading, setLoading] = useState(true);
  const [hasHeatmap, setHasHeatmap] = useState(false);
  const [isZoomOpen, setIsZoomOpen] = useState(false);

  // Cached layer blob URLs
  const [layerUrls, setLayerUrls] = useState({
    overlay: heatmapOverlayUrl || null,
    heat: null,
    crop: null,
    orig: imageUrl || null,
  });

  // Metadata states
  const [isLowSignal, setIsLowSignal] = useState(false);
  const [reliability, setReliability] = useState("high");
  const [reliabilityNote, setReliabilityNote] = useState(null);
  const [centerAttentionPct, setCenterAttentionPct] = useState(null);
  const [peakOnCenter, setPeakOnCenter] = useState(true);
  const [gradNorm, setGradNorm] = useState(null);

  // Track created blob URLs for safe cleanup on unmount
  const createdBlobsRef = useRef(new Set());

  // Store created blob URLs
  const registerBlobUrl = (url) => {
    if (url && url.startsWith("blob:")) {
      createdBlobsRef.current.add(url);
    }
    return url;
  };

  // Clean up all blob URLs when component is destroyed
  useEffect(() => {
    return () => {
      createdBlobsRef.current.forEach((url) => {
        try {
          URL.revokeObjectURL(url);
        } catch {
          // ignore cleanup errors
        }
      });
      createdBlobsRef.current.clear();
    };
  }, []);

  // Initialize from props
  useEffect(() => {
    if (heatmapOverlayUrl) {
      setLayerUrls((prev) => ({
        ...prev,
        overlay: heatmapOverlayUrl,
        orig: imageUrl || prev.orig,
      }));
      setHasHeatmap(true);
      setLoading(false);
    } else if (imageUrl) {
      setLayerUrls((prev) => ({
        ...prev,
        orig: imageUrl,
      }));
    }
  }, [imageUrl, heatmapOverlayUrl]);

  // Poll backend for heatmap generation and load metadata
  useEffect(() => {
    if (!heatmapId) {
      if (!heatmapOverlayUrl) {
        setLoading(false);
      }
      return;
    }

    let isCancelled = false;
    setLoading(true);

    const fetchMetaAndLayers = async () => {
      // 1. Fetch explanation metadata
      try {
        const metaRes = await getMastitisHeatmapMeta(heatmapId);
        const meta = metaRes?.data || metaRes;
        if (meta && !isCancelled) {
          if (meta.low_signal) setIsLowSignal(true);
          if (meta.gradcam_reliability) setReliability(meta.gradcam_reliability);
          if (meta.reliability_note) setReliabilityNote(meta.reliability_note);
          if (meta.center_attention_pct !== undefined) setCenterAttentionPct(meta.center_attention_pct);
          if (meta.peak_on_center !== undefined) setPeakOnCenter(meta.peak_on_center);
          if (meta.grad_norm !== undefined) setGradNorm(meta.grad_norm);
        }
      } catch {
        // Meta fetch non-blocking
      }

      // 2. Poll for the primary overlay image
      for (let attempt = 0; attempt < 35 && !isCancelled; attempt++) {
        try {
          const res = await getMastitisHeatmap(heatmapId, "overlay");
          if (res && res.status === 200 && res.data) {
            const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: "image/png" });
            const overlayBlobUrl = registerBlobUrl(URL.createObjectURL(blob));

            if (!isCancelled) {
              setLayerUrls((prev) => ({
                ...prev,
                overlay: overlayBlobUrl,
              }));
              setHasHeatmap(true);
              setLoading(false);
            }
            break;
          } else if (res && res.status === 202) {
            // Processing in background thread
          } else {
            break;
          }
        } catch {
          // Network retry
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      if (!isCancelled) {
        setLoading(false);
      }
    };

    fetchMetaAndLayers();

    return () => {
      isCancelled = true;
    };
  }, [heatmapId, heatmapOverlayUrl]);

  // Fetch individual layer on demand if user toggles tab
  const handleLayerSelect = async (layerKey) => {
    setActiveLayer(layerKey);

    // If layer already loaded or is original photo with imageUrl, nothing more to fetch
    if (layerUrls[layerKey]) return;
    if (layerKey === "orig" && imageUrl) {
      setLayerUrls((prev) => ({ ...prev, orig: imageUrl }));
      return;
    }
    if (!heatmapId) return;

    try {
      const res = await getMastitisHeatmap(heatmapId, layerKey);
      if (res && res.status === 200 && res.data) {
        const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: "image/png" });
        const layerBlobUrl = registerBlobUrl(URL.createObjectURL(blob));
        setLayerUrls((prev) => ({
          ...prev,
          [layerKey]: layerBlobUrl,
        }));
      }
    } catch (err) {
      console.warn(`Layer ${layerKey} fetch notice:`, err);
    }
  };

  // Determine current display URL
  const currentDisplayUrl =
    layerUrls[activeLayer] ||
    layerUrls.overlay ||
    layerUrls.crop ||
    layerUrls.orig ||
    imageUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
    >
      {/* Header Bar */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {t("gradcam.title") || "AI Visual Attention Heatmap"}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("gradcam.subtitle") ||
              "Highlighted areas show regions that influenced the image model's prediction."}
          </p>
        </div>

        {/* Spatial Reliability & Focus Badges */}
        <div className="flex flex-wrap items-center gap-1.5">
          {roiApplied && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 text-[11px] font-bold border border-teal-200 dark:border-teal-800 shrink-0">
              <Scan className="h-3 w-3" />
              <span>{t("gradcam.udderFocusArea") || "Udder Focus Area"}</span>
            </span>
          )}

          {!isLowSignal && reliability === "high" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800 shrink-0">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
              <span>{t("gradcam.highSpatialFocus") || "High Udder Focus"}</span>
            </span>
          )}

          {!isLowSignal && reliability === "moderate" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[11px] font-bold border border-amber-200 dark:border-amber-800 shrink-0">
              <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              <span>{t("gradcam.moderateSpatialFocus") || "Moderate Spatial Focus"}</span>
            </span>
          )}

          {!isLowSignal && reliability === "low" && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-300 dark:border-slate-700 shrink-0">
              <AlertCircle className="h-3 w-3 text-slate-500" />
              <span>{t("gradcam.peripheralAttention") || "Peripheral Attention"}</span>
            </span>
          )}
        </div>
      </div>

      {/* Layer Switcher Tabs */}
      <div className="px-4 pt-3 pb-1 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/30 flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
          <button
            type="button"
            onClick={() => handleLayerSelect("overlay")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeLayer === "overlay"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>{t("gradcam.viewOverlay") || "AI Overlay"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleLayerSelect("heat")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeLayer === "heat"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            <span>{t("gradcam.viewHeat") || "Thermal Heatmap"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleLayerSelect("crop")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeLayer === "crop"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Scan className="h-3.5 w-3.5 text-teal-500" />
            <span>{t("gradcam.viewCrop") || "Udder Focus Area"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleLayerSelect("orig")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeLayer === "orig"
                ? "bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 shadow-xs"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-slate-500" />
            <span>{t("gradcam.viewOrig") || "Original Photo"}</span>
          </button>
        </div>

        {/* Zoom Button */}
        {currentDisplayUrl && !loading && (
          <button
            type="button"
            onClick={() => setIsZoomOpen(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title={t("gradcam.zoomIn") || "Inspect High Resolution"}
          >
            <ZoomIn className="h-3.5 w-3.5" />
            <span>{t("gradcam.zoomIn") || "Inspect"}</span>
          </button>
        )}
      </div>

      {/* Main Image Display Area */}
      <div className="p-4 space-y-3">
        {loading && !currentDisplayUrl ? (
          <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/60">
            <div className="text-center space-y-2">
              <div className="w-9 h-9 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                {t("gradcam.rendering") || "Rendering visual explanation..."}
              </p>
            </div>
          </div>
        ) : (
          <div className="relative group w-full max-w-lg mx-auto rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-950 shadow-inner">
            <img
              src={currentDisplayUrl}
              alt="AI Visual Attention Heatmap"
              className="w-full h-auto max-h-[380px] object-contain mx-auto block transition-transform duration-300 group-hover:scale-[1.01]"
              onError={(e) => {
                // Fallback to original image on error
                if (imageUrl && e.target.src !== imageUrl) {
                  e.target.src = imageUrl;
                }
              }}
            />

            {/* Loading Overlay if fetching a new layer */}
            {loading && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center">
                <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            )}

            {/* Click to Zoom Overlay on Hover */}
            <button
              type="button"
              onClick={() => setIsZoomOpen(true)}
              className="absolute bottom-2.5 right-2.5 p-2 rounded-xl bg-slate-900/80 text-white hover:bg-slate-900 backdrop-blur-xs border border-white/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
              aria-label={t("gradcam.zoomIn") || "Zoom"}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Attention Advisory Notes */}
        {isLowSignal && (
          <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/40 p-3.5 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2.5">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                {t("gradcam.diffuseTitle") || "Diffuse Attention (Healthy/Confident Prediction): "}
              </span>
              <span>
                {t("gradcam.diffuseBody") ||
                  "No localized inflammatory hot spots or lesion patterns were detected on this udder photograph. The model exhibits low, diffuse activation consistent with normal tissue."}
              </span>
            </div>
          </div>
        )}

        {!isLowSignal && reliability === "moderate" && (
          <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/40 p-3.5 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                {t("gradcam.moderateTitle") ||
                  "Attention Partially Outside Udder (Supporting Evidence Only): "}
              </span>
              <span>
                {reliabilityNote ||
                  t("gradcam.moderateDefault") ||
                  "Model attention was partially spread across peripheral stall/background elements for this image; treat this visual overlay as supporting evidence alongside clinical observations."}
              </span>
            </div>
          </div>
        )}

        {!isLowSignal && reliability === "low" && (
          <div className="rounded-xl bg-slate-100/90 dark:bg-slate-800/70 p-3.5 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2.5">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                {t("gradcam.peripheralTitle") || "Peripheral Focus Advisory: "}
              </span>
              <span>
                {reliabilityNote ||
                  t("gradcam.peripheralDefault") ||
                  "Model focus concentrated primarily on background textures or perimeter cues rather than the central udder tissue. Rely primarily on clinical observations and numerical laboratory tests."}
              </span>
            </div>
          </div>
        )}

        {/* Quantitative Spatial Diagnostics Bar */}
        {centerAttentionPct !== null && centerAttentionPct !== undefined && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-200/80 dark:border-slate-700/60 text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">
                {t("gradcam.centerFocus") || "Udder Focus Area Concentration"}:
              </span>
              <span className="font-bold text-slate-900 dark:text-white">
                {centerAttentionPct}%
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">
                {t("gradcam.spatialReliability") || "Spatial Reliability"}:
              </span>
              <span
                className={`font-bold capitalize ${
                  reliability === "high"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : reliability === "moderate"
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-slate-600 dark:text-slate-400"
                }`}
              >
                {reliability}
              </span>
            </div>
          </div>
        )}

        {/* Disclaimers & Veterinary Interpretation Note */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {t("gradcam.interpretationTitle") || "Note on AI Heatmap Interpretation:"}
          </p>
          <p className="leading-relaxed">
            {t("gradcam.interpretationBody") ||
              "Warm color overlays highlight areas of the udder where the AI focused its attention during the photo check. This provides supporting visual evidence and does not replace veterinary diagnosis."}
          </p>
        </div>
      </div>

      {/* High-Resolution Zoom Modal */}
      <AnimatePresence>
        {isZoomOpen && currentDisplayUrl && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="relative max-w-4xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-bold text-white uppercase tracking-wider">
                    {t("gradcam.title") || "AI Visual Attention Heatmap"} — {activeLayer.toUpperCase()}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsZoomOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                  aria-label={t("gradcam.zoomClose") || "Close"}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-4 flex items-center justify-center bg-black/60 max-h-[75vh] overflow-auto">
                <img
                  src={currentDisplayUrl}
                  alt="Full Resolution Visual Attention Heatmap"
                  className="max-h-[70vh] w-auto object-contain rounded-xl shadow-lg"
                />
              </div>

              {/* Modal Footer Controls */}
              <div className="p-3 bg-slate-900 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                <span>{stage ? `Severity Stage: ${stage}` : "Visual Saliency Inspection"}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleLayerSelect("overlay")}
                    className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                      activeLayer === "overlay"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Overlay
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLayerSelect("heat")}
                    className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                      activeLayer === "heat"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Heatmap
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLayerSelect("crop")}
                    className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                      activeLayer === "crop"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Udder ROI
                  </button>
                  <button
                    type="button"
                    onClick={() => handleLayerSelect("orig")}
                    className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                      activeLayer === "orig"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                    }`}
                  >
                    Original
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
