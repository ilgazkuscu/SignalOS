# Known Limitations

## Data and Calibration

- Narrative trend velocity is heuristic. It is useful for prioritization, but it is not yet calibrated against realized market moves.
- Cluster confidence uses source count, confidence, relevance, and novelty. It does not yet include a full source-by-source credibility model.
- Live feed coverage depends on lawful machine-readable feeds and reachable article pages; some publishers can block article hydration.
- Backtest and performance layers remain partially fixture/simulation-backed unless real persisted outcomes are added.

## Product Interpretation

- Early signals are intentionally speculative. They should trigger attention, not automatic trading.
- Confirmed narratives can still be late if markets have already repriced.
- The app is a decision-support and research tool, not financial advice.

- Real trade/outcome persistence is not implemented.
- Calibration is fixture/simulation-backed.
- Liquidity is a proxy, not order-book depth.
- Timeline clustering is normalized-title based, not semantic embeddings.
- Live feeds are public-feed dependent.
- Dashboard is large and should be split as the product grows.
