# Environment Variables

- `DATABASE_URL`
  PostgreSQL connection string for future persistent mode.

- `NEXT_PUBLIC_APP_NAME`
  Public app label for UI use.

- `APP_ENV`
  Environment marker such as `local`, `staging`, or `production`.

- `FIXTURE_MODE`
  When `true`, the app should stay in offline fixture-backed mode.

## Recommended Local Values

- `APP_ENV=local`
- `FIXTURE_MODE=true`

## Behavior Notes

- Fixture mode is the default expected development path.
- Prisma client generation works without switching the runtime away from fixture mode.
- Live database reads are intentionally not enabled yet through the repository layer.
