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
            // ISO 8601 strict 포맷 'T00:00:00' 사용 — 'T00:00'은 Safari/Android WebView에서 Invalid Date 반환
            if (task.status === 'completed') {
              const completionLog = (task.logs || []).filter(l => l.content === '✓ 완료');
              if (completionLog.length > 0) {
                task.completedAt = completionLog[completionLog.length - 1].date + 'T00:00:00';
              } else {
                task.completedAt = null;
              }
            } else {
              task.completedAt = null;
            }
            migrated = true;
          } else if (typeof task.completedAt === 'string' && /T\d{2}:\d{2}$/.test(task.completedAt)) {
            // 기존 'T00:00' (분까지만) 잔존 데이터 → 'T00:00:00'로 in-place 보정 (Safari Invalid Date 회피)
            task.completedAt = task.completedAt + ':00';
            migrated = true;
          }
          if (task.canStartEarly === undefined) {
            task.canStartEarly = false;
            migrated = true;
          }
          if (task.priority === undefined) {
            task.priority = 0;
            migrated = true;
          }
          if (task.isRequired === undefined) {
            task.isRequired = true;
            migrated = true;
          }
          if (task.isNewFromV2 === undefined) {
            task.isNewFromV2 = false;
            migrated = true;
          }
          if (task.rationaleRef === undefined) {
            task.rationaleRef = null;
            migrated = true;
          }
          if (task.notes === undefined) {
            task.notes = null;
            migrated = true;
          }
        });
      });
    });
    if (project.archivedReport === undefined) {
      project.archivedReport = null;
      migrated = true;
    }
  });
  if (migrated) {
    console.log('[migration] WorkTask 필드 마이그레이션 완료 (owner, estimatedTime, actualTime, completedAt, canStartEarly, priority, isRequired, isNewFromV2, rationaleRef, notes, archivedReport)');
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
 * 빠른 작성 텍스트 → 트리 구조 파싱 (단방향)
 * 패턴:
 * - 들여쓰기 0 + prefix 없음 = stage
 * - 들여쓰기 0-3 + `└`/`-`/`•` prefix = subcategory
 * - 들여쓰기 4+ = task
 * - ★ 1-5 = priority
 * - (MM/DD), (~MM/DD), (YYYY-MM-DD) = deadline
 */
function parseSketchText(text) {
  const lines = (text || '').split('\n');
  const stages = [];
  let currentStage = null;
  let currentSub = null;

  for (const rawLine of lines) {
    if (!rawLine.trim()) continue;
    const expanded = rawLine.replace(/\t/g, '    ');
    const indent = expanded.length - expanded.trimStart().length;
    let content = expanded.trim();
    const hasBranchPrefix = /^[└\-•·]\s*/.test(content);
    if (hasBranchPrefix) content = content.replace(/^[└\-•·]\s*/, '');

    // ★ 합산 (한 줄에 여러 그룹 있어도 모두 카운트)
    let priority = 0;
    const starMatches = content.match(/★/g);
    if (starMatches) priority = Math.min(5, starMatches.length);
    content = content.replace(/\s*★+\s*/g, ' ').trim();

    // 날짜 추출: YYYY-MM-DD / YYYY/MM/DD / MM/DD (모두 ~? 접두 허용)
    let deadline = null;
    const dateMatch = content.match(/\(\s*~?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}\/\d{1,2})[^)]*\)/);
    if (dateMatch) {
      const raw = dateMatch[1];
      if (/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/.test(raw)) {
        const [y, m, d] = raw.split(/[-/]/).map(n => parseInt(n, 10));
        deadline = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      } else {
        const [m, d] = raw.split('/').map(n => parseInt(n, 10));
        if (m >= 1 && m <= 12 && d >= 1 && d <= 31) {
          const today = new Date();
          let year = today.getFullYear();
          // 12월에 01/10 같은 과거 날짜 입력 시 다음 해로 보정
          const candidate = new Date(year, m - 1, d);
          const todayMidnight = new Date(year, today.getMonth(), today.getDate());
          if (candidate < todayMidnight && (todayMidnight - candidate) > 1000 * 60 * 60 * 24 * 60) {
            year++;
          }
          deadline = `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        }
      }
      content = content
        .replace(/\s*\(\s*~?\s*\d{4}[-/]\d{1,2}[-/]\d{1,2}[^)]*\)\s*/, ' ')
        .replace(/\s*\(\s*~?\s*\d{1,2}\/\d{1,2}[^)]*\)\s*/, ' ')
        .trim();
    }

    if (!content) continue;

    if (indent === 0 && !hasBranchPrefix) {
      currentStage = { name: content, subcategories: [] };
      stages.push(currentStage);
      currentSub = null;
    } else if (indent <= 3 && hasBranchPrefix) {
      if (!currentStage) {
        currentStage = { name: '미분류', subcategories: [] };
        stages.push(currentStage);
      }
      // 메타(priority/deadline) 있으면 task 의도, 없으면 subcategory 의도
      if (priority > 0 || deadline) {
        if (!currentSub) {
          currentSub = { name: '항목', tasks: [] };
          currentStage.subcategories.push(currentSub);
        }
        currentSub.tasks.push({ title: content, priority, deadline });
      } else {
        currentSub = { name: content, tasks: [] };
        currentStage.subcategories.push(currentSub);
      }
    } else {
      if (!currentStage) {
        currentStage = { name: '미분류', subcategories: [] };
        stages.push(currentStage);
      }
      if (!currentSub) {
        currentSub = { name: '항목', tasks: [] };
        currentStage.subcategories.push(currentSub);
      }
      currentSub.tasks.push({ title: content, priority, deadline });
    }
  }

  return stages;
}
window.parseSketchText = parseSketchText;

/**
 * 파싱 결과를 프로젝트에 append (이름 매칭 시 기존 stage/subcategory 재사용, task는 dedup)
 * @returns {{ success: boolean, addedCount?: number, error?: string }}
 */
function applySketchToProject(projectId, sketchText) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return { success: false, error: '프로젝트를 찾을 수 없습니다' };

  const parsedStages = parseSketchText(sketchText);
  if (parsedStages.length === 0) return { success: false, error: '파싱 결과 없음' };

  const normalizeName = s => (s || '').trim().toLowerCase();

  let addedCount = 0;
  parsedStages.forEach(parsedStage => {
    // 빈 subcategory만 있는 stage(task 0개)는 skip — 누적 방지
    const hasAnyTask = parsedStage.subcategories.some(sub => (sub.tasks || []).length > 0);
    if (!hasAnyTask) return;

    const targetName = normalizeName(parsedStage.name);
    let stage = (project.stages || []).find(s => normalizeName(s.name) === targetName);
    if (!stage) {
      stage = { id: generateId(), name: parsedStage.name.trim(), completed: false, subcategories: [] };
      if (!project.stages) project.stages = [];
      project.stages.push(stage);
    }

    parsedStage.subcategories.forEach(parsedSub => {
      // 빈 subcategory는 skip
      if ((parsedSub.tasks || []).length === 0) return;

      const subTargetName = normalizeName(parsedSub.name);
      let sub = (stage.subcategories || []).find(s => normalizeName(s.name) === subTargetName);
      if (!sub) {
        sub = { id: generateId(), name: parsedSub.name.trim(), tasks: [] };
        if (!stage.subcategories) stage.subcategories = [];
        stage.subcategories.push(sub);
      }

      parsedSub.tasks.forEach(parsedTask => {
        if (sub.tasks.some(t => t.title === parsedTask.title)) return;
        sub.tasks.push({
          id: generateId(),
          title: parsedTask.title,
          status: 'not-started',
          priority: parsedTask.priority || 0,
          deadline: parsedTask.deadline || null,
          owner: 'me',
          estimatedTime: 30,
          actualTime: null,
          completedAt: null,
          canStartEarly: false,
          isRequired: true,
          isNewFromV2: false,
          rationaleRef: null,
          notes: null,
          logs: []
        });
        addedCount++;
      });
    });
  });

  if (addedCount === 0) {
    return { success: false, error: '항목을 인식하지 못했어 — 들여쓰기 또는 └ prefix 확인' };
  }
  project.updatedAt = new Date().toISOString();
  saveWorkProjects();
  return { success: true, addedCount };
}
window.applySketchToProject = applySketchToProject;

/**
 * 프로젝트의 가장 최근 활동 timestamp (ms)
 * 우선순위: max(task.completedAt, task.logs[].date, project.updatedAt fallback)
 */
function getProjectLastActivity(project) {
  let latest = null;
  (project.stages || []).forEach(stage => {
    (stage.subcategories || []).forEach(sub => {
      (sub.tasks || []).forEach(task => {
        if (task.completedAt) {
          const t = new Date(task.completedAt).getTime();
          if (!isNaN(t) && (!latest || t > latest)) latest = t;
        }
        (task.logs || []).forEach(log => {
          if (log.date) {
            const t = new Date(log.date).getTime();
            if (!isNaN(t) && (!latest || t > latest)) latest = t;
          }
        });
      });
    });
  });
  if (!latest && project.updatedAt) {
    const t = new Date(project.updatedAt).getTime();
    if (!isNaN(t)) latest = t;
  }
  return latest;
}
window.getProjectLastActivity = getProjectLastActivity;

/**
 * 프로젝트의 stale 일수 (활동 없음)
 */
function getProjectStaleDays(project) {
  const last = getProjectLastActivity(project);
  if (!last) return 0;
  return Math.floor((Date.now() - last) / (1000 * 60 * 60 * 24));
}
window.getProjectStaleDays = getProjectStaleDays;

/**
 * 마감 지난 미완료 task 개수
 */
function getOverdueTaskCount(project) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let count = 0;
  (project.stages || []).forEach(stage => {
    (stage.subcategories || []).forEach(sub => {
      (sub.tasks || []).forEach(task => {
        if (task.status === 'completed') return;
        if (task.deadline && new Date(task.deadline) < today) count++;
      });
    });
  });
  return count;
}
window.getOverdueTaskCount = getOverdueTaskCount;

/**
 * 모든 진행중 프로젝트의 우선순위 task (priority >= 3 OR 마감 7일 이내)
 * 정렬: priority 높은 순 → 마감 가까운 순
 */
function getCrossProjectPriorityTasks() {
  const tasks = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const sevenDaysFromNow = new Date(today);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  appState.workProjects.filter(p => !p.archived && !p.onHold).forEach(project => {
    (project.stages || []).forEach((stage, si) => {
      (stage.subcategories || []).forEach((sub, sci) => {
        (sub.tasks || []).forEach((task, ti) => {
          if (task.status === 'completed') return;
          const priority = task.priority || 0;
          const isHighPriority = priority >= 3;
          // 과거 마감은 risk-alerts 전담 — priority 리스트는 미래(today~+7)만
          const deadlineDate = task.deadline ? new Date(task.deadline) : null;
          const hasUpcomingDeadline = deadlineDate && deadlineDate >= today && deadlineDate <= sevenDaysFromNow;
          if (isHighPriority || hasUpcomingDeadline) {
            tasks.push({
              title: task.title,
              priority,
              deadline: task.deadline || null,
              status: task.status,
              _projectId: project.id,
              _projectName: project.name,
              _stageIdx: si,
              _stageName: (typeof getStageName === 'function') ? getStageName(project, si) : (stage.name || ('단계 ' + (si + 1))),
              _subcatIdx: sci,
              _taskIdx: ti
            });
          }
        });
      });
    });
  });

  tasks.sort((a, b) => {
    const pa = a.priority || 0;
    const pb = b.priority || 0;
    if (pa !== pb) return pb - pa;
    if (a.deadline && b.deadline && a.deadline !== b.deadline) return a.deadline < b.deadline ? -1 : 1;
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    return 0;
  });

  return tasks;
}
window.getCrossProjectPriorityTasks = getCrossProjectPriorityTasks;

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
