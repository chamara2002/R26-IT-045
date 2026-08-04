from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

DB_PATH = Path(__file__).resolve().parent.parent / "weather_history.db"


class WeatherHistoryStore:
    def __init__(self, db_path: Optional[Path] = None):
        self.db_path = db_path or DB_PATH
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS weather_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    farmer_id TEXT NOT NULL,
                    date TEXT NOT NULL,
                    rainfall REAL NOT NULL,
                    temperature REAL NOT NULL,
                    humidity REAL NOT NULL,
                    predicted_risk TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    UNIQUE(farmer_id, date)
                )
                """
            )
            connection.commit()

    def save_daily_record(self, farmer_id: str, rainfall: float, temperature: float, humidity: float, predicted_risk: str) -> Dict[str, Any]:
        today = datetime.now(timezone.utc).date().isoformat()
        with sqlite3.connect(self.db_path) as connection:
            existing = connection.execute(
                "SELECT id FROM weather_history WHERE farmer_id = ? AND date = ?",
                (farmer_id, today),
            ).fetchone()
            if existing:
                return {"status": "exists", "record_id": existing[0]}

            cursor = connection.execute(
                """
                INSERT INTO weather_history (farmer_id, date, rainfall, temperature, humidity, predicted_risk, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (farmer_id, today, rainfall, temperature, humidity, predicted_risk, datetime.now(timezone.utc).isoformat()),
            )
            connection.commit()
            return {"status": "saved", "record_id": cursor.lastrowid}

    def get_history(self, farmer_id: str, days: int = 30) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as connection:
            rows = connection.execute(
                """
                SELECT date, rainfall, temperature, humidity, predicted_risk
                FROM weather_history
                WHERE farmer_id = ?
                ORDER BY date DESC
                LIMIT ?
                """,
                (farmer_id, days),
            ).fetchall()

        return [
            {
                "date": row[0],
                "rainfall": row[1],
                "temperature": row[2],
                "humidity": row[3],
                "predicted_risk": row[4],
            }
            for row in rows
        ]
