# Multi-Agent Workflow

Use GitHub issues and pull requests as the handoff system between Claude Code, Codex, and Gemini. One branch should be merged at a time, after the relevant build, lint, typecheck, and tests pass.

## 1. Create The GitHub Issue

Every task starts as a GitHub issue with:

- Goal
- User-facing outcome
- Scope
- Non-goals
- Files or components likely affected
- Acceptance criteria
- Definition of done
- Validation commands
- Branch name
- Assigned agent
- Dependencies or blockers

The issue should also name ownership boundaries so two agents do not edit the same files at the same time.

## 2. Claude Code Implements

Claude Code is the primary builder. It works on a feature branch or Git worktree, implements the issue, runs validation, and opens a PR.

Claude should avoid unrelated refactors and preserve the current stack, folder structure, visual design, and deployed behavior unless the issue explicitly scopes a change.

## 3. Codex Reviews Or Works Separately

Codex reviews the Claude PR for correctness, test coverage, debugging, accessibility, performance, edge cases, and regression risk.

Codex may work in a separate branch only when file ownership is non-overlapping or the issue explicitly assigns Codex implementation. If Codex needs to edit the same files as Claude, coordinate through PR review comments or a follow-up issue instead of racing branches.

## 4. Gemini Audits Preview Or Screenshots

Gemini reviews the deployed preview or screenshots and returns prioritized visual and UX feedback.

Gemini should focus on:

- Visual hierarchy
- UX flow
- Copy clarity
- Recruiter-first comprehension
- Responsive behavior
- Screenshot-based issues

Gemini should not edit core architecture unless explicitly assigned.

## 5. Merge One Branch At A Time

Only one branch is merged at a time. Before merge:

- Build and required checks pass.
- Codex review is resolved.
- Gemini feedback is either addressed, deferred to a follow-up issue, or marked out of scope.
- The PR includes rollback notes.

## 6. Pull Requests Are The Handoff

Each PR must include:

- What changed
- Why
- Screenshots or video if UI changed
- Testing completed
- Accessibility and performance impact
- Known limitations
- Reviewer checklist

After merge, close the issue or open follow-up issues for deferred work.

