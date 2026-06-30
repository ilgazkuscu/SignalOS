"""Utilities for loading and querying the political variable registry."""

from __future__ import annotations

import json
from pathlib import Path


def load_variable_registry(path: str | Path | None = None) -> dict[str, object]:
    registry_path = Path(path) if path else Path(__file__).resolve().parents[1] / "data" / "variable_registry.json"
    with registry_path.open("r", encoding="utf-8") as handle:
        return json.load(handle)


def get_columns_for_model(model_name: str) -> list[str]:
    registry = load_variable_registry()
    columns: list[str] = []
    for construct in registry["constructs"]:
        for column in construct["columns"]:
            if model_name in column["models"]:
                columns.append(column["name"])
    return columns
