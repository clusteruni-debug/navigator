# Codex Task — 오늘 탭 (action) Redesign v2

> **Dispatch target**: 오늘 탭 (action / 1차 진입 surface)
> **Source of truth**: `projects/navigator/docs/design-mockups/_comprehensive-design.html` 의 `#tab-action` section
> **Reference**: `projects/navigator/docs/design-mockups/01-action-tab.html` (prev session BEFORE/AFTER), `_tab-topology.md` §2 Tab 1
> **Dispatch sequence**: 1/9 — 후속 dispatch 본업 → 할일 → 이벤트 → 일상 → 통근 → 통계 → 히스토리 → 자문

## Scope

Implement new 오늘 탭 layout per comprehensive design mockup. Order of sections from top:
1. **Status bar** (existing in title — clock + mode badge inline)
2. **안정 앵커 4개** (existing) — 오늘 마감 / 이번 주 / 완료 / 🔥 streak
3. **결심 트래커 mini summary** (NEW) — one-line: "운동 24/100 · 책 7/24 · 부업 $430/500" + "+ 기록" 버튼 (opens 일상 탭 결심 section)
4. **라이프 리듬 strip** (existing, repositioned to ABOVE focus card) — 6 slot (기상/오전/점심/오후/저녁/취침) with recorded state + Lucide icon per slot
5. **약 복용 compact** (NEW — 오늘 탭에 추가, 일상 탭의 full 관리 surface 와 별개) — 2-row:
   - ADHD 약 row: 2 slot (아침 / 점심) — recorded state with check + 시간
   - 영양제 row: 3 slot (아침 / 점심 / 저녁) — toggle state
   - 하단 "일상 탭 → 약 복용 전체 관리 →" link
6. **Focus card** (existing) — Next Action urgent
7. **오늘 task preview** (existing) — top 3 tasks
8. **Toast preview** — 완료 후 5초 표시 + undo, fixed position bottom-right (CSS class `.toast-fixed`)

## File whitelist

ALLOWED to modify:
- `projects/navigator/js/render-action.js` (primary render fn)
- `projects/navigator/css/tasks.css` (오늘 탭 layout CSS)
- `projects/navigator/css/rhythm.css` (rhythm strip styles if needed)
- `projects/navigator/js/rhythm-medication.js` (약 복용 compact widget rendering for 오늘 탭)
- `projects/navigator/sw.js` — **MUST bump CACHE_NAME v6.17 → v6.18** at end of work
- `projects/navigator/css/navigator.css` — only if new CSS file added (currently NOT expected)

FORBIDDEN to modify (other tabs untouched):
- render-all.js / render-dashboard*.js / render-events*.js / render-life.js / render-settings.js / commute-render.js / reflection-render.js
- work-* (entire 본업 ecosystem)
- base.css / nav.css / responsive.css (already updated in prev commit 94fe4f0)
- state.js / state-types.js / firebase-*.js

## Required changes — detailed

### 1. 결심 트래커 mini summary (NEW section)

Insert after `.anchors` row (or wherever anchors render in render-action.js):

```html
<div class="resolutions-mini">
  <span class="resolutions-mini-label">오늘 결심</span>
  <span class="resolutions-mini-list">
    운동 ${doneCount}/${target} · 책 ${doneCount}/${target} · 부업 $${doneAmount}/${target}
  </span>
  <button class="resolutions-mini-btn" onclick="openResolutionRecordModal()">
    <svg ...></svg> 기록
  </button>
</div>
```

CSS for `.resolutions-mini`: bg-tertiary background, border-light border, 9-12px padding, 10px border-radius. Label = 11px uppercase muted. List = 12px secondary. Button = primary-soft tint with + icon.

Data source: `appState.resolutions` array (`navigator-resolutions` localStorage). Render top-3 active resolutions (sorted by deadline) inline.

`openResolutionRecordModal()` = stub for now — show toast "일상 탭 → 결심 트래커 에서 기록" until full modal implemented in 일상 탭 dispatch.

### 2. 약 복용 compact on 오늘 (NEW — separate from 일상 탭 surface)

After rhythm-strip section, insert:

```html
<div class="med-compact-section">
  <div class="section-title">
    <span>약 복용</span>
    <span class="count">${takenCount} / ${totalCount}</span>
  </div>
  <div class="med-compact-row med-compact-adhd">
    <span class="med-compact-group-label">
      <svg ...pill icon.../> ADHD 약
    </span>
    <div class="med-compact-slots">
      ${renderMedSlot('adhd-아침', ...)}
      ${renderMedSlot('adhd-점심', ...)}
    </div>
  </div>
  <div class="med-compact-row med-compact-vitamin">
    <span class="med-compact-group-label">
      <svg ...face-smile icon.../> 영양제
    </span>
    <div class="med-compact-slots med-compact-slots-3col">
      ${renderMedSlot('vitamin-아침', ...)}
      ${renderMedSlot('vitamin-점심', ...)}
      ${renderMedSlot('vitamin-저녁', ...)}
    </div>
  </div>
  <div class="med-compact-link-row">
    <a onclick="switchTab('life')" class="med-compact-link">
      일상 탭 → 약 복용 전체 관리 →
    </a>
  </div>
</div>
```

`renderMedSlot()` returns button with check icon (if taken) + label + time. Use cat-일상 (--cat-일상) emerald color for active state. ADHD = required (필수 tag), 영양제 = optional.

Data source: `appState.lifeRhythm.today.medication` array. Click handler reuses existing toggleMedication() from rhythm-medication.js. Edit/delete affordance NOT included in compact (only in 일상 탭 full surface).

### 3. Rhythm strip reposition

Move rhythm strip from current position (below focus card OR wherever it lives currently in render-action.js) to ABOVE focus card. Order:
- anchors
- resolutions-mini (NEW)
- rhythm-strip
- med-compact-section (NEW)
- focus card (existing)
- today task preview (existing)

### 4. Focus card + task preview — preserve existing

No changes to focus card / task preview behavior. Just position confirm (below med-compact-section).

### 5. Toast — fixed position

Add CSS:
```css
.toast-fixed {
  position: fixed;
  bottom: 16px;
  right: 16px;
  z-index: 10000;
  display: none;
}
.toast-fixed.active {
  display: flex;
  animation: toast-slide-in 0.2s ease-out;
}
@keyframes toast-slide-in {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
```

Existing `showToast()` in ui.js should already handle position. If inline, replace with `.toast-fixed` class. KEYBOARD: ESC dismiss toast + Ctrl+Z undo (if last 5 sec).

### 6. CACHE_NAME bump

`projects/navigator/sw.js` line 1-3:
```js
// Navigator Service Worker v6.18
// ⚠️ JS/CSS 파일 추가·삭제 시 이 목록과 navigator-v5.html 모두 업데이트 필요
const CACHE_NAME = 'navigator-v6-18';
```

If new JS file added (probably not in this dispatch), append to `urlsToCache` list in sw.js.

## Constraints

- **No emoji** in new code — use Lucide inline SVG (via existing `svgIcon()` helper in utils.js or inline)
- **CSS variables only** — no raw hex except in `--cat-*` token definitions in base.css (already done)
- **Hover effects: bg/border only** — no transform/scale/box-shadow on :hover
- **Touch target min 32px** (44pt iOS HIG goal) — all interactive buttons
- **Standing rule**: action buttons hidden by default, visible on hover (mobile always-visible per existing `responsive.css` pattern)
- **prefers-reduced-motion**: global override already in base.css (don't add per-component overrides)

## Verification expected

After Codex completes:
1. `node --check js/render-action.js` exit 0 (no syntax error)
2. `npm test` 40+/0 PASS (existing test suite)
3. `npx serve -p 5000` + curl http://localhost:5000/navigator-v5.html returns 200
4. Visual: open browser, navigate to 오늘 탭, confirm 5 new sections present in order

## CC Rule #14 review checklist (post-Codex)

- [ ] CACHE_NAME bumped to v6-18
- [ ] No emoji in render-action.js or CSS
- [ ] resolutions-mini uses appState.resolutions (correct source)
- [ ] med-compact uses appState.lifeRhythm.today.medication (correct source)
- [ ] Rhythm strip position above focus card
- [ ] `.toast-fixed` CSS added
- [ ] No other tab files modified (whitelist enforced)
- [ ] Standing rules: hover bg/border only / no infinite animation / single gradient max

## Notes for owner (after dispatch + review)

- Live deploy: GitHub Pages auto-deploy after push (~2 min)
- Hard refresh: Ctrl+Shift+R to bypass HTTP cache
- If still old: DevTools → Application → Service Workers → Unregister
- After v6-18 bump confirmed live, dispatch 2 (본업 탭) ready

---

**Dispatch metadata**:
- Generated: 2026-05-22 (post-comprehensive-mockup)
- Estimated Codex effort: 30-50 min
- Risk: low (single-tab scope, whitelist enforced, prev session pattern proven)
- Rollback: `git revert` if regression detected
