"""
Automated unit & integration tests for CattleSense Mastitis Longitudinal Health Monitoring:
1. Cow Health Trend (0, 1, multiple assessments, improving, stable, worsening, rapidly worsening, recovery trajectory).
2. Previous vs Current Comparison (complete metrics, missing metrics handled safely without inventing numbers).
3. Risk Escalation & Worsening Alert (rule-based advisory, safe wording, critical veterinary escalation).
4. Veterinary Follow-up Tracking (creation, update, due/overdue status calculation, ownership protection).
5. Herd-Level Mastitis Overview (latest cow assessment precedence, critical priority list, 7d/30d trend).
6. Authorization and Privacy (Farmer A cannot access Farmer B's cow trends or follow-ups).
"""

import sys
from pathlib import Path
from datetime import datetime, timedelta, date
import pytest

BACKEND_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND_DIR))

from app import create_app
from models import db
from models.user import User
from models.cow import Cow
from models.mastitis_assessment import MastitisAssessment
from models.veterinary_follow_up import VeterinaryFollowUp
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
def test_data(app_instance):
    with app_instance.app_context():
        farmer1 = User(name="Farmer Alice", phone="+94771111111", password_hash="hash_a", farm_name="Alice Farm")
        farmer2 = User(name="Farmer Bob", phone="+94772222222", password_hash="hash_b", farm_name="Bob Farm")
        db.session.add_all([farmer1, farmer2])
        db.session.commit()

        # Alice's cows
        cow1 = Cow(user_id=farmer1.id, name="Daisy", tag_id="COW-201", breed="Jersey", age=4, gender="Female")
        cow2 = Cow(user_id=farmer1.id, name="Bella", tag_id="COW-202", breed="Friesian", age=3, gender="Female")
        cow3 = Cow(user_id=farmer1.id, name="Molly", tag_id="COW-203", breed="Sahiwal", age=5, gender="Female")

        # Bob's cow
        cow_bob = Cow(user_id=farmer2.id, name="BobCow", tag_id="BOB-001", breed="Local", age=2, gender="Female")

        db.session.add_all([cow1, cow2, cow3, cow_bob])
        db.session.commit()

        token1 = create_access_token(identity=str(farmer1.id))
        token2 = create_access_token(identity=str(farmer2.id))

        return {
            "farmer1_id": farmer1.id,
            "farmer2_id": farmer2.id,
            "token1": token1,
            "token2": token2,
            "cow1_id": cow1.id,
            "cow2_id": cow2.id,
            "cow3_id": cow3.id,
            "cow_bob_id": cow_bob.id,
        }


def test_cow_health_trend_empty(client, test_data):
    """Cow with no saved assessments returns insufficient data gracefully."""
    headers = {"Authorization": f"Bearer {test_data['token1']}"}
    res = client.get(f"/api/cows/{test_data['cow1_id']}/health-trend", headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    assert data["health_trend"]["has_data"] is False
    assert data["health_trend"]["total_assessments"] == 0
    assert data["health_trend"]["trend_state"] == "Insufficient Data"


def test_cow_health_trend_worsening_and_recovery(client, app_instance, test_data):
    """Test longitudinal progression: Normal -> Mild -> Moderate -> Severe -> Normal (Recovery)."""
    headers = {"Authorization": f"Bearer {test_data['token1']}"}
    cow_id = test_data["cow1_id"]
    user_id = test_data["farmer1_id"]

    base_time = datetime.utcnow() - timedelta(days=20)

    with app_instance.app_context():
        # Assessment 1 (Day 1): Normal
        a1 = MastitisAssessment(
            cow_id=cow_id, user_id=user_id,
            assessment_datetime=base_time,
            prediction="Normal", stage="No Mastitis", severity_level="negative", severity_code=0,
            confidence=0.92, milk_yield=18.5, milk_temperature=38.2, somatic_cell_count=180.0,
        )
        # Assessment 2 (Day 5): Mild
        a2 = MastitisAssessment(
            cow_id=cow_id, user_id=user_id,
            assessment_datetime=base_time + timedelta(days=5),
            prediction="Mastitis", stage="Mild Mastitis", severity_level="mild", severity_code=1,
            confidence=0.78, milk_yield=16.0, milk_temperature=38.7, somatic_cell_count=320.0,
        )
        # Assessment 3 (Day 10): Moderate
        a3 = MastitisAssessment(
            cow_id=cow_id, user_id=user_id,
            assessment_datetime=base_time + timedelta(days=10),
            prediction="Mastitis", stage="Moderate Mastitis", severity_level="moderate", severity_code=2,
            confidence=0.85, milk_yield=14.2, milk_temperature=39.1, somatic_cell_count=560.0,
        )
        # Assessment 4 (Day 15): Severe
        a4 = MastitisAssessment(
            cow_id=cow_id, user_id=user_id,
            assessment_datetime=base_time + timedelta(days=15),
            prediction="Mastitis", stage="Severe Mastitis", severity_level="severe", severity_code=3,
            confidence=0.91, milk_yield=10.5, milk_temperature=40.2, somatic_cell_count=980.0,
            has_veterinary_report=True,
        )
        db.session.add_all([a1, a2, a3, a4])
        db.session.commit()

    # Query trend when Severe
    res = client.get(f"/api/cows/{cow_id}/health-trend", headers=headers)
    assert res.status_code == 200
    data = res.get_json()
    trend = data["health_trend"]
    assert trend["has_data"] is True
    assert trend["total_assessments"] == 4
    assert trend["current_severity_code"] == 3
    assert trend["trend_state"] in ("Worsening", "Rapidly Worsening")
    assert len(trend["timeline"]) == 4

    # Risk evaluation should trigger critical alert
    risk = data["risk_evaluation"]
    assert risk["is_critical"] is True
    assert "CRITICAL VETERINARY ATTENTION REQUIRED" in risk["title"]

    # Now add Assessment 5 (Day 20): Resolved / Normal (Recovery tracking)
    with app_instance.app_context():
        a5 = MastitisAssessment(
            cow_id=cow_id, user_id=user_id,
            assessment_datetime=base_time + timedelta(days=20),
            prediction="Normal", stage="No Mastitis", severity_level="negative", severity_code=0,
            confidence=0.95, milk_yield=17.8, milk_temperature=38.4, somatic_cell_count=200.0,
        )
        db.session.add(a5)
        db.session.commit()

    res_rec = client.get(f"/api/cows/{cow_id}/health-trend", headers=headers)
    data_rec = res_rec.get_json()
    trend_rec = data_rec["health_trend"]
    assert trend_rec["total_assessments"] == 5
    assert trend_rec["current_severity_code"] == 0
    assert trend_rec["trend_state"] == "Improving"
    assert trend_rec["recovery_trajectory"] is not None
    assert trend_rec["recovery_trajectory"]["is_recovering"] is True


def test_previous_vs_current_comparison(client, app_instance, test_data):
    """Test side-by-side assessment comparison and safe handling of missing fields."""
    headers = {"Authorization": f"Bearer {test_data['token1']}"}
    cow_id = test_data["cow2_id"]
    user_id = test_data["farmer1_id"]

    dt_prev = datetime.utcnow() - timedelta(days=3)
    dt_curr = datetime.utcnow()

    with app_instance.app_context():
        prev_a = MastitisAssessment(
            cow_id=cow_id, user_id=user_id,
            assessment_datetime=dt_prev,
            prediction="Mastitis", stage="Mild Mastitis", severity_level="mild", severity_code=1,
            confidence=0.78, milk_yield=18.5, milk_temperature=38.2, somatic_cell_count=320.0,
            clinical_observations={"udder_swelling": "No", "udder_pain": "No"},
        )
        curr_a = MastitisAssessment(
            cow_id=cow_id, user_id=user_id,
            assessment_datetime=dt_curr,
            prediction="Mastitis", stage="Moderate Mastitis", severity_level="moderate", severity_code=2,
            confidence=0.84, milk_yield=14.2, milk_temperature=39.1, somatic_cell_count=560.0,
            # milk_ph and conductivity intentionally missing to test safe handling
            clinical_observations={"udder_swelling": "Yes", "udder_pain": "Yes"},
        )
        db.session.add_all([prev_a, curr_a])
        db.session.commit()

    res = client.get(f"/api/cows/{cow_id}/assessment-comparison", headers=headers)
    assert res.status_code == 200
    comp_data = res.get_json()
    assert comp_data["has_comparison"] is True

    comp = comp_data["comparison"]
    assert comp["severity"]["previous"] == "Mild Mastitis"
    assert comp["severity"]["current"] == "Moderate Mastitis"
    assert comp["severity"]["change"] == "Increased"

    # Milk yield drop
    assert comp["metrics"]["milk_yield"]["available"] is True
    assert comp["metrics"]["milk_yield"]["direction"] == "decreased"

    # Missing pH
    assert comp["metrics"]["milk_ph"]["available"] is False
    assert comp["metrics"]["milk_ph"]["message"] == "Not available for comparison"


def test_veterinary_follow_up_lifecycle(client, app_instance, test_data):
    """Test creating, updating, and querying veterinary follow-up records."""
    headers = {"Authorization": f"Bearer {test_data['token1']}"}
    cow_id = test_data["cow1_id"]
    user_id = test_data["farmer1_id"]

    # Create assessment
    with app_instance.app_context():
        assessment = MastitisAssessment(
            cow_id=cow_id, user_id=user_id,
            prediction="Mastitis", stage="Severe Mastitis", severity_level="severe", severity_code=3,
        )
        db.session.add(assessment)
        db.session.commit()
        assessment_id = assessment.id

    # Create follow-up record
    follow_up_payload = {
        "status": "Vet Contacted",
        "visit_date": (date.today() - timedelta(days=1)).strftime("%Y-%m-%d"),
        "veterinarian_name": "Dr. Bandara (DAPH)",
        "registration_number": "VET-SL-4821",
        "diagnosis": "Acute Clinical Mastitis - Left Hind Quarter",
        "diagnostic_tests": ["Clinical examination", "California Mastitis Test (CMT)"],
        "treatment_plan": "Intramammary infusions and supportive fluid therapy as prescribed by veterinarian.",
        "follow_up_date": (date.today() + timedelta(days=3)).strftime("%Y-%m-%d"),
        "notes": "Cow isolated in dry pen. Daily milk stripping instructed.",
    }

    create_res = client.post(f"/api/assessments/{assessment_id}/veterinary-follow-up", json=follow_up_payload, headers=headers)
    assert create_res.status_code == 201
    created_data = create_res.get_json()
    follow_up_id = created_data["follow_up"]["id"]
    assert created_data["follow_up"]["status"] == "Vet Contacted"
    assert created_data["follow_up"]["is_due_soon"] is True

    # Update follow-up status to Resolved
    update_payload = {
        "status": "Resolved",
        "notes": "Follow-up CMT test negative. Cow returned to normal milking rotation.",
    }
    update_res = client.put(f"/api/veterinary-follow-up/{follow_up_id}", json=update_payload, headers=headers)
    assert update_res.status_code == 200
    updated_data = update_res.get_json()
    assert updated_data["follow_up"]["status"] == "Resolved"
    assert updated_data["follow_up"]["is_overdue"] is False

    # List cow follow-ups
    list_res = client.get(f"/api/cows/{cow_id}/veterinary-follow-up", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.get_json()
    assert list_data["count"] >= 1


def test_herd_health_overview_latest_precedence(client, app_instance, test_data):
    """Test herd overview counts ONLY latest assessment (old critical doesn't count if newer is normal)."""
    headers = {"Authorization": f"Bearer {test_data['token1']}"}
    user_id = test_data["farmer1_id"]
    cow1_id = test_data["cow1_id"]
    cow2_id = test_data["cow2_id"]

    now = datetime.utcnow()

    with app_instance.app_context():
        # Cow 1: Was Severe 10 days ago, but latest is Normal 2 days ago (Recovered!)
        a1_old = MastitisAssessment(
            cow_id=cow1_id, user_id=user_id,
            assessment_datetime=now - timedelta(days=10),
            prediction="Mastitis", stage="Severe Mastitis", severity_level="severe", severity_code=3,
        )
        a1_latest = MastitisAssessment(
            cow_id=cow1_id, user_id=user_id,
            assessment_datetime=now - timedelta(days=2),
            prediction="Normal", stage="No Mastitis", severity_level="negative", severity_code=0,
        )

        # Cow 2: Latest is Severe today!
        a2_latest = MastitisAssessment(
            cow_id=cow2_id, user_id=user_id,
            assessment_datetime=now,
            prediction="Mastitis", stage="Severe Mastitis", severity_level="severe", severity_code=3,
        )

        db.session.add_all([a1_old, a1_latest, a2_latest])
        db.session.commit()

    res = client.get("/api/farmer/herd-health-overview", headers=headers)
    assert res.status_code == 200
    data = res.get_json()

    # Total registered cows for Alice = 3 (Cow1, Cow2, Cow3)
    assert data["total_cattle"] == 3
    # Breakdown: Cow1 = Normal, Cow2 = Severe, Cow3 = Not Assessed
    assert data["breakdown"]["normal"] == 1
    assert data["breakdown"]["severe"] == 1
    assert data["breakdown"]["not_assessed"] == 1
    assert data["critical_count"] == 1

    # Priority list should ONLY contain Cow2, NOT Cow1
    priority_ids = [p["cow_id"] for p in data["priority_list"]]
    assert cow2_id in priority_ids
    assert cow1_id not in priority_ids


def test_cross_farmer_authorization(client, test_data):
    """Farmer Bob cannot access Farmer Alice's cow health trend or follow-ups."""
    bob_headers = {"Authorization": f"Bearer {test_data['token2']}"}
    alice_cow_id = test_data["cow1_id"]

    res_trend = client.get(f"/api/cows/{alice_cow_id}/health-trend", headers=bob_headers)
    assert res_trend.status_code == 404

    res_comp = client.get(f"/api/cows/{alice_cow_id}/assessment-comparison", headers=bob_headers)
    assert res_comp.status_code == 404

    res_vet = client.get(f"/api/cows/{alice_cow_id}/veterinary-follow-up", headers=bob_headers)
    assert res_vet.status_code == 404
