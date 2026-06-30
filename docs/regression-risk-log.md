# Regression Risk Log

## Risks
- Dynamic live fetches can create noisy build logs.
- Dashboard feature density can regress readability.
- Live source feed shape can change.
- Next dev cache can occasionally become stale.

## Mitigations
- Tests for service outputs and route rendering.
- `rm -rf apps/web/.next` troubleshooting path documented.
- Fixture fallback for live market/timeline paths.
