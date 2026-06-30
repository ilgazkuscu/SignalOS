# Testing Guide

## Run tests

```bash
npm test
```

## Test types
- Unit tests for classifiers, decision engines, clustering, EV, regime, wording risk
- Integration tests for API/service payloads and route render sanity
- UI component test for Signal Explorer degraded fetch path

## Add tests when
- changing formulas
- changing source clustering
- adding fields to dashboard payload
- changing live fallback behavior
