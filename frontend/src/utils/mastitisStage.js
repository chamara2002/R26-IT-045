const STAGE_ORDER = ["Healthy", "Mild", "Moderate", "Severe"];

const STAGE_ALIASES = {
  Low: "Healthy",
  Medium: "Mild",
  High: "Moderate",
  Critical: "Severe",
  Healthy: "Healthy",
  Mild: "Mild",
  Moderate: "Moderate",
  Severe: "Severe",
};

const getStageSource = (result) => result?.severity || result || {};

export const getMastitisStage = (result) => {
  if (!result) {
    return "Healthy";
  }

  const stageSource = getStageSource(result);
  const explicitStage = STAGE_ALIASES[stageSource.stage] || STAGE_ALIASES[stageSource.severity_level] || STAGE_ALIASES[stageSource.display_label];
  if (explicitStage) {
    return explicitStage;
  }

  const prediction = String(stageSource.prediction || result.prediction || "").toLowerCase();
  if (prediction === "normal") {
    return "Healthy";
  }

  const confidenceSource = stageSource.confidence_score ?? result.overall_prediction?.confidence ?? result.confidence ?? 0;
  const confidence = Number(confidenceSource) || 0;

  if (confidence < 0.55) return "Mild";
  if (confidence < 0.8) return "Moderate";
  return "Severe";
};

export const getMastitisStageLabel = (stage) => stage || "Healthy";

export const getMastitisStageIndex = (stage) => {
  const normalized = STAGE_ALIASES[stage] || "Healthy";
  return STAGE_ORDER.indexOf(normalized);
};

export const getMastitisStageMeta = (result) => {
  const stage = getMastitisStage(result);
  const stageSource = getStageSource(result);

  const meta = {
    Healthy: {
      label: "Healthy",
      displayLabel: "Healthy",
      chip: "bg-emerald-100 text-emerald-800 border-emerald-200",
      panel: "border-emerald-200 bg-emerald-50 text-emerald-950",
      accent: "from-emerald-500 to-emerald-600",
      summary: "No clear mastitis signs were detected. Continue normal care and routine monitoring.",
      doNow: ["Keep milking hygiene clean.", "Check udder and milk daily.", "Maintain balanced feed and water."],
      vet: "Contact a veterinarian if swelling, heat, clots, or milk drop appears.",
    },
    Mild: {
      label: "Mild",
      displayLabel: "Stage 1: Mild",
      chip: "bg-amber-100 text-amber-800 border-amber-200",
      panel: "border-amber-200 bg-amber-50 text-amber-950",
      accent: "from-amber-500 to-amber-600",
      summary: "Early mastitis warning signs are present. Act quickly to stop it getting worse.",
      doNow: ["Milk the cow carefully and keep the udder clean.", "Separate the cow for closer observation.", "Record milk changes and check again within 24 hours."],
      vet: "Call a veterinarian if the udder stays painful, milk changes continue, or the cow worsens.",
    },
    Moderate: {
      label: "Moderate",
      displayLabel: "Stage 2: Moderate",
      chip: "bg-orange-100 text-orange-800 border-orange-200",
      panel: "border-orange-200 bg-orange-50 text-orange-950",
      accent: "from-orange-500 to-orange-600",
      summary: "Mastitis signs are stronger. Treatment and close monitoring are needed now.",
      doNow: ["Isolate the cow from the herd.", "Keep the udder and shed very clean and dry.", "Do not ignore clots, swelling, or reduced milk."],
      vet: "Arrange veterinary advice today for treatment and follow-up.",
    },
    Severe: {
      label: "Severe",
      displayLabel: "Stage 3: Severe",
      chip: "bg-red-100 text-red-800 border-red-200",
      panel: "border-red-200 bg-red-50 text-red-950",
      accent: "from-red-500 to-red-600",
      summary: "Severe mastitis risk is high. This needs urgent veterinary attention.",
      doNow: ["Separate the cow immediately.", "Avoid delaying treatment or milking without advice.", "Watch for fever, pain, blood, or rapid milk loss."],
      vet: "Call a veterinarian immediately and follow emergency treatment guidance.",
    },
  };

  return { stage, rank: getMastitisStageIndex(stage), ...meta[stage], source: stageSource };
};