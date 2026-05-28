# Navigator Core Test Scenarios

> Moved from CLAUDE.md. Verify affected items after code modifications.

## 1. Task CRUD
- Quick add: input → enter → appears in list + saveState
- Detailed add: all fields → save → persists after refresh
- Edit: edit → save → changes reflected (editingTaskId cleanup)
- Delete: delete → confirm → moved to trash + deletedIds recorded
- Complete: check → completedAt + completionLog + todayStats increment
- Undo complete: undoComplete → completionLog removal + todayStats decrement
- Brain dump: multiple lines → each line becomes individual Task (#category parsing)

## 2. Recurring Tasks
- daily/weekdays/weekends/weekly/monthly recurrence
- Daily reset: checkDailyReset() → completion state reset
- Re-completion after reset: no duplicate in completionLog

## 3. Firebase Sync
- Login → loadFromFirebase → merge + migrateNumericIds
- Local change → syncToFirebase (1.5s debounce)
- Other device change → onSnapshot → merge + toast
- Offline → auto-sync on reconnect
- Ping-pong prevention: lastOwnWriteTimestamp
- deletedIds: prevent deleted item resurrection
- Not logged in: localStorage only

## 4. ID Compatibility
- Numeric ID → migrateNumericIds → UUID conversion
- generateId() UUID format
- find(t => t.id === id) === comparison

## 5. Work Projects
- Project CRUD + auto-generated stages
- Subcategory CRUD + updatedAt refresh
- Project archive/restore/switch

## 6. Life Rhythm
- recordLifeRhythm → today update + history
- Today reset after midnight
- Medication record toggle
- 7-day/30-day averages (NaN defense)

## 7. Commute Tracker
- Route CRUD
- Duration: departTime/arriveTime → duration (negative value defense)

## 8. UI Rendering
- Only render active tab on tab switch
- Scroll/focus preservation after renderStatic
- XSS: passes through escapeHtml()
- Empty state messages (not errors)

## 9. Data Export/Import
- exportData → JSON download
- importData → validateTasks → merge/overwrite
- File validation: non-JSON file → error

## 10. Edge Cases
- Double-click duplicate action prevention
- Empty title → error toast
- visibilitychange → checkDailyReset
- Modal overlap prevention
- Touch changedTouches check
- setInterval duplicate registration prevention

## 11. tgeventbot Deep Link (?tab=events&eventId=)
- Known visible id (starred or has deadline): events tab selected, card highlighted with `event-card--highlight`, scroll-into-view smooth/center
- Hidden id (no starred / no deadline): graceful fallback — no highlight, no JS error, generic empty state
- Cache miss + visible id: single refetch retry, then highlight + scroll
- Tab switch away from events: highlight cleanup via cancelAnimationFrame (no leaked frame request)
- Offline (DevTools offline): cache.error message, no broken highlight state
- Coordinator order: handleStartupUrlParams() runs checkEventDeepLink() BEFORE checkUrlImport() — deep link wins on URL param collision
