# Janv Claude Playbook

This repo is a mixed Rust + Next.js workspace for the Janv educational platform.
Use this file as the quick operating guide when working in the repo.

## Project Map

- `janv-api`: Rust Axum API and server-side business logic.
- `janv-common`: shared DTOs, models, validation, and errors.
- `janv-executor`: sandboxed code runner and queue worker.
- `janv-web-next`: active Next.js frontend and app routes.
- `janv-web`: legacy Leptos/WASM frontend; do not modify unless explicitly requested.
- `migrations`: PostgreSQL schema changes.
- `tools`: local helpers for schema checks and disposable-db safety.

## Janv-Specific Boundaries

- The active browser UI is `janv-web-next`; its Playwright tests live in `janv-web-next/tests/e2e`.
- The API defaults to port `3000`, which conflicts with Next.js. Use a separate `PORT` for the API when running both locally.
- Playwright has no automatic `webServer`; start the required API, frontend, database, Redis, and executor services before running E2E tests.
- Database migrations are applied by the API in sorted filename order. Keep migration names numeric and verify schema changes with `tools/verify_schema.sh`.
- Never inspect or print `.env` files, credentials, private keys, or Terraform state secrets.

## Repeatable Work Loop

When fixing a bug or adding a feature, keep the loop tight:

1. Inspect only the files that matter for the change.
2. Make the smallest safe edit.
3. Run the relevant validation slice.
4. Re-read the failing output before editing again.
5. Stop once the slice is green and the diff is minimal.

Use the helper script for that loop:

```bash
bash tools/claude-loop.sh status
bash tools/claude-loop.sh smart
bash tools/claude-loop.sh frontend
bash tools/claude-loop.sh backend
bash tools/claude-loop.sh all
```

Claude Code helpers:

- `/verify` chooses the smallest relevant validation slice from the current change.
- `npm run claude:smart` chooses validation automatically from changed files.
- `/review-changes` reviews the live diff for bugs, security risks, regressions, and missing tests.
- Use the `backend-reviewer` subagent for a read-only Rust/API review before a larger backend change.
- Project hooks print a compact session status and a verification reminder after edits.

## Parallel Claude Work

After the first Git commit exists, use one isolated worktree per independent task:

```bash
claude --worktree frontend-polish
claude --worktree api-tests
```

Each session edits its own checkout and branch. Keep tasks independent, then review and merge the resulting branches from the main checkout. Use `bash tools/claude-worktree.sh list` to inspect them. This repository currently has no `HEAD` commit, so worktrees must wait until the initial commit is created.

## Canonical Checks

- Frontend: `cd janv-web-next && npm run lint && npm run build`
- Frontend E2E: `cd janv-web-next && npm run test` (requires services already running)
- Backend: `cargo check --workspace && cargo test --workspace`
- Workspace status: `git status --short --branch`
- Fast search: `rg -n "pattern" janv-web-next janv-api janv-common`

## Change Discipline

- Prefer `apply_patch` for edits.
- Do not overwrite unrelated user changes.
- Keep new helpers ASCII-only unless the file already uses Unicode.
- Prefer local assets, local API routes, and repo scripts over ad hoc repetition.
