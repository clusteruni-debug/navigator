# Data Schema — Navigator

> Backend: **Firebase Firestore** (auth + primary storage) + **Supabase Instance #1** (consumer-only, tgeventbot data) + **localStorage** (offline cache).
> Last regen: 2026-05-23 (manual; navigator owns no Supabase tables, only consumes).

## Owned — Firebase Firestore

Single root collection. Per-user document model — one document holds the entire task graph for one UID.

| Path | Shape | Purpose |
|------|-------|---------|
| `users/{uid}` | `{ tasks, deletedIds, lastOwnWriteTimestamp, updatedAt }` | Full task state + deletion tombstones + sync ping-pong prevention. Single-document write per sync cycle. |

Field details (Firestore document body):

| Field | Type | Notes |
|-------|------|-------|
| `tasks` | array<Task> | Task records (UUID id, category, deadline, recurring rules, completion log). See `js/tasks.js` for the Task shape. |
| `deletedIds` | array<string> | Tombstones for sync conflict resolution (prevents resurrection). |
| `lastOwnWriteTimestamp` | server timestamp | Self-write fingerprint — `onSnapshot` handler ignores echoes within this timestamp window. |
| `updatedAt` | server timestamp | Last server-side write time. |

**Security rule**: `request.auth.uid == resource.id` — UID-scoped. No cross-user read.

**Backup collection**: `js/firebase-backup.js` writes additional snapshots — confirm path before editing (`backups/<uid>/<timestamp>` pattern, verified via call sites only).

## Consumed (read-only) — Supabase Instance #1

| Table | Owner project | Read pattern | Anon key format |
|-------|---------------|--------------|-----------------|
| `telegram_messages` | tgeventbot | REST query against Supabase URL with `sb_publishable_*` anon key. Single status field is sole source of truth post-2026-04-25 STEP 1c (`participated` column dropped). | `sb_publishable_*` (legacy `eyJ...` disabled 2026-04-19) |

Write pattern: `PATCH {status: 'done'|'pending'|'skipped'}` only — no other column mutation. See `AGENTS.md` Integrations section for the deep-link contract + schema swap policy.

## localStorage (offline cache)

Mirrors `users/{uid}.tasks` when not logged in. Same Task shape. Auto-promoted to Firestore on first successful sign-in (merge handled by `js/firebase-merge.js`).

## Drift Detection

Navigator owns 0 Supabase tables — no schema drift surface on the Supabase side. Firebase Firestore is schemaless; the Task shape contract lives in `js/tasks.js` + `js/init.js` (`generateId()`, `migrateNumericIds`). Drift here is a code-level concern — see `ARCHITECTURE.md` Sequential Loading Order section.

Schema swap policy for consumed `telegram_messages`: any DROP/RENAME requires Navigator read swap deployed BEFORE the producer DDL migration. Verify via `grep -rn '<column>' js/` returning zero matches. See `config/integrations.json` `eventbot-navigator-import.breaking_if_changed` for the full contract.

## References

- ARCHITECTURE.md (root) — full module map + sequential loading rules
- AGENTS.md (root) — Integrations section: tgeventbot consumer contract
- `config/integrations.json` (workspace) — Navigator ↔ tgeventbot break-glass rules
- `js/firebase-sync.js` — onSnapshot handler + ping-pong logic
- `js/firebase-backup.js` — backup write paths
