#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROXY_DIR="$ROOT_DIR/llm-proxy"

if [[ ! -f "$PROXY_DIR/.env" ]]; then
  echo "Missing $PROXY_DIR/.env. Copy .env.example and add NVIDIA_API_KEY locally." >&2
  exit 2
fi

# Load dotenv syntax without executing the file as shell code.
exec python3 - "$PROXY_DIR" "${LITELLM_PORT:-4000}" <<'PY'
import os
import sys

from dotenv import load_dotenv

proxy_dir = sys.argv[1]
port = sys.argv[2]
load_dotenv(os.path.join(proxy_dir, ".env"), override=True)

# Accept either a raw API key or the copied "Bearer ..." form.
nvidia_key = os.environ.get("NVIDIA_API_KEY", "")
if nvidia_key.startswith("Bearer "):
    os.environ["NVIDIA_API_KEY"] = nvidia_key.removeprefix("Bearer ")

lightning_key = os.environ.get("LIGHTNING_API_KEY", "")
if lightning_key.startswith("Bearer "):
    os.environ["LIGHTNING_API_KEY"] = lightning_key.removeprefix("Bearer ")

os.execvp(
    "litellm",
    ["litellm", "--config", os.path.join(proxy_dir, "litellm_config.yaml"), "--port", port],
)
PY
