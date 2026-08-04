import pandas as pd
import numpy as np
import os

np.random.seed(42)
N = 2000

def assign_stage(row):
    score = 0
    if row['blood_calcium'] < 6.0:   score += 4
    elif row['blood_calcium'] < 7.5: score += 2
    elif row['blood_calcium'] < 8.5: score += 1
    if row['parity'] >= 4:           score += 2
    elif row['parity'] >= 2:         score += 1
    if row['bcs'] > 3.8:             score += 1
    if row['activity_level'] < 30:   score += 2
    elif row['activity_level'] < 50: score += 1
    if row['days_to_calving'] < 3:   score += 1
    if row['dcad'] > 0:              score += 1

    if score <= 2:   return 'Subclinical'
    elif score <= 4: return 'Mild'
    elif score <= 6: return 'Moderate'
    else:            return 'Critical'

data = pd.DataFrame({
    'parity':           np.random.randint(1, 8, N),
    'blood_calcium':    np.random.normal(8.0, 1.8, N).clip(3.5, 12.0),
    'blood_phosphorus': np.random.normal(5.5, 1.2, N).clip(1.5, 10.0),
    'bcs':              np.random.uniform(2.0, 5.0, N).round(1),
    'days_to_calving':  np.random.randint(0, 21, N),
    'milk_yield_day1':  np.random.normal(18, 5, N).clip(0, 45),
    'activity_level':   np.random.normal(55, 20, N).clip(0, 100),
    'dcad':             np.random.normal(-50, 80, N),
})

data['stage'] = data.apply(assign_stage, axis=1)

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.makedirs(os.path.join(BASE_DIR, 'data'), exist_ok=True)
data.to_csv(os.path.join(BASE_DIR, 'data', 'milk_fever_dataset.csv'), index=False)
print(data['stage'].value_counts())
print("Dataset saved!")