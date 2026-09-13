#!/usr/bin/env bash
set -euo pipefail

# Force this launcher to use the local LiteLLM -> Lightning AI (deepseek-v4-pro) route
# even when global Claude settings point at another provider or model.
export ANTHROPIC_BASE_URL="http://127.0.0.1:4000"
export ANTHROPIC_AUTH_TOKEN="${LITELLM_MASTER_KEY:-sk-janv-local-proxy}"
export ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"
export ANTHROPIC_DEFAULT_OPUS_MODEL="claude-3-5-sonnet-20241022"
export ANTHROPIC_DEFAULT_SONNET_MODEL="claude-3-5-sonnet-20241022"
export ANTHROPIC_DEFAULT_HAIKU_MODEL="claude-3-5-sonnet-20241022"
export CLAUDE_CODE_SUBAGENT_MODEL="claude-3-5-sonnet-20241022"

exec claude "$@"
