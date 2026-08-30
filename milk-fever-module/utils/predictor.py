import joblib
import numpy as np
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'model')

_model  = joblib.load(os.path.join(MODEL_DIR, 'milk_fever_model.pkl'))
_scaler = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
_le     = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.pkl'))

STAGE_ADVICE = {
    'Subclinical': (
        "Low-level risk detected. Increase monitoring frequency. "
        "Ensure adequate pre-calving dietary calcium management (DCAD). "
        "Record daily activity and milk yield trends."
    ),
    'Mild': (
        "Mild risk detected. Begin oral calcium supplementation. "
        "Adjust diet to improve calcium bioavailability. "
        "Monitor closely for the next 48-72 hours post-calving."
    ),
    'Moderate': (
        "Moderate risk detected. Administer preventive calcium treatment on-farm. "
        "Place animal under close observation. "
        "Contact a livestock extension officer. "
        "Prepare for veterinary consultation if condition worsens."
    ),
    'Critical': (
        "CRITICAL: Immediate veterinary attendance required. "
        "Do not leave the animal unattended. "
        "First-aid: Keep animal in sternal recumbency, provide warmth. "
        "Administer IV calcium borogluconate ONLY if trained to do so. "
        "Download the veterinary report and bring to vet immediately."
    ),
}

STAGE_SCORE_BANDS = {
    'Subclinical': (0,  24),
    'Mild':        (25, 49),
    'Moderate':    (50, 69),
    'Critical':    (70, 100),
}

# ── Clinical explanation generator ───────────────────────────────────────────
def generate_explanation(feature_dict, stage, thi=None):
    """
    Generates a human-readable explanation of WHY this prediction
    was made based on the input features.
    """
    reasons = []
    warnings_list = []

    p  = feature_dict.get('parity', 1)
    ca = feature_dict.get('blood_calcium', 9.0)
    ac = feature_dict.get('activity_level', 100)
    dc = feature_dict.get('days_to_calving', 10)
    bs = feature_dict.get('bcs', 3.0)
    my = feature_dict.get('milk_yield_day1', 18.0)

    # Parity
    if p >= 4:
        warnings_list.append(
            f"Parity {p} — cows with 4+ calvings have significantly higher milk fever risk"
        )
    elif p >= 2:
        warnings_list.append(
            f"Parity {p} — multiparous cows have elevated risk compared to heifers"
        )
    else:
        reasons.append("First calving — lower baseline milk fever risk")

    # Blood calcium
    if ca < 6.0:
        warnings_list.append(
            f"Blood calcium {ca} mg/dL — severely low (normal: 8.5–10.5 mg/dL)"
        )
    elif ca < 7.5:
        warnings_list.append(
            f"Blood calcium {ca} mg/dL — below normal range"
        )
    elif ca < 8.5:
        warnings_list.append(
            f"Blood calcium {ca} mg/dL — borderline low"
        )
    else:
        reasons.append(
            f"Blood calcium {ca} mg/dL — within normal range"
        )

    # Activity
    if ac < 20:
        warnings_list.append(
            "Severely reduced activity — strong indicator of physiological distress"
        )
    elif ac < 40:
        warnings_list.append(
            "Reduced activity detected — early behavioral deterioration sign"
        )
    elif ac < 60:
        warnings_list.append(
            "Moderately reduced activity — monitoring recommended"
        )
    else:
        reasons.append("Activity level normal — no behavioral concern")

    # Days to calving
    if dc <= 3:
        warnings_list.append(
            f"Day {dc} post-calving — peak milk fever risk window (0–3 days)"
        )
    elif dc <= 7:
        warnings_list.append(
            f"Day {dc} post-calving — elevated risk period (4–7 days)"
        )
    else:
        reasons.append(f"Day {dc} post-calving — past peak risk window")

    # BCS
    if bs > 3.8:
        warnings_list.append(
            f"BCS {bs} — over-conditioned cows have higher metabolic disease risk"
        )
    elif bs < 2.5:
        warnings_list.append(
            f"BCS {bs} — thin body condition reduces calcium mobilization capacity"
        )
    else:
        reasons.append(f"BCS {bs} — acceptable body condition")

    # Milk yield
    if my < 8:
        warnings_list.append(
            f"Low milk yield ({my} kg) — may indicate reduced feed intake or weakness"
        )

    # Weather THI
    if thi is not None:
        if thi >= 80:
            warnings_list.append(
                f"Severe heat stress (THI: {thi}) — significantly increases milk fever susceptibility"
            )
        elif thi >= 72:
            warnings_list.append(
                f"Moderate heat stress (THI: {thi}) — increases calcium metabolism disruption risk"
            )
        elif thi >= 68:
            warnings_list.append(
                f"Mild heat stress (THI: {thi}) — minor additional risk factor"
            )

    return {
        "warning_factors": warnings_list,
        "positive_factors": reasons,
        "total_risk_factors": len(warnings_list),
    }


# ── Weather THI risk adjustment ───────────────────────────────────────────────
def apply_thi_adjustment(risk_score, thi):
    if thi is None:
        return risk_score, 0
    if thi >= 80:   adjustment = 15
    elif thi >= 79: adjustment = 10
    elif thi >= 72: adjustment = 5
    else:           adjustment = 0
    adjusted = min(100, risk_score + adjustment)
    return adjusted, adjustment


def predict(feature_array_raw, feature_dict=None, thi=None):
    """
    Main prediction function.
    """
    X_scaled = _scaler.transform(feature_array_raw)
    proba    = _model.predict_proba(X_scaled)[0]
    idx      = int(np.argmax(proba))
    stage    = _le.inverse_transform([idx])[0]
    conf     = float(proba[idx])

    low, high  = STAGE_SCORE_BANDS[stage]
    base_score = int(low + conf * (high - low))

    # Apply THI adjustment
    adjusted_score, thi_adjustment = apply_thi_adjustment(base_score, thi)

    # Re-evaluate stage after THI adjustment
    final_stage = stage
    if thi_adjustment > 0:
        for s, (l, h) in STAGE_SCORE_BANDS.items():
            if l <= adjusted_score <= h:
                final_stage = s
                break

    # Generate explanation
    explanation = None
    if feature_dict:
        explanation = generate_explanation(feature_dict, final_stage, thi)

    return {
        "disease":           "Milk Fever (Bovine Hypocalcemia)",
        "stage":             final_stage,
        "confidence":        round(conf, 4),
        "risk_score":        adjusted_score,
        "base_risk_score":   base_score,
        "thi_adjustment":    thi_adjustment,
        "advice":            STAGE_ADVICE[final_stage],
        "requires_vet_report": final_stage == 'Critical',
        "explanation":       explanation,
        "feature_values":    feature_dict,
    }