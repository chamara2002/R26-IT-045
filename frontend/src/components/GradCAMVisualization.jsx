import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Eye } from "lucide-react";

export default function GradCAMVisualization({ imageUrl, heatmapOverlayUrl, heatmapData, heatmapId, stage, roiApplied = false }) {
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [hasHeatmap, setHasHeatmap] = useState(false);
  const [displayUrl, setDisplayUrl] = useState(heatmapOverlayUrl || imageUrl);
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
              Visual Explainability (Grad-CAM)
            </h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Highlighted areas show regions that influenced the image model&apos;s prediction.
          </p>
        </div>

        {roiApplied && (
          <span className="self-start sm:self-center px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-400 text-[11px] font-bold border border-teal-200 dark:border-teal-800 shrink-0">
            Udder ROI Focused
          </span>
        )}
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-56 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
            <div className="text-center">
              <div className="w-8 h-8 border-3 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-2" />
              <p className="text-xs text-slate-500 dark:text-slate-400">Rendering visual explanation...</p>
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

        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/40 p-3 border border-slate-200/60 dark:border-slate-700/60 text-xs text-slate-600 dark:text-slate-400 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            Note on AI Heatmap Interpretation:
          </p>
          <p>
            Warm color overlays indicate udder image regions given high weight by the CNN. Grad-CAM visualizes model focus for veterinary decision support and is not definitive proof of disease.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
