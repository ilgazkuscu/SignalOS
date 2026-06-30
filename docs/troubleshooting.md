# Troubleshooting

## Browser Shows a Chunk Loading Error

Stop the dev server, remove the stale Next build cache, and restart:

```bash
rm -rf apps/web/.next
./run.sh
```

## `npm run lint` Fails Before Checking Files

The repo now includes `eslint.config.mjs` for ESLint 9. If this regresses, check that the root config still exists and that `eslint-config-next` is installed.

## Build Logs Dynamic Server Usage

Some pages fetch live Polymarket data with no-store/revalidate-zero behavior. During `next build`, Next can log dynamic usage and then mark those routes dynamic. This is acceptable only if the build exits successfully.

## Port Already in Use

Use `./run.sh`; it finds the next open port and opens the browser automatically.

## Stale Next chunk error

```bash
rm -rf apps/web/.next
./run.sh
```

## Port already in use
`run.sh` finds the next available port automatically.

## Live fetch warnings in build
Expected when live Polymarket requests are attempted during static generation. Build still succeeds and routes are marked dynamic.

## Node missing
If using Homebrew Node on Apple Silicon:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
```
