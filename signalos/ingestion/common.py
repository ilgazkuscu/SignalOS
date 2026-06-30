from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
import json

import pandas as pd

from signalos.config import RAW_DIR


def utc_now() -> datetime:
    return datetime.now(UTC)


def normalize_ts(value: str | int | float | None) -> pd.Timestamp:
    if value is None:
        return pd.Timestamp.utcnow()
    return pd.to_datetime(value, utc=True)


def write_raw_frame(source: str, frame: pd.DataFrame, stamp: datetime | None = None) -> Path:
    stamp = stamp or utc_now()
    target_dir = RAW_DIR / source
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{stamp:%Y-%m-%d}.parquet"
    frame.to_parquet(target, index=False)
    return target


def write_raw_json(source: str, payload: object, stamp: datetime | None = None) -> Path:
    stamp = stamp or utc_now()
    target_dir = RAW_DIR / source
    target_dir.mkdir(parents=True, exist_ok=True)
    target = target_dir / f"{stamp:%Y-%m-%d}.json"
    target.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return target
