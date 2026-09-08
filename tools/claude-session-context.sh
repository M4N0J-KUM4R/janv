#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "Janv workspace: Rust API/common/executor + Next.js frontend"
git -C "$ROOT_DIR" status --short --branch | sed -n '1,12p'
echo "Use /verify after edits, or run bash tools/claude-loop.sh {frontend|backend|all}."
