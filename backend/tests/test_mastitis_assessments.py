"""
Automated unit and integration tests for Mastitis Assessment Persistence and History.
Tests:
1. Save assessment with complete prediction, ROI data, and numerical biomarkers.
2. Verify missing numerical biomarkers remain None/NULL without fake zeros.
3. Duplicate save prevention returns existing record without redundant rows.
4. Ownership security: Farmer A cannot access Farmer B's cow assessments.
5. Get cow assessment history sorted newest first.
6. Get single assessment details.
7. Critical assessment preserves veterinary report flag.
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
from models.mastitis_assessment import MastitisAssessment
from flask_jwt_extended import create_access_token


@pytest.fixture
def app_instance():
    app = create_app()
    app.config["TESTING"] = True
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
    app.config["JWT_SECRET_KEY"] = "test-secret-key-123"

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app_instance):
    return app_instance.test_client()


@pytest.fixture
def sample_users_and_cows(app_instance):
    with app_instance.app_context():
        farmer_a = User(
            name="Farmer Alice",
            phone="+94771111111",
            password_hash="hash_a",
            farm_name="Alice Green Pastures",
            district="Kandy",
        )
        farmer_b = User(
            name="Farmer Bob",
            phone="+94772222222",
            password_hash="hash_b",
            farm_name="Bob Dairy",
            district="Nuwara Eliya",
        )
        db.session.add_all([farmer_a, farmer_b])
        db.session.commit()

        cow_a = Cow(
            user_id=farmer_a.id,
            name="Bella",
            tag_id="COW-A100",
            breed="Holstein",
            age=4,
        )
        cow_b = Cow(
            user_id=farmer_b.id,
            name="Daisy",
            tag_id="COW-B200",
            breed="Jersey",
            age=3,
        )
        db.session.add_all([cow_a, cow_b])
        db.session.commit()

        token_a = create_access_token(identity=str(farmer_a.id))
        token_b = create_access_token(identity=str(farmer_b.id))

        return {
            "farmer_a_id": farmer_a.id,
            "farmer_b_id": farmer_b.id,
            "cow_a_id": cow_a.id,
            "cow_b_id": cow_b.id,
            "token_a": token_a,
            "token_b": token_b,
        }


def test_save_mastitis_assessment_success(client, sample_users_and_cows):
    """Test saving a mastitis assessment linked to a specific cow profile."""
    cow_id = sample_users_and_cows["cow_a_id"]
    token = sample_users_and_cows["token_a"]

    payload = {
        "cow_id": cow_id,
        "prediction": "Mastitis",
        "confidence": 0.885,
        "stage": "Moderate Mastitis",
        "severity_level": "moderate",
        "severity_code": 2,
        "roi_applied": True,
        "image_source": "farmer_selected_roi",
        "roi_coordinates": {"x": 50, "y": 40, "width": 300, "height": 280},
        "heatmap_id": "test-uuid-heat-12345",
        "model_2_used": True,
        "numerical_model_type": "complete",
        "numerical_measurements": {
            "milk_temperature": 39.4,
            "milk_ph": 7.2,
            "milk_conductivity": 6.8,
            "somatic_cell_count": 650,
            "milk_yield": 14.5,
            "clotting": "Yes",
        },
        "clinical_observations": {
            "udder_swelling": "Moderate",
            "milk_appearance": "Flakes visible",
        },
        "recommendation": "Moderate mastitis detected. Veterinary consultation recommended.",
    }

    res = client.post(
        "/api/modules/mastitis/assessments",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert res.status_code == 201
    data = res.get_json()
    assert data["success"] is True
    assert "Bella" in data["message"]
    assert data["is_duplicate"] is False
    assert data["assessment"]["prediction"] == "Mastitis"
    assert data["assessment"]["roi_applied"] is True
    assert data["assessment"]["numerical_measurements"]["milk_temperature"] == 39.4


def test_save_assessment_preserves_missing_values_as_none(client, sample_users_and_cows):
    """Verify missing numerical features remain None/NULL and are not converted to fake zeros."""
    cow_id = sample_users_and_cows["cow_a_id"]
    token = sample_users_and_cows["token_a"]

    payload = {
        "cow_id": cow_id,
        "prediction": "Normal",
        "confidence": 0.94,
        "stage": "No Mastitis",
        "severity_level": "negative",
        "heatmap_id": "test-uuid-heat-normal",
        "numerical_measurements": {
            "milk_temperature": 38.6,
            "milk_ph": None,  # Missing!
            "milk_conductivity": None,  # Missing!
            "somatic_cell_count": 180,
            "milk_yield": None,  # Missing!
            "clotting": "No",
        },
        "missing_numerical_features": ["Milk_pH", "Milk_Conductivity", "Milk_Yield"],
    }

    res = client.post(
        "/api/modules/mastitis/assessments",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    assert res.status_code == 201
    data = res.get_json()
    meas = data["assessment"]["numerical_measurements"]
    assert meas["milk_temperature"] == 38.6
    assert meas["milk_ph"] is None
    assert meas["milk_conductivity"] is None
    assert meas["milk_yield"] is None
    assert meas["somatic_cell_count"] == 180


def test_duplicate_save_protection(client, sample_users_and_cows):
    """Verify that repeated clicks with identical heatmap_id do not create duplicate rows."""
    cow_id = sample_users_and_cows["cow_a_id"]
    token = sample_users_and_cows["token_a"]

    payload = {
        "cow_id": cow_id,
        "prediction": "Normal",
        "confidence": 0.96,
        "heatmap_id": "duplicate-check-uuid-999",
    }

    # First save
    res1 = client.post(
        "/api/modules/mastitis/assessments",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res1.status_code == 201
    assert res1.get_json()["is_duplicate"] is False

    # Second identical save
    res2 = client.post(
        "/api/modules/mastitis/assessments",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res2.status_code == 200
    data2 = res2.get_json()
    assert data2["success"] is True
    assert data2["is_duplicate"] is True


def test_ownership_security_cannot_save_or_view_other_farmer_cow(client, sample_users_and_cows):
    """Verify Farmer A cannot save or view assessments for Farmer B's cow."""
    cow_b_id = sample_users_and_cows["cow_b_id"]
    token_a = sample_users_and_cows["token_a"]  # Alice trying to access Bob's cow

    # Alice trying to save to Bob's cow
    res_save = client.post(
        "/api/modules/mastitis/assessments",
        json={"cow_id": cow_b_id, "prediction": "Normal"},
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_save.status_code == 404

    # Alice trying to read Bob's cow assessment history
    res_history = client.get(
        f"/api/modules/mastitis/cows/{cow_b_id}/assessments",
        headers={"Authorization": f"Bearer {token_a}"},
    )
    assert res_history.status_code == 404


def test_get_cow_mastitis_assessments_history(client, sample_users_and_cows):
    """Test retrieving assessment history for a specific cow, ordered newest first."""
    cow_id = sample_users_and_cows["cow_a_id"]
    token = sample_users_and_cows["token_a"]

    # Save 2 assessments
    client.post(
        "/api/modules/mastitis/assessments",
        json={"cow_id": cow_id, "prediction": "Normal", "confidence": 0.91, "heatmap_id": "hist-1"},
        headers={"Authorization": f"Bearer {token}"},
    )
    client.post(
        "/api/modules/mastitis/assessments",
        json={"cow_id": cow_id, "prediction": "Mastitis", "confidence": 0.85, "heatmap_id": "hist-2"},
        headers={"Authorization": f"Bearer {token}"},
    )

    res = client.get(
        f"/api/modules/mastitis/cows/{cow_id}/assessments",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["count"] == 2
    assert data["assessments"][0]["heatmap_id"] == "hist-2"  # Newest first
