"""Transparent image + weather hybrid decision layer.

Two independent signals are combined here, and neither is ever silently
dropped or multiplied into a single opaque number:

  - Image assessment: does the uploaded photograph show FMD-consistent
    lesions? (per-animal signal, from fmd_model.h5)
  - Weather risk: how favourable are current conditions at the farmer's farm
    location for FMD spread? (farm/area signal, from the rule-based weather
    risk scorer)

A positive image result is never downgraded just because environmental risk
is low — a sick animal is a sick animal regardless of the weather. Weather
risk instead adds urgency/context on top of, or in place of, the image
result when the image itself is negative.
"""

from __future__ import annotations

from typing import Any, Dict, Optional

IMAGE_POSITIVE_TEXT = "FMD-consistent lesions detected"
IMAGE_NEGATIVE_TEXT = "No visible FMD lesions detected"

# (image_is_positive, weather_level) -> (overall assessment, recommendation)
_DECISION_TABLE: Dict[tuple, tuple] = {
    (True, "HIGH"): (
        "HIGH CONCERN",
        "Isolate the suspected animal immediately and seek veterinary confirmation. "
        "Current weather also favours FMD spread in your area — tighten biosecurity for the rest of the herd.",
    ),
    (True, "MEDIUM"): (
        "HIGH CONCERN",
        "Isolate the suspected animal and seek veterinary confirmation as soon as possible.",
    ),
    (True, "LOW"): (
        "POSSIBLE FMD",
        "Isolate the suspected animal and seek veterinary confirmation. "
        "Environmental conditions are currently low-risk, but the image result should still be checked by a vet.",
    ),
    (False, "HIGH"): (
        "ELEVATED ENVIRONMENTAL RISK",
        "No lesions were seen in this image, but current weather conditions favour FMD spread in your area. "
        "Continue close monitoring and maintain strict biosecurity measures.",
    ),
    (False, "MEDIUM"): (
        "MODERATE ENVIRONMENTAL RISK",
        "No lesions were seen in this image. Monitor the herd and maintain standard biosecurity practices.",
    ),
    (False, "LOW"): (
        "LOW CURRENT CONCERN",
        "No lesions were seen in this image and environmental risk is currently low. Continue routine monitoring.",
    ),
}


def image_assessment_text(predicted_label: str) -> str:
    return IMAGE_POSITIVE_TEXT if str(predicted_label) == "1" else IMAGE_NEGATIVE_TEXT


def combine_image_and_weather(
    predicted_label: str,
    image_confidence: float,
    weather_risk_level: Optional[str],
) -> Dict[str, Any]:
    """Build the transparent hybrid result. weather_risk_level is one of
    "LOW"/"MEDIUM"/"HIGH", or None if weather is unavailable (missing farm
    location, or the weather API failed) — in which case the assessment
    falls back to the image result alone and says so explicitly.
    """
    image_positive = str(predicted_label) == "1"
    image_text = image_assessment_text(predicted_label)

    if weather_risk_level not in ("LOW", "MEDIUM", "HIGH"):
        overall = "POSSIBLE FMD" if image_positive else "LOW CURRENT CONCERN (IMAGE ONLY)"
        recommendation = (
            "Isolate the suspected animal and seek veterinary confirmation. "
            "Weather-based environmental risk is unavailable, so this result is based on the image alone."
            if image_positive
            else "No lesions were seen in this image. Weather-based environmental risk is unavailable, "
            "so continue routine monitoring based on the image result alone."
        )
        explanation = (
            f"Image analysis: {image_text} ({image_confidence * 100:.1f}% confidence). "
            "Weather risk could not be determined (no farm location saved, or the weather service is unavailable)."
        )
        return {
            "image_result": image_text,
            "image_confidence": round(image_confidence, 4),
            "weather_available": False,
            "weather_risk_level": None,
            "overall_assessment": overall,
            "recommendation": recommendation,
            "explanation": explanation,
        }

    overall, recommendation = _DECISION_TABLE[(image_positive, weather_risk_level)]
    explanation = (
        f"Image analysis: {image_text} ({image_confidence * 100:.1f}% confidence). "
        f"Weather-based FMD spread risk at your farm location: {weather_risk_level}. "
        f"Combined assessment: {overall}."
    )
    return {
        "image_result": image_text,
        "image_confidence": round(image_confidence, 4),
        "weather_available": True,
        "weather_risk_level": weather_risk_level,
        "overall_assessment": overall,
        "recommendation": recommendation,
        "explanation": explanation,
    }
