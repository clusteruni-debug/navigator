# Navigator UI/UX + Code Audit — Completion Checklist (2026-05-31)

> Source: 6 parallel section reviews (senior UI/UX designer + senior programmer lenses), then a CC reality-check pass against actual code. Agent severities were frequently overstated — every item carries the *verified* verdict.
> Status legend: `[x]` done · `[~]` deferred (tracked, reason given) · `[F]` false-positive / verified-not-a-defect.

## Session result (2026-05-31)

**Fixed (13):** A1-A5, A8, B1-B3, C1, D2, D3, E2 — all `node --check` clean + reflection/entries/cooldown tests pass + sw cache v6-77→v6-78.
**Verified false / benign (6, no change needed):** B4 (Supabase render escapes), B5 (confirm = textContent), C2 (detached-element guards already present), D1 (only 1 gradient = within budget), D4 (`:active`≠hover), D5 (`focus-within`≠hover).
**Deferred (tracked, need user visual confirm or a focused follow-up):** A6, A7, C3-C7, D6-D8, E1, E3, F1-F3.

The "fixed" set was chosen for high value + low visual-regression risk on a daily-use app. The deferred set is either visual redesign (needs the user's eye, per the folded-in Plan B gate), an optimization not painful at single-user scale, or a token/icon sweep best done as one pass — all recorded below, none dropped.

## A. Accessibility (keyboard + screen-reader + tap targets) — top theme

- [x] **A1 (HIGH)** work-render-detail.js:475 — task checkbox `<div onclick>` → added role=button/tabindex/aria-pressed/aria-label/onkeydown(Enter,Space).
- [x] **A2 (HIGH)** work-render-detail.js:480 — status badge `<span onclick>` → keyboard + aria.
- [x] **A3 (HIGH)** work-render-detail.js:484 — priority `<span onclick>` → keyboard + aria.
- [x] **A4 (MEDIUM)** work-render-detail.js:474 — detail chevron → keyboard + aria-expanded.
- [x] **A5 (HIGH)** life.css — `.life-habit-toggle`/`.life-task-check` tap target raised to 44px via a transparent `::after` (visual size unchanged, no layout shift).
- [~] **A6 (MEDIUM)** life.css `.life-task-actions` always-visible → apply hover-reveal + `(hover:none)` pattern. Deferred (visual; verify mobile override).
- [~] **A7 (MEDIUM)** commute `.commute-color-btn` identical aria-label per swatch → per-color label + focus-visible. Deferred (needs color-name map).
- [x] **A8 (MEDIUM)** render-settings.js:420,435 — reflection time `<label>` got `for=` linking to the input ids.
- [~] **A9 (MEDIUM)** work stage/subcat action buttons <44px. Deferred to a tap-target sweep.
- [~] **A10 (LOW)** events.css checkbox 44px not actually achieved (width:20 overrides min-width). Deferred (wrap in label).

## B. Security hardening (NO live CRITICAL XSS found)

- [x] **B1 (MEDIUM)** render-settings.js:450,457 — reflection question textareas: hand-rolled `.replace(/</g)` → `escapeHtml()` (consistency + `&` correctness; was NOT a breakout XSS — textarea RCDATA + `<` escaped is already safe).
- [x] **B2 (LOW)** render-settings.js:76,79 — OAuth photoURL → `escapeAttr` (only when present, keeps default data-URI), email/displayName → `escapeHtml`.
- [x] **B3 (LOW-MED)** commute-render.js:304,320,374,389 — route colors now routed through the existing `getCommuteSafeColor()` allowlist + `escapeAttr` (matches commute.js:250 usage; text-muted fallback preserved).
- [F] **B4** Supabase/Telegram title "persisted XSS." VERIFIED SAFE — render path escapes via `escapeHtml(event.title/description)` (render-events.js:255,257). Caching raw text is not XSS; the render escape is the (present) defense. No change.
- [F] **B5** tasks-history-crud.js confirm() title "XSS." VERIFIED FALSE — `destructiveConfirm` → `window.confirm` renders message as text, not HTML. No change.

## C. Correctness / runtime-safety

- [x] **C1 (HIGH)** duplicate `id="work-quick-input"` (work.js:359 all-tab + work.js:497 general-tab) → renamed all-tab to `work-quick-input-all`; consumers (`quickAddWorkTask`, `toggleWorkQuickOwner`) now use `_visibleWorkQuickInput()` (visible-panel input first, else first — never worse than before).
- [F] **C2 (was HIGH)** long-press timer "orphaned on re-render." VERIFIED BENIGN — `showBackdateMenu` (actions-complete.js:131) + `showSubtaskBackdateMenu` (:209) both early-return on a detached anchor (`!document.body.contains(anchorEl)`), so an orphaned timer is a one-shot no-op. A module-level-timer refactor is optional cleanup, not a bug fix.
- [~] **C3 (MEDIUM)** render-all.js double kanban render. Deferred (optimization; verify real impact at single-user scale first).
- [~] **C4 (MEDIUM)** render-history.js O(n) full-log passes per render. Deferred (memoization optimization).
- [~] **C5 (MEDIUM)** work-tab `new Date(deadline)-new Date()` UTC-naïve off-by-one. Deferred to a date-correctness pass (use the local-date helpers).
- [~] **C6 (LOW)** reflection-push.js daily push lost if device asleep at fire time. Deferred.
- [~] **C7 (LOW)** dead code: render-history.js `_renderCompletedBrowse`, render-dashboard-sections.js `_renderDash*` aliases. Deferred to a dead-code sweep.

## D. Design-rule violations

- [F] **D1 (was HIGH)** header.css:61 `.header-streak` gradient. VERIFIED NOT A VIOLATION — it is the ONLY `linear-gradient` in all navigator CSS (rule = "max 1 gradient per project"), so it is within budget. No change.
- [x] **D2 (HIGH)** responsive.css:352 — `.daily-goal-runner` infinite `runner-bounce` loop removed (persistent looping animation rule + reduces constant motion that distracts ADHD focus; runner now static).
- [x] **D3 (MEDIUM)** buttons.css:38,48,68 — btn-success/warning/danger `:hover{filter:brightness}` → `background: var(--accent-*-hover)` (tokens verified to exist).
- [F] **D4 (was MEDIUM)** buttons.css:18 `.btn:active{transform:scale(.98)}`. Not a hover-rule violation (`:active`, instant, no transition). Left as acceptable press feedback.
- [F] **D5 (was MEDIUM)** tasks.css `.quick-add:focus-within{box-shadow}`. Not a hover-rule violation (`focus-within` is a focus affordance, paired with the rule-compliant border-color change). Left.
- [~] **D6 (MEDIUM)** base.css:331 `zoom:1.075` non-standard, breaks fixed overlays on Firefox. Deferred — verify redundancy with per-token font bumps before removing (regression risk).
- [~] **D7 (LOW)** hardcoded rgba/`white` in life.css/settings.css/effects.css → tokens. Deferred to token-sweep.
- [~] **D8 (LOW)** rhythm.css hardcoded `'SF Mono'` → `var(--font-mono)`. Deferred to token-sweep.

## E. UX anti-patterns

- [~] **E1 (MEDIUM)** rhythm-medication.js:266,302 — `confirm()` used as a yes/no DATA input ("필수 복약?"). Real anti-pattern; the fix (replace 3 sequential prompt/confirm dialogs with a single inline form/toggle in the slot add/edit flow) is a mini-feature best designed with the user. Deferred. (Inline `// boolean 입력` comment already added in Plan A so it isn't mistaken for a destructive gate.)
- [x] **E2 (MEDIUM)** rhythm.js:128 — edit/trash menu raw emoji `✏️`/`🗑️` → `svgIcon('edit'/'trash')` (matches the sibling medication menu; render-deterministic).
- [~] **E3 (LOW)** commute directional emoji labels + events/work emoji buttons → svgIcon. Deferred to an icon-consistency sweep.

## F. Component primitive unification (folded-in Plan B)

> All three "unify" families turned out to be deliberate visual redesigns (not dedup), so per the original Plan B per-milestone "user PC visual confirm" gate they are deferred for the user's visual sign-off rather than applied blind. The base.css `.tab-anchor*` + `--cta-add-*` primitives remain as the target. The review's *decision* (what to unify + how) is the P2 deliverable; execution awaits visual confirm.

- [~] **F1** D-day chip — Agent claimed "clean unify," but verification found `.dday-chip` is itself defined twice (tasks.css:534 `padding 2px 8px`, bg color-mix; views.css:616 `padding 3px 9px`, bg-tertiary) and `.life-dday-chip` differs again (padding 4px 10px). So unifying needs the existing `.dday-chip` duplication resolved first + accepts a life-tab visual change. Deferred (needs visual confirm).
- [~] **F2** Anchor row (6 classes) → `.tab-anchor` + `.with-icon`/`.on-secondary` modifiers. Deferred (visual redesign; flex-vs-grid + bg differences).
- [~] **F3** Add button (6 classes) → `.btn-add` + `.ghost`/`.icon` (base.css `--cta-add-*` tokens). Deferred (visual redesign).
- [F] **F4** Subtab-nav (6 classes) — KEEP DISTINCT (intentional IA: scrollable work stages, card-style reflection tabs, view-toggle semantics, per-tab category accent). Not a defect.
- [F] **F5** Empty-state (4 classes) — KEEP DISTINCT (different roles: interactive add-CTA vs passive message vs modifier). Not a defect.

## Suggested next focused passes (for the deferred set)

1. **Visual unification (F1-F3) + tap-target sweep (A6/A9/A10)** — one branch, with before/after screenshots reviewed with the user (the visual-confirm gate).
2. **Token sweep (D6-D8)** — hardcoded colors/fonts → tokens; verify `zoom` removal in Firefox.
3. **Icon-consistency sweep (E3)** + **dead-code sweep (C7)**.
4. **Perf + date-correctness (C3-C5)** — memoize history, lazy-render inactive kanban, swap deadline math to local-date helpers.
5. **Medication input redesign (E1)** — replace prompt/confirm chain with an inline form.
