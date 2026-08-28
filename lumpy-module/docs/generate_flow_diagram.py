"""Generates the LSD detection component's methodology/process-flow diagram.

Run once with the lumpy-module venv (needs matplotlib):
    venv/Scripts/python.exe docs/generate_flow_diagram.py
Not part of the running application - a one-off documentation asset generator.

Layout uses a top-down cursor so band/box placement can't silently overlap:
each helper consumes vertical space and returns the new cursor position.
"""
import matplotlib.pyplot as plt
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch

FIG_W = 100
LAYER_COLORS = {
    "input": "#0f766e",
    "prep": "#4c1d95",
    "detect": "#7c2d12",
    "fusion": "#7c3aed",
    "output": "#b45309",
}
BOX_FILL = {
    "input": "#ccfbf1",
    "prep": "#ede9fe",
    "detect": "#fee2e2",
    "fusion": "#f3e8ff",
    "output": "#fef3c7",
}

BAND_HEADER = 7.0   # vertical space reserved for the band's own label before any boxes start
BAND_PAD_BOTTOM = 1.5
ARROW_GAP = 3.0

elements = []  # (kind, ...) drawn later once total height is known, in top-down cursor order


def add_band_with_boxes(cursor, label, kind, box_specs, box_h):
    """box_specs: list of (x, w, text). Returns new cursor (below this band)."""
    content_h = box_h
    band_h = BAND_HEADER + content_h + BAND_PAD_BOTTOM
    band_top = cursor
    band_bottom = cursor - band_h
    elements.append(("band", band_bottom, band_top, LAYER_COLORS[kind], label))
    box_top = band_top - BAND_HEADER
    box_y = box_top - box_h
    box_centers = []
    for x, w, text in box_specs:
        elements.append(("box", x, box_y, w, box_h, text, kind))
        box_centers.append(x + w / 2)
    return band_bottom, box_y, box_centers


def add_box_row(cursor, box_specs, box_h, kind, gap_above=ARROW_GAP):
    """Freestanding (non-banded) row of boxes below the previous element."""
    cursor -= gap_above
    box_y = cursor - box_h
    box_centers = []
    for x, w, text in box_specs:
        elements.append(("box", x, box_y, w, box_h, text, kind))
        box_centers.append(x + w / 2)
    return box_y, box_centers


def add_varrows(x_list, y_top, y_bottom):
    for x in x_list:
        elements.append(("varrow", x, y_top, y_bottom))


def add_harrow(x0, x1, y):
    elements.append(("harrow", x0, x1, y))


# ---------------------------------------------------------------------
# 1. Data Collection & Input
cursor = 144
band1_bottom, box1_y, box1_centers = add_band_with_boxes(
    cursor, "1. Data Collection & User Input", "input",
    [
        (4, 44, "Cattle skin image dataset\n(Roboflow-annotated nodules;\n\"Lumpy Skin\" / \"Normal Skin\"\nfolders for classification)"),
        (52, 44, "Farmer uploads a cattle skin\nphotograph via the web app\n(+ optional symptom checklist)"),
    ], box_h=9,
)

# 2. Preprocessing
cursor = box1_y
band2_bottom, box2_y, box2_centers = add_band_with_boxes(
    cursor - ARROW_GAP, "2. Preprocessing", "prep",
    [
        (4, 30, "Resize & normalize\n640x640 (YOLOv8) /\n224x224 (ResNet50)"),
        (37, 30, "RGB conversion +\nResNet50 channel\npreprocessing"),
        (70, 26, "Augmentation\n(train split only):\nflip, rotate, brightness"),
    ], box_h=8,
)
add_varrows(box1_centers, box1_y, cursor - ARROW_GAP)

# 3. Detection & Classification
cursor = box2_y
band3_bottom, box3_y, box3_centers = add_band_with_boxes(
    cursor - ARROW_GAP, "3. Detection & Classification Pipeline", "detect",
    [
        (4, 43, "YOLOv8s Lesion Detection\nLocalizes candidate nodules;\noutputs bounding boxes +\ndetection confidence (conf>=0.35)"),
        (53, 43, "ResNet50 Classification\nEach detected region is cropped,\nresized, classified as an\nLSD-positive probability"),
    ], box_h=10,
)
add_varrows([50], box2_y, cursor - ARROW_GAP)
add_harrow(47, 53, box3_y + 6.5)

# Combined region/image score explainer box
formula_y, formula_centers = add_box_row(
    box3_y,
    [(12, 76, "Region Score = Detection Confidence x Classification Probability  (per detected region)\n"
              "Image Score = MAX(Region Scores) across the image  (0 if no nodules detected)")],
    box_h=9, kind="detect",
)
add_varrows([50], box3_y, box3_y - ARROW_GAP)

# 4. Hybrid Fusion
cursor = formula_y
band4_bottom, box4_y, box4_centers = add_band_with_boxes(
    cursor - ARROW_GAP, "4. Hybrid Fusion (image + clinical symptoms)", "fusion",
    [
        (4, 44, "Image Score\n(from pipeline above)"),
        (52, 44, "Symptom Score\n(weighted checklist: fever, lymph\nnodes, discharge, milk yield,\nappetite, body temperature)"),
    ], box_h=9,
)
add_varrows([50], formula_y, cursor - ARROW_GAP)

fusion_formula_y, _ = add_box_row(
    box4_y,
    [(12, 76, "Weighted Fusion:   P_final = 0.7 x P_image + 0.3 x P_symptom\n(falls back to image-only when no symptoms are reported)")],
    box_h=8, kind="fusion",
)
add_varrows([24, 76], box4_y, fusion_formula_y + 8)

add_varrows([50], fusion_formula_y, fusion_formula_y - ARROW_GAP)

# 5. Output
cursor = fusion_formula_y
band5_bottom, box5_y, box5_centers = add_band_with_boxes(
    cursor - ARROW_GAP, "5. Output", "output",
    [
        (3, 22, "Overall LSD\nprobability (%) &\nrisk level\n(Low / Moderate / High)"),
        (28, 21, "Annotated image\nwith \"Nodule\"-labelled\ndetection boxes"),
        (52, 21, "Risk-based\nguidance text\nfor the farmer"),
        (76, 21, "Downloadable\nPDF report"),
    ], box_h=9,
)
summary_y, _ = add_box_row(
    box5_y,
    [(10, 80, "Stored to the animal's detection history (longitudinal record)")],
    box_h=6, kind="output",
)
add_varrows(box5_centers, box5_y, summary_y + 6)

TOTAL_TOP = 144 + 11
TOTAL_BOTTOM = summary_y - 3

# ---------------------------------------------------------------------
fig_h = (TOTAL_TOP - TOTAL_BOTTOM) * 0.115
fig, ax = plt.subplots(figsize=(11, fig_h))
ax.set_xlim(0, FIG_W)
ax.set_ylim(TOTAL_BOTTOM, TOTAL_TOP)
ax.axis("off")

ax.text(50, TOTAL_TOP - 3, "Lumpy Skin Disease (LSD) Detection Component",
        ha="center", fontsize=15.5, fontweight="bold", color="#111827")
ax.text(50, TOTAL_TOP - 6.3, "Methodology / Process Flow", ha="center", fontsize=11, color="#4b5563")

for el in elements:
    if el[0] == "band":
        _, y_bottom, y_top, color, label = el
        ax.add_patch(FancyBboxPatch((2, y_bottom), FIG_W - 4, y_top - y_bottom,
                                     boxstyle="round,pad=0,rounding_size=1.2",
                                     linewidth=0, facecolor=color, zorder=1))
        ax.text(4, y_top - 2.2, label, fontsize=13, fontweight="bold", color="white", va="top", zorder=3)
    elif el[0] == "box":
        _, x, y, w, h, text, kind = el
        ax.add_patch(FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.6,rounding_size=2.2",
                                     linewidth=1.4, edgecolor=LAYER_COLORS[kind],
                                     facecolor=BOX_FILL[kind], zorder=4))
        ax.text(x + w / 2, y + h / 2, text, ha="center", va="center", fontsize=9.2,
                color="#1f2937", zorder=5, linespacing=1.35)
    elif el[0] == "varrow":
        _, x, y0, y1 = el
        ax.add_patch(FancyArrowPatch((x, y0), (x, y1), arrowstyle="-|>", mutation_scale=16,
                                      linewidth=1.6, color="#334155", zorder=6))
    elif el[0] == "harrow":
        _, x0, x1, y = el
        ax.add_patch(FancyArrowPatch((x0, y), (x1, y), arrowstyle="-|>", mutation_scale=16,
                                      linewidth=1.6, color="#334155", zorder=6))

plt.tight_layout()
plt.savefig("docs/LSD_Methodology_Flow_Diagram.png", dpi=220, bbox_inches="tight", facecolor="white")
print("saved docs/LSD_Methodology_Flow_Diagram.png")
