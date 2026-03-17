// ============================================
// 본업 프로젝트 - 양식 출력 + 메타 편집
// ============================================

// ============================================
// 프로젝트 메타 편집
// ============================================

/**
 * 프로젝트 메타 편집 모달 표시
 */
function showMetaEditor(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const m = project.meta || {};
  const modal = document.getElementById('work-input-modal');
  const title = document.getElementById('work-modal-title');
  const body = document.getElementById('work-modal-body');

  workModalState = { type: 'meta-edit', projectId, stageIdx: null, subcategoryIdx: null, taskIdx: null };

  title.textContent = '📋 프로젝트 정보';

  const fields = [
    { key: 'methodology', label: '방법론', placeholder: '예: 사용성 테스트, FGI', type: 'text' },
    { key: 'targetPlatform', label: '플랫폼', placeholder: '예: PC, 모바일, 크로스', type: 'text' },
    { key: 'recruitChannel', label: '모객 채널', placeholder: '예: 넥슨퍼스트, 커뮤니티', type: 'text' },
    { key: 'rewardType', label: '보상 유형', placeholder: '예: 무료캐시, 문화상품권', type: 'text' },
    { key: 'rewardAmount', label: '보상 규모', placeholder: '예: 5만원', type: 'text' },
    { key: 'participantCount', label: '참여 인원', placeholder: '예: 10', type: 'number' },
    { key: 'bufferCount', label: '버퍼 인원', placeholder: '예: 3', type: 'number' },
    { key: 'groupCount', label: '그룹 수', placeholder: '예: 2', type: 'number' },
    { key: 'testDuration', label: '테스트 소요시간', placeholder: '예: 60분', type: 'text' },
    { key: 'testDate', label: '테스트 예정일', placeholder: '', type: 'date' },
    { key: 'location', label: '테스트 장소', placeholder: '예: 넥슨 스페이스', type: 'text' },
    { key: 'outsourcingCompany', label: '외주업체명', placeholder: '예: OO리서치', type: 'text' },
    { key: 'notes', label: '기타 메모', placeholder: '추가 메모...', type: 'textarea' }
  ];

  body.innerHTML = '<div style="max-height: 60vh; overflow-y: auto; padding-right: 4px;">' +
    fields.map(f => {
      const val = m[f.key] || '';
      if (f.type === 'textarea') {
        return '<div class="work-modal-field">' +
          '<label class="work-modal-label">' + escapeHtml(f.label) + '</label>' +
          '<textarea class="work-modal-textarea" id="meta-' + f.key + '" placeholder="' + escapeAttr(f.placeholder) + '">' + escapeHtml(val) + '</textarea>' +
        '</div>';
      }
      return '<div class="work-modal-field">' +
        '<label class="work-modal-label">' + escapeHtml(f.label) + '</label>' +
        '<input type="' + f.type + '" class="work-modal-input" id="meta-' + f.key + '" placeholder="' + escapeAttr(f.placeholder) + '" value="' + escapeAttr(val) + '">' +
      '</div>';
    }).join('') +
  '</div>';

  modal.classList.add('show');

  setTimeout(() => {
    const firstInput = body.querySelector('input, textarea');
    if (firstInput) firstInput.focus();
  }, 100);
}
window.showMetaEditor = showMetaEditor;

/**
 * 프로젝트 메타 저장
 */
function saveProjectMeta(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const fields = ['methodology', 'targetPlatform', 'recruitChannel', 'rewardType', 'rewardAmount',
    'participantCount', 'bufferCount', 'groupCount', 'testDuration', 'testDate',
    'location', 'outsourcingCompany', 'notes'];

  const meta = {};
  fields.forEach(key => {
    const el = document.getElementById('meta-' + key);
    if (!el) return;
    const val = el.value.trim();
    if (val) {
      if (['participantCount', 'bufferCount', 'groupCount'].includes(key)) {
        meta[key] = parseInt(val) || 0;
      } else {
        meta[key] = val;
      }
    }
  });

  project.meta = meta;
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  showToast('프로젝트 정보 저장됨', 'success');
}

// confirmWorkModal에서 meta-edit 처리를 위한 확장
const _origConfirmWorkModal = window.confirmWorkModal;
window.confirmWorkModal = function() {
  if (workModalState.type === 'meta-edit') {
    saveProjectMeta(workModalState.projectId);
    closeWorkModal();
    renderStatic();
    return;
  }
  if (typeof _origConfirmWorkModal === 'function') _origConfirmWorkModal();
};

// ============================================
// 양식 출력 함수들
// ============================================

/**
 * A. 스크리너 기본 조건
 */
function _getMetaWithFallback(project) {
  const m = project.meta || {};
  return {
    ...m,
    participantCount: m.participantCount || project.participantGoal || null,
    bufferCount: m.bufferCount || null
  };
}

function exportScreenerSummary(project) {
  const m = _getMetaWithFallback(project);
  let text = '[스크리너 기본 조건]\n\n';
  text += '방법론: ' + (m.methodology || '미입력') + '\n';
  text += '플랫폼: ' + (m.targetPlatform || '미입력') + '\n';
  text += '모객 인원: ' + (m.participantCount || '미입력') + '명';
  if (m.bufferCount) text += ' (버퍼 ' + m.bufferCount + '명 포함)';
  text += '\n';
  text += '그룹 수: ' + (m.groupCount || '미입력') + '\n';
  text += '테스트 소요시간: ' + (m.testDuration || '미입력') + '\n';

  // 킥오프 > 타겟 유저 서브카테고리의 태스크 제목들 나열
  text += '\n[타겟 유저 조건]\n';
  if (project.stages && project.stages[0]) {
    const targetSub = (project.stages[0].subcategories || []).find(s => s.name === '타겟 유저');
    if (targetSub) {
      targetSub.tasks.forEach(t => {
        text += '- ' + t.title + ': \n';
      });
    }
  }
  return text;
}

/**
 * B. 외주 발주 요약
 */
function exportOutsourcingSummary(project) {
  const m = _getMetaWithFallback(project);
  let text = '[외주 발주 요약]\n\n';
  text += '프로젝트: ' + project.name + '\n';
  text += '방법론: ' + (m.methodology || '미입력') + '\n';
  text += '모객 인원: ' + (m.participantCount || '미입력') + '명';
  if (m.bufferCount) text += ' (버퍼 ' + m.bufferCount + '명)';
  text += '\n';
  text += '테스트 예정일: ' + (m.testDate || '미입력') + '\n';
  text += '보상: ' + (m.rewardType || '미입력') + ' ' + (m.rewardAmount || '') + '\n';
  text += '외주업체: ' + (m.outsourcingCompany || '미입력') + '\n';
  text += '모객 채널: ' + (m.recruitChannel || '미입력') + '\n';
  text += '\n[요청 사항]\n- \n';
  return text;
}

/**
 * C. 테스트 참여 안내문
 */
function exportParticipantGuide(project) {
  const m = _getMetaWithFallback(project);
  let text = '[테스트 참여 안내]\n\n';
  text += '안녕하세요, UX리서치팀입니다.\n';
  text += '아래와 같이 테스트가 진행될 예정이오니 참고 부탁드립니다.\n\n';
  text += '일시: ' + (m.testDate || '미입력') + '\n';
  text += '장소: ' + (m.location || '미입력') + '\n';
  text += '소요시간: ' + (m.testDuration || '미입력') + '\n';
  text += '보상: ' + (m.rewardType || '') + ' ' + (m.rewardAmount || '미입력') + '\n';
  text += '\n[준비물]\n- 본인 확인 가능한 신분증\n';
  text += '\n[유의사항]\n- 테스트 내용에 대한 보안 서약이 필요합니다\n';
  text += '- 테스트 중 개인 휴대폰 사용이 제한됩니다\n';
  return text;
}

/**
 * D. 넥슨플레이 게시 요청
 */
function exportNexonPlayRequest(project) {
  const m = _getMetaWithFallback(project);
  let text = '[넥슨플레이 게시/푸시 요청]\n\n';
  text += '프로젝트: ' + project.name + '\n';
  text += '게시 희망일: \n';
  text += '게시 종료일: \n';
  text += '대상: ' + (m.targetPlatform || '미입력') + ' 유저\n';
  text += '모객 인원: ' + (m.participantCount || '미입력') + '명\n';
  text += '보상: ' + (m.rewardType || '') + ' ' + (m.rewardAmount || '미입력') + '\n';
  text += '\n[게시 내용 요약]\n- \n';
  text += '\n[배너 이미지]\n- 첨부: \n';
  text += '\n[푸시 문구]\n- 제목: \n- 내용: \n';
  return text;
}

/**
 * E. Slack 중간보고
 */
function exportSlackUpdate(project) {
  // 현재 단계 파악
  const currentStageIdx = project.currentStage || 0;
  const stage = project.stages[currentStageIdx];
  const stageName = stage ? (stage.name || ('단계 ' + (currentStageIdx + 1))) : '진행 중';

  // 해당 단계의 완료율
  const subcats = stage ? (stage.subcategories || []) : [];
  const totalTasks = subcats.reduce((s, sub) => s + sub.tasks.length, 0);
  const doneTasks = subcats.reduce((s, sub) => s + sub.tasks.filter(t => t.status === 'completed').length, 0);
  const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // 최근 7일 완료한 항목
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentCompleted = [];
  (project.stages || []).forEach(s => {
    (s.subcategories || []).forEach(sub => {
      sub.tasks.forEach(t => {
        if (t.status === 'completed' && t.completedAt) {
          if (new Date(t.completedAt) >= sevenDaysAgo) {
            recentCompleted.push(t);
          }
        }
      });
    });
  });

  // blocking 이슈
  const blocked = [];
  (project.stages || []).forEach(s => {
    (s.subcategories || []).forEach(sub => {
      sub.tasks.forEach(t => {
        if (t.status === 'blocked') blocked.push(t);
      });
    });
  });

  // 다음 예정
  const upcoming = [];
  (project.stages || []).forEach(s => {
    (s.subcategories || []).forEach(sub => {
      sub.tasks.forEach(t => {
        if (t.status !== 'completed' && t.status !== 'blocked' && t.owner === 'me') {
          upcoming.push(t);
        }
      });
    });
  });

  let text = '[' + project.name + '] ' + stageName + ' (' + progress + '%)\n';

  if (recentCompleted.length > 0) {
    text += '완료:\n';
    recentCompleted.forEach(t => {
      text += '- ' + t.title + '\n';
    });
  }

  if (blocked.length > 0) {
    text += '이슈:\n';
    blocked.forEach(t => {
      text += '- [blocked] ' + t.title + '\n';
    });
  } else {
    text += '이슈: 없음\n';
  }

  if (upcoming.length > 0) {
    text += '다음:\n';
    upcoming.slice(0, 3).forEach(t => {
      text += '- ' + t.title;
      if (t.deadline) {
        const d = new Date(t.deadline);
        text += ' (~' + (d.getMonth() + 1) + '/' + d.getDate() + ')';
      }
      text += '\n';
    });
  }

  return text;
}

// ============================================
// 양식 출력 UI
// ============================================

/**
 * 양식 출력 드롭다운 메뉴 표시
 */
function showFormExportMenu(event, projectId) {
  event.stopPropagation();

  const existing = document.getElementById('form-export-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'form-export-menu';
  menu.style.cssText = 'position: fixed; z-index: 9999; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 2px; min-width: 200px;';

  const rect = event.target.getBoundingClientRect();
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';

  const btnStyle = 'display: block; width: 100%; padding: 10px 12px; background: transparent; border: none; border-radius: 6px; color: var(--text-primary); font-size: 14px; cursor: pointer; text-align: left; min-height: 44px;';

  const items = [
    { label: '스크리너 기본 조건', fn: 'screener' },
    { label: '외주 발주 요약', fn: 'outsourcing' },
    { label: '참여 안내문', fn: 'participant' },
    { label: '넥플 게시 요청', fn: 'nexonplay' },
    { label: 'Slack 중간보고', fn: 'slack' }
  ];

  menu.innerHTML = items.map(item =>
    '<button style="' + btnStyle + '" onmouseenter="this.style.background=\'var(--bg-tertiary)\'" onmouseleave="this.style.background=\'transparent\'" ' +
      'onclick="openFormExportModal(\'' + escapeAttr(projectId) + '\', \'' + item.fn + '\')">' + escapeHtml(item.label) + '</button>'
  ).join('');

  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', function handler() {
      const m = document.getElementById('form-export-menu');
      if (m) m.remove();
      document.removeEventListener('click', handler);
    }, { once: true });
  }, 0);
}
window.showFormExportMenu = showFormExportMenu;

/**
 * 양식 출력 모달 (편집 가능 textarea + 복사 버튼)
 */
function openFormExportModal(projectId, formType) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  // 기존 메뉴 정리
  const existingMenu = document.getElementById('form-export-menu');
  if (existingMenu) existingMenu.remove();

  let text = '';
  let formName = '';
  switch (formType) {
    case 'screener':
      text = exportScreenerSummary(project);
      formName = '스크리너 기본 조건';
      break;
    case 'outsourcing':
      text = exportOutsourcingSummary(project);
      formName = '외주 발주 요약';
      break;
    case 'participant':
      text = exportParticipantGuide(project);
      formName = '참여 안내문';
      break;
    case 'nexonplay':
      text = exportNexonPlayRequest(project);
      formName = '넥플 게시 요청';
      break;
    case 'slack':
      text = exportSlackUpdate(project);
      formName = 'Slack 중간보고';
      break;
    default:
      return;
  }

  const modal = document.getElementById('work-input-modal');
  const titleEl = document.getElementById('work-modal-title');
  const body = document.getElementById('work-modal-body');

  workModalState = { type: 'form-export', projectId, formType, stageIdx: null, subcategoryIdx: null, taskIdx: null };

  // 저장된 템플릿이 있으면 그것을 사용
  if (project.formTemplates && project.formTemplates[formType]) {
    text = project.formTemplates[formType];
  }

  titleEl.textContent = '📋 ' + formName;

  body.innerHTML =
    '<div class="work-modal-field">' +
      '<textarea class="work-modal-textarea" id="form-export-text" rows="15" style="font-family: monospace; font-size: 14px; resize: vertical; min-height: 250px; line-height: 1.6;">' + escapeHtml(text) + '</textarea>' +
    '</div>' +
    '<div style="display: flex; gap: 8px;">' +
      '<button type="button" onclick="copyFormExportText()" style="flex: 1; padding: 12px; background: var(--accent-primary); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; min-height: 44px;">📋 복사</button>' +
      '<button type="button" onclick="saveFormTemplate()" style="flex: 1; padding: 12px; background: var(--accent-success); color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; min-height: 44px;">💾 저장</button>' +
      (project.formTemplates && project.formTemplates[formType] ? '<button type="button" onclick="resetFormTemplate()" style="padding: 12px 16px; background: var(--bg-tertiary); color: var(--text-secondary); border: 1px solid var(--border-color); border-radius: 8px; font-size: 14px; cursor: pointer; min-height: 44px;" title="저장된 템플릿 삭제">↺</button>' : '') +
    '</div>';

  // Override the confirm button to act as close
  const actions = modal.querySelector('.work-modal-actions');
  if (actions) {
    actions.innerHTML = '<button class="cancel" onclick="closeWorkModal()">닫기</button>';
  }

  modal.classList.add('show');
}
window.openFormExportModal = openFormExportModal;

/**
 * 양식 텍스트 클립보드 복사
 */
function copyFormExportText() {
  const textarea = document.getElementById('form-export-text');
  if (!textarea) return;

  const text = textarea.value;
  navigator.clipboard.writeText(text).then(() => {
    showToast('클립보드에 복사됨', 'success');
  }).catch(() => {
    textarea.select();
    document.execCommand('copy');
    showToast('클립보드에 복사됨', 'success');
  });
}
window.copyFormExportText = copyFormExportText;

/**
 * Task 2-4: 양식 템플릿 저장
 */
function saveFormTemplate() {
  const textarea = document.getElementById('form-export-text');
  if (!textarea || !workModalState || !workModalState.projectId || !workModalState.formType) return;

  const project = appState.workProjects.find(p => p.id === workModalState.projectId);
  if (!project) return;

  if (!project.formTemplates) project.formTemplates = {};
  project.formTemplates[workModalState.formType] = textarea.value;
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  showToast('템플릿 저장됨', 'success');
}
window.saveFormTemplate = saveFormTemplate;

/**
 * 저장된 양식 템플릿 초기화 (기본 자동생성으로 복귀)
 */
function resetFormTemplate() {
  if (!workModalState || !workModalState.projectId || !workModalState.formType) return;

  const project = appState.workProjects.find(p => p.id === workModalState.projectId);
  if (!project || !project.formTemplates) return;

  if (!confirm('저장된 템플릿을 삭제하고 기본 양식으로 돌아갈까요?')) return;

  delete project.formTemplates[workModalState.formType];
  if (Object.keys(project.formTemplates).length === 0) {
    delete project.formTemplates;
  }
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  closeWorkModal();
  showToast('템플릿 초기화됨', 'success');
}
window.resetFormTemplate = resetFormTemplate;
