// ============================================
// 통근 탭 렌더링
// (commute.js에서 분리)
// ============================================

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
    const colors = ['var(--accent-primary)','var(--accent-purple)','var(--accent-danger)','var(--accent-warning-hover)','var(--accent-success)','var(--chart-blue)','var(--chart-lavender)','var(--chart-teal)'];
    const hexToVar = {'#667eea':'var(--accent-primary)','#764ba2':'var(--accent-purple)','#f56565':'var(--accent-danger)','#ed8936':'var(--accent-warning-hover)','#48bb78':'var(--accent-success)','#4299e1':'var(--chart-blue)','#9f7aea':'var(--chart-lavender)','#38b2ac':'var(--chart-teal)'};
    const rawColor = editRoute ? editRoute.color : 'var(--accent-primary)';
    const currentColor = hexToVar[rawColor] || rawColor;
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
