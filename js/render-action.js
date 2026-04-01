// ============================================
// 렌더링 - 실행 탭 (오늘)
// ============================================

/**
 * 실행(오늘) 탭 HTML을 반환한다.
 * 핵심: "지금 할 것" 중심 — 나머지는 최소화
 */
function renderActionTab(ctx) {
  var now = ctx.now;
  var hour = ctx.hour;
  var filteredTasks = ctx.filteredTasks;
  var nextAction = ctx.nextAction;
  var mode = ctx.mode;
  var urgentTasks = ctx.urgentTasks;
  var completedTasks = ctx.completedTasks;
  var urgencyClass = ctx.urgencyClass;
  var urgencyLabel = ctx.urgencyLabel;
  var minutesUntilBed = ctx.minutesUntilBed;
  var categoryFields = ctx.categoryFields;

  // 오늘 작업 수
  const pendingCount = filteredTasks.filter(t => !t.completed).length;
  const completedToday = appState.todayStats.completedToday;

  return `
        <!-- 컴팩트 상단 바: 시간 + 모드 + 진행률 -->
        <div class="today-status-bar">
          <div class="today-status-left">
            <span class="today-clock" id="current-clock">${now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
            <span class="today-mode ${mode}">${mode}</span>
            <span class="today-remaining" id="mode-time-remaining">${getModeTimeRemaining(mode, hour, now)}</span>
          </div>
          <div class="today-status-right">
            <span class="today-progress-mini">✅ ${completedToday} / 📋 ${pendingCount}</span>
            ${appState.streak.current > 0 ? `<span class="today-streak">🔥${appState.streak.current}</span>` : ''}
          </div>
        </div>

        <!-- 오늘의 리듬 + 복약 (기본 펼침) -->
        <details class="today-rhythm-details" open>
          <summary class="today-rhythm-summary">📊 오늘의 리듬 · 복약</summary>
          <div class="today-rhythm-content">
            ${_renderRhythmCompact()}
            ${_renderMedicationCompact()}
          </div>
        </details>

        <!-- 결심 트래커 -->
        ${(appState.resolutions || []).length > 0 ? _renderResolutionSection() : ''}

        <!-- ▶ 지금 할 것 (메인 히어로) -->
        ${nextAction ? `
          <div class="next-action ${urgencyClass}">
            <div class="next-action-label">${urgencyLabel[urgencyClass]}</div>
            <div class="task-title">${escapeHtml(nextAction.title)}</div>
            <div class="task-meta">
              <span class="category ${nextAction.category}">${nextAction.category}</span>
              ${nextAction.repeatType && nextAction.repeatType !== 'none' ? `<span class="meta-item">🔄 ${getRepeatLabel(nextAction.repeatType, nextAction)}</span>` : ''}
              ${nextAction.estimatedTime ? `<span class="meta-item">⏱ ${nextAction.estimatedTime}분</span>` : ''}
              ${nextAction.deadline ? `<span class="meta-item">⏰ ${formatDeadline(nextAction.deadline)}</span>` : ''}
              ${nextAction.expectedRevenue ? `<span class="meta-item">💰 ${Number(nextAction.expectedRevenue).toLocaleString()}원</span>` : ''}
            </div>
            ${nextAction.subtasks && nextAction.subtasks.length > 0 ? `
              <div class="next-action-subtasks">
                ${nextAction.subtasks.slice(0, 5).map((st, idx) => `
                  <div class="next-action-subtask ${st.completed ? 'completed' : ''}" onclick="toggleSubtaskComplete('${escapeAttr(nextAction.id)}', ${idx})">
                    <span class="next-action-subtask-check">${st.completed ? '✓' : '○'}</span>
                    <span>${escapeHtml(st.text)}</span>
                  </div>
                `).join('')}
                ${nextAction.subtasks.length > 5 ? `<div style="color: var(--text-muted); font-size: 14px; padding-left: 24px;">+${nextAction.subtasks.length - 5}개 더</div>` : ''}
              </div>
            ` : ''}
            <div class="next-action-buttons">
              ${nextAction.link ? `<button class="btn btn-primary" onclick="handleGo('${escapeAttr(nextAction.link)}')">🚀 GO</button>` : ''}
              <button class="btn btn-success" onclick="completeTask('${escapeAttr(nextAction.id)}')">✓ 완료</button>
              <button class="btn btn-secondary btn-sm" onclick="postponeTask('${escapeAttr(nextAction.id)}')">⏰ 내일로</button>
              <button class="btn btn-secondary btn-sm" onclick="editTask('${escapeAttr(nextAction.id)}')">${svgIcon('edit', 14)} 수정</button>
            </div>
          </div>
        ` : `
          ${_renderTodayEmptyState(completedToday)}
        `}

        <!-- 빠른 추가 -->
        <div class="quick-add-simple">
          <input
            type="text"
            id="quick-add-input"
            class="quick-add-input"
            placeholder="+ 새 작업 추가 (#부업 #본업 #일상)"
            value="${escapeHtml(appState.quickAddValue)}"
            onkeypress="if(event.key==='Enter') quickAdd()"
          >
          <button class="quick-add-btn" onclick="quickAdd()" aria-label="빠른 작업 추가">+</button>
        </div>

        <!-- 나머지 작업 목록 -->
        ${pendingCount > (nextAction ? 1 : 0) ? `
          <div class="today-task-list">
            <div class="today-task-list-header">
              <span>📋 다른 작업 ${pendingCount - (nextAction ? 1 : 0)}개</span>
            </div>
            ${filteredTasks
              .filter(t => !t.completed && t.id !== (nextAction ? nextAction.id : null))
              .map(task => {
                const hasSubtasks = task.subtasks && task.subtasks.length > 0;
                const doneCount = hasSubtasks ? task.subtasks.filter(s => s.completed).length : 0;
                const totalCount = hasSubtasks ? task.subtasks.length : 0;
                const allDone = hasSubtasks && doneCount === totalCount;
                return `
                <div class="task-item-mini" onclick="editTask('${escapeAttr(task.id)}')" style="--task-cat-color: var(--cat-${task.category})">
                  <div class="task-item-mini-left">
                    ${hasSubtasks
                      ? `<span class="subtask-progress-indicator${allDone ? ' all-done' : ''}" onclick="event.stopPropagation(); toggleSubtaskChips('${escapeAttr(task.id)}')" style="cursor:pointer;" title="서브태스크 접기/펼치기">${doneCount}/${totalCount} ${appState.collapsedSubtaskChips && appState.collapsedSubtaskChips[task.id] ? '▶' : '▼'}</span>`
                      : `<button class="task-check-btn" onclick="event.stopPropagation(); completeTask('${escapeAttr(task.id)}')" aria-label="작업 완료">○</button>`
                    }
                    <span class="task-item-mini-title">${escapeHtml(task.title)}</span>
                  </div>
                  <div class="task-item-mini-right">
                    ${task.deadline ? `<span class="task-item-mini-deadline">${formatDeadline(task.deadline)}</span>` : ''}
                    <span class="task-item-mini-category ${task.category}">${task.category}</span>
                  </div>
                  ${hasSubtasks && !(appState.collapsedSubtaskChips && appState.collapsedSubtaskChips[task.id]) ? `
                    <div class="subtask-chips" onclick="event.stopPropagation();">
                      ${task.subtasks.slice(0, 3).map((st, idx) => `
                        <span class="subtask-chip ${st.completed ? 'done' : ''}" onclick="toggleSubtaskComplete('${escapeAttr(task.id)}', ${idx})">
                          <span class="subtask-chip-check">${st.completed ? '✓' : '○'}</span>${escapeHtml(st.text)}
                        </span>
                      `).join('')}
                      ${task.subtasks.length > 3 ? `<span class="subtask-chip" style="color: var(--text-muted); border-style: dashed; cursor: default;">+${task.subtasks.length - 3}개</span>` : ''}
                    </div>
                  ` : ''}
                </div>
              `}).join('')}
          </div>
        ` : ''}

        <!-- 오늘 완료 (접기) -->
        ${completedTasks.length > 0 ? `
          <div class="today-completed-section">
            <div class="today-completed-toggle" onclick="toggleCompletedTasks()">
              <span>✅ 오늘 완료 ${completedTasks.length}개</span>
              <span>${appState.showCompletedTasks ? '▲' : '▼'}</span>
            </div>
            ${appState.showCompletedTasks ? `
              <div class="today-completed-list">
                ${completedTasks.map(task => `
                  <div class="task-item-mini completed" style="--task-cat-color: var(--cat-${task.category})">
                    <div class="task-item-mini-left">
                      <span class="task-check-done">✓</span>
                      <span class="task-item-mini-title" style="text-decoration: line-through; opacity: 0.6;">${escapeHtml(task.title)}</span>
                    </div>
                    <button class="btn-small uncomplete" onclick="uncompleteTask('${escapeAttr(task.id)}')" style="font-size: 12px;">↩️</button>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}

        <!-- 포모도로 (활성 시에만) -->
        ${_renderPomodoroIfActive()}

        <!-- 상세 추가 폼 (수정 모드일 때만) -->
        ${appState.showDetailedAdd ? _renderDetailedAddForm(categoryFields) : ''}

        ${appState.tasks.length === 0 ? `
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <div>작업이 없습니다</div>
            <div style="font-size: 16px; margin-top: 10px">위 입력창에서 새 작업을 추가해보세요</div>
          </div>
        ` : ''}
        `;
}

/**
 * 빈 상태 (NavigatorZero)
 */
function _renderTodayEmptyState(completedToday) {
  const rest = getRestActivity();
  const streak = appState.streak.current;
  const messages = [
    '오늘의 할 일을 모두 끝냈어요!',
    '깔끔하게 정리됐어요!',
    '완벽한 하루!',
    '오늘도 해냈어요!'
  ];
  const msg = messages[Math.floor(Math.random() * messages.length)];
  return `
    <div class="empty-state-enhanced todoist-zero" id="todoist-zero">
      <div class="empty-state-icon-large">🏆</div>
      <div class="empty-state-title">#NavigatorZero</div>
      <div class="empty-state-subtitle">
        ${msg}<br>
        오늘 <strong>${completedToday}개</strong> 완료
        ${streak > 1 ? ` · 🔥 ${streak}일 연속` : ''}
      </div>
      <div class="empty-state-actions">
        <button class="empty-state-btn" onclick="showToast('${escapeAttr(rest.icon)} ${escapeAttr(rest.text)}: ${escapeAttr(rest.desc)}', 'success')">
          ${escapeHtml(rest.icon)} ${escapeHtml(rest.text)}
        </button>
      </div>
    </div>
    <script>
      (function() {
        if (${completedToday} >= 1) {
          setTimeout(function() { if (typeof showConfetti === 'function') showConfetti(); }, 300);
        }
      })();
    </script>
  `;
}

/**
 * 리듬 트래커 (컴팩트)
 */
function _renderRhythmCompact() {
  const today = getLogicalDate();
  const rhythm = appState.lifeRhythm.today.date === today ? appState.lifeRhythm.today : { wakeUp: null, homeDepart: null, workArrive: null, workDepart: null, homeArrive: null, sleep: null, medications: {} };

  return `
    <div class="life-rhythm-tracker" style="margin-bottom: 12px;">
      <div class="life-rhythm-buttons six-items">
        <button class="life-rhythm-btn ${rhythm.wakeUp ? 'recorded' : ''}"
                onclick="handleLifeRhythmClick('wakeUp', ${rhythm.wakeUp ? 'true' : 'false'}, event)">
          <span class="life-rhythm-icon">☀️</span>
          <span class="life-rhythm-label">기상</span>
          <span class="life-rhythm-time">${rhythm.wakeUp || '--:--'}</span>
        </button>
        <button class="life-rhythm-btn ${rhythm.homeDepart ? 'recorded' : ''}"
                onclick="handleLifeRhythmClick('homeDepart', ${rhythm.homeDepart ? 'true' : 'false'}, event)">
          <span class="life-rhythm-icon">🚶</span>
          <span class="life-rhythm-label">집출발</span>
          <span class="life-rhythm-time">${rhythm.homeDepart || '--:--'}</span>
        </button>
        <button class="life-rhythm-btn ${rhythm.workArrive ? 'recorded' : ''}"
                onclick="handleLifeRhythmClick('workArrive', ${rhythm.workArrive ? 'true' : 'false'}, event)">
          <span class="life-rhythm-icon">🏢</span>
          <span class="life-rhythm-label">근무시작</span>
          <span class="life-rhythm-time">${rhythm.workArrive || '--:--'}</span>
        </button>
        <button class="life-rhythm-btn ${rhythm.workDepart ? 'recorded' : ''}"
                onclick="handleLifeRhythmClick('workDepart', ${rhythm.workDepart ? 'true' : 'false'}, event)">
          <span class="life-rhythm-icon">🚀</span>
          <span class="life-rhythm-label">근무종료</span>
          <span class="life-rhythm-time">${rhythm.workDepart || '--:--'}</span>
        </button>
        <button class="life-rhythm-btn ${rhythm.homeArrive ? 'recorded' : ''}"
                onclick="handleLifeRhythmClick('homeArrive', ${rhythm.homeArrive ? 'true' : 'false'}, event)">
          <span class="life-rhythm-icon">🏠</span>
          <span class="life-rhythm-label">집도착</span>
          <span class="life-rhythm-time">${rhythm.homeArrive || '--:--'}</span>
        </button>
        <button class="life-rhythm-btn ${rhythm.sleep ? 'recorded' : ''}"
                onclick="handleLifeRhythmClick('sleep', ${rhythm.sleep ? 'true' : 'false'}, event)">
          <span class="life-rhythm-icon">🌙</span>
          <span class="life-rhythm-label">취침</span>
          <span class="life-rhythm-time">${rhythm.sleep || '--:--'}</span>
        </button>
      </div>
    </div>
  `;
}

/**
 * 복약 트래커 (컴팩트)
 */
function _renderMedicationCompact() {
  const medSlots = getMedicationSlots();
  if (!medSlots || medSlots.length === 0) return '';

  const todayStr = getLogicalDate();
  const todayRhythm = appState.lifeRhythm.today.date === todayStr ? appState.lifeRhythm.today : {};
  const todayMeds = (todayRhythm.medications) || {};
  const takenCount = medSlots.filter(s => todayMeds[s.id]).length;
  const totalCount = medSlots.length;

  return `
    <div class="medication-tracker">
      <div class="medication-header">
        <span class="medication-title">💊 복약 ${takenCount}/${totalCount}</span>
      </div>
      <div class="medication-slots">
        ${medSlots.map(slot => {
          const taken = !!todayMeds[slot.id];
          const timeVal = todayMeds[slot.id] || '--:--';
          return `
            <button class="medication-btn ${taken ? 'taken' : ''} ${slot.required ? 'required' : ''}"
                    onclick="handleMedicationClick('${escapeAttr(slot.id)}', ${taken}, event)">
              <span class="med-icon">${slot.icon}</span>
              <span class="med-label">${escapeHtml(slot.label)}</span>
              <span class="med-time">${timeVal}</span>
            </button>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * 포모도로 (활성 시에만)
 */
function _renderPomodoroIfActive() {
  const pomo = appState.pomodoro;
  const currentTask = pomo.currentTaskId ? appState.tasks.find(t => t.id === pomo.currentTaskId) : null;
  if (!pomo.isRunning && !pomo.isBreak && pomo.completedPomodoros === 0) {
    return '';
  }
  return `
    <div class="pomodoro-section ${pomo.isRunning ? 'active' : ''} ${pomo.isBreak ? 'break' : ''}">
      <div class="pomodoro-title">${pomo.isBreak ? '☕ 휴식 중' : '🍅 포모도로'}</div>
      <div class="pomodoro-time" id="pomodoro-time">${formatPomodoroTime(pomo.timeLeft)}</div>
      ${currentTask ? `<div class="pomodoro-task" style="font-size: 15px; color: var(--text-secondary); margin-top: 4px; text-align: center;">🎯 ${escapeHtml(currentTask.title)}</div>` : ''}
      <div class="pomodoro-controls">
        ${pomo.isRunning ? `
          <button class="pomodoro-btn pause" onclick="pausePomodoro()">⏸ 일시정지</button>
        ` : `
          <button class="pomodoro-btn start" onclick="resumePomodoro()">▶ 재개</button>
        `}
        <button class="pomodoro-btn stop" onclick="stopPomodoro()">⏹ 중지</button>
      </div>
    </div>
  `;
}

/**
 * 상세 추가 폼 (수정 모드)
 */
function _renderDetailedAddForm(categoryFields) {
  return `
    <div class="add-task-section">
      <h3>${appState.editingTaskId ? svgIcon('edit', 16) + ' 작업 수정' : svgIcon('plus', 16) + ' 상세 추가'}</h3>
      <div class="form-group">
        <label class="form-label">카테고리</label>
        <select class="form-select" id="detailed-category" onchange="updateDetailedTaskCategory(this.value)">
          <option value="본업" ${appState.detailedTask.category === '본업' ? 'selected' : ''}>본업</option>
          <option value="부업" ${appState.detailedTask.category === '부업' ? 'selected' : ''}>부업</option>
          <option value="일상" ${appState.detailedTask.category === '일상' ? 'selected' : ''}>일상</option>
          <option value="가족" ${appState.detailedTask.category === '가족' ? 'selected' : ''}>가족</option>
        </select>
      </div>

      ${appState.detailedTask.category === '본업' && appState.workProjects.filter(p => !p.archived).length > 0 ? `
        <div class="work-project-link-section" style="background: var(--bg-tertiary); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <div class="form-group" style="margin-bottom: 8px;">
            <label class="form-label">📁 프로젝트 연결 (선택)</label>
            <select class="form-select" id="detailed-work-project" onchange="updateWorkProjectLink(this.value)">
              <option value="">연결 안함 (일반 할일)</option>
              ${appState.workProjects.filter(p => !p.archived).map(p => `
                <option value="${p.id}" ${appState.detailedTask.workProjectId === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>
              `).join('')}
            </select>
          </div>
          ${appState.detailedTask.workProjectId ? `
            <div class="form-group" style="margin-bottom: 8px;">
              <label class="form-label">📋 단계</label>
              <select class="form-select" id="detailed-work-stage" onchange="updateWorkStageLink(this.value)">
                ${appState.workProjectStages.map((stage, idx) => `
                  <option value="${idx}" ${appState.detailedTask.workStageIdx === idx ? 'selected' : ''}>${idx + 1}. ${stage}</option>
                `).join('')}
              </select>
            </div>
            ${(() => {
              const proj = appState.workProjects.find(p => p.id === appState.detailedTask.workProjectId);
              const stageIdx = appState.detailedTask.workStageIdx || 0;
              const subcats = proj?.stages[stageIdx]?.subcategories || [];
              if (subcats.length > 0) {
                return `
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label">📂 중분류</label>
                    <select class="form-select" id="detailed-work-subcat" onchange="updateWorkSubcatLink(this.value)">
                      ${subcats.map((sub, idx) => `
                        <option value="${idx}" ${appState.detailedTask.workSubcatIdx === idx ? 'selected' : ''}>${escapeHtml(sub.name)}</option>
                      `).join('')}
                    </select>
                  </div>
                `;
              } else {
                return '<div style="color: var(--text-muted); font-size: 14px;">이 단계에 중분류가 없습니다.</div>';
              }
            })()}
          ` : ''}
        </div>
      ` : ''}

      <div class="form-group">
        <label class="form-label">제목</label>
        <input type="text" class="form-input" id="detailed-title" placeholder="작업 제목" value="${escapeHtml(appState.detailedTask.title)}">
      </div>
      <div class="form-group">
        <label class="form-label">설명 (선택)</label>
        <textarea class="form-input form-textarea" id="detailed-description" placeholder="작업 내용, 메모 등" rows="2">${escapeHtml(appState.detailedTask.description || '')}</textarea>
      </div>
      ${categoryFields[appState.detailedTask.category]}

      <!-- 태그 -->
      <div class="form-group">
        <label class="form-label">태그</label>
        <div class="tags-input-container">
          <div class="selected-tags">
            ${(appState.detailedTask.tags || []).map(tag => `
              <span class="tag selected" onclick="removeTagFromTask('${escapeAttr(tag)}')">${escapeHtml(tag)} ×</span>
            `).join('')}
          </div>
          <div class="available-tags">
            ${appState.availableTags.filter(tag => !(appState.detailedTask.tags || []).includes(tag)).map(tag => `
              <span class="tag" onclick="addTagToTask('${escapeAttr(tag)}')">${escapeHtml(tag)}</span>
            `).join('')}
          </div>
          <div class="new-tag-input">
            <input type="text" class="form-input tag-input" id="new-tag-input" placeholder="새 태그 입력 후 Enter">
          </div>
        </div>
      </div>

      <!-- 서브태스크 -->
      <div class="form-group">
        <label class="form-label">서브태스크</label>
        <div class="subtasks-container">
          ${(appState.detailedTask.subtasks || []).map((subtask, index) => `
            <div class="subtask-item ${subtask.completed ? 'completed' : ''}">
              <span class="subtask-list-check" onclick="toggleDetailedSubtask(${index})" style="cursor:pointer">${subtask.completed ? '✓' : index + 1}</span>
              <span class="subtask-text ${subtask.completed ? 'completed' : ''}" style="${subtask.completed ? 'text-decoration: line-through; color: var(--text-muted);' : ''}">${escapeHtml(subtask.text)}</span>
              <button class="subtask-remove" onclick="removeSubtask(${index})">×</button>
            </div>
          `).join('')}
          <div class="subtask-add">
            <textarea class="form-input subtask-input" id="new-subtask-input" rows="1" placeholder="서브태스크 추가 후 Enter (여러 줄 붙여넣기 가능)"></textarea>
          </div>
        </div>
      </div>

      ${appState.editingTaskId ? `
        <button class="btn btn-primary" onclick="detailedAdd()">✓ 수정 완료</button>
        <button class="btn btn-secondary" onclick="cancelEdit()">✕ 취소</button>
      ` : `
        <button class="btn btn-primary" onclick="detailedAdd()">추가하기</button>
      `}
    </div>
  `;
}
