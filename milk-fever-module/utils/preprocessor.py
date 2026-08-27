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

def validate_and_extract(data: dict):
    errors = []
    values = []

    for feat in FEATURES:
        if feat not in data:
            errors.append(f"Missing required field: '{feat}'")
            continue
        try:
            val = float(data[feat])
        except (TypeError, ValueError):
            errors.append(f"Field '{feat}' must be numeric.")
            continue

        low, high = FEATURE_RANGES[feat]
        if not (low <= val <= high):
            errors.append(f"Field '{feat}' value {val} is out of range [{low}, {high}].")
            continue

        values.append(val)

    if errors:
        return None, errors

    return np.array(values).reshape(1, -1), []