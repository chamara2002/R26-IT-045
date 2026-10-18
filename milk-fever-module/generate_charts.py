import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
OUT_DIR  = os.path.join(BASE_DIR, 'charts')
os.makedirs(OUT_DIR, exist_ok=True)

# ── Chart 1: Stage Distribution Bar Chart ────────────────────────────────────
stages  = ['Mild', 'Moderate', 'Subclinical', 'Critical']
counts  = [3376, 2600, 2226, 581]
colors  = ['#F59E0B', '#F97316', '#3B82F6', '#EF4444']

fig, ax = plt.subplots(figsize=(8, 5))
bars = ax.bar(stages, counts, color=colors, width=0.5, edgecolor='white', linewidth=1.5)
for bar, count in zip(bars, counts):
    ax.text(bar.get_x() + bar.get_width()/2, bar.get_height() + 80,
            f'{count:,}', ha='center', va='bottom', fontsize=11, fontweight='bold')
ax.set_title('Dataset Stage Distribution (Total: 8,783 Records)', fontsize=13, fontweight='bold', pad=15)
ax.set_xlabel('Milk Fever Stage', fontsize=11)
ax.set_ylabel('Number of Records', fontsize=11)
ax.set_ylim(0, 4000)
ax.grid(axis='y', alpha=0.3)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, 'chart1_stage_distribution.png'), dpi=150, bbox_inches='tight')
plt.close()
print("✓ Chart 1: Stage Distribution saved")

# ── Chart 2: Model Comparison Bar Chart ──────────────────────────────────────
models   = ['Logistic\nRegression', 'SVM', 'MLP\nNeural Net',
            'Random\nForest', 'Gradient\nBoosting', 'XGBoost', 'Ensemble\n(RF+XGB)']
accuracy = [67.05, 89.24, 93.17, 95.28, 96.81, 96.98, 97.04]
auc_roc  = [82.98, 97.85, 99.29, 99.73, 99.83, 99.83, 99.86]
colors2  = ['#94A3B8','#94A3B8','#60A5FA','#34D399','#34D399','#10B981','#059669']

x   = np.arange(len(models))
w   = 0.35
fig, ax = plt.subplots(figsize=(12, 6))
b1 = ax.bar(x - w/2, accuracy, w, label='Test Accuracy (%)', color=colors2, edgecolor='white')
b2 = ax.bar(x + w/2, auc_roc,  w, label='AUC-ROC × 100',
            color=[c + '99' for c in ['#94A3B8','#94A3B8','#60A5FA','#34D399','#34D399','#10B981','#059669']],
            edgecolor='white')

# Highlight best model
ax.bar(x[-1] - w/2, accuracy[-1], w, color='#047857', edgecolor='#022c22', linewidth=2)
ax.bar(x[-1] + w/2, auc_roc[-1],  w, color='#065f46', edgecolor='#022c22', linewidth=2)

for bar in b1:
    ax.text(bar.get_x()+bar.get_width()/2, bar.get_height()+0.3,
            f'{bar.get_height():.1f}', ha='center', va='bottom', fontsize=7.5, fontweight='bold')

ax.set_title('Model Comparison — Test Accuracy vs AUC-ROC', fontsize=13, fontweight='bold', pad=15)
ax.set_xticks(x)
ax.set_xticklabels(models, fontsize=9)
ax.set_ylim(60, 102)
ax.set_ylabel('Score (%)', fontsize=11)
ax.legend(fontsize=10)
ax.grid(axis='y', alpha=0.3)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
ax.annotate('Best Model (Ensemble)', xy=(x[-1], 99), fontsize=9,
            ha='center', color='#047857', fontweight='bold')
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, 'chart2_model_comparison.png'), dpi=150, bbox_inches='tight')
plt.close()
print("✓ Chart 2: Model Comparison saved")

# ── Chart 3: Critical Recall Comparison ──────────────────────────────────────
recalls = [82.76, 87.93, 85.34, 95.69, 93.97, 94.83, 93.97]
colors3 = ['#FCA5A5','#FCA5A5','#FCA5A5','#4ADE80','#86EFAC','#4ADE80','#16A34A']

fig, ax = plt.subplots(figsize=(10, 5))
bars = ax.barh(models, recalls, color=colors3, edgecolor='white', linewidth=1.2)
for bar, val in zip(bars, recalls):
    ax.text(val + 0.3, bar.get_y() + bar.get_height()/2,
            f'{val}%', va='center', fontsize=10, fontweight='bold')
ax.axvline(x=90, color='red', linestyle='--', linewidth=1.5, label='90% Target Line')
ax.set_title('Critical Stage Recall by Model\n(Higher = Fewer Missed Emergency Cases)',
             fontsize=13, fontweight='bold', pad=15)
ax.set_xlabel('Critical Recall (%)', fontsize=11)
ax.set_xlim(70, 102)
ax.legend(fontsize=10)
ax.grid(axis='x', alpha=0.3)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, 'chart3_critical_recall.png'), dpi=150, bbox_inches='tight')
plt.close()
print("✓ Chart 3: Critical Recall Comparison saved")

# ── Chart 4: Learning Curve (Overfitting Check) ───────────────────────────────
train_sizes = [864, 1974, 3085, 4196, 5307, 6418, 7529, 8640]
train_acc   = [100, 100, 100, 100, 100, 100, 100, 100]
val_acc     = [84.07, 87.31, 88.93, 89.93, 95.45, 96.43, 96.87, 97.20]

fig, ax = plt.subplots(figsize=(9, 5))
ax.plot(train_sizes, train_acc, 'o-', color='#3B82F6', linewidth=2.5,
        markersize=7, label='Training Accuracy')
ax.plot(train_sizes, val_acc,  's-', color='#10B981', linewidth=2.5,
        markersize=7, label='Validation Accuracy')
ax.fill_between(train_sizes, train_acc, val_acc, alpha=0.1, color='#6366F1')
ax.annotate('Gap: 2.80%\n(No Overfitting - Generalizes)',
            xy=(8640, 97.20), xytext=(7000, 90),
            arrowprops=dict(arrowstyle='->', color='black'),
            fontsize=9, fontweight='bold', color='#047857')
ax.set_title('Learning Curve — Overfitting Analysis\n(Random Forest on Combined Dataset)',
             fontsize=13, fontweight='bold', pad=15)
ax.set_xlabel('Training Set Size (Records)', fontsize=11)
ax.set_ylabel('Accuracy (%)', fontsize=11)
ax.set_ylim(80, 103)
ax.legend(fontsize=11)
ax.grid(alpha=0.3)
ax.spines['top'].set_visible(False)
ax.spines['right'].set_visible(False)
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, 'chart4_learning_curve.png'), dpi=150, bbox_inches='tight')
plt.close()
print("✓ Chart 4: Learning Curve saved")

# ── Chart 5: 4-Stage Risk Classification Visual ───────────────────────────────
fig, ax = plt.subplots(figsize=(10, 3))
ax.set_xlim(0, 100)
ax.set_ylim(0, 1)
ax.axis('off')

zones = [
    (0,  25,  '#DBEAFE', '#1D4ED8', 'SUBCLINICAL\n(Score 0–24)\nMonitor Closely'),
    (25, 50,  '#FEF9C3', '#CA8A04', 'MILD\n(Score 25–49)\nCalcium Supplement'),
    (50, 70,  '#FFEDD5', '#C2410C', 'MODERATE\n(Score 50–69)\nOn-Farm Treatment'),
    (70, 100, '#FEE2E2', '#991B1B', 'CRITICAL\n(Score 70–100)\nEmergency Vet Required'),
]
for x1, x2, bg, fg, label in zones:
    ax.axvspan(x1, x2, alpha=0.85, color=bg)
    ax.text((x1+x2)/2, 0.52, label, ha='center', va='center',
            fontsize=8.5, fontweight='bold', color=fg,
            multialignment='center')
    ax.axvline(x=x2, color='white', linewidth=2)

ax.set_title('Four-Stage Risk Classification Output System',
             fontsize=13, fontweight='bold', pad=12)
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, 'chart5_stage_classification.png'), dpi=150, bbox_inches='tight')
plt.close()
print("✓ Chart 5: Stage Classification Visual saved")

# ── Chart 6: SMOTE Before vs After ───────────────────────────────────────────
fig, axes = plt.subplots(1, 2, figsize=(10, 4))

before = [3376, 2600, 2226, 581]
after  = [2700, 2700, 2700, 2700]
clrs   = ['#F59E0B', '#F97316', '#3B82F6', '#EF4444']

axes[0].bar(stages, before, color=clrs, edgecolor='white', linewidth=1.5)
axes[0].set_title('Before SMOTE\n(Imbalanced)', fontsize=11, fontweight='bold')
axes[0].set_ylabel('Record Count')
axes[0].set_ylim(0, 3800)
axes[0].grid(axis='y', alpha=0.3)
axes[0].spines['top'].set_visible(False)
axes[0].spines['right'].set_visible(False)
for i, (bar, v) in enumerate(zip(axes[0].patches, before)):
    axes[0].text(bar.get_x()+bar.get_width()/2, v+50, str(v),
                 ha='center', fontsize=9, fontweight='bold')

axes[1].bar(stages, after, color=clrs, edgecolor='white', linewidth=1.5)
axes[1].set_title('After SMOTE\n(Balanced)', fontsize=11, fontweight='bold')
axes[1].set_ylim(0, 3800)
axes[1].grid(axis='y', alpha=0.3)
axes[1].spines['top'].set_visible(False)
axes[1].spines['right'].set_visible(False)
for bar in axes[1].patches:
    axes[1].text(bar.get_x()+bar.get_width()/2, 2700+50, '2,700',
                 ha='center', fontsize=9, fontweight='bold')

plt.suptitle('SMOTE Class Balancing — Before vs After', fontsize=13, fontweight='bold')
plt.tight_layout()
plt.savefig(os.path.join(OUT_DIR, 'chart6_smote_balancing.png'), dpi=150, bbox_inches='tight')
plt.close()
print("✓ Chart 6: SMOTE Balancing saved")

print(f"\n✅ All 6 charts saved to: {OUT_DIR}")
print("Charts ready to use in thesis document!")