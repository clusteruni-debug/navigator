// ============================================
// 히스토리 / 캘린더 관련 함수
// ============================================

/**
 * 특정 날짜의 완료된 작업 목록 가져오기
 */
function getCompletedTasksByDate(dateStr) {
  const results = [];
  const seen = new Set();

  // 1. completionLog에서 조회 (영구 기록) — 동일 제목+시간도 각각 표시
  const logEntries = (appState.completionLog || {})[dateStr] || [];
  logEntries.forEach((e, idx) => {
    if (e._summary) return; // 압축된 요약 데이터 건너뛰기
    const key = 'log|' + idx + '|' + e.t + '|' + e.at;
    seen.add(key);
    // tasks 중복 체크용 별도 키도 등록
    const dedupKey = e.t + '|' + e.at;
    seen.add(dedupKey);
    results.push({
      title: e.t,
      category: e.c,
      completedAt: dateStr + 'T' + e.at,
      repeatType: e.r || null,
      expectedRevenue: e.rv || 0,
      estimatedTime: 0,
      fromLog: true,
      logIndex: idx  // completionLog 내 원래 인덱스 (수정/삭제용)
    });
  });

  // 2. appState.tasks에서 보완 (completionLog에 없는 항목)
  appState.tasks.forEach(t => {
    if (!t.completed || !t.completedAt) return;
    const completedDate = getLocalDateStr(new Date(t.completedAt));
    if (completedDate !== dateStr) return;
    const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
    const key = t.title + '|' + timeStr;
    if (!seen.has(key)) {
      seen.add(key);
      results.push(t);
    }
  });

  return results.sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
}

/**
 * 날짜별 완료 작업 수 맵 생성
 * @param {string} [habitTitle] - 특정 습관만 필터 (없으면 전체)
 */
function getCompletionMap(habitTitle) {
  const map = {};
  // completionLog 기반 (과거 영구 기록 포함)
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    (entries || []).forEach(e => {
      if (habitTitle && e.t !== habitTitle) return;
      if (e._summary) {
        if (!habitTitle) map[dateKey] = (map[dateKey] || 0) + (e.count || 0);
      } else {
        map[dateKey] = (map[dateKey] || 0) + 1;
      }
    });
  }
  // appState.tasks 현재 데이터로 보완 (completionLog와 중복되지 않는 항목만 추가)
  appState.tasks.forEach(t => {
    if (habitTitle && t.title !== habitTitle) return;
    if (t.completed && t.completedAt) {
      const dateKey = getLocalDateStr(new Date(t.completedAt));
      const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
      const logEntries = (appState.completionLog || {})[dateKey] || [];
      // completionLog에 같은 제목+시간 항목이 없는 경우만 카운트
      const isDuplicate = logEntries.some(e => e.t === t.title && e.at === timeStr);
      if (!isDuplicate) {
        map[dateKey] = (map[dateKey] || 0) + 1;
      }
    }
  });
  return map;
}

/**
 * 주간 통계 계산
 */
function getWeeklyStats() {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // 이번 주 일요일
  weekStart.setHours(0, 0, 0, 0);

  // completionLog 기반 일별 완료 수 계산
  const completionMap = getCompletionMap();
  const dailyCounts = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(weekStart.getDate() + i);
    const dayStr = getLocalDateStr(day);
    dailyCounts.push(completionMap[dayStr] || 0);
  }

  const totalCompleted = dailyCounts.reduce((a, b) => a + b, 0);
  const daysWithActivity = dailyCounts.filter(c => c > 0).length;
  const avgPerDay = daysWithActivity > 0 ? (totalCompleted / daysWithActivity).toFixed(1) : 0;

  return {
    total: totalCompleted,
    avgPerDay: avgPerDay,
    activeDays: daysWithActivity,
    dailyCounts: dailyCounts
  };
}

/**
 * 캘린더 이전 달로 이동
 */
function prevMonth() {
  appState.historyState.viewingMonth--;
  if (appState.historyState.viewingMonth < 0) {
    appState.historyState.viewingMonth = 11;
    appState.historyState.viewingYear--;
  }
  appState.historyState.selectedDate = null;
  renderStatic();
}

/**
 * 캘린더 다음 달로 이동
 */
function nextMonth() {
  appState.historyState.viewingMonth++;
  if (appState.historyState.viewingMonth > 11) {
    appState.historyState.viewingMonth = 0;
    appState.historyState.viewingYear++;
  }
  appState.historyState.selectedDate = null;
  renderStatic();
}

/**
 * 캘린더에서 날짜 선택
 */
function selectDate(dateStr) {
  if (appState.historyState.selectedDate === dateStr) {
    appState.historyState.selectedDate = null;
  } else {
    appState.historyState.selectedDate = dateStr;
  }
  renderStatic();
}

/**
 * 히스토리에서 날짜 그룹 토글
 */
function toggleHistoryDate(dateStr) {
  appState.historyState.expandedDates[dateStr] = !appState.historyState.expandedDates[dateStr];
  renderStatic();
}

function navigateHistoryPage(page) {
  appState.historyState.page = page;
  renderStatic();
}
window.navigateHistoryPage = navigateHistoryPage;

/**
 * 캘린더 렌더링 HTML 생성
 */
function renderCalendar() {
  const year = appState.historyState.viewingYear;
  const month = appState.historyState.viewingMonth;
  const completionMap = getCompletionMap();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();

  const today = new Date();
  const todayStr = getLocalDateStr(today);

  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월',
                      '7월', '8월', '9월', '10월', '11월', '12월'];

  let daysHtml = '';

  // 빈 칸 (이전 달)
  for (let i = 0; i < startDayOfWeek; i++) {
    daysHtml += '<div class="calendar-day empty"></div>';
  }

  // 날짜 칸
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const count = completionMap[dateStr] || 0;
    const isToday = dateStr === todayStr;
    const isSelected = dateStr === appState.historyState.selectedDate;

    // 활동 레벨 (1-4)
    let level = 0;
    if (count > 0) level = 1;
    if (count >= 3) level = 2;
    if (count >= 5) level = 3;
    if (count >= 7) level = 4;

    const classes = [
      'calendar-day',
      isToday ? 'today' : '',
      isSelected ? 'selected' : '',
      count > 0 ? 'has-activity' : '',
      count > 0 ? `level-${level}` : ''
    ].filter(Boolean).join(' ');

    daysHtml += `
      <div class="${classes}" onclick="selectDate('${dateStr}')">
        <span class="calendar-day-number">${day}</span>
        ${count > 0 ? '<span class="calendar-day-dot"></span>' : ''}
      </div>
    `;
  }

  return `
    <div class="calendar-container">
      <div class="calendar-header">
        <div class="calendar-title">${year}년 ${monthNames[month]}</div>
        <div class="calendar-nav">
          <button class="calendar-nav-btn" onclick="prevMonth()">◀</button>
          <button class="calendar-nav-btn" onclick="nextMonth()">▶</button>
        </div>
      </div>
      <div class="calendar-weekdays">
        <div class="calendar-weekday">일</div>
        <div class="calendar-weekday">월</div>
        <div class="calendar-weekday">화</div>
        <div class="calendar-weekday">수</div>
        <div class="calendar-weekday">목</div>
        <div class="calendar-weekday">금</div>
        <div class="calendar-weekday">토</div>
      </div>
      <div class="calendar-days">
        ${daysHtml}
      </div>
      <div class="calendar-legend">
        <div class="legend-item"><div class="legend-box empty"></div>없음</div>
        <div class="legend-item"><div class="legend-box level-1"></div>1-2개</div>
        <div class="legend-item"><div class="legend-box level-2"></div>3-4개</div>
        <div class="legend-item"><div class="legend-box level-3"></div>5-6개</div>
        <div class="legend-item"><div class="legend-box level-4"></div>7+개</div>
      </div>
    </div>
  `;
}

/**
 * 시간 입력 편의 파싱: 1430→14:30, 930→09:30, 9→09:00, 14:30→14:30
 */
function parseTimeInput(input) {
  if (!input) return null;
  const s = input.trim().replace(/[：]/, ':'); // 전각 콜론도 처리
  // 이미 HH:MM 형식
  if (/^\d{1,2}:\d{2}$/.test(s)) {
    const [h, m] = s.split(':').map(Number);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    return null;
  }
  // 숫자만 입력
  const digits = s.replace(/\D/g, '');
  if (!digits) return null;
  var h, m;
  if (digits.length === 4) { h = parseInt(digits.slice(0, 2)); m = parseInt(digits.slice(2)); }       // 1430
  else if (digits.length === 3) { h = parseInt(digits.slice(0, 1)); m = parseInt(digits.slice(1)); }   // 930
  else if (digits.length <= 2) { h = parseInt(digits); m = 0; }                                        // 9, 14
  else return null;
  if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  return null;
}

/**
 * completionLog 항목 추가 (과거 날짜에 완료 기록 추가)
 */
function addCompletionLogEntry(dateStr) {
  const title = prompt('제목:');
  if (title === null) return; // 취소
  if (!title.trim()) { showToast('제목을 입력해주세요', 'error'); return; }

  const categories = ['본업', '부업', '일상', '가족'];
  const catIdx = prompt('카테고리 (1:본업, 2:부업, 3:일상, 4:가족):', '3');
  if (catIdx === null) return;
  const cat = categories[parseInt(catIdx) - 1] || '일상';

  // 오늘이면 현재 시간, 과거 날짜면 12:00 기본값
  const todayStr = getLocalDateStr(new Date());
  const defaultTime = dateStr === todayStr ? new Date().toTimeString().slice(0, 5) : '12:00';
  const time = prompt('완료 시간 (예: 1430, 930, 9, 14:30):', defaultTime);
  if (time === null) return;
  const parsed = parseTimeInput(time);
  if (!parsed && time.trim()) {
    showToast('시간 형식이 올바르지 않아 기본값을 사용합니다', 'warning');
  }
  const finalTime = parsed || defaultTime;

  const revenueStr = prompt('수익 (원, 없으면 0):', '0');
  if (revenueStr === null) return;
  const revenue = parseInt(revenueStr) || 0;

  // completionLog에 추가
  if (!appState.completionLog) appState.completionLog = {};
  if (!appState.completionLog[dateStr]) appState.completionLog[dateStr] = [];
  appState.completionLog[dateStr].push({
    t: title.trim(),
    c: cat,
    at: finalTime,
    rv: revenue
  });

  saveState();
  recomputeTodayStats();
  renderStatic();
  showToast('기록이 추가되었습니다', 'success');
}
window.addCompletionLogEntry = addCompletionLogEntry;

/**
 * completionLog 항목 삭제 (과거 완료 기록 삭제)
 */
function deleteCompletionLogEntry(dateStr, index) {
  const entries = (appState.completionLog || {})[dateStr];
  if (!entries || !entries[index]) return;

  if (!confirm(`"${entries[index].t}" 기록을 삭제하시겠습니까?`)) return;

  entries.splice(index, 1);
  // 해당 날짜에 기록이 0개면 날짜 키 자체 제거
  if (entries.length === 0) delete appState.completionLog[dateStr];

  saveState();
  recomputeTodayStats();
  renderStatic();
  showToast('기록이 삭제되었습니다', 'success');
}
window.deleteCompletionLogEntry = deleteCompletionLogEntry;

/**
 * completionLog 항목 수정 (날짜/시간 변경)
 */
function editCompletionLogEntry(dateStr, index) {
  const entries = (appState.completionLog || {})[dateStr];
  if (!entries || !entries[index]) return;
  const entry = entries[index];

  // 모달 HTML
  const modalId = 'edit-log-modal';
  document.getElementById(modalId)?.remove();

  const modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'modal-overlay';
  modal.style.cssText = 'display:flex;z-index:10000';
  const categories = ['본업', '부업', '일상', '가족'];
  const catOptions = categories.map(c => `<option value="${c}" ${(entry.c || '일상') === c ? 'selected' : ''}>${c}</option>`).join('');
  modal.innerHTML = `
    <div class="modal" style="max-width:340px">
      <div class="modal-header">
        <h3 style="margin:0;font-size:16px">📝 기록 수정</h3>
        <button class="modal-close" onclick="document.getElementById('${modalId}').remove()" aria-label="닫기">×</button>
      </div>
      <div class="modal-body" style="padding:16px">
        <label style="display:block;margin-bottom:8px;font-size:15px;font-weight:600">제목</label>
        <input type="text" id="edit-log-title" value="${escapeHtml(entry.t)}" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:17px;margin-bottom:12px">
        <label style="display:block;margin-bottom:8px;font-size:15px;font-weight:600">카테고리</label>
        <select id="edit-log-category" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:17px;margin-bottom:12px">${catOptions}</select>
        <label style="display:block;margin-bottom:8px;font-size:15px;font-weight:600">날짜</label>
        <input type="date" id="edit-log-date" value="${dateStr}" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:17px;margin-bottom:12px">
        <label style="display:block;margin-bottom:8px;font-size:15px;font-weight:600">시간</label>
        <input type="text" id="edit-log-time" value="${escapeHtml(entry.at || '12:00')}" placeholder="HH:MM (예: 1430, 9:30)" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:17px">
      </div>
      <div class="modal-footer" style="padding:12px 16px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove()">취소</button>
        <button class="btn btn-primary" onclick="applyEditCompletionLog('${dateStr}', ${index})">저장</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // 오버레이 클릭으로 닫기
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
  document.getElementById('edit-log-title').focus();
}
window.editCompletionLogEntry = editCompletionLogEntry;

function applyEditCompletionLog(origDate, origIndex) {
  const entries = (appState.completionLog || {})[origDate];
  if (!entries || !entries[origIndex]) return;
  const entry = entries[origIndex];

  const newTitle = (document.getElementById('edit-log-title')?.value || '').trim();
  const newCategory = document.getElementById('edit-log-category')?.value || entry.c;
  const newDate = document.getElementById('edit-log-date').value;
  const rawTime = document.getElementById('edit-log-time').value;
  const newTime = parseTimeInput(rawTime);

  if (!newTitle) { showToast('제목을 입력해주세요', 'error'); return; }
  if (!newDate) { showToast('날짜를 입력해주세요', 'error'); return; }
  if (!newTime) { showToast('올바른 시간을 입력해주세요 (예: 14:30, 930)', 'error'); return; }

  // 기존 위치에서 제거
  entries.splice(origIndex, 1);
  if (entries.length === 0) delete appState.completionLog[origDate];

  // 새 위치에 추가
  if (!appState.completionLog[newDate]) appState.completionLog[newDate] = [];
  appState.completionLog[newDate].push({ ...entry, t: newTitle, c: newCategory, at: newTime });

  // 모달 닫기
  var modal = document.getElementById('edit-log-modal');
  if (modal) modal.remove();

  saveState();
  recomputeTodayStats();
  renderStatic();
  showToast('기록이 수정되었습니다', 'success');
}
window.applyEditCompletionLog = applyEditCompletionLog;

/**
 * 특정 날짜의 completionLog 전체 삭제
 */
function clearCompletionLogDate(dateStr) {
  const entries = (appState.completionLog || {})[dateStr];
  if (!entries || entries.length === 0) return;
  if (!confirm(`${dateStr} 기록 ${entries.length}개를 모두 삭제하시겠습니까?`)) return;

  delete appState.completionLog[dateStr];
  saveState();
  recomputeTodayStats();
  renderStatic();
  showToast(`${dateStr} 기록 ${entries.length}개 삭제됨`, 'success');
}
window.clearCompletionLogDate = clearCompletionLogDate;

/**
 * completionLog 기간별 삭제 모달
 */
function showClearLogRangeModal() {
  const modalId = 'clear-log-range-modal';
  document.getElementById(modalId)?.remove();

  const today = getLocalDateStr();
  const modal = document.createElement('div');
  modal.id = modalId;
  modal.className = 'modal-overlay';
  modal.style.cssText = 'display:flex;z-index:10000';
  modal.innerHTML = `
    <div class="modal" style="max-width:360px">
      <div class="modal-header">
        <h3 style="margin:0;font-size:16px">🗑️ 기록 기간 삭제</h3>
        <button class="modal-close" onclick="document.getElementById('${modalId}').remove()" aria-label="닫기">×</button>
      </div>
      <div class="modal-body" style="padding:16px">
        <div style="margin-bottom:12px;font-size:14px;color:var(--text-muted)">선택한 기간의 완료 기록(completionLog)을 삭제합니다.</div>
        <label style="display:block;margin-bottom:8px;font-size:15px;font-weight:600">시작 날짜</label>
        <input type="date" id="clear-log-from" value="" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:17px;margin-bottom:12px">
        <label style="display:block;margin-bottom:8px;font-size:15px;font-weight:600">종료 날짜</label>
        <input type="date" id="clear-log-to" value="${today}" style="width:100%;padding:10px;border-radius:8px;border:1px solid var(--border-color);background:var(--bg-secondary);color:var(--text-primary);font-size:17px">
      </div>
      <div class="modal-footer" style="padding:12px 16px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn btn-secondary" onclick="document.getElementById('${modalId}').remove()">취소</button>
        <button class="btn btn-primary" style="background:var(--accent-danger, #ff6b6b)" onclick="applyClearLogRange()">삭제</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}
window.showClearLogRangeModal = showClearLogRangeModal;

function applyClearLogRange() {
  const from = document.getElementById('clear-log-from').value;
  const to = document.getElementById('clear-log-to').value;
  if (!from || !to) { showToast('시작/종료 날짜를 모두 입력해주세요', 'error'); return; }
  if (from > to) { showToast('시작 날짜가 종료 날짜보다 뒤입니다', 'error'); return; }

  // 먼저 카운트만 계산
  const targetDates = [];
  let count = 0;
  for (const dateKey of Object.keys(appState.completionLog || {})) {
    if (dateKey >= from && dateKey <= to) {
      const entries = appState.completionLog[dateKey];
      const n = Array.isArray(entries) ? entries.filter(e => !e._summary).length : 0;
      if (n > 0) { targetDates.push(dateKey); count += n; }
    }
  }

  if (count === 0) { showToast('해당 기간에 삭제할 기록이 없습니다', 'warning'); return; }
  if (!confirm(`${from} ~ ${to} 기간의 기록 ${count}개를 삭제하시겠습니까?`)) return;

  // 확인 후 삭제
  targetDates.forEach(d => delete appState.completionLog[d]);

  document.getElementById('clear-log-range-modal')?.remove();
  saveState();
  recomputeTodayStats();
  renderStatic();
  showToast(`${count}개 기록 삭제됨 (${from} ~ ${to})`, 'success');
}
window.applyClearLogRange = applyClearLogRange;

/**
 * 선택된 날짜의 상세 정보 렌더링
 */
function renderDayDetail() {
  const selectedDate = appState.historyState.selectedDate;
  if (!selectedDate) return '';

  const tasks = getCompletedTasksByDate(selectedDate);
  const date = new Date(selectedDate);
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dateTitle = `${date.getMonth() + 1}월 ${date.getDate()}일 ${dayNames[date.getDay()]}요일`;

  // 총 소요 시간 + 수익 계산
  const totalTime = tasks.reduce((sum, t) => sum + (t.estimatedTime || 0), 0);
  const totalRevenue = tasks.reduce((sum, t) => sum + (t.expectedRevenue || 0), 0);

  // 라이프 리듬 정보 (해당 날짜)
  const rhythmData = (appState.lifeRhythm.history || {})[selectedDate];
  // 복약 정보
  const medsData = rhythmData ? (rhythmData.medications || {}) : {};
  const medSlots = getMedicationSlots ? getMedicationSlots() : [];

  return `
    <div class="day-detail">
      <div class="day-detail-header">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="day-detail-date">${dateTitle}</div>
          <div style="display:flex;gap:6px;">
            <button onclick="addCompletionLogEntry('${selectedDate}')"
              style="background:var(--accent-color);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:15px;cursor:pointer;white-space:nowrap;"
              aria-label="이 날짜에 기록 추가">${svgIcon('plus', 16)} 추가</button>
            ${(appState.completionLog || {})[selectedDate] && (appState.completionLog[selectedDate]).length > 0 ? `
              <button onclick="clearCompletionLogDate('${selectedDate}')"
                style="background:var(--accent-danger, #ff6b6b);color:#fff;border:none;border-radius:6px;padding:4px 10px;font-size:15px;cursor:pointer;white-space:nowrap;"
                aria-label="이 날짜 기록 전체 삭제">전체 삭제</button>
            ` : ''}
          </div>
        </div>
        <div class="day-detail-stats">
          <div class="day-detail-stat completed">✓ ${tasks.length}개 완료</div>
          ${totalRevenue > 0 ? `<div class="day-detail-stat">💰 ${totalRevenue.toLocaleString()}원</div>` : ''}
          ${totalTime > 0 ? `<div class="day-detail-stat">⏱ ${totalTime}분</div>` : ''}
        </div>
      </div>
      ${rhythmData ? `
        <div class="day-detail-rhythm" style="padding: 8px 12px; margin-bottom: 8px; background: var(--bg-secondary); border-radius: 8px; font-size: 15px;">
          <div style="display: flex; flex-wrap: wrap; gap: 8px;">
            ${rhythmData.wakeUp ? `<span>☀️ ${rhythmData.wakeUp}</span>` : ''}
            ${rhythmData.homeDepart ? `<span>🏠→ ${rhythmData.homeDepart}</span>` : ''}
            ${rhythmData.workArrive ? `<span>🏢 ${rhythmData.workArrive}</span>` : ''}
            ${rhythmData.workDepart ? `<span>🏢→ ${rhythmData.workDepart}</span>` : ''}
            ${rhythmData.homeArrive ? `<span>→🏠 ${rhythmData.homeArrive}</span>` : ''}
            ${rhythmData.sleep ? `<span>🌙 ${rhythmData.sleep}</span>` : ''}
          </div>
          ${Object.keys(medsData).length > 0 ? `
            <div style="margin-top: 4px; display: flex; flex-wrap: wrap; gap: 6px;">
              ${medSlots.map(slot => {
                const taken = medsData[slot.id];
                return taken ? `<span style="color: var(--accent-color);">${slot.icon || '💊'} ${slot.label} ${taken}</span>` :
                  `<span style="color: var(--text-muted);">${slot.icon || '💊'} ${slot.label} -</span>`;
              }).join('')}
            </div>
          ` : ''}
        </div>
      ` : ''}
      ${tasks.length > 0 ? `
        <div class="day-detail-list">
          ${tasks.map(task => {
            const completedTime = new Date(task.completedAt);
            const timeStr = completedTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            const cat = task.category || '기타';
            const revenue = task.expectedRevenue || 0;
            return `
              <div class="day-task-item">
                <div class="day-task-time">${timeStr}</div>
                <div class="day-task-content">
                  <div class="day-task-title completed">${escapeHtml(task.title)}</div>
                  <div class="day-task-meta">
                    <span class="category ${cat}">${escapeHtml(cat)}</span>
                    ${revenue > 0 ? ` · 💰${revenue.toLocaleString()}` : ''}
                    ${task.estimatedTime ? ` · ${task.estimatedTime}분` : ''}
                  </div>
                </div>
                ${task.fromLog && task.logIndex !== undefined ? `
                  <div class="day-task-actions" style="display:flex;gap:4px;align-items:center;">
                    <button onclick="editCompletionLogEntry('${selectedDate}', ${task.logIndex})"
                      style="background:none;border:none;cursor:pointer;padding:4px;font-size:16px;"
                      aria-label="기록 수정" title="수정">${svgIcon('edit', 14)}</button>
                    <button onclick="deleteCompletionLogEntry('${selectedDate}', ${task.logIndex})"
                      style="background:none;border:none;cursor:pointer;padding:4px;font-size:16px;"
                      aria-label="기록 삭제" title="삭제">❌</button>
                  </div>
                ` : `<div class="day-task-status">✅</div>`}
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="day-empty">
          <div class="day-empty-icon">📭</div>
          <div>이 날 완료한 작업이 없습니다</div>
          <button onclick="addCompletionLogEntry('${selectedDate}')"
            style="margin-top:12px;background:var(--accent-color);color:#fff;border:none;border-radius:8px;padding:8px 16px;font-size:16px;cursor:pointer;"
            aria-label="이 날짜에 기록 추가">${svgIcon('plus', 16)} 기록 추가</button>
        </div>
      `}
    </div>
  `;
}

/**
 * 최근 기록 리스트 렌더링
 */
function renderRecentHistory() {
  // completionLog + appState.tasks 통합 조회 (날짜별 그룹화)
  const grouped = {};

  // 1. completionLog 기반 (영구 기록)
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    if (!Array.isArray(entries)) continue; // 압축 데이터 스킵
    if (!grouped[dateKey]) grouped[dateKey] = [];
    entries.forEach((e, idx) => {
      if (e._summary) return; // 압축된 요약 데이터 건너뛰기
      grouped[dateKey].push({
        title: e.t,
        category: e.c,
        completedAt: dateKey + 'T' + e.at,
        expectedRevenue: e.rv || 0,
        _logDate: dateKey,
        _logIndex: idx
      });
    });
  }

  // 2. appState.tasks 보완 (completionLog에 없는 항목)
  appState.tasks.forEach(t => {
    if (!t.completed || !t.completedAt) return;
    const dateKey = getLocalDateStr(new Date(t.completedAt));
    if (!grouped[dateKey]) grouped[dateKey] = [];
    const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
    const exists = grouped[dateKey].some(e => {
      const eTime = new Date(e.completedAt).toTimeString().slice(0, 5);
      return e.title === t.title && eTime === timeStr;
    });
    if (!exists) {
      grouped[dateKey].push(t);
    }
  });

  const allDates = Object.keys(grouped);
  if (allDates.length === 0) {
    return `
      <div class="day-empty">
        <div class="day-empty-icon">📝</div>
        <div>아직 완료한 작업이 없습니다</div>
        <div style="margin-top: 10px; font-size: 16px; color: var(--text-secondary);">
          작업을 완료하면 여기에 기록됩니다
        </div>
      </div>
    `;
  }

  // 최근 날짜순 정렬 + 페이지네이션
  const sortedDates = allDates.sort((a, b) => new Date(b) - new Date(a));
  const page = appState.historyState.page || 0;
  const perPage = 7;
  const totalPages = Math.ceil(sortedDates.length / perPage);
  const pagedDates = sortedDates.slice(page * perPage, (page + 1) * perPage);

  return `
    <div class="history-list">
      ${pagedDates.map(dateStr => {
        const tasks = grouped[dateStr].sort((a, b) =>
          new Date(a.completedAt) - new Date(b.completedAt)
        );
        const date = new Date(dateStr);
        const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
        const isToday = dateStr === getLocalDateStr();
        const isYesterday = dateStr === getLocalDateStr(new Date(Date.now() - 86400000));

        let dateTitle;
        if (isToday) dateTitle = '오늘';
        else if (isYesterday) dateTitle = '어제';
        else dateTitle = `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayNames[date.getDay()]})`;

        const isExpanded = appState.historyState.expandedDates[dateStr];
        const dayRevenue = tasks.reduce((s, t) => s + (t.expectedRevenue || 0), 0);

        return `
          <div class="history-date-group">
            <div class="history-date-header" onclick="toggleHistoryDate('${dateStr}')">
              <div class="history-date-title">${dateTitle}</div>
              <div class="history-date-count">✓ ${tasks.length}개${dayRevenue > 0 ? ` · 💰${dayRevenue.toLocaleString()}` : ''} ${isExpanded ? '▲' : '▼'}</div>
            </div>
            <div class="history-date-tasks ${isExpanded ? 'show' : ''}">
              ${tasks.map(task => {
                const time = new Date(task.completedAt).toLocaleTimeString('ko-KR', {
                  hour: '2-digit', minute: '2-digit'
                });
                const hasLog = task._logDate !== undefined && task._logIndex !== undefined;
                return `
                  <div class="history-task">
                    <span class="history-task-check">✓</span>
                    <span class="history-task-title">${escapeHtml(task.title)}</span>
                    ${hasLog ? `<span class="history-task-time" onclick="editCompletionLogEntry('${task._logDate}', ${task._logIndex})" style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px" title="클릭하여 날짜/시간 수정">${time}</span>` : `<span class="history-task-time">${time}</span>`}
                    ${hasLog ? `<button class="btn-small delete" onclick="deleteCompletionLogEntry('${task._logDate}', ${task._logIndex})" title="기록 삭제" aria-label="기록 삭제" style="padding:2px 6px;font-size:14px;min-width:28px;min-height:28px;opacity:0.4;margin-left:4px;">×</button>` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
      ${totalPages > 1 ? `
        <div style="display: flex; justify-content: center; align-items: center; gap: 12px; margin-top: 16px; padding: 8px 0;">
          ${page > 0 ? `<button class="btn btn-secondary" onclick="navigateHistoryPage(${page - 1})" style="padding: 8px 16px;">◀ 이전</button>` : '<div style="width: 80px;"></div>'}
          <span style="font-size: 14px; color: var(--text-muted);">${page + 1} / ${totalPages}</span>
          ${page < totalPages - 1 ? `<button class="btn btn-secondary" onclick="navigateHistoryPage(${page + 1})" style="padding: 8px 16px;">다음 ▶</button>` : '<div style="width: 80px;"></div>'}
        </div>
      ` : ''}
    </div>
  `;
}
