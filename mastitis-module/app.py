from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


@app.get("/health")
def health_check():
    return jsonify({"status": "ok", "service": "milk-fever-module"})


@app.post("/predict")
def predict():
    payload = request.get_json(silent=True)
    if payload is None:
        return jsonify({"error": "Invalid JSON payload"}), 400

    result = {
        "disease": "milk-fever",
        "stage": "early",
        "confidence": 0.66,
        "advice": "Provide immediate veterinary support and monitor calcium status closely.",
    }
    return jsonify(result), 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5004, debug=True)
