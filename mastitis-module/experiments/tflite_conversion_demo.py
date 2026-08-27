#!/usr/bin/env python3
"""
=============================================================================
CattleSense Research Experiment: Edge & Offline Deployment Feasibility
=============================================================================
Title: MobileNetV2 TFLite Conversion and Latency Benchmark for On-Device
       Bovine Mastitis Screening
Author: CattleSense Research Team
Scope: Standalone research experiment / feasibility analysis.
       NOT for replacing the production ResNet50 deployment in Flask API.

Description:
This experiment explores mobile/edge deployment feasibility of a lightweight
MobileNetV2 image classification model for bovine mastitis detection.
Compared to the heavy production ResNet50 architecture (~93.6 MB), MobileNetV2
offers an ultra-compact footprint suitable for low-connectivity rural farms.

Workflow:
1. Loads the trained MobileNetV2 checkpoint (mobilenetv2_stage1_best.keras).
2. Converts the model into TensorFlow Lite (TFLite) format:
   - Standard optimized TFLite (tf.lite.Optimize.DEFAULT)
   - Float16 quantized TFLite (size & speed tradeoff analysis)
3. Benchmarks model file sizes and compression factors against ResNet50.
4. Benchmarks CPU inference latencies over 30 test runs via TFLite Interpreter API.
5. Verifies prediction consistency against real sample dataset images.
6. Generates structured benchmark results (CSV & JSON summaries).
=============================================================================
"""

import os
import sys
import time
import json
import csv
from pathlib import Path
import numpy as np
from PIL import Image
import tensorflow as tf

# Add parent directory for imports
MODULE_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(MODULE_ROOT))

from preprocessing.image_preprocessing import preprocess_image_for_model1


# ---------------------------------------------------------------------------
# Configuration & Paths (All kept strictly within experiments/)
# ---------------------------------------------------------------------------
EXPERIMENTS_DIR = MODULE_ROOT / "experiments"
INPUT_KERAS_MODEL = EXPERIMENTS_DIR / "mobilenetv2_stage1_best.keras"
OUTPUT_TFLITE_DEFAULT = EXPERIMENTS_DIR / "mobilenetv2_stage1.tflite"
OUTPUT_TFLITE_FP16 = EXPERIMENTS_DIR / "mobilenetv2_stage1_fp16.tflite"
PRODUCTION_RESNET_MODEL = MODULE_ROOT / "models" / "model1" / "mastitis_image_model.keras"

DATASET_NORMAL_DIR = MODULE_ROOT / "dataset" / "images" / "normal"
DATASET_MASTITIS_DIR = MODULE_ROOT / "dataset" / "images" / "mastitis"

NUM_BENCHMARK_RUNS = 30
NUM_WARMUP_RUNS = 5
INPUT_SHAPE = (1, 224, 224, 3)


def get_file_size_mb(path: Path) -> float:
    """Return file size in Megabytes (MB)."""
    if path.exists():
        return path.stat().st_size / (1024 * 1024)
    return 0.0


def convert_to_tflite_default(keras_model, output_path: Path) -> bytes:
    """Convert Keras model to TFLite with default optimization."""
    print(f"\n[1/2] Converting to Default Optimized TFLite: {output_path.name}...")
    converter = tf.lite.TFLiteConverter.from_keras_model(keras_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    tflite_model_bytes = converter.convert()
    
    with open(output_path, "wb") as f:
        f.write(tflite_model_bytes)
    
    size_mb = get_file_size_mb(output_path)
    print(f"  ✓ Saved {output_path.name} ({size_mb:.2f} MB)")
    return tflite_model_bytes


def convert_to_tflite_fp16(keras_model, output_path: Path) -> bytes:
    """Convert Keras model to TFLite with Float16 quantization."""
    print(f"\n[2/2] Converting to Float16 Quantized TFLite: {output_path.name}...")
    converter = tf.lite.TFLiteConverter.from_keras_model(keras_model)
    converter.optimizations = [tf.lite.Optimize.DEFAULT]
    converter.target_spec.supported_types = [tf.float16]
    tflite_fp16_bytes = converter.convert()
    
    with open(output_path, "wb") as f:
        f.write(tflite_fp16_bytes)
    
    size_mb = get_file_size_mb(output_path)
    print(f"  ✓ Saved {output_path.name} ({size_mb:.2f} MB)")
    return tflite_fp16_bytes


def benchmark_tflite_interpreter(tflite_path: Path, runs: int = 30, warmup: int = 5):
    """
    Benchmark inference latency on CPU using TensorFlow Lite Interpreter.
    """
    interpreter = tf.lite.Interpreter(model_path=str(tflite_path))
    interpreter.allocate_tensors()
    
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    input_index = input_details[0]["index"]
    output_index = output_details[0]["index"]
    
    # Generate dummy input matching preprocessing range [0, 255] float32
    dummy_input = np.random.uniform(0.0, 255.0, size=INPUT_SHAPE).astype(np.float32)
    
    # Warmup runs
    for _ in range(warmup):
        interpreter.set_tensor(input_index, dummy_input)
        interpreter.invoke()
        _ = interpreter.get_tensor(output_index)
        
    # Timed runs
    latencies = []
    for _ in range(runs):
        start = time.perf_counter()
        interpreter.set_tensor(input_index, dummy_input)
        interpreter.invoke()
        _ = interpreter.get_tensor(output_index)
        end = time.perf_counter()
        latencies.append((end - start) * 1000.0)  # ms
        
    latencies = np.array(latencies)
    return {
        "mean_ms": float(np.mean(latencies)),
        "std_ms": float(np.std(latencies)),
        "min_ms": float(np.min(latencies)),
        "max_ms": float(np.max(latencies)),
        "p95_ms": float(np.percentile(latencies, 95)),
        "fps": float(1000.0 / np.mean(latencies)),
    }


def benchmark_keras_model(keras_model, runs: int = 30, warmup: int = 5):
    """Benchmark raw Keras model inference on CPU."""
    dummy_input = np.random.uniform(0.0, 255.0, size=INPUT_SHAPE).astype(np.float32)
    
    # Warmup
    for _ in range(warmup):
        _ = keras_model(dummy_input, training=False)
        
    latencies = []
    for _ in range(runs):
        start = time.perf_counter()
        _ = keras_model(dummy_input, training=False)
        end = time.perf_counter()
        latencies.append((end - start) * 1000.0)
        
    latencies = np.array(latencies)
    return {
        "mean_ms": float(np.mean(latencies)),
        "std_ms": float(np.std(latencies)),
        "min_ms": float(np.min(latencies)),
        "max_ms": float(np.max(latencies)),
        "p95_ms": float(np.percentile(latencies, 95)),
        "fps": float(1000.0 / np.mean(latencies)),
    }


def predict_tflite(interpreter, preprocessed_image_array: np.ndarray) -> float:
    """Run single image inference through TFLite Interpreter."""
    input_details = interpreter.get_input_details()
    output_details = interpreter.get_output_details()
    
    input_tensor = np.expand_dims(preprocessed_image_array, axis=0).astype(np.float32)
    interpreter.set_tensor(input_details[0]["index"], input_tensor)
    interpreter.invoke()
    output_data = interpreter.get_tensor(output_details[0]["index"])
    return float(output_data[0][0])


def evaluate_sample_predictions(keras_model, default_tflite_path: Path, fp16_tflite_path: Path):
    """
    Compare predictions across Keras vs TFLite Default vs TFLite FP16 on real dataset samples.
    """
    print("\n" + "=" * 80)
    print(" SAMPLE IMAGE CONSISTENCY & FIDELITY VALIDATION")
    print("=" * 80)
    
    # Load interpreters
    interp_default = tf.lite.Interpreter(model_path=str(default_tflite_path))
    interp_default.allocate_tensors()
    
    interp_fp16 = tf.lite.Interpreter(model_path=str(fp16_tflite_path))
    interp_fp16.allocate_tensors()
    
    # Pick 3 normal and 3 mastitis sample images
    normal_samples = (
        list(DATASET_NORMAL_DIR.glob("*.jpg")) + list(DATASET_NORMAL_DIR.glob("*.png"))
    )[:3]
    mastitis_samples = (
        list(DATASET_MASTITIS_DIR.glob("*.jpg")) + list(DATASET_MASTITIS_DIR.glob("*.png"))
    )[:3]
    
    test_samples = [("Normal", p) for p in normal_samples] + [("Mastitis", p) for p in mastitis_samples]
    
    results = []
    print(f"{'Filename':<32} | {'True Label':<8} | {'Keras Prob':<10} | {'TFLite Prob':<11} | {'FP16 Prob':<10} | {'Delta':<8} | {'Match?'}")
    print("-" * 98)
    
    all_match = True
    for true_label, img_path in test_samples:
        pil_img = Image.open(img_path).convert("RGB")
        preprocessed_arr, _ = preprocess_image_for_model1(pil_img)
        
        # 1. Keras prediction
        keras_input = np.expand_dims(preprocessed_arr, axis=0)
        keras_prob = float(keras_model(keras_input, training=False).numpy()[0][0])
        keras_label = "Mastitis" if keras_prob >= 0.5 else "Normal"
        
        # 2. TFLite Default prediction
        tflite_prob = predict_tflite(interp_default, preprocessed_arr)
        tflite_label = "Mastitis" if tflite_prob >= 0.5 else "Normal"
        
        # 3. TFLite FP16 prediction
        fp16_prob = predict_tflite(interp_fp16, preprocessed_arr)
        fp16_label = "Mastitis" if fp16_prob >= 0.5 else "Normal"
        
        max_delta = max(abs(keras_prob - tflite_prob), abs(keras_prob - fp16_prob))
        matches = (keras_label == tflite_label == fp16_label)
        if not matches:
            all_match = False
            
        short_name = img_path.name[:30] + ".." if len(img_path.name) > 30 else img_path.name
        match_str = "✓ YES" if matches else "✗ NO"
        print(f"{short_name:<32} | {true_label:<8} | {keras_prob:>9.4f}  | {tflite_prob:>10.4f}  | {fp16_prob:>9.4f} | {max_delta:>7.4f} | {match_str}")
        
        results.append({
            "filename": img_path.name,
            "true_label": true_label,
            "keras_prob": round(keras_prob, 4),
            "keras_label": keras_label,
            "tflite_prob": round(tflite_prob, 4),
            "tflite_label": tflite_label,
            "fp16_prob": round(fp16_prob, 4),
            "fp16_label": fp16_label,
            "max_probability_delta": round(max_delta, 5),
            "labels_consistent": matches,
        })
        
    return results, all_match


def run_experiment():
    """Main execution entry point."""
    print("=" * 80)
    print(" CATTLESENSE RESEARCH: MOBILENETV2 TFLITE EDGE CONVERSION & BENCHMARK")
    print("=" * 80)
    print(f"Target Checkpoint: {INPUT_KERAS_MODEL}")
    print(f"Output Directory:  {EXPERIMENTS_DIR}")
    print(f"Benchmark Runs:    {NUM_BENCHMARK_RUNS} iterations (with {NUM_WARMUP_RUNS} warmup runs)")
    
    if not INPUT_KERAS_MODEL.exists():
        raise FileNotFoundError(f"Missing input checkpoint: {INPUT_KERAS_MODEL}")
        
    # 1. Load Keras MobileNetV2 Model
    print("\nLoading MobileNetV2 Keras model...")
    keras_model = tf.keras.models.load_model(str(INPUT_KERAS_MODEL))
    print(f"✓ Successfully loaded model. Parameter count: {keras_model.count_params():,}")
    
    # 2. Perform TFLite Conversions
    convert_to_tflite_default(keras_model, OUTPUT_TFLITE_DEFAULT)
    convert_to_tflite_fp16(keras_model, OUTPUT_TFLITE_FP16)
    
    # 3. Model Size Profiling
    size_resnet_mb = get_file_size_mb(PRODUCTION_RESNET_MODEL)
    size_keras_mb = get_file_size_mb(INPUT_KERAS_MODEL)
    size_tflite_mb = get_file_size_mb(OUTPUT_TFLITE_DEFAULT)
    size_fp16_mb = get_file_size_mb(OUTPUT_TFLITE_FP16)
    
    # 4. Latency Benchmarking
    print("\nBenchmarking CPU inference latency...")
    bench_keras = benchmark_keras_model(keras_model, runs=NUM_BENCHMARK_RUNS, warmup=NUM_WARMUP_RUNS)
    print(f"  • MobileNetV2 (Keras Model):       {bench_keras['mean_ms']:.2f} ± {bench_keras['std_ms']:.2f} ms ({bench_keras['fps']:.1f} FPS)")
    
    bench_tflite = benchmark_tflite_interpreter(OUTPUT_TFLITE_DEFAULT, runs=NUM_BENCHMARK_RUNS, warmup=NUM_WARMUP_RUNS)
    print(f"  • MobileNetV2 (TFLite Default):    {bench_tflite['mean_ms']:.2f} ± {bench_tflite['std_ms']:.2f} ms ({bench_tflite['fps']:.1f} FPS)")
    
    bench_fp16 = benchmark_tflite_interpreter(OUTPUT_TFLITE_FP16, runs=NUM_BENCHMARK_RUNS, warmup=NUM_WARMUP_RUNS)
    print(f"  • MobileNetV2 (TFLite Float16):    {bench_fp16['mean_ms']:.2f} ± {bench_fp16['std_ms']:.2f} ms ({bench_fp16['fps']:.1f} FPS)")
    
    # 5. Evaluate Sample Prediction Consistency
    sample_results, all_consistent = evaluate_sample_predictions(keras_model, OUTPUT_TFLITE_DEFAULT, OUTPUT_TFLITE_FP16)
    
    # 6. Build Summary Table
    print("\n" + "=" * 80)
    print(" EDGE DEPLOYMENT FEASIBILITY SUMMARY")
    print("=" * 80)
    
    table_data = [
        {
            "model_format": "ResNet50 (Production Keras)",
            "file_size_mb": round(size_resnet_mb, 2),
            "size_reduction": "Baseline (0%)",
            "avg_cpu_latency_ms": "~45.0 - 65.0*",
            "throughput_fps": "~18 FPS",
            "sample_match": "N/A (Reference)",
        },
        {
            "model_format": "MobileNetV2 (Original Keras)",
            "file_size_mb": round(size_keras_mb, 2),
            "size_reduction": f"{((size_resnet_mb - size_keras_mb) / size_resnet_mb * 100):.1f}% vs ResNet",
            "avg_cpu_latency_ms": f"{bench_keras['mean_ms']:.2f} ± {bench_keras['std_ms']:.2f}",
            "throughput_fps": f"{bench_keras['fps']:.1f} FPS",
            "sample_match": "Original Baseline",
        },
        {
            "model_format": "MobileNetV2 (TFLite Default)",
            "file_size_mb": round(size_tflite_mb, 2),
            "size_reduction": f"{((size_resnet_mb - size_tflite_mb) / size_resnet_mb * 100):.1f}% vs ResNet",
            "avg_cpu_latency_ms": f"{bench_tflite['mean_ms']:.2f} ± {bench_tflite['std_ms']:.2f}",
            "throughput_fps": f"{bench_tflite['fps']:.1f} FPS",
            "sample_match": "100% Consistent" if all_consistent else "Partial Match",
        },
        {
            "model_format": "MobileNetV2 (TFLite Float16)",
            "file_size_mb": round(size_fp16_mb, 2),
            "size_reduction": f"{((size_resnet_mb - size_fp16_mb) / size_resnet_mb * 100):.1f}% vs ResNet",
            "avg_cpu_latency_ms": f"{bench_fp16['mean_ms']:.2f} ± {bench_fp16['std_ms']:.2f}",
            "throughput_fps": f"{bench_fp16['fps']:.1f} FPS",
            "sample_match": "100% Consistent" if all_consistent else "Partial Match",
        },
    ]
    
    print(f"{'Model Format':<32} | {'Size (MB)':<10} | {'Size Reduction':<18} | {'Avg CPU (ms)':<16} | {'Sample Match':<18}")
    print("-" * 105)
    for row in table_data:
        print(f"{row['model_format']:<32} | {row['file_size_mb']:>9.2f}  | {row['size_reduction']:<18} | {row['avg_cpu_latency_ms']:<16} | {row['sample_match']:<18}")
        
    print("\n* ResNet50 production latency is from previous server-grade benchmark runs.")
    
    # 7. Save Structured Summaries to experiments/
    summary_json_path = EXPERIMENTS_DIR / "tflite_benchmark_results.json"
    summary_csv_path = EXPERIMENTS_DIR / "tflite_benchmark_summary.csv"
    
    full_report = {
        "experiment": "MobileNetV2 TFLite Edge Feasibility",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "benchmark_runs": NUM_BENCHMARK_RUNS,
        "models_profiled": table_data,
        "latency_details": {
            "mobilenetv2_keras": bench_keras,
            "mobilenetv2_tflite_default": bench_tflite,
            "mobilenetv2_tflite_fp16": bench_fp16,
        },
        "sample_validation": sample_results,
        "files_generated": [
            str(OUTPUT_TFLITE_DEFAULT.relative_to(MODULE_ROOT)),
            str(OUTPUT_TFLITE_FP16.relative_to(MODULE_ROOT)),
        ],
    }
    
    with open(summary_json_path, "w") as f:
        json.dump(full_report, f, indent=2)
    print(f"\n✓ Saved JSON report: {summary_json_path.relative_to(MODULE_ROOT)}")
    
    with open(summary_csv_path, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=list(table_data[0].keys()))
        writer.writeheader()
        writer.writerows(table_data)
    print(f"✓ Saved CSV summary:  {summary_csv_path.relative_to(MODULE_ROOT)}")
    
    print("\n" + "=" * 80)
    print(" RESEARCH EXPERIMENT COMPLETED SUCCESSFULLY (PRODUCTION CODE UNTOUCHED)")
    print("=" * 80)
    return full_report


if __name__ == "__main__":
    run_experiment()
