#!/usr/bin/env bash
set -euo pipefail

PYTHON_BIN="${PYTHON_BIN:-python3}"
exec "$PYTHON_BIN" -m app.server --host "${FINGUARD_HOST:-127.0.0.1}" --port "${FINGUARD_PORT:-8765}"
