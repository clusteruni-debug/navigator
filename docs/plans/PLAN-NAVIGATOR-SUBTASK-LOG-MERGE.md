---
plan_id: NAVIGATOR-SUBTASK-LOG-MERGE
project: navigator
status: IN_PROGRESS
status_reason: P0+P1+P2+P3 shipped 2026-05-28. P3 = 12 button UX fix (HIGH 4 + MEDIUM 8) + ux-helpers.js (destructiveConfirm + emojiLabelButton). CC fallback again after Codex 2x BLOCKED pattern. Browser smoke pending user. P4 (Firebase migration) is the only remaining milestone.
milestones:
  - { id: P0, label: "Measure current usage + decide migration strategy (lazy vs eager batch)", done: true }
  - { id: P1, label: "Define unified entries[] model + lazy mapping from legacy subtasks/logs", done: true }
  - { id: P2, label: "Split-area UI (할 일 box + 기록 box) with distinct visual codes", done: true }
  - { id: P3, label: "Button UX pass (toggle hit area + add-button visibility + delete confirm)", done: true }
  - { id: P4, label: "Firebase data migration + integrity verification (zero data loss)", done: false }
decisions_pending: []
blockers: []
depends_on: []
git_strategy: mono
last_verified: 2026-05-28
ko_translation:
  status_reason_ko: "P0 완료 — firebase-admin credential 없어 측정 skip, single-user personal manager 라 lazy 전략 채택. Firestore path 발견: users/{uid}.workProjects[].stages[].subcategories[].tasks[]. P1 (entries[] 모델 + lazy mapper) dispatch 준비."
  milestones_ko:
    - { id: P0, label_ko: "현 사용 패턴 측정 + 마이그레이션 전략(lazy vs 일괄) 결정" }
    - { id: P1, label_ko: "통합 entries[] 모델 정의 + 기존 subtasks/logs lazy 매핑" }
    - { id: P2, label_ko: "분리 영역 UI (할 일 박스 + 기록 박스) + 시각 코드 구분" }
    - { id: P3, label_ko: "버튼 UX 개선 (토글 클릭 영역 + 추가 버튼 가시성 + 삭제 확인)" }
    - { id: P4, label_ko: "Firebase 데이터 마이그레이션 + 무결성 검증 (데이터 손실 0)" }
  decisions_pending_ko: []
  blockers_ko: []
---

# Plan — Navigator Subtask + Log Merge (Unified Entries Model)

> **Goal (testable)**: After rollout, a user completes "small task done + recorded" via a single checkbox click (currently 2 separate writes: subtask check + manual log entry). Measured by: (a) 0 manual log entries that duplicate an existing subtask completion within the same session, (b) work-detail viewport scroll length reduced ≥20% on the median task.
> **Owner**: User (Decider) + CC primary
> **Created**: 2026-05-28
> **Triggered by**: User feedback session 2026-05-28 — "subtask 와 기록 둘 다 체크박스라 중복, 작성 2번 번거롭고 UI 길어짐, 버튼도 불편함"

## Background

Two checkbox-bearing entities currently coexist on the same task card:

- `task.subtasks[i] = { text, completed, isRequired }` — small checklist items, time-agnostic. Toggle in `work-render-detail.js:493`, handler `toggleWorkTaskSubtaskComplete` (`work-toggles.js:154`).
- `task.logs[i] = { date, content, checked }` — work-log entries, time-anchored with free-form body. Toggle in `work-render-detail.js:536/555/571`, handler `toggleWorkLogChecked` (`work-actions.js:441`). `checked` field was added in commit `248daccb` (2026-05-28).

Both render as `○/✓` round toggles inside the same task card. User reads this as visual duplication, and reports the actual UX cost: writing a subtask completion + a matching log entry requires two separate inputs, and both lists make the card scroll long.

Semantic check confirmed the entities are NOT duplicates of the same data — subtask is "this small thing done?" (text-only flag) while log is "I recorded what happened on date X" (timestamp + multi-line body). However, the user's real-world workflow treats "subtask completed" as itself a log-worthy event, so the practical workflow is 1 intent → 2 writes.

## Approach

Five phases, each ≤ 4h. Sequential. P0 gates P1's strategy decision.

### Phase 0 — Measure + Strategy

- Query Firestore to dump per-task subtask/log counts across active users + identify what fraction of logs are "manual transcription of subtask completion" (heuristic: log.content starts with subtask.text or contains `✓`).
- Decide migration strategy: **(a) lazy** (read-time mapper, write to new model going forward) vs **(b) eager batch** (one-shot Firestore script, atomic switch). Trade-off: lazy = safer rollout but dual-path code for weeks; eager = clean cut but requires Firestore export + restore safety net.
- **Acceptance**: measurement output committed under `projects/navigator/docs/measurements/subtask-log-2026-05-28.md` + strategy choice with 5-line rationale appended to this plan's `status_reason`.

### Phase 1 — Unified `entries[]` Model + Lazy Mapping

> **Firestore path (P0 discovered)**: tasks live nested at `users/{uid}.workProjects[].stages[].subcategories[].tasks[]`. NOT a top-level `tasks` collection. Each task has `subtasks[]` + `logs[]` fields. Browser Firebase config in `navigator-v5.html:39` for project `navigator-todo`. Write path = single `users/{uid}` doc update (whole-doc replace pattern current; consider partial update for atomicity).

- New schema `task.entries[]` where each entry: `{ id, type: 'subtask'|'note', text, completed?, completedAt?, date?, checked?, origin? }`.
  - `type: 'subtask'` → `completed` + `completedAt` active, short text.
  - `type: 'note'` → `date` + `checked` active, long text (textarea).
  - `origin: 'auto-from-subtask:<subtaskId>'` for auto-generated note entries.
- **Subtask check** triggers (atomic): (a) set `completed = true` + `completedAt = now` on the subtask entry, (b) push a `type: 'note'` entry with `origin: 'auto-from-subtask:<id>'`, `text: "MM-DD ✓ {subtask.text}"` (e.g., `"05-28 ✓ 자료 모으기"`), `date: now`.
- **Subtask uncheck** triggers (atomic, clean revert per user 2026-05-28): (a) set `completed = false` + clear `completedAt`, (b) **delete** the linked auto-note entry matching `origin: 'auto-from-subtask:<id>'`. No tombstone, no history kept.
- Lazy mapper reads legacy `subtasks[] + logs[]` → projects to `entries[]` on render. Write path uses new model only after Phase 4 cutover.
- **Acceptance**: unit test `entries-mapper.test.js` passes on 3 fixtures (legacy-only, mixed, new-only). Render-equivalence test: legacy task rendered via mapper = current rendering byte-for-byte for read-only view. Atomic transaction test: rapid check-uncheck-check cycle leaves no orphan auto-notes.

### Phase 2 — Split-Area UI (할 일 + 기록 boxes)

- Filter logic:
  - 할 일 box: `entries.filter(e => e.type === 'subtask' && !e.completed)` — pending subtasks only, sorted by `isRequired` then creation order.
  - 기록 box: `entries.filter(e => e.type === 'note' || (e.type === 'subtask' && e.completed))` — sorted by `date || completedAt` descending.
- Visual code split:
  - 할 일: `□/☑` square checkbox (Lucide `Square` / `CheckSquare`), label as task body.
  - 기록: dot or note icon (Lucide `StickyNote` / `Circle`) + small date pill on the right.
- Box header counts: "할 일 (N 남음)" / "기록 (M)" — wired to filter result `.length`.
- **Acceptance**: at the test fixture task, two distinct bordered boxes visible, no `○/✓` overlap between them. Mobile (≤375px viewport) keeps the two-box layout (no collapse).

### Phase 3 — Button UX (full navigator audit)

> **Scope expanded 2026-05-28** — user requested audit of ALL navigator UI buttons, not just the three initial items. Initial three remain HIGH-priority confirmed work; additional items will be rated HIGH/MEDIUM/LOW after Explore audit and selected for this P3 with user input.

**Initial HIGH-priority items (already confirmed):**

- **Toggle hit area** — extend click target from the `○/✓` glyph to the entire row. Keep keyboard `a11y` (`role="button" tabindex="0" onkeydown=Enter|Space`). Avoid swallowing clicks on nested `<a>` / textarea children.
- **Add-record button** — pin top-right of 기록 box, icon-button 32×32, always visible (not hover-only). Reuse `lucide-react` `Plus` icon. On mobile, full-width sticky bottom variant per existing Navigator pattern.
- **Delete button** — hover-only on desktop, always visible on mobile (per workspace Design Rules). Add `confirm()` dialog on first click; suppress confirm for 5s on subsequent same-row click (cooldown).

**Audit-selected items (12 total — HIGH 4 + MEDIUM 8):**

HIGH (4):
- Subtask toggle hit area — `render-action.js:374` glyph-only 20px → full row 44px+ height. Keep keyboard a11y (role=button + tabindex + Enter/Space).
- Add-record button (`+ 기록`) — `work-render-detail.js:481` hover-only `opacity:0` → always-visible. Mobile sticky-bottom variant.
- Delete buttons (task / stage / subcategory) — `work-render-detail.js:486/309/358` no confirm → confirm dialog with 5s cooldown for repeat clicks.
- Long-press menu discoverability — `render-action.js:375` 500ms long-press for backdate menu has no visual affordance → add UI hint (dotted underline or info icon on subtask).

MEDIUM (8):
- Medication delete nested button — `render-action.js:557-562` 18×18 `role=button` inside 44×44 `<button>` → flatten + 44px hit area + Enter/Space onkeydown.
- Emoji-only action buttons — `work-render-detail.js:176-179, 306-308` 💬📝ℹ️⋯ + ▲▼💬✏️📅 → add text labels (or aria-label minimum), keep emoji as icon prefix.
- Rhythm/medication buttons on mobile <375px — `render-action.js:479-485` label-below-button compresses hit area → label-beside layout, expand hit area.
- Action-preview checkbox contrast — `render-action.js:231` idle state mixes with row background → distinct idle stroke color.
- Inline detailed subtask check — `render-action.js:694` 20×20 in form context → 44×44.
- Tab menu nested dropdown — `render.js:197-226` `menuitem` role missing disabled state styling → complete a11y states.
- Stage complete toggle — `work-render-detail.js:276` glyph-only, unclear completed state → label or filled square.
- Subcategory complete toggle — `work-render-detail.js:335` same issue as stage → same fix.

**4h cap override rationale (2026-05-28)**: estimated 6-8h, split rejected after three-persona review (UI/UX designer + senior dev + PM all opposed):
- UX: visual-code consistency is the core deliverable — split-state leaves half the buttons in old pattern, worse than current
- Code: shared helper functions (hit-area-row-wrap, destructive-confirm-dialog, emoji-with-label) are designed once across all sites — split would force helper API rework
- PM: single-dev personal project, milestone-visibility value ~0; split adds task-tracking overhead without risk benefit

- **Acceptance**: manual browser test — each of the 12 fixed buttons reachable with one tap on iPhone-SE viewport (375px) AND desktop 1440px. Self-record + DevTools `pointer events` cross-check. Audit report at `projects/navigator/docs/measurements/button-audit-2026-05-28.md` is the source-of-truth list.

### Phase 4 — Migration + Integrity Verification

- Pre-migration: Firestore export of all `tasks/*` collections to `projects/navigator/backups/2026-05-28-pre-merge.json`. Hash-locked snapshot.
- Migration script `projects/navigator/scripts/migrate-entries.js`: per-task transform `subtasks[] + logs[] → entries[]`, preserving all fields. Auto-generated note entries created for already-completed subtasks (origin tag retroactive).
- Dry-run mode prints diff (added entries / preserved entries / dropped fields if any) without write.
- Post-migration: integrity check — for every legacy task, `entries.filter(t='subtask').length == legacy subtasks.length` AND `entries.filter(t='note' && origin == null).length == legacy logs.length`. Failure → rollback from snapshot.
- **Acceptance**: dry-run passes on 100% sample, then live run with rollback rehearsal documented. SLA: migration completes < 5 min, downtime = 0 (read path supports both shapes during cutover via Phase 1's lazy mapper).

## Spec Gap Checklist

> Fill these BEFORE starting Phase 0. Empty checkboxes = open questions blocking implementation.

### Resolved Gaps
- Approach selected: B (subtask check auto-generates log entry, render-split UI). Confirmed by user 2026-05-28.
- UI layout: separated 할 일 / 기록 boxes (vs single timeline). Confirmed by user 2026-05-28 via AskUserQuestion preview.
- Three initial button-pain points confirmed: toggle hit area, add-record button visibility/size, delete button.
- Auto-generated log entry text format: `"05-28 ✓ {subtask.text}"` — date prefix `MM-DD` + check glyph + subtask text. Confirmed by user 2026-05-28.
- P3 scope expanded — user requested audit of ALL navigator UI buttons (not just the three initial items). Audit completed 2026-05-28 via CC Explore subagent; user selected HIGH 4 + MEDIUM 8 (12 fixes total) for P3, LOW 6 deferred. Source-of-truth: `projects/navigator/docs/measurements/button-audit-2026-05-28.md`.
- Subtask-uncheck rule: **delete (clean revert)** — when user unchecks a subtask, the auto-generated note entry is removed. Matches user mental model "uncheck = not done". Confirmed 2026-05-28.
- P3 split rejected after 3-persona review (UX designer + senior dev + PM all opposed). Single P3 phase, estimated 6-8h, 4h cap overridden. Rationale embedded in Phase 3 section.
- **P0 measurement skipped, lazy strategy chosen** (2026-05-28). Codex P0 dispatch blocked by missing `firebase-admin` credential. Justification for lazy without measurement: (1) single-user personal manager (one `users/{uid}` doc, no concurrent writers), (2) sw cache at v6-64 indicates months of usage but realistic task volume ≪ 1000, (3) measurement was nice-to-have for duplication % validation, not required for strategy choice. Real P0 value = Firestore path discovery (now in Phase 1 header).
- **PLAN-OPTB-PRIMITIVE coexistence**: that plan stays partial (M1 step 1/3, M4/M5 JS-side integrated, M2/M3 unstarted). Our P3 helpers (`hit-area-row-wrap`, `destructive-confirm-dialog`, `emoji-with-label`) align with navigator design-tokens.md rules (44×44, `--accent` CSS var, verb-first labels) so future `.btn-add` primitive migration is a value-swap, not a rewrite. User decision 2026-05-28: do not revive OPTB-PRIMITIVE in this session (UI churn risk too high).

### Missing Questions
- N/A for user-decision items — all resolved as of 2026-05-28.
- Open Codex-side items (not blocking user input):
  - P0 migration strategy (lazy vs eager) — pending background job `task-mpp376uv-ph9gqx`
  - Auto-note text format finalization — `"MM-DD ✓ {subtask.text}"` baseline; revisit if user prefers different date format after P2 lands

### Undefined Guardrails
- [ ] Maximum `entries[]` length per task (current `subtasks[] + logs[]` is implicitly unbounded — Firestore doc 1 MB limit).
- [ ] Auto-note entry text length cap (in case `subtask.text` is long).
- [ ] Confirm-dialog cooldown precise value (5s baseline above; revisit if user finds it slow).

### Scope Risks
- [ ] Cross-plan interaction — `PLAN-NAVIGATOR-LIFEOS-INTEGRATION` and `PLAN-NAVIGATOR-TGEVENTBOT-INTEGRATION` may also touch task data shape. Coordinate before Phase 1.
- [ ] Mobile narrow-viewport: two bordered boxes might feel cramped under 320px. Phase 2 acceptance test should include 320px sweep.
- [ ] Auto-note proliferation: if a user toggles a subtask repeatedly (check-uncheck-check), do we accumulate notes? Idempotency rule needed before P1.

### Unvalidated Assumptions
- [ ] User actually wants subtask completion to be auto-logged in every case. Phase 0 measurement should report what fraction of subtask completions today already have a matching manual log — if it's already <30%, auto-logging is unwanted noise.
- [ ] Two-box render is more readable than single timeline at the chosen task density (user picked it from a preview but in real data the density may differ).

### Missing Acceptance Criteria
- [ ] Quantitative scroll-length reduction target (≥20% in goal — needs baseline measurement in P0).
- [ ] User acceptance test (UAT) protocol — 2-week window with explicit "좋음 / 그대로 / 되돌리기" check-in.

### Edge Cases
- [ ] Task with `subtasks = []` and `logs = []` → entries = [] → empty-state UI in both boxes.
- [ ] Subtask checked then immediately unchecked (race within 100ms) — Firestore transaction must serialize.
- [ ] User manually deletes an auto-generated note entry — does the source subtask revert to unchecked, stay checked, or both diverge?
- [ ] Mid-migration concurrent edit (user editing a task while migrate script runs on it).
- [ ] Existing `log.checked = true` entries from `248daccb` — preserved as `entries[].checked` and not duplicated.

## Acceptance Criteria (overall)

- [ ] Single click on a subtask checkbox produces both `completedAt` set + a new auto-note entry visible in the 기록 box, atomic write.
- [ ] `할 일` and `기록` boxes render with distinct visual codes (`□/☑` vs note icon) and counts.
- [ ] Three button UX fixes pass manual viewport test (375px iPhone-SE + desktop 1440px).
- [ ] Migration script dry-run shows 0 dropped fields across all current tasks. Live run completes with integrity check passing.
- [ ] SLA: migration downtime = 0, data loss = 0, rollback path tested in rehearsal.
- [ ] Adoption window: 2 weeks post-deploy, user explicitly reports "좋음 / 더 손볼 거" via session check-in.

## Decision Rationale (5원칙)

| 원칙 | rank | 근거 |
|---|---|---|
| Correctness | OK | Both semantics (subtask checklist + log entries) preserved via `type` discriminator. Atomic transaction prevents partial writes. |
| Simplicity | OK | One array + type field replaces two collections + their separate handlers. Net code reduction expected in `work-render-detail.js`. |
| Performance | OK | `filter()` on a typically <50-entry array is negligible. One extra write per subtask check (auto-note generation) — Firestore batch write. |
| Cost | 중간 | 5 phases, migration script + Firestore export + UI rebuild. Estimated 2-3 sessions of CC + Codex work. |
| Over-eng | OK | User explicitly requested merge; no speculative future-proofing added. Open question on auto-note opt-in (P0 measurement) prevents over-shoot. |

**Counter-argument considered**: Option A (add `completedAt` to subtask only, no merge) has lower cost and zero migration risk. Refuted because it leaves the user's stated pain points #2 (작성 번거로움) and #3 (UI 길어짐) unsolved — visual deduplication without data unification keeps both lists rendered separately. Plausible-tier counter; refuted by direct user requirements.

## References

- Related plans: `docs/plans/PLAN-NAVIGATOR-LIFEOS-INTEGRATION.md`, `docs/plans/PLAN-NAVIGATOR-TGEVENTBOT-INTEGRATION.md` (coordinate task shape changes).
- Commit `248daccb` (2026-05-28) — `log.checked` introduced, triggered this redesign.
- Memory: `memory/feedback/feedback_user_judgment_patterns.md` (시리얼 시간 금지 — implement sequentially, not parallel branch), `memory/feedback/feedback_proactive_self_critique.md` (5원칙 matrix above).
- Diary: `memory/diary/2026-05-28.md` Session covering `248daccb` (이전 요청 추적 문서화).
- Source files cited above: `projects/navigator/js/work-render-detail.js`, `work-toggles.js`, `work-actions.js`.

## Notes

> Generated by `/plan-new navigator subtask-log-merge` on 2026-05-28, body filled by CC after user confirmed B-option direction.
> Lint command: `python3 scripts/parse-plan-frontmatter.py --lint <this-file>`
> Update fields atomically: `python3 scripts/frontmatter-write.py <this-file> --status IN_PROGRESS --reason "..."`
> Plan execution will use Codex dispatch (Tier-3 `/codex-dispatch`) per workspace Rule #1.
