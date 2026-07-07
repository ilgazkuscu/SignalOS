# First Agent Tasks

These are ready to paste into GitHub issues. Each task should be run on its own branch and handed off through a pull request.

## Task 1

### Title

Build polished presentation-style slide transitions

### Assigned Agent

Claude Code

### Goal

Improve the presentation-deck feel of the portfolio surface while preserving the current visual identity and product narrative.

### User-Facing Outcome

Visitors can move between project sections with smooth, polished transitions on desktop and mobile, without losing control of scroll behavior.

### Scope

- Full-screen vertical scroll behavior
- Slide transitions
- Desktop interaction
- Mobile touch interaction
- Reduced-motion behavior
- Layout stability on common mobile widths

### Non-Goals

- Do not rewrite project copy.
- Do not change colors, visual identity, or unrelated layout.
- Do not add a normal portfolio grid.
- Do not create separate project pages.
- Do not refactor unrelated app routes.

### Files/Components In Scope

- `apps/web/src/app/showcase/page.tsx`
- `apps/web/src/app/globals.css`, only if transition styling cannot stay local to the showcase route
- Tests under `tests` only if needed for coverage

### Acceptance Criteria

- Smooth project-to-project transitions.
- Touch support on mobile.
- No scroll trapping.
- Layout remains stable on common mobile widths.
- Respects reduced-motion preferences.
- Build passes.

### Validation Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Branch Name

`claude/task-1-slide-transitions`

### Dependencies Or Blockers

- Confirm the active presentation route before editing.
- Coordinate with Codex if accessibility or keyboard behavior files overlap.

### Definition Of Done

- Feature branch opened as a PR.
- Validation results posted in the PR.
- Screenshots or video attached for desktop and mobile behavior.
- Rollback notes included.

## Task 2

### Title

Audit navigation, accessibility, and responsive behavior

### Assigned Agent

Codex

### Goal

Verify that the presentation deck and related navigation behavior remain accessible, predictable, and stable across desktop and mobile.

### User-Facing Outcome

Visitors can navigate the presentation reliably by keyboard, pointer, and touch, with visible focus states and no major accessibility regressions.

### Scope

- Keyboard navigation
- Focus management
- Semantic structure
- Reduced-motion support
- Mobile navigation reliability
- Regression tests or documented manual checks

### Non-Goals

- Do not redesign slides.
- Do not rewrite content.
- Do not change core visual identity.
- Do not edit files owned by an active Claude branch unless coordinated through PR review.

### Files/Components In Scope

- `apps/web/src/app/showcase/page.tsx`
- `apps/web/src/app/globals.css`, only if needed for focus or reduced-motion fixes
- Relevant tests under `tests`
- Review notes in the PR or follow-up issue

### Acceptance Criteria

- Keyboard navigation works predictably.
- Focus state is visible.
- No major accessibility violations introduced.
- Mobile navigation is stable.
- Build and checks pass.

### Validation Commands

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Branch Name

`codex/task-2-accessibility-responsive-audit`

### Dependencies Or Blockers

- Review Claude Task 1 PR first if it is open.
- Work in a separate branch only when file ownership does not overlap, or leave PR comments instead.

### Definition Of Done

- Findings are posted in the Claude PR or a Codex PR.
- Any code changes include validation results.
- Remaining risks are documented with follow-up issues.

## Task 3

### Title

Recruiter-first visual and narrative audit

### Assigned Agent

Gemini

### Goal

Evaluate whether the live portfolio presentation communicates the value of each project quickly to a recruiter.

### User-Facing Outcome

The team receives prioritized visual and UX feedback that can be turned into scoped implementation issues.

### Scope

- Review the live site or screenshots as a recruiter viewing the page for 15 seconds.
- Evaluate desktop and mobile screenshots or preview links.
- Assess visual hierarchy, narrative clarity, and scan speed.

### Non-Goals

- Do not edit code initially.
- Do not change core architecture.
- Do not rewrite the product from scratch.
- Do not recommend a normal portfolio grid or separate project pages.

### Required Output

- Five highest-impact visual or UX changes.
- Exact components or sections affected.
- Acceptance criteria for each recommendation.
- What should remain unchanged.
- Desktop and mobile observations.

### Files/Components In Scope

- Review only unless a follow-up issue explicitly assigns implementation.
- Reference likely affected surfaces such as `apps/web/src/app/showcase/page.tsx` when giving feedback.

### Acceptance Criteria

- Feedback is prioritized from highest to lowest impact.
- Each recommendation includes concrete acceptance criteria.
- Recommendations preserve the vertical presentation-deck model.
- Desktop and mobile observations are both included.

### Validation Commands

No code validation is required for the initial audit. If Gemini is later assigned implementation, use:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Branch Name

`gemini/task-3-recruiter-visual-audit`

### Dependencies Or Blockers

- Needs a deployed preview URL or desktop and mobile screenshots.
- Should review after Task 1 is available in a preview if possible.

### Definition Of Done

- Written audit is posted as a GitHub issue comment or review artifact.
- Follow-up implementation issues are created for accepted recommendations.

