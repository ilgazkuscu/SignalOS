from __future__ import annotations

from functools import lru_cache
from pathlib import Path
import re

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
FEATURE_DIR = DATA_DIR / "features"
LABEL_DIR = DATA_DIR / "labels"
MODEL_DIR = DATA_DIR / "models"


AIRBASES = {
    "KSZL": (38.7303, -93.5479),
    "FJDG": (-7.31, 72.41),
    "OTBH": (25.1173, 51.3149),
    "OEPS": (24.0627, 47.5805),
    "OMFJ": (24.2482, 54.5475),
    "EGVA": (51.6822, -1.79),
    "EGUN": (52.3619, 0.4864),
    "LGSA": (35.5317, 24.1497),
    "LTAG": (37.0021, 35.4259),
    "OKBK": (29.2467, 47.5208),
    "LCRA": (34.5905, 32.9878),
}

CALLSIGN_PATTERNS = re.compile(
    r"^(REACH|RCH|BISON|DOOM|CHAOS|GOLD|PACK|QUID|SHELL|ESSO|SPAR|PAT|MAGMA|"
    r"KNIFE|CONVOY|HOMER|WHIP|MAJIK|GOAT|BATT|MYTEE|NITRO|PITCH|ABBA)"
)

MMSI_WATCHLIST = [
    369970343,
    368151000,
    369970203,
    369970030,
]

HISTORICAL_OPERATIONS = [
    {"name": "desert_storm", "d_day": "1991-01-17", "type": "invasion"},
    {"name": "desert_fox", "d_day": "1998-12-16", "type": "strike"},
    {"name": "enduring_freedom", "d_day": "2001-10-07", "type": "invasion"},
    {"name": "iraqi_freedom", "d_day": "2003-03-19", "type": "invasion"},
    {"name": "odyssey_dawn", "d_day": "2011-03-19", "type": "strike"},
    {"name": "syria_2017", "d_day": "2017-04-07", "type": "strike"},
    {"name": "syria_2018", "d_day": "2018-04-14", "type": "strike"},
    {"name": "soleimani", "d_day": "2020-01-03", "type": "strike"},
    {"name": "midnight_hammer", "d_day": "2025-06-22", "type": "strike"},
    {"name": "epic_fury", "d_day": "2026-02-28", "type": "strike"},
]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    copernicus_client_id: str = Field(default="", alias="COPERNICUS_CLIENT_ID")
    copernicus_client_secret: str = Field(default="", alias="COPERNICUS_CLIENT_SECRET")
    opensky_client_id: str = Field(default="", alias="OPENSKY_CLIENT_ID")
    opensky_client_secret: str = Field(default="", alias="OPENSKY_CLIENT_SECRET")
    faa_api_key: str = Field(default="", alias="FAA_API_KEY")
    eia_api_key: str = Field(default="", alias="EIA_API_KEY")
    aisstream_api_key: str = Field(default="", alias="AISSTREAM_API_KEY")
    x_api_bearer: str = Field(default="", alias="X_API_BEARER")
    discord_webhook: str = Field(default="", alias="DISCORD_WEBHOOK")
    telegram_bot_token: str = Field(default="", alias="TELEGRAM_BOT_TOKEN")
    telegram_chat_id: str = Field(default="", alias="TELEGRAM_CHAT_ID")
    polymarket_pk: str = Field(default="", alias="POLYMARKET_PK")
    database_url: str = Field(default="duckdb:///data/signalos.db", alias="DATABASE_URL")
    bankroll_usd: float = Field(default=10_000.0, alias="BANKROLL_USD")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    for path in (RAW_DIR, FEATURE_DIR, LABEL_DIR, MODEL_DIR):
        path.mkdir(parents=True, exist_ok=True)
    return Settings()
