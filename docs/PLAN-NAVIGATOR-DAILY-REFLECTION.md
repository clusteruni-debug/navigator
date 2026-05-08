# PLAN-NAVIGATOR-DAILY-REFLECTION

> Status: **PROPOSED — ready for Codex dispatch (single-tool deep integration)**
> Owner: navigator project (user is owner)
> Source plan: `/c/vibe/docs/plans/PLAN-NAVIGATOR-LIFEOS-INTEGRATION.md` v4 mental model — this is the *implementation plan* for the navigator side
> Created: 2026-05-09

## Goal

Add daily self-reflection (3 evening + 3 morning self-check questions) to navigator as native UI feature. Eliminates "daily Obsidian use" and "Telegram bot trigger" alternatives by deep integration into the tool the user already opens daily. Pattern reference: lifeRhythm + habitStreaks + weeklyPlan structure.

The integration is **navigator-native** — push notification + answer modal + history view + quarterly export — all inside navigator. User opens navigator at 22:00 (alarm or PWA push), answers 3 questions in 3 min, navigator records to Firebase, end. Obsidian is touched only at quarterly review (every 3 months, 30 min, navigator clipboard export → Obsidian paste).

## Background

- mylife-vault import (2026-05-08) brought 6 daily self-check questions in `life_compass.md`
- v1 (5 task), v2 (1 task + 2 alarms + weekly Obsidian compression), v3 (alarms removed but quarterly data flow unspecified) all over-engineered or under-specified
- v4 (mental model: navigator data ≠ Obsidian content, sync unnecessary) accepted but missed *user's actual ask*: the daily flow itself should be system-native, not user-discipline-dependent
- WatchBot integration considered, rejected: 3-tool dance (navigator + Telegram + Obsidian) inferior to 1-tool deep integration
- Conclusion: navigator's existing surface (lifeRhythm / habitStreaks / weeklyPlan / pomodoro) is missing a *daily reflection* layer. mylife import surfaced this as a navigator project backlog item

## Phase 1 — State schema (~50 lines, foundation)

File: `js/state-types.js`

Add typedef + initial state:

```js
/**
 * @typedef {Object} ReflectionAnswer
 * @property {string} q1 - 첫 번째 자문 답
 * @property {string} q2 - 두 번째 자문 답
 * @property {string} q3 - 세 번째 자문 답
 * @property {string} answeredAt - ISO 8601 답한 시각
 * @property {boolean} skipped - 건너뛰기 했는지 (답 없이)
 */

/**
 * @typedef {Object} ReflectionDay
 * @property {ReflectionAnswer|null} evening - 22시 자문 답
 * @property {ReflectionAnswer|null} morning - 09시 자문 답 (optional)
 */

/**
 * @typedef {Object} ReflectionSettings
 * @property {string} eveningTime - 저녁 자문 시각 (HH:MM, 기본 '22:00')
 * @property {string|null} morningTime - 아침 자문 시각 (HH:MM 또는 null)
 * @property {Object} questions
 * @property {string[]} questions.evening - 저녁 3 질문
 * @property {string[]} questions.morning - 아침 3 질문
 * @property {boolean} pushEnabled - PWA push notification 활성화
 * @property {boolean} autoModalEnabled - 시각 도달 시 modal 자동 노출
 */
```

Add to `appState`:

```js
dailyReflection: {
  history: {},  // { 'YYYY-MM-DD': ReflectionDay }
  settings: {
    eveningTime: '22:00',
    morningTime: null,  // null = 아침 자문 비활성
    questions: {
      evening: [
        '오늘 30분 룰 깬 충동 있었나? 무엇이었나?',
        '오늘 과잉 약속 / 압력솥 발현 있었나?',
        '내일 한 가지 완성할 작은 약속은?'
      ],
      morning: [
        '오늘 분기 목표 3개 중 무엇을 진전시킬까?',
        '신체 베이스라인 (수면·카페인·운동) 오늘 무엇이 약한가?',
        '어제 후회한 충동 행동이 있나? 패턴은?'
      ]
    },
    pushEnabled: false,
    autoModalEnabled: true
  },
  streak: { current: 0, best: 0, lastAnsweredDate: null }
}
```

## Phase 2 — load/save persistence (~30 lines)

File: `js/state.js`

In `loadState()`:
```js
const parsedReflection = safeParseJSON('navigator-reflection', null);
if (parsedReflection) {
  appState.dailyReflection = { ...appState.dailyReflection, ...parsedReflection };
}
```

In `_doSaveState()` and `_doSaveStateLocalOnly()`:
```js
localStorage.setItem('navigator-reflection', JSON.stringify(appState.dailyReflection));
```

Firebase sync: include `dailyReflection` in `firebase-sync.js` sync payload (verify existing sync includes new top-level state field automatically; if not, add explicit field).

## Phase 3 — Core logic module (~150 lines)

New file: `js/reflection.js`

Functions:
- `getReflectionToday()` — returns today's ReflectionDay (or empty)
- `saveReflectionAnswer(timeOfDay, answers)` — saves evening/morning, updates streak
- `updateReflectionStreak()` — recompute current/best based on history
- `getReflectionHistory(days)` — last N days with answers
- `shouldShowReflectionModal()` — checks current time vs settings.eveningTime, returns true if within window (e.g., 22:00 ± 30 min) and not yet answered today
- `extractReflectionPatterns(days)` — for quarterly retrospective: count keywords, frequencies, streak trends
- `exportQuarterlyMarkdown(days)` — generates markdown for clipboard (3-month summary template)

## Phase 4 — UI render module (~250 lines)

New file: `js/reflection-render.js`

Functions:
- `showReflectionModal(timeOfDay)` — bottom-sheet modal with 3 questions + textareas + skip button. Uses existing modal pattern from `init.js:showImportConfirmModal`
- `closeReflectionModal()`
- `submitReflection(timeOfDay)` — reads textareas, calls `saveReflectionAnswer()`, closes modal, shows toast
- `renderReflectionTab()` — full-page view: today's answers + last 7 days + streak + "view 90 days" button
- `renderReflectionHistory(days)` — chronological list of past answers
- `renderQuarterlyRetrospective()` — 90-day pattern summary + "Copy to Obsidian" button

UI elements (CSS in `css/reflection.css`):
- `.reflection-modal-overlay` (fullscreen dim background)
- `.reflection-modal` (bottom sheet, slide-up animation, 70vh)
- `.reflection-question-card` (question + textarea, 3 stacked)
- `.reflection-actions` (저장 / 건너뛰기 / 닫기)
- `.reflection-streak-badge` (current streak indicator)
- `.reflection-history-item` (date + answers preview)

## Phase 5 — Tab integration (~30 lines + HTML)

`js/state-types.js`: extend `currentTab` enum with `'reflection'`.

`navigator-v5.html`: add 6th tab button "🌙 자문" or hide under `more` menu (decision: based on user expected daily-vs-occasional access — recommend `more` menu since main reflection happens in modal, not tab).

`js/render.js` + `js/render-action.js`: add `case 'reflection': renderReflectionTab(); break;` in main render dispatch.

`js/ui.js` `switchTab()`: handle 'reflection' tab.

## Phase 6 — Auto-modal trigger (~50 lines)

File: `js/init.js` (or new `js/reflection-trigger.js`)

`setInterval` every 5 min: check `shouldShowReflectionModal()`, if true and `autoModalEnabled` and not currently in another modal, call `showReflectionModal('evening')`. Same for morning.

Alternative trigger: on `visibilitychange` event (user opens app), check pending reflections (today's evening missed if past 22:00 + not answered).

## Phase 7 — PWA push notification (optional, ~80 lines)

File: `js/pwa.js` extend (or new `js/reflection-push.js`)

If `settings.pushEnabled`:
- Register Push API subscription on first opt-in
- Server-side scheduled push at 22:00 (requires backend — Firebase Cloud Functions OR client-side `setTimeout` with service worker `showLocalNotification` if Push API server unavailable)
- For pure client-side: use `setTimeout` calculated to next 22:00, on trigger call `self.registration.showNotification(...)` (sw.js handler line 173 already exists)
- Click → `notificationclick` handler (sw.js:189) opens navigator → `shouldShowReflectionModal()` returns true → modal opens

Implementation note: pure client-side scheduled local notification works while PWA is installed and service worker is active. Background scheduling needs `Periodic Background Sync` API (Chrome only) or actual server push. v1 = client-side `setTimeout`, fallback = visibilitychange trigger when user opens app.

## Phase 8 — Quarterly export (~70 lines)

`js/reflection.js` `exportQuarterlyMarkdown(days=90)`:

```markdown
# 분기 회고 — 2026-Q2 (2026-04-01 ~ 2026-06-30)

## 자문 답변 통계
- 답변 일수: 78/90 (87%)
- 저녁 자문 답변: 78회 / 건너뛰기: 12회
- 아침 자문 답변: 0회 (비활성)
- streak best: 23일 / current: 5일

## 패턴 (저녁 자문)
### 30분 룰 깬 충동
- 가장 자주: ['선물 매수' x12, '메시지 보내기' x5, '큰 결정' x3]
- 줄어드는 추세 (월별: 8 → 6 → 4)

### 과잉 약속 / 압력솥
- 발현 횟수: 18회
- 영역: ['업무' x10, '가족' x6, '친구' x2]

### 내일 작은 약속 (완성률)
- 등록: 78회 / 다음날 완료: 65회 (83%)

## 분기 결정 갱신 후보
1. 30분 룰 적용 영역 = 트레이딩 매수가 1순위 패턴 (12회) → 잠금화면 문구 + Sounding Board 통화 룰 강화
2. 압력솥 영역 = 업무 (10회) → life_os L4 4-1-1 룰 본업 적용
3. ...
```

`renderQuarterlyRetrospective()` UI:
- 위 markdown 미리보기
- "📋 클립보드에 복사" 버튼 → `navigator.clipboard.writeText(markdown)`
- "Obsidian roadmap.md에 paste 안내" 텍스트
- 데이터는 navigator에 그대로 보존 (압축은 user 머릿속 + 클립보드 markdown만)

## Phase 9 — Cache + sw.js update

`sw.js` `urlsToCache` array에 추가:
- `'./js/reflection.js'`
- `'./js/reflection-render.js'`
- `'./js/reflection-trigger.js'` (Phase 6)
- `'./js/reflection-push.js'` (Phase 7, if separate)
- `'./css/reflection.css'`

`sw.js` `CACHE_NAME` bump (v6.13 → v6.14).

`navigator-v5.html` `<script>` tags 추가 (sequential load order — after state.js, before init.js).

## Verification (acceptance criteria)

| Phase | Test | Pass criteria |
|---|---|---|
| 1-2 | state load/save | localStorage `navigator-reflection` round-trips. Firebase sync verified for logged-in user |
| 3 | core logic unit-level | `shouldShowReflectionModal()` returns true at 22:00 if not answered, false otherwise. `updateReflectionStreak()` correctly counts consecutive days |
| 4 | UI modal | 22:00 자동 modal pops, 3 질문 + textarea, 저장 시 history에 박제 |
| 5 | tab | `more` 메뉴에 "🌙 자문" 진입 → renderReflectionTab() 표시 |
| 6 | auto-trigger | 22:00 도달 + 오늘 미답 → modal 자동 노출. visibilitychange로 앱 열면 누락 자문 노출 |
| 7 | push (optional) | PWA 설치된 폰에서 22:00 알림 도착 → 클릭 → 앱 열림 + modal |
| 8 | quarterly | "분기 회고" 진입 → 90-day stats + markdown 클립보드 복사 작동 |
| 9 | cache | sw.js v6.14 install → 새 파일 캐시 등록 |

E2E flow:
1. 앱 install + reflection 활성화 (default ON 권장)
2. 22:00 도달 → modal 자동 노출 (또는 push 클릭)
3. 3 질문 답 입력 (3분) → 저장 → 자동 닫힘 + streak 갱신
4. 다음 22:00 → 동일 흐름 (반복)
5. 분기 시점 (3개월 후) → "🌙 자문" 탭 → "분기 회고" → markdown 복사 → Obsidian roadmap.md paste
6. 매일 Obsidian 진입 = 0

## Phase 4.5 — Settings UI (~80 lines)

User가 reflection 시각·질문·알림 customize 가능해야. 새 file 안 만들고 기존 settings modal에 섹션 추가.

File: `js/render-settings.js` (existing) — append section:

```html
<div class="settings-section">
  <h3>🌙 자문 설정</h3>

  <label>
    저녁 자문 시각
    <input type="time" id="reflection-evening-time" value="${eveningTime}">
  </label>

  <label>
    <input type="checkbox" id="reflection-morning-enabled" ${morningTime ? 'checked' : ''}>
    아침 자문 활성화
  </label>
  <label class="${morningTime ? '' : 'disabled'}">
    아침 자문 시각
    <input type="time" id="reflection-morning-time" value="${morningTime || '09:00'}" ${morningTime ? '' : 'disabled'}>
  </label>

  <details>
    <summary>질문 customize (저녁 3개 + 아침 3개)</summary>
    <!-- 6 textareas, max 100자 each -->
  </details>

  <label>
    <input type="checkbox" id="reflection-auto-modal" ${autoModalEnabled ? 'checked' : ''}>
    시각 도달 시 modal 자동 노출
  </label>

  <label>
    <input type="checkbox" id="reflection-push" ${pushEnabled ? 'checked' : ''} ${pwaInstalled ? '' : 'disabled'}>
    PWA 알림 (앱 설치된 경우만)
  </label>

  <button onclick="resetReflectionSettings()">기본값 복원</button>
</div>
```

Save handler: `applyReflectionSettings()` reads form values → updates `appState.dailyReflection.settings` → `saveState()`.

Default behavior: feature is *enabled by default* (`autoModalEnabled: true`), *push opt-in* (`pushEnabled: false`). User can fully disable via these toggles.

## Phase 5.5 — Multi-device sync logic (~40 lines)

Firebase realtime listener (existing `firebase-sync.js` `onSnapshot`) detects answer from another device.

Logic in `reflection-render.js`:
- Modal open → register one-shot snapshot listener for `dailyReflection.history[today]`
- If listener fires with non-null evening/morning answer (from other device) → close modal + toast "다른 기기에서 답 완료됨"
- Race resolution: `answeredAt` ISO timestamp comparison (server timestamp). last-write-wins
- Close modal explicit listener teardown to avoid memory leak

Phase 4 modal flow update:
1. `showReflectionModal('evening')` opens
2. Register listener
3. User answers OR other device answers (whichever first wins)
4. Listener fires either way → close + cleanup

## Phase 8.5 — Skip + Streak rules (decision required)

**Decision**: skip = streak resets (안 답 = 답 안 한 것과 동일 취급).

Rationale: mylife "self-discipline = quality" rule — gaming streak by skipping defeats purpose. Single skipped day breaks streak; user re-starts from current=1 next day they answer.

Alternative considered: weekly skip budget (3 skips/week before reset) — rejected as over-complex + game-able.

`updateReflectionStreak()`:
```js
// 매일 자정 또는 답 저장 시 호출
const yesterdayKey = getYesterdayDateStr();
const yesterday = history[yesterdayKey]?.evening;
if (!yesterday || yesterday.skipped) {
  // streak 깨짐
  appState.dailyReflection.streak.current = 0;
}
// 오늘 답하면 +1
if (history[todayKey]?.evening && !history[todayKey].evening.skipped) {
  appState.dailyReflection.streak.current += 1;
  if (current > best) best = current;
}
```

Best streak update → toast notification ("최고 streak 갱신: N일!").

## Phase 9.5 — Onboarding (~50 lines)

First-time user (or feature first-enable) → onboarding modal explaining reflection.

Trigger: on `loadState()` → if `appState.dailyReflection.history` is empty AND `dailyReflection.settings.autoModalEnabled` AND no localStorage key `navigator-reflection-onboarded` → show onboarding modal.

Modal content:
- "🌙 매일 자문이 추가됐습니다"
- "저녁 22:00에 3분 자문 modal이 자동으로 떠요. 답하면 streak이 쌓입니다."
- 샘플 질문 3개 표시 (default evening questions)
- "지금 시작" / "나중에 (settings에서 활성화)" 버튼
- 후자 → `autoModalEnabled = false` + onboarded flag set

`localStorage.setItem('navigator-reflection-onboarded', 'true')` 후 modal 닫음 → 다시 안 띄움.

## Phase 10 — Performance & Scale (~30 lines + design rule)

Storage budget:
- 1 ReflectionDay ≈ 600 bytes (3 textareas × ~150-200 chars each, JSON overhead)
- 1년 = 365 days × 600 = ~220KB
- 5년 = ~1.1MB → Firestore doc 1MB limit 위배 가능

Solution (existing `compactOldCompletionLog` 패턴 follow):
- `compactOldReflectionLog()` runs on `loadState()`
- 1년 이상 days → flat compressed format: `{date, eveningSummary, morningSummary, answered}` only (full text dropped)
- Compression yields ~50 bytes/day → 5년 = ~91KB

UI render scaling:
- History tab default: last 30 days
- "더 보기" → load 30 more (pagination)
- 90-day quarterly view: server-side aggregate query (Firestore)

## Phase 10.5 — Accessibility (~20 lines + CSS)

Modal:
- `role="dialog"`, `aria-labelledby="reflection-title"`, `aria-modal="true"`
- First textarea `autofocus` on open
- Esc 키 = `closeReflectionModal()`
- Tab navigation through 3 textareas + skip + save buttons (loop trap)
- Cmd/Ctrl+Enter = `submitReflection()` (저장 단축키)

CSS:
- `:focus` outline visible (ADHD: 강한 visual focus)
- `prefers-reduced-motion` 감지 → slide-up animation 비활성

## Phase 11 — Migration safety & Rollback (~20 lines)

**Migration (기존 user 새 버전 update 시)**:
- `loadState()` 첫 실행 시 `appState.dailyReflection` field 부재 → 초기값으로 set (state-types.js default)
- `dailyReflection-onboarded` flag 부재 → onboarding modal 노출 (Phase 9.5)
- 데이터 손상 가능성 0 (새 field 추가만, 기존 field 변경 X)

**Rollback path**:
- User-level: settings에서 `autoModalEnabled: false` + `pushEnabled: false`. data 보존, modal 안 뜸
- Code-level: navigator-v5.html script tags 제거 + sw.js cache list revert + CACHE_NAME bump 다시. user 다음 visit에 새 SW install + 이전 버전으로 회귀
- Data preservation: `dailyReflection` state는 rollback 후에도 localStorage/Firestore에 유지 (re-enable 시 history 살아있음)

## Phase 12 — Edge cases (verification scope)

| Case | Handling |
|---|---|
| 자정 넘김 (23:55 답 → 00:05 streak update) | `getLocalDateStr()` 시점 기준. 자정 후 답 = 다음 날 streak |
| DST 변경 (시각 점프) | `eveningTime` HH:MM 그대로 (localtime 기준), DST 자동 적용 |
| Multi-device 동시 modal | Phase 5.5 realtime listener로 close |
| Offline 모드 | localStorage 저장 → 온라인 복귀 시 Firebase sync |
| Push 권한 거부 | settings UI에 "권한 거부됨" 표시, autoModal로 fallback |
| 1년 이상 데이터 | Phase 10 compaction 자동 |
| First-time install | Phase 9.5 onboarding |
| Tab background에서 22:00 도달 | visibilitychange 트리거로 modal 노출 (Phase 6) |

## Risks / Open Questions

- **iOS PWA push limitation**: iOS 17.4+ 부터 web push 지원. user iOS 버전 확인 필요. fallback = client-side `setTimeout` + visibilitychange
- **Firebase sync schema**: 새 top-level field `dailyReflection` 추가가 기존 sync logic에 자동 포함되는지 (`firebase-sync.js` 검토 필요). 명시적 field list가 있다면 추가 필요
- **autoModal vs user 작업 흐름**: 22:00 에 user가 다른 작업 중이면 modal interrupt → cognitive load 가능. 30 min 윈도우 (22:00-22:30) + skip 옵션으로 mitigation
- **데이터 누적**: 1년 = 365 ReflectionDay × ~600 bytes ≈ 220KB. localStorage limit 5MB 안 / Firestore 1MB doc limit 잘 안 위배. 그러나 *5년*가면 1MB+ 가능 → 1년 이상 historical은 압축/아카이브 필요 (existing `compactOldCompletionLog` 패턴 참조)
- **streak gaming**: streak 욕심 → "건너뛰기"를 답으로 가짜 입력 가능. 단 mylife "self-check 퀄리티 = self-discipline" 룰. 시스템적 강제 어려움
- **답 길이 제한**: textarea max 200자 권장 (life_compass.md 룰: "30초 안에 답이 나와야"). 길어지면 reflection 의도 변질
- **multi-device sync timing**: 22:00 에 폰·PC 둘 다 modal? Firebase sync로 둘 중 한 곳에서 답 → 다른 곳도 dismiss. 충돌 처리 logic 필요

## References

- `state-types.js:166-176` — lifeRhythm 패턴 (history dict + settings + medication slots)
- `state-types.js:379-381` — habitStreaks 패턴 ({title: {current, best, lastActiveDate}})
- `state-types.js:299-303` — weeklyPlan focusTasks (max 3, lastReviewDate)
- `init.js:230-260` — modal 패턴 (showImportConfirmModal 참조)
- `sw.js:173-203` — push notification + notificationclick (이미 구현)
- `state.js:9-149` — load/save 패턴
- `render.js:81+` — renderStatic 흐름
- `/c/vibe/docs/plans/PLAN-NAVIGATOR-LIFEOS-INTEGRATION.md` — v4 mental model (이 plan은 그 implementation 측면)
- `/c/vibe/projects/navigator/CLAUDE.md` — navigator 룰 + sequential script loading
- `/c/vibe/AGENTS.md` §16 — Atomic Commit Policy (commit msg = `<TASK-ID>: <subject>`)

## Codex Dispatch Prompt (after user review)

```
PLAN-NAVIGATOR-DAILY-REFLECTION.md (projects/navigator/docs/) Phase 1-12 implement.

Stack: Vanilla JS + Firebase Auth/Firestore + PWA. Sequential script loading
(no bundler). Add ~700-1100 lines total across phases:
- Phase 1-3: state schema + load/save + core logic (state-types.js typedef +
  appState init, state.js load/save, firebase-sync.js explicit field if needed,
  new reflection.js)
- Phase 4: reflection-render.js modal/sheet UI + history view + quarterly view
- Phase 4.5: render-settings.js extension (settings UI section + handlers)
- Phase 5: tab integration (currentTab enum + render dispatch + switchTab)
- Phase 5.5: multi-device sync (firebase realtime listener in modal)
- Phase 6: reflection-trigger.js (setInterval + visibilitychange)
- Phase 7: reflection-push.js (client-side setTimeout + sw.js handler reuse,
  server push deferred)
- Phase 8: quarterly export (clipboard markdown, no Obsidian write)
- Phase 8.5: streak rules (skip = reset, daily missing = reset)
- Phase 9: sw.js cache list + CACHE_NAME bump (v6.13 → v6.14) + navigator-v5.html
  script tag order
- Phase 9.5: onboarding modal (first-time + feature enable)
- Phase 10: compactOldReflectionLog (1년 이상 압축, completionLog 패턴 follow)
- Phase 10.5: A11y (role/aria + Esc/Tab/Enter shortcuts + prefers-reduced-motion)
- Phase 11: migration safety (loadState 자동 init for missing field) + rollback path doc
- Phase 12: edge cases (자정 넘김 / DST / offline / push 거부 / first-time / multi-device)

Constraints:
- Patterns reuse: lifeRhythm 6항목+settings / habitStreaks current·best·lastActiveDate /
  weeklyPlan focusTasks 3max / completionLog compaction / showImportConfirmModal modal
- Modal: bottom sheet, 70vh, slide-up. 3 questions × ~150-200 chars textarea (max 200자).
  저장 / 건너뛰기 / 닫기. autofocus first textarea + role=dialog + aria-modal
- Trigger: setInterval 5min + visibilitychange. autoModalEnabled toggle 존중. tab background에서 도달 = 다음 visibilitychange에 노출
- Streak: skip = reset, daily 답 = +1, best 갱신 시 toast
- Settings UI: 시각 (HH:MM input) / 질문 customize (6 textarea) / push 토글 (PWA 설치 시만 enabled) / autoModal 토글 / 기본값 복원
- Multi-device: Firebase onSnapshot listener in modal (one-shot per session). 다른 디바이스 답 → close + toast. last-write-wins (answeredAt 기준)
- Quarterly: 90일 history → markdown (답변 통계 + 키워드 빈도 + streak + 결정 갱신 후보 섹션) → clipboard.writeText. no file system write
- Firebase sync: verify firebase-sync.js의 sync payload에 dailyReflection field 자동 포함 확인.
  자동 안 되면 explicit 추가 (workProjects/lifeRhythm 패턴 follow)
- iOS PWA push: 17.4+ 부터 web push. fallback = visibilitychange + setTimeout
- Migration: 기존 user data 0 손상 (새 field 추가만). first-load 시 자동 init + onboarding modal
- Rollback: user-level settings 토글로 disable. code-level은 sw.js + html revert + CACHE_NAME bump
- A11y: focus trap / Esc / Cmd-Enter / prefers-reduced-motion / strong :focus outline (ADHD)
- Performance: 1년 이상 data compactOldReflectionLog (~50 bytes/day flat). history view 30-day default + pagination

Verification per phase (plan §Verification + §Phase 12 edge cases). E2E flow on
dev server (npx serve -p 5000) — first install → onboarding → 22:00 modal →
answer → streak → quarterly markdown clipboard → settings disable/enable.

Commit per phase atomic, format: `<scope>(reflection): Phase X — <subject>`
e.g., `feat(reflection): Phase 1-3 — state schema + core logic`. Conventional
commits style (navigator repo follows it, not workspace AGENTS.md §16 TASK-ID format).

Branch: feature branch `feature/daily-reflection` recommended for review,
merge to main after Phase 9 verification (cache + script load order critical).

Out of scope:
- Server-side push notification (Firebase Cloud Functions)
- NLP / AI keyword extraction (frequency-only sufficient for v1)
- Multi-timezone (single device timezone only)
- Reflection text 검색 (필요 시 v2)
- Streak budget (3 skips/week 등 — 기각됨, simple reset)
```
