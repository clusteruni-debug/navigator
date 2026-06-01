const assert = require('assert');

const {
  AUTO_SUBTASK_ORIGIN_PREFIX,
  createAutoSubtaskNoteEntry,
  mapLegacyToEntries
} = require('../js/entries-model.js');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function testLegacyOnlyFixture() {
  const task = {
    subtasks: [
      { text: 'Optional polish', completed: false, isRequired: false },
      { text: 'Required done', completed: true, completedAt: '2026-05-28T10:00:00+09:00', isRequired: true },
      { text: 'Implicit required', completed: false }
    ],
    logs: [
      { date: '2026-05-27', content: 'Older note', checked: false },
      { date: '2026-05-28', content: 'Newer note', checked: true }
    ]
  };
  const before = clone(task);

  const entries = mapLegacyToEntries(task);

  assert.deepStrictEqual(task, before, 'legacy mapping must not mutate input');
  assert.deepStrictEqual(
    entries.map(entry => entry.id),
    ['sub-1', 'sub-2', 'sub-0', 'log-1', 'log-0'],
    'required subtasks sort first, logs sort by date descending'
  );
  assert.deepStrictEqual(entries[0], {
    id: 'sub-1',
    type: 'subtask',
    text: 'Required done',
    completed: true,
    isRequired: true,
    completedAt: '2026-05-28T10:00:00+09:00'
  });
  assert.deepStrictEqual(entries[3], {
    id: 'log-1',
    type: 'note',
    text: 'Newer note',
    date: '2026-05-28',
    checked: true
  });
}

function testMixedFixturePrefersEntries() {
  const existingEntries = [
    { id: 'entry-a', type: 'note', text: 'Already migrated', date: '2026-05-28', checked: false }
  ];
  const task = {
    entries: existingEntries,
    subtasks: [{ text: 'Legacy subtask', completed: false }],
    logs: [{ date: '2026-05-27', content: 'Legacy note' }]
  };

  assert.strictEqual(mapLegacyToEntries(task), existingEntries, 'non-empty entries[] returns verbatim');
}

function testNewOnlyFixture() {
  const existingEntries = [
    { id: 'sub-a', type: 'subtask', text: 'New subtask', completed: false, isRequired: true },
    { id: 'note-a', type: 'note', text: 'New note', date: '2026-05-28', checked: true }
  ];

  assert.strictEqual(
    mapLegacyToEntries({ entries: existingEntries }),
    existingEntries,
    'new-only task keeps existing entries[] reference'
  );
}

function testIdempotency() {
  const legacyTask = {
    subtasks: [{ text: 'Collect references', completed: true, isRequired: true }],
    logs: [{ date: '2026-05-28', content: 'References collected', checked: false }]
  };

  const once = mapLegacyToEntries(legacyTask);
  const twice = mapLegacyToEntries({ entries: once });

  assert.strictEqual(twice, once, 'mapped entries remain stable when read as entries[]');
  assert.deepStrictEqual(mapLegacyToEntries(legacyTask), once, 'legacy mapping is deterministic');
}

function testAutoSubtaskNoteShape() {
  const note = createAutoSubtaskNoteEntry(
    { id: 'sub-2', text: 'Collect references' },
    '2026-05-28T14:30:00+09:00',
    'note-auto-sub-2'
  );

  assert.deepStrictEqual(note, {
    id: 'note-auto-sub-2',
    type: 'note',
    text: '05-28 ✓ Collect references',
    checked: false,
    origin: AUTO_SUBTASK_ORIGIN_PREFIX + 'sub-2',
    date: '2026-05-28T14:30:00+09:00'
  });
}

function testEmptyTaskEdge() {
  assert.deepStrictEqual(mapLegacyToEntries({}), [], 'empty task maps to empty entries');
  assert.deepStrictEqual(mapLegacyToEntries(null), [], 'null task maps to empty entries');
}

testLegacyOnlyFixture();
testMixedFixturePrefersEntries();
testNewOnlyFixture();
testIdempotency();
testAutoSubtaskNoteShape();
testEmptyTaskEdge();

console.log('entries-model tests passed');
