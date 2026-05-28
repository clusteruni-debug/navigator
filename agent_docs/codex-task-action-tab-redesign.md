# Codex Task — Action Tab Redesign Implementation

> Dispatched from Claude Code. Single-task spec, no multi-task split.
> Source: Track A pilot design decisions (액션 탭).
> **Visual source of truth**: `projects/navigator/docs/design-mockups/01-action-tab.html` (open in browser for reference)

## Input

- **Mockup**: `projects/navigator/docs/design-mockups/01-action-tab.html` — all visual decisions live here. Read it side-by-side with this spec.
- **Modify**: `projects/navigator/js/render-action.js` (444 lines, `renderActionTab` function)
- **Modify**: `projects/navigator/js/rhythm-medication.js` (1-line default-slot addition)
- **Modify**: `projects/navigator/css/tasks.css` (medication group styling addition)
- **Read-only context**: `projects/navigator/css/base.css` (tokens), `projects/navigator/DESIGN.md` (Identity section), `projects/navigator/CLAUDE.md` (Standing rules)

## Standing Rules (do not violate)

- No emoji anywhere in UI — Lucide inline SVG only
- Hover state: bg/border color change only (no transform, scale, shadow, glow)
- CSS variables only — no raw hex (exception: SVG data URI)
- Max 1 gradient per app (existing `header-streak` text-clip only — do not add)
- No infinite animations
- Action buttons (`+`, `×`): hidden on desktop, visible on hover; always visible on mobile (`@media (hover: none) and (pointer: coarse)`)

## Output

### 1. `js/render-action.js` — Reduce 9 → 3 components

**Keep in action tab:**
- Top status bar (시계 + 모드 + 진행률 + streak)
- Rhythm + 복약 (`<details open>` block, restructured below)
- Next Action hero card — **ADD** `style="--task-cat-color: var(--cat-${escapeAttr(nextAction.category)})"` on `.next-action` div, and update CSS for 6px `border-left: 6px solid var(--task-cat-color)`
- Quick add input — placeholder change `(#부업 #본업 #일상)` → `(#본업 #부업 #일상 #가족)`
- Active pomodoro (conditional, keep `_renderPomodoroIfActive()` call)

**Remove from action tab render output (do NOT delete the underlying functions):**
- 결심 트래커 — remove `${(appState.resolutions || []).length > 0 ? _renderResolutionSection() : ''}` line. Add `// TODO(routing): _renderResolutionSection() — move to dashboard or settings`
- 나머지 작업 목록 — remove the entire `${pendingCount > (nextAction ? 1 : 0) ? ... : ''}` block. Already accessible via 전체 탭.
- 오늘 완료 섹션 — remove the entire `${completedTasks.length > 0 ? ... : ''}` block. Already accessible via 기록 탭.
- 상세 추가 폼 — remove `${appState.showDetailedAdd ? _renderDetailedAddForm(categoryFields) : ''}`. Convert any "상세 추가" trigger to open `quick-edit-modal` (existing pattern in `navigator-v5.html` L149-169). Keep `_renderDetailedAddForm` function — used elsewhere.
- Empty state (`appState.tasks.length === 0`) — keep, but verify still reachable. Move below quick-add per mockup.

### 2. Medication groups — restructure `_renderMedicationCompact()`

Replace flat slot list with **two grouped sections**:

```javascript
const allSlots = getMedicationSlots();
const requiredSlots = allSlots.filter(s => s.required);
const optionalSlots = allSlots.filter(s => !s.required);

// ADHD약 group (required) — primary color treatment + streak
//   Header: label + count "X/Y · 🔥streak" + add button
//   Slots: each with × delete button (top-right, hover-visible)

// 영양제 group (optional) — neutral treatment
//   Header: label + count "X/Y" + add button
//   Slots: each with × delete button (top-right, hover-visible)
```

**Button onclick wiring (use existing functions):**
- `+` add button: `addMedicationSlot()` (no args — existing prompt-based)
- `×` delete button: `deleteMedicationSlot(idx)` — pass index in the original `appState.lifeRhythm.settings.medicationSlots` array (NOT the filtered required/optional array)
- Slot itself: `handleMedicationClick(slotId, hasRecord, event)` — existing record/edit-menu logic

**HTML structure**: see mockup `.after .med-group`, `.after .med-group-header`, `.after .med-group-slots`, `.after .med-btn-delete` for exact markup.

### 3. Emoji → Lucide inline SVG

All emojis in `render-action.js` replaced. Use inline `<svg>` with `stroke="currentColor"` for theme inheritance. **No Lucide CDN** — paste paths directly (see mockup for exact paths).

| Emoji | Lucide name | Used in |
|---|---|---|
| `✅` | check | status bar completed count |
| `📋` | clipboard-list | status bar pending count |
| `🔥` | flame | streak |
| `📊` | bar-chart-3 (or omit) | rhythm details summary |
| `☀️` | sun | 기상 |
| `🚶` | (use arrow-right or footprints) | 집출발 |
| `🏢` | building | 근무시작 |
| `🚀` | rocket | 근무종료 (or use briefcase) |
| `🏠` | home | 집도착 |
| `🌙` | moon | 취침 |
| `💊` | pill | ADHD약 group label |
| `🌿` | leaf | 영양제 group label |
| `⏱` | clock | estimated time |
| `💰` | dollar-sign | revenue |
| `✓` | check | 완료 btn, taken state |
| `⏰` | rotate-ccw | 내일로 btn |
| `↩️` | undo-2 | uncomplete |
| `🍅` | timer | pomodoro |
| `☕` | coffee | break state |
| `🎯` | target | pomodoro current task |
| `⚠️` | alert-triangle | urgency label |
| `🔄` | repeat | repeat indicator |
| `+` (`✕` close, `▼/▲` arrows) | plus / x / chevron-down / chevron-up | various |

For 카테고리 chip in Next Action meta, use solid filled circle SVG colored with `--task-cat-color` (per mockup).

### 4. `js/rhythm-medication.js` — 1-line default-slot addition

In `getMedicationSlots()` default array, ADD ONE line for 영양제 아침:

```javascript
function getMedicationSlots() {
  return (appState.lifeRhythm.settings && appState.lifeRhythm.settings.medicationSlots) || [
    { id: 'med_morning', label: 'ADHD약(아침)', icon: '\u{1F48A}', required: true },
    { id: 'med_afternoon_adhd', label: 'ADHD약(점심)', icon: '\u{1F48A}', required: true },
    { id: 'med_morning_nutrient', label: '영양제(아침)', icon: '\u{1F33F}', required: false },  // ← ADD
    { id: 'med_afternoon_nutrient', label: '영양제(점심)', icon: '\u{1F33F}', required: false },
    { id: 'med_evening', label: '영양제(저녁)', icon: '\u{1F33F}', required: false }
  ];
}
```

Note: `icon` field is now legacy (UI uses Lucide). Keep field for backwards compatibility but stop rendering it in `_renderMedicationCompact`. The `\u{1F48A}` / `\u{1F33F}` escape sequences avoid raw emoji in source (still acceptable per Standing rules since not in UI text).

Existing users have `appState.lifeRhythm.settings.medicationSlots` saved — they're unaffected. They use the new `+` button to add 영양제(아침) manually.

### 5. `css/tasks.css` — medication group styling

Port from mockup `01-action-tab.html` `.after .med-group*` and `.after .med-btn*` rules. Use existing tokens from `base.css` (no new tokens). Required selectors:

- `.medication-group` (replaces `.medication-tracker`)
- `.medication-group-header` + `.medication-group-header-right`
- `.medication-group-label` + `.medication-group-label.required`
- `.medication-group-count` + `.medication-group-count.complete`
- `.medication-group-slots` (2-col default) + `.medication-group-slots.three` (3-col)
- `.medication-btn` (replaces existing — restructured)
- `.medication-btn.taken` + `.medication-btn.taken.required` (primary color tint for required group)
- `.medication-btn-delete` (absolute positioned, hover-visible, mobile always)
- `.medication-add-btn` (dashed border, in group header)
- `.medication-btn-edit-hint` (hover-visible secondary text)

Naming: mockup uses `.med-*` shorthand; in real CSS use `.medication-*` for clarity. Keep `.medication-tracker` selector for backwards-compat if other code references it (verify with grep — likely none outside render-action.js).

## Scope

- **IN**: `js/render-action.js`, `js/rhythm-medication.js`, `css/tasks.css`
- **OUT**: Other tabs (dashboard, work, events, all, history), other features (pomodoro internals, work-* modules), `navigator-v5.html` HTML shell, other CSS files (`dashboard.css`, `nav.css`, etc.)
- **DO NOT delete**: `_renderResolutionSection`, `_renderDetailedAddForm`, etc. — still called from other places. Just remove calls from `renderActionTab`.
- **DO NOT touch routing destinations**: leave TODO comments instead of moving code to dashboard/all/history. Owner will decide destinations later.

## Handoff

After implementation, output to Claude Code:

1. List of modified files with line counts changed (e.g., `render-action.js: +12/-78`)
2. Any divergence from mockup with reason (e.g., "used Lucide `arrow-right` instead of `walking` — walking doesn't exist in Lucide v0.x")
3. TODO comments added (especially routing)
4. Any Lucide icons you couldn't find a clean match for — list separately so we can adjust

Claude Code will review per Rule #14 (separate reviewer pass) before owner commits.

**Do NOT commit. Do NOT push.** Owner commits manually after CC review.

## Verification (smoke test for Codex self-check before handoff)

Open `projects/navigator/navigator-v5.html` in browser, click action tab:

1. Action tab layout: status bar → rhythm/복약 → Next Action → quick add (4 sections only, optionally + active pomodoro)
2. Medication renders TWO groups visually distinct: ADHD약 (primary accent color when taken) + 영양제 (success green when taken)
3. Each group header shows count + `+` button (dashed border)
4. Hover on any slot shows `×` button top-right
5. Next Action card has colored left-bar matching task category — create test task with `category="부업"` → pink bar (`--cat-부업`) visible
6. No emoji visible in rendered UI
7. Quick add placeholder shows all 4 categories (#본업 #부업 #일상 #가족)
8. Other tabs unchanged (verify by switching to dashboard/all/work)

If any verification step fails, do NOT mark task complete. Report the failure point in handoff.

## Notes

- This is **pilot for Track A** (section purpose redesign per Navigator inventory). The 9→3 component reduction + ADHD/영양제 split + add/delete affordances were agreed with owner in design review session 2026-05-20.
- Track B (Standing rule fixes in other surfaces) is a separate workstream — do not touch other surfaces in this task.
- If you find an emoji or hardcoded hex or hover transform in the files you're editing while applying changes, fix it (Standing rule violations override scope). For violations in OTHER files, leave them — Track B handles those.
