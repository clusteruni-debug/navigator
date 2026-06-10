# AGENT_TASK_BOARD

Created: 2026-05-22
Purpose: prevent task duplication between AI/LLM agents and enable conflict-free parallel work
Scope: project:navigator
Generated-by: scripts/migrate-board-per-project.py

## Operating Policy
- Board is maintained.
- Records require minimum fields only: `TASK-ID`, `Owner-Agent`, `Status`, `Scope-Files`.
- Workspace-scope tasks stay in the root board; project-scope tasks live in `projects/<slug>/AGENT_TASK_BOARD.md` when present.

## Task Board
### Active Tasks - project:navigator
| TASK-ID | Owner-Agent | Status | Scope-Files | Notes | Change-Type |
|---------|-------------|--------|-------------|-------|-------------|
| NAVIGATOR-SUBTASK-LOG-MERGE-P4-20260528-01 | claude-code | review | projects/navigator/js/entries-model.js,projects/navigator/js/work-toggles.js,projects/navigator/tests/auto-note-atomic.test.js,projects/navigator/docs/migration-policy.md,projects/navigator/sw.js,projects/navigator/docs/plans/PLAN-NAVIGATOR-SUBTASK-LOG-MERGE.md,projects/navigator/AGENT_TASK_BOARD.md,memory/diary/2026-05-28.md | VERIFIED 2026-05-28: P4 lazy write-path migration. entries-model.js gains applySubtaskToggle + buildAutoNoteLog pure helpers (window globals). work-toggles.js toggleWorkTaskSubtaskComplete delegates to applySubtaskToggle — check creates origin='auto-from-subtask:<idx>' note in task.logs[] with content 'MM-DD ✓ {subtask.text}', uncheck removes it via origin filter. De-dupe guard + idempotent across check/uncheck cycles. Manual notes preserved. CC fallback (Codex sandbox would block again — no point re-trying). Eager Firestore migration rejected: no firebase-admin credential + single-user volume. Zero-downtime, zero-data-loss invariant maintained. docs/migration-policy.md documents lazy decision + client-side console script for optional retroactive migration. sw cache v6-66 → v6-67. Verify PASS: node --check entries-model + work-toggles; node tests/auto-note-atomic.test.js (9 fixtures: check/uncheck/re-check/manual preservation/idempotent/multi-subtask independence/mapLegacyToEntries integration/invalid input/buildAutoNoteLog shape) PASS; P2 5 + P1 6 regression PASS. Plan frontmatter status SHIPPED, all 5 milestones done=true. Browser smoke pending user (subtask check → auto-note appears in 기록 box atomically). | code |
| WORKSPACE-DIARY-ARCHIVE-VISIBILITY-CYCLE-20260524-01 | unassigned | proposed | config/claude-global/scripts/doc-rotate.py,config/claude-global/skills/session-end/SKILL.md,config/claude-global/skills/session-start/SKILL.md,AGENTS.md,CLAUDE.md | Session 18 user reported "왜 삭제?" panic on memory/diary/2026-04-23.md (31-day archive). Root cause: doc-rotate.py:42-50 (DIARY_KEEP_DAYS=30) auto-archives diary at session-end with no user visibility surface — codex pre-commit hook flagged as deletion (false alarm). Ecosystem-wide awareness required (CC + Codex + hooks + sessions all treat archive as known cycle, not anomaly). Scope: separate-session plan + impl. | docs |

### Active File Locks
<!-- 5 codex tasks transitioned review -> done at 2026-06-04T14:16:33+0900: NAVIGATOR-COMMUTE-REDESIGN-SUBTAB-20260523-01, NAVIGATOR-DASHBOARD-REDESIGN-4SUBTAB-20260523-01, NAVIGATOR-REFLECTION-DRIFT-FIX-20260523-01, NAVIGATOR-WORK-REDESIGN-V4-TASK-CONTAINER-20260523-01, NAVIGATOR-WORK-REDESIGN-V3-DASHBOARD-20260523-01 (sidecar VERIFIED exit0/native0 + verify-pending clean + scope files in HEAD; session NAVIGATOR-PLAN-CLOSEOUT-20260604-01) -->
<!-- 4 codex tasks transitioned review/blocked -> done at 2026-06-04T14:22:35+0900 (fallback evidence, no sidecar): NAVIGATOR-HISTORY-EXTRACT-CALENDAR-20260523-01 (code inspection — render-history.js 3 renderer fns + render-all.js buried block removed; codex run abandoned but goal shipped), NAVIGATOR-EVENTS-REDESIGN-TIME-AXIS-20260523-01 (inline VERIFIED npm40/0+Playwright + scope files in HEAD), NAVIGATOR-WORK-REDESIGN-20260522-01 (superseded by V3/V4 — work.js rewritten), NAVIGATOR-SUBTASK-LOG-MERGE-P0-20260528-01 (OBSOLETE — PLAN-NAVIGATOR-SUBTASK-LOG-MERGE SHIPPED via lazy path, firebase-admin bypassed); navigator codex board now 0 review / 0 blocked -->
| File Path | Locked By | TASK-ID | Locked At | Release Condition |
|-----------|-----------|---------|-----------|-------------------|
