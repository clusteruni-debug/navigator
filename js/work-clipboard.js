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

// ============================================
// Slack ↔ Navigator 양방향 포맷 변환
// - 입력 textarea onPaste: Slack rich-text(HTML) → 마크다운
// - 개별 log content 복사: Navigator는 이미 마크다운이라 plain text 그대로 복사
// ============================================

/**
 * Slack에서 복사한 HTML clipboard를 Navigator 마크다운으로 변환
 * 실패 시 null 반환 → 호출 측에서 기본 paste 동작으로 fallback
 */
function slackHtmlToMarkdown(html) {
  if (!html || typeof html !== 'string') return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    if (!doc || !doc.body) return null;
    const md = _slackNodeToMarkdown(doc.body);
    // 빈 변환 결과면 fallback
    if (!md || !md.trim()) return null;
    return md.replace(/\n{3,}/g, '\n\n').trim();
  } catch (e) {
    return null;
  }
}
window.slackHtmlToMarkdown = slackHtmlToMarkdown;

function _slackNodeToMarkdown(node) {
  if (!node) return '';
  if (node.nodeType === 3) return node.textContent || ''; // text
  if (node.nodeType !== 1) return ''; // not element

  const tag = (node.tagName || '').toUpperCase();
  const childText = Array.from(node.childNodes).map(_slackNodeToMarkdown).join('');

  switch (tag) {
    case 'B': case 'STRONG':
      return childText ? '*' + childText + '*' : '';
    case 'I': case 'EM':
      return childText ? '_' + childText + '_' : '';
    case 'S': case 'STRIKE': case 'DEL':
      return childText ? '~' + childText + '~' : '';
    case 'CODE': {
      // PRE 안의 CODE는 PRE에서 코드 블록으로 처리
      if (node.parentElement && node.parentElement.tagName === 'PRE') return childText;
      return childText ? '`' + childText + '`' : '';
    }
    case 'PRE':
      return '```\n' + childText.replace(/\n+$/, '') + '\n```\n';
    case 'BR':
      return '\n';
    case 'LI':
      return '• ' + childText.replace(/\n+$/, '').trim() + '\n';
    case 'UL': case 'OL':
      return childText;
    case 'P': case 'DIV':
      return childText.endsWith('\n') ? childText : childText + '\n';
    case 'A':
      return childText;
    default:
      return childText;
  }
}

/**
 * textarea onpaste 핸들러 — Slack rich-text가 있으면 마크다운으로 변환 후 커서 위치에 삽입
 * - clipboard에 HTML 없거나 변환 실패 시 기본 paste 동작 유지 (preventDefault 안 함)
 */
function handleSlackPasteToWorkModal(event) {
  if (!event || !event.clipboardData) return;
  const html = event.clipboardData.getData('text/html');
  if (!html) return; // plain text paste → 기본 동작
  const markdown = slackHtmlToMarkdown(html);
  if (markdown == null) return; // 변환 실패 → 기본 동작

  event.preventDefault();
  const ta = event.target;
  if (!ta || ta.tagName !== 'TEXTAREA') return;

  const start = ta.selectionStart;
  const end = ta.selectionEnd;
  const before = ta.value.slice(0, start);
  const after = ta.value.slice(end);
  ta.value = before + markdown + after;
  const newPos = start + markdown.length;
  ta.selectionStart = ta.selectionEnd = newPos;
  ta.dispatchEvent(new Event('input', { bubbles: true }));
  showToast('Slack 형식 변환 적용', 'success');
}
window.handleSlackPasteToWorkModal = handleSlackPasteToWorkModal;

/**
 * 개별 log content를 Slack 형식으로 클립보드 복사
 * Navigator는 이미 마크다운 (`*bold*` `_italic_` 등)이라 plain text 그대로 복사
 */
function copyLogContentToSlack(projectId, stageIdx, subcatIdx, taskIdx, logIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;
  const log = project.stages?.[stageIdx]?.subcategories?.[subcatIdx]?.tasks?.[taskIdx]?.logs?.[logIdx];
  if (!log) return;
  _copyText(log.content || '', '슬랙 형식으로 복사됨');
}
window.copyLogContentToSlack = copyLogContentToSlack;
