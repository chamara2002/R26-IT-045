# Archived: corrupted dataset images

Images moved here were found to be truncated/corrupt (fail to fully decode
with PIL: "broken data stream when reading image file") during a dataset
quality pass. They are kept here rather than deleted in case the original
source image can be re-acquired for research reproducibility, but they are
excluded from `models/dataset/` so they are not silently fed into training.

| File | Original class | Issue |
| --- | --- | --- |
| `Non-diseased udder 4.jpeg` | `0` (non-diseased) | Truncated JPEG data stream |
