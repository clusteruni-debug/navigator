// ============================================
// 본업 프로젝트 - 모달 관리
// ============================================

/**
 * 모달 표시
 */
function showWorkModal(type, projectId = null, stageIdx = null, subcatIdx = null, taskIdx = null) {
  workModalState = { type, projectId, stageIdx, subcategoryIdx: subcatIdx, taskIdx };

  const modal = document.getElementById('work-input-modal');
  const title = document.getElementById('work-modal-title');
  const body = document.getElementById('work-modal-body');

  let titleText = '';
  let bodyHtml = '';

  const project = projectId ? appState.workProjects.find(p => p.id === projectId) : null;

  switch(type) {
    case 'project':
      titleText = '📁 새 프로젝트';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">프로젝트 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" placeholder="예: UT 10월차" autofocus>
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">마감일 (선택)</label>
          <input type="date" class="work-modal-input" id="work-input-deadline">
        </div>
      `;
      break;
    case 'subcategory':
      titleText = '📂 중분류 추가';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">중분류 이름</label>
          <input type="text" class="work-modal-input" id="work-input-name" placeholder="예: 사전 준비" autofocus>
        </div>
      `;
      break;
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
      `;
      break;
    case 'log':
      titleText = '📋 진행 기록 추가';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">진행 내용</label>
          <textarea class="work-modal-textarea" id="work-input-content" placeholder="오늘 진행한 내용을 입력하세요..." autofocus></textarea>
        </div>
      `;
      break;
    case 'deadline':
      titleText = '📅 프로젝트 일정';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${project?.startDate || ''}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">마감일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${project?.deadline || ''}">
        </div>
        ${project?.startDate && project?.deadline ? `
          <div style="color: var(--text-muted); font-size: 14px; margin-top: 8px;">
            📆 총 ${Math.ceil((new Date(project.deadline) - new Date(project.startDate)) / (1000 * 60 * 60 * 24))}일 소요 예정
          </div>
        ` : ''}
      `;
      break;
    case 'stage-deadline':
      titleText = '📅 단계 일정';
      const stageData = project?.stages[stageIdx] || {};
      const stageNameForModal = getStageName(project, stageIdx);
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(stageNameForModal)} 시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${stageData.startDate || ''}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(stageNameForModal)} 마감일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${stageData.deadline || ''}">
        </div>
      `;
      break;
    case 'subcat-deadline':
      titleText = '📅 중분류 일정';
      const subcatData = project?.stages[stageIdx]?.subcategories[subcatIdx] || {};
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(subcatData.name) || '중분류'} 시작일</label>
          <input type="date" class="work-modal-input" id="work-input-startdate" value="${subcatData.startDate || ''}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">${escapeHtml(subcatData.name) || '중분류'} 종료일</label>
          <input type="date" class="work-modal-input" id="work-input-deadline" value="${subcatData.endDate || ''}">
        </div>
      `;
      break;
    case 'participant':
      titleText = '👥 참여자 목표 설정';
      bodyHtml = `
        <div class="work-modal-field">
          <label class="work-modal-label">목표 참여자 수</label>
          <input type="number" class="work-modal-input" id="work-input-goal" placeholder="예: 10" min="1" value="${project?.participantGoal || ''}">
        </div>
        <div class="work-modal-field">
          <label class="work-modal-label">현재 참여자 수</label>
          <input type="number" class="work-modal-input" id="work-input-count" placeholder="예: 0" min="0" value="${project?.participantCount || 0}">
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
            <div style="font-size: 14px;">📥 가져오기 버튼으로 JSON 템플릿을 추가하거나,<br>프로젝트 상세에서 "템플릿으로 저장"을 이용하세요.</div>
          </div>
        `;
      } else {
        bodyHtml = `
          <div class="work-modal-field">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              ${allTemplates.map(t => `
                <div style="display: flex; align-items: stretch; gap: 4px;">
                  <button type="button" class="work-status-option template-option" data-template-id="${t.id}" style="text-align: left; padding: 12px; flex: 1;">
                    <div style="font-weight: 500;">${escapeHtml(t.name)}</div>
                    <div style="font-size: 15px; color: var(--text-muted); margin-top: 4px;">
                      ${escapeHtml((t.stageNames || t.stages.map((_, i) => appState.workProjectStages[i])).filter(Boolean).join(' → '))}
                    </div>
                    <div style="font-size: 15px; color: var(--text-muted);">
                      ${totalTaskCount(t)}개 항목
                    </div>
                  </button>
                  <button type="button" class="work-project-action-btn" onclick="exportTemplate('${t.id}')" title="JSON 내보내기" style="padding: 8px; font-size: 16px;">📤</button>
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

  // 템플릿 선택 이벤트
  if (type === 'template-select') {
    body.querySelectorAll('.template-option').forEach(btn => {
      btn.onclick = () => {
        body.querySelectorAll('.template-option').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      };
    });
  }

  // 첫 입력 필드에 포커스
  setTimeout(() => {
    const input = body.querySelector('input, textarea');
    if (input) input.focus();
  }, 100);
}
window.showWorkModal = showWorkModal;

/**
 * 모달 닫기
 */
function closeWorkModal() {
  const modal = document.getElementById('work-input-modal');
  modal.classList.remove('show');

  // Restore default modal actions (MM report modal replaces them)
  const actions = modal.querySelector('.work-modal-actions');
  if (actions && !actions.querySelector('.confirm')) {
    actions.innerHTML = `
      <button class="cancel" onclick="closeWorkModal()">취소</button>
      <button class="confirm" onclick="confirmWorkModal()">확인</button>
    `;
  }

  workModalState = { type: null, projectId: null, stageIdx: null, subcategoryIdx: null, taskIdx: null };
}
window.closeWorkModal = closeWorkModal;

/**
 * 모달 확인
 */
function confirmWorkModal() {
  const { type, projectId, stageIdx, subcategoryIdx, taskIdx } = workModalState;

  switch(type) {
    case 'project': {
      const name = document.getElementById('work-input-name').value.trim();
      if (!name) { showToast('이름을 입력하세요', 'error'); return; }
      const deadline = document.getElementById('work-input-deadline')?.value || null;
      addWorkProject(name, deadline);
      break;
    }
    case 'subcategory': {
      const name = document.getElementById('work-input-name').value.trim();
      if (!name) { showToast('이름을 입력하세요', 'error'); return; }
      addSubcategory(projectId, stageIdx, name);
      break;
    }
    case 'task': {
      const name = document.getElementById('work-input-name').value.trim();
      if (!name) { showToast('이름을 입력하세요', 'error'); return; }
      const status = document.querySelector('.work-status-option.selected')?.dataset.status || 'not-started';
      addWorkTask(projectId, stageIdx, subcategoryIdx, name, status);
      break;
    }
    case 'log': {
      const content = document.getElementById('work-input-content').value.trim();
      if (!content) { showToast('내용을 입력하세요', 'error'); return; }
      addWorkLog(projectId, stageIdx, subcategoryIdx, taskIdx, content);
      break;
    }
    case 'deadline': {
      const startDate = document.getElementById('work-input-startdate').value || null;
      const deadline = document.getElementById('work-input-deadline').value || null;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project) {
        project.startDate = startDate;
        project.deadline = deadline;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('일정 설정됨', 'success');
      }
      break;
    }
    case 'stage-deadline': {
      const startDate = document.getElementById('work-input-startdate').value || null;
      const deadline = document.getElementById('work-input-deadline').value || null;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project) {
        project.stages[stageIdx].startDate = startDate;
        project.stages[stageIdx].deadline = deadline;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('단계 일정 설정됨', 'success');
      }
      break;
    }
    case 'subcat-deadline': {
      const startDate = document.getElementById('work-input-startdate').value || null;
      const endDate = document.getElementById('work-input-deadline').value || null;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project && project.stages[stageIdx]?.subcategories[subcategoryIdx]) {
        project.stages[stageIdx].subcategories[subcategoryIdx].startDate = startDate;
        project.stages[stageIdx].subcategories[subcategoryIdx].endDate = endDate;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('중분류 일정 설정됨', 'success');
      }
      break;
    }
    case 'participant': {
      const goal = parseInt(document.getElementById('work-input-goal').value) || null;
      const count = parseInt(document.getElementById('work-input-count').value) || 0;
      const project = appState.workProjects.find(p => p.id === projectId);
      if (project) {
        project.participantGoal = goal;
        project.participantCount = count;
        project.updatedAt = new Date().toISOString();
        saveWorkProjects();
        renderStatic();
        showToast('참여자 목표 설정됨', 'success');
      }
      break;
    }
    case 'template-select': {
      const selected = document.querySelector('.template-option.selected');
      if (selected) {
        const templateId = selected.dataset.templateId;
        applyTemplate(templateId);
      }
      break;
    }
    case 'template-import': {
      const jsonText = document.getElementById('work-input-template-json').value.trim();
      if (!jsonText) { showToast('JSON을 입력하세요', 'error'); return; }

      try {
        const parsed = JSON.parse(jsonText);

        // 검증: 필수 필드
        if (!parsed.name || typeof parsed.name !== 'string') {
          showToast('name 필드가 필요합니다', 'error'); return;
        }
        if (!Array.isArray(parsed.stages) || parsed.stages.length === 0) {
          showToast('stages 배열이 필요합니다', 'error'); return;
        }

        // 검증: stages 구조
        for (let i = 0; i < parsed.stages.length; i++) {
          const stage = parsed.stages[i];
          if (!stage.subcategories || !Array.isArray(stage.subcategories)) {
            showToast(`stages[${i}]에 subcategories 배열이 필요합니다`, 'error'); return;
          }
          for (const sub of stage.subcategories) {
            if (!sub.name || !Array.isArray(sub.tasks)) {
              showToast('subcategories에 name과 tasks가 필요합니다', 'error'); return;
            }
            for (const task of sub.tasks) {
              if (!task.title) {
                showToast('tasks에 title이 필요합니다', 'error'); return;
              }
            }
          }
        }

        // 템플릿 생성
        const template = {
          id: generateId(),
          name: parsed.name,
          stageNames: parsed.stageNames || null,
          stages: parsed.stages.map(stage => ({
            subcategories: stage.subcategories.map(sub => ({
              name: sub.name,
              tasks: sub.tasks.map(t => ({
                title: t.title,
                ...(t.owner && { owner: t.owner }),
                ...(t.estimatedTime && { estimatedTime: t.estimatedTime })
              }))
            }))
          })),
          participantGoal: parsed.participantGoal || null,
          createdAt: new Date().toISOString()
        };

        appState.workTemplates.push(template);
        if (!appState.user) {
          localStorage.setItem('navigator-work-templates', JSON.stringify(appState.workTemplates));
        }
        if (appState.user) { syncToFirebase(); }
        showToast(`"${escapeHtml(template.name)}" 템플릿 가져오기 완료`, 'success');
        renderStatic();
      } catch (e) {
        showToast('JSON 파싱 오류: ' + e.message, 'error'); return;
      }
      break;
    }
    case 'mm-report': {
      // MM report modal has its own close button; no confirm action needed
      break;
    }
  }

  closeWorkModal();
}
window.confirmWorkModal = confirmWorkModal;

/**
 * 템플릿 적용
 */
function applyTemplate(templateId) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;

  const projectName = prompt('프로젝트 이름을 입력하세요:', template.name.replace(' 템플릿', ''));
  if (!projectName) return;

  // 템플릿에 stageNames가 있으면 그것 사용, 없으면 전역 기본값 사용
  const stageSource = template.stageNames || appState.workProjectStages;
  const stageCount = Math.max(stageSource.length, template.stages.length);

  const newProject = {
    id: generateId(),
    name: projectName,
    currentStage: 0,
    stages: Array.from({ length: stageCount }, (_, idx) => ({
      name: stageSource[idx] || ('단계 ' + (idx + 1)),
      completed: false,
      startDate: null,
      endDate: null,
      subcategories: template.stages[idx]?.subcategories?.map(sub => ({
        id: generateId(),
        name: sub.name,
        startDate: null,
        endDate: null,
        tasks: sub.tasks.map(t => ({
          id: generateId(),
          title: t.title,
          status: 'not-started',
          owner: t.owner || 'me',
          estimatedTime: t.estimatedTime || 30,
          actualTime: null,
          completedAt: null,
          logs: []
        }))
      })) || []
    })),
    participantGoal: template.participantGoal,
    participantCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  appState.workProjects.push(newProject);
  appState.activeWorkProject = newProject.id;
  saveWorkProjects();
  renderStatic();
  showToast(`"${projectName}" 생성됨`, 'success');
}

/**
 * 템플릿 JSON 내보내기 (클립보드 복사)
 */
function exportTemplate(templateId) {
  const template = appState.workTemplates.find(t => t.id === templateId);
  if (!template) return;

  // 내보내기용 JSON (id, createdAt 등 내부 필드 제외)
  const exportData = {
    name: template.name,
    stageNames: template.stageNames || null,
    stages: template.stages.map(stage => ({
      subcategories: (stage.subcategories || []).map(sub => ({
        name: sub.name,
        tasks: sub.tasks.map(t => {
          const task = { title: t.title };
          if (t.owner && t.owner !== 'me') task.owner = t.owner;
          if (t.estimatedTime && t.estimatedTime !== 30) task.estimatedTime = t.estimatedTime;
          return task;
        })
      }))
    })),
    participantGoal: template.participantGoal || null
  };

  const json = JSON.stringify(exportData, null, 2);
  navigator.clipboard.writeText(json).then(() => {
    showToast(`"${escapeHtml(template.name)}" 템플릿 JSON 복사됨`, 'success');
  }).catch(() => {
    // 클립보드 실패 시 프롬프트로 표시
    prompt('아래 JSON을 복사하세요:', json);
  });
}
window.exportTemplate = exportTemplate;

// ============================================
// MM Report Modal
// ============================================

/**
 * Show MM (Monthly Report) modal with month selector and generated report.
 */
function showMMReportModal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  const modal = document.getElementById('work-input-modal');
  const title = document.getElementById('work-modal-title');
  const body = document.getElementById('work-modal-body');

  workModalState = { type: 'mm-report', projectId: null, stageIdx: null, subcategoryIdx: null, taskIdx: null };

  title.textContent = '📊 MM 리포트';

  body.innerHTML = `
    <div class="work-modal-field">
      <label class="work-modal-label">리포트 기간</label>
      <input type="month" class="work-modal-input" id="mm-report-month" value="${year}-${String(month).padStart(2, '0')}">
    </div>
    <div id="mm-report-output" style="margin-top: 12px;">
      <div style="text-align: center; color: var(--text-muted); padding: 20px;">
        리포트를 생성하려면 아래 "생성" 버튼을 누르세요
      </div>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 12px;">
      <button type="button" class="work-project-action-btn" onclick="renderMMReport()" style="flex: 1; padding: 10px; font-size: 14px; font-weight: 600; background: var(--accent-blue); color: white; border-radius: 8px; border: none; cursor: pointer;">📊 생성</button>
      <button type="button" class="work-project-action-btn" id="mm-report-copy-btn" onclick="copyMMReport()" style="flex: 1; padding: 10px; font-size: 14px; font-weight: 600; background: var(--bg-tertiary); color: var(--text-secondary); border-radius: 8px; border: none; cursor: pointer; display: none;">📋 클립보드 복사</button>
    </div>
  `;

  // Override the confirm button to act as close
  const actions = modal.querySelector('.work-modal-actions');
  if (actions) {
    actions.innerHTML = `
      <button class="cancel" onclick="closeWorkModal()">닫기</button>
    `;
  }

  modal.classList.add('show');

  // Auto-generate for current month
  setTimeout(() => renderMMReport(), 100);
}
window.showMMReportModal = showMMReportModal;

/**
 * Render the MM report text into the modal output area.
 */
function renderMMReport() {
  const monthInput = document.getElementById('mm-report-month');
  if (!monthInput) return;

  const [yearStr, monthStr] = monthInput.value.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const report = generateMMReport(year, month);
  const output = document.getElementById('mm-report-output');
  const copyBtn = document.getElementById('mm-report-copy-btn');

  if (!report) {
    output.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 20px; background: var(--bg-secondary); border-radius: 8px;">
        📭 ${year}년 ${month}월 기록이 없습니다
      </div>
    `;
    if (copyBtn) copyBtn.style.display = 'none';
    return;
  }

  output.innerHTML = `
    <pre style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; max-height: 400px; overflow-y: auto; font-family: 'Pretendard', -apple-system, sans-serif;" id="mm-report-text">${escapeHtml(report)}</pre>
  `;
  if (copyBtn) copyBtn.style.display = 'block';
}
window.renderMMReport = renderMMReport;

/**
 * Copy the generated MM report to clipboard.
 */
function copyMMReport() {
  const reportEl = document.getElementById('mm-report-text');
  if (!reportEl) return;

  const text = reportEl.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('MM 리포트 클립보드에 복사됨', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('MM 리포트 클립보드에 복사됨', 'success');
  });
}
window.copyMMReport = copyMMReport;
