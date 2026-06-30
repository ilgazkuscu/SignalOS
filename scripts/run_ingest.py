from __future__ import annotations

import argparse
import asyncio
from pathlib import Path
import sys

from apscheduler.schedulers.asyncio import AsyncIOScheduler

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from signalos.features.pipeline import build_all
from signalos.ingestion.adsb import fetch_adsb_fi_base, fetch_adsb_lol_mil, fetch_airplanes_live_mil
from signalos.ingestion.dod_rss import fetch_centcom_press, fetch_dod_rss
from signalos.ingestion.iran_media import fetch_iran_media
from signalos.ingestion.news_rss import fetch_news_rss
from signalos.ingestion.polymarket import PolymarketClient
from signalos.ingestion.state_dept import fetch_state_dept


async def ingest_once() -> None:
    await asyncio.gather(
        fetch_adsb_fi_base("FJDG"),
        fetch_adsb_lol_mil(),
        fetch_airplanes_live_mil(),
        fetch_state_dept(),
        fetch_dod_rss(),
        fetch_centcom_press(),
        fetch_news_rss(),
        fetch_iran_media(),
        PolymarketClient().discover_iran_markets(),
    )
    build_all()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--once", action="store_true")
    parser.add_argument("--loop", action="store_true")
    args = parser.parse_args()

    if args.once:
        asyncio.run(ingest_once())
        return

    async def runner() -> None:
        scheduler = AsyncIOScheduler()
        scheduler.add_job(ingest_once, "interval", minutes=15)
        scheduler.start()
        await ingest_once()
        while True:
            await asyncio.sleep(3600)

    asyncio.run(runner())


if __name__ == "__main__":
    main()
