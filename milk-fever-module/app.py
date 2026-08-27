import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

_predictor = None

def get_predictor():
    global _predictor
    if _predictor is None:
        from utils.predictor import predict
        _predictor = predict
    return _predictor

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "message": "Milk Fever Detection Module",
        "version": "1.0.0"
    }), 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status":  "ok",
        "module":  "milk-fever",
        "version": "1.0.0"
    }), 200

@app.route('/predict', methods=['POST'])
def predict():
    body = request.get_json(silent=True)
    if not body:
        return jsonify({"error": "Request body must be valid JSON."}), 400

    data = body.get('data', body)

    from utils.preprocessor import validate_and_extract
    features, errors = validate_and_extract(data)

    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 422

    try:
        predictor = get_predictor()
        result = predictor(features)
    except FileNotFoundError:
        return jsonify({
            "error": "Model not trained yet. Run scripts/train_model.py first."
        }), 503
    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500

    return jsonify({
        "disease":             result["disease"],
        "stage":               result["stage"],
        "confidence":          result["confidence"],
        "advice":              result["advice"],
        "risk_score":          result["risk_score"],
        "requires_vet_report": result["requires_vet_report"],
    }), 200

if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5004))
    print(f"Milk Fever Module running on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)