# Failure Modes

- Live market fetch fails: fallback to cache/fixtures.
- Live timeline feed fails: source coverage marks feed error.
- Source URL missing: UI renders no-link fallback.
- Next dev cache stale: clear `.next`.
- Calibration misleading: data quality labeled `fixture_simulated`.
