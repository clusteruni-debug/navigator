# Navigator — DESIGN.md

> Last updated: 2026-04-12
> Persona: adhd-friendly / task-management / category-coded
> Stack: HTML + Vanilla JS + Firebase (no build tool, no framework)
> Port: 5000
> Scope: `projects/navigator/` — ADHD-friendly personal task manager

## Identity

The defining choice is **category-coded peripheral scanning**: every task carries a left-edge color bar (본업 indigo / 부업 pink / 일상 green / 가족 amber) that the user identifies before reading the text. ADHD task management prioritizes instant visual triage — "which life domain does this belong to?" must be answerable in a peripheral glance, not by reading a label. Deadline urgency uses a separate axis (background tint + chip color: danger red / warning amber / neutral) so category and urgency can be read simultaneously without conflicting. The secondary rule: Pretendard Variable for Korean-heavy body text, SF Mono for numeric cells where digit alignment prevents visual jitter on dynamic updates. Slate Professional dark is the default — a Linear-inspired navy tone (#0F172A base) that keeps category colors vivid against the surface. Light theme inverts surfaces but preserves category and accent color values.

## 1. Color Palette (3-layer token architecture)

Three comment-separated layers in `css/base.css`: **Primitive** (raw hex, mode-agnostic foundation) → **Semantic** (purpose aliases, dark/light variants) → **Component** (feature-specific overrides). Navigator already has ~55 well-named tokens; the refactor formalizes the existing grouping without renaming.

### Primitive (raw hex — mode-agnostic)

| Token | Value | Notes |
|---|---|---|
| `--slate-900` | `#0F172A` | Deepest surface (dark mode base) |
| `--slate-800` | `#1E293B` | Card surface / secondary bg |
| `--slate-700` | `#334155` | Tertiary surface / hover bg |
| `--slate-400` | `#94A3B8` | Secondary text (dark mode) |
| `--slate-500` | `#64748B` | Muted text (dark mode) |
| `--slate-100` | `#F1F5F9` | Primary text (dark mode) |
| `--indigo-500` | `#667eea` | 본업 category / primary accent |
| `--pink-400` | `#f093fb` | 부업 category |
| `--emerald-500` | `#48bb78` | 일상 category / success |
| `--amber-400` | `#f6ad55` | 가족 category / warning |
| `--rose-500` | `#f5576c` | Danger / urgent deadline |
| `--purple-700` | `#764ba2` | Tertiary accent |
| `--accent-amber` | `#EAB308` | Amber accent (defined as semantic, no separate primitive) |
| `--gold-400` | `#ffd93d` | Celebration accent |
| `--cyan-400` | `#22d3ee` | Chart palette |
| `--lavender-400` | `#a78bfa` | Chart palette |
| `--tangerine-400` | `#fb923c` | Chart palette |
| `--blue-500` | `#4299e1` | Chart palette |
| `--teal-500` | `#38b2ac` | Chart palette |
| `--pink-500` | `#ed64a6` | Chart palette |

### Semantic (purpose aliases — dark mode default, light mode overrides)

Dark mode (`:root` default):

| Token | Points to | Meaning |
|---|---|---|
| `--bg-primary` | `var(--slate-900)` | App canvas |
| `--bg-secondary` | `var(--slate-800)` | Card / task item surface |
| `--bg-tertiary` | `var(--slate-700)` | Hover state bg |
| `--bg-card` | `var(--slate-800)` | Explicit card surface |
| `--text-primary` | `var(--slate-100)` | Main text |
| `--text-secondary` | `var(--slate-400)` | Secondary text, meta |
| `--text-muted` | `var(--slate-500)` | Disabled / placeholder |
| `--border-color` | `rgba(148, 163, 184, 0.12)` | Standard dividers |
| `--border-light` | `rgba(148, 163, 184, 0.06)` | Subtle borders |
| `--cat-본업` | `var(--indigo-500)` | **Category: work** — left bar, badge, checkbox hover |
| `--cat-부업` | `var(--pink-400)` | **Category: side work** |
| `--cat-일상` | `var(--emerald-500)` | **Category: daily life** |
| `--cat-가족` | `var(--amber-400)` | **Category: family** |
| `--accent-primary` | `var(--indigo-500)` | Primary accent (= 본업 color) |
| `--accent-success` | `var(--emerald-500)` | Success / completion |
| `--accent-warning` | `var(--amber-400)` | Warning / medium deadline |
| `--accent-danger` | `var(--rose-500)` | Danger / urgent deadline |
| `--accent-purple` | `var(--purple-700)` | Tertiary accent |
| `--accent-neutral` | `#a0a0a0` | Neutral / disabled |
| `--accent-amber` | `var(--amber-500)` | Amber accent |
| `--accent-celebration` | `var(--gold-400)` | Celebration / streak |

Light mode (`body[data-theme="light"]` override):

| Token | Light value | Notes |
|---|---|---|
| `--bg-primary` | `#f8f9fa` | Light canvas |
| `--bg-secondary` | `#ffffff` | White card surface |
| `--bg-tertiary` | `#f1f3f4` | Light hover bg |
| `--bg-card` | `#ffffff` | White card |
| `--text-primary` | `#1a1a1a` | Dark text |
| `--text-secondary` | `#5f6368` | Medium text |
| `--text-muted` | `#72787e` | Light muted text |
| `--border-color` | `#e0e0e0` | Light divider |
| `--border-light` | `#f1f3f4` | Subtle light border |

Category colors (`--cat-*`) and accent colors are intentionally NOT overridden in light mode — they stay vivid in both themes.

### Alpha variants (computed from semantic)

| Token | Value | Used by |
|---|---|---|
| `--accent-primary-alpha` | `rgba(102, 126, 234, 0.15)` | Focus ring, mode badge bg |
| `--accent-success-alpha` | `rgba(72, 187, 120, 0.15)` | Completed task bg tint |
| `--accent-success-alpha-30/50/70` | 30%/50%/70% alpha | Progress bar fills |
| `--accent-warning-alpha` | `rgba(246, 173, 85, 0.15)` | Warning task bg tint |
| `--accent-danger-alpha` | `rgba(245, 87, 108, 0.15)` | Urgent task bg tint |

### Component (feature-specific)

| Token | Value | Used by |
|---|---|---|
| `--task-cat-color` | `var(--cat-*)` via inline `style` | Task item left border — set per-item in JS: `style="--task-cat-color: var(--cat-${task.category})"` |
| `--sidebar-width` | `220px` | Desktop sidebar |
| `--task-gap` | `8px` | Task list item spacing |
| `--focus-ring` | `0 0 0 3px var(--accent-primary-alpha)` | Keyboard focus outline |

### Legacy aliases (brownfield — existing consumers)

| Legacy token | Points to | Reason |
|---|---|---|
| `--primary` | `var(--accent-primary)` | Legacy shorthand |
| `--success` | `var(--accent-success)` | Legacy shorthand |
| `--danger` | `var(--accent-danger)` | Legacy shorthand |
| `--accent-green` | `var(--accent-success)` | Legacy color name |
| `--accent-blue` | `var(--accent-primary)` | Legacy color name |
| `--text-tertiary` | `var(--text-muted)` | Legacy alias |
| `--bg-hover` | `var(--bg-tertiary)` | Legacy alias |
| `--border-primary` | `var(--border-color)` | Legacy alias |
| `--accent-color` | `var(--accent-primary)` | Legacy alias |
| `--accent-pink` | `var(--cat-부업)` | Legacy alias |

All legacy names must be preserved — existing JS onclick handlers and component CSS files reference them. Value-swap only, no rename.

## 2. Typography

### Font strategy decision: single-font + mono

Pretendard Variable for all UI text (Korean-optimized, variable weight 100–900). SF Mono for numeric displays (prices, times, stats) where digit alignment prevents visual jitter.

### Font stack

- **Body / UI**: `'Pretendard Variable', 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Mono / Numeric**: `'SF Mono', 'Monaco', monospace` — clock, revenue, history timestamps, rhythm metrics
- **Tokens defined**: `--font-body` and `--font-mono` declared in `css/base.css` `:root`. `body` uses `var(--font-body)`. 9 monospace sites still hardcode font stacks instead of using `var(--font-mono)` (see Hardcoded Audit appendix for follow-up)

### Hierarchy

| Role | Size | Weight | Line height | Letter spacing | Usage |
|---|---|---|---|---|---|
| Page title | 20px (`--font-xl`) | 700 | 1.4 | -0.02em | Section headers ("오늘 할 일") |
| Section label | 18px (`--font-lg`) | 600 | 1.4 | -0.01em | Tab section titles |
| Task title | 17px (`--font-md`) | 600 | 1.4 | -0.01em | `.task-item-title` — max 2 lines, clamp |
| Body | 16px (`--font-base`) | 400 | 1.6 | -0.02em | Default body text |
| Label | 15px (`--font-sm`) | 500 | 1.4 | 0 | Button labels, form labels |
| Meta / caption | 14px (`--font-xs`) | 400 | 1.4 | 0 | Task meta, timestamps, categories |
| Mini badge | 13px | 600 | 1.2 | 0 | Mode badge, category pill |
| Clock (mono) | 20px | 700 | 1.4 | 0 | `.today-clock` — tabular-nums |

### Numeric display

- `font-variant-numeric: tabular-nums` required on: clock displays, deadline chips, revenue amounts, history timestamps, rhythm metrics, streak counters
- Currently applied at 3 sites only (dashboard, nav, tasks) — extension needed

## 3. Component States

### Task item (`.task-item`)

| State | Background | Border-left | Border | Extra |
|---|---|---|---|---|
| default | `var(--bg-secondary)` | `4px solid var(--task-cat-color)` | `1px solid var(--border-light)` | Action buttons hidden |
| hover | unchanged | unchanged | `var(--border-color)` | Action buttons visible |
| completed | `color-mix(--accent-success 5%)` | `--accent-success-alpha-30` | `--accent-success-alpha-30` | `opacity: 0.6`, title strikethrough |
| urgent | `var(--accent-danger-alpha)` | `--accent-danger` | `--accent-danger 2px` | Red glow shadow |
| warning | `var(--accent-warning-alpha)` | `--accent-warning` | `--accent-warning 2px` | Amber glow shadow |

### Task checkbox (`.task-check-btn`)

| State | Border | Background | Color | Extra |
|---|---|---|---|---|
| default | `2px solid var(--border-color)` | transparent | `var(--text-muted)` | 22px circle |
| hover | `2px solid var(--task-cat-color)` | transparent | `var(--task-cat-color)` | **Category-colored** (Wave 3 change) |
| checked | `2px solid var(--accent-success)` | `var(--accent-success)` | white | Check pop animation |
| focus | `2px solid var(--accent-primary)` | transparent | — | Focus ring |

### Deadline chip (`.deadline-chip`) — Wave 3 new component

| Urgency | Background | Text color | Example |
|---|---|---|---|
| urgent (<3h) | `var(--accent-danger-alpha)` | `var(--accent-danger)` | "2h" |
| soon (today) | `var(--accent-warning-alpha)` | `var(--accent-warning)` | "6h" |
| normal (>1d) | `rgba(148,163,184,0.1)` | `var(--text-secondary)` | "3d" |

All chips: `font-variant-numeric: tabular-nums`, `font-size: 12px`, `font-weight: 600`, `border-radius: 6px`, `padding: 2px 8px`.

### Button (`.btn`)

| State | Background | Text | Border | Extra |
|---|---|---|---|---|
| default | `var(--accent-primary)` | white | none | — |
| hover | `var(--accent-primary-hover)` | unchanged | none | — |
| active | pressed feedback | unchanged | none | — |
| disabled | `var(--accent-primary)` | unchanged | none | `opacity: 0.5; cursor: not-allowed` |
| focus | default | unchanged | none | `outline: 2px solid var(--accent-primary); outline-offset: 2px` |

## 4. Agent Prompt Guide

```
You are building a feature for Navigator (ADHD-friendly task manager). The design system is defined in DESIGN.md at project root. When writing CSS or inline styles:

1. Use semantic tokens from DESIGN.md Section 1.
   - Category colors via --task-cat-color (set per-item in JS): var(--cat-본업), var(--cat-부업), var(--cat-일상), var(--cat-가족)
   - DO NOT use raw hex values — use var(--token)
   - Urgency uses a separate axis from category: --accent-danger (urgent), --accent-warning (soon), neutral
   - Alpha variants exist for background tints: --accent-*-alpha

2. Match the typography hierarchy in DESIGN.md Section 2.
   - Pretendard Variable for body, SF Mono for numeric displays
   - tabular-nums on all numeric content (deadlines, clocks, amounts, stats)
   - Task titles: 17px/600, max 2 lines clamped
   - Use var(--font-body) for body text, var(--font-mono) for numeric/mono displays

3. Every interactive component must implement states per Section 3.
   - Hover: bg/border change only (no transform/scale/shadow)
   - Action buttons: hidden by default, visible on hover (always visible on mobile)
   - Checkbox hover color = category color (not fixed green)
   - Focus must be visible (outline + offset)

4. ADHD-specific rules:
   - Category identification must be possible from peripheral vision (left bar color)
   - Deadline urgency must be readable without parsing text (color-coded chip)
   - Completed tasks: opacity 0.6 + strikethrough + green tint (visual "done" pile)
   - No persistent animations that compete for attention

5. Layout: vanilla HTML/CSS, no framework.
   - CSS @import chain from css/navigator.css — add new files to import list
   - Sequential script loading in navigator-v5.html — load order matters
   - localStorage + Firebase dual storage (localStorage primary when not logged in)

6. Dark mode is default. Light mode via body[data-theme="light"]. Category/accent colors do NOT change between themes.

7. Follow global CLAUDE.md design rules: max 1 gradient, solid colors, hover=bg/border only, action buttons hidden by default.
```

## 5. Voice & Tone

### Channel reference

| Channel | Tone | Example |
|---|---|---|
| Task placeholder | Casual, action-oriented | "할 일을 입력하세요" |
| Empty state | Encouraging, brief | "오늘 할 일이 없어요 ✨" |
| Completion feedback | Celebratory, brief | Confetti animation + check pop |
| Deadline warning | Direct, urgent | Red chip "2h" — no words needed |
| Category label | Single Korean word | "본업", "부업", "일상", "가족" |
| Mode indicator | Context-aware, capsule | "회사", "생존", "여유", "출근", "주말", "휴식" |

### Microcopy rules

- Korean throughout, sentence case
- Button labels: verb-first ("추가", "수정", "삭제")
- Category names are the user's own Korean terms — never translate or abbreviate
- Deadline display: always relative ("2h", "6h", "3d", "내일") — never absolute datetime
- Streak counter: number + emoji ("🔥 7") — celebrate consistency
- No English labels in the UI except technical terms (Firebase, UUID)

---

## Appendix — Hardcoded font stack audit

| File | Line(s) | Current stack | Proposed token |
|---|---|---|---|
| `base.css` | 135 | `'Pretendard Variable', 'Pretendard', -apple-system, ...` | `var(--font-body)` — follow-up |
| `dashboard.css` | 290 | `'SF Mono', 'Monaco', monospace` | `var(--font-mono)` — follow-up |
| `history.css` | 162, 248, 343 | `'SF Mono', Monaco, monospace` | `var(--font-mono)` — follow-up |
| `nav.css` | 203 | `'Pretendard Variable', monospace` | `var(--font-mono)` — follow-up |
| `pomodoro.css` | 32 | `monospace` (bare) | `var(--font-mono)` — follow-up |
| `responsive.css` | 686, 696 | `'SF Mono', Monaco, monospace` | `var(--font-mono)` — follow-up |
| `revenue.css` | 327 | `'SF Mono', Monaco, monospace` | `var(--font-mono)` — follow-up |
| `rhythm.css` | 145, 269 | `'SF Mono', Monaco, monospace` | `var(--font-mono)` — follow-up |
| `settings.css` | 222 | `monospace` (bare) | `var(--font-mono)` — follow-up |

3 inconsistent stacks: (1) `'SF Mono', 'Monaco', monospace` (5 files), (2) `'SF Mono', 'Consolas', 'Fira Code', monospace` (dashboard implied), (3) bare `monospace` (2 files). Unify to `var(--font-mono)` in a follow-up pass.

## Appendix — Related assets

- Cross-project UX rules: `~/.claude/skills/ui-ux-pro-max/SKILL.md`
- From-scratch creation: `~/.claude/skills/frontend-design/SKILL.md`
- Global design rules: `C:\vibe\CLAUDE.md` Design Rules section
- Rollout plan: `C:\vibe\docs\plans\PLAN-DESIGN-MD-ROLLOUT.md`
- Project architecture: `projects/navigator/ARCHITECTURE.md`
- Test scenarios: `projects/navigator/agent_docs/test-scenarios.md`
