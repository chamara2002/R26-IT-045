import joblib
import numpy as np
import os

MODEL_DIR = os.path.join(os.path.dirname(__file__), '..', 'model')

_model   = joblib.load(os.path.join(MODEL_DIR, 'milk_fever_model.pkl'))
_scaler  = joblib.load(os.path.join(MODEL_DIR, 'scaler.pkl'))
_le      = joblib.load(os.path.join(MODEL_DIR, 'label_encoder.pkl'))

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
        "Administer IV calcium borogluconate ONLY if you are trained to do so. "
        "Download the veterinary report below and bring it to your vet immediately."
    ),
}

STAGE_SCORE_BANDS = {
    'Subclinical': (0,  24),
    'Mild':        (25, 49),
    'Moderate':    (50, 69),
    'Critical':    (70, 100),
}

def predict(feature_array_raw):
    X_scaled = _scaler.transform(feature_array_raw)
    proba    = _model.predict_proba(X_scaled)[0]
    idx      = int(np.argmax(proba))
    stage    = _le.inverse_transform([idx])[0]
    conf     = float(proba[idx])
    low, high = STAGE_SCORE_BANDS[stage]
    risk_score = int(low + conf * (high - low))

    return {
        "disease":    "Milk Fever (Bovine Hypocalcemia)",
        "stage":      stage,
        "confidence": round(conf, 4),
        "risk_score": risk_score,
        "advice":     STAGE_ADVICE[stage],
        "requires_vet_report": stage == 'Critical',
    }