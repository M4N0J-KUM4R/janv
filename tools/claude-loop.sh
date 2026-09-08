#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="${1:-all}"

run_status() {
  echo "== git status =="
  git -C "$ROOT_DIR" status --short --branch
}

run_frontend() {
  echo "== frontend =="
  (cd "$ROOT_DIR/janv-web-next" && npm run lint && npm run build)
}

run_frontend_e2e() {
  echo "== frontend e2e =="
  (cd "$ROOT_DIR/janv-web-next" && npm run test)
}

run_backend() {
  echo "== backend =="
  (cd "$ROOT_DIR" && cargo check --workspace && cargo test --workspace)
}

run_scan() {
  echo "== repo scan =="
  rg -n "mockDatabase|alert\\(|hard-coded|sample|Ayush7369|admin123" \
    "$ROOT_DIR/janv-web-next/src" \
    "$ROOT_DIR/janv-api/src" \
    "$ROOT_DIR/janv-common/src" \
    "$ROOT_DIR/tools" \
    "$ROOT_DIR"/*.md \
    --glob '!**/node_modules/**' \
    --glob '!**/target/**' || true
}

run_smart() {
  echo "== smart validation =="
  local changed_files
  changed_files="$(
    git -C "$ROOT_DIR" diff --name-only
    git -C "$ROOT_DIR" diff --cached --name-only
    git -C "$ROOT_DIR" ls-files --others --exclude-standard
  )"

  if [[ -z "$changed_files" ]]; then
    echo "No uncommitted files detected. Use 'all' for a full baseline check."
    return 0
  fi

  echo "$changed_files"

  local needs_frontend=false
  local needs_backend=false
  local needs_all=false
  while IFS= read -r file; do
    [[ -z "$file" ]] && continue
    case "$file" in
      janv-web-next/*)
        needs_frontend=true
        ;;
      janv-api/*|janv-common/*|janv-executor/*|migrations/*|Cargo.toml|Cargo.lock)
        needs_backend=true
        ;;
      .claude/*|tools/*|CLAUDE.md|AGENTS.md|package.json|package-lock.json|docker/*|Dockerfile*|docker-compose*.yml)
        needs_all=true
        ;;
      *)
        needs_all=true
        ;;
    esac
  done <<< "$changed_files"

  if [[ "$needs_all" == true || ( "$needs_frontend" == true && "$needs_backend" == true ) ]]; then
    run_scan
    run_frontend
    run_backend
  elif [[ "$needs_frontend" == true ]]; then
    run_frontend
  elif [[ "$needs_backend" == true ]]; then
    run_backend
  fi
}

case "$MODE" in
  status)
    run_status
    ;;
  frontend)
    run_frontend
    ;;
  frontend-e2e)
    run_frontend_e2e
    ;;
  backend)
    run_backend
    ;;
  scan)
    run_scan
    ;;
  smart)
    run_smart
    ;;
  all)
    run_status
    run_scan
    run_frontend
    run_backend
    ;;
  *)
    echo "Usage: $0 [status|frontend|frontend-e2e|backend|scan|smart|all]" >&2
    exit 2
    ;;
esac
