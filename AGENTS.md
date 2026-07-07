# Agent Operating Guide

This repository is a portfolio and product-demo workspace for SignalOS / ProjectZero. The current portfolio surface behaves like a vertical presentation deck: each full-screen scroll section is one project or narrative unit, with no normal portfolio grid and no separate project pages. Preserve the existing stack, folder structure, visual design, and deployed behavior unless a GitHub issue explicitly scopes a change.

## Required First Steps

- Read `README.md`, `docs/architecture.md`, `docs/agent-workflow.md`, and any issue-specific docs before editing.
- Inspect the current branch and working tree with `git status --short --branch`.
- Work only on a dedicated branch or Git worktree. Do not work directly on `main`.
- Do not merge directly into `main`; use GitHub pull requests as the handoff and review system.
- Respect ownership boundaries in the issue to avoid merge conflicts with other agents.

## Repository Guardrails

- Do not edit unrelated files.
- Do not make product UI, copy, route, or behavior changes unless the assigned issue explicitly asks for them.
- Do not add dependencies unless required, justified in the PR, and covered by validation.
- Never place secrets, API keys, tokens, or live credentials in the repository.
- Preserve the presentation-deck model for portfolio work: full-screen sections, understandable in one screen, no project grid, no separate project detail pages.
- Keep source-backed claims honest. If data, provenance, replay wiring, or API access is missing, document the limitation instead of inventing output.

## Agent Responsibilities

### Claude Code

- Primary builder for feature implementation, architecture changes, and refactors.
- Owns scoped code changes when the issue involves component structure, route behavior, state flow, engine logic, or larger implementation work.
- Must keep changes branch-scoped and open a PR for Codex and, when UI is affected, Gemini review.

### Codex

- Engineering reviewer and tester.
- Focuses on code review, test coverage, debugging, accessibility, performance, edge cases, and regression risk.
- May implement fixes in a separate branch only when file ownership is non-overlapping or the issue explicitly assigns Codex implementation.
- Should leave inline PR comments or follow-up issues for concerns outside the current scope.

### Gemini

- Visual and UX reviewer.
- Focuses on visual hierarchy, UX flow, copy clarity, screenshot-based feedback, responsive design, and recruiter-first comprehension.
- Should review the deployed preview or screenshots and return prioritized feedback.
- Should not edit core architecture unless explicitly assigned.

## Validation Expectations

Run the relevant checks before finishing. For this repo, start from:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

For a fuller local confidence pass, use:

- `npm run maint:check`
- `make validate`

If a command is skipped or fails because of an environment limitation, document the exact reason in the PR.

## Completion Summary

Every agent handoff or PR must summarize:

- Changed files
- Validation performed
- Known limitations or skipped checks
- Accessibility and performance impact when UI is touched
- Rollback notes
- Dependency changes, if any

