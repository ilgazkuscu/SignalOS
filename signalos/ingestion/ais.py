from __future__ import annotations

import asyncio
import json

import httpx
import pandas as pd
import websockets

from signalos.config import MMSI_WATCHLIST, get_settings
from signalos.ingestion.common import normalize_ts, write_raw_frame


class AISStreamWS:
    def __init__(self) -> None:
        self.url = "wss://stream.aisstream.io/v0/stream"
        self.api_key = get_settings().aisstream_api_key

    async def collect(self, seconds: int = 5) -> pd.DataFrame:
        rows: list[dict] = []
        if not self.api_key:
            return pd.DataFrame(columns=["ts", "mmsi", "lat", "lon", "speed", "course", "ship_name"])
        async with websockets.connect(self.url) as ws:
            await ws.send(
                json.dumps(
                    {
                        "APIKey": self.api_key,
                        "BoundingBoxes": [[[-90, 30], [90, 80]]],
                        "FiltersShipMMSI": MMSI_WATCHLIST,
                    }
                )
            )
            end = asyncio.get_running_loop().time() + seconds
            while asyncio.get_running_loop().time() < end:
                try:
                    message = await asyncio.wait_for(ws.recv(), timeout=1)
                except TimeoutError:
                    continue
                payload = json.loads(message)
                report = payload.get("Message", {}).get("PositionReport") or {}
                metadata = payload.get("MetaData") or {}
                rows.append(
                    {
                        "ts": normalize_ts(metadata.get("time_utc")),
                        "mmsi": metadata.get("MMSI"),
                        "lat": report.get("Latitude"),
                        "lon": report.get("Longitude"),
                        "speed": report.get("Sog"),
                        "course": report.get("Cog"),
                        "ship_name": metadata.get("ShipName"),
                    }
                )
        frame = pd.DataFrame(rows)
        if not frame.empty:
            write_raw_frame("ais", frame)
        return frame


def poll_aishub(username: str) -> pd.DataFrame:
    if not username:
        return pd.DataFrame(columns=["mmsi"])
    response = httpx.get(
        "https://data.aishub.net/ws.php",
        params={"username": username, "format": 1, "output": "json"},
        timeout=20,
    )
    response.raise_for_status()
    payload = response.json()
    rows = [
        {
            "ts": normalize_ts(item.get("TIME")),
            "mmsi": item.get("MMSI"),
            "lat": item.get("LAT"),
            "lon": item.get("LON"),
            "speed": item.get("SPEED"),
            "course": item.get("COURSE"),
            "ship_name": item.get("NAME"),
        }
        for item in payload
    ]
    frame = pd.DataFrame(rows)
    if not frame.empty:
        write_raw_frame("aishub", frame)
    return frame
