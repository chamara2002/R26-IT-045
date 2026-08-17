"""Longitudinal Health Analysis & Decision-Support Service for CattleSense.

Rule-based historical monitoring layer for Mastitis assessments.
Note: This service performs decision-support and trend visualization only;
it is NOT a machine-learning model and does NOT diagnose disease progression.
"""

from datetime import datetime, timedelta, date
from typing import List, Dict, Any, Optional
from models import db
from models.cow import Cow
from models.mastitis_assessment import MastitisAssessment


def normalize_severity(stage_or_level: Any) -> tuple[int, str]:
    """Map arbitrary severity string/code to discrete visualization scale (0-3).

    0 = Normal / Negative
    1 = Mild
    2 = Moderate
    3 = Severe / Critical
    """
    if stage_or_level is None:
        return 0, "Normal"

    text = str(stage_or_level).strip().lower()

    if "severe" in text or "critical" in text or text == "3":
        return 3, "Severe Mastitis"
    if "moderate" in text or text == "2":
        return 2, "Moderate Mastitis"
    if "mild" in text or text == "1":
        return 1, "Mild Mastitis"

    return 0, "Normal"


def calculate_cow_health_trend(assessments: List[MastitisAssessment]) -> Dict[str, Any]:
    """Calculate historical longitudinal health trend from saved Mastitis assessments."""
    if not assessments:
        return {
            "has_data": False,
            "total_assessments": 0,
            "trend_state": "Insufficient Data",
            "trend_direction": "none",
            "trend_icon": "ℹ️",
            "trend_message": "No saved assessments available for this cow.",
            "timeline": [],
            "current_severity": "Unknown",
            "current_severity_code": None,
            "latest_assessment_date": None,
            "first_assessment_date": None,
            "recovery_trajectory": None,
        }

    # Ensure chronological order (oldest to newest) for trend analysis
    sorted_asc = sorted(assessments, key=lambda a: (a.assessment_datetime, a.id))
    sorted_desc = list(reversed(sorted_asc))

    timeline = []
    severity_codes = []

    for a in sorted_asc:
        code, label = normalize_severity(a.stage or a.severity_level)
        severity_codes.append(code)
        dt_str = a.assessment_datetime.strftime("%Y-%m-%d")
        display_dt = a.assessment_datetime.strftime("%b %d, %Y")

        timeline.append({
            "id": a.id,
            "date": dt_str,
            "display_date": display_dt,
            "severity_code": code,
            "severity_level": label,
            "raw_stage": a.stage or label,
            "prediction": a.prediction,
            "confidence": a.confidence,
            "has_report": bool(a.has_veterinary_report or a.veterinary_report_path),
        })

    total = len(sorted_asc)
    latest = sorted_desc[0]
    previous = sorted_desc[1] if total >= 2 else None
    first = sorted_asc[0]

    latest_code, latest_label = normalize_severity(latest.stage or latest.severity_level)

    # Determine trend state
    if total < 2:
        trend_state = "Insufficient Data"
        trend_direction = "insufficient"
        trend_icon = "ℹ️"
        trend_message = "More assessments are required to establish a trend."
    else:
        prev_code, _ = normalize_severity(previous.stage or previous.severity_level)
        recent_codes = severity_codes[-3:] if len(severity_codes) >= 3 else severity_codes[-2:]

        is_monotonically_increasing = all(recent_codes[i] < recent_codes[i+1] for i in range(len(recent_codes)-1))
        is_monotonically_decreasing = all(recent_codes[i] > recent_codes[i+1] for i in range(len(recent_codes)-1))
        all_equal = all(c == recent_codes[0] for c in recent_codes)

        if is_monotonically_increasing:
            if latest_code >= 3 or (latest_code - recent_codes[0] >= 2):
                trend_state = "Rapidly Worsening"
                trend_direction = "rapidly_worsening"
                trend_icon = "🔴"
                trend_message = "Recent assessments indicate rapid increase in severity."
            else:
                trend_state = "Worsening"
                trend_direction = "worsening"
                trend_icon = "🟠"
                trend_message = "Recent assessment pattern indicates worsening severity."
        elif is_monotonically_decreasing:
            trend_state = "Improving"
            trend_direction = "improving"
            trend_icon = "🟢"
            trend_message = "Assessment trend indicates improving condition."
        elif all_equal:
            trend_state = "Stable"
            trend_direction = "stable"
            trend_icon = "⚪"
            trend_message = f"Condition remains stable at {latest_label}."
        else:
            if latest_code > prev_code:
                trend_state = "Worsening"
                trend_direction = "worsening"
                trend_icon = "🟠"
                trend_message = "Latest assessment shows increased severity compared to previous."
            elif latest_code < prev_code:
                trend_state = "Improving"
                trend_direction = "improving"
                trend_icon = "🟢"
                trend_message = "Latest assessment shows improved condition compared to previous."
            else:
                trend_state = "Stable"
                trend_direction = "stable"
                trend_icon = "⚪"
                trend_message = "Condition is stable across recent assessments."

    # Check for recovery trajectory (e.g. Past Severe/Moderate -> Now Normal/Mild)
    recovery_trajectory = None
    if total >= 2:
        max_historical_code = max(severity_codes[:-1])
        if max_historical_code >= 2 and latest_code <= 1:
            recovery_trajectory = {
                "peak_severity": "Severe" if max_historical_code == 3 else "Moderate",
                "current_severity": latest_label,
                "is_recovering": True,
                "message": "Historical trend indicates positive recovery progression from prior elevated severity.",
            }

    return {
        "has_data": True,
        "total_assessments": total,
        "trend_state": trend_state,
        "trend_direction": trend_direction,
        "trend_icon": trend_icon,
        "trend_message": trend_message,
        "timeline": timeline,
        "current_severity": latest_label,
        "current_severity_code": latest_code,
        "latest_assessment_date": latest.assessment_datetime.strftime("%b %d, %Y"),
        "latest_assessment_id": latest.id,
        "previous_assessment_date": previous.assessment_datetime.strftime("%b %d, %Y") if previous else None,
        "previous_assessment_id": previous.id if previous else None,
        "first_assessment_date": first.assessment_datetime.strftime("%b %d, %Y"),
        "recovery_trajectory": recovery_trajectory,
    }


def compare_assessments(
    current: MastitisAssessment,
    previous: Optional[MastitisAssessment]
) -> Dict[str, Any]:
    """Perform side-by-side metric comparison between current and previous assessments."""
    if not previous:
        return {
            "has_comparison": False,
            "message": "No previous saved assessment available for comparison.",
        }

    curr_code, curr_label = normalize_severity(current.stage or current.severity_level)
    prev_code, prev_label = normalize_severity(previous.stage or previous.severity_level)

    # Severity Comparison
    if curr_code > prev_code:
        sev_change = "Increased"
        sev_icon = "⚠️"
    elif curr_code < prev_code:
        sev_change = "Decreased"
        sev_icon = "🟢"
    else:
        sev_change = "Unchanged"
        sev_icon = "⚪"

    # Confidence Comparison
    conf_comp = None
    if current.confidence is not None and previous.confidence is not None:
        curr_c = round(float(current.confidence) * 100, 1)
        prev_c = round(float(previous.confidence) * 100, 1)
        diff_c = round(curr_c - prev_c, 1)
        conf_comp = {
            "current": f"{curr_c}%",
            "previous": f"{prev_c}%",
            "delta": f"{'+' if diff_c > 0 else ''}{diff_c}%",
            "available": True,
        }
    else:
        conf_comp = {"available": False, "message": "Not available for comparison"}

    # Numerical Metrics Helper
    def _compare_num(curr_val, prev_val, unit="", lower_is_better=False):
        if curr_val is None or prev_val is None:
            return {
                "available": False,
                "current": f"{curr_val} {unit}".strip() if curr_val is not None else "Not available",
                "previous": f"{prev_val} {unit}".strip() if prev_val is not None else "Not available",
                "message": "Not available for comparison",
            }
        try:
            c = float(curr_val)
            p = float(prev_val)
            diff = round(c - p, 2)
            pct = round(((c - p) / p) * 100, 1) if p != 0 else 0.0

            if diff > 0:
                direction = "increased"
                arrow = "↑"
            elif diff < 0:
                direction = "decreased"
                arrow = "↓"
            else:
                direction = "unchanged"
                arrow = "→"

            return {
                "available": True,
                "current": f"{c} {unit}".strip(),
                "previous": f"{p} {unit}".strip(),
                "diff": diff,
                "pct_change": f"{arrow} {abs(pct)}%",
                "direction": direction,
                "arrow": arrow,
            }
        except (ValueError, TypeError):
            return {"available": False, "message": "Not available for comparison"}

    # Clinical Observations Helper
    def _compare_str(curr_val, prev_val):
        if not curr_val or not prev_val or curr_val == "Unknown" or prev_val == "Unknown":
            return {
                "available": False,
                "current": curr_val or "Not available",
                "previous": prev_val or "Not available",
                "message": "Not available for comparison",
            }
        return {
            "available": True,
            "current": str(curr_val),
            "previous": str(prev_val),
            "changed": str(curr_val).lower() != str(prev_val).lower(),
        }

    curr_obs = current.clinical_observations or {}
    prev_obs = previous.clinical_observations or {}

    return {
        "has_comparison": True,
        "previous_date": previous.assessment_datetime.strftime("%d %b %Y"),
        "current_date": current.assessment_datetime.strftime("%d %b %Y"),
        "severity": {
            "previous": prev_label,
            "current": curr_label,
            "change": sev_change,
            "icon": sev_icon,
        },
        "confidence": conf_comp,
        "metrics": {
            "milk_yield": _compare_num(current.milk_yield, previous.milk_yield, "L"),
            "milk_temperature": _compare_num(current.milk_temperature, previous.milk_temperature, "°C"),
            "somatic_cell_count": _compare_num(current.somatic_cell_count, previous.somatic_cell_count, "cells/µL"),
            "milk_conductivity": _compare_num(current.milk_conductivity, previous.milk_conductivity, "mS/cm"),
            "milk_ph": _compare_num(current.milk_ph, previous.milk_ph, "pH"),
        },
        "clinical_observations": {
            "swelling": _compare_str(curr_obs.get("udder_swelling"), prev_obs.get("udder_swelling")),
            "warmth": _compare_str(curr_obs.get("udder_warmth"), prev_obs.get("udder_warmth")),
            "pain": _compare_str(curr_obs.get("udder_pain"), prev_obs.get("udder_pain")),
            "clotting": _compare_str(current.clotting, previous.clotting),
            "appearance": _compare_str(curr_obs.get("milk_appearance"), prev_obs.get("milk_appearance")),
            "appetite": _compare_str(curr_obs.get("appetite"), prev_obs.get("appetite")),
        },
    }


def evaluate_risk_escalation(assessments: List[MastitisAssessment]) -> Dict[str, Any]:
    """Rule-based risk escalation and critical alert evaluator.

    Safe medical phrasing: Does NOT claim confirmed clinical diagnosis.
    """
    if not assessments:
        return {
            "is_critical": False,
            "risk_level": "info",
            "title": "No Assessment Records",
            "message": "No saved assessments recorded yet for this cow.",
            "actions": [],
        }

    sorted_desc = sorted(assessments, key=lambda a: (a.assessment_datetime, a.id), reverse=True)
    latest = sorted_desc[0]
    previous = sorted_desc[1] if len(sorted_desc) >= 2 else None

    latest_code, latest_label = normalize_severity(latest.stage or latest.severity_level)

    # Critical Escalation Trigger
    if latest_code >= 3:
        return {
            "is_critical": True,
            "risk_level": "critical",
            "title": "🚨 CRITICAL VETERINARY ATTENTION REQUIRED",
            "message": (
                "CattleSense assessment indicates findings associated with a potentially serious "
                "mastitis case. Please contact or visit a qualified veterinarian promptly."
            ),
            "supporting_context": (
                "Recent assessments have also shown increasing severity."
                if previous and normalize_severity(previous.stage or previous.severity_level)[0] < latest_code
                else "Immediate clinical evaluation is recommended."
            ),
            "actions": ["find_veterinarian", "download_report", "create_follow_up"],
        }

    if previous:
        prev_code, prev_label = normalize_severity(previous.stage or previous.severity_level)
        if latest_code > prev_code:
            return {
                "is_critical": False,
                "risk_level": "warning",
                "title": f"⚠️ Condition Changed from {prev_label} to {latest_label}",
                "message": "Recent assessment pattern indicates worsening severity. Close monitoring recommended.",
                "supporting_context": "Consider repeating screening in 24-48 hours or consulting a veterinary officer if symptoms persist.",
                "actions": ["monitor_closely", "download_report"],
            }
        elif latest_code < prev_code:
            return {
                "is_critical": False,
                "risk_level": "positive",
                "title": f"🟢 Condition Improved from {prev_label} to {latest_label}",
                "message": "Assessment trend indicates improving condition.",
                "supporting_context": "Continue regular milking hygiene and observe for full recovery.",
                "actions": [],
            }
        else:
            return {
                "is_critical": False,
                "risk_level": "stable",
                "title": f"⚪ Stable ({latest_label})",
                "message": f"Assessment findings are consistent with previous check ({prev_label}).",
                "supporting_context": "Maintain standard dairy herd management.",
                "actions": [],
            }

    return {
        "is_critical": False,
        "risk_level": "info",
        "title": "ℹ️ Baseline Assessment Saved",
        "message": "More assessments are required to establish an ongoing trend.",
        "supporting_context": "Regular routine screening will automatically populate longitudinal health charts.",
        "actions": [],
    }


def calculate_herd_health_overview(user_id: int) -> Dict[str, Any]:
    """Calculate herd-level statistics from the farmer's registered cattle and latest saved assessments."""
    cows = Cow.query.filter_by(user_id=user_id).all()
    total_cattle = len(cows)

    if total_cattle == 0:
        return {
            "total_cattle": 0,
            "assessed_cattle": 0,
            "breakdown": {"normal": 0, "mild": 0, "moderate": 0, "severe": 0, "not_assessed": 0},
            "critical_count": 0,
            "priority_list": [],
            "recent_7d": {"normal": 0, "mild": 0, "moderate": 0, "severe": 0, "total": 0},
            "recent_30d": {"normal": 0, "mild": 0, "moderate": 0, "severe": 0, "total": 0},
            "summary_message": "No cattle registered yet in your herd.",
        }

    # Map each cow to its LATEST assessment only
    cow_ids = [c.id for c in cows]
    all_assessments = (
        MastitisAssessment.query.filter(MastitisAssessment.cow_id.in_(cow_ids), MastitisAssessment.user_id == user_id)
        .order_by(MastitisAssessment.assessment_datetime.desc(), MastitisAssessment.id.desc())
        .all()
    )

    latest_per_cow: Dict[int, MastitisAssessment] = {}
    for a in all_assessments:
        if a.cow_id not in latest_per_cow:
            latest_per_cow[a.cow_id] = a

    normal_count = 0
    mild_count = 0
    moderate_count = 0
    severe_count = 0
    not_assessed_count = 0
    priority_list = []

    for cow in cows:
        latest = latest_per_cow.get(cow.id)
        if not latest:
            not_assessed_count += 1
            continue

        code, label = normalize_severity(latest.stage or latest.severity_level)
        if code == 3:
            severe_count += 1
            priority_list.append({
                "cow_id": cow.id,
                "tag_id": cow.tag_id,
                "name": cow.name or cow.tag_id,
                "severity": label,
                "severity_code": code,
                "assessment_date": latest.assessment_datetime.strftime("%d %b %Y"),
                "assessment_id": latest.id,
                "has_report": bool(latest.has_veterinary_report or latest.veterinary_report_path),
            })
        elif code == 2:
            moderate_count += 1
        elif code == 1:
            mild_count += 1
        else:
            normal_count += 1

    # 7-day and 30-day activity counts
    now = datetime.utcnow()
    d7_cutoff = now - timedelta(days=7)
    d30_cutoff = now - timedelta(days=30)

    recent_7d = {"normal": 0, "mild": 0, "moderate": 0, "severe": 0, "total": 0}
    recent_30d = {"normal": 0, "mild": 0, "moderate": 0, "severe": 0, "total": 0}

    for a in all_assessments:
        code, _ = normalize_severity(a.stage or a.severity_level)
        key = "severe" if code == 3 else ("moderate" if code == 2 else ("mild" if code == 1 else "normal"))

        if a.assessment_datetime >= d30_cutoff:
            recent_30d[key] += 1
            recent_30d["total"] += 1
            if a.assessment_datetime >= d7_cutoff:
                recent_7d[key] += 1
                recent_7d["total"] += 1

    if severe_count == 1:
        summary_msg = "🔴 1 cow requires urgent veterinary attention based on saved CattleSense assessments."
    elif severe_count > 1:
        summary_msg = f"🔴 {severe_count} cows require urgent veterinary attention based on saved CattleSense assessments."
    else:
        summary_msg = "✓ No cows currently require urgent veterinary attention based on saved CattleSense assessments."

    return {
        "total_cattle": total_cattle,
        "assessed_cattle": len(latest_per_cow),
        "breakdown": {
            "normal": normal_count,
            "mild": mild_count,
            "moderate": moderate_count,
            "severe": severe_count,
            "not_assessed": not_assessed_count,
        },
        "critical_count": severe_count,
        "priority_list": priority_list,
        "recent_7d": recent_7d,
        "recent_30d": recent_30d,
        "summary_message": summary_msg,
    }
