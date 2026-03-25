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
    color: colorEl ? colorEl.dataset.color : '#667eea',
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

function renderCommuteTab() {
  const routes = appState.commuteTracker.routes.filter(r => r.isActive);
  const today = getLocalDateStr();
  const viewDate = getCommuteViewDate();
  const viewTrips = appState.commuteTracker.trips[viewDate] || {};
  const subTab = appState.commuteSubTab;
  const rhythm = (viewDate === today) ? appState.lifeRhythm.today : (appState.lifeRhythm.history[viewDate] || {});

  let modalHtml = '';
  if (appState.commuteRouteModal) {
    const isEdit = appState.commuteRouteModal !== 'add';
    const editRoute = isEdit ? appState.commuteTracker.routes.find(r => r.id === appState.commuteRouteModal) : null;
    const colors = ['#667eea','#764ba2','#f56565','#ed8936','#48bb78','#4299e1','#9f7aea','#38b2ac'];
    const currentColor = editRoute ? editRoute.color : '#667eea';
    modalHtml = '<div class="commute-modal-overlay" onclick="if(event.target===this)closeCommuteRouteModal()">' +
      '<div class="commute-modal">' +
      '<div class="commute-modal-title">' + (isEdit ? '✏️ 루트 수정' : '➕ 새 루트 추가') + '</div>' +
      '<div class="commute-modal-field"><label class="commute-modal-label">루트 이름</label><input class="commute-modal-input" id="commute-route-name" placeholder="예: 2호선+버스" value="' + escapeHtml(editRoute ? editRoute.name : '') + '"></div>' +
      '<div class="commute-modal-field"><label class="commute-modal-label">설명 (선택)</label><input class="commute-modal-input" id="commute-route-desc" placeholder="예: 2호선 → 환승 → 버스" value="' + escapeHtml(editRoute ? editRoute.description : '') + '"></div>' +
      '<div class="commute-modal-field"><label class="commute-modal-label">방향</label><select class="commute-modal-select" id="commute-route-type"><option value="both"' + ((!editRoute || editRoute.type === 'both') ? ' selected' : '') + '>양방향</option><option value="morning"' + (editRoute && editRoute.type === 'morning' ? ' selected' : '') + '>출근 전용</option><option value="evening"' + (editRoute && editRoute.type === 'evening' ? ' selected' : '') + '>퇴근 전용</option></select></div>' +
      '<div class="commute-modal-field"><label class="commute-modal-label">예상 소요시간 (분)</label><input class="commute-modal-input" id="commute-route-duration" type="number" min="5" max="180" value="' + (editRoute ? editRoute.expectedDuration : 45) + '"></div>' +
      '<div class="commute-modal-field"><label class="commute-modal-label">색상</label><div class="commute-color-options">' +
      colors.map(c => '<button class="commute-color-btn' + (c === currentColor ? ' selected' : '') + '" data-color="' + c + '" style="background:' + c + '" onclick="this.parentElement.querySelectorAll(\'.commute-color-btn\').forEach(b=>b.classList.remove(\'selected\'));this.classList.add(\'selected\')" aria-label="색상 ' + c + '"></button>').join('') +
      '</div></div>' +
      '<div class="commute-modal-actions">' +
      (isEdit ? '<button class="commute-modal-cancel" onclick="deleteCommuteRoute(\''+escapeAttr(appState.commuteRouteModal)+'\')">🗑️ 삭제</button>' : '<button class="commute-modal-cancel" onclick="closeCommuteRouteModal()">취소</button>') +
      '<button class="commute-modal-save" onclick="saveCommuteRoute()">저장</button></div></div></div>';
  }

  if (routes.length === 0 && !appState.commuteRouteModal) {
    return '<div class="commute-header"><div class="commute-title">🚌 통근 트래커</div></div>' +
      '<div class="commute-empty"><div class="commute-empty-icon">🚌</div><div class="commute-empty-text">통근 루트를 추가해서 시작하세요</div>' +
      '<button class="commute-add-btn" onclick="showCommuteOnboarding()" aria-label="루트 추가">➕ 기본 루트로 시작하기</button>' +
      '<div style="margin-top:8px"><button class="commute-add-btn" style="background:var(--bg-secondary);color:var(--text-secondary)" onclick="openCommuteRouteModal()" aria-label="직접 추가">직접 추가</button></div></div>' + modalHtml;
  }

  let content = '<div class="commute-header"><div class="commute-title">🚌 통근 트래커</div>' +
    '<button class="commute-route-action-btn" onclick="openCommuteRouteModal()" title="루트 추가" aria-label="루트 추가">➕</button></div>';
  content += '<div class="commute-sub-tabs">' +
    '<button class="commute-sub-tab ' + (subTab === 'morning' ? 'active' : '') + '" onclick="setCommuteSubTab(\'morning\')" aria-label="오늘 출근">🌅 출근</button>' +
    '<button class="commute-sub-tab ' + (subTab === 'evening' ? 'active' : '') + '" onclick="setCommuteSubTab(\'evening\')" aria-label="오늘 퇴근">🌆 퇴근</button>' +
    '<button class="commute-sub-tab ' + (subTab === 'history' ? 'active' : '') + '" onclick="setCommuteSubTab(\'history\')" aria-label="기록">📋 기록</button>' +
    '<button class="commute-sub-tab ' + (subTab === 'stats' ? 'active' : '') + '" onclick="setCommuteSubTab(\'stats\')" aria-label="통계">📊 통계</button></div>';

  if (subTab === 'morning' || subTab === 'evening') {
    content += renderCommuteDayView(subTab, viewTrips, rhythm, routes, viewDate);
  } else if (subTab === 'history') {
    content += renderCommuteHistoryView();
  } else { content += renderCommuteStatsView(routes); }
  return content + modalHtml;
}

function renderCommuteDayView(direction, dayTrips, rhythm, routes, viewDate) {
  const dirLabel = direction === 'morning' ? '출근' : '퇴근';
  const trip = dayTrips[direction];
  const selectedRouteId = trip ? trip.routeId : (appState.commuteSelectedRoute[direction] || null);
  const filteredRoutes = routes.filter(r => r.type === direction || r.type === 'both');
  const today = getLocalDateStr();
  const isToday = viewDate === today;
  const dayNames = ['일','월','화','수','목','금','토'];
  const vd = new Date(viewDate + 'T12:00:00');
  const dateLabel = isToday ? '오늘' : `${vd.getMonth()+1}/${vd.getDate()} (${dayNames[vd.getDay()]})`;
  const isAtToday = viewDate >= today;

  let html = '';
  // 날짜 네비게이션
  html += '<div class="commute-date-nav">';
  html += '<button class="commute-date-nav-btn" onclick="commuteViewDatePrev()" aria-label="이전 날짜">&lt;</button>';
  html += '<span class="commute-date-nav-label' + (isToday ? '' : ' past') + '">' + dateLabel + '</span>';
  if (!isToday) {
    html += '<button class="commute-date-nav-btn today-btn" onclick="commuteViewDateToday()" aria-label="오늘로 이동">오늘</button>';
  }
  html += '<button class="commute-date-nav-btn" onclick="commuteViewDateNext()"' + (isAtToday ? ' disabled' : '') + ' aria-label="다음 날짜">&gt;</button>';
  html += '</div>';

  const depart = direction === 'morning' ? rhythm.homeDepart : rhythm.workDepart;
  const arrive = direction === 'morning' ? rhythm.workArrive : rhythm.homeArrive;
  const departLabel = direction === 'morning' ? '🚶 집 출발' : '🚀 회사 출발';
  const arriveLabel = direction === 'morning' ? '🏢 회사 도착' : '🏠 집 도착';

  html += '<div class="commute-time-display">';
  html += '<div class="commute-time-row"><span class="commute-time-label">' + departLabel + '</span><span class="commute-time-value' + (depart ? '' : ' empty') + '">' + (depart || '--:--') + '</span></div>';
  html += '<div class="commute-time-row"><span class="commute-time-label">' + arriveLabel + '</span><span class="commute-time-value' + (arrive ? '' : ' empty') + '">' + (arrive || '--:--') + '</span></div>';

  if (trip && trip.duration) {
    const route = appState.commuteTracker.routes.find(r => r.id === trip.routeId);
    const expected = route ? route.expectedDuration : 45;
    let cls = 'good';
    if (trip.duration > expected * 1.2) cls = 'bad';
    else if (trip.duration > expected) cls = 'normal';
    html += '<div style="text-align:center"><span class="commute-duration-badge ' + cls + '">⏱️ ' + trip.duration + '분</span></div>';
  }
  html += '</div>';

  if (trip && trip.routeId) {
    const currentCondition = trip.conditions || 'clear';
    html += '<div class="commute-conditions-row">';
    [['clear','☀️ 맑음'],['rain','🌧️ 비'],['snow','❄️ 눈']].forEach(function(pair) {
      html += '<button class="commute-condition-btn' + (currentCondition === pair[0] ? ' selected' : '') + '" onclick="setCommuteCondition(\'' + escapeAttr(pair[0]) + '\')">' + pair[1] + '</button>';
    });
    html += '</div><div style="height:12px"></div>';
  }

  if (direction === 'morning' && selectedRouteId) {
    const rec = getCommuteRecommendation(selectedRouteId, 'morning');
    if (rec) {
      const confLabels = { high: '높음 (10회+)', medium: '중간 (5회+)', low: '낮음 (<5회)' };
      html += '<div class="commute-recommend-card"><div class="commute-recommend-title">💡 추천 출발시간</div>';
      html += '<div class="commute-recommend-time">' + rec.recommendedDepartTime + '</div>';
      html += '<div class="commute-recommend-detail">평균 ' + rec.avgDuration + '분 · 안전값 ' + rec.safeDuration + '분 · 버퍼 ' + appState.commuteTracker.settings.bufferMinutes + '분</div>';
      html += '<span class="commute-recommend-confidence ' + rec.confidence + '">신뢰도: ' + confLabels[rec.confidence] + '</span></div>';
    }
  }

  html += '<div style="font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:8px">' + dirLabel + ' 루트 선택</div>';
  html += '<div class="commute-route-list">';
  filteredRoutes.forEach(function(r) {
    const isSelected = selectedRouteId === r.id;
    html += '<div class="commute-route-card' + (isSelected ? ' selected' : '') + '" onclick="selectCommuteRoute(\'' + escapeAttr(r.id) + '\', \'' + escapeAttr(direction) + '\')">';
    html += '<div class="commute-route-dot" style="background:' + escapeHtml(r.color) + '"></div>';
    html += '<div class="commute-route-info"><div class="commute-route-name">' + escapeHtml(r.name) + '</div>';
    if (r.description) html += '<div class="commute-route-desc">' + escapeHtml(r.description) + '</div>';
    html += '</div><span class="commute-route-time">' + r.expectedDuration + '분</span>';
    html += '<div class="commute-route-actions"><button class="commute-route-action-btn" onclick="event.stopPropagation();duplicateCommuteRoute(\'' + escapeAttr(r.id) + '\')" title="복사" aria-label="루트 복사">📋</button><button class="commute-route-action-btn" onclick="event.stopPropagation();openCommuteRouteModal(\'' + escapeAttr(r.id) + '\')" title="수정" aria-label="루트 수정">✏️</button></div></div>';
  });
  html += '</div>';

  const recentDetail = getRecentCommuteDetail(direction);
  if (recentDetail.length > 0) {
    html += '<div class="commute-recent-summary"><div class="commute-recent-title">📊 최근 7일 ' + dirLabel + '</div>';
    recentDetail.forEach(function(r) {
      const condIcon = r.conditions === 'rain' ? '🌧️' : (r.conditions === 'snow' ? '❄️' : '');
      const timeRange = (r.depart && r.arrive) ? (r.depart + ' → ' + r.arrive) : (r.depart || r.arrive || '-');
      html += '<div class="commute-recent-detail-row">';
      html += '<div class="commute-recent-day">' + escapeHtml(r.dayLabel) + '</div>';
      html += '<div class="commute-recent-dot" style="background:' + escapeHtml(r.routeColor) + '"></div>';
      html += '<div class="commute-recent-times">' + timeRange + '</div>';
      html += '<div class="commute-recent-duration">' + r.duration + '분' + (condIcon ? ' ' + condIcon : '') + '</div>';
      html += '</div>';
    });
    // 평균 요약
    const recentAvg = getRecentCommuteAvg(direction);
    if (recentAvg.length > 0) {
      const totalAvg = Math.round(recentAvg.reduce((s,r) => s + r.avg * r.count, 0) / recentAvg.reduce((s,r) => s + r.count, 0));
      html += '<div class="commute-recent-avg-summary">평균 ' + totalAvg + '분 (총 ' + recentAvg.reduce((s,r) => s + r.count, 0) + '회)</div>';
    }
    html += '</div>';
  }
  return html;
}

function renderCommuteHistoryView() {
  const trips = appState.commuteTracker.trips;
  const history = appState.lifeRhythm.history;
  const dayNames = ['일','월','화','수','목','금','토'];
  const allDates = Object.keys(trips).sort((a,b) => b.localeCompare(a)); // 최신순

  if (allDates.length === 0) {
    return '<div class="commute-empty"><div class="commute-empty-icon">📋</div><div class="commute-empty-text">통근 기록이 없습니다</div></div>';
  }

  let html = '<div class="commute-history-list">';

  allDates.forEach(dateStr => {
    const d = new Date(dateStr + 'T12:00:00');
    const dayLabel = `${d.getMonth()+1}/${d.getDate()} (${dayNames[d.getDay()]})`;
    const dayTrips = trips[dateStr];
    const rhythmData = history[dateStr] || (appState.lifeRhythm.today.date === dateStr ? appState.lifeRhythm.today : null);

    const morning = dayTrips.morning;
    const evening = dayTrips.evening;

    // 빈 기록 필터링: duration 없는 엔트리는 표시하지 않음
    const hasMorning = morning && morning.duration;
    const hasEvening = evening && evening.duration;
    if (!hasMorning && !hasEvening) return;

    html += '<div class="commute-history-day">';
    html += '<div class="commute-history-date">' + dayLabel + '</div>';

    if (morning && morning.duration) {
      const route = appState.commuteTracker.routes.find(r => r.id === morning.routeId);
      const depart = rhythmData?.homeDepart || '-';
      const arrive = rhythmData?.workArrive || '-';
      const condIcon = morning.conditions === 'rain' ? '🌧️' : (morning.conditions === 'snow' ? '❄️' : '');
      html += '<div class="commute-history-trip morning">';
      html += '<span class="commute-history-dir">🌅 출근</span>';
      html += '<span class="commute-history-route" style="color:' + escapeHtml(route?.color || 'var(--text-muted)') + '">' + escapeHtml(route?.name || '-') + '</span>';
      html += '<span class="commute-history-times">' + depart + ' → ' + arrive + '</span>';
      html += '<span class="commute-history-dur">' + morning.duration + '분' + (condIcon ? ' ' + condIcon : '') + '</span>';
      html += '<button class="commute-history-edit-btn" onclick="event.stopPropagation(); editCommuteTrip(\'' + escapeAttr(dateStr) + '\', \'morning\')" title="수정">✏️</button>';
      html += '<button class="commute-history-edit-btn" onclick="event.stopPropagation(); deleteCommuteTrip(\'' + escapeAttr(dateStr) + '\', \'morning\')" title="삭제" style="color:var(--accent-danger);">🗑️</button>';
      html += '</div>';
    }

    if (evening && evening.duration) {
      const route = appState.commuteTracker.routes.find(r => r.id === evening.routeId);
      const depart = rhythmData?.workDepart || '-';
      const arrive = rhythmData?.homeArrive || '-';
      const condIcon = evening.conditions === 'rain' ? '🌧️' : (evening.conditions === 'snow' ? '❄️' : '');
      html += '<div class="commute-history-trip evening">';
      html += '<span class="commute-history-dir">🌆 퇴근</span>';
      html += '<span class="commute-history-route" style="color:' + escapeHtml(route?.color || 'var(--text-muted)') + '">' + escapeHtml(route?.name || '-') + '</span>';
      html += '<span class="commute-history-times">' + depart + ' → ' + arrive + '</span>';
      html += '<span class="commute-history-dur">' + evening.duration + '분' + (condIcon ? ' ' + condIcon : '') + '</span>';
      html += '<button class="commute-history-edit-btn" onclick="event.stopPropagation(); editCommuteTrip(\'' + escapeAttr(dateStr) + '\', \'evening\')" title="수정">✏️</button>';
      html += '<button class="commute-history-edit-btn" onclick="event.stopPropagation(); deleteCommuteTrip(\'' + escapeAttr(dateStr) + '\', \'evening\')" title="삭제" style="color:var(--accent-danger);">🗑️</button>';
      html += '</div>';
    }

    // 해당 날짜에 출근/퇴근 중 빠진 기록이 있으면 추가 버튼 표시
    if (!hasMorning || !hasEvening) {
      html += '<div class="commute-history-add-row">';
      if (!hasMorning) {
        html += '<button class="commute-history-add-btn" onclick="goToCommuteDate(\'' + escapeAttr(dateStr) + '\', \'morning\')" title="출근 기록 추가">+ 🌅 출근</button>';
      }
      if (!hasEvening) {
        html += '<button class="commute-history-add-btn" onclick="goToCommuteDate(\'' + escapeAttr(dateStr) + '\', \'evening\')" title="퇴근 기록 추가">+ 🌆 퇴근</button>';
      }
      html += '</div>';
    }

    html += '</div>';
  });

  html += '</div>';
  return html;
}

function goToCommuteDate(dateStr, direction) {
  appState.commuteViewDate = dateStr;
  appState.commuteSubTab = direction;
  renderStatic();
}
window.goToCommuteDate = goToCommuteDate;

function renderCommuteStatsView(routes) {
  let html = '';
  const allStats = routes.map(function(r) { return { route: r, stats: getCommuteRouteStats(r.id) }; }).filter(function(s) { return s.stats; });
  if (allStats.length === 0) {
    return '<div class="commute-empty"><div class="commute-empty-icon">📊</div><div class="commute-empty-text">통근 기록을 쌓으면 여기에 통계가 표시됩니다</div></div>';
  }
  const sorted = allStats.slice().sort(function(a, b) { return a.stats.avg - b.stats.avg; });
  const best = sorted[0];
  const maxTrips = Math.max.apply(null, allStats.map(function(s) { return s.stats.totalTrips; }));

  html += '<div class="commute-stats-card"><div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:12px">📊 이용 빈도</div>';
  allStats.forEach(function(s) {
    const pct = maxTrips > 0 ? Math.round(s.stats.totalTrips / maxTrips * 100) : 0;
    html += '<div class="commute-freq-bar-wrap"><span class="commute-freq-bar-label">' + escapeHtml(s.route.name) + '</span>';
    html += '<div class="commute-freq-bar-track"><div class="commute-freq-bar-fill" style="width:' + pct + '%;background:' + escapeHtml(s.route.color) + '"></div></div>';
    html += '<span class="commute-freq-bar-count">' + s.stats.totalTrips + '회</span></div>';
  });
  html += '</div>';

  allStats.forEach(function(s) {
    const isBest = s.route.id === best.route.id && allStats.length > 1;
    html += '<div class="commute-stats-card"><div class="commute-stats-header"><div class="commute-route-dot" style="background:' + escapeHtml(s.route.color) + '"></div>';
    html += '<span class="commute-stats-route-name">' + escapeHtml(s.route.name) + '</span><span class="commute-stats-count">' + s.stats.totalTrips + '회</span>';
    if (isBest) html += '<span class="commute-best-badge">🏆 추천</span>';
    html += '</div><div class="commute-stats-grid">';
    html += '<div class="commute-stat-item"><div class="commute-stat-value">' + s.stats.avg + '분</div><div class="commute-stat-label">평균</div></div>';
    html += '<div class="commute-stat-item"><div class="commute-stat-value">' + s.stats.min + '분</div><div class="commute-stat-label">최단</div></div>';
    html += '<div class="commute-stat-item"><div class="commute-stat-value">' + s.stats.max + '분</div><div class="commute-stat-label">최장</div></div>';
    html += '</div></div>';
  });

  const weekdayData = {};
  const dayNames = ['일','월','화','수','목','금','토'];
  allStats.forEach(function(s) {
    Object.keys(s.stats.weekdayDurations).forEach(function(dow) {
      if (!weekdayData[dow]) weekdayData[dow] = [];
      weekdayData[dow] = weekdayData[dow].concat(s.stats.weekdayDurations[dow]);
    });
  });
  if (Object.keys(weekdayData).length > 0) {
    html += '<div class="commute-stats-card"><div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:12px">📅 요일별 평균</div>';
    html += '<div class="commute-weekday-grid">';
    for (var i = 0; i < 7; i++) {
      var durations = weekdayData[i] || [];
      var avg = durations.length > 0 ? Math.round(durations.reduce(function(a,b){return a+b;},0) / durations.length) : '-';
      html += '<div class="commute-weekday-item"><div class="commute-weekday-label">' + dayNames[i] + '</div><div class="commute-weekday-value">' + (avg === '-' ? '-' : avg + '분') + '</div><div class="commute-weekday-count">' + durations.length + '회</div></div>';
    }
    html += '</div></div>';
  }
  return html;
}

function showCommuteOnboarding() {
  var presets = [
    { name: '🚐 셔틀버스', type: 'morning', description: '회사 셔틀버스', expectedDuration: 30, color: '#48bb78' },
    { name: '🚇 지하철+버스', type: 'both', description: '지하철 → 환승 → 버스', expectedDuration: 55, color: '#667eea' },
    { name: '🚌 버스 직행', type: 'both', description: '직행 버스', expectedDuration: 45, color: '#ed8936' }
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
