# Navigator CSS Structure Audit

**Date:** 2026-05-21  
**Scope:** All 31 CSS files (13,872 LOC, excl. base.css)  
**Purpose:** Structural audit for 9-tab redesign

## Section 1 — Per-File Inventory (Summary)

**System Foundation (11 files):**
- nav.css (449 LOC) — Tab nav + sidebar; all tokens OK
- header.css (78 LOC) — Header bar; 1x gradient (compliant)
- buttons.css (126 LOC) — Button system; scale 0.98 on active (allowed)
- forms.css (388 LOC) — Form inputs; all tokens OK
- modals.css (116 LOC) — Modal framework; all tokens OK
- subtasks.css (423 LOC) — Subtask rows; all tokens OK
- focus.css (85 LOC) — Focus mode; all tokens OK
- effects.css (600 LOC) — Animations + toasts; all tokens OK
- views.css (738 LOC) — List + calendar; all tokens OK
- responsive.css (766 LOC) — Mobile + a11y; VIOLATION: 1x infinite animation
- typography-override.css (134 LOC) — Font normalization; all tokens OK

**Tab-Primary (10 files, 4,513 LOC):**
- tasks.css (1417 LOC) — EXCEEDS 800-line threshold; duplicate .weekly-stat-value
- dashboard.css (1206 LOC) — EXCEEDS 800-line threshold
- schedule.css (409 LOC) — Schedule/timing unclear ownership
- events.css (655 LOC) — Event integration
- history.css (885 LOC) — EXCEEDS 800-line threshold; VIOLATION: 1x hex fallback
- work.css (715 LOC) — Work container
- work-project.css (988 LOC) — EXCEEDS 800-line threshold
- work-tasks.css (311 LOC) — VIOLATION: duplicate .weekly-stat-value
- work-modal.css (175 LOC)
- work-dashboard.css (221 LOC) — VIOLATION: duplicate .weekly-stat-value

**Feature/Cross-Cutting (10 files, 2,260 LOC):**
- profile.css (234 LOC) — VIOLATION: 1x infinite animation (spin, line 122)
- revenue.css (397 LOC) — VIOLATION: duplicate .btn-export-asset
- habits.css (95 LOC)
- life.css (374 LOC)
- rhythm.css (344 LOC)
- settings.css (253 LOC)
- pomodoro.css (151 LOC)
- command-palette.css (161 LOC)
- reflection.css (305 LOC) — VIOLATION: 20x hardcoded hex in var() defaults

## Section 2 — Tab to CSS Mapping

| Tab | Primary | Supporting | Shared |
|---|---|---|---|
| 오늘 | tasks.css, dashboard.css | profile.css | nav, buttons, effects |
| 할일 | tasks.css, views.css | forms.css, subtasks.css, modals.css | responsive, buttons |
| 본업 | work.css, work-project.css | work-tasks.css, work-dashboard.css, work-modal.css | responsive, buttons, modals |
| 이벤트 | events.css, views.css | history.css | responsive, buttons |
| 일상 | life.css, rhythm.css | habits.css | responsive, buttons |
| 통근 | schedule.css | history.css, rhythm.css | responsive, buttons |
| 통계 | dashboard.css, revenue.css | work-dashboard.css, rhythm.css | responsive, buttons |
| 히스토리 | history.css | views.css, events.css | responsive, buttons |
| 자문 | reflection.css | modals.css | responsive, buttons, effects |

## Section 3 — Cross-File Duplicates

Critical (cascade risk):
- .weekly-stat-value in dashboard.css + work-dashboard.css + work-tasks.css (3-way)
- .btn-export-asset in dashboard.css + revenue.css

Low-risk (intentional scoping):
- .modal-* in modals.css, work-modal.css, reflection.css
- .btn-* in buttons.css, tasks.css, forms.css, events.css

## Section 4 — Cascade Risk by Import Order

High-risk late imports:
1. responsive.css (position 28) — affects all 27 prior files via @media
2. reflection.css (position 31) — isolated, low conflict

## Section 5 — Standing-Rule Violations

Max 1 gradient: PASS (header.css only)

CSS variables only: FAIL
- reflection.css 20x hex fallback (var(--bg-card, #1E293B) pattern)
- history.css 1x hex fallback (line 229)

Hover effects: PASS (no transform/scale/box-shadow on :hover)

No persistent animations: FAIL
- profile.css line 122 (spin infinite) — WCAG 2.3.3 violation
- responsive.css line 352 (runner-bounce infinite) — WCAG 2.3.3 violation

Action buttons hidden by default: PASS

## Section 6 — Consolidation Candidates

Merge:
- Timer: focus.css (85) + pomodoro.css (151) → timer.css (240)
- Lifestyle: life.css (374) + habits.css (95) + rhythm.css (344) → lifestyle.css (813)

Split (exceed 800-line threshold):
- tasks.css (1417) → tasks-core (600) + tasks-quick-add (300) + tasks-views (500)
- dashboard.css (1206) → dashboard-hero (300) + dashboard-insights (400) + dashboard-cards (500)
- work-project.css (988) → work-project-card (400) + work-project-detail (588)
- history.css (885) → history-calendar (500) + history-breakdown (385)

## Section 7 — Five Headline Issues

1. Accessibility blocker: infinite animations not gated on prefers-reduced-motion
   - Files: profile.css, responsive.css
   - Impact: WCAG 2.3.3 violation (vestibular motion sensitivity)
   - Fix: 10 min

2. Design-system drift: 22 hardcoded hex fallbacks in var() defaults
   - Files: reflection.css (20), history.css (1)
   - Risk: Silent revert if base.css tokens rename
   - Fix: 5 min

3. CSS class duplication creates cascade hazard
   - Hotspot: .weekly-stat-value (3-way), .btn-export-asset (2-way)
   - Risk: Specificity conflicts when responsive.css adds rules
   - Fix: 30 min (BEM rename)

4. Missing per-tab stylesheet ownership map blocks concurrent dev
   - Gap: No single source of truth for tab-to-CSS mapping
   - Risk: Two devs on 할일 tab independently; git conflicts
   - Fix: 15 min (commit map) + 30 min (pre-commit hook)

5. Code-split threshold violated: 4 files exceed 800 lines
   - Files: tasks.css (1417), dashboard.css (1206), work-project.css (988), history.css (885)
   - Impact: Hard to navigate, slow IDE
   - Fix: 4–6 hours (split per recommendations)

---

Audit complete. Ready for Phase 2 (CSS Normalization) and Phase 3 (HTML Mockups Per Tab).
