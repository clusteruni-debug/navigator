# Navigator — Section Inventory

> Track A (Strategic — section purpose redesign), Step 1
> Owner-review document. "Target Role" and "Direction" columns left blank for owner input.
> Generated: 2026-05-20

## Purpose

This inventory maps every section of Navigator with its current role, information density, primary actions, and information pattern. The goal is to give the owner a base for defining the **target role** and **design direction** of each section before mockup work begins.

This is an **inventory only** — design decisions are owner's call. The right two columns (Target Role / Direction) are intentionally empty.

## Sources

- `navigator-v5.html` (entry HTML, 332 lines) — tab labels in shortcut hints lines 178-221, modal definitions lines 82-222
- `ARCHITECTURE.md` — mode system + priority calculation + task model
- `DESIGN.md` — token, typography, state spec
- 70 JS files in `js/` — domain split via filename prefix
- 32 CSS files in `css/` — visual coverage split

## Section count: 14 + 6 modals

- 6 tab sections (primary navigation via keyboard 1-6)
- 8 feature areas (cross-cutting features outside main tabs)
- 6 modals/overlays

## Tab sections (primary navigation)

| # | Section | Current role | Density | Primary actions | Info pattern | Related files | Target role (owner) | Direction (owner) |
|---|---|---|---|---|---|---|---|---|
| 1 | 액션 (Action) | "What do I do right now" — Next Action + nearby task list. ADHD core decision accelerator | Low (1 primary + 5-10 secondary) | Start, complete, defer | Single focus + peripheral list | `actions-*.js` (8), `render-action.js`, `tasks.css`, `views.css` |   |   |
| 2 | 업무 (Work) | Main-job project deep management — projects, templates, calendar, timeline, reports | Very high | Project navigate, report write, calendar view | Multi-pane, IDE-like, deep nav | `work-*.js` (20), `work*.css` (5) |   |   |
| 3 | 이벤트 (Events) | External schedule/appointment tracking — Supabase synced | Medium | Add event, confirm | Calendar/timeline-based | `render-events*.js` (2), `events.css` |   |   |
| 4 | 대시보드 (Dashboard) | Today overview — progress, category stats, streak | Medium | Scan, confirm progress | Glanceable, peripheral scan | `render-dashboard*.js` (2), `dashboard.css`, `work-dashboard.css` |   |   |
| 5 | 전체 (All Tasks) | All tasks filter/sort — power-user list view | Very high | Search, filter, bulk action | High-density list, dense rows | `render-all.js`, `tasks.css`, `views.css` |   |   |
| 6 | 기록 (History) | Completed-task retrospective — past review + streak history | Medium | Past review, streak verify | Chronological, time-segment | `tasks-history*.js` (2), `ui-completion-log.js`, `history.css` |   |   |

## Feature areas (outside tab nav)

| # | Section | Current role | Density | Primary actions | Info pattern | Related files | Target role (owner) | Direction (owner) |
|---|---|---|---|---|---|---|---|---|
| 7 | 셔틀 (Commute) | Commute-state toggle — mode-system trigger | Very low (1 bit) | Tap toggle | Single binary state | `commute.js`, `commute-render.js` |   |   |
| 8 | 리듬 (Rhythm) | Condition/medication daily tracking + stats + history | Medium | Daily input, trend check | Habitual, gentle, time-axis | `rhythm-*.js` (5), `rhythm.css` |   |   |
| 9 | 포모도로 (Pomodoro) | Focus timer (25/5 min cycle) | Very low (timer + bar) | Start, pause, reset | Focus mode, distraction-minimal | `pomodoro.js`, `pomodoro.css` |   |   |
| 10 | 수익 (Revenue) | Side-job revenue tracking + totals | High (numeric) | Add, confirm, chart | Numeric-first, finance-like | `tasks-revenue.js`, `revenue.css` |   |   |
| 11 | 회고 (Reflection) | Self-reflection — text input + push-notification trigger | Low (text) | Write, review | Calm, spacious, journal-like | `reflection-*.js` (4), `reflection.css` |   |   |
| 12 | 명령어 팔레트 (Command Palette) | Keyboard quick action (Ctrl+K) | Medium | Type, select | Linear-like, fast palette | `command-palette.js`, `command-palette.css` |   |   |
| 13 | 온보딩 (Onboarding) | New-user step-through | Very low | Step through | Sequential, friendly | `ui-onboarding.js` |   |   |
| 14 | 설정 (Settings) | User settings — theme, Firebase, etc. | Medium | Toggle, select | Standard, predictable list | `render-settings.js`, `settings.css` |   |   |

## Modals (popup within tabs)

| Modal | Role | Density | Source |
|---|---|---|---|
| 시간 입력 (Time input) | Post-completion actual-time input | Very low | `navigator-v5.html` L95-116 |
| 주간 리뷰 (Weekly review) | Weekly retrospective + plan save | Medium | `navigator-v5.html` L118-133, `ui-weekly.js` |
| 본업 프로젝트 (Work modal) | New / edit project | High | `navigator-v5.html` L135-147, `work-modal*.js` (3) |
| 빠른 수정 (Quick edit) | Edit task without tab change | Medium | `navigator-v5.html` L149-169 |
| 단축키 도움말 (Shortcuts help) | Keyboard shortcut list | Low | `navigator-v5.html` L171-222 |
| 완료 애니메이션 (Completion overlay) | Visual feedback on completion | Very low (decorative) | `navigator-v5.html` L82-90, `effects.css` |

## Cross-cutting: Mode system

ARCHITECTURE.md defines a mode system that affects multiple sections:

- **Modes**: 회사 (Work) / 생존 (Survival) / 여유 (Leisure) / 출근 (Commute) / 휴식 (Rest)
- **Decision basis**: Current hour + shuttle status
- **Sections affected**: 액션 tab (mode-based task filter), 셔틀 (mode trigger), NextAction selection
- **Current visual treatment**: Single mode-badge capsule (`Mode indicator` per DESIGN.md Voice & Tone)

Open question for owner: should mode-aware UI extend beyond a single capsule? (e.g., entire 액션 tab layout shifts per mode)

## Cross-cutting: Category system

DESIGN.md defines `--cat-*` tokens applied to every task display:

- 본업 (Main Job — indigo `--cat-본업`)
- 부업 (Side Job — pink `--cat-부업`)
- 일상 (Daily — emerald `--cat-일상`)
- 가족 (Family — amber `--cat-가족`)

Current visual treatment: 4px left-border color bar on every task card — designed for peripheral-scan identification (DESIGN.md Identity).

Open question for owner: is category differentiation strong enough at left-bar only? (e.g., should card layout itself differ per category)

## Open questions (owner-decision area)

1. **Target role definition** — each section's *why it exists*. Currently only *function* is documented, *purpose* is implicit.
2. **Priority tiers** — Tier 1 (high traffic) / Tier 2 (regular) / Tier 3 (peripheral) classification. Which section pilot first?
3. **Design direction per section** — information density / interaction pattern / visual tone.
4. **Mode-system visual differentiation** — current mode-badge only. Stronger mode-aware UI needed?
5. **Category visual differentiation** — current left-bar + token. Layout-level differentiation needed?
6. **Section merge/split** — examples: merge 회고 with 기록? merge 액션 with 전체? split 업무 sub-tabs further?

## Recommended next steps

1. Owner fills the "Target Role" and "Direction" columns above (answers Open Questions 1, 3).
2. Owner classifies sections into priority tiers (Open Question 2).
3. Owner answers cross-cutting Open Questions 4-5.
4. Owner decides section merge/split (Open Question 6).
5. Pilot section selected — **recommendation: 액션 tab** (highest-traffic + ADHD core + Mode-system intersection — touching the most-important and most-shared design surface first surfaces system-wide trade-offs early).
6. Pilot mockup written → format agreed → remaining 13 sections expanded with same pattern.

## Track B parallel work

While Track A (this inventory + mockups) progresses, Track B can proceed independently — items that survive any design decision:

- PR-1: Emoji → Lucide static-inline SVG (Standing rule violation)
- PR-1: Modal ARIA attributes (WCAG 4.1.2)
- PR-2 partial: z-index tokenization, reflection.css fallback fix, stats breakpoint unification

Items that depend on Track A outcome and are **on hold**:

- PR-3 typography scale expansion (24/30/36/48px) — wait for Track A hierarchy decision
- PR-3 legacy alias migration (13 files) — wait to confirm sections survive Track A
- PR-2 PWA theme-color split — minor, can go either track
