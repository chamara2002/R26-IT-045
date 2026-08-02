import { motion } from "framer-motion";
import { BarChart3, Zap } from "lucide-react";

export default function MultimodalFusionDisplay({ result }) {
  if (!result) return null;

  const imageConfidence = result.image_prediction?.mastitis_confidence
    ? (result.image_prediction.mastitis_confidence * 100).toFixed(1)
    : null;

  const healthConfidence = result.health_prediction?.mastitis_confidence
    ? (result.health_prediction.mastitis_confidence * 100).toFixed(1)
    : null;

  const overallConfidence = result.overall_prediction?.confidence
    ? (result.overall_prediction.confidence * 100).toFixed(1)
    : null;

  const behaviorConfidence = result.behavior_assessment?.confidence
    ? (result.behavior_assessment.confidence * 100).toFixed(1)
    : null;

  const sources = result.overall_prediction?.sources_used || ["image"];

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.28 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800 p-6 shadow-sm"
    >
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/20">
          <Zap className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Combined Health Check
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            The app uses your photo, cow data, and what you observed to give the best result
          </p>
        </div>
      </div>

      {/* Data Sources Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {/* Image Analysis */}
        {imageConfidence !== null && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0 }}
            className="p-4 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20"
          >
            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-2 uppercase tracking-wide">
              📷 Image Analysis
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {imageConfidence}%
              </span>
              <span className="text-xs text-blue-700 dark:text-blue-300">how sure we are</span>
            </div>
            <div className="mt-2 w-full bg-blue-200 dark:bg-blue-800 rounded-full h-1.5">
              <div
                className="bg-blue-600 dark:bg-blue-400 h-1.5 rounded-full"
                style={{ width: `${imageConfidence}%` }}
              />
            </div>
          </motion.div>
        )}

        {/* Health Parameters */}
        {healthConfidence !== null && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.05 }}
            className="p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20"
          >
            <div className="text-xs font-semibold text-amber-700 dark:text-amber-300 mb-2 uppercase tracking-wide">
              📊 Health Data
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                {healthConfidence}%
              </span>
              <span className="text-xs text-amber-700 dark:text-amber-300">how sure we are</span>
            </div>
            <div className="mt-2 w-full bg-amber-200 dark:bg-amber-800 rounded-full h-1.5">
              <div
                className="bg-amber-600 dark:bg-amber-400 h-1.5 rounded-full"
                style={{ width: `${healthConfidence}%` }}
              />
            </div>
            {result.input_summary?.health_inputs && (
              <div className="text-xs text-amber-700 dark:text-amber-300 mt-2 space-y-1">
                {result.input_summary.health_inputs.milk_temperature && (
                  <p>🌡️ Temp: {result.input_summary.health_inputs.milk_temperature}°C</p>
                )}
                {result.input_summary.health_inputs.milk_yield && (
                  <p>💧 Yield: {result.input_summary.health_inputs.milk_yield}L</p>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* Behavior Assessment */}
        {behaviorConfidence !== null && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="p-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20"
          >
            <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2 uppercase tracking-wide">
              🐄 Behavior
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-900 dark:text-purple-100">
                {behaviorConfidence}%
              </span>
              <span className="text-xs text-purple-700 dark:text-purple-300">how sure we are</span>
            </div>
            <div className="mt-2 w-full bg-purple-200 dark:bg-purple-800 rounded-full h-1.5">
              <div
                className="bg-purple-600 dark:bg-purple-400 h-1.5 rounded-full"
                style={{ width: `${behaviorConfidence}%` }}
              />
            </div>
          </motion.div>
        )}

        {/* Overall Consensus */}
        {overallConfidence !== null && (
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.15 }}
            className="p-4 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20"
          >
            <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-2 uppercase tracking-wide">
              ✓ Final Result
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">
                {overallConfidence}%
              </span>
              <span className="text-xs text-emerald-700 dark:text-emerald-300">overall</span>
            </div>
            <div className="mt-2 w-full bg-emerald-200 dark:bg-emerald-800 rounded-full h-1.5">
              <div
                className="bg-emerald-600 dark:bg-emerald-400 h-1.5 rounded-full"
                style={{ width: `${overallConfidence}%` }}
              />
            </div>
          </motion.div>
        )}
      </div>

      {/* Data Sources Used */}
      <div className="p-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            What Was Checked
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {sources.map((source) => (
            <span
              key={source}
              className="px-3 py-1 rounded-full text-xs font-medium bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600"
            >
              {source === "image" && "📷 Cow Photo"}
              {source === "health_inputs" && "📊 Cow Health Details"}
              {source === "behavior" && "🐄 Farmer Observations"}
            </span>
          ))}
        </div>
      </div>

      {/* Fusion Explanation */}
      <div className="mt-4 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 text-xs text-blue-900 dark:text-blue-100">
        <p className="font-semibold mb-1">💡 How This Works</p>
        <p>
          The app looks at your cow's photo to find problem areas, then checks the milk and health
          details you entered, and adds what you noticed about the cow's behaviour. The more
          information you give, the better the result.
        </p>
      </div>
    </motion.div>
  );
}
