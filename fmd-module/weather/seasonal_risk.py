"""DAPH-based historical seasonal FMD escalation.

Source: DAPH Sri Lanka Annual Report 2022 -- "FMD epidemics in Sri Lanka
always commenced during the northeast monsoon between December and
February. This coincides with the seasonal movement of livestock
returning to the villages as a part of extensive livestock management
practice especially in dry zone."

This module encodes that single documented historical observation as a
deterministic, auditable rule -- not a trained or statistically validated
model, and not a claim that the calendar month causes FMD. It deliberately
does not call the period "high-incidence"; it only reflects DAPH's own
description of when epidemics have historically commenced. No numeric
multiplier, no machine learning, no new dataset is introduced here.
"""

from __future__ import annotations

from datetime import date
from typing import Dict, Optional

SEASONAL_MONTHS = {12, 1, 2}
SEASONAL_PERIOD_LABEL = "December–February"

# Escalate by exactly one category when within the seasonal window. This is
# the entire "model": an ordinal step, never a numeric multiplier, and it
# never manufactures HIGH out of genuinely LOW measured weather conditions.
_ESCALATION = {"LOW": "MEDIUM", "MEDIUM": "HIGH", "HIGH": "HIGH"}

DAPH_CITATION = "DAPH Sri Lanka Annual Report 2022"

SEASONAL_DISCLAIMER = (
    "This seasonal indicator is based on a documented historical observation "
    "and has not been independently validated against multi-year outbreak-date "
    "data by this system."
)


def is_seasonal_window(current_date: date) -> bool:
    """True if current_date falls in the historical December-February FMD
    epidemic commencement period reported by DAPH Sri Lanka."""
    return current_date.month in SEASONAL_MONTHS


def _seasonal_explanation(seasonal_active: bool) -> str:
    if seasonal_active:
        return (
            "Current date is within the historical December–February FMD "
            "epidemic commencement period reported by DAPH Sri Lanka. This "
            "seasonal observation is associated in the DAPH report with "
            "livestock movement returning to villages, particularly in the "
            "dry zone."
        )
    return (
        "Current date is outside the historical December–February FMD "
        "epidemic commencement period reported by DAPH Sri Lanka."
    )


def compute_environmental_risk(current_date: date, weather_risk: Optional[str]) -> Dict[str, object]:
    """Combine the existing (unmodified) weather risk with the DAPH seasonal
    observation via a fixed one-step ordinal escalation.

    weather_risk may be None (weather currently unavailable) -- the seasonal
    context is still returned (it only depends on the date), but
    environmental_risk stays None since there is no weather risk to escalate.
    """
    seasonal_active = is_seasonal_window(current_date)
    normalized_weather_risk = weather_risk if weather_risk in ("LOW", "MEDIUM", "HIGH") else None

    if normalized_weather_risk is None:
        environmental_risk = None
    elif seasonal_active:
        environmental_risk = _ESCALATION[normalized_weather_risk]
    else:
        environmental_risk = normalized_weather_risk

    return {
        "weather_risk": normalized_weather_risk,
        "seasonal_active": seasonal_active,
        "seasonal_period": SEASONAL_PERIOD_LABEL,
        "environmental_risk": environmental_risk,
        "seasonal_explanation": _seasonal_explanation(seasonal_active),
        "seasonal_disclaimer": SEASONAL_DISCLAIMER,
        "seasonal_source": DAPH_CITATION,
    }
