import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, AlertTriangle, Eye } from "lucide-react";
import { useI18n } from "../i18n/language-context";

export default function GradCAMVisualization({ imageUrl, heatmapOverlayUrl, heatmapData, heatmapId, stage, roiApplied = false }) {
  const { t } = useI18n();
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [hasHeatmap, setHasHeatmap] = useState(false);
  const [displayUrl, setDisplayUrl] = useState(heatmapOverlayUrl || imageUrl);
  const [isLowSignal, setIsLowSignal] = useState(false);
  const [reliability, setReliability] = useState("high");
  const [reliabilityNote, setReliabilityNote] = useState(null);
  const [centerAttentionPct, setCenterAttentionPct] = useState(null);
  const authToken = localStorage.getItem("cattlesense_token") || localStorage.getItem("admin_token") || "";

  useEffect(() => {
    setLoading(true);
    setHasHeatmap(Boolean(heatmapOverlayUrl || heatmapData || heatmapId));
    setDisplayUrl(heatmapOverlayUrl || imageUrl);
  }, [imageUrl, heatmapOverlayUrl, heatmapData, heatmapId]);

  // Poll backend for heatmap if heatmapId was returned and no overlay yet
  useEffect(() => {
    if (heatmapOverlayUrl) return;
    if (!heatmapId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const poll = async () => {
      // 1. Check for metadata if available
      try {
        const metaRes = await fetch(`/api/modules/mastitis/heatmap/${heatmapId}/meta`, {
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        });
        if (metaRes.ok) {
          const metaJson = await metaRes.json();
          if (metaJson?.data) {
            if (metaJson.data.low_signal) {
              setIsLowSignal(true);
            }
            if (metaJson.data.gradcam_reliability) {
              setReliability(metaJson.data.gradcam_reliability);
              setReliabilityNote(metaJson.data.reliability_note);
              setCenterAttentionPct(metaJson.data.center_attention_pct);
            }
          }
        }
      } catch (err) {
        // Meta fetch non-blocking
      }

      for (let i = 0; i < 30 && !cancelled; i++) {
        try {
          const res = await fetch(`/api/modules/mastitis/heatmap/${heatmapId}`, {
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
          });
          if (res.status === 200) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            if (!cancelled) {
              setDisplayUrl(url);
              setHasHeatmap(true);
              break;
            }
          } else if (res.status === 202) {
            // not ready yet
          } else {
            // error or fallback
            break;
          }
        } catch (err) {
          // network error, continue polling
        }
        await new Promise((r) => setTimeout(r, 1200));
      }

      if (!cancelled) {
        setLoading(false);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [heatmapId, heatmapOverlayUrl]);

  useEffect(() => {
    if (!displayUrl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      setLoading(false);
    };

    img.onerror = () => {
      setLoading(false);
    };

    if (displayUrl.startsWith("data:") || displayUrl.startsWith("blob:")) {
      img.src = displayUrl;
    } else {
      img.src = displayUrl;
    }

    setHasHeatmap(Boolean(heatmapOverlayUrl || heatmapData || heatmapId));

    return () => {
      if (displayUrl && displayUrl.startsWith("blob:")) {
        URL.revokeObjectURL(displayUrl);
      }
    };
  }, [displayUrl, heatmapOverlayUrl, heatmapData, heatmapId]);

  const stageColors = {
    Healthy: "from-emerald-400 to-emerald-600",
    Normal: "from-emerald-400 to-emerald-600",
    Mild: "from-amber-400 to-amber-600",
    Moderate: "from-orange-400 to-orange-600",
    Severe: "from-red-400 to-red-600",
    Low: "from-emerald-400 to-emerald-600",
    Medium: "from-amber-400 to-amber-600",
    High: "from-orange-400 to-orange-600",
    Critical: "from-red-400 to-red-600",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs"
    >
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              {t("gradcam.title") || "AI Visual Attention Heatmap"}
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t("gradcam.subtitle") || "Highlighted areas show regions that influenced the image model's prediction."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {roiApplied && (
            <span className="px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 text-[11px] font-bold border border-teal-200 dark:border-teal-800 shrink-0">
              {t("gradcam.udderFocusArea") || "Udder Focus Area"}
            </span>
          )}
          {!isLowSignal && reliability === "moderate" && (
            <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 text-[11px] font-bold border border-amber-200 dark:border-amber-800 shrink-0">
              {t("gradcam.moderateSpatialFocus") || "Moderate Spatial Focus"}
            </span>
          )}
          {!isLowSignal && reliability === "low" && (
            <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[11px] font-bold border border-slate-300 dark:border-slate-700 shrink-0">
              {t("gradcam.peripheralAttention") || "Peripheral Attention"}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-56 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="text-center">
              <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">{t("gradcam.rendering") || "Rendering visual explanation..."}</p>
            </div>
          </div>
        ) : (
          <div className="relative inline-block w-full">
            <canvas
              ref={canvasRef}
              className="w-full max-w-lg mx-auto rounded-xl border border-slate-200 dark:border-slate-700 block"
            />
          </div>
        )}

        {isLowSignal && (
          <div className="rounded-xl bg-blue-50/70 dark:bg-blue-950/40 p-3 border border-blue-200 dark:border-blue-800/60 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">{t("gradcam.diffuseTitle") || "Diffuse Attention (Healthy/Confident Prediction): "} </span>
              {t("gradcam.diffuseBody") || "No localized inflammatory hot spots or lesion patterns were detected on this udder photograph. The model exhibits low, diffuse activation consistent with normal tissue."}
            </div>
          </div>
        )}

        {!isLowSignal && reliability === "moderate" && (
          <div className="rounded-xl bg-amber-50/70 dark:bg-amber-950/40 p-3 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">{t("gradcam.moderateTitle") || "Attention Partially Outside Udder (Supporting Evidence Only): "} </span>
              {reliabilityNote || t("gradcam.moderateDefault") || "Model attention was partially spread across peripheral stall/background elements for this image; treat this visual overlay as supporting evidence alongside clinical observations."}
            </div>
          </div>
        )}

        {!isLowSignal && reliability === "low" && (
          <div className="rounded-xl bg-slate-100/90 dark:bg-slate-800/70 p-3 border border-slate-300 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">{t("gradcam.peripheralTitle") || "Peripheral Focus Advisory: "} </span>
              {reliabilityNote || t("gradcam.peripheralDefault") || "Model focus concentrated primarily on background textures or perimeter cues rather than the central udder tissue. Rely primarily on clinical observations and numerical laboratory tests."}
            </div>
          </div>
        )}

        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {t("gradcam.interpretationTitle") || "Note on AI Heatmap Interpretation:"}
          </p>
          <p>
            {t("gradcam.interpretationBody") || "Warm color overlays highlight areas of the udder where the AI focused its attention during the photo check. This provides supporting visual evidence and does not replace veterinary diagnosis."}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
