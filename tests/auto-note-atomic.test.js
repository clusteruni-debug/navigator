'use strict';

// P4 atomic write test (PLAN-NAVIGATOR-SUBTASK-LOG-MERGE)
// Validates applySubtaskToggle: check creates auto-note in task.logs[],
// uncheck removes it. Verifies idempotency and manual-note preservation.

const path = require('path');
const assert = require('assert');
const { applySubtaskToggle, buildAutoNoteLog, AUTO_SUBTASK_ORIGIN_PREFIX, mapLegacyToEntries } =
  require(path.join(__dirname, '..', 'js', 'entries-model.js'));

let failures = 0;
function check(label, actual, expected) {
  try {
    assert.deepStrictEqual(actual, expected);
    console.log('  PASS', label);
  } catch (e) {
    failures++;
    console.error('  FAIL', label, '— got', JSON.stringify(actual), 'expected', JSON.stringify(expected));
  }
}

const NOW = '2026-05-28T12:34:56.000Z';

console.log('Fixture 1: check creates auto-note');
{
  const task = { subtasks: [{ text: '자료 모으기' }], logs: [] };
  applySubtaskToggle(task, 0, NOW);
  check('subtask.completed', task.subtasks[0].completed, true);
  check('subtask.completedAt', task.subtasks[0].completedAt, NOW);
  check('logs.length', task.logs.length, 1);
  check('log.origin', task.logs[0].origin, AUTO_SUBTASK_ORIGIN_PREFIX + '0');
  check('log.content prefix', task.logs[0].content, '05-28 ✓ 자료 모으기');
  check('log.checked', task.logs[0].checked, false);
}

console.log('Fixture 2: uncheck removes auto-note + clears completedAt');
{
  const task = { subtasks: [{ text: 'x', completed: true, completedAt: NOW }], logs: [{ date: NOW, content: '05-28 ✓ x', origin: AUTO_SUBTASK_ORIGIN_PREFIX + '0', checked: false }] };
  applySubtaskToggle(task, 0, '2026-05-28T13:00:00.000Z');
  check('subtask.completed', task.subtasks[0].completed, false);
  check('completedAt removed', task.subtasks[0].completedAt, undefined);
  check('logs emptied', task.logs.length, 0);
}

console.log('Fixture 3: re-check after uncheck re-creates fresh auto-note');
{
  const task = { subtasks: [{ text: 'y' }], logs: [] };
  applySubtaskToggle(task, 0, '2026-05-28T10:00:00.000Z');
  applySubtaskToggle(task, 0, '2026-05-28T10:01:00.000Z');
  applySubtaskToggle(task, 0, '2026-05-28T10:02:00.000Z');
  check('final state completed', task.subtasks[0].completed, true);
  check('logs only one auto-note', task.logs.filter(l => l && l.origin).length, 1);
  check('auto-note date is final time', task.logs[0].date, '2026-05-28T10:02:00.000Z');
}

console.log('Fixture 4: manual note preserved through cycle');
{
  const task = {
    subtasks: [{ text: 'a' }],
    logs: [{ date: '2026-05-27', content: '수동 메모', checked: false }]
  };
  applySubtaskToggle(task, 0, NOW);
  applySubtaskToggle(task, 0, NOW);
  check('manual note survives cycle', task.logs.length, 1);
  check('manual note content unchanged', task.logs[0].content, '수동 메모');
}

console.log('Fixture 5: idempotent — double-check does not double-push');
{
  const task = { subtasks: [{ text: 'z' }], logs: [] };
  applySubtaskToggle(task, 0, NOW);
  // Force second call without state reset (test guards against bugs that bypass de-dup)
  task.subtasks[0].completed = false;
  applySubtaskToggle(task, 0, NOW);
  check('check after manual unset still pushes one', task.logs.filter(l => l && l.origin).length, 1);
}

console.log('Fixture 6: multi-subtask independence');
{
  const task = { subtasks: [{ text: 'a' }, { text: 'b' }, { text: 'c' }], logs: [] };
  applySubtaskToggle(task, 0, NOW);
  applySubtaskToggle(task, 2, NOW);
  check('two auto-notes', task.logs.filter(l => l && l.origin).length, 2);
  check('subtask 1 not affected', task.subtasks[1].completed, undefined);
  const origins = task.logs.map(l => l.origin).sort();
  check('distinct origins', origins, [AUTO_SUBTASK_ORIGIN_PREFIX + '0', AUTO_SUBTASK_ORIGIN_PREFIX + '2']);
}

console.log('Fixture 7: mapLegacyToEntries picks up auto-note after toggle');
{
  const task = { subtasks: [{ text: 'after-toggle' }], logs: [] };
  applySubtaskToggle(task, 0, NOW);
  const entries = mapLegacyToEntries(task);
  const completedSub = entries.find(e => e.type === 'subtask' && e.completed);
  const autoNote = entries.find(e => e.type === 'note' && e.origin);
  check('completed subtask entry exists', !!completedSub, true);
  check('auto-note entry exists', !!autoNote, true);
  check('auto-note origin links subtask', autoNote.origin, AUTO_SUBTASK_ORIGIN_PREFIX + '0');
}

console.log('Fixture 8: invalid input returns false (no mutation)');
{
  const r1 = applySubtaskToggle(null, 0, NOW);
  const r2 = applySubtaskToggle({ subtasks: [] }, 5, NOW);
  const r3 = applySubtaskToggle({}, 0, NOW);
  check('null task returns false', r1, false);
  check('out-of-range index returns false', r2, false);
  check('missing subtasks returns false', r3, false);
}

console.log('Fixture 9: buildAutoNoteLog standalone shape');
{
  const log = buildAutoNoteLog('test', NOW, 7);
  check('log.date', log.date, NOW);
  check('log.content', log.content, '05-28 ✓ test');
  check('log.origin', log.origin, AUTO_SUBTASK_ORIGIN_PREFIX + '7');
  check('log.checked', log.checked, false);
}

if (failures > 0) {
  console.error('\nFAILED:', failures, 'assertion(s) failed');
  process.exit(1);
}
console.log('\nPASS: P4 atomic write logic (9 fixtures)');
