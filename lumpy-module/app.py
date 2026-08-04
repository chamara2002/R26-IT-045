"""Entry point for the Lumpy Skin Disease (LSD) detection service.

Thin launcher so `python app.py` keeps working (matches the other module
stubs / README instructions) while the real implementation lives in
api/flask_api.py, mirroring the mastitis-module layout (api/flask_api.py +
run_api.py style entry point).
"""
from api.flask_api import app

if __name__ == "__main__":
    import os

    server_port = int(os.getenv("LUMPY_PORT", "5003"))
    app.run(host="0.0.0.0", port=server_port, debug=False)
