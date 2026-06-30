from __future__ import annotations

from fastapi import APIRouter

from signalos.api.deps import current_phase_payload, model_metadata_payload


router = APIRouter()


@router.get("/")
def get_current_phase() -> dict:
    return current_phase_payload()


@router.get("/signals")
def get_signals() -> list[dict]:
    payload = current_phase_payload()
    features = payload["features"]
    signals = []
    for key in ["p3_trigger", "p4_trigger", "ordered_departure_iraq", "trump_two_weeks_pattern", "israeli_activity_spike"]:
        if features.get(key):
            signals.append({"signal": key, "value": features[key]})
    return signals


@router.get("/model")
def get_model_metadata() -> dict:
    return model_metadata_payload()


@router.get("/bundle")
def get_current_phase_bundle() -> dict:
    return {
        "phase": current_phase_payload(),
        "model": model_metadata_payload(),
    }
