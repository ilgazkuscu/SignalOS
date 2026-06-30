import pandas as pd

from signalos.polymarket.edge import compute_edge
from signalos.polymarket.sizing import kelly_size


def test_compute_edge_liquidity() -> None:
    result = compute_edge(0.7, 0.5, 0.02, 2_000_000)
    assert result["tradeable"] is True
    assert result["edge"] > 0


def test_kelly_size_non_negative() -> None:
    assert kelly_size(0.1, 0.5, 10_000, 1_000_000) > 0
