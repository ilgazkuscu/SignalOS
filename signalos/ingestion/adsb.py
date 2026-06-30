from __future__ import annotations

import asyncio
from typing import Iterable

import httpx
import pandas as pd

from signalos.config import AIRBASES, CALLSIGN_PATTERNS
from signalos.ingestion.common import normalize_ts, write_raw_frame


ADSB_FI_URL = "https://opendata.adsb.fi/api/v3/lat/{lat}/lon/{lon}/dist/150"


def _normalize_aircraft(records: Iterable[dict], base: str) -> pd.DataFrame:
    rows: list[dict] = []
    for item in records:
        callsign = (item.get("flight") or item.get("callsign") or "").strip()
        db_flags = int(item.get("dbFlags") or 0)
        is_military = bool(db_flags & 1) or bool(CALLSIGN_PATTERNS.match(callsign))
        if not is_military:
            continue
        rows.append(
            {
                "ts": normalize_ts(item.get("seen") or item.get("ts")),
                "hex": (item.get("hex") or "").lower(),
                "callsign": callsign,
                "lat": item.get("lat"),
                "lon": item.get("lon"),
                "alt": item.get("alt_baro") or item.get("altitude"),
                "speed": item.get("gs") or item.get("speed"),
                "icao_base": base,
                "source": item.get("source", "adsb"),
            }
        )
    return pd.DataFrame(rows)


async def fetch_adsb_fi_base(icao: str) -> pd.DataFrame:
    lat, lon = AIRBASES[icao]
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get(ADSB_FI_URL.format(lat=lat, lon=lon))
        response.raise_for_status()
        await asyncio.sleep(1.0)
    payload = response.json()
    frame = _normalize_aircraft(payload.get("ac", []), icao)
    if not frame.empty:
        write_raw_frame("adsb_fi", frame)
    return frame


async def fetch_adsb_lol_mil() -> pd.DataFrame:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get("https://api.adsb.lol/v2/mil")
        response.raise_for_status()
    payload = response.json()
    frame = _normalize_aircraft(payload.get("ac", []), "GLOBAL")
    if not frame.empty:
        write_raw_frame("adsb_lol", frame)
    return frame


async def fetch_airplanes_live_mil() -> pd.DataFrame:
    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.get("https://api.airplanes.live/v2/mil")
        response.raise_for_status()
    payload = response.json()
    frame = _normalize_aircraft(payload.get("ac", []), "GLOBAL")
    if not frame.empty:
        write_raw_frame("airplanes_live", frame)
    return frame


def combine_with_majority_vote(dfs: Iterable[pd.DataFrame]) -> pd.DataFrame:
    prepared: list[pd.DataFrame] = []
    for frame in dfs:
        if frame is None or frame.empty:
            continue
        copy = frame.copy()
        copy["ts_bucket"] = pd.to_datetime(copy["ts"], utc=True).dt.floor("10s")
        prepared.append(copy)
    if not prepared:
        return pd.DataFrame(columns=["ts", "hex", "callsign", "lat", "lon", "alt", "speed", "icao_base"])
    merged = pd.concat(prepared, ignore_index=True)
    counts = (
        merged.groupby(["hex", "ts_bucket"], dropna=False)["source"]
        .nunique()
        .rename("source_votes")
        .reset_index()
    )
    voted = merged.merge(counts, on=["hex", "ts_bucket"], how="left")
    voted = voted[voted["source_votes"] >= 2].sort_values(["hex", "ts_bucket", "source_votes"])
    voted = voted.drop_duplicates(subset=["hex", "ts_bucket"], keep="last")
    return voted.drop(columns=["ts_bucket", "source_votes"]).reset_index(drop=True)
