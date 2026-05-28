# Codex Task — All Tasks (할일) Tab Redesign

> Dispatched from CC. Visual source of truth: `projects/navigator/docs/design-mockups/03-all-tasks-tab.html` (open in browser, AFTER column).
> Goal: replace list/sub-view pattern with 2x2 grid kanban + stable anchors + repeating-task inline completion. Category 4 = 2-level hierarchy (일: 본업/부업, 생활: 일상/가족).

## Input

- **Mockup**: `projects/navigator/docs/design-mockups/03-all-tasks-tab.html` (AFTER column = source of truth)
- **Modify**: `projects/navigator/js/render-all.js`, `projects/navigator/css/views.css` (or `css/tasks.css` for shared classes)
- **Read-only**: `projects/navigator/DESIGN.md`, `projects/navigator/CLAUDE.md`, `projects/navigator/js/utils.js`, `projects/navigator/js/state.js`

## Standing Rules (enforced)

- No emoji in UI — Lucide inline SVG (`stroke="currentColor"`) only
- Hover: bg/border color change only (no transform/scale/shadow)
- CSS variables only — `color-mix(in srgb, var(--token) X%, transparent)` for tints
- Max 1 gradient (existing header-streak only — do not add)
- Action buttons: hidden desktop / visible mobile

## Output

### 1. `js/render-all.js` — Replace `renderAllTasksTab()` with 2x2 grid pattern

**Remove from action surface (keep functions for other callers):**
- 5 sub-view tabs (전체 / 오늘 / 예정 / inbox / 다한 것) — replaced by stable anchors + 2x2 grid
- `_renderAllView()` category-section + `_renderFilteredView()` + `_renderCompletedBrowse()` calls
- "completed" sub-view routing
- Note: keep `_renderCompletedBrowse()` function intact — moved to 카테고리별 섹션 또는 history tab in future. Just remove from `renderAllTasksTab()` output

**New layout:**
```
<all-tasks-header>
  <overview-title + summary count>
  <overview-search input>
</all-tasks-header>

<stable-anchors row>
  - 오늘 마감 N (urgent tint when N > 0)
  - 마감 없음 (inbox) N
  - 🔥 streak N일
</stable-anchors>

<category-columns> (2x2 grid)
  <row-label>일</row-label>
  <cat-column 본업>... task list ...</cat-column>
  <cat-column 부업>... task list ...</cat-column>
  <row-label>생활</row-label>
  <cat-column 일상>... task list (반복 task 완료 inline) ...</cat-column>
  <cat-column 가족>... task list ...</cat-column>
</category-columns>
```

### 2. Stable anchors data (new helper)

Add `getStableAnchorsData()`:
```javascript
function getStableAnchorsData() {
  const now = new Date();
  const todayStr = getLocalDateStr(now);
  const pending = appState.tasks.filter(t => !t.completed);
  return {
    todayDeadline: pending.filter(t => {
      if (!t.deadline) return false;
      return getLocalDateStr(new Date(t.deadline)) === todayStr;
    }).length,
    inbox: pending.filter(t => !t.deadline).length,
    streak: appState.streak.current || 0
  };
}
window.getStableAnchorsData = getStableAnchorsData;
```

### 3. Category column rendering

Per column (본업 / 부업 / 일상 / 가족):
- Header: 카테고리 이름 + count (pending) + navigate arrow → `switchToTab('work'/'category')` (existing tab switch logic)
- Task list inline — pending tasks (current `_renderTaskItem` simplified for column context: title + 마감 chip only, no full meta + no full actions)
- **Repeating task completion inline**: tasks with `repeatType !== 'none'` AND `completed === true` AND completed today — show with `class="cat-column-task completed-repeating"` (strikethrough + opacity 0.5 + check svg)
- Non-repeating completed tasks: NOT shown in column (cleared from list — go to history tab)

**Compact task item structure:**
```html
<div class="cat-column-task ${urgency === 'urgent' ? 'urgent' : ''}" onclick="editTask('${id}')">
  ${isCompletedRepeating ? '<svg class="cat-column-task-check"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
  <span class="cat-column-task-title">${title}</span>
  <span class="cat-column-task-time ${timeClass}">${timeLabel}</span>
</div>
```

`timeLabel` examples: "8h" / "내일" / "5/28" / "—" (no deadline)
`timeClass`: `urgent` (<3h) / `warning` (today/tomorrow) / nothing

### 4. Search filter

Search input filters task list across all columns by title (case-insensitive contains). Live filter on input event (no submit button).

```javascript
appState.allTasksSearch = '';  // initialize in state
function setAllTasksSearch(value) {
  appState.allTasksSearch = value;
  renderStatic();
}
window.setAllTasksSearch = setAllTasksSearch;
```

Filter in render: `tasks.filter(t => !appState.allTasksSearch || t.title.toLowerCase().includes(appState.allTasksSearch.toLowerCase()))`

### 5. Empty category column

가족 (or any) with 0 pending = `class="cat-column empty"` + display "task 없음 + 추가" empty state. Click → opens add task modal with category preset.

### 6. `css/views.css` — port mockup styles

Add (port from mockup 03 `.after` rules):
- `.all-overview-header` (replaces `.all-tasks-header`)
- `.all-overview-search` + `.all-overview-search input`
- `.stable-anchors`, `.anchor-widget`, `.anchor-widget.urgent`, `.anchor-widget.streak`, `.anchor-icon`, `.anchor-num`, `.anchor-label`
- `.category-columns` (grid 2x2: `grid-template-columns: repeat(2, 1fr)`)
- `.row-label` (grid-column: 1 / -1, separator line after)
- `.cat-column`, `.cat-column.empty` (border-top-style: dashed)
- `.cat-column-head`, `.cat-column-name`, `.cat-column-count`, `.cat-column-navigate`
- `.cat-column-task-list`
- `.cat-column-task`, `.cat-column-task.urgent`, `.cat-column-task.completed-repeating`
- `.cat-column-task-title`, `.cat-column-task-time` (+ `.urgent`, `.warning` variants)
- `.cat-column-task-check` (success-colored svg)
- `.cat-column-empty` (empty state text)
- Media queries: `@media (max-width: 700px) { .category-columns { grid-template-columns: 1fr; } }`

Remove (or mark unused — keep classes for back-compat if other code uses them):
- `.all-sub-tabs`, `.all-sub-tab`, `.all-sub-tab-count`, `.all-sub-tab-count.has-items`
- `.all-category-section` (replaced by `.cat-column`)
- `.all-category-header` (replaced by `.cat-column-head`)
- `.all-task-item` (replaced by `.cat-column-task`)
- These have other callers (e.g., history tab "completed browse" view) — verify with grep before removing. If used elsewhere, keep them and add new classes.

### 7. Icons (Lucide inline SVG)

Replace emoji per mockup. Reuse Lucide SVGs from action tab + dashboard Codex outputs (same icons): search (magnifier), alert-triangle (urgent), package (inbox), flame (streak), arrow-right (navigate), check (completed-repeating), circle (category dot in column header), plus (add).

## Scope

- **IN**: `js/render-all.js`, `css/views.css` (or `css/tasks.css` if shared classes overlap)
- **OUT**: Other tabs (action, dashboard, work, events, history), `navigator-v5.html` shell, other CSS files (except shared task-item classes if needed)
- **Preserve functions for callers**: `_getSubViewTasks`, `_renderCompletedBrowse`, `_renderTaskItem` — keep intact, just don't call from `renderAllTasksTab()`

## Handoff

- Output modified files with line counts
- List new functions added (`getStableAnchorsData`, `setAllTasksSearch`)
- Any divergence from mockup with reason (icon name, color choice)
- TODO comments for unmigrated logic (e.g., "_renderCompletedBrowse no longer called from all-tasks tab — relocate to history tab in future task")

**DO NOT commit. DO NOT push.** CC reviews per Rule #14.

## Verification

Open `navigator-v5.html` in browser, click 할일 tab:
1. Layout top-to-bottom: header (title + summary + search) → stable anchors row (3 widgets) → 2x2 grid (row-label "일" + 본업 / 부업 / row-label "생활" + 일상 / 가족)
2. Each column shows category-color border-top + name + count + navigate arrow
3. Task list inline per column with compact title + 마감 chip
4. Urgent tasks (deadline <3h) have urgent tint background
5. Repeating tasks completed today appear with strikethrough + opacity 0.5 + check svg (test with category="일상" + repeatType="daily" + completed=true)
6. Empty 가족 column shows "task 없음 + 추가" empty state with dashed border-top
7. Search input filters tasks live across all columns
8. Click cat-column-navigate arrow → navigates to that category's tab (or stays on current if not implemented yet)
9. No emoji visible in UI
10. Other tabs unchanged

## Notes

- This is Track A pilot #3 (할일 tab). Action + Dashboard pilots already complete.
- 2-level category hierarchy decision: 일 = 본업/부업, 생활 = 일상/가족. row labels in grid show this hierarchy.
- Repeating task inline completion = ADHD dopamine engagement (Phase 0 IA decision).
- Non-repeating completed = moves to history tab + that category's section (per resolved IA).
