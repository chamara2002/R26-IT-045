"""Hybrid fusion of the vision pipeline and symptom-checklist probabilities."""


def fuse_predictions(image_probability, symptom_result, image_weight):
    """Combine image and symptom probabilities using a weighted average.

    When no symptom data was provided, the image pipeline is the sole
    source and gets the full weight — this matches how the pure
    image-only endpoint behaves, so /api/predict/assisted degrades
    gracefully to an image-only result if the farmer skips the checklist.
    """
    if symptom_result is None:
        return {
            "probability": float(image_probability),
            "image_weight": 1.0,
            "symptom_weight": 0.0,
            "sources_used": ["image"],
        }

    symptom_weight = round(1 - image_weight, 4)
    fused_probability = (image_weight * image_probability) + (
        symptom_weight * symptom_result["probability"]
    )

    return {
        "probability": float(fused_probability),
        "image_weight": image_weight,
        "symptom_weight": symptom_weight,
        "sources_used": ["image", "symptoms"],
    }
