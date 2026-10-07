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
    if not calving_date_str:
        return 0
    try:
        clean_str = str(calving_date_str).split("T")[0].strip()
        calving = None
        for fmt in ("%Y-%m-%d", "%d-%m-%Y", "%Y/%m/%d", "%d/%m/%Y", "%m/%d/%Y"):
            try:
                calving = datetime.strptime(clean_str, fmt).replace(tzinfo=timezone.utc)
                break
            except (ValueError, TypeError):
                continue
        if calving is None:
            calving = datetime.fromisoformat(clean_str).replace(tzinfo=timezone.utc)
        today = datetime.now(timezone.utc)
        diff = (calving - today).days
        # Days around calving: peak risk within 0-30 days
        return max(0, min(30, abs(diff) if abs(diff) <= 30 else 3))
    except Exception:
        return 0


def build_feature_vector(data: dict):
    """
    Main function — builds feature vector from farmer inputs.
    Uses lab values if provided, otherwise estimates from symptoms.
    Returns (feature_array, errors, feature_dict, used_lab_values)
    """
    if not isinstance(data, dict):
        data = {}
    errors = []

    # ── Parity extraction ───────────────────────────────────────────────────
    parity_val = data.get('parity')
    if parity_val in (None, '', 'null', 'None'):
        parity_int = 1
    else:
        try:
            parity_int = int(float(str(parity_val).strip()))
            if parity_int < 1:
                parity_int = 1
            elif parity_int > 15:
                parity_int = 15
        except (ValueError, TypeError):
            errors.append("Parity must be a valid integer number.")
            return None, errors, {}, False

    # ── Calving date extraction ─────────────────────────────────────────────
    calving_date = data.get('calving_date') or data.get('calvingDate')
    if not calving_date or str(calving_date).strip() in ('', 'null', 'None'):
        from datetime import datetime, timezone
        calving_date = datetime.now(timezone.utc).strftime('%Y-%m-%d')

    # ── Blood Calcium — lab value or estimated ─────────────────────────────
    lab_calcium = data.get('blood_calcium_lab') or data.get('blood_calcium') or data.get('calcium')
    used_lab = False
    if lab_calcium not in (None, '', 'null', 'None'):
        try:
            blood_calcium = float(str(lab_calcium).strip())
            if not (2.0 <= blood_calcium <= 15.0):
                if 1.0 <= blood_calcium <= 25.0:
                    blood_calcium = max(2.0, min(15.0, blood_calcium))
                    used_lab = True
                else:
                    errors.append("Blood calcium must be between 2.0 and 15.0 mg/dL.")
                    return None, errors, {}, False
            else:
                used_lab = True
        except (ValueError, TypeError):
            errors.append("Blood calcium must be a valid number.")
            return None, errors, {}, False
    else:
        blood_calcium = estimate_blood_calcium(data)

    # ── Blood Phosphorus — lab value or default ────────────────────────────
    lab_phosphorus = data.get('blood_phosphorus_lab') or data.get('blood_phosphorus') or data.get('phosphorus')
    if lab_phosphorus not in (None, '', 'null', 'None'):
        try:
            blood_phosphorus = float(str(lab_phosphorus).strip())
            if not (1.0 <= blood_phosphorus <= 12.0):
                if 0.5 <= blood_phosphorus <= 20.0:
                    blood_phosphorus = max(1.0, min(12.0, blood_phosphorus))
                else:
                    errors.append("Blood phosphorus must be between 1.0 and 12.0 mg/dL.")
                    return None, errors, {}, False
        except (ValueError, TypeError):
            blood_phosphorus = 5.5
    else:
        blood_phosphorus = 5.5

    # ── BCS ────────────────────────────────────────────────────────────────
    try:
        bcs = float(str(data.get('bcs', 3.0)).strip())
        bcs = max(1.0, min(5.0, bcs))
    except (ValueError, TypeError):
        bcs = 3.0

    # ── Activity level ─────────────────────────────────────────────────────
    activity_level = estimate_activity_level(data)

    # ── Days to calving ────────────────────────────────────────────────────
    days_to_calving = calculate_days_to_calving(calving_date)

    # ── Milk yield ─────────────────────────────────────────────────────────
    lab_milk = data.get('milk_yield_lab') or data.get('milk_yield') or data.get('milk_yield_day1')
    if lab_milk not in (None, '', 'null', 'None'):
        try:
            milk_yield_day1 = float(str(lab_milk).strip())
            milk_yield_day1 = max(0.0, min(60.0, milk_yield_day1))
            used_lab = True
        except (ValueError, TypeError):
            milk_yield_day1 = estimate_milk_yield(data.get('eating', 100))
    else:
        milk_yield_day1 = estimate_milk_yield(data.get('eating', 100))

    # ── DCAD ──────────────────────────────────────────────────────────────
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