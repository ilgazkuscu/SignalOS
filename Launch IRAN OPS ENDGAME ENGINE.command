#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"

cd "$ROOT_DIR"
exec ./run.sh
