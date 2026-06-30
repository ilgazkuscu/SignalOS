# Developer Checklist

## Before Editing

- Confirm whether the change touches model logic, live adapters, UI rendering, or docs.
- Preserve fixture mode and fallback behavior unless the task explicitly changes it.
- Keep simulated, heuristic, or provisional outputs clearly labeled.

## Before Handoff

- Run `make validate`.
- If only editing docs, at minimum run `npm run lint` and `npm run typecheck` when practical.
- Update `docs/final-validation.md` with real pass/fail results after major repo-wide passes.
- Avoid claiming real historical calibration unless persisted outcomes and market histories are actually present.

Before handing off changes:

- Run `npm run typecheck`
- Run `npm test`
- Run `npm run build`
- Run `npm run benchmark` when changing clustering/decision transforms
- Verify simulated/fixture outputs remain labeled
- Verify source coverage links still render or degrade gracefully
- Update docs when changing data contracts or formulas
