import re
import csv
import os
from datetime import datetime, timezone

# ── Paths ─────────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TTL_FILE = os.path.join(BASE_DIR, 'data', 'sensor_data.ttl')
OUT_FILE = os.path.join(BASE_DIR, 'data', 'milk_fever_sensor.csv')

print("Reading TTL file... (this may take a minute)")

with open(TTL_FILE, 'r', encoding='utf-8') as f:
    content = f.read()

print("Parsing cows...")

# ── Step 1: Parse DairyCow records ────────────────────────────────────────────
cow_pattern = re.compile(
    r'ns1:(\w+)\s+a\s+ns1:DairyCow\s*;(.*?)(?=\nns1:|\Z)',
    re.DOTALL
)

def extract_val(block, key):
    m = re.search(rf'ns1:{key}\s+"([^"]*)"', block)
    return m.group(1) if m else ''

def extract_measurements(block):
    return re.findall(r'ns1:hasMeasurement\s+((?:ns1:\S+(?:\s*,\s*)?)+)', block, re.DOTALL)

# ── Step 2: Parse all Measurement blocks ─────────────────────────────────────
print("Parsing measurements...")

meas_pattern = re.compile(
    r'ns1:([\w\-]+)\s+a\s+ns1:Measurement\s*;(.*?)(?=\nns1:|\Z)',
    re.DOTALL
)

measurements = {}
for m in meas_pattern.finditer(content):
    mid  = m.group(1)
    body = m.group(2)
    day  = extract_val(body, 'DayOfMeasurement')
    mby  = re.search(r'ns1:measuredBy\s+ns1:(\w+)', body)
    measured_by = mby.group(1) if mby else ''

    measurements[mid] = {
        'day':          day,
        'measured_by':  measured_by,
        'MinutesPerDay':           extract_val(body, 'MinutesPerDay'),
        'NumberOfSteps':           extract_val(body, 'NumberOfSteps'),
        'NumberOfBouts':           extract_val(body, 'NumberOfBouts'),
        'AverageMinutesPerBout':   extract_val(body, 'AverageMinutesPerBout'),
        'AverageMinutesBetweenBouts': extract_val(body, 'AverageMinutesBetweenBouts'),
    }

# ── Step 3: Parse BCS records ─────────────────────────────────────────────────
print("Parsing BCS scores...")

bcs_pattern = re.compile(
    r'ns1:(\w+)\s+a\s+ns1:BodyConditionScore\s*;(.*?)(?=\nns1:|\Z)',
    re.DOTALL
)
bcs_records = {}
for m in bcs_pattern.finditer(content):
    bid  = m.group(1)
    body = m.group(2)
    score = extract_val(body, 'ScoreBCS')
    if score:
        bcs_records[bid] = score

# ── Step 4: Build per-cow per-day aggregated records ─────────────────────────
print("Building cow records...")

def safe_float(v, default=None):
    try:
        return float(v) if v.strip() != '' else default
    except:
        return default

def days_since_calving(calving_str, measure_str):
    try:
        fmt = '%Y-%m-%dT%H:%M:%S.%fZ'
        c = datetime.strptime(calving_str, fmt).replace(tzinfo=timezone.utc)
        m = datetime.strptime(measure_str, fmt).replace(tzinfo=timezone.utc)
        return (m - c).days
    except:
        return None

rows = []
cow_count = 0

for cow_m in cow_pattern.finditer(content):
    cow_id   = cow_m.group(1)
    cow_body = cow_m.group(2)

    parity       = extract_val(cow_body, 'Parity')
    calving_date = extract_val(cow_body, 'CalvingDate')

    # Get all measurement IDs linked to this cow
    meas_ids_raw = re.findall(r'ns1:([\w\-]+)', cow_body.split('ns1:hasMeasurement')[-1]) \
        if 'hasMeasurement' in cow_body else []

    # Group measurements by day
    day_data = {}
    for mid in meas_ids_raw:
        if mid not in measurements:
            continue
        rec = measurements[mid]
        day = rec['day']
        if not day:
            continue
        if day not in day_data:
            day_data[day] = {
                'ruminating_min':    [],
                'eating_min':        [],
                'lying_min':         [],
                'walking_steps':     [],
                'inactivity_min':    [],
                'standing_min':      [],
            }
        mb = rec['measured_by']
        mpd = safe_float(rec['MinutesPerDay'])
        steps = safe_float(rec['NumberOfSteps'])

        if mb == 'Ruminating' and mpd is not None:
            day_data[day]['ruminating_min'].append(mpd)
        elif mb == 'Eating' and mpd is not None:
            day_data[day]['eating_min'].append(mpd)
        elif mb == 'Lying' and mpd is not None:
            day_data[day]['lying_min'].append(mpd)
        elif mb == 'Walking' and steps is not None:
            day_data[day]['walking_steps'].append(steps)
        elif mb == 'Inactivity' and mpd is not None:
            day_data[day]['inactivity_min'].append(mpd)
        elif mb == 'Standing' and mpd is not None:
            day_data[day]['standing_min'].append(mpd)

    # Get BCS for this cow (use linked BCS IDs)
    bcs_val = None
    for bid, bscore in bcs_records.items():
        if bid.startswith(cow_id[:8]):
            bcs_val = safe_float(bscore)
            break

    # Build one row per day
    for day, d in day_data.items():
        dsc = days_since_calving(calving_date, day)
        if dsc is None:
            continue

        # Activity level: composite score from ruminating + walking + lying
        rum  = sum(d['ruminating_min']) / len(d['ruminating_min']) if d['ruminating_min'] else None
        eat  = sum(d['eating_min'])     / len(d['eating_min'])     if d['eating_min']     else None
        lie  = sum(d['lying_min'])      / len(d['lying_min'])      if d['lying_min']      else None
        walk = sum(d['walking_steps'])  / len(d['walking_steps'])  if d['walking_steps']  else None

        # Normalize activity 0-100
        # Healthy cow: ruminate ~480 min/day, walk ~3000 steps, lie ~600 min
        activity = None
        scores = []
        if rum  is not None: scores.append(min(rum  / 480  * 100, 100))
        if walk is not None: scores.append(min(walk / 3000 * 100, 100))
        if eat  is not None: scores.append(min(eat  / 300  * 100, 100))
        if scores:
            activity = round(sum(scores) / len(scores), 2)

        # milk_yield_day1 estimate from eating behaviour (proxy)
        milk_est = round(eat / 300 * 25, 2) if eat is not None else None

        # days_to_calving: negative = days after calving
        # Model uses 0-30 range (pre-calving), post-calving = 0
        days_to_calving_val = max(0, -dsc) if dsc <= 0 else min(dsc, 30)

        # Skip rows with insufficient data
        if activity is None:
            continue

        parity_int = int(parity) if parity.isdigit() else None
        if parity_int is None:
            continue

        # Assign stage label based on clinical rules
        # (same logic as generate_dataset.py)
        score = 0
        # Parity risk
        if parity_int >= 4:    score += 2
        elif parity_int >= 2:  score += 1

        # Activity risk — main indicator
        if activity < 25:      score += 3
        elif activity < 40:    score += 2
        elif activity < 60:    score += 1

        # Periparturient window (0-3 days after calving = highest risk)
        if dsc is not None and 0 <= dsc <= 3:   score += 2
        elif dsc is not None and 4 <= dsc <= 7: score += 1

        # Rumination drop — strong milk fever indicator
        if rum is not None and rum < 150:   score += 2
        elif rum is not None and rum < 250: score += 1

        # Excessive lying — weakness indicator
        if lie is not None and lie > 750:   score += 1

        # Walking drop
        if walk is not None and walk < 500: score += 1

        if   score <= 0: stage = 'Subclinical'
        elif score <= 1: stage = 'Mild'
        elif score <= 2: stage = 'Moderate'
        else:            stage = 'Critical'

        rows.append({
            'parity':           parity_int,
            'blood_calcium':    round(9.0 - (score * 0.4), 2),  # estimated
            'blood_phosphorus': 5.5,                             # estimated default
            'bcs':              bcs_val if bcs_val else 3.0,
            'days_to_calving':  days_to_calving_val,
            'milk_yield_day1':  milk_est if milk_est else 18.0,
            'activity_level':   activity,
            'dcad':             20.0 if parity_int >= 3 else -30.0,
            'stage':            stage,
        })

    cow_count += 1
    if cow_count % 10 == 0:
        print(f"  Processed {cow_count} cows, {len(rows)} rows so far...")

# ── Step 5: Save CSV ──────────────────────────────────────────────────────────
print(f"\nTotal rows generated: {len(rows)}")

fieldnames = [
    'parity', 'blood_calcium', 'blood_phosphorus',
    'bcs', 'days_to_calving', 'milk_yield_day1',
    'activity_level', 'dcad', 'stage'
]

with open(OUT_FILE, 'w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerows(rows)

print(f"✓ Saved to: {OUT_FILE}")

# Stage distribution
from collections import Counter
stages = Counter(r['stage'] for r in rows)
print("\nStage distribution:")
for s, c in stages.most_common():
    print(f"  {s}: {c}")