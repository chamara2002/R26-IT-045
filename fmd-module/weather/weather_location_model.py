"""Repository for a farmer's registered farm location.

Lets the weather risk service auto-resolve latitude/longitude for a
farmer_id instead of requiring it on every request, without touching the
main backend's User/Cow tables.
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
                    updated_at TEXT NOT NULL
                )
                """
            )
            connection.commit()

    def save_location(self, farmer_id: str, latitude: float, longitude: float) -> None:
        with sqlite3.connect(self.db_path) as connection:
            connection.execute(
                """
                INSERT INTO farmer_location (farmer_id, latitude, longitude, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(farmer_id) DO UPDATE SET
                    latitude = excluded.latitude,
                    longitude = excluded.longitude,
                    updated_at = excluded.updated_at
                """,
                (farmer_id, latitude, longitude, datetime.now(timezone.utc).isoformat()),
            )
            connection.commit()

    def get_location(self, farmer_id: str) -> Optional[Tuple[float, float]]:
        with sqlite3.connect(self.db_path) as connection:
            row = connection.execute(
                "SELECT latitude, longitude FROM farmer_location WHERE farmer_id = ?",
                (farmer_id,),
            ).fetchone()
        return (row[0], row[1]) if row else None
