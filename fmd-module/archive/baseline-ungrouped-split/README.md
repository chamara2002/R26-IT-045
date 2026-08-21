# Baseline: ungrouped-split evaluation

These reports are from the training run immediately after the EfficientNetB0
input-range bug was fixed, but **before** grouped (leakage-aware) splitting
was added. The train/test split was a plain per-image stratified split, so
the 2 same-case image clusters identified later (`"2 day vesicle, steer"`
and `"7 day vesicle, steer"`) could have had some of their photos in
training and others in the test set.

Kept here as the honest "before" comparison point for the current
`models/model/evaluation_report.json`, which uses a grouped split (see
`model_metadata.json`'s `split_methodology` field for details). Do not use
these files for anything except that comparison — they are not the current
model's metrics.
