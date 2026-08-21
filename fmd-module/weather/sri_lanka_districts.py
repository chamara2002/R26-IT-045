"""Static district -> coordinates lookup for Sri Lanka.

The shared CattleSense farmer profile (backend/models/user.py) has no
location field of any kind (no district, no coordinates), and browser
geolocation must not be used for the FMD weather-risk feature. Instead, the
farmer picks their farm's district once on the FMD page, it is resolved to
approximate coordinates here, and the result is persisted in this module's
own farmer_location store (weather/weather_location_model.py) so it is
reused automatically until the farmer changes it.

Coordinates are district-centroid approximations (a few km of error is
expected and acceptable for daily weather aggregation), not exact farm
coordinates.
"""

from __future__ import annotations

from typing import Dict, Tuple

DISTRICT_COORDINATES: Dict[str, Tuple[float, float]] = {
    "Ampara": (7.2833, 81.6667),
    "Anuradhapura": (8.3114, 80.4037),
    "Badulla": (6.9934, 81.0550),
    "Batticaloa": (7.7167, 81.7000),
    "Colombo": (6.9271, 79.8612),
    "Galle": (6.0535, 80.2210),
    "Gampaha": (7.0917, 79.9997),
    "Hambantota": (6.1246, 81.1185),
    "Jaffna": (9.6615, 80.0255),
    "Kalutara": (6.5854, 79.9607),
    "Kandy": (7.2906, 80.6337),
    "Kegalle": (7.2513, 80.3464),
    "Kilinochchi": (9.3803, 80.3770),
    "Kurunegala": (7.4863, 80.3623),
    "Mannar": (8.9810, 79.9044),
    "Matale": (7.4675, 80.6234),
    "Matara": (5.9549, 80.5550),
    "Monaragala": (6.8714, 81.3510),
    "Mullaitivu": (9.2670, 80.8142),
    "Nuwara Eliya": (6.9497, 80.7891),
    "Polonnaruwa": (7.9403, 81.0188),
    "Puttalam": (8.0362, 79.8283),
    "Ratnapura": (6.6828, 80.3992),
    "Trincomalee": (8.5874, 81.2152),
    "Vavuniya": (8.7514, 80.4971),
}


def list_districts() -> list[str]:
    return sorted(DISTRICT_COORDINATES.keys())


def resolve_district(district: str) -> Tuple[float, float]:
    """Return (latitude, longitude) for a district name, case-insensitively.

    Raises ValueError if the district is not recognised.
    """
    if not district:
        raise ValueError("district is required")

    normalized = district.strip().lower()
    for name, coordinates in DISTRICT_COORDINATES.items():
        if name.lower() == normalized:
            return coordinates

    raise ValueError(f"Unknown district: {district!r}. Use one of: {', '.join(list_districts())}")
