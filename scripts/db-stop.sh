#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_BIN="/usr/lib/postgresql/18/bin"
DATA_DIR="$ROOT_DIR/.postgres/data"
LOG_FILE="$ROOT_DIR/.postgres/logfile"

"$PG_BIN/pg_ctl" -D "$DATA_DIR" -l "$LOG_FILE" stop || true
echo "PostgreSQL stopped."
