/**
 * 라이프 리듬 Firebase 병합 로직
 * rhythm.js에서 분리 — 히스토리/today 병합 함수
 *
 * 의존성 (메인 HTML에서 제공):
 *   (없음 — 순수 데이터 변환 함수)
 */

// ============================================
// Firebase 동기화용 라이프 리듬 병합
// ============================================

/**
 * 라이프 리듬 히스토리 병합 (날짜별 + 필드별)
 * 같은 날짜의 기록은 필드별로 병합 (값이 있는 쪽 우선)
 */
function mergeRhythmHistory(localHistory, cloudHistory) {
  var local = localHistory || {};
  var cloud = cloudHistory || {};
  var allDates = new Set([...Object.keys(local), ...Object.keys(cloud)]);
  var merged = {};
  var rhythmFields = ['wakeUp', 'homeDepart', 'workArrive', 'workDepart', 'homeArrive', 'sleep'];

  for (var date of allDates) {
    var l = local[date] || {};
    var c = cloud[date] || {};

    // updatedAt 기반 "last writer wins" — 히스토리 편집/삭제도 정상 전파
    var lUp = l.updatedAt || null;
    var cUp = c.updatedAt || null;
    var winner = null;
    if (lUp && cUp) {
      winner = lUp >= cUp ? l : c;
    } else if (lUp && !cUp) {
      winner = l;
    } else if (!lUp && cUp) {
      winner = c;
    }

    if (winner) {
      // 보완 병합: winner의 null 필드는 loser 값으로 채움
      // 단, _deletedFields에 있는 필드는 의도적 삭제 -> 보완하지 않음
      var loser = winner === l ? c : l;
      var winDel = new Set(winner._deletedFields || []);
      merged[date] = {};
      for (var fi = 0; fi < rhythmFields.length; fi++) {
        var f = rhythmFields[fi];
        var wVal = winner[f] !== undefined ? winner[f] : null;
        var lVal = loser[f] !== undefined ? loser[f] : null;
        merged[date][f] = wVal !== null ? wVal : (winDel.has(f) ? null : lVal);
      }
      // 복약 슬롯별 보완 병합 (삭제 추적 반영)
      var wMeds = Object.assign({}, winner.medications || {});
      var loseMeds = Object.assign({}, loser.medications || {});
      if (wMeds.med_afternoon !== undefined) { wMeds.med_afternoon_adhd = wMeds.med_afternoon; delete wMeds.med_afternoon; }
      if (loseMeds.med_afternoon !== undefined) { loseMeds.med_afternoon_adhd = loseMeds.med_afternoon; delete loseMeds.med_afternoon; }
      var allMedSlots = new Set([...Object.keys(wMeds), ...Object.keys(loseMeds)]);
      if (allMedSlots.size > 0) {
        merged[date].medications = {};
        for (var slot of allMedSlots) {
          var wS = wMeds[slot] !== null && wMeds[slot] !== undefined ? wMeds[slot] : null;
          merged[date].medications[slot] = wS !== null ? wS : (winDel.has(slot) ? null : (loseMeds[slot] || null));
        }
      }
      if (winDel.size > 0) merged[date]._deletedFields = [...winDel];
      merged[date].updatedAt = winner.updatedAt;
      continue;
    }

    // 하위호환: 양쪽 다 updatedAt 없으면 기존 || 병합
    merged[date] = {
      wakeUp: l.wakeUp || c.wakeUp || null,
      homeDepart: l.homeDepart || c.homeDepart || null,
      workArrive: l.workArrive || c.workArrive || null,
      workDepart: l.workDepart || c.workDepart || null,
      homeArrive: l.homeArrive || c.homeArrive || null,
      sleep: l.sleep || c.sleep || null
    };
    var lMeds = l.medications || {};
    var cMeds = c.medications || {};
    if (lMeds.med_afternoon !== undefined) { lMeds.med_afternoon_adhd = lMeds.med_afternoon; delete lMeds.med_afternoon; }
    if (cMeds.med_afternoon !== undefined) { cMeds.med_afternoon_adhd = cMeds.med_afternoon; delete cMeds.med_afternoon; }
    var allSlots = new Set([...Object.keys(lMeds), ...Object.keys(cMeds)]);
    if (allSlots.size > 0) {
      merged[date].medications = {};
      for (var s of allSlots) {
        merged[date].medications[s] = lMeds[s] || cMeds[s] || null;
      }
    }
  }

  return merged;
}

/**
 * 라이프 리듬 "today" 병합 (날짜 비교 포함)
 * - 날짜가 다르면 -> 새로운 날짜가 today, 오래된 데이터는 history로 보존
 * - 날짜가 같으면 -> 필드별 병합 (값이 있는 쪽 우선)
 * - history에 이미 같은 날짜 데이터가 있으면 필드별 merge
 * @param {Object} localToday - 로컬 오늘 데이터
 * @param {Object} cloudToday - 클라우드 오늘 데이터
 * @param {Object} mergedHistory - 이미 병합된 히스토리
 * @returns {{ today: Object, history: Object }}
 */
function mergeRhythmToday(localToday, cloudToday, mergedHistory) {
  var lt = localToday || {};
  var ct = cloudToday || {};
  var history = mergedHistory || {};
  var rhythmFields = ['wakeUp', 'homeDepart', 'workArrive', 'workDepart', 'homeArrive', 'sleep'];

  // 날짜가 다른 경우: 새로운 날짜가 today, 오래된 날짜 데이터는 history로 이동
  if (lt.date && ct.date && lt.date !== ct.date) {
    var newer, older, olderDate;
    if (lt.date > ct.date) {
      newer = lt; older = ct; olderDate = ct.date;
    } else {
      newer = ct; older = lt; olderDate = lt.date;
    }
    // 오래된 today 데이터를 history에 필드별 병합 (기존 history 보존)
    var existingHist = history[olderDate] || {};
    var mergedOlder = {};
    for (var fi = 0; fi < rhythmFields.length; fi++) {
      var f = rhythmFields[fi];
      mergedOlder[f] = older[f] || existingHist[f] || null;
    }
    // 복약 기록도 history에 병합
    var olderMeds = older.medications || {};
    var existingMeds = existingHist.medications || {};
    var allMedSlots = new Set([...Object.keys(olderMeds), ...Object.keys(existingMeds)]);
    if (allMedSlots.size > 0) {
      mergedOlder.medications = {};
      for (var slot of allMedSlots) {
        mergedOlder.medications[slot] = olderMeds[slot] || existingMeds[slot] || null;
      }
    }
    history[olderDate] = mergedOlder;
    return { today: newer, history: history };
  }

  // 날짜가 같거나 한쪽만 있는 경우
  // updatedAt 기반 "last writer wins" — 삭제(null)도 정상 전파되도록
  var lUpdated = lt.updatedAt || null;
  var cUpdated = ct.updatedAt || null;

  // 양쪽 다 updatedAt이 있으면 -> 최신 쪽이 today 전체를 지배 (null 필드 = 의도적 삭제)
  // 한쪽만 updatedAt이 있으면 -> 그쪽이 최신 코드 (우선)
  // 양쪽 다 없으면 -> 기존 || 병합 (하위호환)
  var winner = null;
  if (lUpdated && cUpdated) {
    winner = lUpdated >= cUpdated ? lt : ct;
  } else if (lUpdated && !cUpdated) {
    winner = lt;
  } else if (!lUpdated && cUpdated) {
    winner = ct;
  }

  if (winner) {
    // 보완 병합: winner의 null 필드는 loser 값으로 채움
    // 단, _deletedFields에 있는 필드는 의도적 삭제 -> 보완하지 않음
    var loser = winner === lt ? ct : lt;
    var winDel = new Set(winner._deletedFields || []);
    var today = { date: winner.date || lt.date || ct.date || null };
    for (var fi2 = 0; fi2 < rhythmFields.length; fi2++) {
      var f2 = rhythmFields[fi2];
      var wVal = winner[f2] !== undefined ? winner[f2] : null;
      var lVal = loser[f2] !== undefined ? loser[f2] : null;
      today[f2] = wVal !== null ? wVal : (winDel.has(f2) ? null : lVal);
    }
    // 복약 데이터도 슬롯별 보완 병합 (삭제 추적 반영)
    var wMeds = Object.assign({}, winner.medications || {});
    var lMeds = Object.assign({}, loser.medications || {});
    if (wMeds.med_afternoon !== undefined) { wMeds.med_afternoon_adhd = wMeds.med_afternoon; delete wMeds.med_afternoon; }
    if (lMeds.med_afternoon !== undefined) { lMeds.med_afternoon_adhd = lMeds.med_afternoon; delete lMeds.med_afternoon; }
    var allSlots = new Set([...Object.keys(wMeds), ...Object.keys(lMeds)]);
    var mergedMeds = {};
    for (var s of allSlots) {
      var wS = wMeds[s] !== null && wMeds[s] !== undefined ? wMeds[s] : null;
      mergedMeds[s] = wS !== null ? wS : (winDel.has(s) ? null : (lMeds[s] || null));
    }
    today.medications = mergedMeds;
    if (winDel.size > 0) today._deletedFields = [...winDel];
    today.updatedAt = winner.updatedAt;
    return { today: today, history: history };
  }

  // 하위호환: 양쪽 다 updatedAt 없으면 기존 || 병합
  var lm = Object.assign({}, lt.medications || {});
  var cm = Object.assign({}, ct.medications || {});
  if (lm.med_afternoon !== undefined) { lm.med_afternoon_adhd = lm.med_afternoon; delete lm.med_afternoon; }
  if (cm.med_afternoon !== undefined) { cm.med_afternoon_adhd = cm.med_afternoon; delete cm.med_afternoon; }
  var allMedSlots2 = new Set([...Object.keys(lm), ...Object.keys(cm)]);
  var mergedMeds2 = {};
  for (var s2 of allMedSlots2) {
    mergedMeds2[s2] = lm[s2] || cm[s2] || null;
  }

  var todayResult = { date: lt.date || ct.date || null };
  for (var fi3 = 0; fi3 < rhythmFields.length; fi3++) {
    var f3 = rhythmFields[fi3];
    todayResult[f3] = lt[f3] || ct[f3] || null;
  }
  todayResult.medications = mergedMeds2;

  return { today: todayResult, history: history };
}
