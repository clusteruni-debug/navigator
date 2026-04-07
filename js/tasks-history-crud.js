// ============================================
// 완료 기록 CRUD (추가/편집/삭제/범위정리)
// (tasks-history.js에서 분리)
// ============================================

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

  // Soft-Delete: 동기화 시 부활 방지
  const entry = entries[index];
  const delKey = dateStr + '|' + (entry.t || '') + '|' + (entry.at || '');
  if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};
  appState.deletedIds.completionLog[delKey] = new Date().toISOString();

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
 * tasks에서 온 완료 기록을 히스토리에서 숨기기
 * (completionLog에 없는 항목도 deletedIds에 등록하여 비표시)
 */
function hideTaskFromHistory(dateStr, title, timeStr) {
  if (!confirm(`"${title}" 기록을 히스토리에서 숨기시겠습니까?`)) return;

  if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};
  const delKey = dateStr + '|' + title + '|' + timeStr;
  appState.deletedIds.completionLog[delKey] = new Date().toISOString();

  saveState();
  recomputeTodayStats();
  renderStatic();
  showToast('기록이 숨겨졌습니다', 'success');
}
window.hideTaskFromHistory = hideTaskFromHistory;

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

  // Soft-Delete: 원본 항목 삭제 기록 (동기화 부활 방지)
  const delKey = origDate + '|' + (entry.t || '') + '|' + (entry.at || '');
  if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};
  appState.deletedIds.completionLog[delKey] = new Date().toISOString();

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

  // Soft-Delete: 모든 항목 삭제 기록 추가
  if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};
  const now = new Date().toISOString();
  // 1) completionLog 항목
  entries.forEach(e => {
    if (e._summary) return;
    const delKey = dateStr + '|' + (e.t || '') + '|' + (e.at || '');
    appState.deletedIds.completionLog[delKey] = now;
  });
  // 2) tasks 완료 항목 (해당 날짜, completionLog에 없는 것도 히스토리에서 숨기기)
  appState.tasks.forEach(t => {
    if (!t.completed || !t.completedAt) return;
    const completedDate = getLocalDateStr(new Date(t.completedAt));
    if (completedDate !== dateStr) return;
    const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
    const delKey = dateStr + '|' + (t.title || '') + '|' + timeStr;
    appState.deletedIds.completionLog[delKey] = now;
  });

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
        <button class="btn btn-primary" style="background:var(--accent-danger)" onclick="applyClearLogRange()">삭제</button>
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

  // Soft-Delete: 모든 대상 항목 삭제 기록 추가
  if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};
  const now = new Date().toISOString();
  // 1) completionLog 항목
  targetDates.forEach(d => {
    (appState.completionLog[d] || []).forEach(e => {
      if (e._summary) return;
      const delKey = d + '|' + (e.t || '') + '|' + (e.at || '');
      appState.deletedIds.completionLog[delKey] = now;
    });
  });
  // 2) tasks 완료 항목 (해당 기간 내, completionLog에 없는 것도 히스토리에서 숨기기)
  appState.tasks.forEach(t => {
    if (!t.completed || !t.completedAt) return;
    const dateKey = getLocalDateStr(new Date(t.completedAt));
    if (dateKey < from || dateKey > to) return;
    const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
    const delKey = dateKey + '|' + (t.title || '') + '|' + timeStr;
    appState.deletedIds.completionLog[delKey] = now;
  });

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
 * completionLog 전체 삭제
 */
function clearAllCompletionLog() {
  // completionLog + tasks 완료 항목 모두 카운트
  let count = 0;
  const allDates = Object.keys(appState.completionLog || {});
  allDates.forEach(d => {
    const entries = appState.completionLog[d];
    if (Array.isArray(entries)) count += entries.filter(e => !e._summary).length;
  });
  // tasks에서 완료된 항목도 카운트 (completionLog와 중복 제외)
  const taskOnlyCount = appState.tasks.filter(t => {
    if (!t.completed || !t.completedAt) return false;
    const dateKey = getLocalDateStr(new Date(t.completedAt));
    const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
    const logEntries = (appState.completionLog || {})[dateKey] || [];
    return !logEntries.some(e => e.t === t.title && e.at === timeStr);
  }).length;
  count += taskOnlyCount;

  if (count === 0) { showToast('삭제할 기록이 없습니다', 'warning'); return; }
  if (!confirm(`완료 기록 ${count}개를 전부 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) return;

  // Soft-Delete: 모든 항목 삭제 기록 추가
  if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};
  const now = new Date().toISOString();
  // 1) completionLog 항목
  allDates.forEach(d => {
    (appState.completionLog[d] || []).forEach(e => {
      if (e._summary) return;
      const delKey = d + '|' + (e.t || '') + '|' + (e.at || '');
      appState.deletedIds.completionLog[delKey] = now;
    });
  });
  // 2) tasks 완료 항목 (completionLog에 없는 것도 히스토리에서 숨기기)
  appState.tasks.forEach(t => {
    if (!t.completed || !t.completedAt) return;
    const dateKey = getLocalDateStr(new Date(t.completedAt));
    const timeStr = new Date(t.completedAt).toTimeString().slice(0, 5);
    const delKey = dateKey + '|' + (t.title || '') + '|' + timeStr;
    appState.deletedIds.completionLog[delKey] = now;
  });

  appState.completionLog = {};
  saveState();
  recomputeTodayStats();
  renderStatic();
  showToast(`${count}개 기록 전체 삭제됨`, 'success');
}
window.clearAllCompletionLog = clearAllCompletionLog;
