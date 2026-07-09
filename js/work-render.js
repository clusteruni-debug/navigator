// ============================================
// 본업 프로젝트 - 카드/상세/태스크 렌더링
// (work.js에서 분리)
// ============================================

/**
 * 프로젝트 선택
 */
function selectWorkProject(projectId) {
  appState.activeWorkProject = projectId;
  renderStatic();
}
window.selectWorkProject = selectWorkProject;

// renderWorkProjectDetail, renderWorkTask → work-render-detail.js로 분리됨

/**
 * Task 2-1: 프로젝트 관리 "더보기" 드롭다운
 */
function showProjectMoreMenu(event, projectId) {
  event.stopPropagation();

  const existing = document.getElementById('project-more-menu');
  if (existing) existing.remove();

  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const menu = document.createElement('div');
  menu.id = 'project-more-menu';
  menu.className = 'work-more-menu';

  const rect = event.target.getBoundingClientRect();
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.left = Math.min(rect.left, window.innerWidth - 180) + 'px';

  const items = [
    { icon: 'copy', label: '노션/슬랙 복사', fn: `copyWorkProjectToClipboard('${escapeAttr(projectId)}')` },
    { icon: 'copy', label: '복제', fn: `duplicateWorkProject('${escapeAttr(projectId)}')` },
    { icon: project.onHold ? 'play' : 'pause', label: project.onHold ? '재개' : '보류', fn: `holdWorkProject('${escapeAttr(projectId)}')` },
    { icon: 'save', label: '템플릿', fn: `saveAsTemplate('${escapeAttr(projectId)}')` },
    { icon: project.completed ? 'rotate-ccw' : 'check', label: project.completed ? '완료 취소' : '완료', fn: `completeWorkProject('${escapeAttr(projectId)}')` },
    { icon: project.archived ? 'upload' : 'archive', label: project.archived ? '복원' : '보관', fn: `archiveWorkProject('${escapeAttr(projectId)}')` },
    { icon: 'trash', label: '삭제', fn: `deleteWorkProject('${escapeAttr(projectId)}')`, danger: true }
  ];

  menu.innerHTML = items.map(item =>
    `<button class="${item.danger ? 'danger' : ''}" onclick="${item.fn}; document.getElementById('project-more-menu')?.remove();">${svgIcon(item.icon, 14)} ${escapeHtml(item.label)}</button>`
  ).join('');

  document.body.appendChild(menu);

  setTimeout(() => {
    document.addEventListener('click', function handler() {
      const m = document.getElementById('project-more-menu');
      if (m) m.remove();
      document.removeEventListener('click', handler);
    }, { once: true });
  }, 0);
}
window.showProjectMoreMenu = showProjectMoreMenu;

/**
 * Task 2-3: 프로젝트 메타 정보 접기/펼치기 토글
 */
function toggleWorkMetaCollapse(projectId) {
  if (!appState.workMetaExpanded) appState.workMetaExpanded = {};
  appState.workMetaExpanded[projectId] = !appState.workMetaExpanded[projectId];
  renderStatic();
}
window.toggleWorkMetaCollapse = toggleWorkMetaCollapse;
