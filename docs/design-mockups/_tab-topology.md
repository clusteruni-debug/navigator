# Navigator 9-Tab Topology — Source of Truth

> **Session:** 2026-05-21
> **Purpose:** Single-source-of-truth integrated topology + ownership + connection map for 9 tabs. Enables per-tab rebuild-scope decisions before mockup work.
> **Stack inputs (do not duplicate, reference instead):**
> - `_design-system-audit.md` — token + a11y gap (HIGH-priority items: motion / elevation / a11y)
> - `_css-structure-audit.md` — CSS file roles + cascade risk + standing-rule violations
> - `_session-handoff.md` — IA decisions (carried) + anti-patterns
> - `_tab-topology-data.md` — raw enumeration (Tier A-H)
> - `section-inventory.md` — 14-section × 7-dimension grid (Target Role / Direction columns still empty)
> **NOT duplicated here. This doc = 9-tab axis integration + decision support.**

## §0 Critical correction from raw data

Prior assumption (mockup 04 / 05 + earlier session): **일상 / 통근 / 자문 = NEW from modal-격상**. CORRECTED by raw data Section C: all three **already exist as `renderXxxTab()` functions** (`render-life.js`, `commute-render.js`, `reflection-render.js`). 9-tab navigation is **already wired** in `navigator-v5.html:196-230` — 5 primary visible + 4 in 더보기 dropdown. The redesign work is *redesign-in-place*, NOT *promote-from-modal*.

Keyboard shortcuts (1-6 only, per data Section A) **lag behind the 9-tab nav** — gap for Phase 5 (wireframe + shortcut).

## §1 9-Tab Index

| # | Tab | Code Key | Status | Primary UI Slot | Mental Model (1 sentence) |
|---|---|---|---|---|---|
| 1 | 오늘 | `action` | EXISTING + redesigned (prev session) | Primary visible | "지금 뭐 해?" 1초 결정 가속기 |
| 2 | 할일 | `all` | EXISTING + redesigned (prev session) | Primary visible | 카테고리별 task 전체 조망 (kanban v3) |
| 3 | 본업 | `work` | EXISTING, not redesigned | Primary visible | 프로젝트 4-level 깊이 navigate ("게이트") |
| 4 | 이벤트 | `events` | EXISTING, not redesigned | Primary visible | 외부 수신 + 로컬 이벤트 시간축 관리 |
| 5 | 일상 | `life` | EXISTING (render-life.js), not redesigned | Primary visible | 라이프 리듬 + 약 복용 + 가족 inline |
| 6 | 통근 | `commute` | EXISTING (commute-render.js), not redesigned | 더보기 dropdown | 통근 route / trip 로그 + mode trigger |
| 7 | 통계 | `dashboard` | EXISTING + redesigned (prev session) | 더보기 dropdown | 오늘/패턴/수익/건강 4-sub-tab dashboard |
| 8 | 히스토리 | `history` | EXISTING (render-all.js:500+), not redesigned | 더보기 dropdown | 회고 + 캘린더 + 완료 누적 cross-cutting |
| 9 | 자문 | `reflection` | EXISTING (reflection-render.js), not redesigned | 더보기 dropdown | 아침/저녁 self-reflection Q&A + streak |

## §2 Per-Tab Brief

> Each tab × 7 dimensions: sections / CSS owns / JS owns / data sources / modals invoked / cross-tab connections / open IA. Rebuild scope (S/M/L/XL) noted at end.

### Tab 1 — 오늘 (action)
- **Sections:** NextAction focus / Status bar (clock + mode) / Rhythm strip (6 buttons) / Medication slots (2 groups: ADHD / 영양제) / Today task preview / Today completed log
- **CSS owns:** `tasks.css` (1417, oversized) / `dashboard.css` (status bar) / `rhythm.css` / `views.css` shared / `effects.css` (completion overlay) / `subtasks.css`
- **JS owns:** `render-action.js` (primary) / `actions-*.js` (8 files: complete / edit / adhd / repeat / add / bulk / ui / undo) / `rhythm-*.js` / `utils-daily.js`
- **Data:** appState.tasks (read+write) / lifeRhythm.today (read+write) / medication state / shuttleSuccess (read)
- **Modals invoked:** `time-input-modal` / `quick-edit-modal` / `completion-overlay`
- **Cross-tab connections:** shares appState.tasks with 할일/본업/통계/히스토리. lifeRhythm with 일상. Mode-system affects displayed NextAction.
- **Open IA:** status bar ownership (이 탭 vs 통계 탭 redundancy — handoff Outstanding)
- **Rebuild scope:** S (redesigned prev session, polish only)

### Tab 2 — 할일 (all)
- **Sections:** Stable anchors row / Search + filter chips / Kanban 4-column (본업 / 부업 / 일상 / 가족) with stable column anchors / Repeating task inline complete
- **CSS owns:** `tasks.css` (shared with 오늘) / `views.css` (primary list/kanban) / `forms.css` / `subtasks.css` / `modals.css` (quick edit)
- **JS owns:** `render-all.js` (primary, but also contains history at line 500+ — see §5 중복) / `tasks*.js` (queries, revenue, insights) / `actions-*.js`
- **Data:** appState.tasks (full read+CRUD) / tags / categoryFilter / searchQuery
- **Modals invoked:** `quick-edit-modal` / `weekly-review-modal`
- **Cross-tab connections:** 본업 column = subset of work-related tasks (no project link). Hierarchy: 할일 = "공항판" / 본업 = "게이트" (handoff resolved IA).
- **Open IA:** kanban pattern still uncertain (handoff "v3 likely wrong pattern" — Phase 0 conclusion = time-axis primary, kanban contradicts). Need re-check before further build.
- **Rebuild scope:** S (redesigned prev session — but mockup 03 v3 final IA marked uncertain in handoff, may need polish or partial rebuild)

### Tab 3 — 본업 (work)
- **Sections:** Header (project add / templates / MM report) / Focus card (지금 집중) / Dashboard project grid / Project detail (4-level: project → stage → subcategory → task) / 일반 업무 (project-unlinked) / Hold / Archived
- **Sub-views (modal or sub-page):** Calendar (work-calendar.js) / Timeline (work-timeline.js) / Reports (work-reports.js + work-modal-reports.js) / Templates (work-template-crud.js + work-templates.js)
- **CSS owns:** `work.css` (715) / `work-project.css` (988, oversized) / `work-tasks.css` (311) / `work-modal.css` (175) / `work-dashboard.css` (221) — 5 files / 2410 LOC total
- **JS owns:** 19 files: `work.js` / `work-render.js` / `work-render-detail.js` / `work-data.js` / `work-actions.js` / `work-project-crud.js` / `work-modal.js` / `work-modal-show.js` / `work-modal-reports.js` / `work-templates.js` / `work-template-crud.js` / `work-clipboard.js` / `work-analytics.js` (pulse) / `work-toggles.js` / `work-forms.js` / `work-calendar.js` / `work-timeline.js` / `work-reports.js` / `work-ro-template.js`
- **Data:** appState.workProjects (deep nested) / appState.tasks (filter by category=='본업' && workProjectId) / appState.activeWorkProject / appState.workFocusExpanded / appState.workView / appState.showCompletedGeneral
- **Modals invoked:** `work-input-modal` / template-manage / MM-report / `quick-edit-modal`
- **Cross-tab connections:** shares appState.tasks with 할일/오늘. completionLog write on work-task complete. 본업 project metadata (methodology/targetPlatform/recruitChannel/rewardType) — see §5 부족
- **Open IA:** sub-tab nav structure (mockup 05 proposed 프로젝트/캘린더/타임라인/리포트/템플릿 5-sub-tab). 3-axis stripe (pulse + stale + deadline) → 1-axis (pulse priority).
- **Rebuild scope:** L (largest tab, 5+ sub-views, mockup 05 = dashboard view only — need 05a detail / 05b calendar / 05c timeline / 05d report)

### Tab 4 — 이벤트 (events)
- **Sections:** Header (refresh) / 3-summary (미제출 / 긴급 / 참여완료) / Supabase 수신 section (3-subgroup: 긴급 / 마감전 / 미제출) / Local 내 이벤트 (same 3-subgroup) / 참여 완료 통합 로그 (paginated) / 휴지통
- **CSS owns:** `events.css` (655) / `views.css` shared / `history.css` shared
- **JS owns:** `render-events.js` (orchestrator) / `render-events-supabase.js` (Supabase cache + CRUD)
- **Data:** Supabase telegram_messages (read + PATCH `status`) / `_supabaseEventCache` (transient, see §5 개선) / appState.tasks (category=='부업' && source.type!='telegram-event' = 로컬 이벤트) / appState.completionLog (write on participate) / appState.trash (휴지통)
- **Modals invoked:** none direct (uses inline expand/collapse)
- **Cross-tab connections:** 로컬 이벤트 = 부업 task → also shows in 할일 부업 column. Completion log shared with 히스토리/통계.
- **Open IA:** time-axis primary (Phase 0 결론) vs current "수신/로컬 분리 + 긴급/마감전/미제출 중첩" 2-축. Mockup 04 = time-axis re-org. Pending decision: keep 수신/로컬 distinction OR fully merge.
- **Rebuild scope:** M (single-view, mockup 04 first cut exists, time-axis IA agreed)

### Tab 5 — 일상 (life)
- **Sections:** life rhythm tracker (6-button strip × time-of-day) / habits checkbox grid / family inline tasks (per resolved IA) / 일상 category tasks
- **CSS owns:** `life.css` (374) / `habits.css` (95) / `rhythm.css` (344) — 3 files
- **JS owns:** `render-life.js` / `life-*.js` (TBD count) / `habits.js` / `rhythm-*.js` (5 files: medication / merge / stats / history)
- **Data:** appState.lifeRhythm (today / history / settings) / appState.habitStreaks (localStorage) / appState.tasks (filter category=='일상' or '가족')
- **Modals invoked:** none confirmed (likely inline)
- **Cross-tab connections:** lifeRhythm shared with 오늘 (rhythm strip + medication). Habit streak in dashboard view. Family tasks per resolved IA = "일상 ⊃ 가족" inline.
- **Open IA:** 가족 sub-tag vs separate visual group inside 일상. 가족-color (`--cat-가족` amber) still applied at task level. Rhythm primary view vs habits primary view vs tasks primary view (3 surfaces compete for primary).
- **Rebuild scope:** M (3 sub-surfaces require clear primary axis decision)

### Tab 6 — 통근 (commute)
- **Sections:** Sub-tab (commuteSubTab) / Route management / Trip log / Shuttle toggle (S key) / Commute mode trigger
- **CSS owns:** `schedule.css` (409, "unclear ownership" per audit — verify if active) / `rhythm.css` shared / `history.css` shared
- **JS owns:** `commute.js` / `commute-render.js`
- **Data:** appState.commuteTracker (routes / trips / settings) / appState.commuteSubTab / appState.commuteRouteModal / appState.shuttleSuccess
- **Modals invoked:** `.commute-modal-overlay` (dynamic, route CRUD)
- **Cross-tab connections:** shuttleSuccess affects mode-system → 오늘 NextAction filter. commute color picker (CSS var → hex round-trip — see §5 개선).
- **Open IA:** schedule.css 활용 여부 — audit "unclear ownership" 의심. commute = single primary view OR sub-tab (routes/log/mode)?
- **Rebuild scope:** M (smallest tab content-wise but mode-system intersection)

### Tab 7 — 통계 (dashboard)
- **Sections:** Sub-tab nav (전체 / 수익 / 건강 / 패턴) / Hero v3 (no nested cards) / Day timeline / 8 analysis components (월 목표 / ROI 막대 / 수면-완료율 / 수면 부채 / 카테고리×시간대 heatmap / 반복 미루기 등)
- **CSS owns:** `dashboard.css` (1206, oversized) / `revenue.css` (397) / `work-dashboard.css` (221, has dup .weekly-stat-value) / `rhythm.css` shared
- **JS owns:** `render-dashboard.js` / `render-dashboard-sections.js`
- **Data:** appState.tasks (aggregate read) / appState.completionLog / appState.lifeRhythm / appState.workProjects (analytics) / Asset Manager clipboard (revenue) / appState.weeklyPlan (orphan — see §5 부족)
- **Modals invoked:** none direct (analytical view)
- **Cross-tab connections:** dashboardSubView state / Mode-system 일부 적용. completionLog cross-cutting. workProject pulse mirror.
- **Open IA:** status bar ownership (this tab vs 오늘 — handoff Outstanding). dashboardSubView state survival across sessions.
- **Rebuild scope:** S (redesigned prev session, polish only — but oversized CSS split pending)

### Tab 8 — 히스토리 (history)
- **Sections:** Calendar view (month grid) / Completed task chronological / Streak history / Retrospective surface (?)
- **CSS owns:** `history.css` (885, oversized + 1 hex fallback drift) / `views.css` shared / `events.css` shared
- **JS owns:** `render-all.js` line 500+ (BURIED — see §5 중복) / `tasks-history*.js` (2 files) / `ui-completion-log.js`
- **Data:** appState.completionLog / appState.streak / appState.tasks (completed filter)
- **Modals invoked:** none direct
- **Cross-tab connections:** completionLog primary owner (all completes write here). streak (global, separate from dailyReflection.streak — see §5 중복).
- **Open IA:** retrospective surface placement (handoff resolved: 9-tab #8 = cross-cutting retrospective + calendar + 통계). 2 history impl (calendar in render-all.js, histogram in render-dashboard-sections.js) consolidation.
- **Rebuild scope:** M (consolidation + re-org from render-all.js needed)

### Tab 9 — 자문 (reflection)
- **Sections:** Aspect selection (morning / evening / weekly) / Q&A interactive / Streak display / History
- **CSS owns:** `reflection.css` (305, 20 hex-fallback drift — VIOLATION) / `modals.css` shared / `effects.css` shared
- **JS owns:** `reflection-render.js` / `reflection.js` / `reflection-trigger.js` / (4 files total per handoff)
- **Data:** appState.dailyReflection (history / settings / streak — SEPARATE streak from global) / Firebase listener (multi-device same-user detection)
- **Modals invoked:** `.reflection-modal-overlay` (dynamic)
- **Cross-tab connections:** SEPARATE streak vs global streak (see §5 중복). Mode-system influences Q selection.
- **Open IA:** modal vs tab default surface — both exist (tab + modal trigger). reflect content overlap with 히스토리 retrospective. 30+ hex fallback drift risk.
- **Rebuild scope:** M (a11y + drift fix + structural decision: modal-only or tab-primary)

---

## §3 Cross-Cutting Connection Map

### §3.1 Mode System
- **Decision basis:** `getCurrentMode(hour)` in `utils.js` (raw data Section E). Older `getCurrentMode(hour, shuttleSuccess)` signature in ARCHITECTURE.md is stale.
- **Modes:** morning / work / commute / evening / night / late-night (English names per code). DESIGN.md says Korean (회사/생존/여유/출근/주말/휴식) — **drift confirmed** between code and design doc.
- **Tabs that respond visibly:** 오늘 (NextAction filter + status badge color), 통계 (filtering), 자문 (Q selection). 통근 triggers mode via shuttleSuccess.
- **Tabs that compute but don't surface:** 할일 / 본업 / 이벤트 / 일상 / 히스토리 — see §5 부족 (mode underutilized).

### §3.2 Category System (`--cat-*`)
- **Tokens:** `--cat-본업` indigo `#667eea` / `--cat-부업` pink `#f093fb` / `--cat-일상` emerald `#48bb78` / `--cat-가족` amber `#f6ad55`
- **2-level hierarchy (resolved IA):** **일** = 본업 + 부업 / **생활** = 일상 + 가족
- **Applied surfaces:** task-item 4px left bar (all tabs that render tasks). Category pill on task meta. Chart legend (통계).
- **NOT applied (gap):** 본업 tab itself doesn't accent with `--cat-본업` (mockup 05 fix). 이벤트 doesn't use `--cat-부업` (mockup 04 fix). 일상/가족 visual differentiation inside 일상 tab unresolved.

### §3.3 Data Flow Matrix
| appState field | Persist | Read by | Write by |
|---|---|---|---|
| `tasks` | localStorage + Firebase | 오늘 / 할일 / 본업 / 통계 / 히스토리 / 이벤트(local) | 오늘 / 할일 / 본업 / 이벤트(local) |
| `workProjects` | localStorage + Firebase | 본업 / 통계 (analytics) | 본업 only |
| `lifeRhythm` | localStorage + Firebase | 오늘 (rhythm + medication) / 일상 (primary) / 통계 (health) | 오늘 / 일상 |
| `commuteTracker` | localStorage + Firebase | 통근 (primary) | 통근 |
| `shuttleSuccess` | localStorage + Firebase | 오늘 (mode trigger) / 통근 (toggle UI) | 통근 (S-key) |
| `dailyReflection` | localStorage + Firebase | 자문 (primary) / 히스토리 (cross-ref?) | 자문 |
| `completionLog` | localStorage + Firebase | 히스토리 (primary) / 통계 (aggregate) | 오늘 / 할일 / 본업 / 이벤트 (all completes) |
| `streak` (global) | localStorage + Firebase | 오늘 (display) / 통계 / 히스토리 | 오늘 / 할일 / 본업 (any complete) |
| `_supabaseEventCache` | **transient** | 이벤트 only | 이벤트 only |
| `weeklyPlan.focusTasks` | localStorage + Firebase | **NONE (orphan)** | ui-weekly.js |
| `pomodoro` | session | (no UI surface in current design) | pomodoro.js (dead?) |
| `tags` / `categoryFilter` / `searchQuery` | session | 할일 / 본업 | 할일 (filter UI) |

### §3.4 Shared Modals (raw data Section D)
| Modal | Defined | Owned by | Invoked from tabs |
|---|---|---|---|
| `completion-overlay` | HTML pre-render L82 | `actions-complete.js` | all task-completing tabs (오늘 / 할일 / 본업 / 이벤트) |
| `time-input-modal` | HTML pre-render L96 | `actions-complete.js` | 오늘 / 할일 |
| `weekly-review-modal` | HTML pre-render L118 | `ui-weekly.js` | 할일 (Monday ritual) |
| `work-input-modal` | HTML pre-render L135 | `work-modal.js` | 본업 only |
| `quick-edit-modal` | HTML pre-render L149 | `actions-ui.js` | 오늘 / 할일 / 본업 |
| `.reflection-modal-overlay` | **dynamic create** | `reflection-render.js` | 자문 (tab also exists separately) |
| `.commute-modal-overlay` | **dynamic create** | `commute.js` | 통근 |

**Modal lifecycle drift:** 5 pre-rendered in HTML / 2 dynamic — see §5 중복.

### §3.5 Shared JS utilities (top `window.*` registrations)
- Task ops: `completeTask`, `editTask`, `deleteTask`, `quickAdd`, `toggleSubtaskComplete`
- State: `saveState`, `renderStatic`, `showToast`
- Queries: `getFilteredTasks`, `getCurrentMode`, `formatDeadline`
- Security: `escapeHtml`
- UI: `switchTab`, `toggleShuttle`, `openSettings`, `setDashboardSubView`, `showReflectionModal`

### §3.6 External Integrations
- **Firebase Firestore** — `/users/{uid}` doc. Sync fields: tasks / workProjects / templates / streak / lifeRhythm / commuteTracker / dailyReflection. Real-time listener + tab-focus re-register fallback.
- **Supabase telegram_messages** (이벤트 only) — REST anon-key read, PATCH `status` field. 3-min cache TTL, manual refresh.
- **Asset Manager clipboard** (통계 revenue) — copy-paste exchange (Side-job revenue cross-app).
- **localStorage keys (19):** `navigator-tasks/shuttle/theme/tags/organizer-list/settings/streak/habitStreaks/templates/weekly-plan/work-projects/work-templates/commute-tracker/completion-log/deleted-ids/trash/life-rhythm/resolutions/reflection`

## §4 Ownership Matrices

### §4.1 CSS file × Tab (P = primary owner / S = supporting / shared = used by many)

| CSS file | LOC | 오늘 | 할일 | 본업 | 이벤트 | 일상 | 통근 | 통계 | 히스토리 | 자문 |
|---|---|---|---|---|---|---|---|---|---|---|
| `base.css` | — | shared | shared | shared | shared | shared | shared | shared | shared | shared |
| `nav.css` | 449 | shared | shared | shared | shared | shared | shared | shared | shared | shared |
| `header.css` | 78 | shared | shared | shared | shared | shared | shared | shared | shared | shared |
| `buttons.css` | 126 | shared | shared | shared | shared | shared | shared | shared | shared | shared |
| `forms.css` | 388 | S | S | S | S | S | S | — | — | — |
| `modals.css` | 116 | S | S | S | — | — | S | — | — | S |
| `subtasks.css` | 423 | S | S | S | — | — | — | — | — | — |
| `focus.css` | 85 | S? | — | — | — | — | — | — | — | — |
| `effects.css` | 600 | S | S | S | S | S | S | S | S | S |
| `views.css` | 738 | — | **P** | — | **P** | — | — | — | S | — |
| `responsive.css` | 766 | shared | shared | shared | shared | shared | shared | shared | shared | shared |
| `typography-override.css` | 134 | shared | shared | shared | shared | shared | shared | shared | shared | shared |
| `tasks.css` | 1417 ⚠ | **P** | **P** | S | — | — | — | — | — | — |
| `dashboard.css` | 1206 ⚠ | S (status) | — | — | — | — | — | **P** | — | — |
| `schedule.css` | 409 ⚠? | — | — | — | — | — | **P?** | — | — | — |
| `events.css` | 655 | — | — | — | **P** | — | — | — | S | — |
| `history.css` | 885 ⚠ | — | — | — | S | — | S | — | **P** | — |
| `work.css` | 715 | — | — | **P** | — | — | — | — | — | — |
| `work-project.css` | 988 ⚠ | — | — | **P** | — | — | — | — | — | — |
| `work-tasks.css` | 311 | — | — | **P** | — | — | — | — | — | — |
| `work-modal.css` | 175 | — | — | **P** | — | — | — | — | — | — |
| `work-dashboard.css` | 221 | — | — | **P** | — | — | — | S | — | — |
| `profile.css` | 234 | S | — | — | — | — | — | — | — | — |
| `revenue.css` | 397 | — | — | — | — | — | — | **P** (수익) | — | — |
| `habits.css` | 95 | — | — | — | — | **P** | — | — | — | — |
| `life.css` | 374 | — | — | — | — | **P** | — | — | — | — |
| `rhythm.css` | 344 | S | — | — | — | **P** | S | S (health) | — | — |
| `settings.css` | 253 | — | — | — | — | — | — | — | — | — |
| `pomodoro.css` | 151 | S? | — | — | — | — | — | — | — | — |
| `command-palette.css` | 161 | — | — | — | — | — | — | — | — | — |
| `reflection.css` | 305 ⚠ | — | — | — | — | — | — | — | — | **P** |

⚠ = >800 LOC threshold OR standing-rule violation OR ownership uncertain.

### §4.2 JS file × Tab (primary render entry — full enumeration in `_tab-topology-data.md` Section C)

| Tab | Render fn | Primary file | Secondary files (count) |
|---|---|---|---|
| 오늘 | `renderActionTab(ctx)` | `render-action.js` | actions-*.js (8) / rhythm-*.js (5) / utils-daily.js |
| 할일 | `renderAllTasksTab()` | `render-all.js` | tasks*.js / actions-*.js |
| 본업 | `renderWorkProjects()` | `work.js` | work-*.js (18 more) |
| 이벤트 | `renderEventsTab()` | `render-events.js` | `render-events-supabase.js` + Supabase REST |
| 일상 | `renderLifeTab()` | `render-life.js` | habits.js / life-*.js / rhythm-*.js |
| 통근 | `renderCommuteTab()` | `commute-render.js` | commute.js / lifeRhythm crossref |
| 통계 | `renderDashboardTab(ctx)` | `render-dashboard.js` | `render-dashboard-sections.js` (8 analysis sections) |
| 히스토리 | `renderHistoryTab()` | `render-all.js:500+` ⚠ buried | tasks-history*.js (2) / ui-completion-log.js |
| 자문 | `renderReflectionTab()` | `reflection-render.js` | reflection.js / reflection-trigger.js |

⚠ history buried inside render-all.js = file-ownership ambiguity (see §5 중복).

---

## §5 Findings — 3 Categories

### §5.1 중복 (Duplication — meaningful, not just code dedup)

| # | Item | Where | Why duplicate | Resolution direction |
|---|---|---|---|---|
| D1 | **Dual streak system** | `appState.streak` (global) vs `appState.dailyReflection.streak` (reflection-only) | Two parallel completion-streak counters with different semantics, no cross-reporting | Decide single source — likely keep both but document boundary (global = task completion streak / reflection = reflection-answer streak). Surface both in 히스토리 with clear labels |
| D2 | **History impl × 2** | `render-all.js:500+` (calendar) + `render-dashboard-sections.js` (histogram) | History rendered from two surfaces independently with different code paths | Extract to dedicated `render-history.js`, remove from `render-all.js`, share calendar widget between 히스토리 + 통계 |
| D3 | **render-all.js dual ownership** | `render-all.js` owns 할일 (`renderAllTasksTab()`) + 히스토리 (`renderHistoryTab()` at line 500+) | Single file serves two distinct tabs | Split `render-all.js` → `render-all.js` (할일 only) + `render-history.js` (히스토리). Aligns with file-ownership matrix |
| D4 | **Modal lifecycle × 2 patterns** | 5 modals HTML pre-rendered (L82-222) vs 2 dynamic (reflection / commute) | Inconsistent modal creation strategy across team — no documented rule | Pick one pattern (recommend dynamic for cold-load perf), or document "pre-render = always-visible-from-page-load / dynamic = first-use-creates" rule |
| D5 | **`.weekly-stat-value` 3-way** | dashboard.css / work-dashboard.css / work-tasks.css | Same class name in 3 files, cascade-risk if styling differs | BEM rename: `.dashboard-weekly-stat-value` / `.work-weekly-stat-value` / `.work-tasks-weekly-stat-value` OR extract to shared primitive |
| D6 | **`.btn-export-asset` 2-way** | dashboard.css / revenue.css | Cross-tab button class redefinition | Verify diff first → if same: consolidate to revenue.css (or buttons.css). If different: BEM rename |
| D7 | **`.modal-*` namespace 3-way** | modals.css / work-modal.css / reflection.css | `.modal-header` / `.modal-body` etc. may shadow | Verify spec actually conflicts. If yes: prefix work-modal / reflection variants. If no: document as "intentional component override" pattern |

### §5.2 부족 (Missing — feature defined but unrendered, OR feature gap visible)

| # | Item | Where defined | Why missing | Resolution direction |
|---|---|---|---|---|
| M1 | **workProject metadata 5 fields unrendered** | data: `methodology` / `targetPlatform` / `recruitChannel` / `rewardType` / `participantCount` | Persisted but no UI surface to display/edit | Phase 6 본업 mockup must surface these (likely project detail view or expanded card meta) |
| M2 | **weeklyPlan.focusTasks orphan** | `ui-weekly.js` writes max 3 IDs | Stored but never displayed in dashboard or anywhere | Phase 6 통계 polish (or 오늘 hero) must surface weekly 3-focus. Otherwise — deprecate the field |
| M3 | **Pomodoro UI deactivated** | `appState.pomodoro` updates but no visible UI in current design | Feature exists in JS, no rendering | Decide: re-surface (overlay during work session?) OR deprecate field + remove pomodoro.js/css |
| M4 | **Keyboard shortcuts 1-6 only** | `navigator-v5.html:178-221` per data Section A | 9-tab nav wired but keyboard nav lags | Phase 5 wireframe must address: extend to 1-9 + remap older 1-6 if order changes (오늘=1 / 할일=2 / 본업=3 / 이벤트=4 / 일상=5 / 통근=6 / 통계=7 / 히스토리=8 / 자문=9) |
| M5 | **Mode-system underutilized** | computed in `utils.js`, visibly used only by 오늘 / 통계 / 자문 | 5 other tabs (할일 / 본업 / 이벤트 / 일상 / 히스토리) could leverage but don't | Per-tab mockup must answer: does this tab show mode? if yes how (hero tint? badge? filter?). If no — explicit "mode-agnostic" mark |
| M6 | **Subtask cloud sync gap** | `expandedSubtasks` appState only | Not in Firebase sync field list | Decide: ephemeral UI state (OK, document) OR add to Firebase sync (cross-device subtask state restoration) |
| M7 | **Manual purge UI for trash + deletedIds** | trash (per-task) + deletedIds (30-day retention, one-time init cleanup) | No user-facing manual purge | Phase 6 히스토리 or 설정 add purge button |

### §5.3 UX/UI 개선 (visible improvements per tab + cross-cutting)

#### Cross-cutting
| # | Item | Impact | Resolution direction |
|---|---|---|---|
| U1 | **a11y: infinite animation no prefers-reduced-motion** (profile.css:122 spin / responsive.css:352 runner-bounce) | WCAG 2.3.3 violation, vestibular accessibility blocker | Phase 2 token rebuild: add `@media (prefers-reduced-motion: reduce)` global override + wrap existing `animation:*infinite` |
| U2 | **Token drift: 21 hex fallbacks** (reflection.css 20 + history.css 1) | Silent revert risk if base.css tokens rename | Replace `var(--bg-card, #1E293B)` with `var(--bg-card)` — Phase 2 |
| U3 | **이모지 over-use in tab headers** (💼💰📋🎯📅 etc. across multiple tabs) | Standing rule violation (Lucide required per workspace CLAUDE.md) | Replace with `<svg>` inline Lucide. Per-tab mockup work surfaces this |
| U4 | **ARCHITECTURE.md drift** (5+ month stale: UUID / 6-tab→9-tab / category Korean / mode Korean / file count 66) | Onboarding + AI reference broken | Refresh as Phase 7 task |
| U5 | **Keyboard nav 1-6 stops at 6** | 9-tab structure but keyboard misses 7-9 | Phase 5 wireframe + nav.js update |

#### Per-tab improvements
| # | Tab | Item | Resolution |
|---|---|---|---|
| U6 | 오늘 | Status bar redundancy with 통계 (handoff Outstanding) | Decide ownership: likely 통계 = state owner / 오늘 = work surface (reference, no duplicate state) |
| U7 | 할일 | Kanban v3 IA may contradict Phase 0 time-axis primary | Verify against user mental model — keep kanban OR re-design to flat time-grouped (handoff "Likely re-direction") |
| U8 | 본업 | 3-axis stripe color (pulse + stale + deadline) ambiguous | 1-axis (pulse primary), stale to meta text "9일 정체" — per mockup 05 |
| U9 | 본업 | 4-action header bloat (RO v3 / 빈 프로젝트 / 템플릿 / 리포트) | Single "+ 새 프로젝트" + 더보기 3-dot menu — per mockup 05 |
| U10 | 이벤트 | `_supabaseEventCache` transient → reload 시 events 사라짐, manual refresh required | localStorage persist + revalidate on visibility OR background sync + skeleton state on reload |
| U11 | 이벤트 | Mixed 2-axis (수신/로컬 × 긴급/마감전/미제출) hides time priority | Time-axis primary (오늘 / 이번 주 / 다음 주 / 나중) + 수신/로컬 demoted to filter chip — per mockup 04 |
| U12 | 일상 | 3 sub-surfaces compete (rhythm / habits / family tasks) without primary axis | Decide primary view: probably rhythm strip top + habits + tasks below. Family tasks inline (resolved IA: 일상 ⊃ 가족) |
| U13 | 통근 | schedule.css "unclear ownership" — verify use | grep `.schedule-*` usage; if 통근 owns, rename schedule.css → commute.css; if vestigial, deprecate |
| U14 | 통근 | Color picker CSS-var → hex round-trip unnecessary | Refactor commute.js to use CSS var directly in color picker selection |
| U15 | 통계 | Firebase listener stale window (re-register on tab focus, line 124 init.js) | Heartbeat (every 30s ping) OR connectionState listener for live sync visibility |
| U16 | 통계 | Timezone browser-local — cross-device drift | Document or add UTC normalization (especially for completionLog timestamps) |
| U17 | 히스토리 | 2 impl (calendar + histogram) maintained independently | Per §5.1 D2 — consolidate to render-history.js, share calendar widget |
| U18 | 자문 | Tab + modal both exist for same content | Decide primary surface: modal-on-trigger only? tab-primary with modal as quick-access? |
| U19 | 자문 | reflection.css 20 hex fallback drift (also U2) | Same fix as U2 — single Phase 2 commit |

### §5.4 Resolved IA (carried from `_session-handoff.md`, not re-debated)

These are LOCKED — apply during mockup work without re-questioning:
- 완료 task surface ownership: 할일 = active only / category tab = local recent / 히스토리 = cross-cutting retrospective
- Repeating task inline complete: strikethrough + opacity 0.5 + 같은 column 유지
- 본업 hierarchy: 할일 = "공항판" / 본업 = "게이트" (4-level deep nav)
- Category 2-level: 일 = 본업+부업 / 생활 = 일상+가족
- Category = peripheral scan visual tool, NOT navigation axis. Time-axis primary.

## §6 Rebuild Scope Decision (per tab)

| # | Tab | Scope | Reason | Mockup status |
|---|---|---|---|---|
| 1 | 오늘 | **S** (polish) | Redesigned prev session, Codex applied. Only U6 status bar ownership pending. | 01-action-tab.html exists |
| 2 | 할일 | **S→M** | Redesigned prev session BUT v3 kanban IA flagged uncertain (handoff "likely wrong pattern"). Verify before polish; may need partial rebuild. | 03-all-tasks-tab.html v3 final exists but uncertain |
| 3 | 본업 | **L** | Largest tab. 5 sub-views (project / detail / calendar / timeline / report / template). Mockup 05 = dashboard only. 4 more sub-mockups needed. | 05-work-tab.html (dashboard only) exists, preliminary |
| 4 | 이벤트 | **M** | Single-view, time-axis IA decided. Mockup 04 first cut exists; needs §5.3 U10/U11 refinement + final sign-off | 04-events-tab.html exists, preliminary |
| 5 | 일상 | **M** | 3 sub-surfaces, primary axis decision needed. NO mockup yet. | TBD |
| 6 | 통근 | **M** | schedule.css ownership verify + color picker refactor + sub-tab decision. NO mockup yet. | TBD |
| 7 | 통계 | **S** | Redesigned prev session, polish only. Pending: status bar ownership (U6), oversized CSS split | 02-dashboard-tab.html exists |
| 8 | 히스토리 | **M** | render-all.js→render-history.js extraction + 2-impl consolidation + calendar widget share. NO mockup yet. | TBD |
| 9 | 자문 | **M** | a11y + drift fix + modal-vs-tab decision. NO mockup yet. | TBD |

**Execution order proposal:**
1. **First:** Verify Tab 2 (할일) IA — kanban OK or revert to time-grouped flat list? (decision blocks 03 mockup status)
2. **Cross-cutting prereq (Phase 2 token + a11y fix):** U1 (prefers-reduced-motion) + U2 (token drift) + U3 (이모지→Lucide skeleton) — 30-60 min commits
3. **L scope first:** 본업 (3) — biggest, sets pattern. Need 05a-detail / 05b-calendar / 05c-timeline / 05d-report sub-mockups
4. **M scope batch:** 이벤트 (4) refine → 히스토리 (8) consolidate → 일상 (5) → 통근 (6) → 자문 (9)
5. **S polish last:** 오늘 (1) status bar / 할일 (2) IA fix / 통계 (7) CSS split

Estimated total mockup work: 1 L (~6-8 hrs) + 5 M (5×3 = 15 hrs) + 3 S polish (3×1 = 3 hrs) = **~25-30 hrs** across multiple sessions.

## §6.5 User-Intent Routing Matrix (added 2026-05-22)

Maps "what user wants to do / find" → "which tab + sub-tab + filter path". Source of truth for navigation decisions and feature placement. Future feature additions MUST locate their entry point on this matrix.

### Active state (now / today / next)
| Intent | Path |
|---|---|
| "지금 뭐 해?" | 오늘 (NextAction focus card) |
| 오늘 마감 task 보기 | 오늘 → anchors / 할일 → 시간순 view → 오늘 group |
| 부업 이벤트 마감 임박 | 이벤트 (오늘 group, 자동 정렬) |
| 셔틀 토글 / 출근 모드 | 통근 → 오늘 sub-tab |
| 라이프 리듬 빠른 입력 | 일상 → 라이프 리듬 strip (top) |
| 약 복용 / 영양제 체크 | 일상 → 약 복용 (2-group) |
| 습관 체크 | 일상 → 오늘 습관 (3 toggle) |
| 결심 트래커 +1 기록 | 오늘 → mini summary "기록" 버튼 OR 일상 → 결심 트래커 |
| 자문 (아침/저녁) | 자문 → 오늘 sub-tab |

### Overview / cross-cutting
| Intent | Path |
|---|---|
| 전체 카테고리 task 조망 | 할일 → 시간순 view (default) |
| 카테고리 별 분류 보기 | 할일 → 카테고리 view (kanban) |
| 본업 전체 task (프로젝트 + 일반업무 mix) | 본업 → 전체 sub-tab |
| 본업 프로젝트 카드 grid | 본업 → 프로젝트 sub-tab → 카드 view |
| 프로젝트 캘린더 시각화 | 본업 → 프로젝트 → 캘린더 view |
| 프로젝트 타임라인 (간트) | 본업 → 프로젝트 → 타임라인 view |
| 일반 업무 list (정렬) | 본업 → 일반 업무 sub-tab |

### Retrospective / archive
| Intent | Path |
|---|---|
| 오늘 완료한 거 잠깐 확인 | toast + undo (자동 5초, 진행 탭 inline) |
| 본업 일반 업무 최근 7일 완료 | 본업 → 일반 업무 → 하단 mini expander |
| 전체 히스토리 캘린더 | 히스토리 → 캘린더 sub-tab |
| 일반 업무 5월 history | 히스토리 → 리스트 → 출처 "일반 업무" + 카테고리 "본업" + 기간 "이번 달" |
| 본업 프로젝트 task 만 5월 | 히스토리 → 리스트 → 출처 "프로젝트 task" + 카테고리 "본업" |
| 부업 이벤트 누적 수익 | 히스토리 → 통계 OR 통계 → 수익 sub-tab |
| 최근 자문 답변 본문 | 자문 → 최근 sub-tab (모든 답변 본문 표시) |

### Analytics / pattern
| Intent | Path |
|---|---|
| 오늘 한 줄 요약 | 통계 → 전체 sub-tab (Hero) |
| 이번 주 분포 (카테고리 × 요일) | 통계 → 패턴 sub-tab (heatmap) |
| 부업 수익 추이 | 통계 → 수익 sub-tab |
| 수면 / 약 / 습관 통계 | 통계 → 건강 sub-tab |
| 발견된 패턴 (정체 task / 골든타임) | 통계 → 패턴 sub-tab |
| 자문 → 본업 완료 상관 | 자문 → 통계 sub-tab OR 통계 → 패턴 |
| streak 변화 history | 통계 → 패턴 OR 히스토리 → 통계 |

### Settings / management
| Intent | Path |
|---|---|
| 새 프로젝트 등록 | 본업 → "새 프로젝트" 버튼 → modal |
| RO v3 표준 자동 주입 | 본업 → 더보기 → RO v3 |
| 통근 경로 CRUD | 통근 → 경로 sub-tab |
| 결심 항목 추가 / 편집 | 일상 → 결심 트래커 → "+ 결심 추가" |
| 약 슬롯 시간 변경 | 일상 → 약 복용 hover → 시간 수정 |

### Routing rules
- **Single destination rule**: 모든 완료 데이터 = 히스토리 탭. mini expander 는 transient 확인만 (7일 윈도우 권고).
- **Active vs retrospective**: 진행 탭 = 지금 상태만. 누적 / 분석 = 통계 또는 히스토리.
- **Sub-tab vs filter chip**: sub-tab = 다른 *axis* (예: 시간 vs 카테고리). filter chip = 같은 axis 안 *조건*.
- **Add feature checklist**: 신규 feature 추가 시 (1) 활성 destination 1개 + (2) 히스토리 routing + (3) 통계 routing 3개 확보.

## §7 Doc Maintenance

This doc updates when:
- A tab's IA decision changes (then update §2 + §5.4)
- A new finding emerges (append to §5)
- A rebuild scope changes (update §6)
- ARCHITECTURE.md is refreshed (update §0 correction note)

**Sources to keep in sync:** `_design-system-audit.md` / `_css-structure-audit.md` / `_session-handoff.md` / `section-inventory.md` (Target Role / Direction columns — owner input).

---

**END `_tab-topology.md` v1 — 2026-05-21**
