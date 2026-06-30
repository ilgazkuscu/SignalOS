"""Immutable JSONL snapshot store for model research data."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable


class HistoricalSnapshotStore:
    """Append-only local snapshot store for contracts, news, or macro series."""

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)

    def append(self, snapshot: dict[str, object]) -> None:
        if "timestamp" not in snapshot:
            snapshot = {**snapshot, "timestamp": datetime.now(timezone.utc).isoformat()}
        with self.path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(snapshot, sort_keys=True) + "\n")

    def load_all(self) -> list[dict[str, object]]:
        if not self.path.exists():
            return []
        with self.path.open("r", encoding="utf-8") as handle:
            return [json.loads(line) for line in handle if line.strip()]

    def extend(self, snapshots: Iterable[dict[str, object]]) -> None:
        for snapshot in snapshots:
            self.append(snapshot)
