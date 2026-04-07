// ============================================
// 통근 트래커 모듈
// navigator-v5.html에서 분리됨
// 의존성: appState, renderStatic, syncToFirebase, showToast, escapeHtml, getLocalDateStr, generateId
// ============================================

function saveCommuteTracker() {
  // 항상 localStorage에 저장 (로그인 여부 무관 — 오프라인 폴백 보장)
  localStorage.setItem('navigator-commute-tracker', JSON.stringify(appState.commuteTracker));
  if (appState.user) { syncToFirebase(); }
}

function loadCommuteTracker() {
  const saved = localStorage.getItem('navigator-commute-tracker');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      appState.commuteTracker = {
        routes: parsed.routes || [],
        trips: parsed.trips || {},
        settings: { ...appState.commuteTracker.settings, ...(parsed.settings || {}) }
      };
    } catch (e) { console.error('통근 트래커 데이터 로드 실패:', e); }
  }
}

function setCommuteSubTab(tab) { appState.commuteSubTab = tab; renderStatic(); }
window.setCommuteSubTab = setCommuteSubTab;

function getCommuteViewDate() {
  return appState.commuteViewDate || getLocalDateStr();
}

function setCommuteViewDate(dateStr) {
  const today = getLocalDateStr();
  appState.commuteViewDate = (dateStr === today) ? null : dateStr;
  renderStatic();
}
window.setCommuteViewDate = setCommuteViewDate;

function commuteViewDatePrev() {
  const current = getCommuteViewDate();
  const d = new Date(current + 'T12:00:00');
  d.setDate(d.getDate() - 1);
  setCommuteViewDate(getLocalDateStr(d));
}
window.commuteViewDatePrev = commuteViewDatePrev;

function commuteViewDateNext() {
  const current = getCommuteViewDate();
  const today = getLocalDateStr();
  if (current >= today) return; // 미래 불가
  const d = new Date(current + 'T12:00:00');
  d.setDate(d.getDate() + 1);
  setCommuteViewDate(getLocalDateStr(d));
}
window.commuteViewDateNext = commuteViewDateNext;

function commuteViewDateToday() {
  appState.commuteViewDate = null;
  renderStatic();
}
window.commuteViewDateToday = commuteViewDateToday;

function openCommuteRouteModal(routeId) {
  appState.commuteRouteModal = routeId || 'add';
  renderStatic();
  setTimeout(() => { const el = document.getElementById('commute-route-name'); if (el) el.focus(); }, 100);
}
window.openCommuteRouteModal = openCommuteRouteModal;

function closeCommuteRouteModal() { appState.commuteRouteModal = null; renderStatic(); }
window.closeCommuteRouteModal = closeCommuteRouteModal;

function saveCommuteRoute() {
  const nameEl = document.getElementById('commute-route-name');
  const descEl = document.getElementById('commute-route-desc');
  const typeEl = document.getElementById('commute-route-type');
  const durationEl = document.getElementById('commute-route-duration');
  const colorEl = document.querySelector('.commute-color-btn.selected');
  const name = nameEl ? nameEl.value.trim() : '';
  if (!name) { showToast('루트 이름을 입력해주세요', 'error'); return; }
  const now = new Date().toISOString();
  const route = {
    id: appState.commuteRouteModal === 'add' ? 'route-' + generateId() : appState.commuteRouteModal,
    name: name, type: typeEl ? typeEl.value : 'both',
    description: descEl ? descEl.value.trim() : '',
    expectedDuration: parseInt(durationEl ? durationEl.value : '45') || 45,
    color: colorEl ? colorEl.dataset.color : 'var(--accent-primary)',
    isActive: true, createdAt: now, updatedAt: now
  };
  if (appState.commuteRouteModal === 'add') {
    appState.commuteTracker.routes.push(route);
    showToast('🚌 루트 추가됨', 'success');
  } else {
    const idx = appState.commuteTracker.routes.findIndex(r => r.id === route.id);
    if (idx >= 0) {
      route.createdAt = appState.commuteTracker.routes[idx].createdAt;
      route.updatedAt = now; // 수정 시점 기록 — 기기 간 병합에서 최신 판별용
      appState.commuteTracker.routes[idx] = route;
      showToast('✏️ 루트 수정됨', 'success');
    }
  }
  appState.commuteRouteModal = null;
  saveCommuteTracker(); renderStatic();
}
window.saveCommuteRoute = saveCommuteRoute;

function deleteCommuteRoute(routeId) {
  const route = appState.commuteTracker.routes.find(r => r.id === routeId);
  if (!route || !confirm('루트 "' + route.name + '"을(를) 삭제하시겠습니까?')) return;
  appState.commuteTracker.routes = appState.commuteTracker.routes.filter(r => r.id !== routeId);
  // Soft-Delete: 다른 기기 동기화 시 부활 방지
  if (!appState.deletedIds.commuteRoutes) appState.deletedIds.commuteRoutes = {};
  appState.deletedIds.commuteRoutes[routeId] = new Date().toISOString();
  appState.commuteRouteModal = null;
  saveCommuteTracker(); renderStatic();
  showToast('🗑️ 루트 삭제됨', 'success');
}
window.deleteCommuteRoute = deleteCommuteRoute;

function selectCommuteRoute(routeId, direction) {
  const dir = direction || appState.commuteSubTab;
  const dateStr = getCommuteViewDate();
  const today = getLocalDateStr();
  if (!appState.commuteTracker.trips[dateStr]) appState.commuteTracker.trips[dateStr] = {};

  // 오늘이면 lifeRhythm.today, 과거면 history에서 시간 가져오기
  const rhythm = (dateStr === today) ? appState.lifeRhythm.today : (appState.lifeRhythm.history[dateStr] || {});
  let departTime = null, arriveTime = null, duration = null;
  if (dir === 'morning') { departTime = rhythm.homeDepart; arriveTime = rhythm.workArrive; }
  else { departTime = rhythm.workDepart; arriveTime = rhythm.homeArrive; }

  // 과거 날짜에 리듬 데이터가 없으면 소요시간 수동 입력
  if (!departTime && !arriveTime && dateStr !== today) {
    const route = appState.commuteTracker.routes.find(r => r.id === routeId);
    const defaultDur = route ? route.expectedDuration : 45;
    const input = prompt('소요시간을 입력하세요 (분):', String(defaultDur));
    if (input === null) return;
    const parsed = parseInt(input);
    if (isNaN(parsed) || parsed < 1 || parsed > 480) {
      showToast('1~480분 사이로 입력해주세요', 'error'); return;
    }
    duration = parsed;
  } else if (departTime && arriveTime) {
    const [dh, dm] = departTime.split(':').map(Number);
    const [ah, am] = arriveTime.split(':').map(Number);
    duration = (ah * 60 + am) - (dh * 60 + dm);
    if (duration < 0) duration += 24 * 60;
  }

  appState.commuteTracker.trips[dateStr][dir] = {
    routeId: routeId, departTime: departTime, arriveTime: arriveTime,
    duration: duration, conditions: (appState.commuteTracker.trips[dateStr][dir] || {}).conditions || 'clear'
  };
  appState.commuteSelectedRoute[dir] = routeId;
  saveCommuteTracker(); renderStatic();
  const label = dateStr === today ? '오늘' : dateStr;
  showToast('🚌 ' + label + ' 루트가 기록되었습니다', 'success');
}
window.selectCommuteRoute = selectCommuteRoute;

function setCommuteCondition(condition) {
  const dateStr = getCommuteViewDate();
  const dir = appState.commuteSubTab;
  if (appState.commuteTracker.trips[dateStr] && appState.commuteTracker.trips[dateStr][dir]) {
    appState.commuteTracker.trips[dateStr][dir].conditions = condition;
    saveCommuteTracker(); renderStatic();
  }
}
window.setCommuteCondition = setCommuteCondition;

function showCommuteTagPrompt(direction) {
  if (!appState.commuteTracker.settings || !appState.commuteTracker.settings.enableAutoTag) return;
  if (appState.commuteTracker.routes.length === 0) return;
  const today = getLocalDateStr();
  if (appState.commuteTracker.trips[today] && appState.commuteTracker.trips[today][direction] && appState.commuteTracker.trips[today][direction].routeId) return;
  const routes = appState.commuteTracker.routes.filter(r => r.isActive && (r.type === direction || r.type === 'both'));
  if (routes.length === 0) return;
  const existing = document.getElementById('commute-tag-prompt');
  if (existing) existing.remove();
  const promptEl = document.createElement('div');
  promptEl.id = 'commute-tag-prompt';
  promptEl.className = 'commute-tag-prompt';
  const dirLabel = direction === 'morning' ? '출근' : '퇴근';
  let btns = routes.map(r => '<button class="commute-tag-prompt-btn" onclick="tagCommuteRoute(\'' + escapeAttr(r.id) + '\', \'' + escapeAttr(direction) + '\')" style="border-left:3px solid ' + escapeAttr(r.color) + '">' + escapeHtml(r.name) + '</button>').join('');
  promptEl.innerHTML = '<div class="commute-tag-prompt-title">🚌 어느 루트로 ' + dirLabel + '하셨나요?</div><div class="commute-tag-prompt-routes">' + btns + '</div><div class="commute-tag-prompt-later" onclick="dismissCommuteTag()">나중에</div>';
  document.body.appendChild(promptEl);
  if (window._commuteTagTimeout) clearTimeout(window._commuteTagTimeout);
  window._commuteTagTimeout = setTimeout(() => { window._commuteTagTimeout = null; const el = document.getElementById('commute-tag-prompt'); if (el) el.remove(); }, 10000);
}

function tagCommuteRoute(routeId, direction) { selectCommuteRoute(routeId, direction); dismissCommuteTag(); }
window.tagCommuteRoute = tagCommuteRoute;

function dismissCommuteTag() {
  if (window._commuteTagTimeout) { clearTimeout(window._commuteTagTimeout); window._commuteTagTimeout = null; }
  const el = document.getElementById('commute-tag-prompt'); if (el) el.remove();
}
window.dismissCommuteTag = dismissCommuteTag;

function getCommuteRecommendation(routeId, direction) {
  const trips = appState.commuteTracker.trips;
  const route = appState.commuteTracker.routes.find(r => r.id === routeId);
  if (!route) return null;
  const settings = appState.commuteTracker.settings;
  if (!settings || !settings.targetArrivalTime) return null;
  const durations = [];
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const dateStr = getLocalDateStr(d);
    if (trips[dateStr] && trips[dateStr][direction] && trips[dateStr][direction].routeId === routeId && trips[dateStr][direction].duration) {
      durations.push(trips[dateStr][direction].duration);
    }
  }
  let safeDuration, confidence;
  if (durations.length >= 10) {
    const sorted = [...durations].sort((a, b) => a - b);
    safeDuration = sorted[Math.floor(sorted.length * 0.75)]; confidence = 'high';
  } else if (durations.length >= 5) {
    const sorted = [...durations].sort((a, b) => a - b);
    safeDuration = sorted[Math.floor(sorted.length * 0.75)]; confidence = 'medium';
  } else if (durations.length >= 1) {
    safeDuration = Math.max(...durations); confidence = 'low';
  } else {
    safeDuration = route.expectedDuration; confidence = 'low';
  }
  const [th, tm] = settings.targetArrivalTime.split(':').map(Number);
  const targetMin = th * 60 + tm;
  const departMin = targetMin - safeDuration - settings.bufferMinutes;
  const departH = Math.floor(((departMin % (24*60)) + 24*60) % (24*60) / 60);
  const departM = ((departMin % 60) + 60) % 60;
  const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a,b) => a+b, 0) / durations.length) : route.expectedDuration;
  return {
    recommendedDepartTime: String(departH).padStart(2, '0') + ':' + String(departM).padStart(2, '0'),
    safeDuration, avgDuration, dataCount: durations.length, confidence
  };
}

function getCommuteRouteStats(routeId) {
  const trips = appState.commuteTracker.trips;
  const allDurations = { morning: [], evening: [] };
  const weekdayDurations = {};
  Object.keys(trips).forEach(dateStr => {
    const dayTrips = trips[dateStr];
    ['morning', 'evening'].forEach(dir => {
      if (dayTrips[dir] && dayTrips[dir].routeId === routeId && dayTrips[dir].duration) {
        allDurations[dir].push(dayTrips[dir].duration);
        const dow = new Date(dateStr).getDay();
        if (!weekdayDurations[dow]) weekdayDurations[dow] = [];
        weekdayDurations[dow].push(dayTrips[dir].duration);
      }
    });
  });
  const all = [...allDurations.morning, ...allDurations.evening];
  if (all.length === 0) return null;
  const avg = Math.round(all.reduce((a,b) => a+b, 0) / all.length);
  return {
    totalTrips: all.length, avg, min: Math.min(...all), max: Math.max(...all),
    stddev: Math.round(Math.sqrt(all.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / all.length)),
    morningTrips: allDurations.morning.length, eveningTrips: allDurations.evening.length, weekdayDurations
  };
}

function getRecentCommuteAvg(direction) {
  const trips = appState.commuteTracker.trips;
  const routeData = {};
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const dateStr = getLocalDateStr(d);
    if (trips[dateStr] && trips[dateStr][direction] && trips[dateStr][direction].routeId && trips[dateStr][direction].duration) {
      const rid = trips[dateStr][direction].routeId;
      if (!routeData[rid]) routeData[rid] = [];
      routeData[rid].push(trips[dateStr][direction].duration);
    }
  }
  return Object.keys(routeData).map(rid => {
    const route = appState.commuteTracker.routes.find(r => r.id === rid);
    const durations = routeData[rid];
    return { routeId: rid, name: route ? route.name : '알 수 없음', color: route ? route.color : 'var(--text-muted)',
      avg: Math.round(durations.reduce((a,b) => a+b, 0) / durations.length), count: durations.length };
  });
}

// 최근 7일 상세 기록 (출발/도착 시간 포함)
function getRecentCommuteDetail(direction) {
  const trips = appState.commuteTracker.trips;
  const history = appState.lifeRhythm.history;
  const result = [];
  const now = new Date();
  const dayNames = ['일','월','화','수','목','금','토'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const dateStr = getLocalDateStr(d);
    const dayLabel = i === 0 ? '오늘' : (i === 1 ? '어제' : `${d.getMonth()+1}/${d.getDate()} (${dayNames[d.getDay()]})`);
    const trip = trips[dateStr] && trips[dateStr][direction];
    const rhythmData = i === 0 ? appState.lifeRhythm.today : history[dateStr];
    if (trip && trip.duration) {
      const route = appState.commuteTracker.routes.find(r => r.id === trip.routeId);
      const depart = direction === 'morning' ? (rhythmData?.homeDepart) : (rhythmData?.workDepart);
      const arrive = direction === 'morning' ? (rhythmData?.workArrive) : (rhythmData?.homeArrive);
      result.push({
        date: dateStr,
        dayLabel,
        routeName: route ? route.name : '알 수 없음',
        routeColor: route ? route.color : 'var(--text-muted)',
        duration: trip.duration,
        depart: depart || null,
        arrive: arrive || null,
        conditions: trip.conditions || 'clear'
      });
    }
  }
  return result;
}

function showCommuteOnboarding() {
  var presets = [
    { name: '🚐 셔틀버스', type: 'morning', description: '회사 셔틀버스', expectedDuration: 30, color: 'var(--accent-success)' },
    { name: '🚇 지하철+버스', type: 'both', description: '지하철 → 환승 → 버스', expectedDuration: 55, color: 'var(--accent-primary)' },
    { name: '🚌 버스 직행', type: 'both', description: '직행 버스', expectedDuration: 45, color: 'var(--accent-warning-hover)' }
  ];
  presets.forEach(function(p) {
    appState.commuteTracker.routes.push({
      id: 'route-' + generateId(),
      name: p.name, type: p.type, description: p.description,
      expectedDuration: p.expectedDuration, color: p.color,
      isActive: true, createdAt: new Date().toISOString()
    });
  });
  saveCommuteTracker(); renderStatic();
  showToast('🚌 기본 루트 3개가 추가되었습니다', 'success');
}
window.showCommuteOnboarding = showCommuteOnboarding;

// ============================================
// 히스토리 수정/삭제 + 루트 복사
// ============================================

/**
 * 통근 기록 삭제
 */
function deleteCommuteTrip(dateStr, direction) {
  const dirLabel = direction === 'morning' ? '출근' : '퇴근';
  if (!confirm(dateStr + ' ' + dirLabel + ' 기록을 삭제하시겠습니까?')) return;
  if (appState.commuteTracker.trips[dateStr]) {
    // Soft-Delete: 동기화 시 부활 방지
    const delKey = dateStr + '|' + direction;
    if (!appState.deletedIds.commuteTrips) appState.deletedIds.commuteTrips = {};
    appState.deletedIds.commuteTrips[delKey] = new Date().toISOString();

    delete appState.commuteTracker.trips[dateStr][direction];
    // 해당 날짜에 남은 기록이 없으면 날짜 자체 삭제
    const remaining = appState.commuteTracker.trips[dateStr];
    if (!remaining.morning && !remaining.evening) {
      delete appState.commuteTracker.trips[dateStr];
    }
    saveCommuteTracker(); saveState(); renderStatic();
    showToast('🗑️ ' + dirLabel + ' 기록이 삭제되었습니다', 'success');
  }
}
window.deleteCommuteTrip = deleteCommuteTrip;

/**
 * 통근 기록 수정 (루트 변경)
 */
function editCommuteTrip(dateStr, direction) {
  const trip = appState.commuteTracker.trips[dateStr] && appState.commuteTracker.trips[dateStr][direction];
  if (!trip) return;

  const routes = appState.commuteTracker.routes.filter(r => r.isActive && (r.type === direction || r.type === 'both'));
  if (routes.length === 0) { showToast('사용 가능한 루트가 없습니다', 'error'); return; }

  const routeNames = routes.map((r, i) => (i + 1) + '. ' + r.name).join('\n');
  const current = routes.findIndex(r => r.id === trip.routeId);
  const choice = prompt('루트를 선택하세요:\n' + routeNames + '\n\n현재: ' + (current >= 0 ? routes[current].name : '없음'), current >= 0 ? current + 1 : 1);
  if (choice === null) return;

  const idx = parseInt(choice) - 1;
  if (idx < 0 || idx >= routes.length) { showToast('잘못된 선택입니다', 'error'); return; }

  trip.routeId = routes[idx].id;
  saveCommuteTracker(); renderStatic();
  showToast('✏️ 루트가 변경되었습니다: ' + routes[idx].name, 'success');
}
window.editCommuteTrip = editCommuteTrip;

/**
 * 통근 루트 복사 (동일 설정으로 새 루트 생성)
 */
function duplicateCommuteRoute(routeId) {
  const route = appState.commuteTracker.routes.find(r => r.id === routeId);
  if (!route) return;

  const newRoute = {
    ...route,
    id: 'route-' + generateId(),
    name: route.name + ' (복사)',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  appState.commuteTracker.routes.push(newRoute);
  saveCommuteTracker(); renderStatic();
  showToast('📋 루트가 복사되었습니다: ' + newRoute.name, 'success');
}
window.duplicateCommuteRoute = duplicateCommuteRoute;
