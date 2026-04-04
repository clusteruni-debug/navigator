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
Single-file architecture (navigator-v5.html) + js/rhythm.js + js/commute.js + sw.js

## Unique Constraints
- localStorage + Firebase dual storage (localStorage only when not logged in)
- Firebase Security Rules require UID-based access
- Dates: use getLocalDateStr() / getLocalDateTimeStr() (no UTC)
- UUID migration complete — new Tasks use generateId() (UUID), legacy numeric IDs handled by migrateNumericIds
- Sync ping-pong prevention: lastOwnWriteTimestamp check
- Due to single HTML file architecture, UI changes have wide impact

## Verification Checklist
- [ ] Task CRUD (quick add/detailed/edit/delete/complete/undo)
- [ ] Recurring task reset + re-completion
- [ ] Firebase sync (ping-pong prevention, deletedIds)
- [ ] XSS defense (escapeHtml)

## Integrations
- telegram-event-bot: Event -> Task conversion (URL parameters)
- Asset Manager: Revenue data clipboard exchange

## References
- Detailed test scenarios: agent_docs/test-scenarios.md
- CC/CX file ownership: agent_docs/domain-map.md
