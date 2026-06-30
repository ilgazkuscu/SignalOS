# Performance Audit

## Reviewed
- Event clustering
- Decision pipeline
- Dashboard render derivations
- Live timeline polling

## Findings
- Current fixture dataset is small; performance risk is future live scale.
- Event clustering and decision pipeline are cheap today but now have benchmark coverage.
- Dashboard computes some derived arrays in render; acceptable for now but should move into section components if data grows.
- Shared source URL/domain extraction avoids duplicate parsing logic in clustering and Signal Explorer rendering.

## Bottlenecks to watch
- Article parsing/fetching
- Full timeline clustering once event count grows
- Dashboard rerender from polling updates

## Latest Smoke Benchmark

From the latest `make validate` run:

- `clusterSourceEvents x1000`: 77.13ms
- `decisionPipeline x1000`: 124.11ms

The numbers should be treated as local smoke measurements only. Add larger synthetic source-event corpora before using them as scale thresholds.
