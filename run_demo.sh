#!/usr/bin/env bash
set -euo pipefail

PYTHON_BIN="${PYTHON_BIN:-python3}"
"$PYTHON_BIN" -c 'import sys; sys.exit("FinGuard requires Python 3.12 or newer") if sys.version_info < (3, 12) else None'
exec "$PYTHON_BIN" -m app.server --host "${FINGUARD_HOST:-127.0.0.1}" --port "${FINGUARD_PORT:-8765}"
