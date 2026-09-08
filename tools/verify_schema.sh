#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# verify_schema.sh — non-destructive schema introspection.
#
# Prints (to stdout and optionally a file):
#   - Search path
#   - Table list
#   - Per-table column count
#   - Foreign keys
#   - Indexes
#
# Usage:
#   DATABASE_URL=... ./tools/verify_schema.sh [output_file]
#
# Never modifies the database.
# ──────────────────────────────────────────────────────────────
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "DATABASE_URL not set" >&2
    exit 2
fi

OUT="${1:-}"

run() {
    local label="$1"; shift
    echo "─── $label ───"
    psql "$DATABASE_URL" -A -t "$@"
    echo
}

{
    run "search_path"   -c "SHOW search_path;"
    run "tables"        -c "SELECT n.nspname||'.'||c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind='r' AND n.nspname NOT IN ('pg_catalog','information_schema') ORDER BY 1;"
    run "foreign_keys"  -c "SELECT tc.table_name||'.'||kcu.column_name||' -> '||ccu.table_name||'.'||ccu.column_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name=kcu.constraint_name JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1;"
    run "indexes"       -c "SELECT schemaname||'.'||tablename||' '||indexname FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY 1;"
} | if [[ -n "$OUT" ]]; then tee "$OUT"; else cat; fi
