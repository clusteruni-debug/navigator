// ============================================
// 통근 탭 렌더링
// (commute.js에서 분리)
// ============================================

function renderCommuteTab() {
  const routes = appState.commuteTracker.routes.filter(r => r.isActive);
  const today = getLocalDateStr();
  const viewDate = getCommuteViewDate();
  const viewTrips = appState.commuteTracker.trips[viewDate] || {};
  const subTab = getCommuteSubTab();
  const lifeRhythm = appState.lifeRhythm || {};
  const rhythm = (viewDate === today) ? (lifeRhythm.today || {}) : ((lifeRhythm.history || {})[viewDate] || {});
  const summary = getCommuteSummary(routes, viewTrips, rhythm, viewDate);
  const modalHtml = renderCommuteRouteModal();

  let content = '<section class="commute-shell" aria-labelledby="commute-title">';
  content += '<div class="commute-topbar">';
  content += '<div class="commute-heading"><span class="commute-eyebrow">Commute</span><h2 id="commute-title">' + _commuteIcon('bus', 20) + '통근</h2>';
  content += '<p>셔틀 ' + (appState.shuttleSuccess ? '성공' : '미탑승') + ' · 현재 모드 ' + escapeHtml(summary.modeLabel) + '</p></div>';
  content += '<div class="commute-top-actions">';
  content += '<button type="button" class="commute-icon-action" onclick="openCommuteRouteModal()" aria-label="경로 추가" title="경로 추가">' + _commuteIcon('plus', 16) + '</button>';
  content += '<button type="button" class="commute-mode-btn" onclick="triggerCommuteMode()" aria-label="통근 상태를 오늘 모드에 반영">' + _commuteIcon('play', 14) + '<span>모드 반영</span></button>';
  content += '</div></div>';

  content += '<div class="commute-sub-tabs" role="tablist" aria-label="통근 보기">';
  [
    { id: 'today', label: '오늘', icon: 'clock' },
    { id: 'routes', label: '경로', icon: 'bus' },
    { id: 'log', label: '로그', icon: 'list' }
  ].forEach(function(tab) {
    const active = subTab === tab.id;
    content += '<button type="button" id="commute-tab-' + tab.id + '" class="commute-sub-tab' + (active ? ' active' : '') + '" role="tab" aria-selected="' + active + '" aria-controls="commute-panel-' + tab.id + '" onclick="setCommuteSubTab(\'' + tab.id + '\')">' + _commuteIcon(tab.icon, 15) + '<span>' + tab.label + '</span></button>';
  });
  content += '</div>';

  content += '<div class="commute-anchors" aria-label="통근 요약">';
  content += _renderCommuteAnchor('셔틀 상태', appState.shuttleSuccess ? '성공' : '미탑승', appState.shuttleSuccess ? 'success' : 'warn');
  content += _renderCommuteAnchor('현재 모드', summary.modeLabel, 'work');
  content += _renderCommuteAnchor('이번 주', summary.weekTrips + ' trip', '');
  content += _renderCommuteAnchor('다음 이동', summary.nextMove, 'warn');
  content += '</div>';

  content += '<div id="commute-panel-' + subTab + '" class="commute-panel" role="tabpanel" aria-labelledby="commute-tab-' + subTab + '">';
  if (subTab === 'today') {
    content += renderCommuteTodayPanel(viewTrips, rhythm, routes, viewDate);
  } else if (subTab === 'routes') {
    content += renderCommuteRoutesPanel(routes);
  } else {
    content += renderCommuteLogPanel(routes);
  }
  content += '</div></section>';
  return content + modalHtml;
}

function _commuteIcon(name, size) {
  return typeof svgIcon === 'function' ? svgIcon(name, size || 16) : '';
}

function renderCommuteRouteModal() {
  let modalHtml = '';
  if (appState.commuteRouteModal) {
    const isEdit = appState.commuteRouteModal !== 'add';
    const editRoute = isEdit ? appState.commuteTracker.routes.find(r => r.id === appState.commuteRouteModal) : null;
    const colors = getCommuteColorOptions();
    const currentColor = getCommuteSafeColor(editRoute ? editRoute.color : null);
    modalHtml = '<div class="commute-modal-overlay" onclick="if(event.target===this)closeCommuteRouteModal()">' +
      '<div class="commute-modal">' +
      '<div class="commute-modal-title">' + _commuteIcon(isEdit ? 'edit' : 'plus', 16) + '<span>' + (isEdit ? '루트 수정' : '새 루트 추가') + '</span></div>' +
      '<div class="commute-modal-field"><label class="commute-modal-label" for="commute-route-name">루트 이름</label><input class="commute-modal-input" id="commute-route-name" placeholder="예: 2호선+버스" value="' + escapeAttr(editRoute ? editRoute.name : '') + '"></div>' +
      '<div class="commute-modal-field"><label class="commute-modal-label" for="commute-route-desc">설명</label><input class="commute-modal-input" id="commute-route-desc" placeholder="예: 2호선 -> 환승 -> 버스" value="' + escapeAttr(editRoute ? editRoute.description : '') + '"></div>' +
      '<div class="commute-modal-field"><label class="commute-modal-label">방향</label><select class="commute-modal-select" id="commute-route-type"><option value="both"' + ((!editRoute || editRoute.type === 'both') ? ' selected' : '') + '>양방향</option><option value="morning"' + (editRoute && editRoute.type === 'morning' ? ' selected' : '') + '>출근 전용</option><option value="evening"' + (editRoute && editRoute.type === 'evening' ? ' selected' : '') + '>퇴근 전용</option></select></div>' +
      '<div class="commute-modal-field"><label class="commute-modal-label" for="commute-route-duration">예상 소요시간 (분)</label><input class="commute-modal-input" id="commute-route-duration" type="number" min="5" max="180" value="' + escapeAttr(editRoute ? editRoute.expectedDuration : 45) + '"></div>' +
      '<div class="commute-modal-field"><label class="commute-modal-label">색상</label><div class="commute-color-options">' +
      colors.map(c => '<button type="button" class="commute-color-btn' + (c === currentColor ? ' selected' : '') + '" data-color="' + escapeAttr(c) + '" style="--swatch-color:' + escapeAttr(c) + '" onclick="this.parentElement.querySelectorAll(\'.commute-color-btn\').forEach(b=>b.classList.remove(\'selected\'));this.classList.add(\'selected\')" aria-label="경로 색상 선택" aria-pressed="' + (c === currentColor) + '"></button>').join('') +
      '</div></div>' +
      '<div class="commute-modal-actions">' +
      (isEdit ? '<button type="button" class="commute-modal-cancel" onclick="deleteCommuteRoute(\''+escapeAttr(appState.commuteRouteModal)+'\')">' + _commuteIcon('trash', 14) + '<span>삭제</span></button>' : '<button type="button" class="commute-modal-cancel" onclick="closeCommuteRouteModal()">취소</button>') +
      '<button type="button" class="commute-modal-save" onclick="saveCommuteRoute()">' + _commuteIcon('check', 14) + '<span>저장</span></button></div></div></div>';
  }
  return modalHtml;
}

function getCommuteSummary(routes, viewTrips, rhythm, viewDate) {
  const modeLabel = typeof getCurrentMode === 'function' ? getCurrentMode() : '통근';
  const now = new Date();
  let weekTrips = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now); d.setDate(d.getDate() - i);
    const dayTrips = appState.commuteTracker.trips[getLocalDateStr(d)] || {};
    if (dayTrips.morning && dayTrips.morning.duration) weekTrips += 1;
    if (dayTrips.evening && dayTrips.evening.duration) weekTrips += 1;
  }
  const nextMove = !viewTrips.morning ? '출근' : (!viewTrips.evening ? '퇴근' : '완료');
  return { modeLabel, weekTrips, nextMove };
}

function _renderCommuteAnchor(label, value, tone) {
  return '<div class="commute-anchor ' + escapeAttr(tone || '') + '"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
}

function renderCommuteTodayPanel(dayTrips, rhythm, routes, viewDate) {
  const activeDirection = getCommuteActiveDirection();
  let html = '<div class="commute-today-grid">';
  html += '<button type="button" class="commute-shuttle-card' + (appState.shuttleSuccess ? ' on' : '') + '" onclick="toggleShuttle()" aria-pressed="' + !!appState.shuttleSuccess + '" aria-keyshortcuts="S" aria-label="셔틀 상태 토글">' +
    '<span class="commute-card-icon">' + _commuteIcon('bus', 18) + '</span><span>셔틀</span><strong>' + (appState.shuttleSuccess ? '성공' : '미탑승') + '</strong></button>';
  html += '<button type="button" class="commute-mode-card" onclick="triggerCommuteMode()" aria-label="통근 상태를 오늘 모드에 반영">' +
    '<span class="commute-card-icon">' + _commuteIcon('play', 18) + '</span><span>모드 트리거</span><strong>오늘 탭</strong></button>';
  html += '</div>';

  html += '<div class="commute-direction-tabs" role="tablist" aria-label="통근 방향">';
  [['morning', '출근'], ['evening', '퇴근']].forEach(function(pair) {
    const active = activeDirection === pair[0];
    html += '<button type="button" class="commute-direction-tab' + (active ? ' active' : '') + '" onclick="setCommuteDirection(\'' + pair[0] + '\')" role="tab" aria-selected="' + active + '">' + pair[1] + '</button>';
  });
  html += '</div>';

  html += renderCommuteDirectionCard(activeDirection, dayTrips[activeDirection], rhythm, routes, viewDate, true);
  html += '<div class="commute-secondary-directions">';
  html += renderCommuteDirectionCard(activeDirection === 'morning' ? 'evening' : 'morning', dayTrips[activeDirection === 'morning' ? 'evening' : 'morning'], rhythm, routes, viewDate, false);
  html += '</div>';
  return html;
}

function renderCommuteDirectionCard(direction, trip, rhythm, routes, viewDate, expanded) {
  const meta = direction === 'morning'
    ? { label: '출근', from: '집 출발', to: '회사 도착', depart: rhythm.homeDepart, arrive: rhythm.workArrive }
    : { label: '퇴근', from: '회사 출발', to: '집 도착', depart: rhythm.workDepart, arrive: rhythm.homeArrive };
  const route = trip ? appState.commuteTracker.routes.find(r => r.id === trip.routeId) : null;
  const selectedRouteId = trip ? trip.routeId : (appState.commuteSelectedRoute[direction] || null);
  const filteredRoutes = routes.filter(r => r.type === direction || r.type === 'both');
  const status = trip && trip.duration ? trip.duration + '분' : '미기록';
  let html = '<article class="commute-direction-card' + (expanded ? ' expanded' : '') + '" aria-label="' + meta.label + ' 통근 카드">';
  html += '<div class="commute-direction-head"><div><span class="commute-section-kicker">' + escapeHtml(meta.label) + '</span><h3>' + escapeHtml(meta.from) + ' -> ' + escapeHtml(meta.to) + '</h3></div><strong>' + escapeHtml(status) + '</strong></div>';
  html += '<div class="commute-time-pair"><span>' + escapeHtml(meta.depart || '--:--') + '</span><span>' + escapeHtml(meta.arrive || '--:--') + '</span></div>';
  if (route) html += '<div class="commute-current-route" style="--route-color:' + escapeAttr(getCommuteSafeColor(route.color)) + '">' + escapeHtml(route.name) + '</div>';
  if (expanded) {
    html += '<div class="commute-route-choice-list" aria-label="' + meta.label + ' 경로 선택">';
    if (filteredRoutes.length === 0) {
      html += '<div class="commute-empty compact">사용 가능한 경로가 없습니다</div>';
    } else {
      filteredRoutes.forEach(function(r) {
        const isSelected = selectedRouteId === r.id;
        html += '<button type="button" class="commute-route-choice' + (isSelected ? ' selected' : '') + '" onclick="selectCommuteRoute(\'' + escapeAttr(r.id) + '\', \'' + direction + '\')" style="--route-color:' + escapeAttr(getCommuteSafeColor(r.color)) + '" aria-pressed="' + isSelected + '">';
        html += '<span class="commute-route-dot"></span><span><strong>' + escapeHtml(r.name) + '</strong><small>' + escapeHtml(r.description || directionLabel(r.type)) + '</small></span><em>' + escapeHtml(String(r.expectedDuration)) + '분</em></button>';
      });
    }
    if (trip && trip.routeId) {
      const currentCondition = trip.conditions || 'clear';
      html += '<div class="commute-conditions-row" aria-label="' + meta.label + ' 날씨 조건">';
      [['clear','맑음'],['rain','비'],['snow','눈']].forEach(function(pair) {
        html += '<button type="button" class="commute-condition-btn' + (currentCondition === pair[0] ? ' selected' : '') + '" onclick="setCommuteCondition(\'' + escapeAttr(pair[0]) + '\', \'' + direction + '\')" aria-pressed="' + (currentCondition === pair[0]) + '">' + pair[1] + '</button>';
      });
      html += '</div>';
    }
  } else {
    html += '<button type="button" class="commute-expand-direction" onclick="setCommuteDirection(\'' + direction + '\')" aria-label="' + meta.label + ' 경로 선택">경로 선택</button>';
  }
  html += '</article>';
  return html;
}

function renderCommuteRoutesPanel(routes) {
  let html = '<div class="commute-panel-head"><div><span class="commute-section-kicker">Route management</span><h3>등록 경로</h3></div><button type="button" class="commute-mode-btn" onclick="openCommuteRouteModal()" aria-label="경로 추가">' + _commuteIcon('plus', 14) + '<span>경로 추가</span></button></div>';
  if (routes.length === 0) {
    return html + '<div class="commute-empty"><div class="commute-empty-text">통근 루트를 추가해서 시작하세요</div><button type="button" class="commute-mode-btn" onclick="showCommuteOnboarding()">기본 루트로 시작</button></div>';
  }
  html += '<div class="commute-route-manage-list">';
  routes.forEach(function(r) {
    html += '<article class="commute-route-manage-card" style="--route-color:' + escapeAttr(getCommuteSafeColor(r.color)) + '">';
    html += '<div><strong>' + escapeHtml(r.name) + '</strong><p>' + escapeHtml(r.description || directionLabel(r.type)) + '</p></div>';
    html += '<span>' + escapeHtml(directionLabel(r.type)) + ' · ' + escapeHtml(String(r.expectedDuration)) + '분</span>';
    html += '<div class="commute-route-manage-actions"><button type="button" onclick="duplicateCommuteRoute(\'' + escapeAttr(r.id) + '\')" aria-label="루트 복사">' + _commuteIcon('list', 14) + '</button><button type="button" onclick="openCommuteRouteModal(\'' + escapeAttr(r.id) + '\')" aria-label="루트 수정">' + _commuteIcon('edit', 14) + '</button></div>';
    html += '</article>';
  });
  html += '</div>';
  return html;
}

function renderCommuteLogPanel(routes) {
  const trips = appState.commuteTracker.trips;
  const dates = Object.keys(trips).sort((a,b) => b.localeCompare(a));
  let html = '<div class="commute-panel-head"><div><span class="commute-section-kicker">Trip log</span><h3>통근 로그</h3></div><span class="commute-log-count">' + dates.length + '일</span></div>';
  if (dates.length === 0) return html + '<div class="commute-empty"><div class="commute-empty-text">통근 기록이 없습니다</div></div>';
  html += '<div class="commute-log-list">';
  dates.slice(0, 14).forEach(function(dateStr) {
    const dayTrips = trips[dateStr] || {};
    html += '<section class="commute-log-day"><h4>' + escapeHtml(formatCommuteDateLabel(dateStr)) + '</h4>';
    ['morning', 'evening'].forEach(function(dir) {
      const trip = dayTrips[dir];
      if (!trip || !trip.duration) return;
      const route = routes.find(r => r.id === trip.routeId);
      html += '<div class="commute-log-row" style="--route-color:' + escapeAttr(getCommuteSafeColor(route?.color)) + '">';
      html += '<span>' + escapeHtml(dir === 'morning' ? '출근' : '퇴근') + '</span><strong>' + escapeHtml(route?.name || '-') + '</strong><em>' + escapeHtml(String(trip.duration)) + '분</em>';
      html += '<button type="button" onclick="editCommuteTrip(\'' + escapeAttr(dateStr) + '\', \'' + dir + '\')" aria-label="기록 수정">' + _commuteIcon('edit', 14) + '</button>';
      html += '<button type="button" onclick="deleteCommuteTrip(\'' + escapeAttr(dateStr) + '\', \'' + dir + '\')" aria-label="기록 삭제">' + _commuteIcon('trash', 14) + '</button>';
      html += '</div>';
    });
    html += '</section>';
  });
  html += '</div>' + renderCommuteLogStats(routes);
  return html;
}

function renderCommuteLogStats(routes) {
  const allStats = routes.map(function(r) { return { route: r, stats: getCommuteRouteStats(r.id) }; }).filter(function(s) { return s.stats; });
  if (allStats.length === 0) return '';
  const totals = allStats.reduce(function(acc, item) {
    acc.trips += item.stats.totalTrips;
    acc.minutes += item.stats.avg * item.stats.totalTrips;
    return acc;
  }, { trips: 0, minutes: 0 });
  const avg = totals.trips > 0 ? Math.round(totals.minutes / totals.trips) : 0;
  const best = allStats.slice().sort(function(a, b) { return a.stats.avg - b.stats.avg; })[0];
  return '<div class="commute-log-stats" aria-label="통근 로그 요약">' +
    '<div><span>전체 평균</span><strong>' + avg + '분</strong></div>' +
    '<div><span>누적 trip</span><strong>' + totals.trips + '</strong></div>' +
    '<div><span>가장 빠른 경로</span><strong>' + escapeHtml(best.route.name) + '</strong></div>' +
    '</div>';
}

function directionLabel(type) {
  if (type === 'morning') return '출근 전용';
  if (type === 'evening') return '퇴근 전용';
  return '양방향';
}

function formatCommuteDateLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  const today = getLocalDateStr();
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
  if (dateStr === today) return '오늘';
  if (dateStr === getLocalDateStr(yesterday)) return '어제';
  return (d.getMonth()+1) + '/' + d.getDate() + ' (' + ['일','월','화','수','목','금','토'][d.getDay()] + ')';
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
    html += '<div style="text-align:center"><span class="commute-duration-badge ' + cls + '">' + _commuteIcon('clock', 14) + trip.duration + '분</span></div>';
  }
  html += '</div>';

  if (trip && trip.routeId) {
    const currentCondition = trip.conditions || 'clear';
    html += '<div class="commute-conditions-row">';
    [['clear','맑음'],['rain','비'],['snow','눈']].forEach(function(pair) {
      html += '<button class="commute-condition-btn' + (currentCondition === pair[0] ? ' selected' : '') + '" onclick="setCommuteCondition(\'' + escapeAttr(pair[0]) + '\')">' + pair[1] + '</button>';
    });
    html += '</div><div style="height:12px"></div>';
  }

  if (direction === 'morning' && selectedRouteId) {
    const rec = getCommuteRecommendation(selectedRouteId, 'morning');
    if (rec) {
      const confLabels = { high: '높음 (10회+)', medium: '중간 (5회+)', low: '낮음 (<5회)' };
      html += '<div class="commute-recommend-card"><div class="commute-recommend-title">추천 출발시간</div>';
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
    html += '<div class="commute-route-actions"><button class="commute-route-action-btn" onclick="event.stopPropagation();duplicateCommuteRoute(\'' + escapeAttr(r.id) + '\')" title="복사" aria-label="루트 복사">' + _commuteIcon('list', 14) + '</button><button class="commute-route-action-btn" onclick="event.stopPropagation();openCommuteRouteModal(\'' + escapeAttr(r.id) + '\')" title="수정" aria-label="루트 수정">' + _commuteIcon('edit', 14) + '</button></div></div>';
  });
  html += '</div>';

  const recentDetail = getRecentCommuteDetail(direction);
  if (recentDetail.length > 0) {
    html += '<div class="commute-recent-summary"><div class="commute-recent-title">최근 7일 ' + dirLabel + '</div>';
    recentDetail.forEach(function(r) {
      const condIcon = r.conditions === 'rain' ? '비' : (r.conditions === 'snow' ? '눈' : '');
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
  const lifeRhythm = appState.lifeRhythm || {};
  const history = lifeRhythm.history || {};
  const todayBlock = lifeRhythm.today || {};
  const dayNames = ['일','월','화','수','목','금','토'];
  const allDates = Object.keys(trips).sort((a,b) => b.localeCompare(a)); // 최신순

  if (allDates.length === 0) {
    return '<div class="commute-empty"><div class="commute-empty-icon">' + _commuteIcon('list', 28) + '</div><div class="commute-empty-text">통근 기록이 없습니다</div></div>';
  }

  let html = '<div class="commute-history-list">';

  allDates.forEach(dateStr => {
    const d = new Date(dateStr + 'T12:00:00');
    const dayLabel = `${d.getMonth()+1}/${d.getDate()} (${dayNames[d.getDay()]})`;
    const dayTrips = trips[dateStr];
    const rhythmData = history[dateStr] || (todayBlock.date === dateStr ? todayBlock : null);

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
      const condIcon = morning.conditions === 'rain' ? '비' : (morning.conditions === 'snow' ? '눈' : '');
      html += '<div class="commute-history-trip morning">';
      html += '<span class="commute-history-dir">출근</span>';
      html += '<span class="commute-history-route" style="color:' + escapeHtml(route?.color || 'var(--text-muted)') + '">' + escapeHtml(route?.name || '-') + '</span>';
      html += '<span class="commute-history-times">' + depart + ' → ' + arrive + '</span>';
      html += '<span class="commute-history-dur">' + morning.duration + '분' + (condIcon ? ' ' + condIcon : '') + '</span>';
      html += '<button class="commute-history-edit-btn" onclick="event.stopPropagation(); editCommuteTrip(\'' + escapeAttr(dateStr) + '\', \'morning\')" title="수정">' + _commuteIcon('edit', 14) + '</button>';
      html += '<button class="commute-history-edit-btn" onclick="event.stopPropagation(); deleteCommuteTrip(\'' + escapeAttr(dateStr) + '\', \'morning\')" title="삭제" style="color:var(--accent-danger);">' + _commuteIcon('trash', 14) + '</button>';
      html += '</div>';
    }

    if (evening && evening.duration) {
      const route = appState.commuteTracker.routes.find(r => r.id === evening.routeId);
      const depart = rhythmData?.workDepart || '-';
      const arrive = rhythmData?.homeArrive || '-';
      const condIcon = evening.conditions === 'rain' ? '비' : (evening.conditions === 'snow' ? '눈' : '');
      html += '<div class="commute-history-trip evening">';
      html += '<span class="commute-history-dir">퇴근</span>';
      html += '<span class="commute-history-route" style="color:' + escapeHtml(route?.color || 'var(--text-muted)') + '">' + escapeHtml(route?.name || '-') + '</span>';
      html += '<span class="commute-history-times">' + depart + ' → ' + arrive + '</span>';
      html += '<span class="commute-history-dur">' + evening.duration + '분' + (condIcon ? ' ' + condIcon : '') + '</span>';
      html += '<button class="commute-history-edit-btn" onclick="event.stopPropagation(); editCommuteTrip(\'' + escapeAttr(dateStr) + '\', \'evening\')" title="수정">' + _commuteIcon('edit', 14) + '</button>';
      html += '<button class="commute-history-edit-btn" onclick="event.stopPropagation(); deleteCommuteTrip(\'' + escapeAttr(dateStr) + '\', \'evening\')" title="삭제" style="color:var(--accent-danger);">' + _commuteIcon('trash', 14) + '</button>';
      html += '</div>';
    }

    // 해당 날짜에 출근/퇴근 중 빠진 기록이 있으면 추가 버튼 표시
    if (!hasMorning || !hasEvening) {
      html += '<div class="commute-history-add-row">';
      if (!hasMorning) {
        html += '<button class="commute-history-add-btn" onclick="goToCommuteDate(\'' + escapeAttr(dateStr) + '\', \'morning\')" title="출근 기록 추가">+ 출근</button>';
      }
      if (!hasEvening) {
        html += '<button class="commute-history-add-btn" onclick="goToCommuteDate(\'' + escapeAttr(dateStr) + '\', \'evening\')" title="퇴근 기록 추가">+ 퇴근</button>';
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
  appState.commuteSubTab = 'today';
  if (direction === 'morning' || direction === 'evening') {
    appState.commuteActiveDirection = direction;
  }
  renderStatic();
}
window.goToCommuteDate = goToCommuteDate;

function renderCommuteStatsView(routes) {
  let html = '';
  const allStats = routes.map(function(r) { return { route: r, stats: getCommuteRouteStats(r.id) }; }).filter(function(s) { return s.stats; });
  if (allStats.length === 0) {
    return '<div class="commute-empty"><div class="commute-empty-icon">' + _commuteIcon('bar-chart', 28) + '</div><div class="commute-empty-text">통근 기록을 쌓으면 여기에 통계가 표시됩니다</div></div>';
  }
  const sorted = allStats.slice().sort(function(a, b) { return a.stats.avg - b.stats.avg; });
  const best = sorted[0];
  const maxTrips = Math.max.apply(null, allStats.map(function(s) { return s.stats.totalTrips; }));

  html += '<div class="commute-stats-card"><div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:12px">이용 빈도</div>';
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
    if (isBest) html += '<span class="commute-best-badge">추천</span>';
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
    html += '<div class="commute-stats-card"><div style="font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:12px">요일별 평균</div>';
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
