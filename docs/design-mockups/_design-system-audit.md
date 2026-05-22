# Navigator Design System Audit (Phase 0)

> Session: 2026-05-21
> Source: `DESIGN.md` (2026-04-12), `ARCHITECTURE.md` (2026-01-28), `css/base.css`, `CLAUDE.md`
> Purpose: token inventory + gap analysis as input to Phase 2 token rebuild
> Status: Phase 0 closed, Phase 1 (user journeys) next

## 0. Method

Read each source file in full. Inventoried tokens by axis (spacing / radius / color / typography / elevation / motion / overlay / layout / a11y). Cross-referenced DESIGN.md spec vs base.css implementation vs ARCHITECTURE.md description. Surfaced 3 kinds of gaps:

- **Missing token** — DESIGN.md spec asks for a token that base.css does not define
- **Implicit semantic** — base.css defines a primitive (e.g. `--shadow-sm`) but no semantic alias (e.g. `--elevation-card`)
- **Hardcoded value** — CSS uses raw value where a token would clarify intent

## 1. Current Token Inventory

### 1.1 Spacing — `base.css:18-23` (8pt grid)

| Token | Value | Where used |
|---|---|---|
| `--space-1` | 8px | `--task-gap`, micro padding |
| `--space-2` | 16px | standard padding, small section gap |
| `--space-3` | 24px | section padding |
| `--space-4` | 32px | hero/major surface padding |
| `--space-5` | 40px | major section gap |
| `--space-6` | 48px | hero margin (rarely used) |

### 1.2 Radius — `base.css:50-52`

| Token | Value | Where used |
|---|---|---|
| `--radius-sm` | 8px | small components (chip, button) |
| `--radius-md` | 12px | task item, card |
| `--radius-lg` | 16px | hero, large card |

### 1.3 Color — `base.css:25-128` (3-layer + legacy aliases)

**Primitive (raw hex)**: 8 slate tones, 4 category colors, 6 chart palette colors

**Semantic (purpose alias, dark default)**:
- Background: `--bg-primary`, `--bg-secondary`, `--bg-tertiary`, `--bg-card`
- Text: `--text-primary`, `--text-secondary`, `--text-muted`
- Border: `--border-color`, `--border-light`
- Category: `--cat-본업` (indigo), `--cat-부업` (pink), `--cat-일상` (emerald), `--cat-가족` (amber)
- Accent: `--accent-primary` / `--accent-primary-hover`, `--accent-success` / hover, `--accent-warning` / hover, `--accent-danger` / hover, `--accent-purple`, `--accent-neutral`, `--accent-amber`, `--pulse-warning`, `--accent-celebration`

**Alpha variants**:
- `--accent-primary-alpha` (15%)
- `--accent-success-alpha` (15%) + `-30`, `-50`, `-70` graded variants for progress fills
- `--accent-warning-alpha` (15%)
- `--accent-danger-alpha` (15%)

**Legacy aliases** (10 brownfield names — must preserve, value-swap only): `--primary`, `--success`, `--danger`, `--accent-green`, `--accent-blue`, `--text-tertiary`, `--bg-hover`, `--border-primary`, `--accent-color`, `--accent-pink`

**Light mode override** (`body[data-theme="light"]`): bg/text/border + accent-neutral + alpha-30/50/70 boost (35/55/75% for visibility on light surfaces). Category / accent colors intentionally NOT overridden — they stay vivid in both themes.

### 1.4 Typography — `base.css:54-62`

| Token | Value | DESIGN.md role |
|---|---|---|
| `--font-xs` | 14px | meta / caption |
| `--font-sm` | 15px | labels |
| `--font-base` | 16px | body |
| `--font-md` | 17px | task title (emphasized body) |
| `--font-lg` | 18px | section label |
| `--font-xl` | 20px | page title |
| `--font-body` | Pretendard Variable + fallback | UI text |
| `--font-mono` | SF Mono + Monaco | numeric displays |

DESIGN.md Section 2 has weight / line-height / tracking spec but values are hardcoded in CSS files (no tokens for these axes).

### 1.5 Elevation (shadow) — `base.css:93-96`

| Token | Value | Implicit purpose |
|---|---|---|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.15)` | card |
| `--shadow-md` | `0 4px 16px rgba(0,0,0,0.2)` | floating / dropdown |
| `--shadow-lg` | `0 8px 32px rgba(0,0,0,0.25)` | modal |
| `--shadow-color` | `rgba(0,0,0,0.4)` | drop-shadow filter base |

No semantic name (`--elevation-card`, `--elevation-overlay`, etc.) — purpose implicit by size suffix only.

### 1.6 Motion — `base.css:103-105`

| Token | Value | Purpose |
|---|---|---|
| `--transition-fast` | `0.15s ease` | quick state change |
| `--transition-normal` | `0.25s ease` | standard transition |
| `--ease-out-expo` | `cubic-bezier(0.16, 1, 0.3, 1)` | hero transition curve |

Only 2 duration tokens, only 1 non-`ease` easing curve. No `prefers-reduced-motion` handling anywhere in `base.css`.

### 1.7 Overlay — `base.css:99-100`

| Token | Value | Purpose |
|---|---|---|
| `--overlay-backdrop` | `rgba(0,0,0,0.7)` | modal scrim |
| `--overlay-heavy` | `rgba(0,0,0,0.85)` | full-screen overlay |

### 1.8 Layout — `base.css:112-114`

| Token | Value | Purpose |
|---|---|---|
| `--sidebar-width` | 220px (260px @ 1440+) | desktop sidebar |
| `--task-gap` | 8px | task list spacing |
| `--focus-ring` | `0 0 0 3px var(--accent-primary-alpha)` | focus indicator |

Container max-width and breakpoints are hardcoded throughout `base.css` responsive blocks (1400 / 1600 / 1800 / 2400 / 768 / 1024 / 1440 / 1920 / 2560 / 3200).

### 1.9 A11y (existing) — `base.css:165-174`

- `focus-visible` per WCAG 2.4.7: 2px outline + 2px offset on `button`, `[role="button"]`, `a`, `.tab-btn`, `.btn`, `.btn-small`
- Mobile input `font-size: 16px !important` (iOS auto-zoom prevention) — `base.css:630-632`

### 1.10 Wave 3 component states (DESIGN.md Section 3 reference)

- **Task item**: 5 states (default / hover / completed / urgent / warning) — bg + border-left + border + extras
- **Task checkbox**: 4 states (default / hover / checked / focus) — hover uses category color
- **Deadline chip**: 3 urgency tiers (urgent <3h / soon today / normal >1d) — bg/text-color pairs, tabular-nums, 12/600/6px
- **Button**: 5 states (default / hover / active / disabled / focus)

## 2. Gap Analysis

### HIGH priority — block Phase 2

1. **Motion choreography incomplete + `prefers-reduced-motion` absent**
   - Current: 2 durations (`fast`, `normal`), 1 emphasis easing (`ease-out-expo`)
   - Phase 2 spec asks: instant / fast / base / slow + standard / emphasis easing
   - Critical: ADHD UX needs motion budget enforcement — `prefers-reduced-motion` media query missing entirely. Currently no fallback for users with vestibular sensitivity or OS-level reduce-motion preference.
   - **Recommend (Phase 2)**: add `--motion-instant: 0s`, `--motion-fast: 0.1s`, `--motion-base: 0.2s`, `--motion-slow: 0.4s` + `--motion-easing-standard: cubic-bezier(0.4, 0, 0.2, 1)` (Material standard) + retain `--motion-easing-emphasis` for hero curves. Add `@media (prefers-reduced-motion: reduce) { :root { --motion-fast: 0s; --motion-base: 0s; --motion-slow: 0s; } }` global override.

2. **Elevation semantic layer absent**
   - Current `--shadow-sm/md/lg` is primitive — semantic intent (card vs floating vs modal) implicit
   - Phase 2 spec asks `--elevation-base / --elevation-card / --elevation-overlay / --elevation-modal`
   - **Recommend (Phase 2)**: alias semantic over shadow primitive without renaming primitives.
     - `--elevation-base: none`
     - `--elevation-card: var(--shadow-sm)`
     - `--elevation-card-hover: var(--shadow-md)`
     - `--elevation-overlay: var(--shadow-md)` (dropdown / popover)
     - `--elevation-modal: var(--shadow-lg)`

3. **A11y token gap — touch target + forced-colors**
   - Current focus-visible OK, but no `--touch-target-min` token. Mobile padding is per-component hardcoded — risk of <44pt buttons (iOS HIG minimum 44pt, Material 48dp).
   - No `forced-colors` mode (Windows high contrast) handling. Category colors disappear under forced-colors — peripheral scan identity breaks.
   - **Recommend (Phase 2)**: `--touch-target-min: 44px` token + audit `.btn-small`, `.tab-btn`, `.task-check-btn` padding to ensure 44pt hit area on mobile. Add `@media (forced-colors: active)` block with `border` fallback for category bar (since `background-color` may be flattened).

### MED priority — Phase 2 or Phase 7

4. **Spacing scale limited + no semantic alias**
   - Current 6 numeric levels (8 / 16 / 24 / 32 / 40 / 48). No `--space-0` (4px) for chip inner padding — currently hardcoded `2-4px`. No `--space-7` (64px+) for hero margins.
   - Purpose intent ambiguous without semantic name. `--space-3` could mean section padding OR major gap — context-dependent.
   - **Recommend (Phase 2)**: extend numeric (`--space-0: 4px`, `--space-7: 64px`) + add semantic alias (`--space-tight: var(--space-1)`, `--space-comfortable: var(--space-3)`, `--space-loose: var(--space-5)`). Keep numeric for backward compat.

5. **Typography weight / line-height / tracking 토큰 부재**
   - 7 size tokens (`--font-xs` to `--font-xl`) but no weight, no line-height, no letter-spacing tokens.
   - DESIGN.md Section 2 hierarchy table (Page title / Section label / Task title / Body / Label / Meta / Mini badge / Clock) all hardcoded in component CSS files.
   - **Recommend (Phase 2)**: shorthand custom-property pattern for each role. Example: `--text-title-1: 700 20px/1.4 -0.02em;` consumed via `font: var(--text-title-1);`. Roles: `--text-display` (clock/big stat), `--text-title-1` (page), `--text-title-2` (section), `--text-body-emph` (task title), `--text-body` (default), `--text-label`, `--text-caption`, `--text-mono` (numeric).

6. **Radius scale missing pill + xl**
   - Current `sm/md/lg` (8/12/16). Missing pill (999px) for chips / category capsules — currently hardcoded. Missing xl (24px+) for modal / hero surfaces.
   - **Recommend (Phase 2)**: add `--radius-xs: 4px`, `--radius-pill: 999px`, `--radius-xl: 24px`.

7. **Container max-width + breakpoint hardcode**
   - 6 breakpoint thresholds repeated across `base.css`. max-width values (1400/1600/1800/2400) embedded literally in 4+ media queries.
   - Recommendation: `--container-narrow / --container-default / --container-wide / --container-ultra` for max-width. Breakpoint thresholds cannot be CSS custom properties (browsers don't accept `var()` in `@media`), but a comment block listing the canonical thresholds at top of `base.css` keeps them discoverable.

### LOW priority — Phase 2 deferral candidates

8. **Mode color expansion** — Outstanding decision (handoff). 6 modes (회사 / 생존 / 여유 / 출근 / 주말 / 휴식), each could have `--mode-*` hero tint (~5% alpha). Defer until Phase 6 mockup confirms hero-tint visual is desired (vs single capsule badge).

9. **Chart palette semantic mapping** — 6 chart primitives defined (`--chart-cyan` etc.) but no usage semantic (revenue vs completion vs health). Defer to Phase 6 dashboard tab mockup — semantic emerges from chart context.

10. **System theme detection** — Light mode is manual toggle only (`body[data-theme="light"]`). No `@media (prefers-color-scheme: dark)` fallback for new users with no preference set. Low priority — current users have chosen dark explicitly.

## 3. ARCHITECTURE.md Drift (Critical Finding — out of Phase 0 scope, raise to user)

`ARCHITECTURE.md` last updated 2026-01-28, predates 5+ months of changes:

| Domain | ARCHITECTURE.md says | Current state | Status |
|---|---|---|---|
| Task ID | `id: number (timestamp)` | UUID via `generateId()` (CLAUDE.md confirms migration complete) | **STALE** |
| Tab structure | 3 tabs (Action / Dashboard / Schedule) | 6 tabs (액션 / 업무 / 이벤트 / 대시보드 / 전체 / 기록) + 더보기 dropdown — confirmed by `base.css:601` mobile `.tab-nav` block | **STALE** |
| Category names | "Main Job" / "Side Job" / "Daily" (English) | "본업" / "부업" / "일상" / "가족" (Korean) — DESIGN.md and `--cat-*` tokens confirm | **STALE** |
| Mode names | English (Work / Survival / Leisure / Commute / Rest) | Korean per DESIGN.md (회사 / 생존 / 여유 / 출근 / 주말 / 휴식) | **STALE** |
| File count | Implicit ~20 modular | 66 JS files per CLAUDE.md | **STALE** |
| Future plan | "Phase 2: React + Zustand + Vite" | v6 = React + Next.js + Supabase | **STALE** |
| Type safety | "Phase 2 TS" | Still vanilla JS (no TS migration) | **PARTIAL** |
| Code blocks | Show old priority/mode/render signatures in English | Korean comments + UUID in actual JS | **STALE** |

**Recommendation**: ARCHITECTURE.md refresh is out of Phase 0 audit scope. Surface to user as Phase 7 integration audit add-on, or as separate doc-maintenance task.

## 4. Phase 2 Prep — Token Rebuild Sequence

Recommended Phase 2 execution order (HIGH → MED → LOW, do not skip HIGH):

1. **Motion choreography** (`--motion-*` tokens + `prefers-reduced-motion` media query) — unblocks Phase 3 interaction principles
2. **Elevation semantic** (`--elevation-*` aliases over shadow primitives) — unblocks Phase 6 surface differentiation
3. **A11y tokens** (`--touch-target-min` + `forced-colors` fallback) — ADHD UX baseline
4. **Spacing semantic alias** (numeric 0-7 + tight/comfortable/loose)
5. **Typography shorthand** (`--text-*` with weight/leading/tracking)
6. **Radius scale** (pill + xs + xl)
7. **Container tokens** (max-width semantic)
8. **Mode color expansion** (defer until Outstanding decision)
9. **Chart semantic** (defer to Phase 6)
10. **System theme detection** (defer)

Estimated CSS delta in `base.css`: +40 to +60 lines (token additions). Legacy aliases preserved.

## 5. Phase 0 Closure — Open Items for Phase 1+

| Item | Where surfaced | Phase to resolve |
|---|---|---|
| `ARCHITECTURE.md` stale | Section 3 above | Phase 7 or separate task |
| Mockup 03 v3 (kanban) likely wrong pattern | handoff "Likely re-direction" | Phase 6 (re-design after journey + IA) |
| Time-axis vs category-axis primary | handoff + user prompt 원칙 ("--cat-* 시각 도구로만, navigation axis X") | **Resolved**: time-axis primary, category = peripheral scan tool. Locks Phase 1 journey + Phase 6 mockup IA |
| 9-tab nav structure (top-bar / sidebar / mixed) | Outstanding decision | Phase 5 (wireframe). 9-tab count = locked by user, structure = open |
| Mode hero-tint visual | Outstanding decision | Phase 6 (per-tab mockup will surface need) |
| Action tab status bar ownership (액션 vs 대시보드) | Outstanding decision | Phase 7 integration audit |
| Category color usage beyond left-bar | Outstanding decision | Phase 6 per-tab mockup |

## 5.5 Time Format Rule (HIGH H5)

Cross-tab time display rule (consistent across all mockups):

| Semantic | Format | When |
|---|---|---|
| Urgency under 24h | `Nh` (`2h`, `8h`) | Deadline today, hour-precision for ADHD scan |
| Exact today | `D-Day` | Deadline today |
| 1-13 days | `D-N` | Future near-term |
| Overdue | `D+N` | Past pending |
| Far / historical | `M/D` (`5/22`) | >14 days OR archive ref |
| Day-of-week | `월~일` | Recurring weekly |
| Recurring label | `매일 / 매주 / 격주 / 매월` | Repeat meta on task |
| Time-of-day | `7:30 / 19:00` (24h tabular-nums) | Medication / commute / time-trigger |
| Generic today | `오늘` | No specific hour |
| Range | `5/15 ~ 5/23` | Project span |

## 6. Phase 0 Conclusion

Token system is well-structured (3-layer + legacy) but has 3 HIGH gaps blocking Phase 2: motion + elevation semantic + a11y tokens. `ARCHITECTURE.md` is stale (5+ month drift) — needs refresh outside Phase 0 scope. Time-axis IA primary is **resolved** by user prompt 원칙 — Phase 1 journeys and Phase 6 mockups must align.

Next: Phase 1 user journeys (`_user-journeys.md`).
