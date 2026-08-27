import sys
from datetime import date
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from weather.seasonal_risk import (
    SEASONAL_PERIOD_LABEL,
    compute_environmental_risk,
    is_seasonal_window,
)


@pytest.mark.parametrize(
    "month,weather_risk,expected_environmental_risk",
    [
        (1, "LOW", "MEDIUM"),      # January + LOW -> MEDIUM
        (1, "MEDIUM", "HIGH"),     # January + MEDIUM -> HIGH
        (1, "HIGH", "HIGH"),       # January + HIGH -> HIGH
        (2, "LOW", "MEDIUM"),      # February + LOW -> MEDIUM
        (12, "LOW", "MEDIUM"),     # December + LOW -> MEDIUM
        (3, "LOW", "LOW"),         # March + LOW -> LOW (out of season)
        (11, "MEDIUM", "MEDIUM"),  # November + MEDIUM -> MEDIUM (out of season)
        (7, "HIGH", "HIGH"),       # July + HIGH -> HIGH (out of season, already max)
    ],
)
def test_seasonal_escalation_table(month, weather_risk, expected_environmental_risk):
    result = compute_environmental_risk(date(2026, month, 15), weather_risk)
    assert result["environmental_risk"] == expected_environmental_risk


@pytest.mark.parametrize("month", [12, 1, 2])
def test_is_seasonal_window_true_for_dec_jan_feb(month):
    assert is_seasonal_window(date(2026, month, 1)) is True


@pytest.mark.parametrize("month", [3, 4, 5, 6, 7, 8, 9, 10, 11])
def test_is_seasonal_window_false_outside_dec_feb(month):
    assert is_seasonal_window(date(2026, month, 1)) is False


def test_environmental_risk_is_none_when_weather_risk_is_none():
    result = compute_environmental_risk(date(2026, 1, 15), None)
    assert result["environmental_risk"] is None
    # Seasonal context is still meaningful even without live weather data.
    assert result["seasonal_active"] is True
    assert result["seasonal_period"] == SEASONAL_PERIOD_LABEL


def test_response_shape_has_required_fields():
    result = compute_environmental_risk(date(2026, 1, 15), "LOW")
    for key in (
        "weather_risk",
        "seasonal_active",
        "seasonal_period",
        "environmental_risk",
        "seasonal_explanation",
        "seasonal_disclaimer",
        "seasonal_source",
    ):
        assert key in result


def test_explanation_and_disclaimer_wording_is_scientifically_safe():
    active = compute_environmental_risk(date(2026, 1, 15), "LOW")
    inactive = compute_environmental_risk(date(2026, 6, 15), "LOW")

    unsafe_phrases = [
        "will occur",
        "guaranteed",
        "high-incidence",
        "clinically confirmed",
        "model accuracy",
        "ml seasonal prediction",
        "causes fmd",
    ]
    for result in (active, inactive):
        combined_text = (result["seasonal_explanation"] + " " + result["seasonal_disclaimer"]).lower()
        for phrase in unsafe_phrases:
            assert phrase not in combined_text

    # Must use DAPH-sourced framing, not a causal claim.
    assert "daph" in active["seasonal_explanation"].lower()
    assert "historical" in active["seasonal_explanation"].lower()
    assert "not been independently validated" in active["seasonal_disclaimer"].lower()


def test_never_produces_high_from_low_in_one_step_without_season():
    # Out of season: LOW must stay LOW, never silently jump to HIGH.
    result = compute_environmental_risk(date(2026, 6, 1), "LOW")
    assert result["environmental_risk"] == "LOW"


def test_seasonal_escalation_caps_at_high():
    result = compute_environmental_risk(date(2026, 1, 1), "HIGH")
    assert result["environmental_risk"] == "HIGH"


# ─── Explicit month-boundary dates (not the actual current date) ─────────
# is_seasonal_window()/compute_environmental_risk() take a plain `date`, so
# these exercise the exact calendar edges regardless of when the suite runs
# or what timezone the machine running it is in.

@pytest.mark.parametrize(
    "label,test_date,expected_active",
    [
        ("November 30 -> inactive", date(2026, 11, 30), False),
        ("December 1 -> active", date(2026, 12, 1), True),
        ("February 28 (non-leap year, 2027) -> active", date(2027, 2, 28), True),
        ("February 29 (leap year, 2028) -> active", date(2028, 2, 29), True),
        ("March 1 -> inactive", date(2026, 3, 1), False),
    ],
)
def test_month_boundary_dates(label, test_date, expected_active):
    assert is_seasonal_window(test_date) is expected_active, label
    result = compute_environmental_risk(test_date, "LOW")
    expected_environmental_risk = "MEDIUM" if expected_active else "LOW"
    assert result["environmental_risk"] == expected_environmental_risk, label
    assert result["seasonal_active"] is expected_active, label


def test_leap_year_february_29_is_a_valid_date_and_stays_in_season():
    # 2028 is a leap year (divisible by 4, not a century exception).
    leap_day = date(2028, 2, 29)
    assert is_seasonal_window(leap_day) is True
    result = compute_environmental_risk(leap_day, "MEDIUM")
    assert result["environmental_risk"] == "HIGH"
