# Design Tokens — Navigator

> Source of truth: `css/base.css` (3-layer token architecture — Primitive → Semantic → Component).
> Full design rationale: [`../DESIGN.md`](../DESIGN.md) (15K, last updated 2026-04-12).

## 3-Layer Token Architecture

Navigator uses CSS custom properties (`--token-name`) in three comment-separated layers inside `css/base.css`:

1. **Primitive** — raw hex, mode-agnostic foundation (`--slate-900`, `--indigo-500`, etc.). ~22 tokens.
2. **Semantic** — purpose aliases pointing at primitives, dark/light variant maps (`--bg-primary`, `--text-primary`, `--cat-본업`, etc.). ~30 tokens.
3. **Component** — feature-specific overrides defined inside the component's own CSS file (not the base palette).

## Categories (the defining design choice — ADHD peripheral scan)

Every task carries a left-edge color bar identifying its life domain. The color identification must be answerable in a peripheral glance, before reading text.

| Semantic token | Primitive | Category |
|---------------|-----------|----------|
| `--cat-본업` | `var(--indigo-500)` `#667eea` | Work (primary career) |
| `--cat-부업` | `var(--pink-400)` `#f093fb` | Side work / freelance |
| `--cat-일상` | `var(--emerald-500)` `#48bb78` | Daily life / errands |
| `--cat-가족` | `var(--amber-400)` `#f6ad55` | Family |

Deadline urgency uses a separate axis (background tint + chip color: danger red / warning amber / neutral) so category and urgency can be read simultaneously without conflict.

## Typography

- **Body (Korean-heavy)**: Pretendard Variable
- **Numeric cells**: SF Mono (digit alignment prevents visual jitter on dynamic updates)

## Theme

- **Default**: Slate Professional dark (`--bg-primary = var(--slate-900) #0F172A`) — Linear-inspired navy keeps category colors vivid against the surface.
- **Light theme**: inverts surfaces but preserves category + accent color values.

## Icons

Navigator uses inline SVG sparingly. Standard icons live in markup — no icon library imported (vanilla JS + no bundler). When adding icons, prefer Heroicons outline style copied as inline SVG to match the existing pattern.

## Usage Patterns (workspace design rules)

- Hover effects: `bg-color` / `border-color` changes only. **No** `transform` / `scale` / `box-shadow` transitions on hover.
- Action buttons: hidden by default, visible on hover (always visible on mobile via media query).
- No persistent looping animations.
- Maximum 1 gradient per project (Navigator currently uses 0 — solid colors only).

## Do Not

- Hardcode hex values outside `css/base.css` Primitive layer.
- Add a new category color without updating `--cat-*` semantic tokens + `js/tasks.js` validation.
- Mix category and urgency axes (e.g., red category bar) — breaks ADHD peripheral-scan rule.

## References

- `../DESIGN.md` — full design rationale + accessibility notes
- `css/base.css` — token definitions (read first before touching colors)
- `../ARCHITECTURE.md` — sequential loading order (CSS files included)
