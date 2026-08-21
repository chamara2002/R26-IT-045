# FMD Module (Foot-and-Mouth Disease)

Independent Flask microservice for the CattleSense platform. It is proxied by
the main backend at `backend/services/module_proxy_service.py`
(`MODULES["fmd"]`, default `http://localhost:5002`) and is not called
directly by the frontend.

This is a research/decision-support tool. **It does not provide a guaranteed
or 100% accurate diagnosis.** Model confidence is a statistical estimate, not
a veterinary diagnosis — always confirm suspected cases with a veterinarian.

## What this module does

1. **Image classification** — a fine-tuned EfficientNetB0 CNN scores an
   uploaded photograph of the mouth/hooves/udder as `0` (no visible FMD
   lesions) or `1` (lesions consistent with FMD), with a confidence score.
2. **Clinical fusion (rule-based)** — optional symptom inputs (body
   temperature, activity, feeding) are combined with the image prediction
   through a fixed scoring table (`calculate_risk_level` in
   `src/training/predict.py`) to produce a `Low` / `Medium` / `High` /
   `Critical` risk level and a recommendation. This is a deterministic
   heuristic, not a trained model — there is currently no numerical/tabular
   ML model for FMD (unlike the image model). Two behaviours worth knowing:
   - The score uses `disease_probability()`, the probability the image shows
     FMD specifically — not raw model confidence. (A confident "healthy" call
     must lower risk, not raise it; using raw confidence was a bug, since a
     model that is 99% sure an image is healthy and 99% sure another is
     diseased would otherwise score identically.)
   - Any of temperature/activity/feeding may be omitted by the caller; an
     omitted field contributes no score. They must not default to `0`, which
     would be misread as "critically low activity" and inflate the risk level
     for cases with no clinical data at all.
3. **Weather-based FMD spread risk (rule-based, separate signal)** — using
   the farmer's saved farm district, live weather (Open-Meteo) is scored
   `LOW`/`MEDIUM`/`HIGH` for conditions that favour FMD spread in the area.
   This is a **rule-based threshold scorer**, not a trained ML model (see
   "Weather risk methodology" below) — it answers a different question than
   the image model: "is the environment currently favourable for FMD to
   spread?", not "does this specific animal have FMD?".
4. **Hybrid decision layer** — combines (1)/(2) and (3) into one transparent,
   explained assessment (`src/training/hybrid.py`) without ever downgrading
   a positive image result just because environmental risk is low. See
   "Hybrid decision logic" below for the exact rule table.

## Project layout

```
fmd-module/
├── app.py                       # Entry point: `python app.py` (dev server)
├── requirements.txt
├── src/
│   ├── app.py                   # Flask app + all HTTP routes
│   ├── analyze_dataset.py       # CLI: print/save dataset class balance stats
│   ├── preprocessing/
│   │   └── image_pipeline.py    # Shared decode/resize/normalize + augmentation
│   ├── training/
│   │   ├── train.py             # Grouped-split, class-weighted training + final model fit
│   │   ├── evaluate.py          # Held-out test evaluation + plots + ROC-AUC
│   │   ├── predict.py           # Model loading, inference, clinical risk fusion
│   │   └── hybrid.py            # Image + weather hybrid decision logic
│   └── utils/
│       ├── dataset_inspector.py # Folder-per-class dataset scanning + same-case grouping
│       └── file_utils.py        # JSON/pickle helpers
├── weather/                      # Weather-based FMD spread risk sub-module
│   ├── weather_routes.py         # /weather/* Flask blueprint
│   ├── weather_service.py        # Orchestrates fetch + scoring + response
│   ├── weather_risk_model.py     # Threshold rules (+ optional untrained RF hook)
│   ├── weather_forecast_location.py  # Open-Meteo client
│   ├── weather_location_model.py # SQLite: farmer_id -> saved district + lat/lon
│   ├── weather_history_model.py  # SQLite: daily weather/risk history
│   ├── weather_constants.py      # Alert copy + threshold constants
│   ├── sri_lanka_districts.py    # District -> coordinates lookup (no browser GPS)
│   └── seasonal_risk.py          # DAPH-based Dec-Feb seasonal escalation (rule-based)
├── models/
│   ├── dataset/                 # Raw labelled research images (0 = no FMD, 1 = FMD)
│   └── model/                   # Final trained artifacts (see below)
├── archive/
│   └── corrupted-dataset-images/  # Unreadable/truncated raw images, kept out of training
├── tests/
│   └── test_api.py              # Flask test-client API tests
└── weather_history.db           # SQLite file, created at runtime (gitignored)
```

## Final model artifacts (`models/model/`)

| File | Purpose |
| --- | --- |
| `fmd_model.h5` | Production image model — the only model file loaded by the API. |
| `label_encoder.pkl` | Maps model output indices back to class labels `"0"`/`"1"`. |
| `model_metadata.json` | Backbone name, image size, class names — used by `evaluate.py`. |
| `evaluation_report.json` | Held-out test-set metrics for `fmd_model.h5` (see below). |
| `cross_validation_report.json` | 3-fold cross-validation diagnostics from training (not used at inference). |
| `confusion_matrix.png`, `training_history.png` | Diagnostic plots from the last training run. |
| `test_paths.json` | The held-out test split's file paths/labels, so `evaluate.py` can be re-run without re-splitting. |

There is intentionally only **one** image model file. Per-fold
cross-validation checkpoints (`efficientnet_fold_*.h5`) and an intermediate
pre-fine-tuning checkpoint (`final_efficientnet.h5`) are training-time
diagnostics only — they are not loaded by the API and are deleted after each
training run; re-run `train.py` if you need to regenerate and inspect them.

### Measured performance (last retrain, grouped/leakage-aware split)

Backbone: EfficientNetB0, image size 160x160, 339 labelled images (170 class
`0` / 169 class `1`). Split methodology: **grouped** stratified 85/15
train/test split (`GroupShuffleSplit`) + **grouped** 3-fold cross-validation
(`StratifiedGroupKFold`) on the training split — images sharing an inferred
same-case group key (see "Data leakage" below) never appear on both sides of
any split. Class weights were computed but are ~1.0 for both classes (the
dataset is already close to balanced, so this is a no-op safety net, not an
active correction).

| Split | Accuracy | Precision (macro) | Recall (macro) | F1 (macro) |
| --- | --- | --- | --- | --- |
| CV fold 1 | 86.7% | 0.867 | 0.867 | 0.867 |
| CV fold 2 | 89.5% | 0.896 | 0.893 | 0.894 |
| CV fold 3 | 95.1% | 0.955 | 0.952 | 0.951 |
| **Held-out test set (51 images, never used for training or model selection)** | **94.1%** | **0.942** | **0.941** | **0.941** |

**FMD class (`1`) specifically** — recall matters most here, since a missed
case (false negative) is worse than a false alarm: precision **92.6%**,
recall **96.2%**, F1 **94.3%**. ROC-AUC: **0.971**.

These numbers come from `models/model/evaluation_report.json` and
`cross_validation_report.json` — regenerate them yourself with
`python -m src.training.evaluate` rather than trusting stale figures here.
`evaluation_report.json` also carries a `compared_to_previous_ungrouped_split_baseline`
field: an earlier run (before grouped splitting existed) scored 98.0% on a
plain per-image split. The 94.1% figure above is **lower but more trustworthy**
— it removes the leakage risk that the 98.0% figure carried, per this
project's priority of generalization/reliability over a high number. The two
are not directly comparable (different test sets), so don't read this as "the
model regressed" — the methodology changed, not (necessarily) the model's
real-world accuracy.

**Data leakage.** No animal/case ID field exists in this dataset. A heuristic
(`src/utils/dataset_inspector.py::group_key_for_image`) recognises the small
subset of filenames that explicitly document multi-site photos of one case
(e.g. `"2 day vesicle, steer, foot.jpg"` and `"2 day vesicle, steer, gum.jpg"`
are the same animal on day 2) — **3 groups out of 331** (covering 9 of 339
images) are multi-image; everything else is treated as its own group, i.e.
"assume no grouping" for the vast majority of the dataset. This is a
documented limitation, not a guarantee that zero same-animal leakage remains
— there may be same-animal images that don't share a recognisable filename
pattern and so could not be grouped.

**Other caveats:**
- 339 images is a small dataset for a CNN; treat these numbers as "promising
  and methodologically sound", not "precise" — a single test-set
  misclassification moves accuracy by ~2 points.
- This was fixed from a previous version of `fmd_model.h5` that scored 50%
  (chance level, collapsed to always predicting class `0`) due to a backbone
  input-range bug — see "Backbone-specific input scaling" above. If you retrain
  and see accuracy collapse back to ~50%, check that first.

**Do not present this model's output as a certain diagnosis.** Use
`"FMD-consistent lesions detected"` / `"No visible FMD lesions detected"`
wording (never "FMD confirmed" or "the cow definitely has FMD"), treat
`confidence_score` as a decision-support signal, and always recommend
veterinary confirmation for positive/high-concern results.

## Retraining

```bash
cd fmd-module
python -m venv venv && venv\Scripts\activate   # or source venv/bin/activate
pip install -r requirements.txt

# Train (writes models/model/fmd_model.h5 + label_encoder.pkl + reports)
python -m src.training.train --backbone efficientnet --image-size 160

# Evaluate the held-out test split (writes evaluation_report.json + plots)
python -m src.training.evaluate

# Optional: dataset class-balance report
python -m src.analyze_dataset

# Run tests (pytest is a test-only dependency, not in requirements.txt)
pip install pytest
python -m pytest tests/ -v
```

`src/preprocessing/image_pipeline.py` is the single source of truth for
image decoding/resizing/normalization and is used identically by both
training and the live API (`src/training/predict.py`), so there is no
train/serve preprocessing skew.

**Backbone-specific input scaling matters.** `preprocess_image()` normalizes
pixels to `[0, 1]`. The training model then rescales that per backbone
inside `build_model()`: EfficientNetB0 expects raw `[0, 255]` pixels (it has
its own internal normalization layer), so its input is rescaled back up;
MobileNetV2 expects `[-1, 1]`. This rescale layer is saved as part of the
model file, so inference needs no special handling — but if you add a new
backbone, make sure you add its expected input range here too.

## API endpoints

All endpoints are served from this module directly (default port `5002`,
override with `FMD_PORT`). The main backend proxies these under
`/api/modules/fmd/...` — see `backend/routes/module_routes.py`.

| Method | Path | Body | Notes |
| --- | --- | --- | --- |
| GET | `/health` | – | Liveness check. |
| GET | `/metrics` | – | Returns `evaluation_report.json` (404 if not yet trained). |
| POST | `/predict` | JSON: `{"image", "farmer_id", "data": {"temperature","activity","feeding"}}` | Alias of `/predict-fmd`. Used by the generic `/api/modules/fmd/predict` proxy. `farmer_id` is optional; enables the weather half of the hybrid assessment. |
| POST | `/predict-fmd` | same as above | Image + clinical fusion, JSON in/out. |
| POST | `/api/predict/image` | multipart: `image`, optional `farmer_id` | Image-only prediction, no clinical fusion. Matches the other modules' image-only contract used by `predict_image_from_module`. |
| POST | `/api/predict/assisted` | multipart: `image` (required), `symptoms` (JSON string), `body_temperature`, `cow_id`, `farmer_id` | Used by the frontend FMD detection form via `/api/modules/fmd/predict-assisted`. |
| GET | `/weather/districts` | – | List of district names for the location picker. |
| GET | `/weather/current-risk` | query: `farmer_id`, optional `latitude`/`longitude` (legacy) | Weather-based FMD spread risk for the farmer's saved location, plus DAPH seasonal fields (`seasonal_active`, `environmental_risk`, etc. — see "Seasonal FMD risk" below). `400` if none saved yet. |
| POST | `/weather/location` | JSON: `{"farmer_id", "district"}` (preferred) or `{"farmer_id", "latitude", "longitude"}` (legacy) | Save/update a farmer's farm location. |
| GET | `/weather/location` | query: `farmer_id` | Returns `{farmer_id, district, latitude, longitude}`; `404` if none saved. |
| GET | `/weather/history` / `/weather/trend` | query: `farmer_id` | 30-day history / 7-day trend of weather risk. |

All prediction endpoints return invalid input as `4xx` JSON (`{"error": ...}`)
and never raise an unhandled exception — missing model files return `503`,
bad payloads return `400`, and unexpected failures return `500` with a
`details` field. The weather half of the hybrid assessment degrades
gracefully: if there's no saved location or the weather API is down, the
image assessment is still returned with `weather_risk.available: false` and
a clear `message` — the endpoint never fails just because weather is
unavailable.

Example response shape (all prediction endpoints — backward compatible with
the pre-hybrid response, with `weather_risk` and `hybrid_assessment` added):

```json
{
  "disease": "Foot and Mouth Disease",
  "predicted_label": "1",
  "risk_level": "High",
  "stage": "High",
  "confidence": "91.2%",
  "confidence_score": 0.912,
  "recommendation": "Isolate the animal, monitor closely, and notify a veterinarian.",
  "advice": "Isolate the animal, monitor closely, and notify a veterinarian.",
  "weather_risk": {
    "available": true,
    "level": "LOW",
    "environmental_level": "MEDIUM",
    "seasonal_active": true,
    "seasonal_period": "December–February",
    "seasonal_explanation": "Current date is within the historical December–February FMD epidemic commencement period reported by DAPH Sri Lanka. This seasonal observation is associated in the DAPH report with livestock movement returning to villages, particularly in the dry zone.",
    "seasonal_disclaimer": "This seasonal indicator is based on a documented historical observation and has not been independently validated against multi-year outbreak-date data by this system.",
    "seasonal_source": "DAPH Sri Lanka Annual Report 2022",
    "temperature": 25.7,
    "humidity": 90.7,
    "rainfall": 0.86,
    "message": null
  },
  "hybrid_assessment": {
    "image_result": "FMD-consistent lesions detected",
    "image_confidence": 0.912,
    "weather_available": true,
    "weather_risk_level": "MEDIUM",
    "overall_assessment": "HIGH CONCERN",
    "recommendation": "Isolate the suspected animal and seek veterinary confirmation as soon as possible.",
    "explanation": "Image analysis: FMD-consistent lesions detected (91.2% confidence). Weather-based FMD spread risk at your farm location: MEDIUM. Combined assessment: HIGH CONCERN."
  }
}
```
(This example shows `level: "LOW"` escalated to `environmental_level: "MEDIUM"` by the Dec–Feb seasonal rule — `hybrid_assessment.weather_risk_level` reflects the escalated value, since that's what actually drives the fusion table. Outside Dec–Feb, `environmental_level` always equals `level`.)

## Location handling

**Browser geolocation is intentionally not used.** The farmer picks their
farm's **district** on the FMD page (dropdown, populated from
`GET /weather/districts`); it is resolved to approximate coordinates via
`weather/sri_lanka_districts.py` and saved. Every later weather-risk request
for that `farmer_id` automatically reuses the saved district until the
farmer explicitly changes it (e.g. Anuradhapura → Colombo), exactly like a
profile setting.

**Important limitation — this is not literally the shared CattleSense
profile.** The shared farmer profile (`backend/models/user.py` /
`ProfilePage.jsx`) has no location field of any kind (not even a district
string), and per this module's scope restriction, that shared code was not
modified. So this district selection lives entirely inside `fmd-module`'s
own SQLite store (`weather/weather_location_model.py`, table
`farmer_location`, keyed by `farmer_id`) — it behaves like a saved profile
location for FMD purposes, but is not literally part of the shared Profile
page. **If the team later adds a real location/district field to the shared
User model**, this module should be pointed at that instead of maintaining
its own copy — the natural integration point is
`get_weather_risk_for_farmer()` in `src/app.py`, which currently reads only
from `weather_location_model.FarmerLocationStore`.

Coordinates/district are not an input to the image or clinical-symptom
prediction — only to the weather-risk signal. If no location has ever been
saved, `/weather/current-risk` returns `400` with a message asking the
farmer to set one; the image assessment still works without it (see Hybrid
decision logic below).

## Hybrid decision logic

`src/training/hybrid.py` combines the image result and a risk level into
one transparent assessment — never a single opaque multiplied score, and a
positive image result is never downgraded just because environmental risk
is low. **`hybrid.py` itself is backbone-agnostic about where that risk
level comes from** — today it receives `environmental_risk` (weather risk
after the DAPH seasonal escalation below, see "Seasonal FMD risk"), not the
raw weather risk directly. This keeps the fusion logic itself simple, fixed,
and already tested, regardless of how the upstream risk level is computed:

| Image result | Risk level in | Overall assessment |
| --- | --- | --- |
| FMD-consistent lesions detected | HIGH | HIGH CONCERN |
| FMD-consistent lesions detected | MEDIUM | HIGH CONCERN |
| FMD-consistent lesions detected | LOW | POSSIBLE FMD |
| No visible FMD lesions detected | HIGH | ELEVATED ENVIRONMENTAL RISK |
| No visible FMD lesions detected | MEDIUM | MODERATE ENVIRONMENTAL RISK |
| No visible FMD lesions detected | LOW | LOW CURRENT CONCERN |

If the risk level is unavailable (no saved location, or the weather API
failed), the assessment falls back to the image result alone and says so
explicitly — the image model always keeps working regardless of weather
availability. Every response includes an `explanation` field stating why
that result was produced, and a `recommendation`.

## Seasonal FMD risk (DAPH-based)

`weather/seasonal_risk.py` adds one further, deliberately simple rule on
top of the (unmodified) weather risk score, based on a documented historical
observation in the **DAPH Sri Lanka Annual Report 2022**:

> "FMD epidemics in Sri Lanka always commenced during the northeast monsoon
> between December and February. This coincides with the seasonal movement
> of livestock returning to the villages as a part of extensive livestock
> management practice especially in dry zone."

**This is a single cited historical/administrative observation, not a
trained or statistically validated model.** It is a pure function of
today's date — no machine learning, no numeric multiplier, no new dataset,
and the existing rainfall/temperature/humidity thresholds are untouched.
Deliberately, this project does **not** call December–February a
"high-incidence period" and does **not** claim the month causes FMD — DAPH's
own stated mechanism is livestock movement, not the calendar.

**The rule** (`compute_environmental_risk()`): if today's month is
December, January, or February, escalate the weather risk by exactly one
category; otherwise leave it unchanged.

| Period | Weather Risk | Environmental FMD Risk |
| --- | --- | --- |
| Dec–Feb | LOW | MEDIUM |
| Dec–Feb | MEDIUM | HIGH |
| Dec–Feb | HIGH | HIGH |
| Mar–Nov | LOW | LOW |
| Mar–Nov | MEDIUM | MEDIUM |
| Mar–Nov | HIGH | HIGH |

The **raw weather risk is never hidden** — both `weather_risk`/`level` (raw)
and `environmental_risk`/`environmental_level` (seasonally-adjusted) are
present in every API response and shown separately in the UI. Seasonal
context (`seasonal_active`, `seasonal_period`, `seasonal_explanation`,
`seasonal_disclaimer`, `seasonal_source`) is computed and returned even when
live weather is unavailable, since it only depends on the date.

**Research-paper-safe wording:**
- Safe: "A rule-based seasonal indicator was added based on a documented
  historical observation in the DAPH Sri Lanka Annual Report (2022): FMD
  epidemics have historically commenced during the December–February
  northeast monsoon period, coinciding with seasonal livestock movement."
- Safe: "This is a deterministic, calendar-based escalation rule, not a
  trained statistical or machine-learning component, and has not been
  independently validated against multi-year outbreak-date data by this
  project."
- **Not safe**: "December–February causes FMD," "high-incidence period,"
  "the seasonal model was trained/validated," any accuracy/precision/recall
  figure for the seasonal rule (there is no ground truth to score a calendar
  rule against), or presenting DAPH's 2022 aggregate case/district counts as
  data this system was trained or tested on — they are cited only as
  supporting context for the seasonal observation.

## Weather risk methodology

**This is a documented rule-based threshold scorer, not a trained ML
model.** `weather/weather_risk_model.py` contains an untrained
`RandomForestClassifier` scaffold (`.train()`/`.save()`/`.load()`) for a
future dataset, but **no labelled weather→FMD-outbreak dataset exists
anywhere in this repository**, so it has never been fitted and no `.pkl`
file exists for it. Fabricating training data for it would produce
meaningless, falsely-authoritative results, so the module falls back to
`_fallback_threshold_prediction()` (fixed thresholds on rainfall/humidity/
temperature, see `weather/weather_constants.py`) unconditionally today. If
a real historical dataset becomes available, wire it through
`WeatherRiskModel.train()` and it will be used automatically once a `.pkl`
exists — no other code changes needed.

Hourly forecast data (Open-Meteo, `weather_code`, `temperature_2m`,
`relative_humidity_2m`, `precipitation`) is aggregated to a single "today"
value in `weather/utils.py`: **temperature and humidity are daily
averages**, **rainfall is a daily total** (sum of the hourly values, not an
average — averaging would understate how much rain actually fell).

**Threshold caveat:** `DEFAULT_THRESHOLDS["rainfall_high"] = 8.0` (mm) is a
rule-of-thumb inherited from the original implementation, not validated
against real FMD outbreak data. Its meaning has shifted now that rainfall
is a true daily total rather than an hourly average — 8mm/day is a fairly
ordinary rainy day in Sri Lanka, not necessarily "high risk". Revisit this
threshold with someone who has veterinary-epidemiology domain expertise
before relying on it for real decisions; it was not changed here because
doing so without real data would just be a different fabricated number.
