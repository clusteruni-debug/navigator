# Navigator Design Session Handoff

> Session ended: 2026-05-21
> Reason: design work was mid-level, not senior. New session needed with disciplined phase order.

## What was done this session

### Mockups created
- `01-action-tab.html` — action tab 9 → 3 components redesign + medication ADHD/영양제 split with add/delete affordances
- `02-dashboard-tab.html` — dashboard sub-tab nav (전체/수익/건강/패턴) + Hero v3 clean (no nested cards) + day timeline + 6 new analysis components (월 목표 / ROI 막대 / 수면-완료율 / 수면 부채 / 카테고리×시간대 heatmap / 반복 미루기)
- `03-all-tasks-tab.html` — 4 iterations:
  - v1: list view (deep management surface) — wrong pattern
  - v2: card aggregate grid + 이번 주 분포 chart — too aggregate
  - v3a: card with time-axis alert preview + stable anchors — still aggregate
  - **v3 final**: kanban column pattern (Linear/Trello/Notion board view 표준) — 4 카테고리 column + inline task list + stable anchors row 상단 + 이번 주 분포 제거. APPLIED.

### Codex dispatches
- ✅ Action tab: `task-mpe65d50-klear1` COMPLETED
  - render-action.js +252/-204, rhythm-medication.js +1, tasks.css +399/-30
  - Verification: `npm test` 40/0 PASS, Playwright smoke PASS
  - **CC Rule #14 review PENDING** — new session
- ✅ Dashboard: `task-mpe8b97w-hewsc9` COMPLETED (36m 40s)
  - render-dashboard.js + render-dashboard-sections.js + dashboard.css
  - 4 sub-tab routing + Hero v3 + day timeline + 8 new analysis functions
  - Verification: `npm test` 40/0 PASS, Playwright smoke PASS
  - Caveat: `postponeTask()` lives in `js/ui.js` (not `actions-*.js`) — out of whitelist, fallback handled (reads both `postponeCount` and `postponedCount`)
  - **CC Rule #14 review PENDING** — new session
- ⏳ All-tasks: `task-mpea2nb9-8vuo1c` IN PROGRESS at session close
  - Spec at `projects/navigator/agent_docs/codex-task-all-tasks-redesign.md`
  - Mockup 03 = 2x2 grid (일 row / 생활 row) + stable anchors + repeating task inline completion + search
  - **New session: check status + Rule #14 review when complete**

### Section inventory + supporting files
- `projects/navigator/docs/design-mockups/section-inventory.md` — 14 sections + 6 modals mapped
- `projects/navigator/agent_docs/codex-task-action-tab-redesign.md` — action tab implementation spec
- `projects/navigator/agent_docs/codex-task-dashboard-redesign.md` — dashboard implementation spec

## Why this session is being closed

CC's design work was **mid-level, not senior-level**. Specific failures:

1. **Pattern hopping without coherent vision** — segment-by-segment fix-and-move (액션 탭 → 대시보드 → 할일 탭), no overall design language defined first
2. **Reference depth lacking** — WebSearch text summaries only, no actual Dribbble visual study, no Things 3/Linear screenshot analysis
3. **Design principle articulation absent** — "ADHD-first", "category-coded peripheral scanning" mentioned but not systemically applied across mockups
4. **Misread user mental model multiple times** — "완료 어디로", "전체 조망", "무슨 일 있나" each triggered re-direction. Root mental model not asked before applying patterns
5. **High-fi mockup-first workflow** — should have been: design system audit → user journey → token rebuild → wireframe → mockup. Did it backwards

## What new session should do (Phase 0-6 disciplined order)

### Phase 0 — Design system audit (Phase 0 is BLOCKING — do not skip to mockup)
- Read DESIGN.md fully + ARCHITECTURE.md + CLAUDE.md design rules
- Inventory existing CSS variables (`--cat-*`, `--accent-*`, `--bg-*`, `--text-*`, spacing, radius, shadow, etc.)
- Identify gaps in current token system:
  - Motion choreography missing
  - Semantic spacing scale (`--space-1` ~ `--space-12` style)
  - Elevation system (currently only flat surfaces)
  - Typography hierarchy explicit purposes

### Phase 1 — User journey scenarios
Write `projects/navigator/docs/design-mockups/_user-journeys.md` with 4 scenarios:
- **아침** — 기상 → 출근 transition. Which screens, what tasks, what visual feedback
- **통근** — commute mode active. What's prominent, what's hidden
- **회사** — work mode focus. How interruption-resistant
- **저녁** — 여유 mode + 회고. Reflection trigger, retrospective UX

Each scenario: list every screen visited + every micro-decision + ideal visual feedback.

### Phase 2 — Design token rebuild
- Spacing scale: rename to semantic (`--space-tight`, `--space-comfortable`, `--space-loose` or `--space-1` ~ 12 with explicit purpose)
- Elevation: `--elevation-base`, `--elevation-card`, `--elevation-overlay`, `--elevation-modal`
- Motion: `--motion-duration-fast` (0.1s), `--motion-duration-base` (0.2s), `--motion-duration-slow` (0.4s) + `--motion-easing-standard`, `--motion-easing-emphasis`
- Typography: `--text-display`, `--text-title-1`, `--text-title-2`, `--text-body`, `--text-caption`, `--text-mono` with explicit weight + line-height + tracking

### Phase 3 — Interaction principles
- Hover behavior: per surface type (card / button / list item) — Standing rule = bg/border only, but specify which tokens
- Focus indicator: keyboard focus visual system (color + offset + thickness)
- Touch feedback: mobile press state (Standing rule = no transform, what alternative?)
- Animation rules: explicit motion budget (when motion is allowed, when not)

### Phase 4 — Visual reference study
- Save 10+ Dribbble shots related to "minimal task manager", "ADHD planner", "dashboard overview 2026"
- Analyze 3+ Linear / Things 3 / Notion screenshots — actual visual composition, not text description
- Pattern extraction document: which patterns apply to navigator-specific application

### Phase 5 — Whole flow wireframe (low-fi)
- 9-tab navigation structure decision (top tab bar / side nav / mixed)
- Tab transition pattern
- Modal/overlay strategy
- Empty state design
- All low-fi: layout boxes only, no color, no specific typography

### Phase 6 — High-fi mockup per tab
- Apply Phase 0-5 outputs
- Per tab: BEFORE / AFTER + change-note tied to design system tokens
- Sequential: one tab approved before next starts

### Phase 7 — Integration audit (added at session close based on user feedback)
- After all per-tab mockups (Phase 6) complete, audit cross-section consistency
- Token drift check (e.g., heading size used differently in tab A vs B)
- Interaction pattern consistency (hover/focus/transition uniform)
- IA consistency (시간 axis primary 또는 카테고리 axis primary 결정 일관)
- Cross-tab navigation flow check (탭간 이동 smooth, redundancy 제거)
- Final polish + design system documentation update

User signal: "섹션별로 다 ux/ui 뜯어고친 다음에 마지막에 최종 통합 적용" — integration audit이 그 통합 작업

## Fundamental questions raised at session close (MUST answer in Phase 0)

### Category axis legitimacy (CRITICAL — undermines all 4 mockup iterations)
- Current assumption: 본업 / 부업 / 일상 / 가족 = 4 orthogonal navigation axis
- User feedback at session close: "일상에 가족이 포함됨" → 일상 ⊃ 가족 = NOT orthogonal
- Resolution options:
  - **A**: 3 categories (본업 / 부업 / 일상). 가족 = sub-tag or label inside 일상
  - **B**: 4 categories with explicit boundary (e.g., 일상 = self-care vs 가족 = family-targeted)
  - **C**: Categories = peripheral scan visual tool only (left-bar color), NOT navigation axis. Time axis primary.

### Reference fit doubt (raised by user)
- Things 3 = time axis primary (Today/Anytime/Someday) + project as side
- Linear/Trello = status axis primary + project filter
- Todoist = project hierarchy (parent-child), category-style direct axis weak
- All-tasks mockup iterations tried category-column kanban — **no popular task app does this pattern**
- User comment: "레퍼런스 찾아놓고도 애매해진 느낌" — applied references don't fit navigator's mental model. This is a strong signal the pattern itself is wrong, not the visual polish.

### Likely re-direction (Phase 0 should decide)
- **Flat time-grouped list** (Things 3 Anytime + grouping by deadline). Categories = left-bar color (peripheral scan), NOT primary navigation
- Group headers: 오늘 / 이번 주 / 다음 주 / 나중 / 마감 없음
- Task item = 제목 + 카테고리 4px left-bar + 마감 chip
- Stable anchors row 상단 유지 (오늘 마감 / inbox / streak)
- Aligns with DESIGN.md "peripheral scanning" principle properly — peripheral = visual identification, NOT axis of navigation
- All-tasks tab = single column flat list, time-grouped, dense visible inventory

### What this means for current mockup 03
- v3 final (kanban column) is **likely wrong pattern** for navigator
- Do NOT dispatch all-tasks tab to Codex from current mockup
- Phase 0 must answer category axis question + time-axis vs category-axis primary
- Re-design mockup 03 after Phase 0 conclusion

## Resolved IA decisions (at session close — Phase 0 input)

### Completed task surface ownership
- 할일 탭 = 진행 중 task만 (완료 표시 X)
- 각 카테고리 탭 (본업/부업/일상/가족) = local history (그 카테고리 최근 완료)
- 히스토리 탭 (9-tab #8) = cross-cutting retrospective (모든 카테고리 mix, 캘린더 view, 통계)
- 즉 2-layer history: local (per-category) + cross-cutting (history tab)

### Repeating task completion feedback (할일 탭 inline)
- `repeatType !== 'none'` task만 적용
- 완료 시 strikethrough + opacity 0.5 + 같은 column 안 유지 (다음 instance 새로 등장)
- 일회성 task 완료 = list에서 즉시 사라짐 (다른 mental model)
- ADHD progress dopamine 충족
- Toggle 옵션 (hide/show completed repeating) — default = show
- Mockup 03에 example 추가됨 (일상 column 안 "아침 약 복용 / 스트레칭")

### 본업 hierarchy depth (할일 탭 vs 본업 탭)
- 할일 탭 본업 column = 간단 task title only (scan surface)
- 본업 탭 (9-tab #3) = 프로젝트 / 단계 / 중분류 / task **4-level hierarchy** (deep navigation)
- 기존 코드 (work-project-crud.js, work.js) 이미 hierarchy 보유 — 새 시스템 zero
- 즉 할일 탭 = "공항판" / 본업 탭 = "세부 게이트"
- IA 원칙: cross-cutting overview는 simple, deep navigation은 그 surface에서

### Category axis (resolved from earlier "Fundamental questions")
- 4 카테고리 (본업/부업/일상/가족) = 2-level hierarchy:
  - **일** (work parent) = 본업 + 부업
  - **생활** (life parent) = 일상 + 가족
- 2x2 grid position이 hierarchy 표현 (row label "일" / "생활" 작은 가이드)
- Reference: Notion sub-grouping pattern + Bento grid spatial weight
- Mockup 03 applied

## Outstanding decisions (decided by owner, pending CC implementation)

### Tab navigation structure
- User confirmed 9-tab mental model: 오늘 / 할일 / 본업 / 이벤트 / 일상 / 통근 / 통계 / 히스토리 / 자문
- Current code = 6 tabs (액션 / 업무 / 이벤트 / 대시보드 / 전체 / 기록)
- 3 surfaces need promotion: 일상 (task category as tab), 통근 (shuttle toggle as tab), 자문 (reflection modal as tab)
- Nav structure mockup needed: top tab bar / sidebar / mixed for 9 tabs
- Mobile + 단축키 1-9 fit

### All-tasks tab pattern
- User feedback: card aggregate ≠ visible inventory. List was better but not perfect.
- Recommended pattern: kanban column (4 카테고리 = column, task list inline, 7-task limit + "+N개 더" expand)
- NOT applied in v3 — new session decides after Phase 0-5

### Mode system visual treatment
- Current: mode badge capsule (single small visual element)
- Potential expansion: hero background subtle tint per mode (회사 / 여유 / 휴식 / 출근 / 생존)
- ADHD context switch cost reduction — strong visual mode signal

### Category color usage
- DESIGN.md identity: "category-coded peripheral scanning" core principle
- Current usage: 4px left bar (task item only) + category pill
- Potential: card layout differentiation per category, deeper visual integration (header color, accent fill, etc.)

### Action tab status bar ownership
- Currently: status bar in both action tab AND dashboard (redundancy)
- Decision pending: which surface owns status bar (likely dashboard = state owner, action tab = work surface)
- Affects code applied via action tab dispatch — may need follow-up

## Files modified this session

```
projects/navigator/docs/design-mockups/01-action-tab.html
projects/navigator/docs/design-mockups/02-dashboard-tab.html
projects/navigator/docs/design-mockups/03-all-tasks-tab.html
projects/navigator/docs/design-mockups/section-inventory.md
projects/navigator/docs/design-mockups/_session-handoff.md  (this file)
projects/navigator/agent_docs/codex-task-action-tab-redesign.md
projects/navigator/agent_docs/codex-task-dashboard-redesign.md
```

## Codex modifications (pending CC review)

Action tab Codex output — file diff list:
- `projects/navigator/js/render-action.js`: +252/-204
- `projects/navigator/js/rhythm-medication.js`: +1/-0 (영양제 아침 default slot)
- `projects/navigator/css/tasks.css`: +399/-30

Codex divergence notes:
- Used Lucide `arrow-right` for 집출발 and `briefcase` for 근무종료 (spec allowed)
- Kept `<details open>` wrap around rhythm/medication (spec note)
- `state-types.js` default slots NOT updated (out of whitelist — only `getMedicationSlots()` fallback updated)
- TODO comments at `render-action.js:20-21` for routing of removed sections (결심 트래커 / 다른 작업 list / 오늘 완료 / 상세 추가 폼)

## How new session should start

```
1. /session-start navigator
2. Read this handoff first: projects/navigator/docs/design-mockups/_session-handoff.md
3. Check dashboard Codex dispatch status:
   bash /c/vibe/config/claude-global/scripts/codex-dispatch.sh --status task-mpe8b97w-hewsc9
4. Begin Phase 0 (design system audit) — DO NOT jump to mockup
5. Review action tab Codex output (Rule #14): /code-review per spec
6. Decide: full Phase 0-6 or continue per-tab mockups (recommend Phase 0-6)
```

## Anti-patterns from this session to avoid

- ❌ Pattern swap when user pushes back — instead, ask root mental model first ("이 surface의 목적이 정확히 뭐야?")
- ❌ WebSearch text summary as final reference — must actually look at visual examples
- ❌ High-fi mockup before design system audit + user journey
- ❌ Per-tab segment work without overall navigation flow established
- ❌ "Adding components" when user says "한 눈에 잘 안 들어와" — usually means *fewer + clearer*, not *more variants*
- ❌ Skipping the "why this pattern" articulation — every design choice must trace to a user need or design principle

## New session prompts (copy-paste ready)

### Prompt A — Codex dispatch review session

Use when 03 (할일 탭) Codex done. Reviews 3 dispatches (action / dashboard / all-tasks) per Rule #14.

```
/session-start navigator

Navigator design 작업 중 Codex dispatch 3개 review 필요. 이전 세션 결과:
- 액션 탭: task-mpe65d50-klear1 (done, render-action.js +252/-204, rhythm-medication.js +1, tasks.css +399/-30)
- 대시보드: task-mpe8b97w-hewsc9 (done, render-dashboard.js + render-dashboard-sections.js + dashboard.css)
- 할일 탭: task-mpea2nb9-8vuo1c (dispatched, check status first)

진행 순서:
1. 03 status check: bash /c/vibe/config/claude-global/scripts/codex-dispatch.sh --status task-mpea2nb9-8vuo1c
2. 끝났으면 --result fetch + git status --short
3. handoff Read: projects/navigator/docs/design-mockups/_session-handoff.md (visual source of truth 확인)
4. /code-review 호출 (5-agent local + Codex parallel cross-model) — 3 탭 통합 review
5. 발견된 issue별 수정 (CC 또는 dispatch fix-up)
6. owner commit/push trigger (Codex/CC autonomous X)

Review focus per Rule #14:
- 3+ files modified (조건 충족), 100+ lines (조건 충족), architectural decision (sub-tab navigation 신규)
- Standing rules 준수 (no emoji, hover bg/border only, CSS variables only)
- Design intent vs implementation fit (mockup 01/02/03 의 AFTER 와 코드 align)
- Cross-tab consistency (3 dispatch 통합 — token / interaction / IA 일관)

self-review 금지 — CC가 author 아닌 reviewer 모델. Codex output review가 fresh context 핵심.
```

### Prompt B — Navigator UX/UI 이어가기 session

Use after Prompt A review pass. Continues design work per handoff Phase 0-7.

```
/session-start navigator

Navigator UX/UI 디자인 작업 이어감. 이전 세션에서 3 탭 (액션 / 대시보드 / 할일) mockup + dispatch + review 완료. 다음 영역 남음.

진행 순서:
1. handoff Read: projects/navigator/docs/design-mockups/_session-handoff.md (Phase 0-7 + Resolved IA decisions 반드시 확인)
2. Phase 0 — design system audit (DESIGN.md / ARCHITECTURE.md / CLAUDE.md / base.css 토큰 inventory). mockup 부터 안 함
3. Phase 1 — user journey 시나리오 4개 (아침/통근/회사/저녁) 작성
4. Phase 2 — 디자인 token rebuild (spacing/elevation/motion/typography)
5. Phase 3 — interaction principles 명시
6. Phase 4 — visual reference 10+ shot 수집 (Dribbble / Linear / Things 3 actual)
7. Phase 5 — whole flow wireframe (9-tab nav 구조 결정 — 9개 격상 vs 6+sub-surface)
8. Phase 6 — per-tab mockup: 이벤트 / 일상 / 통근 / 히스토리 / 자문 (5 탭 남음)
9. Phase 7 — integration audit (3+5 = 8 탭 통합 일관성 + 토큰 drift fix)

남은 mockup 탭 (Phase 6):
- 이벤트 (이벤트 탭, render-events*.js)
- 일상 (NEW 탭 격상 검토 — 일상 카테고리 자체 탭으로)
- 통근 (NEW 탭 격상 검토 — 현재 셔틀 토글 + commute 모듈)
- 히스토리 (기록 탭, render-all.js renderHistoryTab + retrospective surface)
- 자문 (NEW 탭 격상 검토 — 현재 reflection 모달)

Outstanding decisions (handoff "Outstanding decisions" 섹션 참조):
- 9-tab nav 구조 (mobile fit + 단축키 1-9)
- mode system 시각 차별화 강도 (현재 capsule 1개)
- category 색 활용 layer (left-bar 외)
- action tab status bar ownership (액션 vs 대시보드)

Anti-patterns from 이전 세션 (handoff "Anti-patterns" 섹션 — 반드시 피하기):
- Pattern swap when user pushes back → root mental model 먼저 묻기
- WebSearch text summary 만 사용 → actual visual reference 분석
- High-fi mockup before audit → Phase 0 부터
- Per-tab segment work → whole flow 먼저
- "Adding components" when user says "한 눈에 안 들어와" → fewer + clearer

reference + ADHD 디자인 원칙 + 카테고리 2-level hierarchy (일/생활) 일관 적용.
```

## Memory pointers for new session

- `memory/feedback/feedback_proactive_self_critique.md` — 5-principle matrix (still apply)
- `memory/feedback/feedback_research_first.md` — external research before structural proposals
- `memory/feedback/feedback_skill_invocation_red_flags.md` — when to use skills vs direct
- `~/.claude/skills/frontend-design/SKILL.md` — for net-new design work (relevant to Phase 4-6)
- `~/.claude/skills/ui-ux-pro-max/SKILL.md` — for existing UI review/improvement (relevant to Phase 3)
