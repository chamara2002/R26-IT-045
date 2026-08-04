import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

export default function GradCAMVisualization({ imageUrl, heatmapOverlayUrl, heatmapData, heatmapId, stage }) {
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
    if (heatmapOverlayUrl) return; // already have overlay
    if (!heatmapId) return;

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
            // error, stop polling and fall back to the source image
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

      // Draw original image or heatmap overlay
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

    // Update heatmap flag
    setHasHeatmap(Boolean(heatmapOverlayUrl || heatmapData || heatmapId));

    return () => {
      // revoke object URL if used
      if (displayUrl && displayUrl.startsWith("blob:")) {
        URL.revokeObjectURL(displayUrl);
      }
    };
  }, [displayUrl, heatmapOverlayUrl, heatmapData, heatmapId]);

  const stageColors = {
    Healthy: "from-emerald-400 to-emerald-600",
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
      className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
    >
      <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900">
        <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full bg-gradient-to-r ${stageColors[stage] || stageColors.Medium}`} />
          AI-Generated Udder Health Analysis (Grad-CAM)
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
          {hasHeatmap
            ? "Red/orange areas indicate higher mastitis risk regions. Blue areas show normal tissue."
            : "CNN analysis identifying mastitis indicators in udder image"}
        </p>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-300">Processing image...</p>
            </div>
          </div>
        ) : (
          <div className="relative inline-block w-full">
            <canvas
              ref={canvasRef}
              className="w-full max-w-2xl mx-auto rounded-lg border border-slate-300 dark:border-slate-600"
            />

            {!hasHeatmap && (
              <div className="mt-4 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 flex gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-900 dark:text-blue-100">
                  <p className="font-semibold">Grad-CAM Heatmap Ready</p>
                  <p>Gradient-weighted Class Activation Map highlights the CNN regions contributing to mastitis detection.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
