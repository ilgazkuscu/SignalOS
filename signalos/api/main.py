from __future__ import annotations

from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from signalos.api.deps import current_phase_payload, market_payload
from signalos.api.routers import backtest, current_phase, edge
from signalos.alerts.discord import send_discord_alert
from signalos.alerts.telegram import send_telegram_alert


last_phase = {"value": 0, "posterior": [1, 0, 0, 0, 0, 0]}


async def _alert_tick() -> None:
    payload = current_phase_payload()
    delta = payload["posterior"][payload["phase"]] - last_phase["posterior"][last_phase["value"]]
    if payload["phase"] > last_phase["value"] and delta >= 0.15:
        markets = await market_payload()
        changed = {
            key: value for key, value in payload["features"].items() if key in {"p3_trigger", "p4_trigger", "tanker_sortie_z"}
        }
        send_discord_alert(payload["phase"], changed, markets)
        await send_telegram_alert(payload["phase"], changed, markets)
    last_phase["value"] = payload["phase"]
    last_phase["posterior"] = payload["posterior"]


@asynccontextmanager
async def lifespan(_: FastAPI):
    scheduler = AsyncIOScheduler()
    scheduler.add_job(_alert_tick, "interval", minutes=5)
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="SignalOS Iran Phase Detector", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:3001",
        "http://localhost:3001",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(current_phase.router, prefix="/current_phase", tags=["current_phase"])
app.include_router(edge.router, prefix="/edge", tags=["edge"])
app.include_router(backtest.router, prefix="/backtest", tags=["backtest"])
