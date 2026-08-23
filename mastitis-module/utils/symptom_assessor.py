"""
utils/symptom_assessor.py
Optional farmer-friendly symptom checklist and probability adjustment fusion layer.
"""
from typing import Dict, Any, Tuple, Optional


SYMPTOM_WEIGHTS = {
    "milk_has_clots": 0.20,
    "milk_color_changed": 0.15,
    "udder_feels_warm": 0.15,
    "udder_swollen": 0.20,
    "milk_yield_dropped": 0.15,
    "cow_uneasy_during_milking": 0.15,
}

SYMPTOM_QUESTIONS = {
    "milk_has_clots": "Does the milk have visible clots or lumps?",
    "milk_color_changed": "Does the milk look unusual in color (yellowish, pinkish, or watery)?",
    "udder_feels_warm": "Does the udder feel warmer than usual when touched?",
    "udder_swollen": "Does the udder look swollen?",
    "milk_yield_dropped": "Has milk yield suddenly dropped in the past few days?",
    "cow_uneasy_during_milking": "Does the cow seem uneasy or resist during milking?",
}


def _is_truthy(val: Any) -> bool:
    """Check if a value represents a positive/yes answer."""
    if isinstance(val, bool):
        return val
    if isinstance(val, (int, float)):
        return val > 0
    if isinstance(val, str):
        return val.strip().lower() in ("true", "yes", "y", "1", "positive", "present")
    return False


def _is_falsy(val: Any) -> bool:
    """Check if a value represents an explicit negative/no answer."""
    if isinstance(val, bool):
        return not val
    if isinstance(val, (int, float)):
        return val == 0
    if isinstance(val, str):
        return val.strip().lower() in ("false", "no", "n", "0", "negative", "absent", "none")
    return False


def evaluate_symptoms(symptoms_dict: Optional[Dict[str, Any]]) -> Tuple[float, Dict[str, bool], bool]:
    """
    Evaluate symptoms dictionary against canonical checklist.

    Returns:
        symptom_score: float (0.0 to 1.0)
        symptoms_reported: dict of only positive/yes symptoms {symptom_name: True}
        has_answered: bool indicating if at least one question was answered
    """
    if not symptoms_dict or not isinstance(symptoms_dict, dict):
        return 0.0, {}, False

    symptoms_reported = {}
    has_answered = False
    symptom_score = 0.0

    for key, weight in SYMPTOM_WEIGHTS.items():
        if key in symptoms_dict and symptoms_dict[key] not in (None, "", "null"):
            val = symptoms_dict[key]
            has_answered = True
            if _is_truthy(val):
                symptoms_reported[key] = True
                symptom_score += weight

    symptom_score = min(1.0, round(symptom_score, 4))
    return symptom_score, symptoms_reported, has_answered


def apply_symptom_fusion(
    model_probability: float,
    symptoms_dict: Optional[Dict[str, Any]],
    model_weight: float = 0.85,
    symptom_weight: float = 0.15
) -> Tuple[float, Dict[str, Any]]:
    """
    Blend symptom score into base ML model probability:
    final_probability = (0.85 * model_probability) + (0.15 * symptom_score)

    If no symptoms were answered, returns base probability unchanged with adjustment_applied=False.

    Returns:
        final_probability: float
        symptom_assessment: dict matching API schema
    """
    symptom_score, symptoms_reported, has_answered = evaluate_symptoms(symptoms_dict)

    if not has_answered:
        return model_probability, {
            "symptoms_reported": {},
            "symptom_score": None,
            "adjustment_applied": False,
            "probability_before_adjustment": None,
            "probability_after_adjustment": None,
        }

    final_probability = round((model_weight * model_probability) + (symptom_weight * symptom_score), 4)

    symptom_assessment = {
        "symptoms_reported": symptoms_reported,
        "symptom_score": round(symptom_score, 4),
        "adjustment_applied": True,
        "probability_before_adjustment": round(model_probability, 4),
        "probability_after_adjustment": final_probability,
    }

    return final_probability, symptom_assessment
