# Local NVIDIA Gateway

This profile routes Claude Code through LiteLLM to NVIDIA NIM's `nvidia/nemotron-3.5-lightning-30b-a3b` model.
The configured response limit and reasoning budget are `16384` tokens with thinking enabled.
Automatic retries are disabled so NVIDIA `429` responses do not create a retry storm.

## Setup

```bash
cp llm-proxy/.env.example llm-proxy/.env
# Edit llm-proxy/.env and set NVIDIA_API_KEY locally.
uv tool install 'litellm[proxy]' --with python-dotenv
```

Start the gateway in one terminal:

```bash
npm run claude:proxy
```

Run Claude Code through it in another terminal:

```bash
npm run claude:nvidia -- "inspect the current project"
```

The launcher sets `ANTHROPIC_BASE_URL=http://127.0.0.1:4000` and authenticates with the local LiteLLM key. The NVIDIA key is read only by LiteLLM from `llm-proxy/.env`.
