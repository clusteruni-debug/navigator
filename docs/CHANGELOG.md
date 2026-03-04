# CHANGELOG

<!--
## Session Entry Template
Each session follows the format below.

## [YYYY-MM-DD] (Session N)
> Files: `file1`, `file2` | +insertions/-deletions | DB: none

### Changes
- **Feature/Fix title**
  - Details

### Commits
```
hash type: message
```

### Next Tasks
- Item
-->

## [2026-02-11] (Session 29)
> `js/rhythm.js`, `navigator-v5.html`, `sw.js` | +162/-137 | DB: none

### Changes
- **Life rhythm data reset/loss root cause fix (5 items)** ⭐
  - Phase 1: Date reference unification — `getLocalDateStr()` → `getLogicalDate()` at 10 locations
    - Rhythm reset now operates on `dayStartHour` (default 5 AM) basis, consistent with task system
    - 3 AM entries → correctly recorded on yesterday's card
  - Phase 2: `checkRhythmDayChange` empty today sync fix
    - `saveLifeRhythm()` → direct `localStorage.setItem()` (without updatedAt)
    - Fixed empty today overwriting actual data from other devices
  - Phase 3: Added `navigator-life-rhythm` save to `_doSaveState()`
    - Rhythm save that only existed in `_doSaveStateLocalOnly()` now also included in `_doSaveState()`
  - Phase 4: Field-level supplementary merge (`mergeRhythmToday` + `mergeRhythmHistory`)
    - Supplements winner's null fields with loser's values (supplementary merge)
    - Device A: wakeUp, Device B: sleep → both preserved
  - Phase 5: Intentional deletion propagation — `_deletedFields` metadata introduced
    - Fixed bug where intentional deletion was resurrected by supplementary merge with other device data
    - `_deletedFields` array distinguishes "deleted" vs "not recorded" — zero rendering code changes
    - `markFieldDeleted()` on delete, `unmarkFieldDeleted()` on record/edit
    - `_deletedFields` checked in both `mergeRhythmToday` + `mergeRhythmHistory`

- **day-change duplicate code refactoring** — extracted `transitionRhythmDay()` common function
  - 5 duplicates (recordMedication, editMedication, recordLifeRhythm, editLifeRhythm, checkRhythmDayChange, loadLifeRhythm) → unified into 1
  - 112 lines deleted, 41 lines added (71 net lines reduced)
  - `_deletedFields` automatically removed on history migration

- **SW v6.4 cache version bump**

### Commits
```
65692d3 fix: 라이프 리듬 데이터 초기화/유실 근본 수정 4건
d58b936 fix: 리듬 삭제 전파 — _deletedFields 메타데이터로 의도적 삭제 보존
f1af142 refactor: day-change 중복 제거 — transitionRhythmDay 공통 함수
405b4b0 chore: SW v6.4 캐시 버전 범프
```

### Next Tasks
- Rhythm loss reproduction test (early morning hours, multi-device sync)

---

## [2026-02-10] (Session 28)
> `navigator-v5.html`, `js/rhythm.js` | +66/-15 | DB: none

### Changes
- **Mobile rhythm/medication data loss root cause fix** ⭐
  - Cause: `loadLifeRhythm()` called `saveLifeRhythm()` at app start → `updatedAt` was refreshed, causing empty local data to overwrite actual cloud records during `loadFromFirebase` merge
  - Fix: Replaced `saveLifeRhythm()` with direct `localStorage.setItem()` (no updatedAt refresh)
  - Effect: Cloud rhythm/medication records always merge correctly

- **Mobile tab navigation overflow fix**
  - 5 tab buttons exceeded mobile screen width (~375px) causing layout break
  - Below 767px: reduced padding/gap/font + hidden SVG icons

- **Sync merge enhancement (3 items)**
  - [M-2] weeklyPlan: overwrite → `updatedAt`-based latest-wins merge (loadFromFirebase + onSnapshot)
  - [M-5] commuteTracker.trips: shallow merge → date→direction deep union (prevents loss of different directions on same date)
  - [L-1] onSnapshot syncBack: call `syncToFirebase()` after merge — resolves 3+ device asymmetry (1.5s debounce, ping-pong prevention)

- **escapeHtml performance optimization**
  - DOM `createElement` → string `replace` (106+ calls per render, ~5x faster)

- **renderStatic analysis results**
  - Already uses per-tab conditional rendering (ternary) — inactive tabs are not evaluated
  - Further optimization would require virtual DOM level, so kept as-is

### Commits
```
e85975c fix: loadLifeRhythm에서 updatedAt 갱신 제거 — 모바일 리듬/복약 데이터 유실 방지
924d57b fix: 모바일 탭 네비게이션 오버플로우 수정 — 패딩/폰트 축소 + SVG 아이콘 숨김
059b7e6 fix: 동기화 병합 4건 + escapeHtml 성능 최적화
```

### Next Tasks
- Update `ARTICLE_EDITOR_URL` constant after Article Editor deploy URL is finalized

---

## [2026-02-10] (Session 28-3)
> `navigator-v5.html`, `CLAUDE.md` | Bug fixes 4 items + Article Editor integration | DB: none

### Changes
- **Navigator full review → 4 new bug fixes**
  - Modal removal race condition → `?.remove()` optional chaining
  - Download link cleanup → try/finally guarantee
  - `editCompletedAt` date validation → `isNaN(oldDate.getTime())` guard
  - Clipboard copy fallback → textarea execCommand method added (1 missing location)

- **x-article-editor integration** ⭐
  - `openArticleEditor(taskId)` — passes task title/description as URL parameters
  - Added "Article Write" button to quick edit modal
  - `ARTICLE_EDITOR_URL` constant for configurable URL (default: localhost:3000)
  - Safe URL opening via `handleGo()` (protocol validation)
  - CLAUDE.md integration status updated (planned → completed)

### Commits
```
068001a feat: x-article-editor 연동 + Navigator 버그 수정 4건
```

### Next Tasks
- Update `ARTICLE_EDITOR_URL` constant after Article Editor deploy URL is finalized

---

## [2026-02-10] (Session 28-2)
> `navigator-v5.html` | Full usability review and fixes | DB: none

### Changes
- **Mobile CSS usability improvements (4 items)**
  - Tab button touch target 44px ensured (padding 12px + min-height: 44px)
  - More menu mobile center alignment (right:0 → transform: translateX(-50%)) — prevents off-screen clipping
  - iOS auto-zoom prevention (input/textarea/select font-size: 16px !important)
  - Mobile section spacing gap:0 → gap:12px — visual separation between columns

- **escapeAttr comprehensive application — 91 locations** ⭐
  - task.id onclick/onchange 66 locations + project.id onclick 25 locations
  - Template literals: `'${task.id}'` → `'${escapeAttr(task.id)}'`
  - String concatenation: `\'' + task.id + '\''` → `\'' + escapeAttr(task.id) + '\''`
  - Includes events tab toggleEventSelection, restoreFromTrash, permanentDeleteFromTrash
  - Defense-in-depth completed on top of validateTask id regex([a-zA-Z0-9_-])

- **File import type validation hardening**
  - Removed `text/*` allowance → only `.json` extension or `json` MIME type allowed

### Commits
```
b970cf4 fix: 모바일 UX 4건 + escapeAttr 전수 적용 91곳 + 임포트 검증 강화
```

### Next Tasks
- No known unresolved bugs/improvements

---

## [2026-02-10] (Session 27)
> `navigator-v5.html` | +83/-32 | DB: none

### Changes
- **onSnapshot cross-device sync miss fix** ⭐
  - Before: `cloudUpdated > lastSyncTime` time comparison → bug blocking legitimate updates from other devices due to clock skew
  - Fix: Replaced with `lastOwnWriteTimestamp === data.lastUpdated` self-write skip
  - Effect: Other device data always received, only self-writes prevented from ping-pong
  - Delegates to per-merge function (mergeTasks, mergeRhythmToday, etc.) updatedAt-based conflict resolution

- **loadFromFirebase race condition fixes (4 items)**
  - RC-1: `pendingSync = false` on loadFromFirebase completion — syncToFirebase(true) does full upload so queued sync unnecessary
  - RC-2: Cancel `syncDebounceTimer` on loadFromFirebase start — prevents stale data upload before merge
  - RC-3: `!isLoadingFromCloud` guard on onSnapshot — blocks concurrent appState modification during load
  - RC-4: `pendingSync` re-invoke depth limited to 3 in finally block — prevents infinite recursion

- **Full review: security + sync + bug fixes (15 items)** ⭐
  - [C-1] Added `{ merge: true }` to `updateLinkedEventStatus` setDoc — prevents full document overwrite
  - [H-1] `validateTask` id format validation (`[a-zA-Z0-9_-]` regex) — blocks onclick injection
  - [H-2] Import modal XSS — `escapeHtml` applied to 3 locations (deadline, estimatedTime, expectedRevenue)
  - [H-3] `escapeAttr` applied to tag onclick — blocks XSS via quote-containing tags
  - [H-4] `handleGo` blocks javascript:/data: protocols — only http/https allowed
  - [H-5] Added onSnapshot error callback — detects listener failures + updates syncStatus
  - [H-6] Removed sleep time calculation double correction — fixed 25-hour display bug for afternoon sleep
  - [M-1] `_doSaveStateLocalOnly()` called after onSnapshot merge — browser crash resilience
  - [M-3] Added `updateSyncIndicator()` to `loadFromFirebase` catch
  - [M-4] Removed `cleanupOldCompletedTasks()` from onSnapshot — prevents remote sync side effects
  - [M-6] Applied `encodeURIComponent` to Supabase eventId — prevents URL injection
  - [M-8] streak.lastActiveDate `toDateString()` → `getLocalDateStr()` — fixes year-change comparison error
  - [M-9] showUndoToast interval moved to module-level variable — prevents memory leak
  - [M-10] Added `updatedAt` to importTaskDirectly/confirmImportTask — improves merge accuracy
  - [M-11] toMins() NaN defense — blocks NaN propagation from malformed time strings

- **Mobile layout improvements**
  - Next Action placed at mobile top (`order: -1`)
  - Full list deduplication (`.task-list-full` hidden on mobile)

### Commits
```
81d416d fix: onSnapshot 시간 게이트를 자기-쓰기 스킵으로 교체 — 기기 간 리듬/복약 동기화 누락 수정
286ac97 fix: loadFromFirebase 레이스 컨디션 4건 수정 — onSnapshot 가드, 디바운스 취소, pendingSync 리셋, 재귀 제한
d45336b fix: 전체 검토 보안+동기화+버그 15건 일괄 수정
0b01831 fix: 모바일 레이아웃 개선 — Next Action 최상단 배치 + 전체 목록 중복 제거
```

### Next Tasks
- ~~weeklyPlan merge~~ → fixed in Session 28
- ~~commuteTracker.trips merge~~ → fixed in Session 28
- ~~onSnapshot syncBack~~ → fixed in Session 28
- ~~escapeHtml optimization~~ → fixed in Session 28
- ~~renderStatic partial rendering~~ → analysis shows conditional rendering already applied

---

## [2026-02-09] (Session 26)
> `js/rhythm.js`, `navigator-v5.html` | +6/-2 | DB: none

### Changes
- **Life rhythm cross-device sync enhancement** ⭐
  - `saveLifeRhythm()`: Changed to `syncToFirebase(true)` immediate sync (removed 1.5s debounce — prevents loss before browser close)
  - `_doSaveStateLocalOnly()`: Added `navigator-life-rhythm` localStorage save (fixed missing rhythm backup on beforeunload)
  - `visibilitychange` (tab hidden): Added immediate rhythm data localStorage save (preserved on tab switch/close)

### Commits
```
c585ad7 fix: 라이프 리듬 기기 간 동기화 강화 — 즉시 업로드 + beforeunload 백업
```

### Next Tasks
- None

---

## [2026-02-09] (Session 25)
> `navigator-v5.html`, `js/rhythm.js`, `js/commute.js` | DB: none

### Changes
- **XSS onclick comprehensive defense** ⭐
  - Added `escapeAttr()` function: backslash+quote JS escape then HTML escape
  - Applied to commute.js 5 locations, rhythm.js 9 locations, navigator-v5.html 5 locations
  - Unified existing `escapeHtml().replace()` patterns to `escapeAttr()`

- **Defensive coding — midnight crossing + settings null defense**
  - editMedication: On midnight crossing, today → history move then create new today
  - showCommuteTagPrompt: settings null defense

- **Timer memory leak fixes**
  - commute tag prompt 10s timer clearTimeout on manual close
  - resumePomodoro clears existing interval before re-registering

- **Modal UX improvements** ⭐
  - Brain dump modal: confirm dialog on outside click/cancel/ESC when content exists
  - ESC key: added close to 6 missing modals (time input, work, quick edit, import, edit completed, edit log, telegram, weekly review)
  - Tab focus trap: added `.work-modal-overlay`, `.time-input-modal.show` selectors

- **2nd review fixes** ⭐
  - XSS missing 1 location: `escapeAttr` applied to `editLifeRhythm/deleteLifeRhythm` onclick
  - `toMins()` 3 locations: NaN defense for malformed time formats (empty string, no colon)
  - `minsToTime/minsToHM`: undefined/NaN defense + Math.round prevents decimal/"07:60"
  - `getCommuteRecommendation`: settings.targetArrivalTime null crash defense
  - ESC handler 2 additions: rhythm action menu + commute route modal

### Commits
```
5f5842d fix: onclick XSS 전수 방어 — escapeAttr() 함수 추가 및 적용
b82fcf6 fix: 방어적 코딩 — 자정 넘김 복약 날짜 오류 + settings null 방어
f1b987c fix: 타이머 메모리 누수 수정 — commute tag timeout + pomodoro resume
65f7345 fix: 모달 UX 개선 — brain dump 데이터 손실 방지 + ESC/포커스 트랩 전수 적용
236774f fix: 2차 검토 — XSS 누락 1곳 + NaN 방어 + ESC 핸들러 2곳 추가
```

### Next Tasks
- None (1st + 2nd full review complete)

---

## [2026-02-09] (Session 23-24)
> `navigator-v5.html`, `js/rhythm.js`, `js/commute.js` | DB: deletedIds.commuteRoutes, today.updatedAt, history[date].updatedAt, route.updatedAt added

### Changes
- **Life rhythm cross-device sync bug fix**
  - New `mergeRhythmToday()` function (rhythm.js) — compares dates then merges
  - On today date mismatch: new date → today, old data → moved to history
  - Applied to all 3 locations: loadFromFirebase / onSnapshot / handleFileImport

- **Rhythm deletion reverting on other devices bug fix** ⭐
  - Root cause: merging with `||` operator — `null || "07:00"` = `"07:00"` → deletion cannot propagate
  - Applied `updatedAt` to `saveLifeRhythm()`, "last writer wins" to `mergeRhythmToday()`
  - Added `localStorage.setItem` after loadFromFirebase/onSnapshot merge

- **mergeRhythmHistory also uses updatedAt-based last-writer-wins**
  - Records updatedAt timestamp on history entry edit
  - Added updatedAt to editLifeRhythmHistory, editMedicationHistory

- **Commute route edit sync** ⭐
  - Added `updatedAt` timestamp to `saveCommuteRoute()`
  - updatedAt comparison during loadFromFirebase/onSnapshot/handleFileImport route merge
  - Existing routes fall back to createdAt for backward compatibility

- **"Changes received" toast completely removed**
  - Ping-pong loop removed + toast itself removed — sync-indicator is sufficient

- **Commute tracker sync bug fix**
  - Added commuteTracker merge to onSnapshot, deletedIds.commuteRoutes soft-delete

- **SVG icon replacement → reverted**
  - SVG icons applied then reverted based on user feedback (emojis have better visibility)

### Commits
```
a5e4ad0 fix: 기기 간 동기화 버그 8건 수정
8ce320a fix: onSnapshot 핑퐁 루프 제거
84f92ad fix: 동기화 수신 토스트 제거
2788d29 fix: 리듬 삭제 다른 기기에서 되돌아가는 버그 수정 (updatedAt)
9784a8a fix: mergeRhythmHistory도 updatedAt 기반 last-writer-wins
9e6806c fix: 통근 루트 수정 동기화 (updatedAt)
b07b54e feat: SVG 아이콘 교체 (reverted: 06454d0)
```

### Next Tasks
- Full code review → fixed in Session 25

---

## [2026-02-08] (Session 22)
> `navigator-v5.html`, `docs/CHANGELOG.md` | DB: none

### Changes
- **SVG icon system setup + emoji → SVG replacement**
  - `SVG_ICONS` constant + `svgIcon(name, size)` helper function added (Lucide style, stroke-based)
  - 20 icons defined: target, briefcase, dollar, home, menu, bus, bar-chart, calendar, list, chevron-down, edit, trash, plus, x, check, bell, clock, play, pause, search
  - `.svg-icon` CSS class added (inline-block, vertical-align, currentColor inheritance)
  - **Tab navigation 9 emojis → SVG**: target, briefcase, dollar, home, menu, bus, bar-chart, list, calendar
  - **Edit buttons 12 pencil emojis → svgIcon('edit', 14)**
  - **Delete buttons 10 trash emojis → svgIcon('trash', 14)**
  - **Add buttons 5 plus/memo emojis → svgIcon('plus', 16)**
  - Cross-platform icon consistency achieved (resolves OS-specific emoji rendering differences)

### Commits
```
0b1103c feat: SVG 아이콘 시스템 구축 + 이모지→SVG 교체 (탭/액션 버튼 36개)
9b57bfc feat: 접근성 개선 심화 — aria-live, skip-nav, 포커스 관리, 시맨틱 랜드마크
c3249d5 fix: 동기화 중복 버그 수정 — ID 타입 불일치 + online 핸들러 순서 교정
3da6ada fix: P0+P1 버그 수정 — saveCompletedAt 따옴표 + 중복 함수 정의 3건 제거
61e94e6 fix: 전체 버그 스캔 — P0×7 + P1×12 + P2×6 수정
81397fa fix: 2차 검증 — XSS 11곳 + _summary 2곳 + _navFunctions ReferenceError 수정
```

- **Accessibility deep improvements (WCAG 2.1 Level AA)**
  - `srAnnounce()` utility — real-time screen reader announcements via aria-live assertive region
  - Added `role="status"` + `aria-live="polite"` to toast notifications (applied to all 96 showToast calls)
  - Skip-to-content link — keyboard user navigation skip
  - `.sr-only` CSS utility class — visually hidden + screen reader accessible
  - Auto focus on tab switch (tabContent.focus) + screen reader announcement
  - `role="navigation"` + `aria-label` semantic landmarks
  - `role="main"` main content landmark (#root)
  - Screen reader announcements on task completion/deletion (srAnnounce)

- **Sync duplication bug fix (work/daily item duplication)**
  - **Root cause**: ID key type mismatch in `mergeTasks()`/`mergeById()` — local (string IDs) vs cloud (numeric IDs) treated as different items
  - `mergeTasks()`, `mergeById()` — normalize IDs to strings via `normalizeId()` before merge
  - Added `deduplicateAll()` function — ID-based deduplication (latest updatedAt priority)
  - Called at 3 points: app start (`loadState`), Firebase load (`loadFromFirebase`), realtime sync (`startRealtimeSync`)

- **Bug fixes (P0 + P1)**
  - **P0**: `saveCompletedAt(${id})` → `saveCompletedAt('${id}')` — UUID without quotes breaks onclick
  - **P1**: Removed duplicate `editCompletionLogEntry` definition — deleted prompt-based (dead), kept modal-based (active)
  - **P1**: Removed duplicate `addFromTemplate` definition — deleted appState.templates-based (dead), kept quickTemplates-based (active)
  - **P1**: Removed duplicate `saveAsTemplate` definition — deleted task object-based (dead), kept workProject-based (active)
  - **P1**: Removed `calculateCompletionStreak` dead else-if branch — compressed data is array, already handled by Array.isArray condition

- **Full bug scan + major fixes (P0x7 + P1x12 + P2x6)**
  - **P0 onclick quote missing (6 items)**: `completeTask`, `toggleEventSelection`(2), `toggleEventGroupSelect`(2), `restoreFromTrash`/`permanentDeleteFromTrash`, `deleteWorkLog` — UUID interpreted as JS variable, completely breaking functionality
  - **P0 `render()` → `renderStatic()`**: 3 locations in Escape key modal close calling non-existent `render()` → crash
  - **P0 `getHourlyProductivity()` _summary crash**: compressed data's `e.at` undefined → TypeError
  - **P1 `getCategoryDistribution()` _summary miscounting**: fixed to utilize compressed category data
  - **P1 `getDayOfWeekProductivity()` _summary count + UTC offset**: `entries.length` → `e.count`, UTC prevention `T12:00:00`
  - **P1 `toggleFocusTask()` parseInt → UUID regex parsing**: fixed parseInt failing on UUID parsing
  - **P1 `moveWorkProjectStage`/`copyWorkProjectToClipboard`**: global stage array → use `getStageName()`
  - **P1 XSS unescaped (10 locations)**: nextAction.title, filteredTasks[0].title, st.text, previewText, task.link(onclick 3+href 1), detailedTask.title, detailedTask.link(3)
  - **P1 XSS `log.content`/`log.date`**: escapeHtml applied to work task log
  - **P2 `getRevenueStats` completionLog integration**: appState.tasks only → completionLog-based total revenue aggregation
  - **P2 `renderRecentHistory` _summary skip**: prevents "undefined" display
  - **P2 `saveCompletedAt` revenue type**: `task.expectedRevenue` → `Number(task.expectedRevenue)`
  - **P2 `validateTask` missing fields**: added description, startDate, telegramEventId preservation
  - **P2 Escape shortcuts help close**: moved dead code shortcuts help dismiss to early handler
  - **P2 `syncToFirebase` guard**: prevents unnecessary calls when not logged in during template-import
  - **P2 `quickAddValue` escapeHtml**: prevents value attribute injection

- **2nd verification — additional bug fixes**
  - **XSS unescaped 11 additional locations**: st.text (work subtask), stageName (HTML+onclick 2), subcat.name (onclick 2), task.title (onclick 2), stageNameForModal (label 2), t.stageNames (template), nextAction.link, filteredTasks[0].link, entry.at (input value)
  - **`getCompletedTasksByDate` _summary skip**: prevents "undefined" display in calendar detail
  - **`mergeCompletionLog` _summary conflict resolution**: when only one side (local/cloud) is compressed, prioritize detailed data
  - **`_navFunctions` 10 undefined functions removed**: external JS (commute.js/rhythm.js) register directly on window, so inline references unnecessary → prevents ReferenceError

### Next Tasks
- Full 3rd final verification complete — 0 remaining bugs confirmed
- SVG icon additional replacement (P2, pending)
- Life rhythm 30-day long-term statistics — completed

---

## [2026-02-08] (Session 21)
> `navigator-v5.html`, `js/commute.js` (new), `js/rhythm.js` (new), `CLAUDE.md`, `docs/CHANGELOG.md` | +2700/-2900 | DB: none

### Changes
- **Refactoring Prompt 1: ID generation method replacement (Date.now → crypto.randomUUID)**
  - Added `generateId()` helper function — unified all ID generation into a single function
  - Replaced 29 `Date.now()` ID generation points with `generateId()`
  - Added `migrateNumericIds()` function — auto-migrates existing numeric IDs to strings
    - Targets: tasks, templates, workProjects(+stages/subcategories/tasks), workTemplates, trash, activeWorkProject
    - Called at 3 points: loadState(), loadFromFirebase(), startRealtimeSync()
  - Added quotes to ID arguments in ~85 onclick handlers (UUID string compatibility)
  - Fixed numeric ID parsing code: `parseInt(projectId)` → `String(projectId)` etc.
  - 100% backward compatible with existing data (migration runs automatically)

- **Refactoring Prompt 2: appState JSDoc schema documentation**
  - 12 `@typedef` definitions: Task, Subtask, WorkProject, WorkStage, WorkSubcategory, WorkTask, CompletionLogEntry, CommuteRoute, CommuteTrip, MedicationSlot, LifeRhythmDay, AppState
  - All properties + nested object fields documented in AppState typedef (~180 lines)
  - `@type {AppState}` annotation for IDE autocomplete/type checking support

- **Refactoring Prompt 3: Core test scenarios documented in CLAUDE.md**
  - 10 categories x checklist format: Task CRUD, Recurring Tasks, Firebase Sync, ID Compatibility, Work Projects, Life Rhythm, Commute Tracker, UI Rendering, Data Export/Import, Edge Cases
  - Selective verification of items relevant to modification scope (full verification unnecessary)

- **Refactoring Prompt 4: CHANGELOG metadata block structure improvement**
  - Added per-session metadata blocks (files/line changes/DB)
  - Session template guide placed at top
  - Unified section names: Changes / Commits / Next Tasks

- **Refactoring Prompt 5: Module separation — Commute Tracker → js/commute.js**
  - Separated 22 commute functions to `js/commute.js` (~515 lines)
  - Removed ~512 lines from navigator-v5.html, replaced with comments
  - 10 functions registered globally via `window.xxx` (onclick handler compatibility)
  - Added `<script src="js/commute.js"></script>` tag
  - Dependencies: appState, renderStatic, syncToFirebase, showToast, escapeHtml, getLocalDateStr, generateId

- **Refactoring Prompt 6: Module separation — Life Rhythm → js/rhythm.js**
  - Separated 30 rhythm/medication functions to `js/rhythm.js` (~1150 lines)
  - `mergeRhythmHistory` (Firebase merge area) also moved
  - Removed ~1180 lines from navigator-v5.html
  - `getLocalDateStr`/`getLocalDateTimeStr` shared utilities kept in HTML
  - **Script architecture improvement**: Split main `<script>` into function definition / initialization sections
    - External modules (commute.js, rhythm.js) placed between the two parts
    - All external functions available at `loadState()` call time (fixed initialization timing bug)

- **Refactoring Prompt 7: renderStatic partial rendering optimization**
  - Conditional rendering applied to all 9 tabs — only active tab generates HTML, inactive tabs return empty string
    - Inline tabs (action, schedule, dashboard, all): `${currentTab === 'X' ? \`...\` : ''}`
    - IIFE tabs (events, life, history): `${currentTab === 'X' ? (() => {...})() : ''}`
    - Function tabs (work, commute): `${currentTab === 'X' ? renderFn() : ''}`
  - Skips ~2000 lines of template evaluation + DOM creation for 8 inactive tabs
  - `updateTime()` dead code removal (`_scrollY`/`_activeId` RAF restore — out-of-scope variable references)
  - `renderStatic()` dead code removal (`_scrollY`/`_activeId`/`_activeClass` unused variables)

### Commits
```
158ba60 refactor: Date.now() ID 생성을 crypto.randomUUID()로 교체
a570032 docs: appState JSDoc 스키마 문서화 (Prompt 2)
39cb7a2 docs: 핵심 테스트 시나리오 CLAUDE.md 문서화 (Prompt 3)
87079e3 docs: CHANGELOG 메타데이터 블록 구조 개선 (Prompt 4)
1d2869e refactor: 통근 트래커 모듈 분리 js/commute.js (Prompt 5)
05b9383 refactor: 라이프 리듬 모듈 분리 js/rhythm.js + 스크립트 아키텍처 개선 (Prompt 6)
```

### Next Tasks
- Prompt 1-7 refactoring complete

---

## [2026-02-07] (Session 20)
> `navigator-v5.html` | DB: none (Firestore initialization method changed)

### Changes
- **Cross-device sync fix (Firestore single source of truth)**
  - Phase 1: Firestore offline persistence enabled (IndexedDB cache)
    - `getFirestore` → `initializeFirestore` + `persistentLocalCache` + `persistentSingleTabManager`
    - Firestore SDK automatically returns cached data even offline
  - Phase 2: Sync debounce shortened 5s → 1.5s (improved responsiveness)
  - Phase 3: beforeunload/visibilitychange sync stability improvement
    - Added `_doSaveStateLocalOnly()` function — synchronous save only during beforeunload
    - Immediately flush pending Firebase sync on visibilitychange hidden
  - Phase 4: Firebase re-upload after onSnapshot merge (with ping-pong prevention)
    - `lastOwnWriteTimestamp` identifies self-writes → blocks infinite loop
    - Re-uploads merge result when receiving other device changes (with debounce)
  - Phase 5: Removed localStorage caching for logged-in users
    - Conditionally wrapped `localStorage.setItem` at ~30 locations in `_doSaveState`, onSnapshot, loadFromFirebase, etc.
    - Logged-in users: use Firestore IndexedDB only (skip localStorage caching)
    - Non-logged-in users: existing localStorage behavior maintained
    - Private browsing: `isIndexedDBAvailable` check for localStorage fallback
    - On logout: dump via `_doSaveStateLocalOnly()` once (for non-logged-in state)

### Next Tasks
- SVG icon replacement (P2)

---

## [2026-02-07] (Session 19)
> `navigator-v5.html` | 12 commits | DB: `appState.trash` field added

### Changes
- **P0 bug fix: Recurring task daily reset saveState() missing**
  - Added `saveState()` call after `checkDailyReset()` (4 locations)
  - Triggers: loadState(), setInterval(1min), visibilitychange, wakeUp
  - Prevents reset data loss when `beforeunload` doesn't fire on mobile

- **Events tab bulk delete (multi-select) feature**
  - Select button → enter selection mode: checkboxes shown + action bar (all/delete/cancel)
  - Individual/all select → Delete (N) → confirm → soft-delete (deletedIds pattern)
  - Action buttons hidden in selection mode (prevents accidental actions)
  - Non-persistent state: `_eventBulkSelectMode`, `_eventBulkSelectedIds` (reset on refresh)
  - Accessibility: aria-label, 44px touch target
  - XSS defense: escapeHtml() applied

- **Trash feature (deleted task restoration)**
  - Added `appState.trash` array — retains deleted tasks for 30 days
  - `deleteTask()`, `bulkDeleteEvents()` → move tasks to trash (previously: instant destruction)
  - `restoreFromTrash(id)` — also removes from deletedIds on restore (prevents sync resurrection)
  - `permanentDeleteFromTrash(id)`, `emptyTrash()` — permanent deletion
  - `cleanupOldTrash()` — automatic cleanup of 30-day expired items (runs on loadState)
  - localStorage + Firebase sync (including realtime merge)
  - trash included in export/import
  - Events tab bottom trash section: deletion date, remaining retention days, restore/permanent delete buttons

- **P0 bug fix: Life rhythm day transition missing**
  - Added `checkRhythmDayChange()` function — moves yesterday's today to history + initializes today
  - Called from setInterval(1min) + visibilitychange (previously: only on button click)
  - Auto-initializes rhythm when app stays open past midnight or on tab return

- **Events bulk delete — group selection feature**
  - Added checkbox to each group header in selection mode
  - Group checkbox click selects/deselects entire group

- **Events tab group reorganization + collapse feature**
  - Groups changed: overdue/today/within 3 days/plenty of time → urgent (D-1 or less)/before deadline (D-2~D-5)/unsubmitted/submitted
  - All group headers click to collapse/expand (toggle)
  - `_collapsedEventGroups` Set manages collapsed state (non-persistent)
  - Submitted section also unified to same events-group pattern

- **Medication tracker layout improvement**
  - `medication-slots` flex → `grid-template-columns: 1fr 1fr` (fixed 2-column grid)
  - PC: 3+1 → 2+2, Mobile: 1+1+1+1 → 2+2 unified
  - `med-label` ellipsis removed → natural text wrapping allowed

- **Task card category color bar**
  - CSS `--task-cat-color` variable-based left 4px color bar
  - Visual distinction: work (blue), side work (purple), daily (green), family (orange)
  - Applied to: task-item, task-item-mini, all-task-item, life-item — all cards

- **Brain dump mode (enter multiple tasks at once)**
  - Added "Dump" button to quick input area
  - Modal textarea for one task per line → batch task creation
  - Reuses existing `#category` parsing
  - Real-time line counter + saveState/renderStatic called only once

- **Pomodoro-task connection (auto-record focus time)**
  - Added pomodoro button to task cards
  - On 25min completion, auto-accumulates 25min to connected task's `actualTime`
  - Pomodoro UI shows connected task name + accumulated time
  - `currentTaskId` invalidated on task deletion

- **Completion streak visualization (consecutive completion days + badges)**
  - `calculateCompletionStreak()`: calculates consecutive completion days based on completionLog
  - Reflects dayStartHour (early morning completion = counted as previous day)
  - Home tab top shows N-day consecutive completion counter
  - 7-day / 14-day / 30-day achievement badges

- **Life rhythm 30-day long-term statistics**
  - `calculateRhythmStats(30)`: 30-day average wake/sleep/sleep duration/departure/commute/work hours
  - Weekday vs weekend comparison (wake, sleep, commute)
  - Medication compliance rate (required/optional separated, per-slot %)
  - Life rhythm history tab with Stats toggle button

- **History individual delete button**
  - Added delete button to each completion record in More > History
  - `completionLog` per-entry `_logDate`, `_logIndex` tracking → `deleteCompletionLogEntry()` call
  - Fixes deleted events remaining in history

- **Submitted group checkbox addition**
  - Group checkbox also shown for submitted group in events bulk selection mode
  - Same `toggleEventGroupSelect()` pattern as urgent/before deadline/unsubmitted

- **History completion date/time edit feature**
  - Click time on history item → date+time edit modal
  - On date change, removes from old date → moves to new date
  - Reuses `parseTimeInput()` (supports shorthand input like 1430, 930)

### Commits
```
e305841 feat: 히스토리 완료 날짜/시간 수정 기능
2977b4d fix: 히스토리 개별 삭제 + 제출완료 그룹 체크박스
94d4261 feat: 라이프 리듬 30일 장기 통계
6a6ead5 feat: 완료 스트릭 시각화 (연속 완료일 + 배지)
32f8f40 feat: 포모도로-태스크 연결 (집중 시간 자동 기록)
8820cf8 feat: 브레인 덤프 모드 (여러 태스크 한 번에 입력)
bc83f7b feat: 태스크 카드 카테고리 컬러바 추가
0b8ffa6 fix: 라이프 리듬 하루 전환 누락 수정
f34ad44 feat: 휴지통 복원 기능 + 이벤트 그룹별 선택
5ae51ab feat: 이벤트 탭 그룹 재편 + 접기/펼치기 기능
5a38824 feat: 이벤트 탭 일괄 삭제(다중 선택) 기능
530b898 fix: 반복 태스크 일일 초기화 saveState() 누락 수정 (모바일 데이터 유실 방지)
```

### Next Tasks
- P2: SVG icon replacement
- Supabase RLS verification (manual check needed in dashboard)

---

## [2026-02-06] (Session 18)
> `navigator-v5.html` | 5 commits | DB: Supabase `telegram_messages` read/archive

### Changes
- **P0 bug fix: Telegram integration (2 items)**
  - `confirmImportTask()`: `syncToCloud()` → `syncToFirebase()` (undefined function call fix)
  - `_doSyncToFirebase()`: Added `{ merge: true }` to `setDoc`
    - Fixed Navigator sync deleting `events` field saved by Telegram bot
  - `confirmImportTask()`: Added missing `description` field

- **Telegram badge click → events list modal**
  - Changed events tab Telegram badge from `<div>` to `<button>`
  - `showTelegramEvents()`: Direct query to `telegram_messages` via **Supabase REST API**
    - Bot uses Supabase, Navigator uses Firebase → cross-query via Supabase anon key
    - Query filters: `participated=false` + `(starred OR deadline)` + `archived_date IS NULL`
    - Uses analysis field: title, summary, reward_usd, time_minutes, project, organizer
  - `showTelegramEventsModal()`: Checkbox list modal UI
    - Select all / individual selection support
    - Status messages when no unadded events (no events / all already added)
    - Date format: `YYYY-MM-DD` → `Feb 15 D-3` + D-day color
    - Difficulty/type/project/organizer meta display
    - Starred event indicator
  - **Card detail view**: Click title to expand description, task list, links, project/organizer (toggle)
  - `importSelectedTelegramEvents()`: Batch add selected events as Tasks
    - `source` structure: same format as bot's `exportToNavigator()`
    - localStorage + Firebase sync
  - `archiveSelectedTelegramEvents()`: Batch delete (archive) selected events
    - Sets `archived_date` via Supabase PATCH (same soft-delete as bot)
    - Confirm dialog before processing, auto-refresh list after deletion
  - CSS: `.tg-events-list`, `.tg-event-item`, `.tg-event-detail`, etc.
  - Accessibility: `aria-label`, `min-height: 44px` touch target
  - XSS defense: `escapeHtml()` applied to all user inputs

- **P0 additional fixes**
  - `renderTasks()` → `renderStatic()` (undefined function call at 2 locations)
  - `toggleAllTelegramEvents`: label onclick timing bug fix

### Commits
```
d775a6c feat: 텔레그램 이벤트 일괄 삭제(아카이브) 기능
7c8c53a fix: 텔레그램 이벤트 모달 3가지 개선
0c585d6 fix: 텔레그램 이벤트 추가 안 되는 버그 수정
dc929e8 refactor: 텔레그램 이벤트 조회를 Supabase 직접 조회로 변경
dcf9f0c feat: 텔레그램 배지 클릭 → 이벤트 목록 모달 + P0 동기화 버그 수정
```

### Next Tasks
- P2: SVG icon replacement
- P1: Life rhythm 30-day long-term statistics (sleep pattern trends)

---

## [2026-02-06] (Session 17)
> `navigator-v5.html` | 6 commits | DB: none (startDate, description optional fields)

### Changes
- **P0 bug fixes (3 items)**
  - `loadLifeRhythm()`: Auto-reset today's rhythm on date change
    - Moves existing data to history then initializes with today's date
    - Removed UTC correction logic → replaced with clear date change detection
  - Medication button layout misalignment fix
    - `.medication-btn`: added max-width 180px
    - `.med-label`: overflow ellipsis + flex:1 + min-width:0
    - `.med-time`: added flex-shrink:0
  - `checkDailyReset()`: Improved daily recurring task duplicate cleanup
    - Duplicate cleanup regardless of completion status (previously: uncompleted only)
    - Completed tasks prioritized for retention (previously: only compared newest creation)

- **Phase 2: Events tab improvements (4 items)**
  - `editCompletedAt()`: Edit completion date for completed events
    - Modal UI with datetime input
    - Auto-updates completionLog (removes old date → adds new date)
  - Task description field added
    - `detailedTask.description`: stores task description/notes
    - Added textarea to detailed add form
    - Shows partial description (60 chars) on event card
  - Event card expanded display information
    - organizer, eventType, expectedRevenue meta info display
    - Telegram-linked events show badge
  - Event deadline-based grouping
    - 4 groups: overdue / today / within 3 days / plenty of time
    - Count header for each group

- **Phase 3: Telegram integration + commute tracker improvements (3 items)**
  - Telegram integration status display
    - Completed events show badge + "Synced" indicator
    - Unsubmitted events also show Telegram source badge
  - Commute recent 7-day detailed time display
    - `getRecentCommuteDetail()`: includes departure/arrival times by date
    - Previous average only → daily departure → arrival time detail display
    - Weather condition icon display
  - Commute full history tab
    - Added `commuteSubTab: 'history'`
    - `renderCommuteHistoryView()`: view all commute records by date
    - Shows route name, departure/arrival time, duration, weather conditions

- **Phase 4: Schedule management improvements (2 items)**
  - Task startDate field added
    - `detailedTask.startDate`: stores start date
    - Start date input available for all 4 categories (work/side work/daily/family)
    - Start date - deadline horizontal layout (`.form-row` + `.form-group.half`)
  - Event card date range display
    - Start date only: "Jan 5~"
    - Deadline only: "~Jan 10"
    - Both: "Jan 5~Jan 10"

- **Post-review additional fixes**
  - Added description, startDate fields to quick edit modal
    - showQuickEditModal(): textarea + start date/deadline horizontal layout
    - saveQuickEdit(): description, startDate save logic added
  - Fixed startDate missing in detailedAdd() initialization at 2 locations
  - Added .work-modal-field-row, .work-modal-field.half styles

- **Daily tab recurring/one-time separation**
  - Daily (recurring): tasks with repeatType daily/weekdays etc.
  - Daily (one-time): tasks with repeatType none
  - Family: unchanged
  - Summary section 4 panels: recurring / one-time / family / completed
  - `resetCompletedRepeatTasks()`: manual reset for completed recurring tasks
  - "Reset (N)" button for batch reset of completed recurring tasks
  - "All recurring tasks completed today!" message when all done

### Commits
```
b968d4e feat: 일상 탭 반복/일회성 분리 + 리셋 기능
f9a4fd9 fix: 검토 후 누락 수정 - 빠른 수정 모달 + 초기화 코드
3c97fe0 feat: Task startDate 필드 + 이벤트 카드 일정 범위 표시
bed5f0f feat: 텔레그램 연동 상태 표시 + 통근 히스토리 탭
13279a2 feat: 이벤트 탭 개선 - 완료 날짜 수정, description 필드, 기한별 그룹핑
c19a0ca fix: P0 버그 3건 수정 - 라이프 리듬 리셋, 복약 레이아웃, 반복 태스크 중복
```

### Next Tasks
- P2: SVG icon replacement
- P1: Life rhythm 30-day long-term statistics (sleep pattern trends)

---

## [2026-02-06] (Session 16)
> `navigator-v5.html` | DB: none (completionLog existing structure maintained)

### Changes
- **Calendar past date completion entry feature**
  - `addCompletionLogEntry()`: prompt UI for title/category/time/revenue input → adds to completionLog
  - "Add Entry" button placed in `renderDayDetail()` header
  - Can add entries even on empty dates (0 records)
  - Added entries automatically show existing edit/delete buttons

- **Time input convenience parsing (parseTimeInput)**
  - `1430`→`14:30`, `930`→`09:30`, `9`→`09:00` etc. — input without colons
  - Full-width colon auto-conversion
  - Applied to both addCompletionLogEntry and editCompletionLogEntry

- **Calendar count bug fix (P0)**
  - `getCompletionMap()`: Fixed bug where tasks' additional completion items were missing even when completionLog had entries
  - Changed from date key existence check → title+time-based accurate duplicate check

- **completionLog duplicate record display fix**
  - `getCompletedTasksByDate()`: Fixed second entry disappearing when same title+time records exist 2+
  - Included index in seen key to display each separately

- **Time validation feedback added**
  - Both add/edit show toast warning on malformed time format input
  - Default time for past date entries changed from current time → 12:00 (today still uses current time)

- **P0 bug fixes (4 items)**
  - `saveActualTime()`: NaN/negative input defense + error toast
  - `handleTouchEnd()`: Crash prevention when changedTouches array is empty
  - `importData()`: input.value reset enables re-selection of same file
  - `handleFileImport()`: Rejects non-JSON files + string type validation

- **Other fixes**
  - `showTimeInputModal()`: Close existing modal before opening new one — prevents stacking
  - setInterval duplicate registration prevention: tracks IDs via `window._navIntervals`, clears existing on re-run

### Next Tasks
- P2: SVG icon replacement
- P1: Life rhythm 30-day long-term statistics (sleep pattern trends)

---

## [2026-02-06] (Session 15)
> `navigator-v5.html` | DB: none

### Changes
- **PC 4K layout balanced redistribution (major UX improvement)**
  - 4K CSS: 3-column (RIGHT stacked below LEFT) → 4-column (LEFT|CENTER|RIGHT|TASKLIST) independent layout
  - LEFT (core status): Time → Life Rhythm (moved up) → Upcoming Deadlines → Next Action
  - CENTER (task management): Quick Add → Templates → Quick Filter → Task List → Detail Form → Focus
  - RIGHT (progress+tools): Daily Goal (LEFT→RIGHT) → Medication (LEFT→RIGHT) → Pomodoro → Quotes → Reminder → PWA
  - TASKLIST: 4K full task list (unchanged)
  - Purpose: balanced 3-panel layout, LEFT overload resolved, immediate life rhythm access

- **Category-based 3-column regrouping (UX)**
  - LEFT "My Day": Time → Life Rhythm → Medication → Daily Goal → Quotes
  - CENTER "To Do": Upcoming Deadlines → Next Action → Quick Add → Quick Filter → Task List → Detail Form
  - RIGHT "Focus Tools": Pomodoro → Focus Mode → Monday Reminder → PWA

---

## [2026-02-06] (Session 14)
> `navigator-v5.html` | DB: Firebase `deletedIds` field added

### Changes
- **Soft-delete sync bug fix (P0)**
  - `appState.deletedIds`: Tracks deleted item ID+timestamp (tasks, workProjects, templates, workTemplates)
  - `mergeTasks()`, `mergeById()`: Added deletedIds parameter, excludes deleted items from merge
  - `mergeDeletedIds()`: Union merge of local+cloud deletion records
  - `cleanupOldDeletedIds()`: Auto-cleanup of deletion records older than 30 days
  - `deleteTask()`, `deleteTemplate()`, `deleteWorkProject()`: Records in deletedIds on deletion
  - `_doSyncToFirebase()`: Uploads deletedIds to Firebase
  - `loadFromFirebase()`, `startRealtimeSync()`: Merges deletedIds then passes to merge
  - `_doSaveState()`, `loadState()`: Saves/loads deletedIds in localStorage
  - **Effect**: Delete on Device A → no resurrection on Device B sync

- **startRealtimeSync localStorage missing fix (P0)**
  - Added localStorage saving for settings, streak, templates, availableTags
  - Prevents merge result loss on app restart

- **Lunch medication ADHD/supplements separation complete fix (P1)**
  - `restoreFromSyncBackup()`: Added med_afternoon migration on backup restore
  - `loadFromFirebase()`, `startRealtimeSync()`: Local-first protection for medicationSlots during settings merge
  - Resolved cloud's old slot definitions overwriting separated slots

- **completionLog historical record edit/delete feature (P1)**
  - `editCompletionLogEntry()`: prompt-based title/category/time/revenue editing
  - `deleteCompletionLogEntry()`: Confirm then delete record
  - `renderDayDetail()`: Added edit/delete buttons to completionLog items
  - `getCompletedTasksByDate()`: Added logIndex field (edit/delete target index)

- **Other fixes**
  - `_doSaveState()`: Removed commuteTracker duplicate saving
  - `_doSaveState()`: Added missing streak, templates localStorage save

---

## [2026-02-05] (Session 13)
> `navigator-v5.html` | DB: Firebase `completionLog` field added

### Changes
- **Task completion permanent record (completionLog) — long-term statistics analysis**
  - `appState.completionLog`: Permanent preservation of completion records by date (key: YYYY-MM-DD)
  - Data structure: `{ t: title, c: category, at: "HH:MM", r?: repeatType, rv?: revenue, st?: subtaskCount }`
  - Auto-records in completionLog on `completeTask()` / removes on `uncompleteTask()`
  - Added completionLog field to Firebase `setDoc` — multi-device sync
  - `mergeCompletionLog()`: Per-date union + title+at deduplication
  - Merge logic extended in both `loadFromFirebase()`/`startRealtimeSync()`
  - `createSyncBackup()`/`restoreFromSyncBackup()` includes completionLog
  - `exportData()`/`handleFileImport()` includes completionLog
  - Existing user migration: appState.tasks + navigator-completion-history → auto-migrated to completionLog
  - Removed existing `saveCompletionHistory()`/`getCompletionHistory()` (dead code cleanup)

- **Calendar/history view switched to completionLog-based**
  - `getCompletionMap()`: Unified completionLog + tasks (calendar heatmap)
  - `getCompletedTasksByDate()`: completionLog priority, tasks supplementary
  - `renderRecentHistory()`: Extended 14 days → 30 days, shows per-date revenue
  - `renderDayDetail()`: Integrated rhythm/medication info + revenue display
  - `getWeeklyStats()`/`getWeeklyReport()`: completionLog-based
  - `getCompletionLogEntries()`: New date range query helper function

- **Long-term statistics dashboard**
  - `getHourlyProductivity()`/`getDayOfWeekProductivity()`/`getCategoryDistribution()`: completionLog-based
  - Dashboard: weekly/monthly + 90-day stats + monthly trend bar chart (last 3 months)
  - Medication stats: 7-day + 30-day required/optional compliance rate expansion
  - Life rhythm history completion count now completionLog-based

- **Data retention policy**
  - `compactOldCompletionLog()`: Data older than 1 year → auto-compressed to daily summary
  - Compressed format: `{ _summary: true, count, categories: {...}, totalRevenue }`
  - `getCompletionMap()`/`getCompletionLogEntries()`: Supports compressed data
  - Auto-runs once daily at app start

### Bug Fixes (Session 13 addendum)
- **Daily/all task list completed tasks disappearing bug fix**
  - Cause: `getTodayCompletedTasks()` only returned today's completed tasks → yesterday's completed tasks appeared in neither pending nor completedTasks ("black hole")
  - Fix: Use `lifeTasks.filter(t => t.completed)` / `categoryTasks.filter(t => t.completed)` in daily tab + all task list
  - "Today" tab and header count maintain existing `getTodayCompletedTasks` (for display purposes)
- **Lunch medication slot ADHD/supplements separation**
  - `med_afternoon` (ADHD+Supplements(lunch)) → `med_afternoon_adhd` (ADHD(lunch)) + `med_afternoon_nutrient` (Supplements(lunch))
  - Existing data migration: auto-conversion at 4 locations — loadLifeRhythm, mergeRhythmHistory, loadFromFirebase, startRealtimeSync
  - Existing `med_afternoon` records → migrated to `med_afternoon_adhd` (ADHD is required)

### Next Tasks
- P1: Life rhythm 30-day long-term statistics (sleep pattern trends)
- P1: Sync backup 3-rotation
- P2: SVG icon replacement

---

## [2026-02-05] (Session 12)
> `navigator-v5.html` | DB: `lifeRhythm.medications` + `settings.medicationSlots` added

### Changes
- **Medication/supplement tracker — Life rhythm integration (P1)**
  - Added medications field to appState.lifeRhythm + settings.medicationSlots
  - 3 default slots: ADHD medication (morning/required), ADHD+Supplements (lunch/required), Supplements (evening/optional)
  - Today's medication card: directly below rhythm tracker, time recorded with one tap
  - Record/edit/delete functions + action menu (reuses existing rhythm pattern)
  - Required medication streak calculation + reminder display
  - Firebase/localStorage dual storage + extended merge logic
  - mergeRhythmHistory, loadFromFirebase, startRealtimeSync all include medications merge
  - medications:{} included in all 6 today initialization + 2 history creation locations
  - loadLifeRhythm migration includes medications field initialization
  - CSS: .medication-tracker, .medication-btn, .medication-btn.taken etc. styles
  - XSS defense: escapeHtml() applied (slot.id, slot.label)
  - Accessibility: button title attribute (edit/delete guidance)
  - History: medication row added (check/dash icon format, click to edit past dates)
  - editMedicationHistory(): past date medication record editing
  - Settings UI: medication slot add/edit/delete (name, icon, required status)
  - Dashboard: 7-day required/optional compliance rate + streak statistics
  - hasAnyData includes medication records (days with only medication also shown in history)

### Next Tasks
- P1: Life rhythm history auto-cleanup after 30 days
- P1: Sync backup 3-rotation
- P2: SVG icon replacement

---

## [2026-02-05] (Session 11)
> `navigator-v5.html` | DB: Firebase `commuteTracker` field added

### Changes
- **Commute tracker tab newly added (P1)**
  - Added commute tab to more menu
  - 3 sub-tabs: morning commute / evening commute / statistics
  - Route CRUD: name, description, direction (to work/from work/both), estimated duration, color settings
  - Commute recording: auto-linked with life rhythm (home departure/office arrival/office departure/home arrival) times
  - Auto-calculated duration + comparison badge vs estimate (good/normal/bad)
  - Departure time recommendation algorithm: 75th percentile safe value based on last 30 days + buffer
  - Confidence display: high (10+), medium (5+), low (<5)
  - Weather condition tags: clear/rain/snow
  - Last 7-day per-route average summary
  - Statistics view: per-route average/shortest/longest, frequency bar chart, day-of-week pattern
  - Recommended route display (shortest average)
  - Life rhythm auto-tag: route selection prompt on commute recording (10s auto-close)
  - Onboarding: 3 default route presets (shuttle bus/subway+bus/direct bus)
  - Data storage: localStorage + Firebase sync (with merge logic)
  - Keyboard shortcut 7 key → commute tab
  - XSS defense: escapeHtml() applied to all user inputs
  - Accessibility: aria-label, minimum touch target 44px

### Next Tasks
- Phase 4: Weather condition analysis, CSV export
- P1: Life rhythm history auto-cleanup after 30 days
- P2: SVG icon replacement

---

## [2026-02-05] (Session 10)
> `navigator-v5.html` | DB: none

### Changes
- **Work project detail header layout improvement**
  - Line 1: Project name + schedule (date range + D-day) — flex single-line layout
  - Line 2: Progress bar
  - Line 3: Action buttons
  - Long project names get ellipsis treatment, schedule uses flex-shrink:0 for fixed size
  - Before: side-by-side layout caused line overflow with long names → After: vertical layout for clean 2-3 line structure

- **Data shrinkage detection expansion (P0)**
  - Added templates, workTemplates count monitoring to `checkDataShrinkage()`
  - Before: only detected tasks, workProjects → template loss undetected
  - After: sync blocked when any of 4 data types drops to 0

- **Recurring task (weekly/monthly/custom) duplicate creation prevention (P0)**
  - Added duplicate check before `createNextRepeatTask()` call in `completeTask()`
  - Skips creation if uncompleted task with same title + category + repeatType already exists
  - Before: unconditionally created next cycle task on every completion → duplicate accumulation

- **Sync frequency optimization (debouncing)**
  - `syncToFirebase()` converted to debounce wrapper (5s interval batch processing)
  - Actual logic separated to `_doSyncToFirebase()`
  - `immediate=true` option: used when immediate sync needed (post-load merge, online recovery, etc.)
  - `saveStateImmediate()`: immediately executes debounce timer before app exit
  - Effect: consecutive rapid changes consolidated to 1 Firebase write (reduced cost/load)

### Next Tasks
- P1: Life rhythm history auto-cleanup after 30 days
- P1: Sync backup 3-rotation
- P2: SVG icon replacement

## [2026-02-05] (Session 9)
> `navigator-v5.html` | DB: none

### Changes
- **Recurring task (daily/weekdays) auto-reset on date change**
  - `checkDailyReset()`: Resets daily/weekdays completion status on logical date change detection
  - `getLogicalDate()`: Calculates logical date based on dayStartHour (default 05:00)
    - 1 AM activity → still "yesterday" → no reset / After 5 AM → "today" → reset
  - Settings > "Day start time" option added (03:00~07:00 selectable)
  - weekdays tasks: not reset on weekends (Sat/Sun) (Fri completion → Mon reset)
  - `lastCompletedAt` field: preserves completion time as history before reset
  - Duplicate recurring task auto-cleanup (same title+category+repeatType → keep only newest 1)
  - `completeTask()`: daily/weekdays skip createNextRepeatTask (switched to reset method)
  - `checkDailyRepeatStreak()`: Maintains/resets streak based on logical "yesterday" recurring task completion
  - Triggers: app loading + visibilitychange (tab focus) + setInterval (1min) + wake button
  - Added `lastCompletedAt`, `source` field preservation to `validateTask()`

- **Life rhythm past date manual entry feature**
  - "Add past date" button: added to history view top
  - `addRhythmHistoryDate()`: Input past date in YYYY-MM-DD format
  - Added date creates empty record → click each time slot for manual entry
  - Existing `editLifeRhythmHistory()`: individual time editing via click (existing feature)

- **Multi-device sync data loss prevention (P0 bug fix)**
  - Root cause: After `onAuthStateChanged` → `appState.user` set, `syncToFirebase()` uploads empty data before `loadFromFirebase()` completes — Race Condition
  - `isLoadingFromCloud` flag: blocks all Firebase uploads during initial cloud load
  - Forces `saveStateTimeout` debounce timer cancellation on `loadFromFirebase()` start
  - `checkDataShrinkage()`: Detects sudden decrease (→0) compared to previous data count, auto-blocks sync
  - `createSyncBackup()`: Auto-backs up current state to localStorage before each sync
  - `updateDataCounts()`: Records data count after successful sync (used for next shrinkage detection)
  - `restoreFromSyncBackup()`: Manual restore from last sync backup on data loss
  - Auto-detects data loss on app start → offers `confirm()` recovery
  - Settings > Data Backup section: "Restore from sync backup" button added
  - `loadFromFirebase()` try-finally block guarantees lock release even on error

### Protection System Summary
```
App start → loadState() → checkDataShrinkage() → recovery offered on loss detection
Login → isLoadingFromCloud=true → saveStateTimeout cancel → loadFromFirebase()
       → merge complete → isLoadingFromCloud=false → updateDataCounts() → syncToFirebase()
syncToFirebase() call:
  1. isLoadingFromCloud check → wait
  2. checkDataShrinkage() → block
  3. createSyncBackup() → backup
  4. Firebase upload
  5. updateDataCounts() → record
```

### Next Tasks
- Recurring task (daily/weekdays) auto-reset (life rhythm)
- SVG icon replacement (P2)

## [2026-02-05] (Session 8 - Major Overhaul)
> `navigator-v5.html`, `sw.js` | DB: none

### Changes
- **XSS remaining 3 locations fix**: escapeHtml applied to subcatData.name, sub.name, stageName confirm
- **Accessibility major enhancement**:
  - 65 aria-labels added (delete, complete, edit, defer, tabs, more menu, etc.)
  - More menu: role="menu"/menuitem, aria-expanded, aria-haspopup added
  - Modal focus trap implemented (Tab key cycles within modal)
- **renderStatic scroll/focus preservation**: Auto-restore scroll position + focus after rendering
- **Firebase offline/online feedback**:
  - Indicator immediately updates on sync start
  - Auto-sync + toast notification on online recovery
  - Warning toast on offline transition
- **Delete safety**: confirm added to deleteWorkLog
- **Touch target guarantee**: btn-small(44px), work-task-action(44px), work-task-log-action(36px)
- **PWA improvements**: SW v6.3, app update detection toast added
- **Color contrast improvements**: dark mode text-muted #707078 → #8a8a92, light mode #9aa0a6 → #72787e
- **Global function namespace cleanup**: 142 functions grouped into window.Nav object
- **favicon + apple-touch-icon added**: SVG data URI icon
- **Onboarding feature tour**: 4-step highlight tour + "Feature Guide" button in settings
- **Weekly/monthly report**: Dashboard shows weekly/monthly completion count, revenue, per-category stats, daily average
- **Pomodoro timer UI connection**: 25min focus/5min break pomodoro UI shown on today tab (using existing logic)

### Deployment Verification
- Mobile (390), desktop (1440), 4K (3840) screenshot verification complete
- All new features confirmed working: pomodoro, life rhythm, filter, more tab, color contrast, etc.

### Next Tasks
- SVG icon replacement (P2)

---

## [2026-02-05] (Session 8)
> `navigator-v5.html`, `CLAUDE.md` | DB: none

### Changes
- **UTC date bug comprehensive fix**: Replaced `toISOString().split('T')[0]` → `getLocalDateStr()` at 14 locations across calendar, history, asset export, backup filename, etc.
- **JSON.parse crash prevention**: Applied `safeParseJSON()` to 7 bare `JSON.parse()` in `loadState()`
- **saveTemplates() Firebase sync added**: Fixed missing Firebase sync on template save
- **XSS defense hardening**: `escapeHtml()` applied to `showAchievement()`, `showUndoToast()`
- **Home button/section UX cleanup**:
  - Label clarifications and intuitive filter names
  - "?" help icon removed, descriptions integrated into title attributes
- **4K/large monitor layout optimization**:
  - 1920px+: max-width 1800px, enlarged fonts/padding, 30px grid spacing
  - 2560px+: max-width 2400px, 20px base font, all UI elements scaled up
  - 2560px+ 3-column layout (status+filter | add+action | full task list)
  - 3200px+ zoom: 1.4 (4K 100% DPI support)
  - All components adapted: work card, events, revenue, calendar, rhythm, toast, etc.
- **XSS comprehensive defense**: `escapeHtml()` applied to 35 user input locations in innerHTML templates
  - task.title, project.name, subtask.text, subcat.name, tag etc. — full coverage
- **Recurring task deadline UTC bug fix**: Added `getLocalDateTimeStr()` helper, replaced `toISOString().slice(0,16)` at 4 locations
- **Accessibility basic improvements**:
  - aria-label added to 6 header buttons (shuttle, theme, sync, notification, settings)
  - aria-label="Complete task" added to 5 task-check-btn locations
  - Escape key closes modal/dropdown feature added

### Next Tasks
- SVG icon replacement (P2)
- Pomodoro integration (P2)
- Onboarding guide (P1)

## [2026-02-04] (Session 7)
> `navigator-v5.html` | DB: none

### Changes
- **Work completion log compression**: Accumulated "Completed" logs now summarized as "Completed N times (latest: M/D)"
- **Event card single-line compression**: Event name, date, buttons, D-Day all on one line
- **Today tab list compact mode**: Default shows only "number. title (category)", action buttons on hover
- **Progress section removed**: Removed today's progress + per-category status sections
- **Deadline alert → header integration**: Moved from separate section to header bell icon dropdown

### Next Tasks
- UTC date usage audit
- SVG icon replacement (P2)

---

## [2026-02-04] (Session 6)
> `navigator-v5.html` | DB: none

### Changes
- **Subcategory/task completion checkboxes added**
  - Task: Added checkbox before status badge, click to directly toggle complete/not started
  - Subcategory: folder icon → checkbox, auto-checked when all child tasks completed
  - Added `toggleWorkTaskComplete()`, `toggleSubcategoryComplete()` functions
  - Added `.work-subcategory-checkbox` CSS (reuses existing `.work-task-checkbox`)

- **Work section button order unified**
  - Category: reordered to edit/schedule/delete
  - Subcategory: text 'delete' → trash icon + red color unified
  - Task: reordered to edit/schedule, text 'delete' → trash unified
  - All levels: edit → schedule → delete → [add] order unified

---

## [2026-02-04] (Session 5)
> `navigator-v5.html`, `ROADMAP.md`, `.gitignore` | DB: none

### Changes
- **Built-in template hardcoding removed (security)**
  - Built-in template constants deleted → managed only via user data (localStorage/Firebase)
  - Built-in branch removed from template selection/apply logic

- **Template JSON import feature added**
  - "Import" button added to work dashboard header
  - `showWorkModal('template-import')` → JSON text paste modal
  - JSON parsing + structure validation (required fields: name, stages, subcategories, tasks)
  - Imported template → auto-synced to localStorage + Firebase

- **Template JSON export feature added**
  - Export button on each item in template selection list
  - `exportTemplate()` → clean JSON clipboard copy (excluding internal fields)
  - prompt fallback on clipboard failure

- **Template selection UI improvements**
  - Guidance message when no templates exist
  - escapeHtml applied to template names (XSS prevention)

- **git history security cleanup**
  - Comprehensive removal of internal work terms exposed in public repo
  - Targets: code, commit messages, CHANGELOG, ROADMAP, etc.
  - `workProjectStages` default values generalized
  - Participant UI labels generalized
  - `navigator-backup-fixed.json` removed from git tracking + added to .gitignore
  - Past commit history fully cleaned via `git rebase` + `force push`
  - Previous commits inaccessible (404) on GitHub confirmed

---

## [2026-02-04] (Session 4)
> `navigator-v5.html` | DB: `workTemplates.stageNames` field added

### Changes
- **Built-in template system added**
  - Project template feature implemented
  - Built-in templates shown in template selection modal

- **stageNames support added to template system**
  - Stage names (stageNames) can be saved/applied with templates
  - `saveAsTemplate()` → includes project stage names
  - `applyTemplate()` → uses template stage names (falls back to global defaults)

- **Clipboard copy feature added**
  - Copy button in project detail view
  - Copies progress-included checklist text to clipboard

---

## [2026-02-04] (Session 3)
> `navigator-v5.html` | DB: none

### Changes
- **Dashboard property name mismatch bug fix**
  - Fixed average commute/work times always showing `--:--`
  - `avgWorkStart` → `avgWorkArrive`, `avgWorkEnd` → `avgWorkDepart`, `workStartDeviation` → `homeDepartDeviation`

- **Life rhythm recording UX improvement — edit/delete action menu**
  - Recorded button click: `prompt()` direct → changed to edit/delete popup menu
  - Added `showRhythmActionMenu()`, `hideRhythmActionMenu()`, `deleteLifeRhythm()`
  - Mobile touch-friendly CSS (`.rhythm-action-menu`)

- **Immediate feedback on wake/sleep recording vs target**
  - Added `getTimeDiffMessage()` helper function
  - Toast examples: "Wake 07:15 (15 min later than target)", "Sleep 22:50 (10 min earlier than target)"
  - Midnight crossing handling for sleep (00:00~05:00 recording treated as previous night)

- **Dashboard wake/sleep target comparison statistics added**
  - `getLifeRhythmStats()` extended: `avgWakeUp`, `avgBedtime`, `wakeTimeDiff`, `bedtimeDiff`, `targetSleepHours`
  - Added "Average wake/sleep + target difference (minutes)" row to sleep section
  - Within 15 min = green (good), otherwise = red (bad)
  - "vs target" sleep time: hardcoded 7 hours → improved to settings-based `targetSleepHours`

---

## [2026-02-04] (Session 2)
> `navigator-v5.html` | DB: none

### Changes
- **Work project 'on hold' feature added** (`fc38a74`)
  - `onHold` property for project hold/resume toggle
  - Added collapsible "On Hold" section to dashboard
  - Added on-hold optgroup to detail view selector
  - On-hold badge on cards (color: #f5576c)
  - Added `holdWorkProject()` function

- **Life rhythm UTC date bug fix** (`e039d4b`)
  - `toISOString()` (UTC) → `getLocalDateStr()` (local timezone) switch
  - Fixed rhythm data resetting between midnight~9AM in Korea (UTC+9)
  - Firebase merge: local data priority on tie (`>=` → `>`)
  - Added auto-correction migration for data saved with UTC dates

---

## [2026-02-04] (Session 1)
> `navigator-v5.html` | DB: none

### Changes
- Completed task daily refresh (show only today's completions, auto-cleanup of old completions)
- Sync toast added (upload success/other device received notifications)
- Multi-device sync ping-pong loop and data loss fix

---

## [2026-02-03] (Session 0)
> `navigator-v5.html` | DB: none

### Changes
- More dropdown bug fix
- Daily/family tab edit/delete buttons added
- Recurring task completion accumulation bug fix
- Work project stage customization (add/edit/delete)
- Work subcategory schedule setting feature
- Quick edit modal added
- Completion gauge bug fix
- Daily/family tab completed section added
- Code optimization (debounce, validation, deduplication)
- Life rhythm tracker expanded to 6 items
- Asset management revenue integration
- Data export/import
