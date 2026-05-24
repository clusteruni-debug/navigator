// ============================================
// 렌더링 - 일상 탭
// ============================================

const LIFE_RHYTHM_ITEMS = [
  { key: 'wakeUp', label: '기상', icon: 'sun' },
  { key: 'homeDepart', label: '오전', icon: 'arrow-right' },
  { key: 'workArrive', label: '점심', icon: 'coffee' },
  { key: 'workDepart', label: '오후', icon: 'briefcase' },
  { key: 'homeArrive', label: '저녁', icon: 'home' },
  { key: 'sleep', label: '취침', icon: 'moon' }
];

function _lifeIcon(name, size = 16, className = 'life-svg-icon') {
  if (typeof _renderActionIcon === 'function') {
    const icon = _renderActionIcon(name, size, className);
    if (icon) return icon;
  }
  if (typeof svgIcon === 'function') return svgIcon(name, size);
  return '';
}

function _getTodayLifeRhythm() {
  const today = getLogicalDate();
  const lifeRhythm = appState.lifeRhythm || {};
  const todayBlock = lifeRhythm.today || {};
  const fallback = {
    date: today,
    wakeUp: null,
    homeDepart: null,
    workArrive: null,
    workDepart: null,
    homeArrive: null,
    sleep: null,
    medications: {}
  };
  return todayBlock.date === today ? Object.assign({}, fallback, todayBlock) : fallback;
}

function _getLifeRhythmItems() {
  const rhythm = _getTodayLifeRhythm();
  return LIFE_RHYTHM_ITEMS.map(item => Object.assign({}, item, { value: rhythm[item.key] || null }));
}

function _getLifeMedicationRecords(todayRhythm) {
  if (typeof _getActionMedicationRecords === 'function') return _getActionMedicationRecords(todayRhythm);
  return Object.assign({}, (todayRhythm && todayRhythm.medications) || {});
}

function _getLifeMedicationSummary() {
  const slots = (typeof getMedicationSlots === 'function') ? getMedicationSlots() : [];
  const todayRhythm = _getTodayLifeRhythm();
  const records = _getLifeMedicationRecords(todayRhythm);
  const withIndex = slots.map((slot, idx) => ({ slot: slot, idx: idx }));
  const visible = withIndex.filter(item => item && item.slot);
  const taken = visible.filter(item => !!records[item.slot.id]).length;
  return {
    records: records,
    required: visible.filter(item => !!item.slot.required),
    optional: visible.filter(item => !item.slot.required),
    taken: taken,
    total: visible.length
  };
}

function _lifeShortMedicationLabel(slot) {
  if (typeof _getMedicationSlotShortLabel === 'function') return _getMedicationSlotShortLabel(slot);
  const match = String(slot.label || '').match(/\(([^)]+)\)/);
  return match ? match[1] : String(slot.label || slot.id || '슬롯');
}

function _getLifeHabitTitles() {
  const titles = new Set();
  const tasks = appState.tasks || [];
  tasks.forEach(task => {
    if (task.category === '일상' && task.repeatType && task.repeatType !== 'none' && task.title) {
      titles.add(task.title);
    }
  });
  Object.keys(appState.habitStreaks || {}).forEach(title => {
    if (!title) return;
    const linkedTask = tasks.find(task => task.title === title);
    if (!linkedTask || linkedTask.category === '일상') titles.add(title);
  });
  if (titles.size === 0 && typeof getRecurringHabits === 'function') {
    getRecurringHabits().forEach(title => { if (title) titles.add(title); });
  }
  return Array.from(titles).sort();
}

function _isLifeHabitDoneToday(title) {
  const logicalToday = getLogicalDate();
  const localToday = getLocalDateStr();
  const entries = []
    .concat((appState.completionLog || {})[logicalToday] || [])
    .concat(localToday === logicalToday ? [] : ((appState.completionLog || {})[localToday] || []));
  if (entries.some(entry => entry && entry.t === title && (!entry.c || entry.c === '일상'))) return true;
  return (appState.tasks || []).some(task => {
    if (task.category !== '일상' || task.title !== title || !task.completed || !task.completedAt) return false;
    const completedAt = new Date(task.completedAt);
    return !isNaN(completedAt.getTime()) && getLogicalDate(completedAt) === logicalToday;
  });
}

function _getLifeHabitRows() {
  return _getLifeHabitTitles().slice(0, 6).map(title => {
    const done = _isLifeHabitDoneToday(title);
    const streak = (appState.habitStreaks && appState.habitStreaks[title] && appState.habitStreaks[title].current) || (done ? 1 : 0);
    return { title: title, done: done, streak: streak };
  });
}

function toggleLifeHabit(title) {
  const logicalToday = getLogicalDate();
  const matching = (appState.tasks || []).filter(task =>
    task.category === '일상' &&
    task.title === title &&
    task.repeatType &&
    task.repeatType !== 'none'
  );
  const completedToday = matching.find(task => {
    if (!task.completed || !task.completedAt) return false;
    const completedAt = new Date(task.completedAt);
    return !isNaN(completedAt.getTime()) && getLogicalDate(completedAt) === logicalToday;
  });
  if (completedToday) {
    uncompleteTask(completedToday.id);
    return;
  }
  const pending = matching.find(task => !task.completed);
  if (pending) {
    completeTask(pending.id);
    return;
  }
  showToast('오늘 체크할 반복 습관 task가 없습니다', 'info');
}
window.toggleLifeHabit = toggleLifeHabit;

function setLifeTaskFilter(filter) {
  appState.lifeTaskFilter = ['all', 'life', 'family'].includes(filter) ? filter : 'all';
  renderStatic();
}
window.setLifeTaskFilter = setLifeTaskFilter;

function _isLifeTaskDueToday(task, todayEnd) {
  if (task.completed) return false;
  if (task.deadline && task.repeatType && task.repeatType !== 'none') {
    const deadline = new Date(task.deadline);
    if (!isNaN(deadline.getTime()) && deadline > todayEnd) return false;
  }
  return true;
}

function _sortLifeTasks(a, b) {
  if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
  if (a.deadline) return -1;
  if (b.deadline) return 1;
  if (a.category !== b.category) return a.category === '일상' ? -1 : 1;
  return String(a.title || '').localeCompare(String(b.title || ''), 'ko');
}

function _getLifeCompletedToday(lifeTasks) {
  const logicalToday = getLogicalDate();
  return lifeTasks.filter(task => {
    if (!task.completed || !task.completedAt) return false;
    const completedAt = new Date(task.completedAt);
    return !isNaN(completedAt.getTime()) && getLogicalDate(completedAt) === logicalToday;
  });
}

function _lifeTaskUrgencyClass(task) {
  if (!task.deadline || typeof getUrgencyLevel !== 'function') return '';
  const urgency = getUrgencyLevel(task);
  if (urgency === 'expired' || urgency === 'urgent') return 'urgent';
  if (urgency === 'warning') return 'warn';
  return '';
}

function _renderLifeDeadlineChip(task) {
  if (!task.deadline || typeof formatDeadline !== 'function') {
    if (task.repeatType && task.repeatType !== 'none') return '<span class="life-dday-chip none">오늘</span>';
    return '';
  }
  const text = formatDeadline(task.deadline);
  if (!text) return '';
  const urgency = _lifeTaskUrgencyClass(task);
  return `<span class="life-dday-chip ${urgency || 'none'}">${escapeHtml(text)}</span>`;
}

function _renderLifeSectionHeading(label, countText, iconName, labelId) {
  const idAttr = labelId ? ` id="${escapeAttr(labelId)}"` : '';
  return `
    <div class="life-section-heading">
      <span${idAttr} class="life-section-label">${iconName ? _lifeIcon(iconName, 14) : ''}${escapeHtml(label)}</span>
      ${countText ? `<span class="life-section-count">${escapeHtml(countText)}</span>` : ''}
    </div>
  `;
}

function _renderLifeRhythmSection(rhythmItems) {
  const recordedCount = rhythmItems.filter(item => item.value).length;
  return `
    <section class="life-section-card life-rhythm-primary" aria-labelledby="life-rhythm-title">
      <div class="life-section-heading split">
        <span id="life-rhythm-title" class="life-section-label">${_lifeIcon('clock', 14)}라이프 리듬</span>
        <div class="life-section-heading-actions">
          <span class="life-section-count">${recordedCount} / ${rhythmItems.length}</span>
          <button class="life-soft-action" type="button" onclick="appState.activeLifeSubView='rhythmHistory'; renderStatic();" aria-label="리듬 히스토리 보기">
            ${_lifeIcon('calendar', 13)}
            <span>히스토리</span>
          </button>
        </div>
      </div>
      <div class="rhythm-strip life-rhythm-strip" role="group" aria-labelledby="life-rhythm-title">
        ${rhythmItems.map(item => `
          <button class="rhythm-btn life-rhythm-strip-btn ${item.value ? 'recorded' : ''}"
                  type="button"
                  onclick="handleLifeRhythmClick('${escapeAttr(item.key)}', ${item.value ? 'true' : 'false'}, event)"
                  aria-label="${escapeAttr(item.label + (item.value ? ' ' + item.value + ' 기록됨' : ' 기록'))}">
            ${_lifeIcon(item.icon, 18)}
            <span class="rhythm-label">${escapeHtml(item.label)}</span>
            <span class="rhythm-time">${escapeHtml(item.value || '--:--')}</span>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function _renderLifeMedicationSlot(item, records, requiredGroup) {
  const slot = item.slot;
  const taken = !!records[slot.id];
  const value = records[slot.id];
  const timeText = taken && typeof value === 'string' ? value : (taken ? '완료' : '--:--');
  const shortLabel = _lifeShortMedicationLabel(slot);
  const stateLabel = taken ? '기록됨, 탭하여 수정' : '탭하여 기록';
  return `
    <button class="life-med-slot ${taken ? 'taken' : ''} ${requiredGroup ? 'required' : 'optional'}"
            type="button"
            onclick="handleMedicationClick('${escapeAttr(slot.id)}', ${taken ? 'true' : 'false'}, event)"
            aria-label="${escapeAttr((slot.label || shortLabel) + ' ' + timeText + ' ' + stateLabel)}">
      <span class="life-med-slot-main">
        ${_lifeIcon(taken ? 'check' : 'circle', 14)}
        <span class="life-med-slot-label">${escapeHtml(shortLabel)}</span>
      </span>
      <span class="life-med-slot-time">${escapeHtml(timeText)}</span>
    </button>
  `;
}

function _renderLifeMedicationGroup(label, iconName, items, records, requiredGroup) {
  const taken = items.filter(item => !!records[item.slot.id]).length;
  const total = items.length;
  const complete = total > 0 && taken === total;
  const slotsClass = total >= 3 ? 'life-med-slots three' : 'life-med-slots';
  return `
    <div class="life-med-group ${requiredGroup ? 'required' : 'optional'}">
      <div class="life-med-group-header">
        <span class="life-med-group-label ${requiredGroup ? 'required' : ''}">
          ${_lifeIcon(iconName, 14)}
          <span>${escapeHtml(label)}</span>
          ${requiredGroup ? '<span class="life-med-tag">필수</span>' : ''}
        </span>
        <span class="life-med-count ${complete ? 'complete' : ''}">${taken} / ${total}</span>
      </div>
      ${total > 0 ? `
        <div class="${slotsClass}">
          ${items.map(item => _renderLifeMedicationSlot(item, records, requiredGroup)).join('')}
        </div>
      ` : '<div class="life-empty-inline">등록된 슬롯이 없습니다</div>'}
    </div>
  `;
}

function _renderLifeMedicationSection(summary) {
  return `
    <section class="life-section-card life-medication-section" aria-labelledby="life-medication-title">
      ${_renderLifeSectionHeading('약 복용', summary.taken + ' / ' + summary.total, 'pill', 'life-medication-title')}
      <div class="life-med-grid">
        ${_renderLifeMedicationGroup('ADHD 약', 'pill', summary.required, summary.records, true)}
        ${_renderLifeMedicationGroup('영양제', 'leaf', summary.optional, summary.records, false)}
      </div>
      <div class="life-section-foot">
        <button class="life-soft-action" type="button" onclick="addMedicationSlot()" aria-label="복약 또는 영양제 슬롯 추가">
          ${_lifeIcon('plus', 13)}
          <span>슬롯 추가</span>
        </button>
      </div>
    </section>
  `;
}

function _renderLifeHabitSection(habitRows) {
  const doneCount = habitRows.filter(row => row.done).length;
  return `
    <section class="life-section-card life-habit-section" aria-labelledby="life-habit-title">
      ${_renderLifeSectionHeading('오늘 습관', doneCount + ' / ' + habitRows.length, 'target', 'life-habit-title')}
      ${habitRows.length > 0 ? `
        <div class="life-habit-grid" role="list">
          ${habitRows.map(row => `
            <div class="life-habit-row ${row.done ? 'done' : ''}" role="listitem">
              <span class="life-habit-name">${escapeHtml(row.title)}</span>
              <span class="life-habit-streak" aria-label="연속 ${row.streak}일">
                ${_lifeIcon('flame', 13)}
                <span>${row.streak}</span>
              </span>
              <button class="life-habit-toggle ${row.done ? 'done' : ''}"
                      type="button"
                      onclick="toggleLifeHabit('${escapeAttr(row.title)}')"
                      aria-pressed="${row.done ? 'true' : 'false'}"
                      aria-label="${escapeAttr(row.title + (row.done ? ' 완료됨' : ' 완료'))}">
                ${row.done ? _lifeIcon('check', 14) : ''}
              </button>
            </div>
          `).join('')}
        </div>
      ` : '<div class="life-empty-inline">반복 task를 만들면 습관 체크가 여기에 표시됩니다</div>'}
    </section>
  `;
}

/**
 * 일상/가족 개별 작업 아이템 HTML
 */
function _renderLifeTaskItem(task) {
  const category = safeCatId(task.category);
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const doneCount = hasSubtasks ? task.subtasks.filter(s => s.completed).length : 0;
  const totalCount = hasSubtasks ? task.subtasks.length : 0;
  const repeatLabel = task.repeatType && task.repeatType !== 'none'
    ? getRepeatLabel(task.repeatType, task)
    : '';
  const estimatedMinutes = Number(task.estimatedTime);
  const urgencyClass = _lifeTaskUrgencyClass(task);
  const checkAction = task.completed ? 'uncompleteTask' : 'completeTask';
  const checkLabel = task.completed ? '완료 되돌리기' : '완료';

  return `
    <div class="life-task-row cat-${category} ${urgencyClass} ${task.completed ? 'completed' : ''}"
         style="--task-cat-color: var(--cat-${category})"
         data-task-id="${escapeAttr(task.id)}">
      <button class="life-task-check cat-${category} ${task.completed ? 'checked' : ''}"
              type="button"
              onclick="if(this._longPressed){this._longPressed=false;return;}event.stopPropagation(); ${checkAction}('${escapeAttr(task.id)}')"
              ${task.completed ? '' : `onpointerdown="this._lpTimer = setTimeout(() => { this._longPressed = true; showBackdateMenu('${escapeAttr(task.id)}', this); }, 500)" onpointerup="clearTimeout(this._lpTimer)" onpointerleave="clearTimeout(this._lpTimer)"`}
              aria-label="${escapeAttr(task.title + ' ' + checkLabel)}">
        ${_lifeIcon(task.completed ? 'check' : 'circle', 15)}
      </button>
      <div class="life-task-main"
           role="button"
           tabindex="0"
           onclick="editTask('${escapeAttr(task.id)}')"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();editTask('${escapeAttr(task.id)}')}">
        <span class="life-task-title">${escapeHtml(task.title)}</span>
        <span class="life-task-meta">
          <span class="cat-tag cat-${category}">${escapeHtml(category)}</span>
          ${repeatLabel ? `<span class="life-meta-chip">${_lifeIcon('repeat', 12)}${escapeHtml(repeatLabel)}</span>` : ''}
          ${Number.isFinite(estimatedMinutes) && estimatedMinutes > 0 ? `<span class="life-meta-chip">${_lifeIcon('clock', 12)}${estimatedMinutes}분</span>` : ''}
          ${hasSubtasks ? `<span class="life-meta-chip">${doneCount}/${totalCount}</span>` : ''}
        </span>
      </div>
      ${_renderLifeDeadlineChip(task)}
      <div class="life-task-actions" aria-label="작업 동작">
        <button class="life-icon-btn" type="button" onclick="event.stopPropagation(); editTask('${escapeAttr(task.id)}')" title="수정" aria-label="${escapeAttr(task.title)} 수정">${_lifeIcon('edit', 14)}</button>
        <button class="life-icon-btn danger" type="button" onclick="event.stopPropagation(); deleteTask('${escapeAttr(task.id)}')" title="삭제" aria-label="${escapeAttr(task.title)} 삭제">${_lifeIcon('trash', 14)}</button>
      </div>
      ${hasSubtasks ? `
        <div class="life-subtasks" onclick="event.stopPropagation();">
          ${task.subtasks.map((st, idx) => `
            <button class="life-subtask-chip ${st.completed ? 'done' : ''}"
                    type="button"
                    onclick="if(this._longPressed){this._longPressed=false;return;}toggleSubtaskComplete('${escapeAttr(task.id)}', ${idx})"
                    onpointerdown="this._lpTimer = setTimeout(() => { this._longPressed = true; showSubtaskBackdateMenu('${escapeAttr(task.id)}', ${idx}, this); }, 500)"
                    onpointerup="clearTimeout(this._lpTimer)"
                    onpointerleave="clearTimeout(this._lpTimer)"
                    aria-pressed="${st.completed ? 'true' : 'false'}">
              ${_lifeIcon(st.completed ? 'check' : 'circle', 12)}
              <span>${escapeHtml(st.text)}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function _renderLifeTaskFilter(activeFilter) {
  const filters = [
    { key: 'all', label: '전체', cat: '' },
    { key: 'life', label: '일상', cat: '일상' },
    { key: 'family', label: '가족', cat: '가족' }
  ];
  return `
    <div class="life-filter-chips" role="group" aria-label="일상 task 필터">
      ${filters.map(filter => `
        <button class="life-filter-chip ${activeFilter === filter.key ? 'active' : ''} ${filter.cat ? 'cat-' + filter.cat : ''}"
                type="button"
                onclick="setLifeTaskFilter('${filter.key}')"
                aria-pressed="${activeFilter === filter.key ? 'true' : 'false'}">
          ${filter.cat ? '<span class="life-filter-swatch"></span>' : ''}
          <span>${escapeHtml(filter.label)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function _renderLifeTaskSection(pendingTasks, completedTasks) {
  const activeFilter = appState.lifeTaskFilter || 'all';
  const filtered = pendingTasks.filter(task => {
    if (activeFilter === 'life') return task.category === '일상';
    if (activeFilter === 'family') return task.category === '가족';
    return true;
  });
  const familyCount = pendingTasks.filter(task => task.category === '가족').length;
  const lifeCount = pendingTasks.filter(task => task.category === '일상').length;
  return `
    <section class="life-section-card life-task-section" aria-labelledby="life-task-title">
      <div class="life-section-heading split">
        <span id="life-task-title" class="life-section-label">${_lifeIcon('list', 14)}일상 task</span>
        ${_renderLifeTaskFilter(activeFilter)}
      </div>
      <div class="life-task-count-row">
        <span class="life-task-hierarchy">일상 ⊃ 가족</span>
        <span>일상 ${lifeCount}</span>
        <span>가족 ${familyCount}</span>
      </div>
      ${filtered.length > 0 ? `
        <div class="life-task-list">
          ${filtered.map(task => _renderLifeTaskItem(task)).join('')}
        </div>
      ` : '<div class="life-empty-inline">표시할 일상/가족 task가 없습니다</div>'}
      ${completedTasks.length > 0 ? `
        <details class="life-completed-details">
          <summary>오늘 완료 ${completedTasks.length}</summary>
          <div class="life-task-list completed-list">
            ${completedTasks.slice(0, 5).map(task => _renderLifeTaskItem(task)).join('')}
          </div>
        </details>
      ` : ''}
    </section>
  `;
}

/**
 * 결심 트래커 섹션 HTML (오늘 탭 + 일상 탭 공통)
 */
function _renderResolutionSection() {
  const resolutions = appState.resolutions || [];
  const now = new Date();
  const todayMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  return `
    <section class="life-section-card resolution-section" aria-labelledby="life-resolution-title">
      ${_renderLifeSectionHeading('결심 트래커', resolutions.length ? resolutions.length + '개' : '', 'target', 'life-resolution-title')}
      ${resolutions.length > 0 ? `
        <div class="resolution-list">
          ${resolutions.map(r => {
            const [sy, sm, sd] = (r.startDate || '').split('-').map(Number);
            const startMs = sy ? new Date(sy, sm - 1, sd).getTime() : todayMs;
            const days = isNaN(startMs) ? 0 : Math.max(0, Math.floor((todayMs - startMs) / 86400000));
            return `
              <div class="resolution-card ${r.icon ? 'has-icon' : ''}" role="button" tabindex="0" onclick="editResolution('${escapeAttr(r.id)}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();editResolution('${escapeAttr(r.id)}')}">
                ${r.icon ? `<div class="resolution-icon" aria-hidden="true">${escapeHtml(r.icon)}</div>` : ''}
                <div class="resolution-info">
                  <div class="resolution-name">${escapeHtml(r.title)}</div>
                  <div class="resolution-days"><span class="resolution-day-count">${days}</span>일째</div>
                </div>
                <div class="resolution-actions">
                  <button class="life-icon-btn" type="button" onclick="event.stopPropagation(); resetResolution('${escapeAttr(r.id)}')" title="리셋" aria-label="${escapeAttr(r.title)} 리셋">${_lifeIcon('rotate-ccw', 14)}</button>
                  <button class="life-icon-btn danger" type="button" onclick="event.stopPropagation(); deleteResolution('${escapeAttr(r.id)}')" title="삭제" aria-label="${escapeAttr(r.title)} 삭제">${_lifeIcon('trash', 14)}</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : '<div class="resolution-empty">결심을 추가하면 오늘 탭의 기록 버튼과 연결됩니다</div>'}
      <div class="life-section-foot">
        <button class="life-soft-action" type="button" onclick="addResolution()" aria-label="결심 추가">
          ${_lifeIcon('plus', 13)}
          <span>결심 추가</span>
        </button>
      </div>
    </section>
  `;
}

/**
 * 일상 탭 HTML을 반환한다.
 */
function renderLifeTab() {
  // rhythm history sub-view 분기 — 일상 탭 안 swap
  if (appState.activeLifeSubView === 'rhythmHistory' && typeof renderLifeRhythmHistory === 'function') {
    return `
      <div class="life-shell">
        <div class="life-topbar">
          <button type="button" class="life-back-btn" onclick="appState.activeLifeSubView=null; renderStatic();" aria-label="일상 탭으로 돌아가기">
            ${_lifeIcon('arrow-left', 14)}
            <span>일상</span>
          </button>
          <h2 class="life-title">리듬 히스토리</h2>
        </div>
        ${renderLifeRhythmHistory()}
      </div>
    `;
  }

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const lifeTasks = (appState.tasks || []).filter(task => task.category === '일상' || task.category === '가족');
  const pendingTasks = lifeTasks
    .filter(task => _isLifeTaskDueToday(task, todayEnd))
    .sort(_sortLifeTasks);
  const completedTasks = _getLifeCompletedToday(lifeTasks);
  const rhythmItems = _getLifeRhythmItems();
  const rhythmDone = rhythmItems.filter(item => item.value).length;
  const medicationSummary = _getLifeMedicationSummary();
  const habitRows = _getLifeHabitRows();
  const habitDone = habitRows.filter(row => row.done).length;
  const familyTasks = pendingTasks.filter(task => task.category === '가족');
  const maxHabitStreak = habitRows.reduce((max, row) => Math.max(max, row.streak || 0), 0);

  return `
    <div class="life-shell">
      <div class="life-topbar">
        <div class="life-title-group">
          <span class="life-title-bar"></span>
          <div>
            <h2 class="life-title">일상</h2>
            <p class="life-subtitle">리듬, 약, 습관, 가족 task</p>
          </div>
        </div>
        <button class="life-add-focus" type="button" onclick="var input=document.getElementById('life-quick-input'); if(input) input.focus();" aria-label="일상 task 추가 입력으로 이동">
          ${_lifeIcon('plus', 14)}
          <span>추가</span>
        </button>
      </div>

      <div class="life-anchors tab-anchor-row" aria-label="일상 안정 앵커">
        <div class="life-anchor cat-life">
          <span class="life-anchor-label">${_lifeIcon('clock', 13)}오늘 리듬</span>
          <span class="life-anchor-value">${rhythmDone}/6</span>
        </div>
        <div class="life-anchor success">
          <span class="life-anchor-label">${_lifeIcon('pill', 13)}약 복용</span>
          <span class="life-anchor-value">${medicationSummary.taken}/${medicationSummary.total}</span>
        </div>
        <div class="life-anchor cat-family life-anchor-clickable" role="button" tabindex="0" onclick="setLifeTaskFilter('family')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();setLifeTaskFilter('family')}" aria-label="가족 task ${familyTasks.length}개 필터 적용">
          <span class="life-anchor-label">${_lifeIcon('home', 13)}가족</span>
          <span class="life-anchor-value">${familyTasks.length}</span>
        </div>
        <div class="life-anchor celebration">
          <span class="life-anchor-label">${_lifeIcon('flame', 13)}습관 streak</span>
          <span class="life-anchor-value">${maxHabitStreak || habitDone}</span>
        </div>
      </div>

      ${_renderLifeRhythmSection(rhythmItems)}
      ${_renderLifeMedicationSection(medicationSummary)}
      ${_renderLifeHabitSection(habitRows)}
      ${_renderResolutionSection()}
      <div class="life-quick-add">
        <input
          type="text"
          class="life-quick-input"
          placeholder="일상/가족 작업 추가 (#가족 붙이면 가족)"
          id="life-quick-input"
          aria-label="일상 또는 가족 작업 빠른 추가"
          onkeydown="if(event.key==='Enter') quickAddLifeTask()"
        >
        <button class="life-quick-btn" type="button" onclick="quickAddLifeTask()" aria-label="빠른 작업 추가">${_lifeIcon('plus', 16)}</button>
      </div>
      ${_renderLifeTaskSection(pendingTasks, completedTasks)}
    </div>
  `;
}

// ============================================
// 결심 트래커 CRUD
// ============================================

function addResolution() {
  const title = prompt('결심 이름을 입력하세요 (예: 간식 끊기)');
  if (!title || !title.trim()) return;

  const icon = prompt('아이콘 이모지 (비우면 없음)', '🎯') || '';
  const startDateInput = prompt('시작일 (YYYY-MM-DD, 비우면 오늘)', '');
  const startDate = startDateInput && /^\d{4}-\d{2}-\d{2}$/.test(startDateInput)
    ? startDateInput
    : getLocalDateStr();

  if (!appState.resolutions) appState.resolutions = [];
  const now = new Date().toISOString();
  appState.resolutions.push({
    id: generateId(),
    title: title.trim(),
    startDate,
    icon: icon.trim(),
    createdAt: now,
    updatedAt: now
  });
  saveStateImmediate();
  renderStatic();
}
window.addResolution = addResolution;

function resetResolution(id) {
  const r = (appState.resolutions || []).find(item => item.id === id);
  if (!r) return;
  if (!confirm(`"${r.title}" 카운터를 리셋하시겠습니까?\n(시작일이 오늘로 변경됩니다)`)) return;
  r.startDate = getLocalDateStr();
  r.updatedAt = new Date().toISOString();
  saveStateImmediate();
  renderStatic();
}
window.resetResolution = resetResolution;

function deleteResolution(id) {
  const r = (appState.resolutions || []).find(item => item.id === id);
  if (!r) return;
  if (!confirm(`"${r.title}" 결심을 삭제하시겠습니까?`)) return;
  if (!appState.deletedIds.resolutions) appState.deletedIds.resolutions = {};
  appState.deletedIds.resolutions[id] = new Date().toISOString();
  appState.resolutions = appState.resolutions.filter(item => item.id !== id);
  saveStateImmediate();
  renderStatic();
}
window.deleteResolution = deleteResolution;

function editResolution(id) {
  const r = (appState.resolutions || []).find(item => item.id === id);
  if (!r) return;

  const newTitle = prompt('결심 이름', r.title);
  if (newTitle === null) return;
  if (newTitle.trim()) r.title = newTitle.trim();

  const newIcon = prompt('아이콘 이모지 (비우면 없음)', r.icon || '');
  if (newIcon !== null) r.icon = newIcon.trim();

  const newDate = prompt('시작일 (YYYY-MM-DD)', r.startDate);
  if (newDate !== null && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) r.startDate = newDate;

  r.updatedAt = new Date().toISOString();
  saveStateImmediate();
  renderStatic();
}
window.editResolution = editResolution;
