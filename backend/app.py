"""Flask backend entrypoint for the CattleSense starter app."""

import hashlib
import os

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from models import db
from models.ad import Ad
from models.admin_invite import AdminInvite
from models.cow import Cow
from models.detection_log import DetectionLog
from models.milk_yield import MilkYield
from models.user import User
from routes.admin_routes import admin_bp
from routes.auth_routes import auth_bp
from routes.cow_routes import cow_bp
from routes.dashboard_routes import dashboard_bp
from routes.module_routes import module_bp


def create_app() -> Flask:
    """Application factory for creating configured Flask app instance."""
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    load_dotenv(env_path)

    app = Flask(__name__)

    database_url = os.getenv("DATABASE_URL")

    if not database_url:
        postgres_user = os.getenv("POSTGRES_USER", "postgres")
        postgres_password = os.getenv("POSTGRES_PASSWORD", "postgres")
        postgres_host = os.getenv("POSTGRES_HOST", "localhost")
        postgres_port = os.getenv("POSTGRES_PORT", "5432")
        postgres_db = os.getenv("POSTGRES_DB", "cattlesense")
        database_url = (
            f"postgresql+psycopg://{postgres_user}:{postgres_password}@"
            f"{postgres_host}:{postgres_port}/{postgres_db}"
        )

    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql://", 1)

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    raw_jwt_secret = os.getenv("JWT_SECRET_KEY", "")
    if not raw_jwt_secret:
        # Dev fallback must still meet RFC 7518 minimum recommendation for HS256.
        jwt_secret = "change-this-in-production-at-least-32-bytes"
    elif len(raw_jwt_secret) < 32:
        # Preserve compatibility for existing short secrets while ensuring minimum key length.
        jwt_secret = hashlib.sha256(raw_jwt_secret.encode("utf-8")).hexdigest()
    else:
        jwt_secret = raw_jwt_secret

    app.config["JWT_SECRET_KEY"] = jwt_secret

    frontend_origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    CORS(app, resources={r"/api/*": {"origins": [frontend_origin]}})

    db.init_app(app)
    JWTManager(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(cow_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(module_bp)

    @app.get("/health")
    def health_check():
        """Simple health endpoint for runtime checks."""
        return jsonify({"status": "ok", "service": "cattlesense-backend"})

    with app.app_context():
        db.create_all()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)