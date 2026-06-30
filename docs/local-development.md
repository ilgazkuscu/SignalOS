# Local Development

## Quick start

```bash
./run.sh
```

The script checks Node/npm, installs dependencies if needed, generates Prisma client, finds an open port, starts Next, and opens the browser.

## Manual validation

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run benchmark
```

Or run the full recipe:

```bash
make validate
```

## Notes
This folder is not currently a Git repository. Use extra care with destructive commands.
