import base64
import io
import json
import os
from pathlib import Path
from typing import Any, Dict

from flask import Flask, jsonify, request
from flask_cors import CORS

from src.training.predict import (
    build_recommendation,
    calculate_risk_level,
    load_model_and_encoder,
    predict_from_base64,
)
from src.utils.file_utils import ensure_dir
from weather.weather_routes import weather_blueprint


BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR.parent / "models" / "model"
ensure_dir(MODEL_DIR)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.register_blueprint(weather_blueprint)

model = None
label_encoder = None


def get_model_and_encoder():
    global model, label_encoder
    if model is None or label_encoder is None:
        model, label_encoder = load_model_and_encoder()
    return model, label_encoder


def parse_clinical_data(payload: Dict[str, Any]) -> Dict[str, float]:
    data = payload.get("data", {}) if isinstance(payload, dict) else {}
    return {
        "temperature": float(data.get("temperature", 0.0) or 0.0),
        "activity": float(data.get("activity", 0.0) or 0.0),
        "feeding": float(data.get("feeding", 0.0) or 0.0),
    }


def parse_form_payload() -> Dict[str, Any]:
    payload = {}
    if request.is_json:
        payload = request.get_json(silent=True) or {}
    else:
        payload = {
            "data": {},
        }

    if request.form.get("symptoms"):
        try:
            payload["symptoms"] = json.loads(request.form.get("symptoms", "{}"))
        except json.JSONDecodeError:
            payload["symptoms"] = {}

    if request.form.get("body_temperature"):
        payload.setdefault("data", {})["temperature"] = float(request.form.get("body_temperature"))

    if request.form.get("cow_id"):
        payload.setdefault("data", {})["cow_id"] = request.form.get("cow_id")

    return payload


def build_response(predicted_label: str, confidence: float, risk_level: str, recommendation: str) -> Dict[str, Any]:
    return {
        "disease": "Foot and Mouth Disease",
        "predicted_label": predicted_label,
        "risk_level": risk_level,
        "stage": risk_level,
        "confidence": f"{confidence * 100:.1f}%",
        "confidence_score": round(confidence, 4),
        "recommendation": recommendation,
        "advice": recommendation,
    }


@app.get("/health")
def health_check():
    return jsonify({"status": "ok", "service": "fmd-module"})


@app.get("/metrics")
def get_metrics():
    report_path = MODEL_DIR / "evaluation_report.json"
    if not report_path.exists():
        return jsonify({
            "status": "missing",
            "error": "Evaluation report not found",
            "accuracy": None,
        }), 404

    with report_path.open("r", encoding="utf-8") as report_file:
        report = json.load(report_file)

    return jsonify({
        "status": "ok",
        "accuracy": report.get("accuracy"),
        "report": report,
    }), 200


@app.post("/predict-fmd")
def predict_fmd():
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON payload"}), 400

    image_data = payload.get("image")
    if not image_data:
        return jsonify({"error": "Missing image data"}), 400

    try:
        model, label_encoder = get_model_and_encoder()
        clinical_data = parse_clinical_data(payload)
        predicted_label, confidence, _ = predict_from_base64(image_data, model, label_encoder)
        risk_level = calculate_risk_level(
            confidence,
            clinical_data["temperature"],
            clinical_data["activity"],
            clinical_data["feeding"],
        )
        recommendation = build_recommendation(risk_level)
        return jsonify(build_response(predicted_label, confidence, risk_level, recommendation)), 200
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 503
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": "FMD prediction failed", "details": str(exc)}), 500


@app.post("/predict")
def predict():
    return predict_fmd()


@app.get("/")
@app.get("/weather/dashboard")
def weather_dashboard():
    return """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Weather-based FMD Novelty Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; background: #f7f9fc; color: #1f2937; }
          .card { background: white; padding: 20px; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.08); margin-bottom: 16px; }
          .badge { display: inline-block; padding: 6px 10px; border-radius: 999px; color: white; font-weight: bold; }
          .green { background: #2e7d32; }
          .amber { background: #f9a825; }
          .red { background: #c62828; }
          form { display: flex; gap: 10px; flex-wrap: wrap; }
          input { padding: 8px; border-radius: 6px; border: 1px solid #d1d5db; min-width: 140px; }
          button { padding: 8px 12px; border: none; border-radius: 6px; background: #2563eb; color: white; cursor: pointer; }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <h1>Weather-based FMD Novelty Dashboard</h1>
        <div class="card">
          <h2>FMD Weather Risk</h2>
          <form id="weather-form">
            <input id="latitude" value="7.5" placeholder="Latitude" />
            <input id="longitude" value="80.9" placeholder="Longitude" />
            <input id="farmer" value="demo" placeholder="Farmer ID" />
            <button type="submit">Load Weather Risk</button>
          </form>
          <p id="status">Loading weather risk…</p>
        </div>

        <div class="card" id="current-card">
          <h3>Current Weather</h3>
          <div id="current-weather">Waiting for data…</div>
        </div>

        <div class="card">
          <h3>30-day history</h3>
          <table>
            <thead>
              <tr><th>Date</th><th>Rainfall</th><th>Temperature</th><th>Humidity</th><th>Risk</th></tr>
            </thead>
            <tbody id="history-body"></tbody>
          </table>
        </div>

        <div class="card">
          <h3>7-day trend</h3>
          <ul id="trend-list"></ul>
        </div>

        <script>
          const form = document.getElementById('weather-form');
          const status = document.getElementById('status');
          const currentWeather = document.getElementById('current-weather');
          const historyBody = document.getElementById('history-body');
          const trendList = document.getElementById('trend-list');

          function renderRisk(data) {
            const colorClass = data.risk_level === 'HIGH' ? 'red' : data.risk_level === 'MEDIUM' ? 'amber' : 'green';
            currentWeather.innerHTML = `
              <p><span class="badge ${colorClass}">${data.risk_level}</span></p>
              <p><strong>Temperature:</strong> ${data.temperature} °C</p>
              <p><strong>Humidity:</strong> ${data.humidity} %</p>
              <p><strong>Rainfall:</strong> ${data.rainfall} mm</p>
              <p><strong>Alert:</strong> ${data.alert_message}</p>
              <p><strong>Banner color:</strong> ${data.banner_color}</p>
            `;
          }

          async function loadData() {
            const latitude = document.getElementById('latitude').value;
            const longitude = document.getElementById('longitude').value;
            const farmer = document.getElementById('farmer').value || 'demo';
            status.textContent = 'Loading weather risk…';

            try {
              const weatherRes = await fetch(`/weather/current-risk?latitude=${encodeURIComponent(latitude)}&longitude=${encodeURIComponent(longitude)}&farmer_id=${encodeURIComponent(farmer)}`);
              const weatherData = await weatherRes.json();
              if (weatherData.error) {
                status.textContent = weatherData.error;
                currentWeather.textContent = 'Unable to load weather risk.';
                return;
              }
              renderRisk(weatherData);
              status.textContent = 'Weather risk loaded successfully.';

              const historyRes = await fetch(`/weather/history?farmer_id=${encodeURIComponent(farmer)}`);
              const historyData = await historyRes.json();
              historyBody.innerHTML = historyData.length ? historyData.map(item => `
                <tr>
                  <td>${item.date}</td>
                  <td>${item.rainfall}</td>
                  <td>${item.temperature}</td>
                  <td>${item.humidity}</td>
                  <td>${item.predicted_risk}</td>
                </tr>
              `).join('') : '<tr><td colspan="5">No history yet.</td></tr>';

              const trendRes = await fetch(`/weather/trend?farmer_id=${encodeURIComponent(farmer)}`);
              const trendData = await trendRes.json();
              trendList.innerHTML = trendData.history.length ? trendData.history.map(item => `<li>${item.date}: ${item.predicted_risk}</li>`).join('') : '<li>No trend data yet.</li>';
            } catch (error) {
              status.textContent = 'Unable to load weather data.';
              currentWeather.textContent = error.message;
            }
          }

          form.addEventListener('submit', function (event) {
            event.preventDefault();
            loadData();
          });

          loadData();
        </script>
      </body>
    </html>
    """, 200


@app.post("/api/predict/assisted")
def predict_assisted():
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    image_file = request.files["image"]
    image_bytes = image_file.read()
    if not image_bytes:
        return jsonify({"error": "No image provided"}), 400

    image_stream = io.BytesIO(image_bytes)
    image_base64 = base64.b64encode(image_stream.getvalue()).decode("utf-8")

    payload = parse_form_payload()
    payload["image"] = image_base64
    try:
        model, label_encoder = get_model_and_encoder()
        clinical_data = parse_clinical_data(payload)
        predicted_label, confidence, _ = predict_from_base64(image_base64, model, label_encoder)
        risk_level = calculate_risk_level(
            confidence,
            clinical_data["temperature"],
            clinical_data["activity"],
            clinical_data["feeding"],
        )
        recommendation = build_recommendation(risk_level)
        return jsonify(build_response(predicted_label, confidence, risk_level, recommendation)), 200
    except FileNotFoundError as exc:
        return jsonify({"error": str(exc)}), 503
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400
    except Exception as exc:
        return jsonify({"error": "FMD prediction failed", "details": str(exc)}), 500


if __name__ == "__main__":
    port = int(os.getenv("FMD_PORT", "5002"))
    app.run(host="0.0.0.0", port=port, debug=True)
