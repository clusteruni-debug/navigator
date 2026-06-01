'use strict';

// P2 split-area filter logic test (PLAN-NAVIGATOR-SUBTASK-LOG-MERGE)
// Validates that mapLegacyToEntries output, when filtered by the P2 split rules,
// yields the expected pending / recorded buckets across 4 fixtures.
//
// DOM rendering is covered by browser smoke (navigator-v5.html in localhost).
// This file isolates the deterministic filter contract.

const path = require('path');
const assert = require('assert');
const { mapLegacyToEntries } = require(path.join(__dirname, '..', 'js', 'entries-model.js'));

function applyP2Filters(task) {
  const entries = mapLegacyToEntries(task);
  const pending = entries.filter(e => e.type === 'subtask' && !e.completed);
  const recorded = entries.filter(e => e.type === 'note' || (e.type === 'subtask' && e.completed));
  return { entries, pending, recorded };
}

let failures = 0;
function check(label, actual, expected) {
  try {
    assert.strictEqual(actual, expected);
    console.log('  PASS', label);
  } catch (e) {
    failures++;
    console.error('  FAIL', label, '— got', actual, 'expected', expected);
  }
}

console.log('Fixture A: 2 pending subtasks + 0 logs');
{
  const r = applyP2Filters({ subtasks: [{ text: 'a' }, { text: 'b' }], logs: [] });
  check('A pending=2', r.pending.length, 2);
  check('A recorded=0', r.recorded.length, 0);
  check('A pending[0].text', r.pending[0].text, 'a');
}

console.log('Fixture B: 0 subtasks + 2 logs');
{
  const r = applyP2Filters({
    subtasks: [],
    logs: [
      { date: '2026-05-28', content: 'noteA' },
      { date: '2026-05-27', content: 'noteB' }
    ]
  });
  check('B pending=0', r.pending.length, 0);
  check('B recorded=2', r.recorded.length, 2);
  check('B recorded[0].type', r.recorded[0].type, 'note');
}

console.log('Fixture C: 1 pending + 1 completed subtask + 1 note');
{
  const r = applyP2Filters({
    subtasks: [{ text: 'pending-todo' }, { text: 'done-todo', completed: true }],
    logs: [{ date: '2026-05-28', content: 'log entry' }]
  });
  check('C pending=1', r.pending.length, 1);
  check('C pending[0].text', r.pending[0].text, 'pending-todo');
  check('C recorded=2 (1 completed sub + 1 note)', r.recorded.length, 2);
  const hasCompletedSub = r.recorded.some(e => e.type === 'subtask' && e.completed);
  const hasNote = r.recorded.some(e => e.type === 'note');
  check('C recorded contains completed subtask', hasCompletedSub, true);
  check('C recorded contains note', hasNote, true);
}

console.log('Fixture D: empty subtasks + empty logs');
{
  const r = applyP2Filters({ subtasks: [], logs: [] });
  check('D pending=0', r.pending.length, 0);
  check('D recorded=0', r.recorded.length, 0);
  check('D entries=0', r.entries.length, 0);
}

console.log('Fixture E: id parsing for sub-<n> / log-<n>');
{
  const r = applyP2Filters({
    subtasks: [{ text: 'first' }, { text: 'second', completed: true }],
    logs: [{ date: '2026-05-28', content: 'note0' }]
  });
  const pendingIdMatch = String(r.pending[0].id).match(/^sub-(\d+)$/);
  const recordedSubIdMatch = String(r.recorded.find(e => e.type === 'subtask').id).match(/^sub-(\d+)$/);
  const recordedNoteIdMatch = String(r.recorded.find(e => e.type === 'note').id).match(/^log-(\d+)$/);
  check('E pending id format sub-<n>', !!pendingIdMatch, true);
  check('E completed subtask id format sub-<n>', !!recordedSubIdMatch, true);
  check('E note id format log-<n>', !!recordedNoteIdMatch, true);
}

if (failures > 0) {
  console.error('\nFAILED:', failures, 'assertion(s) failed');
  process.exit(1);
}
console.log('\nPASS: P2 split-area filter logic (5 fixtures)');
