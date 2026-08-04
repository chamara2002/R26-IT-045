import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

df1 = pd.read_csv(os.path.join(BASE_DIR, 'data', 'milk_fever_dataset.csv'))
df2 = pd.read_csv(os.path.join(BASE_DIR, 'data', 'milk_fever_realistic_dataset.csv'))

print("Dataset 1 shape:", df1.shape)
print("Dataset 2 shape:", df2.shape)

df2_renamed = df2.rename(columns={
    'blood_calcium_mg_dl':             'blood_calcium',
    'blood_phosphorus_mg_dl':          'blood_phosphorus',
    'body_condition_score':            'bcs',
    'dietary_cation_anion_difference': 'dcad',
    'milk_yield_day1_kg':              'milk_yield_day1',
    'activity_level_score':            'activity_level',
})

FEATURES = [
    'parity', 'blood_calcium', 'blood_phosphorus',
    'bcs', 'days_to_calving', 'milk_yield_day1',
    'activity_level', 'dcad', 'stage'
]
df2_clean = df2_renamed[FEATURES]
df2_clean = df2_clean[df2_clean['stage'] != 'Normal']

df_combined = pd.concat([df1, df2_clean], ignore_index=True).dropna()
print("Combined shape:", df_combined.shape)
print(df_combined['stage'].value_counts())

df_combined.to_csv(os.path.join(BASE_DIR, 'data', 'milk_fever_combined.csv'), index=False)
print("Combined dataset saved!")