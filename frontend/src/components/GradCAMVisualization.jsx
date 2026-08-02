/**
 * GradCAMVisualization – displays Grad-CAM heatmap overlay on the original image.
 * Currently hidden in DetectionPage (guarded by {false && ...}) but the import
 * must resolve for Vite's module graph to build correctly.
 */
export default function GradCAMVisualization({
  imageUrl,
  heatmapOverlayUrl,
  heatmapData,
  heatmapId,
  stage,
}) {
  if (!imageUrl) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Area of Concern on the Cow
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          The coloured map shows which part of the udder the system is looking at
        </p>
      </div>

      <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Original image */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Original
          </p>
          <img
            src={imageUrl}
            alt="Original cattle"
            className="w-full rounded-lg object-cover border border-slate-200 dark:border-slate-700"
          />
        </div>

        {/* Heatmap overlay */}
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            Your Photo
          </p>
          {heatmapOverlayUrl ? (
            <img
              src={heatmapOverlayUrl}
              alt="Grad-CAM heatmap overlay"
              className="w-full rounded-lg object-cover border border-slate-200 dark:border-slate-700"
            />
          ) : (
            <div className="w-full aspect-video rounded-lg border border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-900/50">
              <p className="text-sm text-slate-400 dark:text-slate-500">
                Area map not available
              </p>
            </div>
          )}
        </div>
      </div>

      {stage && (
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-700 text-sm text-slate-500 dark:text-slate-400">
          Stage: <span className="font-medium text-slate-700 dark:text-slate-300">{stage}</span>
          {heatmapId && (
            <span className="ml-4 text-xs text-slate-400 dark:text-slate-500">ID: {heatmapId}</span>
          )}
        </div>
      )}
    </div>
  );
}
