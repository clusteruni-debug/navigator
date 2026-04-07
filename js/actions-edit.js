// ============================================
// 작업 수정 / CRUD
// 하위 모듈: actions-bulk.js
// ============================================

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
  const task = appState.tasks.find(t => t.id === appState.quickEditTaskId) || {};
  container.innerHTML = getQuickEditCategoryFields(category, task);
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
          <div class="quick-edit-subtask-item" data-orig-idx="${idx}">
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
            <div class="quick-edit-subtask-item" data-orig-idx="-1">
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
      <div class="quick-edit-subtask-item" data-orig-idx="-1">
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

  // 서브태스크 읽기 (data-orig-idx로 기존 완료 상태 보존)
  const subtaskItems = document.querySelectorAll('#quick-edit-subtask-list .quick-edit-subtask-item');
  const newSubtasks = [];
  subtaskItems.forEach(item => {
    const textInput = item.querySelector('.quick-edit-subtask-text');
    if (textInput) {
      const stText = textInput.value.trim();
      if (stText) {
        const origIdx = parseInt(item.dataset.origIdx);
        newSubtasks.push({ text: stText, completed: false, completedAt: null, _origIdx: isNaN(origIdx) ? -1 : origIdx });
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

      // 서브태스크: 인덱스 기반으로 기존 완료 상태 보존 (텍스트 변경 시에도 유지)
      const oldSubtasks = t.subtasks || [];
      updates.subtasks = newSubtasks.map(ns => {
        const origIdx = ns._origIdx;
        const existing = origIdx >= 0 && origIdx < oldSubtasks.length ? oldSubtasks[origIdx] : null;
        const { _origIdx, ...cleanNs } = ns;
        return existing ? { ...existing, text: cleanNs.text } : cleanNs;
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

