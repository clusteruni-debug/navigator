// ============================================
// 본업 프로젝트 - 모달 표시 (showWorkModal)
// (work-modal.js에서 분리)
// ============================================

/**
 * 모달 표시
 */
function showWorkModal(type, projectId = null, stageIdx = null, subcatIdx = null, taskIdx = null, logIdx = null) {
  workModalState = { type, projectId, stageIdx, subcategoryIdx: subcatIdx, taskIdx, logIdx };

  const modal = document.getElementById('work-input-modal');
  const title = document.getElementById('work-modal-title');
  const body = document.getElementById('work-modal-body');

  let titleText = '';
  let bodyHtml = '';

  const project = projectId ? appState.workProjects.find(p => p.id === projectId) : null;

  switch(type) {
    case 'project': {
      titleText = '📁 새 프로젝트';
      const templates = appState.workTemplates;
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">프로젝트 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" placeholder="예: UT 10월차" autofocus>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">템플릿</label>
          <div class="work-status-group" style="flex-wrap: wrap;">
            <button type="button" class="work-status-option template-pill selected" data-template-id="">템플릿 없음</button>
            ${templates.map(t => {
              const stageCount = t.stageNames ? t.stageNames.length : t.stages.length;
              return '<button type="button" class="work-status-option template-pill" data-template-id="' + escapeAttr(t.id) + '">' +
                escapeHtml(t.name) +
                ' <span style="font-size:12px;color:var(--text-muted);">(' + stageCount + '단계)</span>' +
              '</button>';
            }).join('')}
          </div>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">마감일 (선택)</label>
          <input type="date" class="work-modal-input" id="work-input-deadline">
        </div>
      `;
      break;
    }
    case 'subcategory':
      titleText = '📂 중분류 추가';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">중분류 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" placeholder="예: 사전 준비" autofocus>
        </div>
      `;
      break;
    case 'rename-subcategory': {
      const renameSubcat = project?.stages[stageIdx]?.subcategories?.[subcatIdx];
      titleText = '✏️ 중분류 이름 변경';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">중분류 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" value="${escapeAttr(renameSubcat?.name || '')}" autofocus>
        </div>
      `;
      break;
    }
    case 'task':
      titleText = '📝 항목 추가';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">항목 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" placeholder="예: 작업명 입력" autofocus>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">진행 상태</label>
          <div class="work-status-group">
            <button type="button" class="work-status-option selected" data-status="not-started">미시작</button>
            <button type="button" class="work-status-option" data-status="in-progress">진행중</button>
            <button type="button" class="work-status-option" data-status="completed">완료</button>
            <button type="button" class="work-status-option" data-status="blocked">보류</button>
          </div>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label" style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
            <input type="checkbox" id="work-input-canStartEarly" style="width: 18px; height: 18px; cursor: pointer;">
            <span>미리 시작 가능 (선제적 추천 대상)</span>
          </label>
        </div>
      `;
      break;
    case 'log':
      titleText = '📋 진행 기록 추가';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">진행 내용 <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">(Slack에서 붙여넣으면 자동 변환)</span></label>
          <textarea class="work-modal-textarea" id="work-input-content" onpaste="handleSlackPasteToWorkModal(event)" placeholder="* 진행 내용을 입력하세요\n   * 세부 내용" autofocus></textarea>
        </div>
      `;
      break;
    case 'edit-task': {
      const editTask = project?.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
      titleText = '✏️ 항목 편집';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">항목 이름</label>
          <textarea class="work-modal-textarea" id="work-input-content" autofocus>${escapeHtml(editTask?.title || '')}</textarea>
        </div>
      `;
      break;
    }
    case 'edit-log': {
      const editTask2 = project?.stages[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx];
      const editLog = editTask2?.logs?.[logIdx];
      const isCompletion = editLog?.content === '✓ 완료';
      titleText = '✏️ 기록 편집';
      if (isCompletion) {
        bodyHtml = `
          <div class="work-modal-field">
            <label class="work-modal-label">완료 날짜</label>
            <input type="date" class="work-modal-input" id="work-input-date" value="${escapeAttr(editLog?.date || '')}" autofocus>
          </div>
        `;
      } else {
        bodyHtml = `
          <div class="work-modal-field">
            <label class="work-modal-label">기록 내용 <span style="font-size: 11px; color: var(--text-muted); font-weight: normal;">(Slack에서 붙여넣으면 자동 변환)</span></label>
            <textarea class="work-modal-textarea" id="work-input-content" onpaste="handleSlackPasteToWorkModal(event)" autofocus>${escapeHtml(editLog?.content || '')}</textarea>
          </div>
          <div class="work-modal-field">
            <label class="work-modal-label">날짜</label>
            <input type="date" class="work-modal-input" id="work-input-date" value="${escapeAttr(editLog?.date || '')}">
          </div>
        `;
      }
      break;
    }
    case 'deadline':
      titleText = '📅 프로젝트 일정';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${escapeAttr(project?.startDate || '')}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">마감일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${escapeAttr(project?.deadline || '')}">
        </div>
        ${project?.startDate && project?.deadline ? `
          <div style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">
            📆 총 ${Math.ceil((new Date(project.deadline) - new Date(project.startDate)) / (1000 * 60 * 60 * 24))}일 소요 예정
          </div>
        ` : ''}
      `;
      break;
    case 'stage-deadline': {
      titleText = '📅 단계 일정';
      const stageData = project?.stages[stageIdx] || {};
      const stageNameForModal = getStageName(project, stageIdx);
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(stageNameForModal)} 시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${escapeAttr(stageData.startDate || '')}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(stageNameForModal)} 마감일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${escapeAttr(stageData.endDate || '')}">
        </div>
      `;
      break;
    }
    case 'subcat-deadline': {
      titleText = '📅 중분류 일정';
      const subcatData = project?.stages[stageIdx]?.subcategories[subcatIdx] || {};
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(subcatData.name) || '중분류'} 시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${escapeAttr(subcatData.startDate || '')}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(subcatData.name) || '중분류'} 종료일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${escapeAttr(subcatData.endDate || '')}">
        </div>
      `;
      break;
    }
    case 'participant':
      titleText = '👥 참여자 목표 설정';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">목표 참여자 수</label>
          <input type="number" class="work-modal-input" id="work-input-goal" placeholder="예: 10" min="1" value="${escapeAttr(project?.participantGoal || '')}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">현재 참여자 수</label>
          <input type="number" class="work-modal-input" id="work-input-count" placeholder="예: 0" min="0" value="${escapeAttr(project?.participantCount || 0)}">
        </div>
      `;
      break;
    case 'template-select': {
      titleText = '📋 템플릿 선택';
      const allTemplates = appState.workTemplates;
      const totalTaskCount = (t) => t.stages.reduce((sum, s) => sum + (s.subcategories || []).reduce((ss, sub) => ss + sub.tasks.length, 0), 0);
      if (allTemplates.length === 0) {
        bodyHtml = `
          <div class="work-modal-field" style="text-align: center; padding: 20px; color: var(--text-muted);">
            <div style="font-size: 16px; margin-bottom: 12px;">저장된 템플릿이 없습니다</div>
            <div style="font-size: 14px;">📋 템플릿 관리에서 새 템플릿을 추가하거나,<br>프로젝트 상세에서 "템플릿으로 저장"을 이용하세요.</div>
          </div>
        `;
      } else {
        bodyHtml = `
          <div class="work-modal-field">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${allTemplates.map(t => `
                <div style="display: flex; align-items: stretch; gap: 4px;">
                  <button type="button" class="work-status-option template-option" data-template-id="${escapeAttr(t.id)}" style="text-align: left; padding: 12px; flex: 1;">
                    <div style="font-weight: 500;">${escapeHtml(t.name)}</div>
                    <div style="font-size: 15px; color: var(--text-muted); margin-top: 4px;">
                      ${escapeHtml((t.stageNames || t.stages.map((_, i) => appState.workProjectStages[i])).filter(Boolean).join(' → '))}
                    </div>
                    <div style="font-size: 15px; color: var(--text-muted);">
                      ${totalTaskCount(t)}개 항목
                    </div>
                  </button>
                  <button type="button" class="work-project-action-btn" onclick="exportTemplate('${escapeAttr(t.id)}')" title="JSON 내보내기" style="padding: 8px; font-size: 16px;">📤</button>
                </div>
              `).join('')}
            </div>
          </div>
        `;
      }
      break;
    }
    case 'template-import': {
      titleText = '📥 템플릿 가져오기';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">JSON 템플릿 붙여넣기</label>
          <textarea class="work-modal-input" id="work-input-template-json" rows="10"
            placeholder='{"name": "템플릿 이름", "stageNames": ["단계1", ...], "stages": [{"subcategories": [{"name": "분류", "tasks": [{"title": "작업"}]}]}]}'
            style="font-family: monospace; font-size: 14px; resize: vertical; min-height: 150px;"></textarea>
          <div style="font-size: 15px; color: var(--text-muted); margin-top: 8px;">
            프로젝트에서 📤 내보내기한 JSON을 붙여넣으세요.<br>
            가져온 템플릿은 모든 기기에서 자동 동기화됩니다.
          </div>
        </div>
      `;
      break;
    }
    case 'template-manage': {
      titleText = '📋 템플릿 관리';
      const manageTpls = appState.workTemplates;
      const mTotalTaskCount = (t) => t.stages.reduce((sum, s) => sum + (s.subcategories || []).reduce((ss, sub) => ss + sub.tasks.length, 0), 0);
      bodyHtml = `
        <div style="max-height: 60vh; overflow-y: auto;">
          ${manageTpls.length === 0 ? '<div style="text-align: center; padding: 20px; color: var(--text-muted);">저장된 템플릿이 없습니다</div>' :
            manageTpls.map(t => {
              const stageList = (t.stageNames || []).join(' → ');
              const taskCount = mTotalTaskCount(t);
              return '<div style="background: var(--bg-tertiary); border-radius: 10px; padding: 14px; margin-bottom: 10px;">' +
                '<div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">' +
                  '<div style="flex: 1; min-width: 0;">' +
                    '<div style="font-weight: 600; font-size: 15px;">' + escapeHtml(t.name) + (t.isDefault ? ' <span style="font-size:12px;color:var(--text-muted);">(기본)</span>' : '') + '</div>' +
                    '<div style="font-size: 13px; color: var(--text-muted); margin-top: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' +
                      escapeHtml(stageList) + (taskCount > 0 ? ' | ' + taskCount + '개 항목' : '') +
                    '</div>' +
                  '</div>' +
                  '<div style="display: flex; gap: 4px; flex-shrink: 0;">' +
                    '<button type="button" class="work-project-action-btn" onclick="showTemplateEditor(\'' + escapeAttr(t.id) + '\')" title="편집" style="padding: 8px; font-size: 16px;">✏️</button>' +
                    '<button type="button" class="work-project-action-btn" onclick="exportTemplate(\'' + escapeAttr(t.id) + '\')" title="내보내기" style="padding: 8px; font-size: 16px;">📤</button>' +
                    '<button type="button" class="work-project-action-btn" onclick="deleteWorkTemplate(\'' + escapeAttr(t.id) + '\')" title="삭제" style="padding: 8px; font-size: 16px;">🗑</button>' +
                  '</div>' +
                '</div>' +
              '</div>';
            }).join('')}
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px;">
          <button type="button" class="work-project-add-btn" onclick="createCustomTemplate()" style="flex: 1;">+ 새 템플릿</button>
          <button type="button" class="work-project-action-btn" onclick="closeWorkModal(); showWorkModal('template-import')" style="padding: 10px 16px; font-size: 14px;">📥 가져오기</button>
        </div>
      `;
      break;
    }
  }

  title.textContent = titleText;
  body.innerHTML = bodyHtml;
  modal.classList.add('show');

  // 상태 선택 버튼 이벤트
  if (type === 'task') {
    body.querySelectorAll('.work-status-option').forEach(btn => {
      btn.onclick = () => {
        body.querySelectorAll('.work-status-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });
  }

  // 프로젝트 생성 모달: 템플릿 pill 이벤트
  if (type === 'project') {
    body.querySelectorAll('.template-pill').forEach(btn => {
      btn.onclick = () => {
        body.querySelectorAll('.template-pill').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });
  }

  // 템플릿 선택 이벤트
  if (type === 'template-select') {
    body.querySelectorAll('.template-option').forEach(btn => {
      btn.onclick = () => {
        body.querySelectorAll('.template-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });
  }

  // 템플릿 관리 모달: 닫기 버튼만 표시
  if (type === 'template-manage') {
    const actions = modal.querySelector('.work-modal-actions');
    if (actions) {
      actions.innerHTML = '<button class="cancel" onclick="closeWorkModal()">닫기</button>';
    }
  }

  // 기록 추가 모달: "저장 + 복사" 버튼 추가
  if (type === 'log') {
    const actions = modal.querySelector('.work-modal-actions');
    if (actions) {
      actions.innerHTML = `
        <button class="cancel" onclick="closeWorkModal()">취소</button>
        <button class="confirm" onclick="confirmWorkModalAndCopy()" style="background: var(--accent-primary);">저장 + 복사</button>
        <button class="confirm" onclick="confirmWorkModal()">저장</button>
      `;
    }
  }

  // textarea에 Tab키 + auto-resize 초기화
  body.querySelectorAll('textarea').forEach(ta => initEnhancedTextarea(ta));

  // input[type=text]에 Enter 키로 확인
  body.querySelectorAll('input[type=text], input:not([type])').forEach(inp => {
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); confirmWorkModal(); }
    });
  });

  // 첫 입력 필드에 포커스
  setTimeout(() => {
    const input = body.querySelector('input, textarea');
    if (input) input.focus();
  }, 100);
}
window.showWorkModal = showWorkModal;
