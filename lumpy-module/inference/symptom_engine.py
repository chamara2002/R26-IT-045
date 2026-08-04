"""
LSD risk fusion engine.

Combines the ResNet-50 image-based LSD probability with the farmer's optional
clinical checklist (visible nodules, fever, lymph node swelling, etc.) into a
single probability percentage and a Low/Medium/High risk tier, following the
thresholds and guidance text defined in the LSD component proposal
(Chapter 3.6 - Web-Based Application Development):

    Low probability    (0-30%):  "Low risk. Continue monitoring. Maintain
                                   regular health checks."
    Medium probability (30-70%): "Moderate risk detected. Isolate the animal
                                   and monitor closely. Consider consulting a
                                   veterinarian."
    High probability   (70-100%): "High risk of LSD detected. Immediate
                                    veterinary consultation is strongly
                                    advised. Isolate the animal from the herd."

The symptom checklist is a transparent rule-based heuristic (no labelled
symptom dataset exists to train it) that nudges the image-based probability
up or down; it never fully overrides the ResNet-50 output.
"""
from inference.api_config import get_config

config = get_config()

# Boolean symptom signals -> relative weight in the checklist score.
SYMPTOM_WEIGHTS = {
    "skin_nodules": 1.5,
    "nodule_on_head": 1.0,
    "nodule_on_legs": 1.0,
    "high_fever": 1.25,
    "swollen_lymph_nodes": 1.25,
    "nasal_discharge": 0.75,
    "reduced_milk": 0.75,
    "decreased_appetite": 0.75,
}


def _truthy(value):
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "on"}
    return bool(value)


def _nodule_count_score(nodule_count):
    try:
        count = float(nodule_count)
    except (TypeError, ValueError):
        return None
    if count <= 0:
        return 0.0
    if count <= 5:
        return 0.3
    if count <= 15:
        return 0.6
    return 1.0


def _nodule_distribution_score(distribution):
    mapping = {"localised": 0.2, "scattered": 0.6, "widespread": 1.0}
    if not distribution:
        return None
    return mapping.get(str(distribution).strip().lower())


def _temperature_score(body_temperature):
    try:
        temp = float(body_temperature)
    except (TypeError, ValueError):
        return None
    if temp < 39.5:
        return 0.0
    if temp < 40.0:
        return 0.4
    if temp < 41.0:
        return 0.7
    return 1.0


def assess_symptoms(symptoms):
    """Convert the optional farmer-reported symptom checklist into a risk signal.

    `symptoms` is the parsed JSON dict sent by the frontend's LSD form, e.g.:
        {
          "skin_nodules": true, "nodule_on_head": false, ...,
          "nodule_count": "15", "nodule_distribution": "scattered",
          "body_temperature": "41.0"
        }

    Returns None if no usable symptom data was provided.
    """
    if not symptoms or not isinstance(symptoms, dict):
        return None

    weighted_score = 0.0
    total_weight = 0.0
    provided_signals = {}
    any_provided = False

    for signal_name, weight in SYMPTOM_WEIGHTS.items():
        if signal_name in symptoms:
            any_provided = True
        raw_value = symptoms.get(signal_name, False)
        normalized = _truthy(raw_value)
        provided_signals[signal_name] = normalized
        total_weight += weight
        if normalized:
            weighted_score += weight

    extra_terms = [
        (_nodule_count_score(symptoms.get("nodule_count")), 1.0),
        (_nodule_distribution_score(symptoms.get("nodule_distribution")), 0.75),
        (_temperature_score(symptoms.get("body_temperature")), 1.25),
    ]
    for score, weight in extra_terms:
        if score is not None:
            any_provided = True
            total_weight += weight
            weighted_score += score * weight

    if not any_provided or total_weight == 0:
        return None

    risk_ratio = weighted_score / total_weight

    if risk_ratio >= 0.7:
        risk_label = "High"
    elif risk_ratio >= 0.35:
        risk_label = "Medium"
    else:
        risk_label = "Low"

    return {
        "risk_label": risk_label,
        "score": float(risk_ratio),
        "signals": provided_signals,
        "nodule_count": symptoms.get("nodule_count"),
        "nodule_distribution": symptoms.get("nodule_distribution"),
        "body_temperature": symptoms.get("body_temperature"),
    }


def _risk_tier(probability):
    if probability < config.LOW_RISK_MAX:
        return {
            "level": "low",
            "label": "Low Risk",
            "recommendation": "Low risk. Continue monitoring. Maintain regular health checks.",
        }
    if probability < config.MEDIUM_RISK_MAX:
        return {
            "level": "medium",
            "label": "Moderate Risk",
            "recommendation": "Moderate risk detected. Isolate the animal and monitor closely. "
                               "Consider consulting a veterinarian.",
        }
    return {
        "level": "high",
        "label": "High Risk",
        "recommendation": "High risk of LSD detected. Immediate veterinary consultation is "
                           "strongly advised. Isolate the animal from the herd.",
    }


def fuse_prediction(image_lsd_probability, symptoms=None, image_weight=None):
    """Fuse the ResNet-50 image probability with the optional symptom checklist.

    Returns a dict with the overall probability, risk tier, guidance text and
    a breakdown of each source that fed into the fusion, so the response stays
    auditable rather than a black box.
    """
    image_weight = image_weight if image_weight is not None else config.IMAGE_WEIGHT
    symptom_assessment = assess_symptoms(symptoms)

    if symptom_assessment is not None:
        overall_probability = (
            image_weight * image_lsd_probability
            + (1 - image_weight) * symptom_assessment["score"]
        )
        sources_used = ["image", "symptoms"]
    else:
        overall_probability = image_lsd_probability
        sources_used = ["image"]

    overall_probability = max(0.0, min(1.0, overall_probability))
    tier = _risk_tier(overall_probability)

    return {
        "overall_probability": float(overall_probability),
        "risk_level": tier["level"],
        "risk_label": tier["label"],
        "recommendation": tier["recommendation"],
        "sources_used": sources_used,
        "image_weight": image_weight if symptom_assessment is not None else 1.0,
        "symptom_assessment": symptom_assessment,
    }
