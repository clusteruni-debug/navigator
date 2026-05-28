# Navigator Phase A — Typography & Visual Hierarchy Spec

> Session 78 design audit 후속 (5 agent finding 종합)
> Goal: Cross-cutting design system primitives + enforce (single batch base.css + 31 CSS cascade)
> Scope: **Phase A only** — Phase A.5 (shared primitive) + Phase B (render-layer) 별도

## 1. Audit Smoking Guns (5 agent consensus)

1. **Token coverage 11%** — base.css `--font-*` defined but 86/807 actual usage (89% raw px)
2. **`--font-xs: 14px` minimum violation 97 instances** — 11-12px raw scattered (dashboard/tasks/events/nav)
3. **`--text-muted` 38% overuse** — 230 vs --text-primary 168, WCAG AA fail (#7C8FA1 on #0F172A = 4.2:1 vs required 4.5:1)
4. **6 distinct title treatments for same role** — 12/15/16/17/18 scattered (`.section-title` 12/700 < body 16 = inverted)
5. **Component primitive 부재** — Phase A.5 scope

**Live verification findings (added 2026-05-23):**
- `typography-override.css` 134 lines, !important 39x. Comments (12/13/14px) vs actual tokens (14/15/16px) **mismatch** — old token system残. Cleanup target
- `work-tasks.css` redesign block (L313+) + `reflection.css` + `schedule.css` commute block (L411+) use tokens actively — reference patterns
- All other CSS (tasks/dashboard/events/nav/etc) use raw px — cleanup target
- `font-weight` token absent — 10 distinct values across files (400/500/650/700/750/800)
- `line-height` token absent — body 1.6 inherit, headings 1.1-1.7 scattered

## 2. base.css Changes

### 2.1 Typography role tokens (semantic shorthand: weight size/line-height tracking)

8 new tokens:

```css
:root {
  --text-display:    700 32px/1.2 -0.02em;     /* hero clock, big stat */
  --text-title-1:    700 24px/1.3 -0.02em;     /* page title, NextAction hero */
  --text-title-2:    700 18px/1.4 -0.01em;     /* section title, card heading */
  --text-body-emph:  600 17px/1.5 -0.01em;     /* task title, primary list-item */
  --text-body:       400 16px/1.6 -0.005em;    /* default body */
  --text-label:      500 14px/1.4 0;           /* form label, chip label */
  --text-caption:    500 13px/1.35 0;          /* meta, deadline chip text */
  --text-micro:      600 12px/1.3 0.02em;      /* badge, count chip, UPPERCASE */
}

@media (min-width: 1024px) {
  :root {
    --text-display:    700 40px/1.2 -0.02em;
    --text-title-1:    700 30px/1.3 -0.02em;
    --text-title-2:    700 20px/1.4 -0.01em;
    --text-body-emph:  600 18px/1.5 -0.01em;
    --text-body:       400 17px/1.6 -0.005em;
    --text-label:      500 15px/1.4 0;
    --text-caption:    500 14px/1.35 0;
    --text-micro:      600 13px/1.3 0.02em;
  }
}
```

Usage: `.task-item .title { font: var(--text-body-emph); }`

**Scale ratio**: 16 → 18 → 24 → 32 (modular ~1.25 for headings). Replaces current 14-15-16-17-18-20 flat scale (ratio ~1.05).

### 2.2 `--text-muted` contrast fix

**Dark theme:**
- Current: `--text-muted: #7C8FA1` on `#0F172A` = **4.2:1 (WCAG AA fail)**
- New: `--text-muted: #94A3B8` (= 5.2:1 AA pass, identical to --text-secondary value)

**Decision**: Simple value bump (option a) — every usage auto-becomes AA pass. No 60+ file lint required.

**Light theme**: no change (#636870 on #f8f9fa = 6.5:1 OK)

**Usage rule** (documented in CLAUDE.md or design-system-audit.md):
- PRIMARY content text → `--text-primary`
- SECONDARY label/meta → `--text-secondary`
- DECORATIVE only → `--text-muted` (chip rest state, gray-out — NEVER body content)

### 2.3 Touch target + spacing semantic (audit M3/M4)

```css
:root {
  --touch-target-min: 44px;
  --space-0: 4px;
  --space-7: 64px;
  --space-tight:        var(--space-1);  /* 8px - chip padding */
  --space-comfortable:  var(--space-3);  /* 24px - card padding */
  --space-loose:        var(--space-5);  /* 40px - section gap */
}
```

### 2.4 Weight tokens (utility — audit M5)

```css
:root {
  --weight-bold:    700;
  --weight-emph:    600;
  --weight-medium:  500;
  --weight-regular: 400;
}
```

(Existing 10 distinct values: 650/750/800 → 700 unified. Pretendard Variable allows 800 but no design rationale; consolidate.)

## 3. typography-override.css Cleanup

### Current state
- 134 lines, !important 39x
- Comments (`/* 12px */`) vs actual token values (`--font-xs: 14px`) — **mismatch from old token system**
- @media 1024+ block works but redundant once role tokens carry breakpoint override

### New state
- Remove !important × 39 → switch to role tokens (`.stat-label { font: var(--text-caption); }`)
- Remove @media 1024+ block (role tokens have built-in PC override)
- Keep only component-specific overrides (e.g. `.calendar-day-task` mobile rule)
- Target: 80% size reduction (134 → ~25 lines)
- Update top comment to reflect new role-token-based approach

## 4. Raw px → Token Replacement

### 4.1 97 instance 11-12px violation

Per-file batch replace (31 CSS files):
- `font-size: 11px;` → `font: var(--text-micro);` (or component refactor to use role)
- `font-size: 12px;` → `font: var(--text-micro);` OR `var(--text-caption)` based on context
- `font-size: 13px;` → `font: var(--text-caption);`

**Distribution** (Visual Weight agent finding):
- dashboard.css: 38 instances (most)
- tasks.css: 22 instances
- events.css: 15 instances
- Others: 22 instances

### 4.2 6 distinct title treatments → unified role

| Selector | File | Current | New |
|---|---|---|---|
| `.section-title` | tasks.css:95 | 12px/700 | `font: var(--text-title-2);` (18px/700) |
| `.dashboard-title` | dashboard.css:546 | 15px/700 | same |
| `.work-section-title` | work.css | 17px/700 | same |
| `.events-title` | events.css | 18px/600 | same |
| `.insights-title` | dashboard.css | 17px/600 | same |
| `.weekly-report-title` | dashboard.css | 16px/600 | same |

All 6 → single role token. Biggest visual lift: `.section-title` 12 → 18 (heading no longer below body).

### 4.3 Hero vs list-item differentiation

| Selector | File:line | Current | New |
|---|---|---|---|
| `.next-action-title` | tasks.css:1425 | 24px/700 | `font: var(--text-display);` (32px/700 PC: 40px) |
| `.task-title` | tasks.css:1465 | 24px/600 | `font: var(--text-title-1);` (24px/700) |
| `.task-item-mini-title` | tasks.css:1259 | 16px/400 | `font: var(--text-body-emph);` (17px/600) |
| `.action-section-label` | tasks.css:86 | 11px caps | `font: var(--text-label);` (14px non-caps) |
| `.next-action-label` | tasks.css:1391 | 12px caps | `font: var(--text-label);` (non-caps) |

**Caps removal rationale**: Korean script incompatible with letter-spacing caps; scanning measurably slower; mixed ko/en UI poorly served.

## 5. Phase A Sub-batch Split

**A1** — base.css token additions + --text-muted fix (1 file)
- Add typography roles 8 + weight 4 + touch-target 1 + spacing semantic 5 = ~18 new tokens
- Bump --text-muted dark value
- Verify: dark/light both visually checked

**A2** — 6 title role unification + hero/task differentiation (5-7 files)
- tasks.css / dashboard.css / work.css / events.css + section-label caps removal
- Atomic pathspec commit

**A3** — 97 raw 11-12px → token replacement + typography-override cleanup + weight consolidation (10-15 files)
- 31-file grep + replace
- typography-override.css 80% reduction
- weight 800/750/650 → 700 unify
- Atomic pathspec commit

**Per sub-batch**: `/code-review` 1 round. After A3: Round 2 mandatory.

**After Phase A**: `sync-navigator-deploy.sh "Phase A typography + WCAG + raw cleanup"` + sw.js CACHE_NAME `v6-31` → `v6-32` bump.

## 6. Risk + Mitigation

| Risk | Mitigation |
|---|---|
| Single batch 30 file change → visual regression | 3 sub-batch split + per-batch verify + Round 2 review |
| typography-override !important cascade conflict | Role tokens cascade-priority, !important removable |
| --text-muted color shift visible across all surfaces | light/dark both verified + user PC visual check mandatory |
| 800 weight deprecate → dashboard/history stats impact | display role 700 + larger size (32→40px PC) compensates |
| `font:` shorthand line-height inherit issue | Split-apply (size + weight separately) where needed |

## 7. Out-of-scope (Phase A.5 / B)

- Shared primitive extraction (.subtab/.chip/.modal/.empty-state/.task-bar) → Phase A.5
- Per-tab render-layer progressive disclosure → Phase B
- ARCHITECTURE.md refresh, Mode color expansion, Chart palette semantic → backlog

## 8. User Confirm Checkpoint (Phase A 진입 전)

Top 3 critical decisions (rest default-OK unless pushed back):

1. **Role token design** — 8 roles (display/title-1/title-2/body-emph/body/label/caption/micro) with modular scale 1.25 (16→18→24→32). OK?
2. **`--text-muted` fix approach** — (a) bump value `#7C8FA1` → `#94A3B8` (simple, every usage auto-AA pass) OR (b) keep value, deprecate use case (60+ file audit needed). Recommend (a).
3. **Sub-batch split** — 3 sub-batch (A1 base.css / A2 title role / A3 raw cleanup) with per-batch /code-review. OR single big batch?

Default-OK (unless push-back):
- typography-override.css 80% reduction
- font-weight 800 → 700 unify (display role size larger compensates)
- PC breakpoint override via role token
- Caps removal on `.action-section-label` / `.next-action-label`

답변 받으면 A1 진입.
