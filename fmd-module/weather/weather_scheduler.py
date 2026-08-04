from __future__ import annotations

import logging
from typing import Any, Dict

logger = logging.getLogger(__name__)


def schedule_weather_refresh() -> Dict[str, Any]:
    """Placeholder scheduler hook. This can later be wired to a cron/APScheduler task."""
    return {"status": "scheduled", "message": "Weather refresh hook is ready for deployment"}
