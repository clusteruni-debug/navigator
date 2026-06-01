# Navigator Entries Model

Status: Phase 1 read-only model definition for `PLAN-NAVIGATOR-SUBTASK-LOG-MERGE`.

## Shape

Work task detail data moves toward one ordered `task.entries[]` array:

```js
{
  id: string,
  type: 'subtask' | 'note',
  text: string,
  completed?: boolean,
  completedAt?: string,
  date?: string,
  checked?: boolean,
  origin?: string,
  isRequired?: boolean
}
```

Subtask entries use `text`, `completed`, `completedAt`, and `isRequired`.
Note entries use `text`, `date`, `checked`, and optional `origin`.

Auto-generated notes created from subtask completion use:

- `origin: 'auto-from-subtask:<subtaskId>'`
- `text: 'MM-DD ✓ {subtask.text}'`

## Legacy Mapping

`mapLegacyToEntries(task)` is a pure read mapper:

- If `task.entries[]` exists and is non-empty, return it verbatim.
- Otherwise map legacy `task.subtasks[]` and `task.logs[]` into entries.
- Subtask ids are `sub-<legacyIndex>`.
- Log ids are `log-<legacyIndex>`.
- Subtasks are ordered first by `isRequired` descending, then legacy index.
- Logs are ordered after subtasks by `date` descending.

The mapper does not touch `appState`, localStorage, Firebase, or Firestore. It
does not mutate the input task.

## Transition Strategy

Phase 1 keeps the current renderer and write paths unchanged. The new model is
available as a standalone vanilla JS helper that also exports CommonJS for Node
tests.

Phase 2 can render split "to-do" and "notes" boxes by reading through
`mapLegacyToEntries(task)` while legacy data still exists.

Phase 4 is the write cutover trigger. At that point subtask check/uncheck must
write only `entries[]` and perform the atomic pair:

- Check: set the subtask entry completed state and add the linked auto-note.
- Uncheck: clear the completed state and delete the matching auto-note by
  `origin`.

Until Phase 4, no Firestore write behavior should depend on `entries[]`.
