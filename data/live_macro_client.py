"""Live macro series client for the Python quant runner."""

from __future__ import annotations

import csv
import io
from dataclasses import dataclass
from urllib.request import Request, urlopen


@dataclass(frozen=True)
class LiveMacroPoint:
    oil_price: float
    bond_yield: float
    usd_index: float
    observed_at: str


FRED_SERIES = {
    "bond_yield": "DGS10",
    "oil_price": "DCOILWTICO",
    "usd_index": "DTWEXBGS",
}


def parse_fred_csv(csv_text: str) -> list[tuple[str, float]]:
    rows: list[tuple[str, float]] = []
    reader = csv.DictReader(io.StringIO(csv_text))
    value_field = reader.fieldnames[1] if reader.fieldnames and len(reader.fieldnames) > 1 else None
    if not value_field:
        return rows
    for row in reader:
        value = row.get(value_field, "")
        if value in ("", ".", None):
            continue
        rows.append((str(row["DATE"]), float(value)))
    return rows


def _fetch_fred_series(series_id: str, timeout_seconds: float = 8.0) -> list[tuple[str, float]]:
    request = Request(
        url=f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}",
        headers={"User-Agent": "ProjectZero/1.0 quant-runner", "Accept": "text/csv"},
    )
    with urlopen(request, timeout=timeout_seconds) as response:
        csv_text = response.read().decode("utf-8")
    return parse_fred_csv(csv_text)


def fetch_live_macro_series(timeout_seconds: float = 8.0) -> list[dict[str, float]]:
    oil = _fetch_fred_series(FRED_SERIES["oil_price"], timeout_seconds=timeout_seconds)
    rates = _fetch_fred_series(FRED_SERIES["bond_yield"], timeout_seconds=timeout_seconds)
    usd = _fetch_fred_series(FRED_SERIES["usd_index"], timeout_seconds=timeout_seconds)

    if len(oil) < 2 or len(rates) < 2 or len(usd) < 2:
        raise ValueError("Insufficient live macro history")

    return [
        {"oil_price": oil[-2][1], "bond_yield": rates[-2][1], "usd_index": usd[-2][1]},
        {"oil_price": oil[-1][1], "bond_yield": rates[-1][1], "usd_index": usd[-1][1]},
    ]
