# Validation Playbook

## Full Local Pass

Run:

```bash
make validate
```

This executes:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run benchmark`

## Interpreting Expected Noise

- Vitest can print a Vite CJS deprecation warning.
- The live-market fallback test intentionally logs a mocked error.
- `next build` can print dynamic-route fallback messages for live Polymarket fetches, then still pass. Treat this as acceptable only when the command exits with status 0.

## Before Shipping a Modeling Change

- Run `npm test` and inspect decision/scoring tests.
- Run `npm run benchmark` if the change touches source clustering, decision analytics, replay, or dashboard aggregation.
- Update the relevant docs under `docs/` when formulas, labels, or assumptions change.

## Standard

```bash
npm run typecheck && npm test && npm run build
```

## Extended

```bash
npm run benchmark
```

## Manual smoke
- `/` dashboard
- `/timeline` executive brief/source coverage
- `/signals` grouped signal coverage
- `/playbook` onboarding
- `/model` model explanation
