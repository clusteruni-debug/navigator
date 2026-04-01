// ============================================
// 작업 수정 / CRUD / 일괄 작업
// (actions.js에서 분리)
// ============================================

/**
 * 완료 날짜 수정
 */
function editCompletedAt(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task || !task.completedAt) return;

  const oldDate = new Date(task.completedAt);
  if (isNaN(oldDate.getTime())) { showToast('완료 날짜가 올바르지 않습니다', 'error'); return; }
  // datetime-local은 로컬 시간 기준이므로 로컬 시간으로 변환
  const pad = (n) => String(n).padStart(2, '0');
  const oldDateStr = oldDate.getFullYear() + '-' + pad(oldDate.getMonth() + 1) + '-' + pad(oldDate.getDate()) + 'T' + pad(oldDate.getHours()) + ':' + pad(oldDate.getMinutes());

  // 모달 생성
  const modalHtml = `
    <div class="work-modal-overlay" id="edit-completed-modal" onclick="if(event.target===this) closeEditCompletedModal()">
      <div class="work-modal" onclick="event.stopPropagation()">
        <div class="work-modal-header">
          <h3>완료 날짜 수정</h3>
          <button class="work-modal-close" onclick="closeEditCompletedModal()">✕</button>
        </div>
        <div class="work-modal-body">
          <div class="work-modal-field">
            <label class="work-modal-label">완료 시각</label>
            <input type="datetime-local" class="work-modal-input" id="edit-completed-datetime" value="${oldDateStr}">
          </div>
          <div style="margin-top:8px;font-size:14px;color:var(--text-muted)">
            작업: ${escapeHtml(task.title)}
          </div>
        </div>
        <div class="work-modal-footer">
          <button class="work-modal-btn secondary" onclick="closeEditCompletedModal()">취소</button>
          <button class="work-modal-btn primary" onclick="saveCompletedAt('${id}')">저장</button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
  document.getElementById('edit-completed-datetime').focus();
}
window.editCompletedAt = editCompletedAt;

function closeEditCompletedModal() {
  const modal = document.getElementById('edit-completed-modal');
  if (modal) modal.remove();
}
window.closeEditCompletedModal = closeEditCompletedModal;

function saveCompletedAt(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  const input = document.getElementById('edit-completed-datetime');
  const newDateStr = input.value;
  if (!newDateStr) {
    showToast('날짜를 선택해주세요', 'error');
    return;
  }

  const newDate = new Date(newDateStr);
  const oldDate = task.completedAt ? new Date(task.completedAt) : null;

  // completionLog 업데이트
  if (oldDate) {
    const oldLogDate = getLocalDateStr(oldDate);
    const oldLogTime = oldDate.toTimeString().slice(0, 5);
    if (appState.completionLog[oldLogDate]) {
      const idx = appState.completionLog[oldLogDate].findIndex(
        e => e.t === task.title && e.at === oldLogTime
      );
      if (idx !== -1) {
        // Soft-Delete: 동기화 부활 방지
        const delKey = oldLogDate + '|' + task.title + '|' + oldLogTime;
        if (!appState.deletedIds.completionLog) appState.deletedIds.completionLog = {};
        appState.deletedIds.completionLog[delKey] = new Date().toISOString();

        appState.completionLog[oldLogDate].splice(idx, 1);
        if (appState.completionLog[oldLogDate].length === 0) {
          delete appState.completionLog[oldLogDate];
        }
      }
    }
  }

  // 새 날짜로 completionLog 추가
  const newLogDate = getLocalDateStr(newDate);
  const newLogTime = newDate.toTimeString().slice(0, 5);
  if (!appState.completionLog[newLogDate]) {
    appState.completionLog[newLogDate] = [];
  }
  appState.completionLog[newLogDate].push({
    t: task.title,
    c: task.category,
    at: newLogTime,
    rv: Number(task.expectedRevenue) || 0
  });
  saveCompletionLog();

  // 태스크 업데이트
  appState.tasks = appState.tasks.map(t =>
    t.id === id ? { ...t, completedAt: newDate.toISOString(), updatedAt: new Date().toISOString() } : t
  );
  saveState();

  closeEditCompletedModal();
  renderStatic();
  showToast('완료 날짜 수정됨', 'success');
}
window.saveCompletedAt = saveCompletedAt;

/**
 * 작업 수정 모드 진입 (빠른 수정 모달로 변경)
 */
function editTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  // 빠른 수정 모달 열기 (탭 이동 없음)
  appState.quickEditTaskId = id;
  showQuickEditModal(task);
}

/**
 * 카테고리별 추가 입력 필드 HTML 반환
 */
function getQuickEditCategoryFields(category, task) {
  switch (category) {
    case '부업': {
      const organizerOptions = (appState.organizerList || [])
        .map(o => `<option value="${escapeHtml(o)}">`)
        .join('');
      return `
        <datalist id="organizer-datalist">${organizerOptions}</datalist>
        <div class="work-modal-field">
          <label class="work-modal-label">주최자</label>
          <input type="text" class="work-modal-input" id="quick-edit-organizer"
            list="organizer-datalist"
            placeholder="주최자 입력 또는 선택"
            value="${escapeHtml(task.organizer || '')}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">이벤트 종류</label>
          <select class="work-modal-input" id="quick-edit-eventType">
            <option value="">선택 안 함</option>
            <option value="의견작성" ${(task.eventType||'') === '의견작성' ? 'selected' : ''}>의견작성</option>
            <option value="리캡작성" ${(task.eventType||'') === '리캡작성' ? 'selected' : ''}>리캡작성</option>
            <option value="AMA참여" ${(task.eventType||'') === 'AMA참여' ? 'selected' : ''}>AMA참여</option>
            <option value="아티클작성" ${(task.eventType||'') === '아티클작성' ? 'selected' : ''}>아티클작성</option>
            <option value="영상제작" ${(task.eventType||'') === '영상제작' ? 'selected' : ''}>영상제작</option>
            <option value="커뮤니티" ${(task.eventType||'') === '커뮤니티' ? 'selected' : ''}>커뮤니티</option>
            <option value="기타" ${(task.eventType||'') === '기타' ? 'selected' : ''}>기타</option>
          </select>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">예상 수익 (원)</label>
          <input type="number" class="work-modal-input" id="quick-edit-revenue" value="${task.expectedRevenue || ''}">
        </div>
      `;
    }
    case '본업':
      return ''; // 본업은 본업 탭에서 직접 추가
    case '일상':
    case '가족':
      return `
        <div class="work-modal-field">
          <label class="work-modal-label">예상 시간 (분)</label>
          <input type="number" class="work-modal-input" id="quick-edit-time" value="${task.estimatedTime || ''}" min="1">
        </div>
      `;
    default:
      return '';
  }
}

/**
 * 카테고리 변경 시 추가 필드 업데이트
 */
function updateQuickEditCategoryFields(category) {
  const container = document.getElementById('quick-edit-category-fields');
  if (!container) return;
  container.innerHTML = getQuickEditCategoryFields(category, {});
}
window.updateQuickEditCategoryFields = updateQuickEditCategoryFields;

/**
 * 빠른 수정 모달 표시
 */
function showQuickEditModal(task) {
  const modal = document.getElementById('quick-edit-modal');
  const body = document.getElementById('quick-edit-body');

  body.innerHTML = `
    <div class="work-modal-field">
      <label class="work-modal-label">제목</label>
      <input type="text" class="work-modal-input" id="quick-edit-title" value="${escapeHtml(task.title)}" autofocus>
    </div>
    <div class="work-modal-field">
      <label class="work-modal-label">설명 (선택)</label>
      <textarea class="work-modal-textarea" id="quick-edit-description" placeholder="작업 내용, 메모 등">${escapeHtml(task.description || '')}</textarea>
    </div>
    <div class="work-modal-field">
      <label class="work-modal-label">카테고리</label>
      <select class="work-modal-input" id="quick-edit-category" onchange="updateQuickEditCategoryFields(this.value)">
        <option value="본업" ${task.category === '본업' ? 'selected' : ''}>💼 본업</option>
        <option value="부업" ${task.category === '부업' ? 'selected' : ''}>💰 부업</option>
        <option value="일상" ${task.category === '일상' ? 'selected' : ''}>🌅 일상</option>
        <option value="가족" ${task.category === '가족' ? 'selected' : ''}>👨‍👩‍👧 가족</option>
      </select>
    </div>
    <div class="work-modal-field-row">
      <div class="work-modal-field half">
        <label class="work-modal-label">시작일</label>
        <input type="datetime-local" class="work-modal-input" id="quick-edit-startDate" value="${task.startDate || ''}">
      </div>
      <div class="work-modal-field half">
        <label class="work-modal-label">마감일</label>
        <input type="datetime-local" class="work-modal-input" id="quick-edit-deadline" value="${task.deadline || ''}">
      </div>
    </div>
    <div id="quick-edit-category-fields">
      ${getQuickEditCategoryFields(task.category, task)}
    </div>
    <div class="work-modal-field">
      <label class="work-modal-label">링크 (선택)</label>
      <input type="url" class="work-modal-input" id="quick-edit-link" placeholder="https://..." value="${escapeHtml(task.link || '')}">
    </div>
    <div class="work-modal-field">
      <label class="work-modal-label">서브태스크</label>
      <div class="quick-edit-subtask-list" id="quick-edit-subtask-list">
        ${(task.subtasks || []).map((st, idx) => `
          <div class="quick-edit-subtask-item">
            <textarea class="quick-edit-subtask-text" rows="1" placeholder="서브태스크 이름">${escapeHtml(st.text)}</textarea>
            <button class="quick-edit-subtask-remove" onclick="removeQuickEditSubtask(this)" type="button">×</button>
          </div>
        `).join('')}
      </div>
      <div class="quick-edit-subtask-add">
        <textarea id="quick-edit-new-subtask" rows="1" placeholder="새 서브태스크 추가 후 Enter (여러 줄 붙여넣기 가능)"></textarea>
        <button class="quick-edit-subtask-add-btn" onclick="addQuickEditSubtask()" type="button">+</button>
      </div>
    </div>
  `;

  modal.classList.add('show');

  // textarea Tab키 + auto-resize 초기화
  body.querySelectorAll('textarea').forEach(ta => initEnhancedTextarea(ta));

  // 엔터키로 저장 (제목 필드)
  body.querySelector('#quick-edit-title').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') saveQuickEdit();
  });

  // 엔터키로 서브태스크 추가 (Shift+Enter는 줄바꿈 허용)
  const newSubInput = body.querySelector('#quick-edit-new-subtask');
  if (newSubInput) {
    newSubInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        addQuickEditSubtask();
      }
    });
    // 붙여넣기 시 불렛 포인트 자동 분리
    newSubInput.addEventListener('paste', (e) => {
      if (!e.clipboardData) return;
      const pastedText = e.clipboardData.getData('text');
      const lines = parseBulletLines(pastedText);
      if (lines.length > 1) {
        e.preventDefault();
        const list = document.getElementById('quick-edit-subtask-list');
        if (!list) return;
        lines.forEach(line => {
          const itemHtml = `
            <div class="quick-edit-subtask-item">
              <textarea class="quick-edit-subtask-text" rows="1" placeholder="서브태스크 이름">${escapeHtml(line)}</textarea>
              <button class="quick-edit-subtask-remove" onclick="removeQuickEditSubtask(this)" type="button">×</button>
            </div>
          `;
          list.insertAdjacentHTML('beforeend', itemHtml);
          const newTa = list.lastElementChild.querySelector('textarea');
          if (newTa) initEnhancedTextarea(newTa);
        });
        newSubInput.value = '';
      }
    });
  }
}

/**
 * 빠른 수정 모달: 서브태스크 추가
 */
function addQuickEditSubtask() {
  const input = document.getElementById('quick-edit-new-subtask');
  if (!input) return;
  const rawText = input.value.trim();
  if (!rawText) return;

  const list = document.getElementById('quick-edit-subtask-list');
  if (!list) return;

  const lines = parseBulletLines(rawText);
  lines.forEach(text => {
    const itemHtml = `
      <div class="quick-edit-subtask-item">
        <textarea class="quick-edit-subtask-text" rows="1" placeholder="서브태스크 이름">${escapeHtml(text)}</textarea>
        <button class="quick-edit-subtask-remove" onclick="removeQuickEditSubtask(this)" type="button">×</button>
      </div>
    `;
    list.insertAdjacentHTML('beforeend', itemHtml);
    const newTa = list.lastElementChild.querySelector('textarea');
    if (newTa) initEnhancedTextarea(newTa);
  });
  input.value = '';
  input.style.height = 'auto'; // auto-resize 리셋
  input.focus();
}
window.addQuickEditSubtask = addQuickEditSubtask;

/**
 * 빠른 수정 모달: 서브태스크 제거
 */
function removeQuickEditSubtask(btn) {
  const item = btn.closest('.quick-edit-subtask-item');
  if (item) item.remove();
}
window.removeQuickEditSubtask = removeQuickEditSubtask;

/**
 * 빠른 수정 모달 닫기
 */
function closeQuickEditModal() {
  const modal = document.getElementById('quick-edit-modal');
  modal.classList.remove('show');
  appState.quickEditTaskId = null;
}
window.closeQuickEditModal = closeQuickEditModal;

/**
 * 빠른 수정 저장
 */
function saveQuickEdit() {
  const id = appState.quickEditTaskId;
  if (!id) return;

  const title = document.getElementById('quick-edit-title').value.trim();
  if (!title) {
    showToast('제목을 입력하세요', 'error');
    return;
  }

  const description = document.getElementById('quick-edit-description').value.trim();
  const category = document.getElementById('quick-edit-category').value;
  const startDate = document.getElementById('quick-edit-startDate').value;
  const deadline = document.getElementById('quick-edit-deadline').value;

  // 카테고리별 추가 필드
  const timeEl = document.getElementById('quick-edit-time');
  const revenueEl = document.getElementById('quick-edit-revenue');
  const organizerEl = document.getElementById('quick-edit-organizer');
  const eventTypeEl = document.getElementById('quick-edit-eventType');
  const linkEl = document.getElementById('quick-edit-link');

  // 주최자 목록 자동 추가 — map() 밖에서 처리
  if (organizerEl) {
    const org = organizerEl.value.trim();
    if (org && !(appState.organizerList || []).includes(org)) {
      appState.organizerList = [...(appState.organizerList || []), org];
    }
  }

  // 서브태스크 읽기
  const subtaskItems = document.querySelectorAll('#quick-edit-subtask-list .quick-edit-subtask-item');
  const newSubtasks = [];
  subtaskItems.forEach(item => {
    const textInput = item.querySelector('.quick-edit-subtask-text');
    if (textInput) {
      const stText = textInput.value.trim();
      if (stText) {
        newSubtasks.push({ text: stText, completed: false, completedAt: null });
      }
    }
  });

  appState.tasks = appState.tasks.map(t => {
    if (t.id === id) {
      const updates = {
        title,
        description,
        category,
        startDate,
        deadline,
        updatedAt: new Date().toISOString()
      };
      if (timeEl) updates.estimatedTime = parseInt(timeEl.value) || null;
      if (revenueEl) updates.expectedRevenue = parseInt(revenueEl.value) || null;
      if (organizerEl) updates.organizer = organizerEl.value.trim();
      if (eventTypeEl) updates.eventType = eventTypeEl.value;
      if (linkEl) updates.link = linkEl.value;

      // 서브태스크: 기존 완료 상태 보존 (trim 비교로 공백 차이 허용)
      const oldSubtasks = t.subtasks || [];
      updates.subtasks = newSubtasks.map(ns => {
        const existing = oldSubtasks.find(os => os.text.trim() === ns.text.trim());
        return existing ? { ...existing, text: ns.text } : ns;
      });

      return { ...t, ...updates };
    }
    return t;
  });

  saveState();
  closeQuickEditModal();
  renderStatic();
  showToast('수정 완료', 'success');
}
window.saveQuickEdit = saveQuickEdit;

/**
 * 상세 편집으로 이동
 */
function openFullEdit() {
  const id = appState.quickEditTaskId;
  if (!id) return;

  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  closeQuickEditModal();

  appState.detailedTask = { ...task };
  appState._detailedShowDeadline = !!(task.startDate || task.deadline);
  appState.showDetailedAdd = true;
  appState.editingTaskId = id;
  appState.currentTab = 'action';
  renderStatic();

  setTimeout(() => {
    const formEl = document.querySelector('.add-task-section');
    if (formEl) {
      formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, 100);
}
window.openFullEdit = openFullEdit;

/**
 * Article Editor 연동 — Task 내용으로 아티클 에디터 열기
 * URL은 설정에서 변경 가능 (기본: localhost:3000)
 */
const ARTICLE_EDITOR_URL = 'https://article-editor-ruddy.vercel.app';
function openArticleEditor(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;
  const params = new URLSearchParams();
  params.set('keyword', task.title || '');
  if (task.description) params.set('summary', task.description);
  const url = `${ARTICLE_EDITOR_URL}/editor?${params.toString()}`;
  handleGo(url);
}
window.openArticleEditor = openArticleEditor;

/**
 * 수정 취소
 */
function cancelEdit() {
  appState.detailedTask = {
    title: '',
    category: '부업',
    startDate: '',
    deadline: '',
    estimatedTime: 10,
    link: '',
    expectedRevenue: '',
    description: '',
    repeatType: 'none',
    repeatDays: [],
    repeatMonthDay: null,
    repeatInterval: null,
    organizer: '',
    eventType: '',
    tags: [],
    subtasks: []
  };
  appState.showDetailedAdd = false;
  appState.editingTaskId = null;
  appState._detailedShowDeadline = undefined;
  renderStatic();
}

/**
 * 작업 삭제
 */
function deleteTask(id) {
  if (!confirm('정말 삭제하시겠습니까? (휴지통에서 복원 가능)')) return;

  const task = appState.tasks.find(t => t.id === id);
  if (task) {
    // 휴지통으로 이동 (30일 보관)
    appState.trash.push({ ...task, deletedAt: new Date().toISOString() });
  }
  // Soft-Delete: 삭제 기록 남기기 (동기화 시 부활 방지)
  appState.deletedIds.tasks[id] = new Date().toISOString();
  appState.tasks = appState.tasks.filter(t => t.id !== id);
  // UI 상태 정리: 접힌 서브태스크 칩 제거
  if (appState.collapsedSubtaskChips && appState.collapsedSubtaskChips[id]) {
    delete appState.collapsedSubtaskChips[id];
    try { localStorage.setItem('navigator-collapsed-subtask-chips', JSON.stringify(appState.collapsedSubtaskChips)); } catch (_) {}
  }
  saveState();
  renderStatic();
  showToast('휴지통으로 이동했습니다 (30일 보관)', 'success');
  srAnnounce('작업 삭제됨');
}

/**
 * 이벤트 일괄 선택 모드 토글
 */
function toggleEventBulkSelect() {
  _eventBulkSelectMode = !_eventBulkSelectMode;
  _eventBulkSelectedIds.clear();
  renderStatic();
}

/**
 * 이벤트 개별 선택 토글
 */
function toggleEventSelection(id) {
  if (_eventBulkSelectedIds.has(id)) {
    _eventBulkSelectedIds.delete(id);
  } else {
    _eventBulkSelectedIds.add(id);
  }
  renderStatic();
}

/**
 * 이벤트 전체 선택/해제
 */
function toggleEventSelectAll() {
  // 로컬 이벤트만 선택 대상 (Supabase 수신 이벤트는 벌크 선택 불가)
  const localEvents = appState.tasks.filter(t => t.category === '부업' && !(t.source && t.source.type === 'telegram-event'));
  if (_eventBulkSelectedIds.size === localEvents.length) {
    _eventBulkSelectedIds.clear();
  } else {
    localEvents.forEach(t => _eventBulkSelectedIds.add(t.id));
  }
  renderStatic();
}

/**
 * 선택된 이벤트 일괄 삭제 (soft-delete)
 */
function bulkDeleteEvents() {
  const count = _eventBulkSelectedIds.size;
  if (count === 0) return;
  if (!confirm(count + '개 이벤트를 삭제하시겠습니까? (휴지통에서 복원 가능)')) return;

  const now = new Date().toISOString();
  _eventBulkSelectedIds.forEach(id => {
    const task = appState.tasks.find(t => t.id === id);
    if (task) {
      appState.trash.push({ ...task, deletedAt: now });
    }
    appState.deletedIds.tasks[id] = now;
  });
  appState.tasks = appState.tasks.filter(t => !_eventBulkSelectedIds.has(t.id));

  _eventBulkSelectedIds.clear();
  _eventBulkSelectMode = false;

  saveState();
  renderStatic();
  showToast(count + '개 이벤트가 삭제되었습니다', 'success');
}

/**
 * 이벤트 그룹 접기/펼치기
 */
function toggleEventGroup(groupId) {
  if (_collapsedEventGroups.has(groupId)) {
    _collapsedEventGroups.delete(groupId);
  } else {
    _collapsedEventGroups.add(groupId);
  }
  renderStatic();
}

/**
 * 휴지통에서 태스크 복원
 */
function restoreFromTrash(id) {
  const idx = appState.trash.findIndex(t => t.id === id);
  if (idx === -1) return;

  const task = { ...appState.trash[idx] };
  delete task.deletedAt;

  // deletedIds에서도 제거 (동기화 시 다시 삭제되지 않도록)
  delete appState.deletedIds.tasks[id];
  if (appState.deletedIds.trash) delete appState.deletedIds.trash[id];

  appState.tasks.push(task);
  appState.trash.splice(idx, 1);
  saveState();
  renderStatic();
  showToast('"' + (task.title || '작업') + '" 복원되었습니다', 'success');
}

/**
 * 휴지통에서 영구 삭제
 */
function permanentDeleteFromTrash(id) {
  if (!confirm('영구 삭제하면 복원할 수 없습니다. 진행하시겠습니까?')) return;
  // Soft-Delete: 동기화 시 부활 방지
  if (!appState.deletedIds.trash) appState.deletedIds.trash = {};
  appState.deletedIds.trash[id] = new Date().toISOString();
  appState.trash = appState.trash.filter(t => t.id !== id);
  saveState();
  renderStatic();
  showToast('영구 삭제되었습니다', 'info');
}

/**
 * 휴지통 비우기
 */
function emptyTrash() {
  if (appState.trash.length === 0) return;
  if (!confirm('휴지통을 비우면 ' + appState.trash.length + '개 항목이 영구 삭제됩니다. 진행하시겠습니까?')) return;
  // Soft-Delete: 모든 휴지통 항목의 삭제 기록 추가 (동기화 시 부활 방지)
  if (!appState.deletedIds.trash) appState.deletedIds.trash = {};
  const now = new Date().toISOString();
  appState.trash.forEach(t => {
    appState.deletedIds.trash[t.id] = now;
  });
  appState.trash = [];
  saveState();
  renderStatic();
  showToast('휴지통을 비웠습니다', 'info');
}

/**
 * 30일 이상 된 휴지통 항목 자동 정리
 */
function cleanupOldTrash() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const before = appState.trash.length;
  // Soft-Delete: 만료 항목도 deletedIds에 기록 (동기화 시 부활 방지)
  if (!appState.deletedIds.trash) appState.deletedIds.trash = {};
  const now = new Date().toISOString();
  appState.trash.forEach(t => {
    if (!t.deletedAt || t.deletedAt <= thirtyDaysAgo) {
      appState.deletedIds.trash[t.id] = now;
    }
  });
  appState.trash = appState.trash.filter(t => t.deletedAt && t.deletedAt > thirtyDaysAgo);
  if (appState.trash.length < before) {
    console.log('[trash] ' + (before - appState.trash.length) + '개 만료 항목 정리');
  }
}

/**
 * 이벤트 그룹별 전체 선택
 */
function toggleEventGroupSelect(taskIds) {
  // taskIds 배열의 모든 항목이 이미 선택되어 있으면 해제, 아니면 전체 선택
  const allSelected = taskIds.every(id => _eventBulkSelectedIds.has(id));
  if (allSelected) {
    taskIds.forEach(id => _eventBulkSelectedIds.delete(id));
  } else {
    taskIds.forEach(id => _eventBulkSelectedIds.add(id));
  }
  renderStatic();
}

/**
 * 작업 복사
 */
function copyTask(id) {
  const task = appState.tasks.find(t => t.id === id);
  if (!task) return;

  const now = new Date().toISOString();
  const newTask = {
    ...task,
    id: generateId(),
    title: task.title + ' (복사)',
    completed: false,
    createdAt: now,
    updatedAt: now
  };

  appState.tasks.push(newTask);
  saveState();
  renderStatic();
  showToast('작업이 복사되었습니다', 'success');
}
