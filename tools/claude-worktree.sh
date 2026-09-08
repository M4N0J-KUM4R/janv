#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKTREE_ROOT="${CLAUDE_WORKTREE_ROOT:-$ROOT_DIR/../janv-worktrees}"
COMMAND="${1:-help}"
NAME="${2:-}"

require_commit() {
  if ! git -C "$ROOT_DIR" rev-parse --verify HEAD >/dev/null 2>&1; then
    echo "No Git commit exists yet. Create the first commit before using worktrees." >&2
    exit 2
  fi
}

validate_name() {
  if [[ ! "$NAME" =~ ^[A-Za-z0-9][A-Za-z0-9._/-]*$ ]]; then
    echo "Worktree name must contain only letters, numbers, '.', '_', '/', or '-'." >&2
    exit 2
  fi
}

case "$COMMAND" in
  check)
    require_commit
    echo "Worktrees are ready from $(git -C "$ROOT_DIR" rev-parse --short HEAD)."
    ;;
  list)
    git -C "$ROOT_DIR" worktree list
    ;;
  create)
    require_commit
    validate_name
    mkdir -p "$WORKTREE_ROOT"
    WORKTREE_PATH="$WORKTREE_ROOT/$NAME"
    BRANCH="codex/$NAME"
    if [[ -e "$WORKTREE_PATH" ]]; then
      echo "Worktree path already exists: $WORKTREE_PATH" >&2
      exit 2
    fi
    git -C "$ROOT_DIR" worktree add -b "$BRANCH" "$WORKTREE_PATH" HEAD
    echo "Created: $WORKTREE_PATH"
    echo "Start Claude there with: cd '$WORKTREE_PATH' && claude"
    ;;
  remove)
    require_commit
    validate_name
    WORKTREE_PATH="$WORKTREE_ROOT/$NAME"
    if [[ ! -d "$WORKTREE_PATH" ]]; then
      echo "Worktree path does not exist: $WORKTREE_PATH" >&2
      exit 2
    fi
    git -C "$ROOT_DIR" worktree remove "$WORKTREE_PATH"
    echo "Removed worktree: $WORKTREE_PATH"
    ;;
  *)
    echo "Usage: $0 [check|list|create NAME|remove NAME]" >&2
    exit 2
    ;;
esac
