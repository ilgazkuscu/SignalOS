# Config and Env

Key env vars are documented in `.env.example`.

## Important groups
- Polymarket live market controls
- Timeline live source controls
- Fixture mode
- Database URL

## Rule
Do not silently imply live data when source is fixture/cache/simulated. Surface source labels in UI.
