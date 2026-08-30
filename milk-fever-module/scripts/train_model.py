import pandas as pd
import numpy as np
import joblib
import os
from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, VotingClassifier
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
df = pd.read_csv(os.path.join(BASE_DIR, 'data', 'milk_fever_combined.csv'))

print("Dataset shape:", df.shape)
print("Stage distribution:\n", df['stage'].value_counts())

FEATURES = [
    'parity', 'blood_calcium', 'blood_phosphorus',
    'bcs', 'days_to_calving', 'milk_yield_day1',
    'activity_level', 'dcad'
]

X = df[FEATURES]
y = df['stage']

stage_order = ['Subclinical', 'Mild', 'Moderate', 'Critical']
le = LabelEncoder()
le.fit(stage_order)
y_encoded = le.transform(y)

X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

smote = SMOTE(random_state=42)
X_train_bal, y_train_bal = smote.fit_resample(X_train_scaled, y_train)
print("After SMOTE:", pd.Series(y_train_bal).value_counts().to_dict())

rf = RandomForestClassifier(
    n_estimators=200, max_depth=10,
    min_samples_split=5, random_state=42, n_jobs=-1
)
xgb = XGBClassifier(
    n_estimators=200, max_depth=6, learning_rate=0.05,
    subsample=0.8, colsample_bytree=0.8,
    eval_metric='mlogloss',
    random_state=42
)

ensemble = VotingClassifier(
    estimators=[('rf', rf), ('xgb', xgb)],
    voting='soft'
)

cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
cv_scores = cross_val_score(ensemble, X_train_bal, y_train_bal, cv=cv, scoring='accuracy')
print(f"\nCV Accuracy: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")

ensemble.fit(X_train_bal, y_train_bal)

y_pred = ensemble.predict(X_test_scaled)
y_prob = ensemble.predict_proba(X_test_scaled)

print("\n── Classification Report ──")
print(classification_report(y_test, y_pred, target_names=le.classes_))
print("── Confusion Matrix ──")
print(confusion_matrix(y_test, y_pred))

auc = roc_auc_score(y_test, y_prob, multi_class='ovr', average='macro')
print(f"AUC-ROC (macro OvR): {auc:.4f}")

os.makedirs(os.path.join(BASE_DIR, 'model'), exist_ok=True)
joblib.dump(ensemble, os.path.join(BASE_DIR, 'model', 'milk_fever_model.pkl'))
joblib.dump(scaler,   os.path.join(BASE_DIR, 'model', 'scaler.pkl'))
joblib.dump(le,       os.path.join(BASE_DIR, 'model', 'label_encoder.pkl'))
print("\n✓ Model artifacts saved!")