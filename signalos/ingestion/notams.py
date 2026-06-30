from __future__ import annotations

import httpx
import pandas as pd

from signalos.config import get_settings
from signalos.ingestion.common import normalize_ts, write_raw_frame


async def fetch_faa_notams(airports: list[str]) -> pd.DataFrame:
    settings = get_settings()
    headers = {"x-api-key": settings.faa_api_key} if settings.faa_api_key else {}
    rows: list[dict] = []
    async with httpx.AsyncClient(timeout=20) as client:
        for airport in airports:
            response = await client.get(
                "https://external-api.faa.gov/notamapi/v1/notams",
                params={"airport": airport},
                headers=headers,
            )
            if response.status_code >= 400:
                continue
            for item in response.json() or []:
                rows.append(
                    {
                        "airport": airport,
                        "id": item.get("id"),
                        "created": normalize_ts(item.get("issueDate")),
                        "qcode": item.get("qCode"),
                        "text": item.get("text"),
                    }
                )
    frame = pd.DataFrame(rows)
    if not frame.empty:
        write_raw_frame("faa_notams", frame)
    return frame


async def fetch_autorouter_notams(items: list[str]) -> pd.DataFrame:
    rows: list[dict] = []
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(
            "https://api.autorouter.aero/v1.0/notam",
            params=[("itemas", item) for item in items],
        )
        if response.status_code >= 400:
            return pd.DataFrame(columns=["airport"])
        payload = response.json()
        for airport, entries in payload.items():
            for item in entries:
                rows.append(
                    {
                        "airport": airport,
                        "id": item.get("id"),
                        "created": normalize_ts(item.get("created")),
                        "qcode": item.get("qline"),
                        "text": item.get("text"),
                    }
                )
    frame = pd.DataFrame(rows)
    if not frame.empty:
        write_raw_frame("autorouter_notams", frame)
    return frame
