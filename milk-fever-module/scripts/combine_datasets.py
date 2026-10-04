import os
import pandas as pd

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

df1 = pd.read_csv(os.path.join(BASE_DIR, 'data', 'milk_fever_dataset.csv'))
df2 = pd.read_csv(os.path.join(BASE_DIR, 'data', 'milk_fever_realistic_dataset.csv'))
df3 = pd.read_csv(os.path.join(BASE_DIR, 'data', 'milk_fever_sensor.csv'))



print("Dataset 1 shape:", df1.shape)
print("Dataset 2 shape:", df2.shape)
print("Dataset 3 shape:", df3.shape)

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

# df3 already has correct column names
df3_clean = df3[FEATURES].dropna()

df_combined = pd.concat([df1, df2_clean, df3_clean], ignore_index=True).dropna()
print("\n── Combined Dataset ──")
print("Shape:", df_combined.shape)
print("Stage distribution:\n", df_combined['stage'].value_counts())
print("\nDataset sources:")
print(f"  Dataset 1 (synthetic):  {len(df1)} records")
print(f"  Dataset 2 (realistic):  {len(df2_clean)} records")
print(f"  Dataset 3 (IoT sensor): {len(df3_clean)} records")

df_combined.to_csv(os.path.join(BASE_DIR, 'data', 'milk_fever_combined.csv'), index=False)
print("Combined dataset saved!")