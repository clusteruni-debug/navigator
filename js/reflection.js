// ============================================
// 매일 자문 — Core Logic
// (Phase 3 + 8 + 8.5 + 10 — core / quarterly / streak / compaction)
// ============================================

/**
 * 오늘의 ReflectionDay 반환 (없으면 빈 객체)
 * @returns {ReflectionDay}
 */
function getReflectionToday() {
  const todayKey = getLocalDateStr();
  return appState.dailyReflection.history[todayKey] || { evening: null, morning: null };
}

/**
 * 자문 답 저장 + streak 업데이트
 * @param {'evening'|'morning'} timeOfDay
 * @param {{q1:string, q2:string, q3:string, skipped?:boolean}} answers
 */
function saveReflectionAnswer(timeOfDay, answers) {
  const todayKey = getLocalDateStr();
  const history = appState.dailyReflection.history;
  if (!history[todayKey]) {
    history[todayKey] = { evening: null, morning: null };
  }
  history[todayKey][timeOfDay] = {
    q1: answers.q1 || '',
    q2: answers.q2 || '',
    q3: answers.q3 || '',
    answeredAt: new Date().toISOString(),
    skipped: !!answers.skipped
  };
  updateReflectionStreak();
  if (typeof saveState === 'function') saveState();
}

/**
 * Phase 8.5 — Streak 재계산 (skip = reset, daily missing = reset)
 * 저녁 자문 답한 날만 streak 카운트 (아침은 optional이라 streak 영향 없음)
 */
function updateReflectionStreak() {
  const history = appState.dailyReflection.history;
  const todayKey = getLocalDateStr();
  const todayDay = history[todayKey];

  // 오늘 답한 적 없거나 skipped → current 0
  if (!todayDay || !todayDay.evening || todayDay.evening.skipped) {
    appState.dailyReflection.streak.current = 0;
    return;
  }

  // 오늘 답함 → 어제부터 거꾸로 누적
  let current = 1;
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 1);
  while (current <= 3650) { // 안전 제한 (10년)
    const key = getLocalDateStr(cursor);
    const day = history[key];
    if (!day) break;
    // compact 형태도 저녁 답했으면 카운트
    const eveningAnswered = day.compact
      ? !!day.eveningAnswered
      : !!(day.evening && !day.evening.skipped);
    if (!eveningAnswered) break;
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const prevBest = appState.dailyReflection.streak.best || 0;
  appState.dailyReflection.streak.current = current;
  appState.dailyReflection.streak.lastAnsweredDate = todayKey;

  if (current > prevBest) {
    appState.dailyReflection.streak.best = current;
    if (typeof showToast === 'function') {
      showToast(`🌙 최고 streak 갱신: ${current}일!`, 'success');
    }
  }
}

/**
 * 최근 N일 history 반환 (chronological 역순 — 최근 → 과거)
 * @param {number} days
 * @returns {Array<{date:string, day:ReflectionDay}>}
 */
function getReflectionHistory(days = 30) {
  const result = [];
  const now = new Date();
  for (let i = 0; i < days; i++) {
    const cursor = new Date(now);
    cursor.setDate(cursor.getDate() - i);
    const key = getLocalDateStr(cursor);
    const day = appState.dailyReflection.history[key];
    if (day) {
      result.push({ date: key, day });
    }
  }
  return result;
}

/**
 * 자문 modal 노출 여부 — settings 시각 ±30분 window + 미답 조건
 * @param {'evening'|'morning'} timeOfDay
 * @returns {boolean}
 */
function shouldShowReflectionModal(timeOfDay = 'evening') {
  const settings = appState.dailyReflection.settings;
  if (!settings.autoModalEnabled) return false;
  if (timeOfDay === 'morning' && !settings.morningTime) return false;

  const targetTime = timeOfDay === 'evening' ? settings.eveningTime : settings.morningTime;
  if (!targetTime) return false;

  const [hh, mm] = targetTime.split(':').map(Number);
  const now = new Date();
  const target = new Date(now);
  target.setHours(hh, mm, 0, 0);

  // ±30분 window — target 시각 도달 후 30분 안에만 노출
  const elapsed = now - target;
  if (elapsed < 0 || elapsed > 30 * 60 * 1000) return false;

  // 오늘 해당 슬롯에 entry 있으면 (답했든 건너뛰기든) 그 날은 처리 완료 — 재노출 차단
  // (review fix Phase 6/8.5: skipped=true 상태에서 5min interval/visibilitychange 재출현 방지)
  const today = getReflectionToday();
  if (today[timeOfDay]) return false;

  return true;
}

/**
 * Phase 10 — 1년 이상 history 압축 (compactOldCompletionLog 패턴 follow)
 * 1년 넘은 entry: full text → {compact, eveningAnswered, morningAnswered, answeredAt}
 * 답 없는 날은 entry 자체 삭제
 */
function compactOldReflectionLog() {
  const history = appState.dailyReflection.history;
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const cutoffKey = getLocalDateStr(oneYearAgo);

  let compactedCount = 0;
  for (const [date, day] of Object.entries(history)) {
    if (date >= cutoffKey) continue;
    if (day.compact) continue; // already compact

    const eveningAnswered = !!(day.evening && !day.evening.skipped);
    const morningAnswered = !!(day.morning && !day.morning.skipped);

    if (!eveningAnswered && !morningAnswered) {
      delete history[date];
    } else {
      history[date] = {
        compact: true,
        eveningAnswered,
        morningAnswered,
        answeredAt: day.evening?.answeredAt || day.morning?.answeredAt || ''
      };
    }
    compactedCount++;
  }

  if (compactedCount > 0) {
    console.log(`[reflection] compactOldReflectionLog: ${compactedCount} entries compacted/deleted`);
  }
}

/**
 * Phase 8 — 분기 회고 패턴 추출 (frequency only, NLP X)
 * @param {number} days — default 90
 */
function extractReflectionPatterns(days = 90) {
  const history = appState.dailyReflection.history;
  const now = new Date();
  let answeredCount = 0;
  let skippedCount = 0;
  let totalDays = 0;
  const eveningTexts = [];
  const morningTexts = [];

  for (let i = 0; i < days; i++) {
    const cursor = new Date(now);
    cursor.setDate(cursor.getDate() - i);
    const key = getLocalDateStr(cursor);
    totalDays++;
    const day = history[key];
    if (!day) continue;

    if (day.compact) {
      if (day.eveningAnswered) answeredCount++;
      continue;
    }
    if (day.evening) {
      if (day.evening.skipped) {
        skippedCount++;
      } else {
        answeredCount++;
        eveningTexts.push(day.evening.q1, day.evening.q2, day.evening.q3);
      }
    }
    if (day.morning && !day.morning.skipped) {
      morningTexts.push(day.morning.q1, day.morning.q2, day.morning.q3);
    }
  }

  return {
    answeredCount,
    skippedCount,
    totalDays,
    streakBest: appState.dailyReflection.streak.best || 0,
    streakCurrent: appState.dailyReflection.streak.current || 0,
    eveningKeywords: extractReflectionKeywords(eveningTexts),
    morningKeywords: extractReflectionKeywords(morningTexts)
  };
}

/**
 * 텍스트 배열에서 빈도 키워드 추출 (한국어 2자+ / 영어 3자+)
 */
function extractReflectionKeywords(texts) {
  const wordCount = {};
  texts.forEach(t => {
    if (!t) return;
    const tokens = t.match(/[가-힣]{2,}|[a-zA-Z]{3,}/g) || [];
    tokens.forEach(token => {
      wordCount[token] = (wordCount[token] || 0) + 1;
    });
  });
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word, count]) => ({ word, count }));
}

/**
 * Phase 8 — 분기 회고 markdown 생성 (clipboard 복사용)
 * @param {number} days — default 90
 */
function exportQuarterlyMarkdown(days = 90) {
  const patterns = extractReflectionPatterns(days);
  const now = new Date();
  const startDate = new Date(now);
  startDate.setDate(startDate.getDate() - days);

  const startStr = getLocalDateStr(startDate);
  const endStr = getLocalDateStr(now);
  const quarter = `Q${Math.floor(now.getMonth() / 3) + 1}`;

  const eveningTop = patterns.eveningKeywords.slice(0, 5)
    .map(k => `${k.word} ×${k.count}`).join(', ') || '(없음)';
  const morningTop = patterns.morningKeywords.slice(0, 5)
    .map(k => `${k.word} ×${k.count}`).join(', ') || '(없음)';

  const answerRate = patterns.totalDays > 0
    ? Math.round((patterns.answeredCount / patterns.totalDays) * 100)
    : 0;

  return `# 분기 회고 — ${now.getFullYear()}-${quarter} (${startStr} ~ ${endStr})

## 자문 답변 통계

- 답변 일수: ${patterns.answeredCount}/${patterns.totalDays} (${answerRate}%)
- 저녁 자문 답변: ${patterns.answeredCount}회 / 건너뛰기: ${patterns.skippedCount}회
- streak best: ${patterns.streakBest}일 / current: ${patterns.streakCurrent}일

## 패턴 (저녁 자문 빈도 키워드 TOP 5)

${eveningTop}

## 패턴 (아침 자문 빈도 키워드 TOP 5)

${morningTop}

## 분기 결정 갱신 후보

- (위 키워드 빈도 보고 본인이 작성)
- 잠금화면 문구 / Sounding Board 룰 / life_os 본인 적용 영역 갱신

---

> 이 markdown을 Obsidian \`roadmap.md\` 분기 목표 / \`life_compass.md\` 5년 북극성 결정 갱신 섹션에 paste.
> 데이터는 navigator에 그대로 보존 (압축은 user 머릿속).
`;
}

/**
 * Cloud / imported / backup → local merge
 * Date 별 evening/morning slot 단위 last-write-wins via answeredAt ISO 비교.
 * Compact entry는 별도 처리 (정보 손실 방지: full > compact).
 *
 * Used by:
 * - firebase-sync.js initial load + onSnapshot (cloud → local)
 * - ui-data.js handleFileImport (file → local)
 * - firebase-backup.js restoreFromSyncBackup (snapshot → local)
 *
 * (review fix HIGH Phase 2/5.5 — modal listener 외 sync 경로에 merge 추가)
 *
 * @param {DailyReflection} local
 * @param {DailyReflection} other
 * @returns {DailyReflection}
 */
function mergeDailyReflection(local, other) {
  if (!other) return local;
  if (!local) return other;

  const result = {
    history: { ...local.history },
    settings: { ...(local.settings || {}), ...(other.settings || {}) },
    streak: { ...(local.streak || { current: 0, best: 0, lastAnsweredDate: null }) }
  };

  for (const [date, otherDay] of Object.entries(other.history || {})) {
    const localDay = result.history[date];
    if (!localDay) {
      result.history[date] = otherDay;
      continue;
    }
    // full 우선 — compact는 정보 손실 후 형태이므로 full이 한쪽이라도 있으면 그것을 keep
    if (otherDay.compact && !localDay.compact) {
      // local full 유지
      continue;
    }
    if (localDay.compact && !otherDay.compact) {
      result.history[date] = otherDay;
      continue;
    }
    if (otherDay.compact && localDay.compact) {
      result.history[date] = {
        compact: true,
        eveningAnswered: !!(otherDay.eveningAnswered || localDay.eveningAnswered),
        morningAnswered: !!(otherDay.morningAnswered || localDay.morningAnswered),
        answeredAt: (otherDay.answeredAt || '') > (localDay.answeredAt || '')
          ? otherDay.answeredAt
          : localDay.answeredAt
      };
      continue;
    }

    // 일반 day — evening + morning slot 별 answeredAt 비교 last-write-wins
    const merged = {
      evening: localDay.evening || null,
      morning: localDay.morning || null
    };
    for (const slot of ['evening', 'morning']) {
      const localAns = localDay[slot];
      const otherAns = otherDay[slot];
      if (!localAns && otherAns) {
        merged[slot] = otherAns;
      } else if (localAns && otherAns) {
        const localAt = localAns.answeredAt || '';
        const otherAt = otherAns.answeredAt || '';
        merged[slot] = otherAt > localAt ? otherAns : localAns;
      }
    }
    result.history[date] = merged;
  }

  // streak — best max, lastAnsweredDate 최신 win current 동반
  const localStreak = local.streak || {};
  const otherStreak = other.streak || {};
  result.streak.best = Math.max(localStreak.best || 0, otherStreak.best || 0);
  const localLast = localStreak.lastAnsweredDate || '';
  const otherLast = otherStreak.lastAnsweredDate || '';
  if (otherLast > localLast) {
    result.streak.current = otherStreak.current || 0;
    result.streak.lastAnsweredDate = otherLast;
  }

  return result;
}
