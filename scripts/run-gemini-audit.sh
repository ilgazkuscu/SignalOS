#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ -z "${GEMINI_API_KEY:-}" && -z "${GOOGLE_GENAI_USE_VERTEXAI:-}" && -z "${GOOGLE_GENAI_USE_GCA:-}" ]]; then
  cat >&2 <<'EOF'
Gemini auth is not configured.

Set one of these before running:
  GEMINI_API_KEY
  GOOGLE_GENAI_USE_VERTEXAI
  GOOGLE_GENAI_USE_GCA

Then rerun:
  scripts/run-gemini-audit.sh
EOF
  exit 1
fi

npx -y @google/gemini-cli \
  --skip-trust \
  --output-format text \
  -p "You are Gemini, the visual/UX reviewer for SignalOS.

Review the portfolio presentation using these artifacts:
- Desktop screenshot: docs/gemini-audit-assets/showcase-desktop.png
- Mobile screenshot: docs/gemini-audit-assets/showcase-mobile.png
- Live local route, if available: http://127.0.0.1:3000/showcase
- Relevant source: apps/web/src/app/showcase/page.tsx

Scope: recruiter-first visual and narrative audit as if viewing the page for 15 seconds.

Non-goals:
- Do not edit code.
- Do not change core architecture.
- Do not recommend a normal portfolio grid.
- Do not recommend separate project pages.

Required output:
1. Five highest-impact visual or UX changes.
2. Exact components or sections affected.
3. Acceptance criteria for each recommendation.
4. What should remain unchanged.
5. Desktop and mobile observations."
