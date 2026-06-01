// PLAN-NAVIGATOR-DESTRUCTIVE-COVERAGE-AUDIT M4 regression test.
// Proves stableCooldownKey is splice-invariant: after deleting an item, a rapid second
// delete on the same array position must re-prompt because the key is tied to the ITEM,
// not the position.
const assert = require('assert');
const { stableCooldownKey } = require('../js/entries-model.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  ✓ ' + name); }
  else { fail++; console.error('  ✗ ' + name); }
}

// 1. Same stable id → same key (a genuine double-click on the SAME item stays within cooldown).
const a1 = stableCooldownKey('task', 'uuid-A', [0, 0, 0, 0]);
const a2 = stableCooldownKey('task', 'uuid-A', [0, 0, 0, 0]);
check('same id -> same key', a1 === a2 && a1 === 'task-uuid-A');

// 2. Different stable id at the same position → different key.
//    This is the splice scenario: after deleting item A, position N now holds item B.
//    A rapid second delete computes B's id → key differs → destructiveConfirm re-prompts.
const b = stableCooldownKey('task', 'uuid-B', [0, 0, 0, 0]);
check('different id -> different key (splice re-prompts, no silent double-delete)', a1 !== b);

// 3. No stable id (legacy pre-UUID data) → unique per call so the cooldown never auto-confirms.
const f1 = stableCooldownKey('task', null, [0, 0, 0, 0]);
const f2 = stableCooldownKey('task', undefined, [0, 0, 0, 0]);
check('no id -> unique per call (#1 != #2)', f1 !== f2);
check('no id -> key carries index parts as prefix', f1.indexOf('task-0-0-0-0-fb') === 0);

// 4. Empty-string id is treated as absent (e.g. empty-text subtask) → always re-prompts.
const e1 = stableCooldownKey('subtask', '', ['x']);
const e2 = stableCooldownKey('subtask', '', ['x']);
check('empty-string id -> unique per call', e1 !== e2);

// 5. Content-derived ids (logs/subtasks) behave like stable ids when distinct.
const logA = stableCooldownKey('log', 'task1|2026-05-29|done', [0, 0, 0, 0, 0]);
const logB = stableCooldownKey('log', 'task1|2026-05-29|other', [0, 0, 0, 0, 0]);
check('distinct content ids -> distinct keys', logA !== logB);

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
console.log('All cooldown-key tests pass.');
