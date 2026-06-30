#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required but was not found in PATH."
  echo "If you installed Homebrew Node 20 on Apple Silicon, try:"
  echo '  export PATH="/opt/homebrew/opt/node@20/bin:$PATH"'
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required but was not found in PATH."
  exit 1
fi

echo "Using node $(node -v)"
echo "Using npm $(npm -v)"

if [ ! -d node_modules ]; then
  echo "Installing dependencies..."
  npm install
fi

echo "Generating Prisma client..."
npm run db:generate

echo "Tip: run 'npm run news:poll' for one ingestion cycle or 'npm run news:loop' for a local live loop."

find_open_port() {
  local port="$1"
  while lsof -iTCP:"$port" -sTCP:LISTEN >/dev/null 2>&1; do
    port=$((port + 1))
  done
  echo "$port"
}

PORT_TO_USE="$(find_open_port 3000)"

echo "Starting development server on http://localhost:${PORT_TO_USE}"
(
  sleep 4
  open "http://localhost:${PORT_TO_USE}" >/dev/null 2>&1 || true
) &

echo "Starting development server..."
cd apps/web
exec npx next dev -p "$PORT_TO_USE"
