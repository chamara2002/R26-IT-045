"""Rule-based clinical symptom scoring for Lumpy Skin Disease (LSD).

This turns the optional farmer-reported symptom checklist (see the LSD form
in frontend/src/pages/DetectionPage.jsx) into a 0-1 "symptom probability"
that can be fused with the vision pipeline's prediction.

Deliberately excluded: anything about nodules themselves — presence, count,
site (head/legs/etc.), or distribution pattern. The vision pipeline already
detects, localises and counts nodules directly from the photograph, which is
strictly more reliable than a farmer's visual estimate of the same thing.
Scoring nodule-related checklist answers here would double-count the same
visual evidence under a second set of weights instead of combining
genuinely independent signals. Only clinical signs the camera cannot see are
scored below.

Weights are grounded in LSD's real clinical presentation (FAO/OIE technical
guidance on Lumpy Skin Disease), not arbitrary numbers:

- Superficial lymph node swelling (lymphadenitis) is one of the most
  specific early indicators, often appearing just before or alongside the
  first nodules.
- High fever (>=40C) is a well-documented prodromal sign that can precede
  visible nodules by 1-2 days.
- Nose discharge, eye discharge, reduced milk yield, and reduced appetite
  are real but non-specific systemic signs shared with many other cattle
  illnesses, so they carry smaller weights. Nose and eye discharge are
  scored separately since a cow can present with one without the other.
"""

BOOLEAN_SYMPTOM_WEIGHTS = {
    "swollen_lymph_nodes": 2.5,
    "high_fever": 2.0,
    "nose_discharge": 0.75,
    "eye_discharge": 0.75,
    "reduced_milk": 1.0,
    "decreased_appetite": 0.75,
}

BODY_TEMPERATURE_WEIGHT = 1.5
BODY_TEMPERATURE_NORMAL = 38.5   # normal cattle temperature -> no contribution
BODY_TEMPERATURE_SEVERE = 41.5   # severe LSD fever -> full contribution

RISK_LABEL_HIGH = 0.6
RISK_LABEL_MEDIUM = 0.3


def _coerce_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "y", "on"}
    return bool(value)


def _coerce_float(value):
    if value in (None, ""):
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def assess_symptoms(symptoms):
    """Score the optional LSD symptom checklist into a 0-1 probability.

    Returns None when nothing meaningful was reported (all boxes unchecked
    and no numeric details filled in), so callers can fall back to an
    image-only decision instead of letting an empty form drag the fused
    score toward zero.
    """
    if not isinstance(symptoms, dict):
        return None

    provided_signals = {}
    weighted_score = 0.0
    total_weight = 0.0
    any_signal_reported = False

    for name, weight in BOOLEAN_SYMPTOM_WEIGHTS.items():
        value = _coerce_bool(symptoms.get(name, False))
        provided_signals[name] = value
        total_weight += weight
        if value:
            weighted_score += weight
            any_signal_reported = True

    body_temperature = _coerce_float(symptoms.get("body_temperature"))
    if body_temperature is not None:
        ratio = (body_temperature - BODY_TEMPERATURE_NORMAL) / (
            BODY_TEMPERATURE_SEVERE - BODY_TEMPERATURE_NORMAL
        )
        ratio = max(0.0, min(ratio, 1.0))
        total_weight += BODY_TEMPERATURE_WEIGHT
        weighted_score += ratio * BODY_TEMPERATURE_WEIGHT
        provided_signals["body_temperature"] = body_temperature
        any_signal_reported = True

    if not any_signal_reported:
        return None

    probability = weighted_score / total_weight if total_weight else 0.0

    if probability >= RISK_LABEL_HIGH:
        risk_label = "High"
    elif probability >= RISK_LABEL_MEDIUM:
        risk_label = "Medium"
    else:
        risk_label = "Low"

    return {
        "probability": float(probability),
        "risk_label": risk_label,
        "signals": provided_signals,
    }
