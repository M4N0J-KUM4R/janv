#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# reset_disposable.sh — destructive schema reset for the
# `janv_disposable` schema inside the configured RDS database.
#
# This script will:
#   - Refuse to run unless JANV_DISPOSABLE=1 is set in the env.
#   - Refuse to run against a host that is not in the approved
#     disposable list.
#   - Drop and recreate the `janv_disposable` schema only.
#   - Re-run all SQL files under ./migrations in lexical order.
#
# It will never:
#   - Drop the database itself.
#   - Touch any other schema.
#   - Run unless the host is explicitly approved below.
# ──────────────────────────────────────────────────────────────
set -euo pipefail

# Hosts that this script is allowed to operate against. Production
# RDS endpoints must NEVER be added to this list.
ALLOWED_HOSTS=(
    "janv-db.cp2y4ssmw08x.ap-south-1.rds.amazonaws.com"
)

if [[ "${JANV_DISPOSABLE:-0}" != "1" ]]; then
    echo "REFUSED: set JANV_DISPOSABLE=1 to confirm this is a disposable target." >&2
    exit 2
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "REFUSED: DATABASE_URL is not set." >&2
    exit 2
fi

# Enforce that the script only runs as janv_disposable. This is a
# safety belt: even if the host is in the allow-list, we must never
# drop and recreate a schema using a privileged user.
if [[ "${JANV_TEST_DB_USER:-}" != "janv_disposable" ]]; then
    echo "REFUSED: set JANV_TEST_DB_USER=janv_disposable in the URL or env." >&2
    echo "Never run reset_disposable.sh as janv_admin or janv_app." >&2
    exit 2
fi

# Pull the host out of the URL for the allow-list check.
HOST=$(printf '%s' "$DATABASE_URL" | sed -E 's#^postgres(ql)?://[^@/]+@([^:/]+).*#\2#')
if [[ -z "$HOST" ]]; then
    echo "REFUSED: could not parse host from DATABASE_URL." >&2
    exit 2
fi

ALLOWED=0
for h in "${ALLOWED_HOSTS[@]}"; do
    if [[ "$h" == "$HOST" ]]; then
        ALLOWED=1
        break
    fi
done
if [[ "$ALLOWED" -ne 1 ]]; then
    echo "REFUSED: host '$HOST' is not in the disposable allow-list." >&2
    echo "Add it to ALLOWED_HOSTS in this script only after a fresh safety review." >&2
    exit 2
fi

# Pick psql; need PGPASSWORD separately. Don't print DATABASE_URL.
PGURL="$DATABASE_URL"
if [[ "$PGURL" == "postgres://"* && -z "${PGPASSWORD:-}" ]]; then
    echo "REFUSED: set PGPASSWORD (or use a libpq URL that does not require it)." >&2
    exit 2
fi

echo "Disposable reset: target host OK, recreating janv_disposable schema only."
psql "$PGURL" -v ON_ERROR_STOP=1 -c "DROP SCHEMA IF EXISTS janv_disposable CASCADE;"
psql "$PGURL" -v ON_ERROR_STOP=1 -c "CREATE SCHEMA janv_disposable;"
psql "$PGURL" -v ON_ERROR_STOP=1 -c "SET search_path TO janv_disposable, public;"

shopt -s nullglob
for f in ./migrations/*.sql; do
    echo "applying: $f"
    # Run migration with SET search_path prepended to each file
    psql "$PGURL" -v ON_ERROR_STOP=1 <<EOF >/dev/null
SET search_path TO janv_disposable, public;
\\i $f
EOF
done

echo "Disposable schema reset complete."
