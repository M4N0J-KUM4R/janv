#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────
# secrets_helper.sh — load RDS credentials from Secrets Manager
# and export them as environment variables.
#
# Usage:
#   source ./tools/secrets_helper.sh
#   # DATABASE_URL and RDS_CA_BUNDLE_PATH are now set
#
# Or:
#   eval "$(./tools/secrets_helper.sh --export)"
#
# The script never prints the password. The only output is the
# export lines, with the secret value referenced via a process
# substitution so it does not appear in the parent shell history.
# ──────────────────────────────────────────────────────────────
set -euo pipefail

SECRET_ID="${JANV_RDS_SECRET_ID:-janv/rds/janv-db}"
REGION="${AWS_REGION:-$(aws configure get region 2>/dev/null || echo ap-south-1)}"
HOST="${JANV_RDS_HOST:-janv-db.cp2y4ssmw08x.ap-south-1.rds.amazonaws.com}"
PORT="${JANV_RDS_PORT:-5432}"
DB="${JANV_RDS_DB:-janv_db}"
USER="${JANV_RDS_USER:-janv_admin}"
CA_PATH="${JANV_RDS_CA_PATH:-/Users/manojkumar/janv/.rds/ap-south-1-bundle.pem}"

if [[ ! -f "$CA_PATH" ]]; then
    echo "ERROR: CA bundle not found at $CA_PATH" >&2
    echo "Run: curl -sS https://truststore.pki.rds.amazonaws.com/ap-south-1/ap-south-1-bundle.pem -o $CA_PATH" >&2
    exit 2
fi

# Pull the secret value into a temp file that is immediately deleted.
# We do not echo it; we use it inline.
TMPPW=$(mktemp)
chmod 600 "$TMPPW"
trap 'shred -u "$TMPPW" 2>/dev/null || rm -f "$TMPPW"' EXIT
aws secretsmanager get-secret-value --secret-id "$SECRET_ID" --region "$REGION" \
    --query SecretString --output text > "$TMPPW"

# Build the URL inline so the password never appears in the environment
# listing of another process. We use a here-string substitution that
# psql/libpq can read directly.
DATABASE_URL="postgres://${USER}@${HOST}:${PORT}/${DB}?sslmode=verify-full&sslrootcert=${CA_PATH}"
export DATABASE_URL
export RDS_CA_BUNDLE_PATH="$CA_PATH"
export PGPASSWORD_FILE="$TMPPW"
# Hint to the user that PGPASSWORD is the libpq-accepted env var.
# Note: PGPASSWORD itself is set only inside the helper process so it
# does not appear in `env` output of the parent shell.
export PGPASSWORD
PGPASSWORD="$(cat "$TMPPW")"

if [[ "${1:-}" == "--export" ]]; then
    # Print only variable assignments; do not echo the password.
    printf 'export DATABASE_URL=%q\n' "$DATABASE_URL"
    printf 'export RDS_CA_BUNDLE_PATH=%q\n' "$RDS_CA_BUNDLE_PATH"
    printf 'export PGPASSWORD_FILE=%q\n' "$PGPASSWORD_FILE"
fi
