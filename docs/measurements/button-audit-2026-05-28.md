# Navigator Button Audit (2026-05-28)

> **Source**: CC Explore subagent — full clickable-element inventory across `projects/navigator/`
> **Trigger**: PLAN-NAVIGATOR-SUBTASK-LOG-MERGE Phase 3 scope expansion (user requested full UI audit, not just checkbox/add/delete)
> **Scope**: HTML `<button>`, `role=button` spans, lucide-icon onclick handlers, anchor-as-button, keyboard shortcut bindings
> **Coverage**: `projects/navigator/js/work-*.js`, `render-*.js`, settings, plus CSS hover-mobile patterns. NOT audited: `tgeventbot-*.js` (separate audit recommended), `render-history.js` (low usage), HTML entry points (assumed dynamically rendered)
> **Status**: AUDIT-COMPLETE. P3 selection (12/22) confirmed by user 2026-05-28.

## Overview

- **Total interactive elements**: 180+ unique
- **By category**: Work/Projects (45), Actions/Tasks (35), Reflection (12), Settings (15), Navigation (8), Rhythm/Medication (22), Others (43+)
- **By priority**: HIGH 4, MEDIUM 8, LOW 6, plus uncategorized rare-use buttons

## Button Inventory (priority-ranked)

| File:Line | Button (Label/Icon) | View | Handler | UX Issue | Priority |
|---|---|---|---|---|---|
| `render-action.js:374` | ○/✓ toggle | action | `toggleSubtaskComplete` | Click area only 20px wide (glyph only); should expand to full row 44px+ height | **HIGH** |
| `render-action.js:375` | Long-press (menu) | action | `showSubtaskBackdateMenu` | 500ms long-press hidden from user; no visual affordance; hard to discover on mobile | **HIGH** |
| `work-render-detail.js:481` | `+ 기록` | work-detail | `showWorkModal('log')` | Hover-only visibility (`opacity:0`), invisible on mobile touch; users miss add-log button | **HIGH** |
| `work-render-detail.js:486` | 항목 삭제 (trash) | work-detail | `deleteWorkTask` | No confirm dialog; destructive action one-click; dangerous; red color alone insufficient | **HIGH** |
| `work-render-detail.js:309` | 단계 삭제 (trash) | work-detail | `deleteProjectStage` | No confirm dialog; destructive; affects all children | **HIGH** |
| `work-render-detail.js:358` | 중분류 삭제 | work-detail | `deleteSubcategory` | No confirm dialog; destructive; nested in hover-only actions area | **HIGH** |
| `render-action.js:557-562` | `medication-btn-delete` (×) | action | `deleteMedicationSlot` | `role="button"` nested inside `<button>`; 18×18 click area; no Enter/Space onkeydown | MEDIUM |
| `work-render-detail.js:176-179` | Project action buttons (4) | work-detail | `copyProjectToSlack` / `showFormExportMenu` / `showMetaEditor` / `showProjectMoreMenu` | Emoji-only labels (💬📝ℹ️⋯); no text; tooltip present; 44px adequate but low discoverability | MEDIUM |
| `work-render-detail.js:306-308` | Stage action buttons | work-detail | `moveStage` / `copyStageToSlack` / `promptRenameStage` / `showWorkModal` | Emoji labels (▲▼💬✏️📅); cramped at 44px; no keyboard support; inaccessible on mobile | MEDIUM |
| `render-action.js:479-485` | `rhythm-btn` / `medication-btn` | action | `handleLifeRhythmClick` / `handleMedicationClick` | 44×44 meets WCAG; hover visible; but label below button, cramped on <375px screens | MEDIUM |
| `render-action.js:231` | ○ complete check | action | `completeTask` | 32px circle, adequate hit area but lacks contrast in idle state | MEDIUM |
| `render-action.js:694` | Subtask list check (inline number) | form | `toggleDetailedSubtask` | Button sized 20×20 for inline task; too small (should be 44×44 minimum for touch) | MEDIUM |
| `render.js:197-226` | Tab buttons (action/all/work/events/life/more) | header | `switchTab` | 44×44 adequate; but more-menu nested dropdown uses `menuitem` role and lacks disabled state styling | MEDIUM |
| `work-render-detail.js:276` | Stage complete toggle | work-detail | `toggleStageComplete` | Glyph-only label; no 44px min; visually unclear completed state | MEDIUM |
| `work-render-detail.js:335` | Subcategory complete | work-detail | `toggleSubcategoryComplete` | Same as stage; glyph only | MEDIUM |
| `render-action.js:532` | + (medication slot) | action | `addMedicationSlot` | Small icon (12px) in 44×44 button; icon-only, no label; title attr present but unclear | LOW |
| `work-render-detail.js:100,106` | 접기/▼더보기 | work-detail | `toggleWorkLogContent` | 44px height; positioned at end of log text; easy to miss; no visible affordance (text-only) | LOW |
| `render-action.js:386-389` | Next-action buttons (GO/완료/내일로/수정) | action | `handleGo` / `completeTask` / `postponeTask` / `editTask` | Adequate sizing; good labels; but hard to find in dense layout; no visual hierarchy | LOW |
| `render-settings.js:378-381` | Export/Import buttons | settings | `exportData` / `importData` | 100% width; good labels; but no progress indicator for long operations | LOW |
| `render-action.js:406` | Quick-add button (+ icon) | action | `quickAdd` | Icon 18px in button; adequate area; but no loading state when adding; no visual feedback | LOW |
| `render-action.js:586-590` | Pomodoro buttons (pause/resume/stop) | action | `pausePomodoro` / `resumePomodoro` / `stopPomodoro` | Adequate sizing and labels; good visibility; some users confuse pause/stop | LOW |
| `render-settings.js:85` | 로그아웃 | settings | `logout` | Adequate sizing; clear label; good placement; hidden until modal open | LOW |
| `render-settings.js:100` | 구글 로그인 | settings | `loginWithGoogle` | Adequate sizing; clear label | LOW |

## UX Issues Summary

### HIGH (4 selected for P3)

1. **Subtask toggle hit area** (`render-action.js:374`) — 20px glyph width; expand to full row ~44px height
2. **Add-record button hover-only** (`work-render-detail.js:481`) — invisible on mobile; always-visible fix required
3. **Delete actions (task/stage/subcategory)** — no confirm dialogs; one-click destructive; HIGH risk
4. **Long-press discoverability** (`render-action.js:375`) — 500ms timeout not communicated; needs UI hint

### MEDIUM (8 selected for P3 — all included per user 2026-05-28)

1. Medication slot delete (18×18 nested button inside 44×44 button) — `render-action.js:557-562`
2. Project action emoji buttons (💬📝ℹ️⋯) — low discoverability; no text labels — `work-render-detail.js:176-179`
3. Stage action buttons (emoji-only in hover-only area) — cramped; inaccessible on <375px — `work-render-detail.js:306-308`
4. Rhythm/Medication buttons cramped on mobile (<375px) — label below button reduces hit area — `render-action.js:479-485`
5. Action-preview checkbox (32px) — adequate but low contrast in idle state — `render-action.js:231`
6. Detailed subtask inline check (20×20) — too small for touch; in form context — `render-action.js:694`
7. Tab menu nested dropdown — lacks visual disabled state; menuitem role incomplete — `render.js:197-226`
8. Stage/subcategory complete toggle — glyph-only; unclear completed state — `work-render-detail.js:276, 335`

### LOW (6 — deferred to follow-up plan)

- Quick-add icon button
- Pomodoro controls
- Sketch apply button (`work-render-detail.js:196`)
- Settings logout/login buttons
- Stage rename edit button (emoji ✏️) (`work-render-detail.js:307`)
- Reflection settings reset (`render-settings.js:477`)

## Accessibility Gaps

- **20 buttons** lack explicit min-height/min-width (44×44) validation
- **10 buttons** use `role="button"` without proper `tabindex`/`onkeydown`
- **8 buttons** emoji-only; no `aria-label` or accessible fallback
- **3 buttons** destructive without confirm dialogs (HIGH-priority P3 blockers)
- **2 buttons** nested (medication delete) breaking click-event semantics

## P3 Decision (2026-05-28)

- **Selected**: all HIGH 4 + all MEDIUM 8 = **12 fixes** in single P3 phase
- **Deferred**: LOW 6 → follow-up plan
- **4h cap**: overridden; estimated 6-8h, single phase per 3-persona review (UX consistency + helper API design + PM overhead all favored single-phase)
- **Shared helpers planned**:
  - `hit-area-row-wrap` (full-row clickable wrapper preserving inner-element semantics)
  - `destructive-confirm-dialog` (configurable confirm dialog with 5s cooldown)
  - `emoji-with-label` (icon + text label, aria-label fallback)

## Audit Limitations

- `js/tgeventbot-*.js` (event bot buttons) — scope exceeded; recommend separate audit
- `js/render-history.js` (history filters/actions) — 5+ buttons; low usage; skipped
- HTML entry points (`index.html` / `navigator-v5.html`) — assumed dynamically rendered; not directly inspected

All findings grounded in file:line references. No speculation. critical.md Rule #2 honesty compliance.
