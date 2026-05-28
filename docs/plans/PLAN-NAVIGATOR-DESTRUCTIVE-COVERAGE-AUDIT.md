---
plan_id: NAVIGATOR-DESTRUCTIVE-COVERAGE-AUDIT
project: navigator
status: PROPOSED
status_reason: "MO-9 systemic-class lift from PLAN-NAVIGATOR-SUBTASK-LOG-MERGE review Round 1/2/3. Three rounds surfaced the same architectural class: helper-defined-but-applied-to-subset-of-sites. Round 4+ would surface more sites of the same class — codebase-wide audit is the structural fix."
milestones:
  - { id: M1, label: "destructiveConfirm coverage audit + remaining sites migration", done: false }
  - { id: M2, label: "Array.isArray(task.logs) coverage audit + missing sites guard", done: false }
  - { id: M3, label: "localStorage.setItem coverage audit + missing sites try/catch", done: false }
  - { id: M4, label: "cooldownKey stable-ID migration (index → task.id/subcat.id/stage.id)", done: false }
  - { id: M5, label: "isCollapsible threshold change — appState.expandedWorkTaskDetails migration", done: false }
  - { id: M6, label: "AUTO_SUBTASK_ORIGIN_PREFIX fallback literal removal (constant drift hazard)", done: false }
decisions_pending: []
blockers: []
depends_on: ["NAVIGATOR-SUBTASK-LOG-MERGE"]
git_strategy: mono
last_verified: 2026-05-28
---

# Plan — Navigator Codebase-Wide Destructive-Action Coverage Audit

> **Goal (testable)**: After completion, grep-based audit returns zero remaining sites for each of these patterns: (a) bare `confirm()` calls in destructive paths, (b) `task.logs.*` access without `Array.isArray` guard, (c) `localStorage.setItem` without try/catch, (d) index-based cooldown keys subject to splice drift.
> **Owner**: User (Decider) + CC primary
> **Created**: 2026-05-28
> **Triggered by**: /code-review Round 3 systemic-class lift (MO-9). Round 1/2/3 each surfaced 2-5 new sites of the same class as Round 1 fixes — coverage gaps recur faster than per-site fixes close them.

## Background

PLAN-NAVIGATOR-SUBTASK-LOG-MERGE shipped 2026-05-28. Subsequent `/code-review` rounds applied 17 site-by-site fixes for the same five patterns. Round 3 surfaced 5 fresh sites of the same class:

| Pattern | Round 1 fixed | Round 2 fixed | Round 3 surfaced |
|---|---|---|---|
| `destructiveConfirm` migration | 3 sites (renderer wrappers) | 2 sites (stage/project) | 3 sites (template/form) |
| `Array.isArray(task.logs)` | 1 site (addWorkLog) | 3 sites (cycle/toggle/sub) | 2 sites (modal/clipboard) |
| `localStorage.setItem` try/catch | 1 site (saveWorkProjects) | 1 site (saveWorkTemplates) | (untouched sites elsewhere) |
| Constant drift `auto-from-subtask:` | 1 site (renderEntriesNoteRow) | 1 site (isCollapsible) | fallback literal hazard persists |
| Cooldown key stable-ID | not addressed | not addressed | 5 sites unstable under splice |

MO-9 trigger (skill mechanical-override): same architectural class surfaces in 3+ consecutive rounds → architectural fix required, per-site rounds are net-negative.

## Approach

Six milestones. Each is a single audit + bulk-fix pass, not incremental.

### M1 — destructiveConfirm coverage audit

```bash
grep -rn 'confirm(' projects/navigator/js/ | grep -v 'destructiveConfirm\|//\|/\*\|\*/'
```

Expected remaining sites (Round 3 finding):
- `work-template-crud.js:10` (deleteWorkTemplate)
- `work-template-crud.js:44` (deleteTemplateStage)
- `work-forms.js:454` (resetFormTemplate)
- Plus any sites grep surfaces beyond these.

**Acceptance**: every destructive op (data mutation that user cannot undo via Ctrl+Z) routes through `destructiveConfirm(msg, cooldownKey)` with the same fallback inline pattern. Grep returns 0 bare `confirm()` calls outside non-destructive prompts (e.g., name-rename `prompt()`).

### M2 — Array.isArray(task.logs) coverage audit

```bash
grep -rn 'task\.logs\.\(push\|some\|filter\|length\|map\|forEach\)' projects/navigator/js/
```

Cross-reference each site against `Array.isArray(task.logs)` guard. Sites known to lack guard (Round 3):
- `work-modal.js:272` (uses falsy check `!task.logs`)
- `work-clipboard.js:116` (uses truthy check `task.logs && ...`)
- Plus grep surface beyond these.

**Acceptance**: every `task.logs.*` access is preceded by `Array.isArray(task.logs)` or its result is wrapped in `(Array.isArray(task.logs) ? task.logs : [])`. Same applies to `task.subtasks.*` accesses — extend grep.

### M3 — localStorage.setItem coverage audit

```bash
grep -rn 'localStorage\.setItem' projects/navigator/js/
```

Known wrapped: `saveWorkProjects` (work-data.js:117), `saveWorkTemplates` (work-data.js:137). Cross-reference all other sites — each needs the same try/catch with showToast pattern.

**Acceptance**: every `localStorage.setItem` is inside a try/catch that logs to console.error and shows toast on QuotaExceededError. Single helper `safeLocalStorageSet(key, value)` is the preferred design.

### M4 — cooldownKey stable-ID migration

Current: `cooldownKey = 'task-<projectId>-<stageIdx>-<subcatIdx>-<taskIdx>'`. After splice, the same key points to a different item. Round 3 finding confirmed: silent double-delete possible.

Migration: use `task.id` (UUID per CLAUDE.md migration), `subcat.id`, `stage.id` when available. Fallback to `index + timestamp` (e.g., `'task-' + task.id` or `'task-' + projectId + '-' + Date.now() + '-' + taskIdx`).

Sites:
- `deleteWorkTask` (work-actions.js:159)
- `deleteSubcategory` (work-actions.js:368)
- `deleteWorkLog` (work-actions.js:430)
- `removeWorkTaskSubtask` (work-toggles.js:391)
- `deleteProjectStage` (work-project-crud.js:51)
- `deleteWorkProject` (work-project-crud.js:126)

**Acceptance**: cooldownKey is invariant under splice. New test fixture: check that after a delete + 5s-window second delete on the same array position, the second call DOES re-prompt because the cooldownKey differs.

### M5 — isCollapsible threshold appState migration

When `totalLogCount` filter changed (Round 2: exclude auto-notes), the threshold flipped for tasks with `~3 logs including auto-notes`. Users with `appState.expandedWorkTaskDetails[key]` from before the change see their explicit collapse silently undone.

Migration: one-time `migrateExpandedDetails` helper at session start — for every key, if the task no longer meets `isCollapsible` threshold, remove the key from `expandedWorkTaskDetails`.

**Acceptance**: existing user sessions retain their explicit-expanded vs auto-expanded distinction across the threshold change.

### M6 — AUTO_SUBTASK_ORIGIN_PREFIX fallback literal removal

Current pattern in 2 sites (work-render-detail.js:450, 637):

```js
const _autoPrefix = (typeof AUTO_SUBTASK_ORIGIN_PREFIX === 'string') ? AUTO_SUBTASK_ORIGIN_PREFIX : 'auto-from-subtask:';
```

The fallback literal is the original drift hazard. If `entries-model.js` fails to load, the literal is used silently. If the constant ever changes, the fallback never tracks.

Migration: replace fallback with hard `console.error` + early return (`if (typeof AUTO_SUBTASK_ORIGIN_PREFIX !== 'string') { console.error('[navigator] AUTO_SUBTASK_ORIGIN_PREFIX missing'); return; }`). Force surface the load failure instead of masking it.

**Acceptance**: zero hardcoded `'auto-from-subtask:'` literals in projects/navigator/js/* (except entries-model.js where the constant is defined).

## Acceptance (overall)

- [ ] `grep -rn 'confirm(' projects/navigator/js/` returns 0 destructive sites without destructiveConfirm
- [ ] `grep -rn 'task.logs.' projects/navigator/js/` every access has Array.isArray guard upstream
- [ ] `grep -rn 'localStorage.setItem' projects/navigator/js/` every site is inside safeLocalStorageSet or has try/catch
- [ ] cooldownKey stable-ID migration complete + new fixture covers splice scenario
- [ ] migrateExpandedDetails helper added + tested
- [ ] `grep -rn "'auto-from-subtask:'" projects/navigator/js/` returns only entries-model.js (constant definition)

## Out of Scope

- toggleWorkLogChecked atomic semantics (separate plan if user requests)
- LOW priority 6 button audit items (separate plan)
- Retroactive auto-note migration for pre-P4 completed subtasks (documented in migration-policy.md)

## References

- PLAN-NAVIGATOR-SUBTASK-LOG-MERGE (parent — SHIPPED 2026-05-28)
- code-review skill MO-9 systemic-class lift criterion
- memory/qa/NAVIGATOR-SUBTASK-LOG-MERGE-P2/P3/P4-20260528-01.md (round 1-3 evidence)
- commits b960c5b3 → 6f430a3c → 62488ece → a22b9606 (P2/P3/P4 + review fixes)

## Notes

> This plan is the architectural lift signal from MO-9. The decision to defer to a plan-doc instead of running Round 4+ is per the skill spec: "systemic-class trigger → STOP, route architectural fix to plan-doc; do NOT continue rounds".
> Round 3 itself shipped 2 immediate fixes (hasLongLogs null guard + renameWorkTaskSubtask auto-note sync) because they are isolated bugs, not the systemic class.
> Lint command: `python3 scripts/parse-plan-frontmatter.py --lint <this-file>`
