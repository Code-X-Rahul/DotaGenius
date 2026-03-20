#!/bin/bash
# Start the BullMQ replay pipeline worker.
# Requires Redis to be running (see docker compose up -d).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_DIR"
exec npx tsx src/workers/replay-worker.ts
