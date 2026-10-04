import os
import warnings
import numpy as np
import pandas as pd
warnings.filterwarnings('ignore')

from sklearn.model_selection import train_test_split, StratifiedKFold, cross_val_score
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestClassifier, VotingClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import classification_report, roc_auc_score, accuracy_score, f1_score
from xgboost import XGBClassifier
from imblearn.over_sampling import SMOTE

# ── Load combined dataset ─────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
df = pd.read_csv(os.path.join(BASE_DIR, 'data', 'milk_fever_combined.csv'))

print("=" * 65)
print("MODEL COMPARISON — Milk Fever Detection")
print("=" * 65)
print(f"Dataset shape: {df.shape}")
print("Stage distribution:")
print(df['stage'].value_counts())
print()

FEATURES = [
    'parity', 'blood_calcium', 'blood_phosphorus',
    'bcs', 'days_to_calving', 'milk_yield_day1',
    'activity_level', 'dcad'
]

X = df[FEATURES]
y = df['stage']

# ── Encode labels ─────────────────────────────────────────────────────────────
stage_order = ['Subclinical', 'Mild', 'Moderate', 'Critical']
le = LabelEncoder()
le.fit(stage_order)
y_encoded = le.transform(y)

# ── Train/test split ──────────────────────────────────────────────────────────
X_train, X_test, y_train, y_test = train_test_split(
    X, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
)

# ── Scale ─────────────────────────────────────────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# ── SMOTE ─────────────────────────────────────────────────────────────────────
smote = SMOTE(random_state=42)
X_train_bal, y_train_bal = smote.fit_resample(X_train_scaled, y_train)
print(f"After SMOTE: {pd.Series(y_train_bal).value_counts().to_dict()}")
print()

# ── Define all 7 models ───────────────────────────────────────────────────────
models = {
    'Logistic Regression': LogisticRegression(
    max_iter=1000, random_state=42
    ),
    'Random Forest': RandomForestClassifier(
        n_estimators=200, max_depth=10, random_state=42, n_jobs=-1
    ),
    'XGBoost': XGBClassifier(
        n_estimators=200, max_depth=6, learning_rate=0.05,
        subsample=0.8, colsample_bytree=0.8,
        eval_metric='mlogloss', random_state=42
    ),
    'SVM': SVC(
        kernel='rbf', probability=True, random_state=42
    ),
    'MLP Neural Network': MLPClassifier(
        hidden_layer_sizes=(128, 64, 32),
        activation='relu', max_iter=500, random_state=42
    ),
    'Gradient Boosting': GradientBoostingClassifier(
        n_estimators=200, max_depth=5, learning_rate=0.05, random_state=42
    ),
    'Ensemble (RF+XGB)': VotingClassifier(
        estimators=[
            ('rf', RandomForestClassifier(
                n_estimators=200, max_depth=10, random_state=42, n_jobs=-1
            )),
            ('xgb', XGBClassifier(
                n_estimators=200, max_depth=6, learning_rate=0.05,
                eval_metric='mlogloss', random_state=42
            )),
        ],
        voting='soft'
    ),
}

# ── Evaluate all models ───────────────────────────────────────────────────────
cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=42)
results = []

for name, model in models.items():
    print(f"⏳ Training: {name}...")

    cv_scores = cross_val_score(
        model, X_train_bal, y_train_bal, cv=cv, scoring='accuracy'
    )

    model.fit(X_train_bal, y_train_bal)

    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)

    acc = accuracy_score(y_test, y_pred)
    f1  = f1_score(y_test, y_pred, average='weighted')
    auc = roc_auc_score(y_test, y_prob, multi_class='ovr', average='macro')

    report = classification_report(
        y_test, y_pred, target_names=le.classes_, output_dict=True
    )
    critical_recall    = report['Critical']['recall']
    critical_precision = report['Critical']['precision']
    critical_f1        = report['Critical']['f1-score']

    results.append({
        'Model':           name,
        'CV Accuracy':     f"{cv_scores.mean():.4f} ± {cv_scores.std():.4f}",
        'Test Accuracy':   f"{acc:.4f}",
        'Weighted F1':     f"{f1:.4f}",
        'AUC-ROC':         f"{auc:.4f}",
        'Critical Recall': f"{critical_recall:.4f}",
        'Critical F1':     f"{critical_f1:.4f}",
    })

    print(f"  ✓ CV Accuracy:     {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print(f"  ✓ Test Accuracy:   {acc:.4f}")
    print(f"  ✓ AUC-ROC:         {auc:.4f}")
    print(f"  ✓ Critical Recall: {critical_recall:.4f}")
    print()

# ── Summary table ─────────────────────────────────────────────────────────────
print("\n" + "=" * 65)
print("SUMMARY TABLE")
print("=" * 65)
results_df = pd.DataFrame(results)
print(results_df.to_string(index=False))

# ── Best model ────────────────────────────────────────────────────────────────
best_idx   = results_df['AUC-ROC'].astype(float).idxmax()
best_model = results_df.iloc[best_idx]['Model']
best_auc   = results_df.iloc[best_idx]['AUC-ROC']
best_acc   = results_df.iloc[best_idx]['Test Accuracy']

print("\n" + "=" * 65)
print(f"🏆 BEST MODEL:    {best_model}")
print(f"   AUC-ROC:       {best_auc}")
print(f"   Test Accuracy: {best_acc}")
print("=" * 65)

# ── Save results ──────────────────────────────────────────────────────────────
out_path = os.path.join(BASE_DIR, 'data', 'model_comparison_results.csv')
results_df.to_csv(out_path, index=False)
print(f"\n✓ Results saved to: {out_path}")