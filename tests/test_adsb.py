import pandas as pd

from signalos.ingestion.adsb import combine_with_majority_vote


def test_combine_with_majority_vote() -> None:
    df1 = pd.DataFrame([{"ts": "2026-01-01T00:00:00Z", "hex": "abc", "source": "a"}])
    df2 = pd.DataFrame([{"ts": "2026-01-01T00:00:05Z", "hex": "abc", "source": "b"}])
    merged = combine_with_majority_vote([df1, df2])
    assert len(merged) == 1
