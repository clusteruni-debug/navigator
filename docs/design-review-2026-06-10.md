# Navigator Design & UI Review — 2026-06-10

> Method: 4 parallel code-audit agents (all 33 CSS files + render JS) + 39 live screenshots
> (9 tabs × dark/light × 1440px/390px, seeded with real backup data via Playwright).
> Verified against DESIGN.md, global design rules, and ui-ux-pro-max guidelines.
> Each finding was reality-checked against actual code before inclusion (2 agent claims dropped as false positives).
>
> Reproduce screenshots: `python3 -m http.server 8766 --directory . &` + Playwright script
> seeding localStorage from `navigator-backup-2026-02-21.json` (keys: navigator-tasks,
> navigator-work-projects, navigator-streak, navigator-settings, navigator-completion-log,
> navigator-life-rhythm, navigator-visited=1), then `switchTab()` per tab + fullPage capture.

## Verdict

Foundation is strong: the 3-layer token architecture is genuinely enforced (0 raw hex in
tasks/dashboard/views core CSS), the category/urgency dual-axis identity is implemented,
and components like the NOW card, life-rhythm strip, medication tracker, and command
palette are well above typical side-project quality. The gap is not "design quality" but
**consistency drift across sections** + **two global rendering bugs** + **ADHD-principle
erosion in detail surfaces** (empty-row noise, guilt-inducing overdue badges, semantic
color overload).

Grades: Tokens **A** · Component quality **B+** · Cross-section consistency **C+** ·
ADHD principle fidelity **B** · Accessibility **C+** · Mobile **B-**

---

## P0 — Global, tiny fixes, app-wide impact

### 1. Buttons don't inherit the app font (1-line fix)
`base.css` sets `body { font-family: var(--font-body) }` but there is **no
`button/input/select/textarea { font: inherit }` reset**. UA default font applies to every
unstyled button — on Windows, button Korean text renders in Malgun Gothic while everything
else is Pretendard. Visible in headless screenshots as tofu (□□) on: sidebar/tab nav labels,
time-input modal minute buttons, events filter buttons, commute sub-tabs, NOW-card
미루기/수정 buttons, reflection sub-tab cards.
- Fix: `button, input, select, textarea { font: inherit; }` in base.css.
- Evidence: base.css:258 (body only); screenshots `dark-desktop-events.png`, `dark-desktop-commute.png`.

### 2. Korean text inside monospace font stacks
Hardcoded `'SF Mono', 'Monaco', monospace` stacks contain Korean labels (e.g. dashboard
hero clock prefix "오후") → Korean falls out of the stack and renders in a different font
(tofu in headless, Malgun on Windows). DESIGN.md appendix already lists all 9 sites
(base.css:135, dashboard.css:290/304, history.css:162/248/343, nav.css:203, pomodoro.css:32,
responsive.css:686/696, revenue.css:327, rhythm.css:145/269, settings.css:222) — the
follow-up was never executed.
- Fix: replace all with `var(--font-mono)`; keep mono for digits only — wrap Korean
  prefixes (오전/오후, 분, 일) in a body-font span.
- Evidence: `dark-desktop-dashboard.png` hero "□□ 12:00".

### 3. Hidden time-input modal is keyboard-reachable
`.time-input-modal` (schedule.css:334) hides via `transform: translateY(100%)` only —
still in layout & a11y tree. Tab/screen-reader users can focus its 11 buttons while
invisible. Add `visibility: hidden` (toggle with `.show`), or `inert` attribute.

---

## P1 — Consistency drift (the "looks like 4 different apps" class)

### 4. Deadline chip system has 4 shapes for one axis
Same semantic (deadline urgency) renders as: red **circle** `D+15` (할일 tab), amber
**pill** `내일/D-2` (할일 tab 이번주 group), red pill `D-Day/D+1` (events), `work-dday-chip`
(본업), plus `deadline-chip` vs `dday-chip` duplicate definitions in tasks.css
(:718-744 vs :534-560). Border-radius across chips: 0 / 6 / 10 / 12 / 999px
(views.css:46,87,194,243,277).
- Fix: one `.deadline-chip` component (tabular-nums, 12px/600, radius 6px, urgent/soon/normal
  variants per DESIGN.md §3) consumed by all 4 tabs; delete duplicates.

### 5. Work suite diverged into its own visual language
197 inline `style=""` in work JS, ~83 emoji-as-icon (📅 📋 👥 ▶ ✓), 2 progress-bar styles
(6px vs 8px height, different fill colors), own modal system (work-modal.css radius 16px,
own z-index/scrim) vs global modals.css. Largest section, weakest token adoption.
- Fix order: emoji→`svgIcon()` swap → inline-style extraction to classes → progress-bar
  token (`--progress-h`, fill = `color-mix` pattern) → merge modal styling with modals.css.

### 6. Scrim/overlay inconsistency
modals.css `--overlay-heavy` (0.85) vs command-palette `--overlay-backdrop` (0.7) vs
work-modal own value. Define layer scale: true modal 0.7-0.85 + blur, palette 0.7,
menus none. One token pair, documented in DESIGN.md.

### 7. English section labels violate the project's own microcopy rule
DESIGN.md §5: "No English labels in the UI except technical terms." Live UI has: URGENT,
CATEGORY STATUS, WEEKLY SUMMARY, TODAY TIMELINE (dashboard), COMMUTE, "0 trip" (commute),
Reflection (자문), "오늘 task preview", "streak". If the EN-overline + KR-title pairing is
a deliberate aesthetic, codify it in DESIGN.md §5 with the approved vocabulary; otherwise
localize. Currently it reads as unfinished, and "0 trip" mixes units.

---

## P2 — ADHD-principle erosion

### 8. Daily-repeat tasks show cumulative overdue badges (guilt UI)
Seeded daily habits (스쿼트, 일기 쓰기) display red `D+15` circles — a 15-day debt badge on
a *daily* repeat. For ADHD users this is shame-amplifying noise; the design intent
(deadline = urgency triage) doesn't apply to recurring tasks.
- Fix: repeat tasks show today-scoped state only (오늘 / 밀림 없음), never cumulative D+N.
  Consider auto-rolling repeat deadlines at midnight.

### 9. Empty rows/groups render as noise
- 할일 tab: 다음 주(0), 나중(0) group headers + "없습니다" filler rows always visible.
- Dashboard CATEGORY STATUS: 이벤트 0/0, 미분류 0/0 rows with empty progress bars.
- WEEKLY SUMMARY empty state shows green "-요일" (reads as a glitch).
- Fix: collapse zero groups to header-only (or hide), hide 0/0 categories behind a
  "전체 보기" toggle, and give WEEKLY SUMMARY a proper "아직 데이터 없음" state.

### 10. Section border-left color overloads the category channel
Dashboard sections use border-left colors by *section type* (primary blue, revenue pink,
weekly green, habits amber, insights purple) — same visual channel the app trains users
to read as *category* (본업 indigo / 부업 pink / 일상 green / 가족 amber). 부업-pink ≠
revenue-pink distinction is invisible peripherally.
- Fix: reserve left-edge color bars for category + urgency only; sections get icon + text
  headers (already present) with neutral borders.

### 11. Mobile first-screen economics on 할일 tab
At 390px the 4 stat cards stack full-width; first actual task appears ~1.5 screens down
(header + tabs + title + sort + 4 cards + 8 filter chips). 오늘 tab already solves this
with a 2×2 stat grid — 할일 doesn't reuse it.
- Fix: same 2×2 compact grid (or single summary strip) on 할일/이벤트/일상 mobile.

---

## P3 — Per-section notes

| Section | Keep (working well) | Improve |
|---|---|---|
| 오늘 (action) | NOW card single-CTA hierarchy (green 완료 full-width), life-rhythm strip, medication tracker | Preview rows carry 5 elements (check/title/cat/time/D-chip) — drop time+repeat on mobile; "오늘 task preview" label → Korean |
| 할일 (all) | Group-by-time structure, filter chips with category dots, search | #4 chip unification, #9 empty groups, #11 mobile stats; D+15 circles → pill chips |
| 본업 (work) | Stage/progress data model, featured-project card | Entire #5 cluster; 10px badges (work-project.css:123,310) → 12px; work-modal scale-in → opacity/translate |
| 이벤트 (events) | Card layout (source/type chips + deadline + reward), urgency tint on left bar | Reward "3.7원" unit bug — `_formatEventReward` (render-events.js:312-316) assumes KRW but data appears to be 만원 units [UNCERTAIN — verify source unit]; toggle glyphs ›/⌄/✓ → SVG; `.events-summary` needs ≤480px 1-col fallback (events.css:461) |
| 일상 (life) | Stat cards, sub-tab cards, habit/medication composition | rgba(148,163,184,…) hardcodes (life.css:609,621) invisible on light theme → tokens; chip radius alignment |
| 통근 (commute) | Stat-card row, record slots layout | "COMMUTE"/"0 trip" localization; sub-tab buttons inherit-font fix lands here visibly |
| 통계 (dashboard) | Sub-tab IA (전체/수익/건강/패턴), TODAY TIMELINE component | Hero has 2 stacked progress bars (mode + daily) — label them; light-mode progress tracks nearly invisible (track `--border-light` on white); #2 mono fix lands here |
| 히스토리 (history) | Calendar + weekly bars + category breakdown trio | "전체 삭제" red button sits in header next to title — move destructive actions behind 설정/더보기 with confirm; 11px labels (history.css:72,153) → 12px |
| 자문 (reflection) | Visible labels on all 3 questions (best form hygiene in app), stat cards | "Reflection" label; sub-tab cards' active state weak (border only) — add bg tint; mobile rows=3 textareas → rows=2 |
| 모달/팔레트 | Command palette (blur backdrop, ESC chip, 2-line items) | #6 scrim tokens; quick-edit modal buttons rely on inline styles |
| 설정/프로필 | — (not deeply audited this pass) | settings.css:222 bare `monospace`; profile.css `.category-stat` shares styles with dashboard render — verify after #4 |

## Color direction note

Current palette (vivid category accents on slate navy) matches the established preference —
no muting proposed. Optional refinement: 부업 `#f093fb` is perceptually much lighter than
본업 `#667eea` (uneven peripheral weight); an OKLCH chroma/lightness equalization pass
could level the 4 category colors. Per workspace rule, any palette change ships as an HTML
prototype first, not a text proposal.

## Suggested execution order

1. P0 #1-#3 (one CSS commit — global font reset + mono tokenization + modal visibility)
2. #4 chip unification + #9 empty states (tasks/views/dashboard)
3. #8 repeat-task badge logic (render logic, small)
4. #5 work suite cleanup (largest; dispatchable as its own task)
5. #7 + 통근/자문 localization sweep
6. Light-theme contrast pass (#11 tracks, life.css headers, heatmap levels)

False positives dropped during reality check: `.urgent-item`/`.category-stat` "missing CSS"
(they live in revenue.css:360/profile.css:187 — import chain covers them); `:active` scale
press feedback flagged as hover-rule violation (it's press, not hover; platform guidelines
recommend it — kept as-is, documented in DESIGN.md §3 suggested).
