# Navigator — ADHD-Friendly Task Management

## Stack
HTML + Vanilla JS + Firebase (Auth/Firestore)

## Run
```bash
npx serve -p 5000
# http://localhost:5000/navigator-v5.html
```

## Deployment
GitHub Pages: https://clusteruni-debug.github.io/navigator/navigator-v5.html

## Architecture
Modular Vanilla JS (66 files in js/) + navigator-v5.html (HTML shell, 290 lines) + sw.js
Sequential script loading — no ES6 modules or bundler. Load order in navigator-v5.html is critical.

## Unique Constraints
- localStorage + Firebase dual storage (localStorage only when not logged in)
- Firebase Security Rules require UID-based access
- Dates: use getLocalDateStr() / getLocalDateTimeStr() (no UTC)
- UUID migration complete — new Tasks use generateId() (UUID), legacy numeric IDs handled by migrateNumericIds
- Sync ping-pong prevention: lastOwnWriteTimestamp check
- Sequential script loading: adding/renaming JS files requires navigator-v5.html script tag order update
- globals.js Object.assign(window, _navFunctions): central registry for HTML onclick handlers — do not remove without full call-site audit

## Verification Checklist
- [ ] Task CRUD (quick add/detailed/edit/delete/complete/undo)
- [ ] Recurring task reset + re-completion
- [ ] Firebase sync (ping-pong prevention, deletedIds)
- [ ] XSS defense (escapeHtml)

## Integrations
- tgeventbot: Supabase event consumer + deep-link landing page
  - Read: anon-key REST query against `telegram_messages` (status field is sole source of truth post-2026-04-25 STEP 1c)
  - Write: PATCH `{status: 'done'|'pending'|'skipped'}` only — `participated` column dropped 2026-04-25
  - Deep link: `?tab=events&eventId=<supabase_id>` selects events tab + highlights matching card + scrolls into view (handled by `handleStartupUrlParams()` in init.js)
  - Legacy `?import=base64&autoImport=true` import path remains for backward compat (checkUrlImport)
  - Anon key format: `sb_publishable_*` (legacy `eyJ...` disabled by Supabase 2026-04-19)
  - **Schema swap policy**: any DROP/RENAME of `telegram_messages` columns requires Navigator read swap (select clause + derived getter + response field mapping + in-memory cache local updates) deployed BEFORE producer applies the DDL migration. Verify with `grep -rn '<column>' js/` returning zero matches (excluding incidental function parameter names). Full spec: workspace `config/integrations.json` `eventbot-navigator-import.breaking_if_changed`. Precedent incident: 2026-04-29 PG 42703 on `participated` DROP because read swap was missed.
- Asset Manager: Revenue data clipboard exchange

## References
- Detailed test scenarios: agent_docs/test-scenarios.md
- CC/CX file ownership: agent_docs/domain-map.md
