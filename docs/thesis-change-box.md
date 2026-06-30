# Thesis Change Box

## Purpose

The thesis change box answers one pressure-tested question:

> What would make this trade better, worse, or invalid?

## Fields

- `bullishCatalyst`
- `bearishCatalyst`
- `wordingCatalyst`
- `invalidation`
- `provisional`

## Generation logic

The box is generated from structured source events and current belief decomposition.

- bullish catalyst comes from the latest de-escalatory / diplomacy-supportive event
- bearish catalyst comes from escalation or readiness signals
- wording catalyst comes from official-language or resolution-sensitive events
- invalidation is derived from the current weak point in the decomposition

## Fallback behavior

If structured evidence is too thin, the box shows:

`Insufficient structured evidence — thesis box is provisional.`

## Example

- Bullish catalyst: Muscat talks scheduled
- Bearish catalyst: forces remain ready / renewed strike package
- Wording catalyst: White House says operations have concluded
- Invalidation: wording stays ambiguous while readiness language persists
