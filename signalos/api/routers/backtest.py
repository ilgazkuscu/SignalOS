from __future__ import annotations

from fastapi import APIRouter

from signalos.api.deps import backtest_payload


router = APIRouter()


@router.get("/loo")
def get_loo() -> dict:
    return backtest_payload()["loo"]


@router.get("/midnight_hammer")
def get_midnight_hammer() -> dict:
    return backtest_payload()["midnight_hammer"]
