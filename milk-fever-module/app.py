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

    # Robust extraction: merge top-level body and nested 'data' dictionary
    data = {}
    if isinstance(body, dict):
        data.update(body)
        nested = body.get('data')
        if isinstance(nested, dict):
            data.update(nested)

    thi = body.get('thi') if isinstance(body, dict) and body.get('thi') is not None else data.get('thi')

    from utils.preprocessor import build_feature_vector
    feature_array, errors, feature_dict, used_lab = build_feature_vector(data)

    if errors:
        return jsonify({"error": "Validation failed", "details": errors}), 422

    try:
        predictor = get_predictor()
        result    = predictor(feature_array, feature_dict, thi)
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
        "base_risk_score":     result["base_risk_score"],
        "thi_adjustment":      result["thi_adjustment"],
        "requires_vet_report": result["requires_vet_report"],
        "explanation":         result["explanation"],
        "used_lab_values":     used_lab,
        "feature_values":      result["feature_values"],
    }), 200


@app.route('/api/report/pdf', methods=['POST'])
def report_pdf():
    """Build a downloadable PDF report for Milk Fever diagnostic results in English or Sinhala."""
    from utils.report_generator import build_milk_fever_report
    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"error": "No payload provided for PDF report generation"}), 400

    try:
        language = payload.get("language", "en")
        pdf_bytes = build_milk_fever_report(payload, language=language)
    except Exception as exc:
        return jsonify({"error": f"Failed to generate Milk Fever PDF report: {str(exc)}"}), 500

    cow_info = payload.get("cattle_info") or payload.get("cow") or {}
    cow_tag = cow_info.get("tag_id") or cow_info.get("name") or "Cow"
    response = app.response_class(pdf_bytes, mimetype="application/pdf")
    response.headers["Content-Disposition"] = f"attachment; filename=milk_fever_report_{cow_tag}_{language}.pdf"
    return response


if __name__ == '__main__':
    port = int(os.getenv('FLASK_PORT', 5004))
    print(f"Milk Fever Module running on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)