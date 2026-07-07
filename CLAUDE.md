# Claude Code Instructions

Claude Code is the primary builder for this repository. Implement only the work assigned by the GitHub issue and keep the portfolio presentation-deck behavior intact unless the issue explicitly says otherwise.

## Before Editing

1. Read `README.md`, `AGENTS.md`, `docs/architecture.md`, and `docs/agent-workflow.md`.
2. Read the assigned issue, including goal, scope, non-goals, files in scope, acceptance criteria, validation commands, branch name, dependencies, and blockers.
3. Confirm the repository state with `git status --short --branch`.
4. Work on a dedicated branch or Git worktree. Do not commit directly to `main`.

## Build Rules

- Preserve the existing stack: Next.js App Router, React, TypeScript, Tailwind CSS, Prisma schema, fixture-backed development, and Vitest tests.
- Keep the portfolio surface presentation-style: full-screen vertical sections, one project understandable per screen, no normal portfolio grid, no separate project pages.
- Do not edit unrelated files.
- Do not add dependencies unless the issue requires it and the PR explains why.
- Never commit secrets, API keys, `.env` values, or private credentials.
- Respect file ownership listed in the issue to avoid conflicts with Codex or Gemini branches.

## Handoff Requirements

Before opening a PR, run the issue's validation commands. If none are listed, use:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

The PR must include:

- What changed and why
- Files changed
- Screenshots or video for UI changes
- Testing completed
- Known limitations
- Rollback notes
- Any dependency or migration impact

Request Codex review for engineering correctness and Gemini review when the change affects layout, visuals, copy, motion, or responsive behavior.

