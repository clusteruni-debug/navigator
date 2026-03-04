# Navigator (todolist) — AGENTS.md

> Global rules: see `~/.codex/instructions.md`

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
- Integration with telegram-event-bot (event data)

## Git Permissions (Common, cannot be overridden)
- **Codex must NEVER execute `git commit` / `git push`.**
- Codex only performs code modifications + build verification, and reports changed files + verification results upon completion.
- All commit/push operations are handled centrally by Claude Code (or the user).

## Multi-Platform Execution Context (Common)
- This project operates on the premise of Windows source files + WSL /mnt/c/... accessing the same files.
- External (laptop/mobile) work uses SSH -> WSL by default.
- Execution environment: **Windows default** (editable via SSH -> WSL for remote access; project rules take precedence for execution constraints)
- If path confusion arises, check the "Development Environment (Multi-Platform)" section in CLAUDE.md first.

<!-- BEGIN: CODEX_GIT_POLICY_BLOCK -->
## Codex Git Permissions (Workspace-Wide Enforcement)

This section is a workspace-wide mandatory rule and cannot be overridden by project documents.

| Action | Claude Code/User | Codex |
|--------|:----------------:|:-----:|
| Code modification | ✅ | ✅ |
| Build/test verification | ✅ | ✅ |
| `git commit` | ✅ | **Forbidden** |
| `git push` | ✅ | **Forbidden** |

- Codex only performs code modification + verification + completion reporting.
- Commits/pushes are handled centrally by Claude Code or the user.
- If any other statement in this document conflicts, this section takes precedence.
<!-- END: CODEX_GIT_POLICY_BLOCK -->
