// ============================================
// 본업 프로젝트 클립보드 복사 (Slack/Notion)
// (work-data.js에서 분리)
// ============================================

// ============================================
// 슬랙/노션 복사 — 통합 포맷 헬퍼
// ============================================

const _STATUS_LABEL = {
  'not-started': '',
  'in-progress': '[진행중]',
  'completed': '[완료]',
  'blocked': '[보류]'
};

/** 마감일 → " ~3/28" */
function _fmtDeadline(task) {
  if (!task.deadline) return '';
  const d = new Date(task.deadline);
  if (isNaN(d.getTime())) return '';
  return ' ~' + (d.getMonth() + 1) + '/' + d.getDate();
}

/** 작업 한 줄 포맷: "- ✓ 제목 [진행중] ~3/28" */
function _fmtTaskLine(task, indent) {
  const prefix = indent || '';
  const done = task.status === 'completed';
  const status = done ? '' : (_STATUS_LABEL[task.status] || '');
  const deadline = _fmtDeadline(task);
  let line = prefix + '- ' + (done ? '✓ ' : '') + task.title;
  if (status) line += ' ' + status;
  if (deadline) line += deadline;
  return line;
}

/** 클립보드에 복사 + toast (fallback 포함) */
function _copyText(text, toastMsg) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(toastMsg || '복사됨', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); showToast(toastMsg || '복사됨', 'success'); }
    catch(e) { showToast('복사 실패 — 브라우저 권한을 확인하세요', 'error'); }
    finally { document.body.removeChild(ta); }
  });
}

/** 단계(stage) 내용을 줄 배열로 생성 */
function _fmtStageLines(project, stageIdx) {
  const stage = project.stages[stageIdx];
  const stageName = getStageName(project, stageIdx);
  const subcats = stage.subcategories || [];
  if (subcats.length === 0) return [];

  const total = subcats.reduce((s, sub) => s + sub.tasks.length, 0);
  const done = subcats.reduce((s, sub) => s + sub.tasks.filter(t => t.status === 'completed').length, 0);
  const stageStatus = total > 0 && done === total ? ' [완료]' : '';

  let lines = ['■ ' + stageName + stageStatus];
  subcats.forEach(sub => {
    const isGeneral = sub.name === '일반';
    if (!isGeneral && sub.tasks.length > 0) {
      lines.push(sub.name + ':');
    }
    sub.tasks.forEach(task => {
      lines.push(_fmtTaskLine(task, isGeneral ? '' : '  '));
    });
  });
  return lines;
}

/**
 * 프로젝트 전체 슬랙 복사
 */
function copyProjectToSlack(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  let lines = [project.name, ''];
  project.stages.forEach((stage, idx) => {
    const stageLines = _fmtStageLines(project, idx);
    if (stageLines.length > 0) {
      lines.push(...stageLines, '');
    }
  });
  _copyText(lines.join('\n').trim(), '슬랙용 진행 리스트 복사됨');
}
window.copyProjectToSlack = copyProjectToSlack;

/**
 * 단계(stage) 단위 슬랙 복사
 */
function copyStageToSlack(projectId, stageIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project || !project.stages[stageIdx]) return;

  const lines = _fmtStageLines(project, stageIdx);
  _copyText(lines.join('\n'), '단계 복사됨');
}
window.copyStageToSlack = copyStageToSlack;

/**
 * 본업 프로젝트 개별 작업 슬랙 복사
 */
function copyWorkTaskToSlack(projectId, stageIdx, subcatIdx, taskIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const task = project.stages[stageIdx]?.subcategories[subcatIdx]?.tasks[taskIdx];
  if (!task) return;

  let text = _fmtTaskLine(task, '');
  if (task.logs && task.logs.length > 0) {
    const recentLogs = task.logs.filter(l => l.content !== '✓ 완료').slice(-3);
    if (recentLogs.length > 0) {
      recentLogs.forEach(log => {
        text += '\n  ' + log.date + ': ' + log.content;
      });
    }
  }
  _copyText(text, '작업 복사됨');
}
window.copyWorkTaskToSlack = copyWorkTaskToSlack;
