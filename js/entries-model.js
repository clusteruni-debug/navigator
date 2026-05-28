// Unified work task entries model for Navigator.
// Pure helpers only: no app state, storage, or Firestore access in this file.

(function(root) {
  'use strict';

  const ENTRY_TYPES = Object.freeze({
    SUBTASK: 'subtask',
    NOTE: 'note'
  });

  const AUTO_SUBTASK_ORIGIN_PREFIX = 'auto-from-subtask:';

  /**
   * Entry shape:
   * { id, type: 'subtask'|'note', text, completed?, completedAt?, date?, checked?, origin?, isRequired? }
   *
   * Subtask entries use: text, completed, completedAt, isRequired.
   * Note entries use: text, date, checked, origin.
   */

  function mapLegacyToEntries(task) {
    if (task && Array.isArray(task.entries) && task.entries.length > 0) {
      return task.entries;
    }

    if (!task) return [];

    const subtaskEntries = Array.isArray(task.subtasks)
      ? task.subtasks
        .map((subtask, index) => ({
          entry: normalizeSubtaskEntry(subtask, index),
          index,
          requiredRank: isRequiredSubtask(subtask) ? 1 : 0
        }))
        .sort((a, b) => {
          if (a.requiredRank !== b.requiredRank) return b.requiredRank - a.requiredRank;
          return a.index - b.index;
        })
        .map(item => item.entry)
      : [];

    const noteEntries = Array.isArray(task.logs)
      ? task.logs
        .map((log, index) => ({
          entry: normalizeLogEntry(log, index),
          index
        }))
        .sort(compareLogItemsDesc)
        .map(item => item.entry)
      : [];

    return subtaskEntries.concat(noteEntries);
  }

  function normalizeSubtaskEntry(subtask, index) {
    const source = normalizeLegacyObject(subtask, 'text');
    const entry = {
      id: 'sub-' + index,
      type: ENTRY_TYPES.SUBTASK,
      text: source.text || '',
      completed: !!source.completed,
      isRequired: isRequiredSubtask(source)
    };

    if (source.completedAt) {
      entry.completedAt = source.completedAt;
    }

    return entry;
  }

  function normalizeLogEntry(log, index) {
    const source = normalizeLegacyObject(log, 'content');
    const entry = {
      id: 'log-' + index,
      type: ENTRY_TYPES.NOTE,
      text: source.content || '',
      date: source.date || '',
      checked: !!source.checked
    };

    if (source.origin) {
      entry.origin = source.origin;
    }

    return entry;
  }

  function normalizeLegacyObject(value, textKey) {
    if (typeof value === 'string') {
      const objectValue = {};
      objectValue[textKey] = value;
      return objectValue;
    }
    return value && typeof value === 'object' ? value : {};
  }

  function isRequiredSubtask(subtask) {
    return !(subtask && typeof subtask === 'object' && subtask.isRequired === false);
  }

  function compareLogItemsDesc(a, b) {
    const aDate = a.entry.date || '';
    const bDate = b.entry.date || '';
    const aTime = parseDateTime(aDate);
    const bTime = parseDateTime(bDate);

    if (aTime !== null && bTime !== null && aTime !== bTime) {
      return bTime - aTime;
    }

    if (aDate !== bDate) {
      return String(bDate).localeCompare(String(aDate));
    }

    return a.index - b.index;
  }

  function parseDateTime(value) {
    if (!value) return null;
    const time = Date.parse(value);
    return Number.isNaN(time) ? null : time;
  }

  function createAutoSubtaskNoteEntry(subtaskEntry, dateValue, id) {
    const subtaskId = subtaskEntry && subtaskEntry.id ? String(subtaskEntry.id) : '';
    const text = subtaskEntry && subtaskEntry.text ? String(subtaskEntry.text) : '';
    const entry = {
      id: id || ('note-auto-' + subtaskId),
      type: ENTRY_TYPES.NOTE,
      text: formatAutoSubtaskNoteText(text, dateValue),
      checked: false,
      origin: AUTO_SUBTASK_ORIGIN_PREFIX + subtaskId
    };

    if (dateValue) {
      entry.date = String(dateValue);
    }

    return entry;
  }

  function formatAutoSubtaskNoteText(subtaskText, dateValue) {
    return formatMonthDay(dateValue) + ' ✓ ' + String(subtaskText || '');
  }

  function formatMonthDay(dateValue) {
    const text = String(dateValue || '');
    const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return isoMatch[2] + '-' + isoMatch[3];

    const monthDayMatch = text.match(/^(\d{2})-(\d{2})/);
    if (monthDayMatch) return monthDayMatch[1] + '-' + monthDayMatch[2];

    const parsed = Date.parse(text);
    if (!Number.isNaN(parsed)) {
      const date = new Date(parsed);
      return pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
    }

    return 'MM-DD';
  }

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  const api = {
    ENTRY_TYPES,
    AUTO_SUBTASK_ORIGIN_PREFIX,
    mapLegacyToEntries,
    createAutoSubtaskNoteEntry,
    formatAutoSubtaskNoteText
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  if (root) {
    Object.assign(root, api);
  }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null));
