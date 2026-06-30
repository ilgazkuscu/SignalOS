- Add a lightweight route or UI smoke test for the dashboard live-ingestion panel and `/api/timeline/health`.
  The core behavior is now implemented and validated at the service layer; the next useful guardrail is proving the operator-facing health surfaces render and stay wired correctly.
  Expected files: `tests/integration/routes.test.ts`, `apps/web/src/app/api/timeline/health/route.ts`, possibly a small UI test file
  Acceptance condition: an automated test confirms the health API shape and at least one operator-facing view exposes the expected health fields.
