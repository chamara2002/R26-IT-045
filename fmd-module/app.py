import os

from src.app import app

if __name__ == "__main__":
    port = int(os.getenv("PORT", os.getenv("FMD_PORT", "5002")))
    debug = os.getenv("DEBUG", "false").lower() in ("true", "1", "t", "yes")
    app.run(host="0.0.0.0", port=port, debug=debug)
