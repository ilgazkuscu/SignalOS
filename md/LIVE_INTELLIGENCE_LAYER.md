# Live Intelligence Layer

This folder documents the live information pipeline that sits on top of the fixture-first analyst workbench.

## What it does

The live intelligence layer supplements the seeded demo model with:

- live Polymarket market prices
- live newspaper and strategic-analysis feeds
- headline and article-context classification
- catalyst ranking
- thresholded alerts

## Why it exists

The fixture model is useful for deterministic demos and replay. The live layer exists so the product can become decision-relevant in real time without discarding the transparent belief engine.

## Current live sources

- New York Times World
- Wall Street Journal World
- BBC World
- Financial Times World
- Foreign Affairs
- Atlantic Council

These sources are filtered for Iran-resolution relevance before they are allowed to influence the model.

## How article parsing works

For a limited number of the most recent feed entries, the app:

1. reads the RSS item
2. follows the article link
3. extracts meta description plus lead paragraphs
4. identifies a key quote when possible
5. classifies the article into one of:
   - `resolution_wording`
   - `force_posture`
   - `diplomatic_channel`
   - `proxy_escalation`
   - `strategic_analysis`
   - `ambient_news`

The resulting enriched event becomes eligible for:

- timeline display
- catalyst feed inclusion
- low-confidence derived signal generation
- alert generation

## Guardrails

- Live article-derived signals have short half-lives.
- They carry lower confidence than official or directly structured inputs.
- They are meant to accelerate catalyst detection, not to replace direct official-source parsing.
- Alert thresholds are configurable and intentionally conservative.

## Known limits

- Current parsing is article-context aware, but not a full semantic parser of entire article bodies.
- Source availability depends on public feed stability and lawful access.
- Some premium or restricted outlets may require future connector work instead of direct feed ingestion.
