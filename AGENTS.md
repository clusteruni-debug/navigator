# Navigator (todolist) — AGENTS.md

> Global rules: see workspace root `AGENTS.md` and `config/codex-global/RUNTIME-CONTRACT.md`.

## Overview
- **Stack**: HTML + Vanilla JS + Firebase (Auth/Firestore)
- **Deployment**: GitHub Pages (Actions auto-build)
- **DB**: Firebase + localStorage dual storage

## Directory Structure
- `navigator-v5.html` — Main single file
- `sw.js` — PWA service worker

## Important Notes
- Maintain localStorage + Firebase dual storage architecture
- Full XSS defense applied
- Integration with tgeventbot (event data)

## Git Permissions (Common, cannot be overridden)
- Follow workspace root `AGENTS.md` section 3 and section 16 for Codex git permissions.
- Codex may create a local commit only through the root gated commit flow; `git push` remains forbidden.
- Task-specific review-only scopes may be stricter, but this project file must not globally override the root table.
## Multi-Platform Execution Context (Common)
- This project operates on the premise of Windows source files + WSL /mnt/c/... accessing the same files.
- External (laptop/mobile) work uses SSH -> WSL by default.
- Execution environment: **Windows default** (editable via SSH -> WSL for remote access; project rules take precedence for execution constraints)
- If path confusion arises, check the "Development Environment (Multi-Platform)" section in CLAUDE.md first.

<!-- BEGIN: CODEX_GIT_POLICY_BLOCK -->
## Codex Git Permissions (Workspace Policy)

Project-local rules inherit root `AGENTS.md` section 3 and section 16.

| Action | Claude Code/User | Codex |
| --- | :---: | :---: |
| Code modification | yes | yes |
| Build/test verification | yes | yes |
| `git commit` | yes | gated local only |
| `git push` | yes | forbidden |

- Codex may create a local commit only when the root workspace Codex commit gate passes for the task.
- Codex never pushes. Claude Code or the user handles push and integration ownership.
- If this project needs stricter review-only behavior for a task, state it in that task's scope; otherwise root policy wins.
<!-- END: CODEX_GIT_POLICY_BLOCK -->
