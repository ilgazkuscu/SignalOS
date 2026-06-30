from __future__ import annotations

import httpx
import pandas as pd

from signalos.config import get_settings
from signalos.ingestion.common import normalize_ts, write_raw_frame


async def fetch_eia() -> pd.DataFrame:
    settings = get_settings()
    if not settings.eia_api_key:
        return pd.DataFrame(columns=["period", "value"])
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://api.eia.gov/v2/seriesid/PET.WCSSTUS1.W",
            params={"api_key": settings.eia_api_key},
        )
        response.raise_for_status()
    payload = response.json()
    rows = [
        {"period": normalize_ts(item["period"]), "value": item["value"]}
        for item in payload.get("response", {}).get("data", [])
    ]
    frame = pd.DataFrame(rows)
    if not frame.empty:
        write_raw_frame("eia", frame)
    return frame
