#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PG_BIN="/usr/lib/postgresql/18/bin"
DATA_DIR="$ROOT_DIR/.postgres/data"
LOG_FILE="$ROOT_DIR/.postgres/logfile"
SOCKET_DIR="$ROOT_DIR/.postgres/sockets"

mkdir -p "$SOCKET_DIR"

if [ ! -d "$DATA_DIR/PG_VERSION" ]; then
  echo "Initializing PostgreSQL data directory..."
  "$PG_BIN/initdb" -D "$DATA_DIR" -U dice_user \
    --auth-local=trust --auth-host=scram-sha-256 --encoding=UTF8

  if ! grep -q "unix_socket_directories = '$SOCKET_DIR'" "$DATA_DIR/postgresql.conf"; then
    sed -i "s|#unix_socket_directories = '/var/run/postgresql'|unix_socket_directories = '$SOCKET_DIR'|" \
      "$DATA_DIR/postgresql.conf"
  fi
fi

echo "Starting PostgreSQL..."
"$PG_BIN/pg_ctl" -D "$DATA_DIR" -l "$LOG_FILE" start

sleep 2

export PGHOST="$SOCKET_DIR"
psql -U dice_user -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='dice_db'" | grep -q 1 || \
  psql -U dice_user -d postgres -c "CREATE DATABASE dice_db OWNER dice_user;"

psql -U dice_user -d postgres -c "ALTER USER dice_user WITH PASSWORD 'password';" >/dev/null

echo "PostgreSQL ready on localhost:5432 (database: dice_db)"
