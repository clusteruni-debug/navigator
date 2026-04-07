// ============================================
// 본업 프로젝트 - 데이터/상태 관리
// ============================================

/**
 * 프로젝트 완료 여부 판단 헬퍼 (전역)
 */
function isProjectCompleted(p) {
  if (p.stages.length === 0) return false;
  return p.stages.every(s => s.completed);
}

// 모달 상태
let workModalState = {
  type: null, // 'project', 'subcategory', 'task', 'log'
  projectId: null,
  stageIdx: null,
  subcategoryIdx: null,
  taskIdx: null,
  logIdx: null
};

// 상태 목록
const WORK_STATUS = {
  'not-started': { label: '미시작', color: 'var(--accent-neutral)' },
  'in-progress': { label: '진행중', color: 'var(--accent-primary)' },
  'completed': { label: '완료', color: 'var(--accent-success)' },
  'blocked': { label: '보류', color: 'var(--accent-danger)' }
};

/**
 * WorkTask 필드 마이그레이션: owner, estimatedTime, actualTime, completedAt, canStartEarly 기본값 적용
 * @returns {boolean} 마이그레이션이 수행되었으면 true
 */
function migrateWorkTaskFields() {
  let migrated = false;
  appState.workProjects.forEach(project => {
    (project.stages || []).forEach(stage => {
      (stage.subcategories || []).forEach(sub => {
        (sub.tasks || []).forEach(task => {
          if (task.owner === undefined) {
            task.owner = 'me';
            migrated = true;
          }
          if (task.estimatedTime === undefined) {
            task.estimatedTime = 30;
            migrated = true;
          }
          if (task.actualTime === undefined) {
            task.actualTime = null;
            migrated = true;
          }
          if (task.completedAt === undefined) {
            // 이미 완료된 태스크: 로그에서 최신 완료 날짜를 추출
            if (task.status === 'completed') {
              const completionLog = (task.logs || []).filter(l => l.content === '✓ 완료');
              if (completionLog.length > 0) {
                task.completedAt = completionLog[completionLog.length - 1].date + 'T00:00';
              } else {
                task.completedAt = null;
              }
            } else {
              task.completedAt = null;
            }
            migrated = true;
          }
          if (task.canStartEarly === undefined) {
            task.canStartEarly = false;
            migrated = true;
          }
        });
      });
    });
  });
  if (migrated) {
    console.log('[migration] WorkTask 필드 마이그레이션 완료 (owner, estimatedTime, actualTime, completedAt, canStartEarly)');
  }
  return migrated;
}

// DEFAULT_WORK_TEMPLATES, seedDefaultTemplates → work-templates.js로 분리됨

/**
 * 프로젝트 저장
 */
function saveWorkProjects() {
  if (!appState.user) {
    localStorage.setItem('navigator-work-projects', JSON.stringify(appState.workProjects));
  }
  // Firebase 동기화 (로그인된 경우)
  if (appState.user) {
    syncToFirebase();
  }
}

/**
 * 템플릿 저장 (localStorage + Firebase)
 */
function saveWorkTemplates() {
  if (!appState.user) {
    localStorage.setItem('navigator-work-templates', JSON.stringify(appState.workTemplates));
  }
  if (appState.user) { syncToFirebase(); }
}

/**
 * 프로젝트 불러오기
 */
function loadWorkProjects() {
  const saved = localStorage.getItem('navigator-work-projects');
  if (saved) {
    try {
      appState.workProjects = JSON.parse(saved);

      // 기존 프로젝트 마이그레이션: 단계에 name 필드 추가
      let needsSave = false;
      appState.workProjects.forEach(project => {
        if (project.stages) {
          project.stages.forEach((stage, idx) => {
            if (!stage.name) {
              // 기존 프로젝트: 전역 배열에서 이름 가져오기
              stage.name = appState.workProjectStages[idx] || `단계 ${idx + 1}`;
              needsSave = true;
            }
          });
        }
      });

      // 마이그레이션: WorkTask에 owner/estimatedTime/completedAt 필드 추가
      needsSave = migrateWorkTaskFields() || needsSave;

      if (needsSave) {
        saveWorkProjects();
        // project migration complete
      }

      // 첫 프로젝트 자동 선택
      if (appState.workProjects.length > 0 && !appState.activeWorkProject) {
        appState.activeWorkProject = appState.workProjects[0].id;
      }
    } catch (e) {
      console.error('프로젝트 로드 실패:', e);
      appState.workProjects = [];
    }
  }

  // 기본 템플릿 시딩 (비어있을 때만)
  seedDefaultTemplates();
}

/**
 * 단계 완료 토글
 */
function toggleStageComplete(projectId, stageIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.stages[stageIdx].completed = !project.stages[stageIdx].completed;

  // 완료된 단계 이후의 첫 미완료 단계를 현재 단계로 설정
  const firstIncomplete = project.stages.findIndex(s => !s.completed);
  project.currentStage = firstIncomplete >= 0 ? firstIncomplete : project.stages.length - 1;

  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(project.stages[stageIdx].completed ? '단계 완료!' : '단계 완료 취소', 'success');
}
window.toggleStageComplete = toggleStageComplete;

/**
 * 프로젝트 복제
 */
function duplicateWorkProject(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const newProject = JSON.parse(JSON.stringify(project));
  newProject.id = generateId();
  newProject.name = project.name + ' (복사본)';
  newProject.createdAt = new Date().toISOString();
  newProject.updatedAt = new Date().toISOString();
  newProject.archived = false;

  // 모든 단계와 항목 초기화 + id 재생성
  newProject.stages.forEach(stage => {
    stage.id = generateId();
    stage.completed = false;
    (stage.subcategories || []).forEach(sub => {
      sub.id = generateId();
      sub.tasks.forEach(task => {
        task.id = generateId();
        task.status = 'not-started';
        task.completedAt = null;
        task.actualTime = null;
        task.logs = [];
      });
    });
  });
  newProject.currentStage = 0;
  newProject.participantCount = 0;

  appState.workProjects.push(newProject);
  appState.activeWorkProject = newProject.id;
  saveWorkProjects();
  renderStatic();
  showToast('프로젝트 복제됨', 'success');
}
window.duplicateWorkProject = duplicateWorkProject;

// 슬랙/노션 복사 유틸리티 → work-clipboard.js로 분리됨

/**
 * 프로젝트 이름 변경
 */
function renameWorkProject(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const newName = prompt('프로젝트 이름:', project.name);
  if (newName === null || !newName.trim()) return;

  project.name = newName.trim();
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast('프로젝트 이름이 변경되었습니다', 'success');
}
window.renameWorkProject = renameWorkProject;

/**
 * 프로젝트 개요(설명) 편집
 */
function editProjectDescription(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const desc = prompt('프로젝트 개요:', project.description || '');
  if (desc === null) return;

  project.description = desc.trim() || '';
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
  showToast(desc.trim() ? '프로젝트 개요가 저장되었습니다' : '프로젝트 개요가 삭제되었습니다', 'success');
}
window.editProjectDescription = editProjectDescription;

// copyWorkTaskToSlack → work-clipboard.js로 분리됨

/**
 * 프로젝트 아카이브
 */
function archiveWorkProject(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.archived = !project.archived;
  project.updatedAt = new Date().toISOString();

  if (project.archived && appState.activeWorkProject === projectId) {
    const active = appState.workProjects.find(p => !p.archived);
    appState.activeWorkProject = active ? active.id : null;
  }

  saveWorkProjects();
  renderStatic();
  showToast(project.archived ? '아카이브됨' : '아카이브 해제됨', 'success');
}
window.archiveWorkProject = archiveWorkProject;

/**
 * 프로젝트 보류 토글
 */
function holdWorkProject(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  project.onHold = !project.onHold;
  project.updatedAt = new Date().toISOString();

  saveWorkProjects();
  renderStatic();
  showToast(project.onHold ? '보류 처리됨' : '보류 해제됨', 'success');
}
window.holdWorkProject = holdWorkProject;

// saveAsTemplate → work-templates.js로 분리됨

/**
 * 참여자 수 업데이트
 */
function updateParticipantCount(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const count = prompt('현재 참여자 수:', project.participantCount || 0);
  if (count === null) return;

  project.participantCount = parseInt(count) || 0;
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  renderStatic();
}
window.updateParticipantCount = updateParticipantCount;
