"""Service for forwarding detection requests to independent ML modules."""

import os
from typing import Any

import requests

MODULES = {
    "mastitis": os.getenv("MASTITIS_URL", "http://localhost:5002"),
    "fmd": os.getenv("FMD_URL", "http://localhost:5005"),
    "lumpy": os.getenv("LUMPY_URL", "http://localhost:5003"),
    "milk-fever": os.getenv("MILK_FEVER_URL", "http://localhost:5004"),
}

REQUIRED_KEYS = {"disease", "stage", "confidence", "advice"}
OPTIONAL_KEYS = {"predicted_label", "risk_level", "confidence_score", "recommendation"}
REQUEST_TIMEOUT_SECONDS = 20


def list_modules() -> list[str]:
    """Return known ML module identifiers."""
    return sorted(MODULES.keys())


def _validate_module_response(payload: Any) -> bool:
    """Ensure module response follows expected contract while allowing richer envelope payloads."""
    if not isinstance(payload, dict):
        return False

    inner = payload.get("data") if isinstance(payload.get("data"), dict) else payload
    all_keys = set(payload.keys()) | set(inner.keys())

    has_required = REQUIRED_KEYS.issubset(all_keys)
    has_optional = bool(all_keys & OPTIONAL_KEYS)
    return has_required or has_optional or bool(payload.get("success"))


def predict_from_module(module_name: str, payload: dict):
    """Forward request to target module and return (json, status)."""
    if module_name not in MODULES:
        return {"error": "Unknown module", "module": module_name}, 404

    target_url = f"{MODULES[module_name]}/predict"
    try:
        response = requests.post(
            target_url,
            json=payload,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.Timeout:
        return {"error": f"{module_name} module timed out"}, 504
    except requests.ConnectionError:
        return {"error": f"{module_name} module is unavailable"}, 503
    except requests.HTTPError:
        try:
            err_json = response.json()
            err_msg = err_json.get("error") or err_json.get("message") or f"{module_name} module returned an error"
            return {"error": err_msg, "details": err_json}, response.status_code
        except Exception:
            body = response.text if "response" in locals() else ""
            return {
                "error": f"{module_name} module returned an error",
                "details": body,
            }, response.status_code
    except requests.RequestException as exc:
        return {"error": "Proxy request failed", "details": str(exc)}, 502

    try:
        response_json = response.json()
    except ValueError:
        return {"error": f"{module_name} module returned non-JSON response"}, 502

    if not _validate_module_response(response_json):
        return {
            "error": f"{module_name} module response schema mismatch",
            "expectedKeys": sorted(REQUIRED_KEYS),
            "receivedKeys": sorted(response_json.keys()) if isinstance(response_json, dict) else [],
        }, 502

    return response_json, response.status_code


def predict_image_from_module(module_name: str, image_file):
    """Forward an uploaded image file to a target module and return (json, status)."""
    if module_name not in MODULES:
        return {"error": "Unknown module", "module": module_name}, 404

    target_url = f"{MODULES[module_name]}/api/predict/image"
    filename = getattr(image_file, "filename", "upload.jpg") or "upload.jpg"
    content_type = getattr(image_file, "mimetype", None) or "application/octet-stream"

    try:
        file_bytes = image_file.read()
        response = requests.post(
            target_url,
            files={"image": (filename, file_bytes, content_type)},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.Timeout:
        return {"error": f"{module_name} module timed out"}, 504
    except requests.ConnectionError:
        return {"error": f"{module_name} module is unavailable"}, 503
    except requests.HTTPError:
        try:
            err_json = response.json()
            err_msg = err_json.get("error") or err_json.get("message") or f"{module_name} module returned an error"
            return {"error": err_msg, "details": err_json}, response.status_code
        except Exception:
            body = response.text if "response" in locals() else ""
            return {
                "error": f"{module_name} module returned an error",
                "details": body,
            }, response.status_code
    except requests.RequestException as exc:
        return {"error": "Proxy request failed", "details": str(exc)}, 502

    try:
        response_json = response.json()
    except ValueError:
        return {"error": f"{module_name} module returned non-JSON response"}, 502

    return response_json, response.status_code


def predict_assisted_from_module(module_name: str, image_file, form_fields: dict[str, str], extra_files: dict = None):
    """Forward an uploaded image and optional form fields to a target module."""
    if module_name not in MODULES:
        return {"error": "Unknown module", "module": module_name}, 404

    target_url = f"{MODULES[module_name]}/api/predict/assisted"
    filename = getattr(image_file, "filename", "upload.jpg") or "upload.jpg"
    content_type = getattr(image_file, "mimetype", None) or "application/octet-stream"

    files_payload = {"image": (filename, image_file.read(), content_type)}
    if extra_files:
        for k, f in extra_files.items():
            if f and hasattr(f, "read"):
                f_name = getattr(f, "filename", "original.jpg") or "original.jpg"
                f_type = getattr(f, "mimetype", None) or "application/octet-stream"
                files_payload[k] = (f_name, f.read(), f_type)

    try:
        response = requests.post(
            target_url,
            files=files_payload,
            data={key: str(value) for key, value in form_fields.items() if value is not None and value != ""},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
    except requests.Timeout:
        return {"error": f"{module_name} module timed out"}, 504
    except requests.ConnectionError:
        return {"error": f"{module_name} module is unavailable"}, 503
    except requests.HTTPError:
        try:
            err_json = response.json()
            err_msg = err_json.get("error") or err_json.get("message") or f"{module_name} module returned an error"
            return {"error": err_msg, "details": err_json}, response.status_code
        except Exception:
            body = response.text if "response" in locals() else ""
            return {
                "error": f"{module_name} module returned an error",
                "details": body,
            }, response.status_code
    except requests.RequestException as exc:
        return {"error": "Proxy request failed", "details": str(exc)}, 502

    try:
        response_json = response.json()
    except ValueError:
        return {"error": f"{module_name} module returned non-JSON response"}, 502

    return response_json, response.status_code


def get_heatmap_from_module(module_name: str, heatmap_id: str, params: dict | None = None):
    """Forward a heatmap fetch request to a target module."""
    if module_name not in MODULES:
        return {"error": "Unknown module", "module": module_name}, 404, "application/json"

    target_url = f"{MODULES[module_name]}/api/heatmap/{heatmap_id}"

    try:
        response = requests.get(target_url, params=params, timeout=REQUEST_TIMEOUT_SECONDS)
        if response.status_code == 202:
            return {"error": "Heatmap not ready"}, 202, "application/json"
        response.raise_for_status()
    except requests.Timeout:
        return {"error": f"{module_name} module timed out"}, 504, "application/json"
    except requests.ConnectionError:
        return {"error": f"{module_name} module is unavailable"}, 503, "application/json"
    except requests.HTTPError:
        body = response.text if "response" in locals() else ""
        return {
            "error": f"{module_name} module returned an error",
            "details": body,
        }, 502, "application/json"
    return response.content, response.status_code, response.headers.get("Content-Type", "image/png")


def get_heatmap_meta_from_module(module_name: str, heatmap_id: str):
    """Forward a heatmap metadata fetch request to a target module."""
    if module_name not in MODULES:
        return {"error": "Unknown module", "module": module_name}, 404

    target_url = f"{MODULES[module_name]}/api/heatmap/{heatmap_id}/meta"

    try:
        response = requests.get(target_url, timeout=REQUEST_TIMEOUT_SECONDS)
        if response.status_code == 202:
            return {"error": "Heatmap metadata not ready"}, 202
        response_json = response.json()
    except requests.Timeout:
        return {"error": f"{module_name} module timed out"}, 504
    except requests.ConnectionError:
        return {"error": f"{module_name} module is unavailable"}, 503
    except Exception as exc:
        return {"error": f"Unexpected error communicating with {module_name}", "details": str(exc)}, 500

    return response_json, response.status_code


def generate_report_from_module(module_name: str, payload: dict):
    """Forward a PDF report generation request to a target module."""
    if module_name not in MODULES:
        return {"error": "Unknown module", "module": module_name}, 404, "application/json"

    target_url = f"{MODULES[module_name]}/api/report/generate-pdf"

    try:
        response = requests.post(target_url, json=payload, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
    except requests.Timeout:
        return {"error": f"{module_name} module timed out"}, 504, "application/json"
    except requests.ConnectionError:
        return {"error": f"{module_name} module is unavailable"}, 503, "application/json"
    except requests.HTTPError:
        body = response.text if "response" in locals() else ""
        return {
            "error": f"{module_name} module returned an error",
            "details": body,
        }, 502, "application/json"
    except requests.RequestException as exc:
        return {"error": "Proxy request failed", "details": str(exc)}, 502, "application/json"

    return response.content, response.status_code, response.headers.get("Content-Type", "image/png")


def post_binary_to_module(module_name: str, endpoint_path: str, json_payload: dict):
    """POST a JSON payload to a module endpoint and return raw binary content.

    Generic pass-through for module endpoints that return a file (e.g. a
    generated PDF report) instead of JSON.
    """
    if module_name not in MODULES:
        return {"error": "Unknown module", "module": module_name}, 404, "application/json"

    target_url = f"{MODULES[module_name]}{endpoint_path}"

    try:
        response = requests.post(target_url, json=json_payload, timeout=REQUEST_TIMEOUT_SECONDS)
        response.raise_for_status()
    except requests.Timeout:
        return {"error": f"{module_name} module timed out"}, 504, "application/json"
    except requests.ConnectionError:
        return {"error": f"{module_name} module is unavailable"}, 503, "application/json"
    except requests.HTTPError:
        body = response.text if "response" in locals() else ""
        return {
            "error": f"{module_name} module returned an error",
            "details": body,
        }, 502, "application/json"
    except requests.RequestException as exc:
        return {"error": "Proxy request failed", "details": str(exc)}, 502, "application/json"

    return response.content, response.status_code, response.headers.get("Content-Type", "application/octet-stream")
