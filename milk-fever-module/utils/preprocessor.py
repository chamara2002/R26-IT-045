import numpy as np

FEATURES = [
    'parity', 'blood_calcium', 'blood_phosphorus',
    'bcs', 'days_to_calving', 'milk_yield_day1',
    'activity_level', 'dcad'
]

FEATURE_RANGES = {
    'parity':           (1, 12),
    'blood_calcium':    (2.0, 15.0),
    'blood_phosphorus': (1.0, 12.0),
    'bcs':              (1.0, 5.0),
    'days_to_calving':  (0, 30),
    'milk_yield_day1':  (0.0, 60.0),
    'activity_level':   (0.0, 100.0),
    'dcad':             (-300.0, 300.0),
}

# ── Symptom to blood calcium estimation ───────────────────────────────────────
def estimate_blood_calcium(form_data):
    """
    Estimates blood calcium from observable symptoms when
    lab value is not provided by the farmer.
    Baseline healthy cow: 9.0 mg/dL
    """
    calcium = 9.0
    behavioral = form_data.get('behavioral', 'normal')
    cannot_stand   = form_data.get('cannot_stand', False)
    muscle_tremors = form_data.get('muscle_tremors', False)
    drooling       = form_data.get('excessive_drooling', False)
    cold_ears      = form_data.get('cold_ears', False)

    # Behavioral deductions
    if behavioral == 'unable_to_stand':  calcium -= 2.5
    elif behavioral == 'muscle_tremors': calcium -= 1.5
    elif behavioral == 'reduced_movement': calcium -= 0.8

    # Additional symptom deductions
    if cannot_stand:   calcium -= 1.5
    if muscle_tremors: calcium -= 1.0
    if drooling:       calcium -= 0.5
    if cold_ears:      calcium -= 0.5

    return round(max(3.5, calcium), 2)


def estimate_activity_level(form_data):
    """
    Converts behavioral observations to 0-100 activity score.
    """
    behavioral = form_data.get('behavioral', 'normal')
    scores = {
        'normal':           100,
        'reduced_movement':  40,
        'muscle_tremors':    20,
        'unable_to_stand':    5,
    }
    base = scores.get(behavioral, 50)

    # Adjust for additional symptoms
    if form_data.get('cannot_stand', False):   base = min(base, 15)
    if form_data.get('muscle_tremors', False): base = min(base, 25)

    return float(base)


def estimate_milk_yield(eating_pct):
    """
    Estimates milk yield from eating behaviour percentage.
    Healthy cow produces ~20kg/day.
    """
    try:
        pct = float(eating_pct)
        return round(pct / 100 * 20, 2)
    except:
        return 18.0


def calculate_days_to_calving(calving_date_str):
    """
    Calculates days relative to calving date.
    Returns 0-30 range for model input.
    """
    from datetime import datetime, timezone
    try:
        calving = datetime.strptime(
            calving_date_str, '%Y-%m-%d'
        ).replace(tzinfo=timezone.utc)
        today = datetime.now(timezone.utc)
        diff  = (calving - today).days
        return max(0, min(30, diff + 3))
    except:
        return 0


def build_feature_vector(data: dict):
    """
    Main function — builds feature vector from farmer inputs.
    Uses lab values if provided, otherwise estimates from symptoms.
    Returns (feature_array, errors, feature_dict, used_lab_values)
    """
    errors = []

    # ── Required fields ───────────────────────────────────────────────────────
    parity = data.get('parity')
    calving_date = data.get('calving_date')

    if not parity:
        errors.append("Parity is required.")
    if not calving_date:
        errors.append("Calving date is required.")
    if errors:
        return None, errors, {}, False

    try:
        parity_int = int(parity)
    except:
        errors.append("Parity must be a number.")
        return None, errors, {}, False

    # ── Blood Calcium — lab value or estimated ────────────────────────────────
    lab_calcium = data.get('blood_calcium_lab')
    used_lab    = False
    if lab_calcium not in (None, '', 'null'):
        try:
            blood_calcium = float(lab_calcium)
            if not (2.0 <= blood_calcium <= 15.0):
                errors.append("Blood calcium must be between 2.0 and 15.0 mg/dL.")
                return None, errors, {}, False
            used_lab = True
        except:
            errors.append("Blood calcium must be a number.")
            return None, errors, {}, False
    else:
        blood_calcium = estimate_blood_calcium(data)

    # ── Blood Phosphorus — lab value or default ───────────────────────────────
    lab_phosphorus = data.get('blood_phosphorus_lab')
    if lab_phosphorus not in (None, '', 'null'):
        try:
            blood_phosphorus = float(lab_phosphorus)
            if not (1.0 <= blood_phosphorus <= 12.0):
                errors.append("Blood phosphorus must be between 1.0 and 12.0 mg/dL.")
                return None, errors, {}, False
        except:
            blood_phosphorus = 5.5
    else:
        blood_phosphorus = 5.5

    # ── BCS ───────────────────────────────────────────────────────────────────
    try:
        bcs = float(data.get('bcs', 3.0))
    except:
        bcs = 3.0

    # ── Activity level ────────────────────────────────────────────────────────
    activity_level = estimate_activity_level(data)

    # ── Days to calving ───────────────────────────────────────────────────────
    days_to_calving = calculate_days_to_calving(calving_date)

    # ── Milk yield ────────────────────────────────────────────────────────────
    lab_milk = data.get('milk_yield_lab')
    if lab_milk not in (None, '', 'null'):
        try:
            milk_yield_day1 = float(lab_milk)
            used_lab = True
        except:
            milk_yield_day1 = estimate_milk_yield(data.get('eating', 100))
    else:
        milk_yield_day1 = estimate_milk_yield(data.get('eating', 100))

    # ── DCAD ─────────────────────────────────────────────────────────────────
    dcad = 20.0 if parity_int >= 3 else -30.0

    feature_dict = {
        'parity':           parity_int,
        'blood_calcium':    blood_calcium,
        'blood_phosphorus': blood_phosphorus,
        'bcs':              bcs,
        'days_to_calving':  days_to_calving,
        'milk_yield_day1':  milk_yield_day1,
        'activity_level':   activity_level,
        'dcad':             dcad,
    }

    feature_array = np.array([
        feature_dict[f] for f in FEATURES
    ]).reshape(1, -1)

    return feature_array, [], feature_dict, used_lab


def validate_and_extract(data: dict):
    """
    Legacy compatibility function.
    """
    feature_array, errors, _, _ = build_feature_vector(data)
    return feature_array, errors