// Node-based logic test for reflection.js
// Run: node projects/navigator/test/reflection-logic.test.cjs
// Coverage: pure-logic 함수 (UI / Firebase 제외)
//   - saveReflectionAnswer + updateReflectionStreak
//   - shouldShowReflectionModal (Phase 6/8.5 skipped block fix)
//   - mergeDailyReflection (HIGH cloud merge)
//   - compactOldReflectionLog (Phase 10)
//   - extractReflectionPatterns / exportQuarterlyMarkdown (Phase 8)

const fs = require('fs');
const path = require('path');

// ── Mock dependencies ──
function getLocalDateStr(d) {
  const dt = d || new Date();
  return dt.getFullYear() + '-' +
    String(dt.getMonth() + 1).padStart(2, '0') + '-' +
    String(dt.getDate()).padStart(2, '0');
}

global.getLocalDateStr = getLocalDateStr;
global.saveState = () => {};   // no-op
global.showToast = () => {};   // no-op

// Mock appState — state-types.js init shape
global.appState = {
  dailyReflection: {
    history: {},
    settings: {
      eveningTime: '22:00',
      morningTime: null,
      questions: {
        evening: ['오늘 30분 룰 깬 충동 있었나?', '오늘 과잉 약속?', '내일 작은 약속?'],
        morning: ['분기 목표 진전?', '신체 베이스라인?', '어제 후회한 충동?']
      },
      pushEnabled: false,
      autoModalEnabled: true
    },
    streak: { current: 0, best: 0, lastAnsweredDate: null }
  }
};

// Load reflection.js into Node global scope
const reflectionPath = path.join(__dirname, '..', 'js', 'reflection.js');
const src = fs.readFileSync(reflectionPath, 'utf-8');
// reflection.js declares global functions — eval in module scope, then promote
// Wrap eval so function declarations attach to global.
// FRAGILITY: top-level helpers in reflection.js MUST stay as `function`
// declarations. `const`/`let` are block-scoped and would NOT attach to
// global → ReferenceError at test call site. If refactor introduces
// const helpers, swap to `require('vm').runInThisContext(src)`.
// Also: this file MUST run standalone via `node test/reflection-logic.test.cjs`
// — never `require()` from Jest/Mocha (global pollution).
(0, eval)(src);

// ── Test framework ──
let pass = 0, fail = 0;
const failures = [];
function assert(cond, label) {
  if (cond) { pass++; console.log('  ✓', label); }
  else { fail++; failures.push(label); console.error('  ✗', label); }
}
function reset() {
  appState.dailyReflection.history = {};
  appState.dailyReflection.streak = { current: 0, best: 0, lastAnsweredDate: null };
}

// ── Date mock for time-window tests ──
const realDate = global.Date;
function mockNow(iso) {
  const fakeNow = new realDate(iso);
  global.Date = class extends realDate {
    constructor(...args) {
      if (args.length === 0) return new realDate(fakeNow);
      return new realDate(...args);
    }
    static now() { return fakeNow.getTime(); }
    static parse(s) { return realDate.parse(s); }
    static UTC(...a) { return realDate.UTC(...a); }
  };
}
function unmockDate() { global.Date = realDate; }

// ──────────────────────────────────────────
// TEST 1: getReflectionToday — empty initial
// ──────────────────────────────────────────
console.log('\n[1] getReflectionToday — empty');
reset();
let today = getReflectionToday();
assert(today.evening === null && today.morning === null, 'returns {evening:null, morning:null}');

// ──────────────────────────────────────────
// TEST 2: saveReflectionAnswer + streak math
// ──────────────────────────────────────────
console.log('\n[2] saveReflectionAnswer + updateReflectionStreak');
reset();
saveReflectionAnswer('evening', { q1: 'a', q2: 'b', q3: 'c', skipped: false });
const k = getLocalDateStr();
assert(appState.dailyReflection.history[k]?.evening?.q1 === 'a', 'evening answer q1=a saved');
assert(appState.dailyReflection.streak.current === 1, 'streak.current = 1 after first answer');
assert(appState.dailyReflection.streak.best === 1, 'streak.best = 1');
assert(appState.dailyReflection.streak.lastAnsweredDate === k, 'lastAnsweredDate set');

// ──────────────────────────────────────────
// TEST 3: skipped does NOT increment streak
// ──────────────────────────────────────────
console.log('\n[3] skipped does NOT increment streak (Phase 8.5)');
reset();
saveReflectionAnswer('evening', { q1: '', q2: '', q3: '', skipped: true });
assert(appState.dailyReflection.streak.current === 0, 'streak.current = 0 after skip');

// ──────────────────────────────────────────
// TEST 4: shouldShowReflectionModal — time window
// ──────────────────────────────────────────
console.log('\n[4] shouldShowReflectionModal — ±30min window');
reset();
mockNow('2026-05-09T20:00:00');
assert(shouldShowReflectionModal('evening') === false, 'false at 20:00 (before window)');
mockNow('2026-05-09T22:10:00');
assert(shouldShowReflectionModal('evening') === true, 'true at 22:10 (within window)');
mockNow('2026-05-09T22:35:00');
assert(shouldShowReflectionModal('evening') === false, 'false at 22:35 (after 30min window)');
unmockDate();

// ──────────────────────────────────────────
// TEST 5: shouldShow blocks after skip (round 1 fix)
// ──────────────────────────────────────────
console.log('\n[5] shouldShowReflectionModal blocks after skipped (review round 1)');
reset();
mockNow('2026-05-09T22:10:00');
saveReflectionAnswer('evening', { q1: '', q2: '', q3: '', skipped: true });
assert(shouldShowReflectionModal('evening') === false,
  'false after skipped=true (no re-show, Phase 6/8.5 fix)');
unmockDate();

// ──────────────────────────────────────────
// TEST 6: shouldShow blocks after answer
// ──────────────────────────────────────────
console.log('\n[6] shouldShowReflectionModal blocks after real answer');
reset();
mockNow('2026-05-09T22:10:00');
saveReflectionAnswer('evening', { q1: 'a', q2: 'b', q3: 'c' });
assert(shouldShowReflectionModal('evening') === false, 'false after real answer');
unmockDate();

// ──────────────────────────────────────────
// TEST 7: mergeDailyReflection — local empty + cloud full
// ──────────────────────────────────────────
console.log('\n[7] mergeDailyReflection — local empty + cloud full');
unmockDate();
const local = {
  history: {},
  settings: { eveningTime: '22:00' },
  streak: { current: 0, best: 0, lastAnsweredDate: null }
};
const cloud = {
  history: {
    '2026-05-09': {
      evening: { q1: 'cloud-a', q2: 'b', q3: 'c', answeredAt: '2026-05-09T22:00:00Z', skipped: false },
      morning: null
    }
  },
  settings: { eveningTime: '21:30' },
  streak: { current: 1, best: 5, lastAnsweredDate: '2026-05-09' }
};
const merged = mergeDailyReflection(local, cloud);
assert(merged.history['2026-05-09'].evening.q1 === 'cloud-a', 'cloud history flowed in');
assert(merged.streak.best === 5, 'streak.best = max(local 0, cloud 5) = 5');
assert(merged.streak.lastAnsweredDate === '2026-05-09', 'lastAnsweredDate = cloud (newer)');
assert(merged.settings.eveningTime === '21:30', 'settings cloud-wins (other-wins shallow)');

// ──────────────────────────────────────────
// TEST 8: mergeDailyReflection — same date last-write-wins (HIGH fix)
// ──────────────────────────────────────────
console.log('\n[8] mergeDailyReflection — same-date answeredAt LWW (HIGH fix)');
const localOlder = {
  history: {
    '2026-05-09': {
      evening: { q1: 'local-old', answeredAt: '2026-05-09T22:00:00Z' },
      morning: null
    }
  },
  settings: {}, streak: {}
};
const cloudNewer = {
  history: {
    '2026-05-09': {
      evening: { q1: 'cloud-new', answeredAt: '2026-05-09T22:30:00Z' },
      morning: null
    }
  },
  settings: {}, streak: {}
};
const merge2 = mergeDailyReflection(localOlder, cloudNewer);
assert(merge2.history['2026-05-09'].evening.q1 === 'cloud-new',
  'newer answeredAt wins (cloud 22:30 > local 22:00)');

// reverse — local newer
const merge3 = mergeDailyReflection(cloudNewer, localOlder);
assert(merge3.history['2026-05-09'].evening.q1 === 'cloud-new',
  'symmetric — older other does NOT overwrite newer local');

// ──────────────────────────────────────────
// TEST 9: mergeDailyReflection — evening + morning slot independence
// ──────────────────────────────────────────
console.log('\n[9] mergeDailyReflection — slot-independent merge (MED Phase 2.5 fix)');
const localEveningOnly = {
  history: { '2026-05-09': { evening: { q1: 'local-ev', answeredAt: 'a' }, morning: null } },
  settings: {}, streak: {}
};
const cloudMorningOnly = {
  history: { '2026-05-09': { evening: null, morning: { q1: 'cloud-mo', answeredAt: 'b' } } },
  settings: {}, streak: {}
};
const merge4 = mergeDailyReflection(localEveningOnly, cloudMorningOnly);
assert(merge4.history['2026-05-09'].evening?.q1 === 'local-ev', 'evening slot preserved (local)');
assert(merge4.history['2026-05-09'].morning?.q1 === 'cloud-mo', 'morning slot added (cloud)');

// ──────────────────────────────────────────
// TEST 10: compactOldReflectionLog — 1년 cutoff
// ──────────────────────────────────────────
console.log('\n[10] compactOldReflectionLog — 1년+ entries 압축');
reset();
appState.dailyReflection.history = {
  '2024-01-01': {
    evening: { q1: 'old-a', q2: 'b', q3: 'c', answeredAt: '2024-01-01T22:00:00Z', skipped: false },
    morning: null
  },
  '2024-01-02': {
    evening: null, morning: null    // no answer day
  },
  [getLocalDateStr()]: {
    evening: { q1: 'today', q2: 'b', q3: 'c', answeredAt: new realDate().toISOString(), skipped: false },
    morning: null
  }
};
compactOldReflectionLog();
assert(appState.dailyReflection.history['2024-01-01']?.compact === true,
  '2024-01-01 compacted (compact:true)');
assert(appState.dailyReflection.history['2024-01-01']?.eveningAnswered === true,
  'compact preserves eveningAnswered flag');
assert(!appState.dailyReflection.history['2024-01-01']?.evening?.q1,
  'compact drops full text');
assert(appState.dailyReflection.history['2024-01-02'] === undefined,
  'no-answer day deleted');
assert(appState.dailyReflection.history[getLocalDateStr()]?.compact !== true,
  'recent day not compacted');

// ──────────────────────────────────────────
// TEST 11: exportQuarterlyMarkdown — format check
// ──────────────────────────────────────────
console.log('\n[11] exportQuarterlyMarkdown — format');
reset();
unmockDate();
saveReflectionAnswer('evening', { q1: '오늘 매수충동 5분 멈춤', q2: '없음', q3: '운동 30분' });
const md = exportQuarterlyMarkdown(7);
assert(md.startsWith('# 분기 회고'), 'starts with title');
assert(md.includes('## 자문 답변 통계'), 'has 통계 section');
assert(md.includes('## 패턴 (저녁 자문 빈도 키워드 TOP 5)'), 'has pattern section');
assert(md.includes('Obsidian'), 'mentions Obsidian (paste destination)');

// ──────────────────────────────────────────
// TEST 12: extractReflectionPatterns — keyword frequency
// ──────────────────────────────────────────
console.log('\n[12] extractReflectionPatterns — frequency keywords');
reset();
saveReflectionAnswer('evening', { q1: '매수충동 매수충동', q2: '운동', q3: '운동' });
const p = extractReflectionPatterns(7);
const evWords = p.eveningKeywords.map(k => k.word);
assert(p.answeredCount === 1, 'answeredCount = 1');
assert(evWords.includes('매수충동') || evWords.includes('운동'), 'top keyword extracted');

// ──────────────────────────────────────────
// TEST 13: 2-day consecutive streak math (year-boundary safe via setDate)
// ──────────────────────────────────────────
console.log('\n[13] 2-day consecutive streak math');
reset();
{
  const todayDt = new realDate();
  const yesterdayDt = new realDate();
  yesterdayDt.setDate(todayDt.getDate() - 1);
  const yKey = getLocalDateStr(yesterdayDt);
  const tKey = getLocalDateStr(todayDt);
  appState.dailyReflection.history[yKey] = {
    evening: { q1: 'y', q2: 'y', q3: 'y', answeredAt: yesterdayDt.toISOString(), skipped: false },
    morning: null
  };
  saveReflectionAnswer('evening', { q1: 't', q2: 't', q3: 't', skipped: false });
  assert(appState.dailyReflection.streak.current === 2, '2일 연속 streak.current = 2');
  assert(appState.dailyReflection.streak.lastAnsweredDate === tKey, 'lastAnsweredDate = today');
}

// ──────────────────────────────────────────
// TEST 14: getReflectionHistory — drops gap days, reverse chronological
// ──────────────────────────────────────────
console.log('\n[14] getReflectionHistory — gap handling');
reset();
{
  const dt = new realDate();
  const d2 = new realDate(); d2.setDate(dt.getDate() - 2);
  const d4 = new realDate(); d4.setDate(dt.getDate() - 4);
  appState.dailyReflection.history[getLocalDateStr(dt)] = {
    evening: { q1: 'today', answeredAt: 'a', skipped: false }, morning: null
  };
  appState.dailyReflection.history[getLocalDateStr(d2)] = {
    evening: { q1: 'd2', answeredAt: 'b', skipped: false }, morning: null
  };
  appState.dailyReflection.history[getLocalDateStr(d4)] = {
    evening: { q1: 'd4', answeredAt: 'c', skipped: false }, morning: null
  };
  const hist = getReflectionHistory(7);
  assert(hist.length === 3, 'returns only days with entries (3 of 7 scanned)');
  assert(hist[0].day.evening.q1 === 'today', 'first = today (reverse chronological)');
  assert(hist[1].day.evening.q1 === 'd2', 'second = day-2');
  assert(hist[2].day.evening.q1 === 'd4', 'third = day-4 (skipped d1, d3)');
}

// ──────────────────────────────────────────
// TEST 15: extractReflectionKeywords — token regex edges
// ──────────────────────────────────────────
console.log('\n[15] extractReflectionKeywords — token regex edges');
{
  const kw = extractReflectionKeywords([null, '', '운동 운동', 'ab', 'abc']);
  const words = kw.map(k => k.word);
  assert(!words.includes('ab'), 'single-char Latin (length<3) excluded');
  assert(words.includes('abc'), '3-char Latin included');
  const yWord = kw.find(k => k.word === '운동');
  assert(yWord && yWord.count === 2, '운동 count = 2');
  assert(kw.length <= 10, 'TOP-10 cap');
}

// ──────────────────────────────────────────
// SUMMARY
// ──────────────────────────────────────────
console.log(`\n${'─'.repeat(48)}`);
console.log(`RESULT: ${pass} passed, ${fail} failed`);
if (fail > 0) {
  console.log('\nFailed:');
  failures.forEach(f => console.log('  -', f));
  process.exit(1);
}
console.log('All logic tests pass.');
process.exit(0);
