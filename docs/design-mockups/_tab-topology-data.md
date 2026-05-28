# Navigator 9-Tab Topology — Raw Enumeration Data

**Generated:** 2026-05-21  
**Scope:** 24,623 total LOC across navigator-v5.html + 40+ JS files  
**Method:** Static analysis of HTML tab nav, state.js appState, render entry points, and modal invocations

---

## Section A — Tab Definitions (from navigator-v5.html)

### Keyboard Shortcuts
```
1 → 오늘 (action)        | 2 → 본업 (work)      | 3 → 이벤트 (events)
4 → 대시보드 (dashboard) | 5 → 전체 (all)        | 6 → 기록 (history)
S → 셔틀 토글 (shuttle)  | ? → 도움말
```

### Tab Navigation Structure (navigator-v5.html:196-230)
**Primary tabs (always visible):**
- `action` — 오늘 (target icon)
- `all` — 할일 (list icon)
- `work` — 본업 (briefcase icon)
- `events` — 이벤트 (dollar icon)
- `life` — 일상 (home icon)

**Secondary tabs (더보기 dropdown menu):**
- `commute` — 통근 (bus icon)
- `dashboard` — 통계 (bar-chart icon)
- `history` — 히스토리 (calendar icon)
- `reflection` — 자문 (moon emoji)

---

## Section B — appState Key Fields

### Core Fields (Persisted)
- `tasks` → Task[] (localStorage + Firebase)
- `currentTab` → string (session only)
- `shuttleSuccess` → boolean (localStorage + Firebase)
- `workProjects` → WorkProject[] (localStorage + Firebase)
- `dailyReflection` → {history, settings, streak} (localStorage + Firebase)
- `lifeRhythm` → {today, history, settings} (localStorage + Firebase)
- `commuteTracker` → {routes, trips, settings} (localStorage + Firebase)
- `completionLog` → {[YYYY-MM-DD]: CompletionLogEntry[]} (localStorage + Firebase)

### UI State (Session Only)
- `showDetailedAdd`, `showTaskList`, `showCompletedTasks`, `quickAddValue`
- `editingTaskId`, `quickEditTaskId`, `searchQuery`, `categoryFilter`, `tagFilter`
- `moreMenuOpen`, `historyState`, `dashboardSubView`, `allTasksSearch`
- `commuteSubTab`, `commuteRouteModal`, `workView`, `pomodoro`, `quickTimer`

### Cache/Transient
- `_supabaseEventCache` → {data, fetchedAt, loading, error} (3-min TTL)
- `_eventBulkSelectMode`, `_eventBulkSelectedIds`, `_completedLogPage`

---

## Section C — Per-Tab JS Ownership

| Tab | Render Function | Primary File | Key Dependencies |
|-----|-----------------|--------------|-------------------|
| 오늘 (action) | `renderActionTab(ctx)` | render-action.js | actions.js, utils.js |
| 할일 (all) | `renderAllTasksTab()` | render-all.js | tasks.js, actions.js |
| 본업 (work) | `renderWorkProjects()` | work.js | work-render.js, work-data.js |
| 이벤트 (events) | `renderEventsTab()` | render-events.js | render-events-supabase.js, Supabase API |
| 일상 (life) | `renderLifeTab()` | render-life.js | habits.js, rhythm-*.js |
| 통근 (commute) | `renderCommuteTab()` | commute-render.js | commute.js, lifeRhythm |
| 통계 (dashboard) | `renderDashboardTab(ctx)` | render-dashboard.js | render-dashboard-sections.js |
| 히스토리 (history) | `renderHistoryTab()` | render-all.js (line 500+) | ui-completion-log.js |
| 자문 (reflection) | `renderReflectionTab()` | reflection-render.js | reflection.js, reflection-trigger.js |

---

## Section D — Modal Matrix

| Modal ID | Defined | Opened From | Owner JS |
|----------|---------|-------------|----------|
| completion-overlay | HTML:82 | actions-complete.js | task completion animation |
| time-input-modal | HTML:96 | actions-complete.js | actual time logging |
| weekly-review-modal | HTML:118 | ui-weekly.js | Monday ritual |
| work-input-modal | HTML:135 | work-modal.js | work project CRUD |
| quick-edit-modal | HTML:149 | actions-ui.js | fast edit (no tab switch) |
| .reflection-modal-overlay | dynamic | reflection-render.js | evening/morning Q&A |
| .commute-modal-overlay | dynamic | commute.js | route CRUD |

---

## Section E — Mode System

**Basis:** `getCurrentMode(hour)` in utils.js  
**Modes:** morning/work/commute/evening/night/late-night  
**Used by:** action (colors), dashboard (filtering), reflection (Q selection)

---

## Section F — Top Shared Functions (window registry)

- switchTab, completeTask, editTask, deleteTask, quickAdd
- toggleSubtaskComplete, saveState, renderStatic, showToast
- getFilteredTasks, getCurrentMode, escapeHtml, formatDeadline
- toggleShuttle, openSettings, setDashboardSubView, showReflectionModal

---

## Section G — External Integrations

### Firebase Firestore
- User doc: `/users/{uid}`
- Sync fields: tasks, workProjects, templates, streak, lifeRhythm, commuteTracker, dailyReflection
- Listener: real-time + merge on tab focus
- Pattern: debounced writes + offline fallback to localStorage

### Supabase (telegram_messages)
- Read: events filtering by deadline/status
- Cache: 3-min TTL, manual refresh button
- Write: PATCH event status via Edge Function

### localStorage Keys
navigator-{tasks, shuttle, theme, tags, organizer-list, settings, streak, habitStreaks, templates, weekly-plan, work-projects, work-templates, commute-tracker, completion-log, deleted-ids, trash, life-rhythm, resolutions, reflection}

---

## Section H — Raw Observations

- Reflection & commute modals dynamically created (not pre-rendered in HTML)
- `_supabaseEventCache` is transient (not persisted to localStorage)
- Two streak trackers: `streak` (global) vs `dailyReflection.streak` (reflection only)
- Firebase listener can die and is re-registered on tab focus
- Timezone always uses browser local (no explicit UTC normalization)
- Quick-edit modal has inline buttons to launch full edit + article editor
- Commute color picker uses CSS vars in data but converts hex in modal
- Reflection modal has Firebase listener to detect same-user answers on other devices
- Work project metadata fields defined but never rendered
- Pomodoro state exists but no visible UI in current design
- Weekly plan `focusTasks` array never rendered in dashboard
- Deleted IDs cleanup is one-time at init (30-day retention)
- History view: two independent implementations (calendar in all.js, histogram in dashboard-sections.js)
- Subtask toggle state (expandedSubtasks) stored in appState but not synced to cloud
- Mode variables computed but only action/dashboard tabs visibly use them

---

**END OF RAW DATA**
