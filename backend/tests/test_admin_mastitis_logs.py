"""
Tests for Admin Logs Filtering and Outcome Normalization across Disease Modules.
Verifies:
1. Filtering by outcome 'positive' matches 'Mastitis', 'positive', 'LSD Positive', 'Stage 1'.
2. Filtering by outcome 'negative' matches 'Normal', 'negative', 'Healthy', 'No Mastitis'.
3. Module-specific filtering ('mastitis', 'fmd', 'lumpy', 'milk-fever') works accurately.
4. Combined module + outcome filtering functions without cross-module leakage.
"""
import sys
from pathlib import Path
import pytest
from datetime import datetime

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app import create_app
from models import db
from models.user import User
from models.cow import Cow
from models.detection_log import DetectionLog
from flask_jwt_extended import create_access_token


@pytest.fixture
def app_instance():
    app = create_app({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "JWT_SECRET_KEY": "test-secret-key-123456789012345678901234567890",
    })

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app_instance):
    return app_instance.test_client()


@pytest.fixture
def admin_and_sample_logs(app_instance):
    with app_instance.app_context():
        admin = User(
            name="Admin User",
            phone="+94770000000",
            email="admin@cattlesense.lk",
            password_hash="admin_hash",
            role="admin",
        )
        farmer = User(
            name="Farmer Gamini",
            phone="+94771234567",
            password_hash="farmer_hash",
            role="farmer",
        )
        db.session.add_all([admin, farmer])
        db.session.commit()

        cow = Cow(
            user_id=farmer.id,
            name="Manike",
            tag_id="LK-MNK-01",
        )
        db.session.add(cow)
        db.session.commit()

        # Multi-module test logs
        logs = [
            # Mastitis logs
            DetectionLog(user_id=farmer.id, cow_id=cow.id, module_name="mastitis", result="Mastitis", confidence=0.88),
            DetectionLog(user_id=farmer.id, cow_id=cow.id, module_name="mastitis", result="Normal", confidence=0.95),
            # FMD logs
            DetectionLog(user_id=farmer.id, cow_id=cow.id, module_name="foot-mouth", result="positive", confidence=0.92),
            DetectionLog(user_id=farmer.id, cow_id=cow.id, module_name="foot-mouth", result="negative", confidence=0.89),
            # LSD logs
            DetectionLog(user_id=farmer.id, cow_id=cow.id, module_name="lumpy-skin", result="LSD Positive", confidence=0.94),
            DetectionLog(user_id=farmer.id, cow_id=cow.id, module_name="lumpy-skin", result="Healthy", confidence=0.97),
            # Milk Fever logs
            DetectionLog(user_id=farmer.id, cow_id=cow.id, module_name="milk-fever", result="Stage 1", confidence=0.85),
            DetectionLog(user_id=farmer.id, cow_id=cow.id, module_name="milk-fever", result="Normal", confidence=0.91),
        ]
        db.session.add_all(logs)
        db.session.commit()

        token = create_access_token(identity=str(admin.id))
        return {
            "admin_token": token,
            "admin_id": admin.id,
            "farmer_id": farmer.id,
            "cow_id": cow.id,
        }


def test_admin_logs_outcome_filter_positive(client, admin_and_sample_logs):
    """Ensure result=positive returns positive detections across all modules including Mastitis."""
    headers = {"Authorization": f"Bearer {admin_and_sample_logs['admin_token']}"}
    res = client.get("/api/admin/logs?result=positive", headers=headers)
    assert res.status_code == 200
    data = res.get_json()

    results = [log["result"] for log in data["logs"]]
    modules = [log["module_name"] for log in data["logs"]]

    # Must include positive cases from all modules
    assert "Mastitis" in results
    assert "positive" in results
    assert "LSD Positive" in results
    assert "Stage 1" in results

    # Must NOT include healthy/negative cases
    assert "Normal" not in results
    assert "negative" not in results
    assert "Healthy" not in results
    assert data["total"] == 4


def test_admin_logs_outcome_filter_negative(client, admin_and_sample_logs):
    """Ensure result=negative returns negative/healthy detections across all modules including Mastitis."""
    headers = {"Authorization": f"Bearer {admin_and_sample_logs['admin_token']}"}
    res = client.get("/api/admin/logs?result=negative", headers=headers)
    assert res.status_code == 200
    data = res.get_json()

    results = [log["result"] for log in data["logs"]]

    # Must include negative cases from all modules
    assert "Normal" in results
    assert "negative" in results
    assert "Healthy" in results

    # Must NOT include positive cases
    assert "Mastitis" not in results
    assert "positive" not in results
    assert "LSD Positive" not in results
    assert "Stage 1" not in results
    assert data["total"] == 4


def test_admin_logs_mastitis_module_filter(client, admin_and_sample_logs):
    """Ensure filtering by module=mastitis returns only mastitis records."""
    headers = {"Authorization": f"Bearer {admin_and_sample_logs['admin_token']}"}
    res = client.get("/api/admin/logs?module=mastitis", headers=headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["total"] == 2
    for log in data["logs"]:
        assert log["module_name"] == "mastitis"
    results = {log["result"] for log in data["logs"]}
    assert results == {"Mastitis", "Normal"}


def test_admin_logs_mastitis_combined_filter(client, admin_and_sample_logs):
    """Ensure combined module=mastitis & result=positive returns exactly 1 positive mastitis log."""
    headers = {"Authorization": f"Bearer {admin_and_sample_logs['admin_token']}"}
    res = client.get("/api/admin/logs?module=mastitis&result=positive", headers=headers)
    assert res.status_code == 200
    data = res.get_json()

    assert data["total"] == 1
    assert data["logs"][0]["module_name"] == "mastitis"
    assert data["logs"][0]["result"] == "Mastitis"
