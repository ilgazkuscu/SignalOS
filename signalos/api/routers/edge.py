from __future__ import annotations

from fastapi import APIRouter, HTTPException

from signalos.api.deps import market_payload


router = APIRouter()


@router.get("/markets")
async def get_markets() -> list[dict]:
    return await market_payload()


@router.get("/{token_id}")
async def get_market(token_id: str) -> dict:
    markets = await market_payload()
    for market in markets:
        if market["token_id"] == token_id:
            return market
    raise HTTPException(status_code=404, detail="Market not found")
