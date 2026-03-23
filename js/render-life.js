// ============================================
// 렌더링 - 일상/가족 탭
// ============================================

/**
 * 일상/가족 개별 작업 아이템 HTML
 */
function _renderLifeTaskItem(task) {
  const hasSubtasks = task.subtasks && task.subtasks.length > 0;
  const doneCount = hasSubtasks ? task.subtasks.filter(s => s.completed).length : 0;
  const totalCount = hasSubtasks ? task.subtasks.length : 0;
  const allDone = hasSubtasks && doneCount === totalCount;
  const repeatLabel = task.repeatType && task.repeatType !== 'none'
    ? getRepeatLabel(task.repeatType, task)
    : '';

  return `
    <div class="life-item" style="--task-cat-color: var(--cat-${task.category})">
      ${hasSubtasks
        ? `<span class="subtask-progress-indicator${allDone ? ' all-done' : ''}" style="cursor:default;">${doneCount}/${totalCount}</span>`
        : `<button class="task-check-btn" onclick="completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">○</button>`
      }
      <div class="life-item-content">
        <div class="life-item-title">${escapeHtml(task.title)}</div>
        <div class="life-item-meta">
          ${repeatLabel ? `🔄 ${repeatLabel}` : ''}
          ${!repeatLabel && task.deadline ? new Date(task.deadline).toLocaleDateString('ko-KR', {month:'short', day:'numeric'}) : ''}
          ${task.estimatedTime ? `⏱ ${task.estimatedTime}분` : ''}
        </div>
      </div>
      <div class="life-item-actions">
        ${!hasSubtasks ? '' : `<button class="life-action-btn" onclick="completeTask('${escapeAttr(task.id)}')" title="전체 완료" aria-label="전체 완료">✓</button>`}
        <button class="life-action-btn" onclick="editTask('${escapeAttr(task.id)}')" title="수정" aria-label="작업 수정">${svgIcon('edit', 14)}</button>
        <button class="life-action-btn delete" onclick="deleteTask('${escapeAttr(task.id)}')" title="삭제" aria-label="작업 삭제">${svgIcon('trash', 14)}</button>
      </div>
      ${hasSubtasks ? `
        <div class="subtask-chips" onclick="event.stopPropagation();">
          ${task.subtasks.map((st, idx) => `
            <span class="subtask-chip ${st.completed ? 'done' : ''}" onclick="toggleSubtaskComplete('${escapeAttr(task.id)}', ${idx})">
              <span class="subtask-chip-check">${st.completed ? '✓' : '○'}</span>${escapeHtml(st.text)}
            </span>
          `).join('')}
        </div>
      ` : ''}
    </div>
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
    <div class="resolution-section">
      <div class="resolution-header">
        <div class="resolution-title">💪 결심 트래커</div>
        <button class="resolution-add-btn" onclick="addResolution()" title="결심 추가">+</button>
      </div>
      ${resolutions.length > 0 ? `
        <div class="resolution-list">
          ${resolutions.map(r => {
            const [sy, sm, sd] = (r.startDate || '').split('-').map(Number);
            const startMs = sy ? new Date(sy, sm - 1, sd).getTime() : todayMs;
            const days = isNaN(startMs) ? 0 : Math.max(0, Math.floor((todayMs - startMs) / 86400000));
            return `
              <div class="resolution-card" onclick="editResolution('${escapeAttr(r.id)}')">
                <div class="resolution-icon">${escapeHtml(r.icon || '🎯')}</div>
                <div class="resolution-info">
                  <div class="resolution-name">${escapeHtml(r.title)}</div>
                  <div class="resolution-days"><span class="resolution-day-count">${days}</span>일째</div>
                </div>
                <div class="resolution-actions">
                  <button class="life-action-btn" onclick="event.stopPropagation(); resetResolution('${escapeAttr(r.id)}')" title="리셋">⟳</button>
                  <button class="life-action-btn delete" onclick="event.stopPropagation(); deleteResolution('${escapeAttr(r.id)}')" title="삭제">✕</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      ` : `
        <div class="resolution-empty">결심을 추가해보세요</div>
      `}
    </div>
  `;
}

/**
 * 일상/가족 탭 HTML을 반환한다.
 */
function renderLifeTab() {
          const now = new Date();
          const todayEnd = new Date(now);
          todayEnd.setHours(23, 59, 59, 999);

          const lifeTasks = appState.tasks.filter(t => t.category === '일상' || t.category === '가족');
          const pendingTasks = lifeTasks.filter(t => {
            if (t.completed) return false;
            // 반복 작업 중 미래 마감일(내일 이후)인 작업 제외
            if (t.deadline && t.repeatType && t.repeatType !== 'none') {
              const deadline = new Date(t.deadline);
              if (deadline > todayEnd) return false;
            }
            return true;
          }).sort((a, b) => {
            if (!a.deadline) return 1;
            if (!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
          });
          // 모든 완료 태스크 표시
          const completedTasks = lifeTasks.filter(t => t.completed);
          // 일상을 반복/일회성으로 분리
          const isRepeat = (t) => t.repeatType && t.repeatType !== 'none';
          const repeatTasks = pendingTasks.filter(t => t.category === '일상' && isRepeat(t));
          const onceTasks = pendingTasks.filter(t => t.category === '일상' && !isRepeat(t));
          const familyTasks = pendingTasks.filter(t => t.category === '가족');
          // 완료된 반복 작업 (리셋 대상)
          const completedRepeatTasks = completedTasks.filter(t => t.category === '일상' && isRepeat(t));

          return `
            <div class="life-header">
              <div class="life-title">🏠 일상 & 가족</div>
            </div>

            ${_renderResolutionSection()}

            <!-- 빠른 추가 -->
            <div class="life-quick-add">
              <input
                type="text"
                class="life-quick-input"
                placeholder="일상/가족 작업 추가 (#가족 붙이면 가족으로)"
                id="life-quick-input"
                onkeypress="if(event.key==='Enter') quickAddLifeTask()"
              >
              <button class="life-quick-btn" onclick="quickAddLifeTask()">+</button>
            </div>

            <div class="life-summary">
              <div class="life-summary-item">
                <div class="life-summary-value">${repeatTasks.length}</div>
                <div class="life-summary-label">🔁 반복</div>
              </div>
              <div class="life-summary-item">
                <div class="life-summary-value">${onceTasks.length}</div>
                <div class="life-summary-label">📌 일회성</div>
              </div>
              <div class="life-summary-item">
                <div class="life-summary-value">${familyTasks.length}</div>
                <div class="life-summary-label">👨‍👩‍👧 가족</div>
              </div>
              <div class="life-summary-item">
                <div class="life-summary-value" style="color: var(--accent-success)">${completedTasks.length}</div>
                <div class="life-summary-label">✓ 완료</div>
              </div>
            </div>

            ${repeatTasks.length > 0 || completedRepeatTasks.length > 0 ? `
              <div class="life-section">
                <div class="life-section-header">
                  <div class="life-section-title">🔁 일상 (반복) ${repeatTasks.length > 0 ? `(${repeatTasks.length})` : ''}</div>
                  ${completedRepeatTasks.length > 0 ? `
                    <button class="life-reset-btn" onclick="resetCompletedRepeatTasks()" title="완료된 반복 작업 리셋">
                      ↺ 리셋 (${completedRepeatTasks.length})
                    </button>
                  ` : ''}
                </div>
                ${repeatTasks.length > 0 ? `
                  <div class="life-list">
                    ${repeatTasks.map(task => _renderLifeTaskItem(task)).join('')}
                  </div>
                ` : `<div class="life-all-done">✓ 오늘 반복 작업 모두 완료!</div>`}
              </div>
            ` : ''}

            ${onceTasks.length > 0 ? `
              <div class="life-section">
                <div class="life-section-title">📌 일상 (일회성) (${onceTasks.length})</div>
                <div class="life-list">
                  ${onceTasks.map(task => _renderLifeTaskItem(task)).join('')}
                </div>
              </div>
            ` : ''}

            ${familyTasks.length > 0 ? `
              <div class="life-section">
                <div class="life-section-title">👨‍👩‍👧 가족 (${familyTasks.length})</div>
                <div class="life-list">
                  ${familyTasks.map(task => _renderLifeTaskItem(task)).join('')}
                </div>
              </div>
            ` : ''}

            ${pendingTasks.length === 0 ? `
              <div class="life-empty">
                <div class="life-empty-icon">🏡</div>
                <div class="life-empty-text">일상/가족 작업이 없습니다</div>
              </div>
            ` : ''}

            ${completedTasks.length > 0 ? `
              <div class="life-section" style="margin-top: 24px; opacity: 0.7;">
                <div class="life-section-title">✓ 완료됨 (${completedTasks.length})</div>
                <div class="life-list">
                  ${completedTasks.slice(0, 5).map(task => `
                    <div class="life-item completed" style="opacity: 0.6; --task-cat-color: var(--cat-${task.category})">
                      <div class="task-check-btn checked" style="color: var(--accent-success);">✓</div>
                      <div class="life-item-content" style="text-decoration: line-through;">
                        <div class="life-item-title">${escapeHtml(task.title)}</div>
                      </div>
                      <div class="life-item-actions" style="opacity: 1;">
                        <button class="life-action-btn" onclick="uncompleteTask('${escapeAttr(task.id)}')" title="되돌리기" aria-label="완료 되돌리기">↩️</button>
                        <button class="life-action-btn delete" onclick="deleteTask('${escapeAttr(task.id)}')" title="삭제" aria-label="작업 삭제">${svgIcon('trash', 14)}</button>
                      </div>
                    </div>
                  `).join('')}
                  ${completedTasks.length > 5 ? `<div style="text-align: center; color: var(--text-muted); font-size: 14px; padding: 8px;">+ ${completedTasks.length - 5}개 더</div>` : ''}
                </div>
              </div>
            ` : ''}
          `;
}

// ============================================
// 결심 트래커 CRUD
// ============================================

function addResolution() {
  const title = prompt('결심 이름을 입력하세요 (예: 간식 끊기)');
  if (!title || !title.trim()) return;

  const icon = prompt('아이콘 이모지 (기본: 🎯)', '🎯') || '🎯';
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
    icon,
    createdAt: now,
    updatedAt: now
  });
  saveState();
  renderStatic();
}
window.addResolution = addResolution;

function resetResolution(id) {
  const r = (appState.resolutions || []).find(item => item.id === id);
  if (!r) return;
  if (!confirm(`"${r.title}" 카운터를 리셋하시겠습니까?\n(시작일이 오늘로 변경됩니다)`)) return;
  r.startDate = getLocalDateStr();
  r.updatedAt = new Date().toISOString();
  saveState();
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
  saveState();
  renderStatic();
}
window.deleteResolution = deleteResolution;

function editResolution(id) {
  const r = (appState.resolutions || []).find(item => item.id === id);
  if (!r) return;

  const newTitle = prompt('결심 이름', r.title);
  if (newTitle === null) return;
  if (newTitle.trim()) r.title = newTitle.trim();

  const newIcon = prompt('아이콘 이모지', r.icon);
  if (newIcon !== null && newIcon.trim()) r.icon = newIcon.trim();

  const newDate = prompt('시작일 (YYYY-MM-DD)', r.startDate);
  if (newDate !== null && /^\d{4}-\d{2}-\d{2}$/.test(newDate)) r.startDate = newDate;

  r.updatedAt = new Date().toISOString();
  saveState();
  renderStatic();
}
window.editResolution = editResolution;
