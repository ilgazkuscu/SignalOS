from __future__ import annotations

import httpx
import pandas as pd

from signalos.config import get_settings
from signalos.ingestion.common import write_raw_frame


AUTH_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token"
STATES_URL = "https://opensky-network.org/api/states/all"


async def _get_token(client: httpx.AsyncClient) -> str:
    settings = get_settings()
    response = await client.post(
        AUTH_URL,
        data={
            "grant_type": "client_credentials",
            "client_id": settings.opensky_client_id,
            "client_secret": settings.opensky_client_secret,
        },
    )
    response.raise_for_status()
    return response.json()["access_token"]


async def fetch_states(bbox: tuple[float, float, float, float]) -> pd.DataFrame:
    lamin, lomin, lamax, lomax = bbox
    async with httpx.AsyncClient(timeout=20) as client:
        token = await _get_token(client)
        response = await client.get(
            STATES_URL,
            params={"lamin": lamin, "lomin": lomin, "lamax": lamax, "lomax": lomax},
            headers={"Authorization": f"Bearer {token}"},
        )
        response.raise_for_status()
    payload = response.json()
    rows = []
    for item in payload.get("states", []):
        rows.append(
            {
                "icao24": item[0],
                "callsign": (item[1] or "").strip(),
                "origin_country": item[2],
                "time_position": pd.to_datetime(item[3], unit="s", utc=True),
                "last_contact": pd.to_datetime(item[4], unit="s", utc=True),
                "lon": item[5],
                "lat": item[6],
                "baro_altitude": item[7],
                "velocity": item[9],
                "true_track": item[10],
            }
        )
    frame = pd.DataFrame(rows)
    if not frame.empty:
        write_raw_frame("opensky", frame)
    return frame


async def query_trino(sql: str) -> pd.DataFrame:
    return pd.DataFrame({"query": [sql], "status": ["not_configured"]})
