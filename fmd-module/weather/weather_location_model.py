"""Repository for a farmer's registered farm location.

Lets the weather risk service auto-resolve latitude/longitude for a
farmer_id instead of requiring it on every request, without touching the
main backend's User/Cow tables.

The shared CattleSense farmer profile has no location field at all, so this
store IS the farmer's location setting for FMD purposes: the farmer picks a
district once (see weather/sri_lanka_districts.py for the district ->
coordinates lookup), it is saved here, and every later weather-risk request
for that farmer_id automatically reuses it until they change it. Browser
geolocation is intentionally not used.
"""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, Tuple

DB_PATH = Path(__file__).resolve().parent.parent / "weather_history.db"


class FarmerLocationStore:
    """CRUD access to the farmer_location table (one row per farmer_id)."""

    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS farmer_location (
                    farmer_id TEXT PRIMARY KEY,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    district TEXT,
                    updated_at TEXT NOT NULL
                )
                """
            )
            # Older databases created before `district` existed won't have the
            # column; add it in place rather than requiring a fresh DB file.
            existing_columns = {
                row[1] for row in connection.execute("PRAGMA table_info(farmer_location)").fetchall()
            }
            if "district" not in existing_columns:
                connection.execute("ALTER TABLE farmer_location ADD COLUMN district TEXT")
            connection.commit()

    def save_location(
        self,
        farmer_id: str,
        latitude: float,
        longitude: float,
        district: Optional[str] = None,
    ) -> None:
        with sqlite3.connect(self.db_path) as connection:
            connection.execute(
                """
                INSERT INTO farmer_location (farmer_id, latitude, longitude, district, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(farmer_id) DO UPDATE SET
                    latitude = excluded.latitude,
                    longitude = excluded.longitude,
                    district = excluded.district,
                    updated_at = excluded.updated_at
                """,
                (farmer_id, latitude, longitude, district, datetime.now(timezone.utc).isoformat()),
            )
            connection.commit()

    def get_location(self, farmer_id: str) -> Optional[Tuple[float, float]]:
        with sqlite3.connect(self.db_path) as connection:
            row = connection.execute(
                "SELECT latitude, longitude FROM farmer_location WHERE farmer_id = ?",
                (farmer_id,),
            ).fetchone()
        return (row[0], row[1]) if row else None

    def get_location_details(self, farmer_id: str) -> Optional[dict]:
        """Like get_location, but also includes the saved district name (if any)."""
        with sqlite3.connect(self.db_path) as connection:
            row = connection.execute(
                "SELECT latitude, longitude, district FROM farmer_location WHERE farmer_id = ?",
                (farmer_id,),
            ).fetchone()
        if not row:
            return None
        return {"latitude": row[0], "longitude": row[1], "district": row[2]}
