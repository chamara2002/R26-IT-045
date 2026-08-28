"""Dashboard API routes for herd and module summaries."""

from flask import Blueprint, jsonify
from flask_jwt_extended import get_jwt_identity, jwt_required

from models.cow import Cow
from models.milk_yield import MilkYield
from services.health_trend_service import calculate_herd_health_overview, calculate_all_diseases_overview
from services.module_proxy_service import list_modules

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/api")


@dashboard_bp.get("/dashboard")
@jwt_required()
def get_dashboard_data():
    """Return herd summary, recent milk logs, multi-disease health overview, and available module names."""
    user_id = int(get_jwt_identity())

    cows = Cow.query.filter_by(user_id=user_id).order_by(Cow.created_at.desc()).all()
    cow_ids = [cow.id for cow in cows]

    logs = []
    if cow_ids:
        logs = (
            MilkYield.query.filter(MilkYield.cow_id.in_(cow_ids))
            .order_by(MilkYield.date.desc(), MilkYield.created_at.desc())
            .limit(20)
            .all()
        )

    herd_overview = calculate_herd_health_overview(user_id)
    all_diseases = calculate_all_diseases_overview(user_id)

    total_milk_volume = sum(float(l.milk_quantity or 0) for l in logs) if logs else 0

    return jsonify(
        {
            "summary": {
                "cow_count": len(cows),
                "milk_log_count": len(logs),
                "total_milk_volume": round(total_milk_volume, 1),
                "critical_mastitis_count": herd_overview.get("critical_count", 0),
                "urgent_cases_all": all_diseases.get("summary", {}).get("urgent_cases_all", 0),
                "healthy_index_pct": all_diseases.get("summary", {}).get("healthy_index_pct", 100),
            },
            "modules": list_modules(),
            "cows": [cow.to_dict() for cow in cows],
            "recent_milk_logs": [log.to_dict() for log in logs],
            "herd_health_overview": herd_overview,
            "all_diseases_overview": all_diseases,
        }
    ), 200
