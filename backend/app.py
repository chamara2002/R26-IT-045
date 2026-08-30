"""Flask backend entrypoint for the CattleSense starter app."""

import hashlib
import os
from datetime import timedelta

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from models import db
from models.ad import Ad
from models.admin_invite import AdminInvite
from models.cow import Cow
from models.detection_log import DetectionLog
from models.mastitis_assessment import MastitisAssessment
from models.milk_yield import MilkYield
from models.password_reset_otp import PasswordResetOTP
from models.user import User
from models.veterinary_follow_up import VeterinaryFollowUp
from routes.admin_routes import admin_bp
from routes.auth_routes import auth_bp
from routes.cow_routes import cow_bp
from routes.dashboard_routes import dashboard_bp
from routes.module_routes import module_bp


from sqlalchemy import text

def ensure_database_schema(app: Flask):
    """Automatically ensure required columns exist across migrations."""
    with app.app_context():
        try:
            db.create_all()
            engine = db.engine
            dialect_name = engine.dialect.name

            if dialect_name == "postgresql":
                inspector = db.inspect(engine)
                table_names = set(inspector.get_table_names())

                if "users" in table_names:
                    user_cols = {col["name"] for col in inspector.get_columns("users")}
                    required_user_cols = [
                        ("phone", "VARCHAR(50)"),
                        ("role", "VARCHAR(50) DEFAULT 'farmer'"),
                        ("farm_name", "VARCHAR(150)"),
                        ("province", "VARCHAR(100)"),
                        ("district", "VARCHAR(100)"),
                        ("ds_division", "VARCHAR(100)"),
                        ("gn_division", "VARCHAR(100)"),
                        ("farm_address", "TEXT"),
                        ("cattle_count", "INTEGER"),
                        ("farming_experience", "VARCHAR(100)"),
                    ]
                    missing_user_cols = [c for c in required_user_cols if c[0] not in user_cols]
                    if missing_user_cols:
                        with engine.begin() as conn:
                            for col_name, col_type in missing_user_cols:
                                conn.execute(
                                    text(f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                                )

                if "cows" in table_names:
                    cow_cols = {col["name"] for col in inspector.get_columns("cows")}
                    required_cow_cols = [
                        ("tag_id", "VARCHAR(100)"),
                        ("date_of_birth", "DATE"),
                        ("gender", "VARCHAR(20) DEFAULT 'Female'"),
                        ("current_lactation", "INTEGER"),
                        ("date_acquired", "DATE"),
                        ("source", "VARCHAR(100)"),
                        ("source_details", "VARCHAR(255)"),
                    ]
                    missing_cow_cols = [c for c in required_cow_cols if c[0] not in cow_cols]
                    if missing_cow_cols:
                        with engine.begin() as conn:
                            for col_name, col_type in missing_cow_cols:
                                conn.execute(
                                    text(f"ALTER TABLE cows ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                                )

                if "mastitis_assessments" in table_names:
                    mastitis_cols = {col["name"] for col in inspector.get_columns("mastitis_assessments")}
                    required_mastitis_cols = [
                        ("uncertainty_level", "VARCHAR(50) DEFAULT 'high_confidence'"),
                        ("is_borderline", "BOOLEAN DEFAULT FALSE"),
                        ("uncertainty_note", "TEXT"),
                        ("roi_applied", "BOOLEAN DEFAULT FALSE"),
                        ("image_source", "VARCHAR(50) DEFAULT 'full_image'"),
                        ("roi_coordinates", "JSON"),
                        ("heatmap_id", "VARCHAR(100)"),
                        ("original_image_path", "VARCHAR(255)"),
                        ("cropped_image_path", "VARCHAR(255)"),
                        ("gradcam_heatmap_path", "VARCHAR(255)"),
                        ("gradcam_overlay_path", "VARCHAR(255)"),
                        ("image_prediction", "JSON"),
                        ("numerical_prediction", "JSON"),
                        ("model_2_used", "BOOLEAN DEFAULT FALSE"),
                        ("numerical_model_type", "VARCHAR(50)"),
                        ("missing_numerical_features", "JSON"),
                        ("milk_temperature", "FLOAT"),
                        ("milk_ph", "FLOAT"),
                        ("milk_conductivity", "FLOAT"),
                        ("milk_yield", "FLOAT"),
                        ("clotting", "INTEGER"),
                        ("breed", "VARCHAR(50)"),
                        ("months_after_giving_birth", "INTEGER"),
                        ("previous_mastitis_status", "INTEGER"),
                        ("temperature", "FLOAT"),
                        ("clinical_observations", "JSON"),
                        ("farmer_guidance", "JSON"),
                        ("recommendation", "TEXT"),
                        ("veterinary_report_path", "VARCHAR(255)"),
                        ("has_veterinary_report", "BOOLEAN DEFAULT FALSE"),
                    ]
                    missing_mastitis_cols = [c for c in required_mastitis_cols if c[0] not in mastitis_cols]
                    if missing_mastitis_cols:
                        with engine.begin() as conn:
                            for col_name, col_type in missing_mastitis_cols:
                                conn.execute(
                                    text(f"ALTER TABLE mastitis_assessments ADD COLUMN IF NOT EXISTS {col_name} {col_type};")
                                )

            elif dialect_name == "sqlite":
                inspector = db.inspect(engine)
                table_names = set(inspector.get_table_names())

                if "users" in table_names:
                    user_cols = {col["name"] for col in inspector.get_columns("users")}
                    for col_name, col_type in [
                        ("phone", "VARCHAR(50)"),
                        ("role", "VARCHAR(50) DEFAULT 'farmer'"),
                        ("farm_name", "VARCHAR(150)"),
                        ("province", "VARCHAR(100)"),
                        ("district", "VARCHAR(100)"),
                        ("ds_division", "VARCHAR(100)"),
                        ("gn_division", "VARCHAR(100)"),
                        ("farm_address", "TEXT"),
                        ("cattle_count", "INTEGER"),
                        ("farming_experience", "VARCHAR(100)"),
                    ]:
                        if col_name not in user_cols:
                            with engine.begin() as conn:
                                conn.execute(text(f"ALTER TABLE users ADD COLUMN {col_name} {col_type};"))

                if "cows" in table_names:
                    cow_cols = {col["name"] for col in inspector.get_columns("cows")}
                    for col_name, col_type in [
                        ("tag_id", "VARCHAR(100)"),
                        ("date_of_birth", "DATE"),
                        ("gender", "VARCHAR(20) DEFAULT 'Female'"),
                        ("current_lactation", "INTEGER"),
                        ("date_acquired", "DATE"),
                        ("source", "VARCHAR(100)"),
                        ("source_details", "VARCHAR(255)"),
                    ]:
                        if col_name not in cow_cols:
                            with engine.begin() as conn:
                                conn.execute(text(f"ALTER TABLE cows ADD COLUMN {col_name} {col_type};"))

                if "mastitis_assessments" in table_names:
                    mastitis_cols = {col["name"] for col in inspector.get_columns("mastitis_assessments")}
                    for col_name, col_type in [
                        ("uncertainty_level", "VARCHAR(50) DEFAULT 'high_confidence'"),
                        ("is_borderline", "BOOLEAN DEFAULT 0"),
                        ("uncertainty_note", "TEXT"),
                        ("roi_applied", "BOOLEAN DEFAULT 0"),
                        ("image_source", "VARCHAR(50) DEFAULT 'full_image'"),
                        ("roi_coordinates", "JSON"),
                        ("heatmap_id", "VARCHAR(100)"),
                        ("original_image_path", "VARCHAR(255)"),
                        ("cropped_image_path", "VARCHAR(255)"),
                        ("gradcam_heatmap_path", "VARCHAR(255)"),
                        ("gradcam_overlay_path", "VARCHAR(255)"),
                        ("image_prediction", "JSON"),
                        ("numerical_prediction", "JSON"),
                        ("model_2_used", "BOOLEAN DEFAULT 0"),
                        ("numerical_model_type", "VARCHAR(50)"),
                        ("missing_numerical_features", "JSON"),
                        ("milk_temperature", "FLOAT"),
                        ("milk_ph", "FLOAT"),
                        ("milk_conductivity", "FLOAT"),
                        ("milk_yield", "FLOAT"),
                        ("clotting", "INTEGER"),
                        ("breed", "VARCHAR(50)"),
                        ("months_after_giving_birth", "INTEGER"),
                        ("previous_mastitis_status", "INTEGER"),
                        ("temperature", "FLOAT"),
                        ("clinical_observations", "JSON"),
                        ("farmer_guidance", "JSON"),
                        ("recommendation", "TEXT"),
                        ("veterinary_report_path", "VARCHAR(255)"),
                        ("has_veterinary_report", "BOOLEAN DEFAULT 0"),
                    ]:
                        if col_name not in mastitis_cols:
                            with engine.begin() as conn:
                                conn.execute(text(f"ALTER TABLE mastitis_assessments ADD COLUMN {col_name} {col_type};"))
        except Exception as e:
            app.logger.warning(f"Schema synchronization notice: {e}")

        # Automatically ensure default admin user exists
        try:
            from services.auth_service import hash_password
            default_admins = [
                ("admin@cattlesense.lk", "0770000000"),
                ("admin@cattlesense.com", "0770000001"),
            ]
            for admin_email, admin_phone in default_admins:
                existing_admin = User.query.filter((User.email == admin_email) | (User.phone == admin_phone)).first()
                if not existing_admin:
                    admin_acc = User(
                        name="System Administrator",
                        email=admin_email,
                        phone=admin_phone,
                        password_hash=hash_password("AdminPassword123!"),
                        role="admin",
                        province="Western",
                        district="Colombo",
                        farm_name="CattleSense HQ",
                        cattle_count=0,
                    )
                    db.session.add(admin_acc)
                    db.session.commit()
                elif existing_admin.role != "admin":
                    existing_admin.role = "admin"
                    db.session.commit()

            # Ensure sample advertisements exist
            if Ad.query.count() == 0:
                first_admin = User.query.filter_by(role="admin").first()
                if first_admin:
                    sample_ads = [
                        Ad(
                            title="Premium Dairy Nutrition & Mineral Supplements",
                            description="Optimize milk production and strengthen cattle immunity with veterinary-formulated mineral premixes, vitamins, and high-energy dairy feed.",
                            image_url="https://images.unsplash.com/photo-1570042225831-d98fa7577f1e?w=800&auto=format&fit=crop&q=80",
                            link="https://cattlesense.lk/partners/dairy-nutrition",
                            status="active",
                            created_by_id=first_admin.id,
                        ),
                        Ad(
                            title="Automated Milking & Stainless Steel Milk Chillers",
                            description="Next-generation hygienic milking systems and rapid temperature milk chillers preventing bacterial growth and maintaining premium milk grade.",
                            image_url="https://images.unsplash.com/photo-1546445317-29f4545e9d53?w=800&auto=format&fit=crop&q=80",
                            link="https://cattlesense.lk/partners/milking-equipment",
                            status="active",
                            created_by_id=first_admin.id,
                        ),
                        Ad(
                            title="Veterinary Barrier Teat Dips & Udder Hygiene",
                            description="Clinically approved post-milking barrier disinfectants designed to protect teat canals from environmental pathogens and reduce mastitis risk.",
                            image_url="https://images.unsplash.com/photo-1500595046743-cd271d694d30?w=800&auto=format&fit=crop&q=80",
                            link="https://cattlesense.lk/partners/udder-hygiene",
                            status="active",
                            created_by_id=first_admin.id,
                        ),
                    ]
                    db.session.add_all(sample_ads)
                    db.session.commit()
        except Exception as e:
            db.session.rollback()
            app.logger.warning(f"Default admin/ad seeding notice: {e}")


def create_app(test_config: dict | None = None) -> Flask:
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

    # Normalize PostgreSQL URL scheme for psycopg v3 driver
    if database_url.startswith("postgres://"):
        database_url = database_url.replace("postgres://", "postgresql+psycopg://", 1)
    elif database_url.startswith("postgresql://"):
        database_url = database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    elif database_url.startswith("postgresql+psycopg2://"):
        database_url = database_url.replace("postgresql+psycopg2://", "postgresql+psycopg://", 1)

    app.config["SQLALCHEMY_DATABASE_URI"] = database_url
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    
    engine_options = {
        "pool_pre_ping": True,
        "pool_recycle": 300,
    }
    if not database_url.startswith("sqlite"):
        engine_options["connect_args"] = {
            "connect_timeout": 15,
        }
    app.config["SQLALCHEMY_ENGINE_OPTIONS"] = engine_options
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
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

    frontend_origin_raw = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    if frontend_origin_raw == "*":
        cors_origins = "*"
    else:
        cors_origins = [o.strip() for o in frontend_origin_raw.split(",") if o.strip()]
        if not cors_origins:
            cors_origins = ["http://localhost:5173"]
    CORS(app, resources={r"/api/*": {"origins": cors_origins}})

    if test_config:
        app.config.update(test_config)
        if "sqlite" in app.config.get("SQLALCHEMY_DATABASE_URI", ""):
            app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
                "pool_pre_ping": True,
            }

    db.init_app(app)
    JWTManager(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(cow_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(module_bp)

    @app.get("/health")
    @app.get("/api/health")
    def health_check():
        """Simple health endpoint for runtime checks."""
        return jsonify({"status": "ok", "service": "cattlesense-backend"})

    if not app.config.get("TESTING"):
        ensure_database_schema(app)

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5001"))
    app.run(host="0.0.0.0", port=port, debug=True)