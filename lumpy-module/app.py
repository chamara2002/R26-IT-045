from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.get("/health")
def health_check():
    return jsonify({"status": "ok", "service": "lumpy-module"})


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON payload"}), 400

    result = {
        "disease": "lumpy",
        "stage": "moderate",
        "confidence": 0.69,
        "advice": "Separate symptomatic animals and begin supportive care under vet guidance.",
    }
    return jsonify(result), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5003, debug=True)
