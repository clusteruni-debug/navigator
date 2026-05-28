# Navigator Subtask + Log Migration Policy

Status: P4 final design for `PLAN-NAVIGATOR-SUBTASK-LOG-MERGE`.

## Decision

Navigator adopts a **lazy + write-path-augmentation** strategy instead of the eager-batch Firestore migration originally drafted in the plan body. No `task.entries[]` field introduced; existing `task.subtasks[] + task.logs[]` schema is preserved.

## Why Lazy Over Eager

- **No firebase-admin credential** in workspace (P0 finding 2026-05-28). Eager batch requires server-side script with admin SDK; unavailable.
- **Single-user personal manager** — one `users/{uid}` doc, no concurrent writers. Eager migration risk profile is dominated by the cost of the export/restore rehearsal, not by parallel-write conflicts.
- **Zero downtime guarantee** preserved trivially: read path (`mapLegacyToEntries`) handles both legacy and entries-augmented shape identically.
- **Rollback is automatic**: removing `origin` field from `task.logs[]` reverts the auto-note linkage. No backup snapshot needed because we never destroy data.

## What Changed at Write Time

`work-toggles.js::toggleWorkTaskSubtaskComplete` now delegates the mutation to `entries-model.js::applySubtaskToggle`. The pure helper:

- **On check**: sets `subtask.completed = true` + `subtask.completedAt = <iso>`, then pushes an auto-note into `task.logs[]` with `origin: 'auto-from-subtask:<idx>'` and content `"MM-DD ✓ {subtask.text}"`. De-dupe guard prevents double-push if the helper is called twice for an already-completed subtask.
- **On uncheck**: clears `completedAt`, removes any log whose `origin` matches the subtask. Manual notes (no `origin`) are preserved.
- **Idempotent**: applies cleanly regardless of caller (UI, future automation, test harness).

The render path (P2) already filters auto-notes via the `origin` field. Visual differentiation lives in `tasks.css` `.entry-auto-note { opacity: 0.85 }`.

## Backward Compatibility

| Legacy data shape | After P4 |
|---|---|
| `task.subtasks[] + task.logs[]` (no `origin`) | Unchanged. Renders identically. |
| `task.subtasks[i].completed = true` (pre-P4 completion, no auto-note) | Renders as completed subtask in 기록 box (P2 filter). No retroactive auto-note created — that requires explicit migration (see "Eager Option" below). |
| `task.logs[i].origin = 'auto-from-subtask:N'` (post-P4 completion) | Filtered into 기록 box as dimmed auto-note. |

Existing users see no behavior change for past completions. Only future subtask check/uncheck actions produce auto-notes.

## Eager Option (deferred)

If a user later requests retroactive auto-notes for historical subtask completions, run the following client-side script in the browser console while signed in. This avoids the admin SDK requirement.

```js
// projects/navigator/scripts/migrate-entries-client.js (paste into browser console)
(async function () {
  const auth = window.firebaseAuth;
  if (!auth?.currentUser) { console.error('Not signed in'); return; }
  const docRef = window.firebaseDoc(window.firebaseDb, 'users', auth.currentUser.uid);
  const snap = await window.firebaseGetDocFromServer(docRef);
  const data = snap.data() || {};
  let touched = 0;
  (data.workProjects || []).forEach(p => {
    (p.stages || []).forEach(s => {
      (s.subcategories || []).forEach(sc => {
        (sc.tasks || []).forEach(task => {
          if (!Array.isArray(task.subtasks) || !Array.isArray(task.logs)) return;
          task.subtasks.forEach((st, i) => {
            if (!st.completed) return;
            const tag = 'auto-from-subtask:' + i;
            if (task.logs.some(l => l && l.origin === tag)) return;
            task.logs.push({
              date: st.completedAt || new Date().toISOString(),
              content: '(migrated) ✓ ' + (st.text || ''),
              origin: tag,
              checked: false
            });
            touched++;
          });
        });
      });
    });
  });
  if (!touched) { console.log('Nothing to migrate'); return; }
  await window.firebaseSetDoc(docRef, data, { merge: true });
  console.log('Migrated', touched, 'auto-notes');
})();
```

Run-only-when-needed. Not bundled into the app.

## Integrity Checks

The lazy strategy does not require a post-migration integrity gate, but the following invariants hold and can be spot-checked manually:

- For every `task.subtasks[i].completed === true` written after P4 ship, there exists exactly one log with `origin === 'auto-from-subtask:' + i`.
- For every `task.logs[j]` with `origin` matching `'auto-from-subtask:N'`, `task.subtasks[N].completed === true`.
- Toggling check/uncheck/check leaves the auto-note count at 1 (idempotent).

These are validated by `tests/auto-note-atomic.test.js` (9 fixtures).

## SLA

- Migration window: 0 (no migration runs)
- Downtime: 0 (write-path swap is in-place)
- Data loss risk: 0 (no field removed; only `origin` added to new logs)

## References

- Plan: `projects/navigator/docs/plans/PLAN-NAVIGATOR-SUBTASK-LOG-MERGE.md`
- Pure helper: `projects/navigator/js/entries-model.js`
- Write wrapper: `projects/navigator/js/work-toggles.js` (line 154)
- Tests: `projects/navigator/tests/auto-note-atomic.test.js`
- Render: `projects/navigator/js/work-render-detail.js` (P2 split-area helpers)
