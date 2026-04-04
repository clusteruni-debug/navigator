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

/**
 * 기본 템플릿: 빈 workTemplates에 자동 추가
 */
const DEFAULT_WORK_TEMPLATES = [
  {
    id: 'default-uxr-ro',
    name: 'UXR RO (모객) 프로젝트',
    isDefault: true,
    stageNames: ['킥오프', '모객 준비', '모객 진행', '테스트 준비', '테스트 진행', '테스트 종료 후'],
    stages: [
      { // 0: 킥오프
        subcategories: [
          { name: '타겟 유저', tasks: [
            { title: '타겟 게임 리스트', estimatedTime: 30, owner: 'me' },
            { title: '타겟 게임 경험 수준', estimatedTime: 20, owner: 'me' },
            { title: '그룹 구분', estimatedTime: 30, owner: 'me' },
            { title: '인원 (버퍼 포함)', estimatedTime: 15, owner: 'me' }
          ]},
          { name: '기본', tasks: [
            { title: '방법론 결정', estimatedTime: 60, owner: 'me' },
            { title: '테스트 플랫폼 결정 (PC/모바일)', estimatedTime: 10, owner: 'me' },
            { title: '모객 채널 결정', estimatedTime: 20, owner: 'me' },
            { title: '보상 규모 결정', estimatedTime: 30, owner: 'me' },
            { title: '일정 수립', estimatedTime: 30, owner: 'me' },
            { title: '소요 시간 산정', estimatedTime: 15, owner: 'me' },
            { title: '데이터 검증 기준 설정', estimatedTime: 30, owner: 'me' },
            { title: '테스트용 계정 발급', estimatedTime: 20, owner: 'other' }
          ]}
        ]
      },
      { // 1: 모객 준비
        subcategories: [
          { name: '넥슨퍼스트 세팅', tasks: [
            { title: '계정 수집 설정', estimatedTime: 30, owner: 'me' },
            { title: '개인정보 수집 설정', estimatedTime: 20, owner: 'me' },
            { title: '스크린샷 수집 설정', estimatedTime: 15, owner: 'me' }
          ]},
          { name: '기본', tasks: [
            { title: '아웃소싱팀 외주 발주', estimatedTime: 30, owner: 'me' },
            { title: '스크리너 설계', estimatedTime: 120, owner: 'me' },
            { title: '게시용 배너 제작', estimatedTime: 15, owner: 'other' },
            { title: '넥슨플레이 게시/푸시 요청', estimatedTime: 15, owner: 'me' }
          ]}
        ]
      },
      { // 2: 모객 진행
        subcategories: [
          { name: '기본', tasks: [
            { title: '신청 현황 모니터링', estimatedTime: 15, owner: 'me' },
            { title: '모객 채널 추가 오픈 (현황에 따라)', estimatedTime: 30, owner: 'me' },
            { title: '유관 커뮤니티 동향 체크', estimatedTime: 15, owner: 'me' },
            { title: '데이터 검증', estimatedTime: 60, owner: 'me' },
            { title: '컨택 대상 리스트업', estimatedTime: 60, owner: 'me' },
            { title: '섭외 진행', estimatedTime: 120, owner: 'me' },
            { title: '테스트 참여 안내', estimatedTime: 30, owner: 'me' }
          ]}
        ]
      },
      { // 3: 테스트 준비
        subcategories: [
          { name: '기본', tasks: [
            { title: '넥슨 스페이스 공유 (2주 전)', estimatedTime: 30, owner: 'me', canStartEarly: true },
            { title: '다과/생수 확인', estimatedTime: 15, owner: 'me', canStartEarly: true },
            { title: '서약서 준비', estimatedTime: 20, owner: 'me', canStartEarly: true },
            { title: '출석 동선 세팅', estimatedTime: 30, owner: 'me', canStartEarly: true },
            { title: '목걸이 번호 지정/세팅', estimatedTime: 20, owner: 'me', canStartEarly: true },
            { title: 'UX표준프로파일 수집', estimatedTime: 30, owner: 'me' }
          ]}
        ]
      },
      { // 4: 테스트 진행
        subcategories: [
          { name: '출석 관리', tasks: [
            { title: '본인 확인', estimatedTime: 5, owner: 'me' },
            { title: '목걸이 배포', estimatedTime: 5, owner: 'me' },
            { title: '보안스티커 부착', estimatedTime: 5, owner: 'me' },
            { title: '휴대폰 수거', estimatedTime: 10, owner: 'me' }
          ]},
          { name: '기본', tasks: [
            { title: 'X배너 세팅', estimatedTime: 15, owner: 'me', canStartEarly: true },
            { title: '보안서약서 작성', estimatedTime: 10, owner: 'me' },
            { title: '버퍼인원 안내', estimatedTime: 10, owner: 'me' },
            { title: '출석 인원 최종 프로파일 정리', estimatedTime: 30, owner: 'me' },
            { title: '종료 후 현장 정리', estimatedTime: 30, owner: 'me' }
          ]}
        ]
      },
      { // 5: 테스트 종료 후
        subcategories: [
          { name: '보상 지급', tasks: [
            { title: '무료캐시 지급신청', estimatedTime: 30, owner: 'me' },
            { title: '이벤트 보상구매 신청', estimatedTime: 20, owner: 'me' },
            { title: '외주업체를 통한 지급', estimatedTime: 15, owner: 'other' }
          ]},
          { name: '기본', tasks: [
            { title: '외주업체 비용 처리', estimatedTime: 20, owner: 'me' },
            { title: '보고서 모객 페이지 작성', estimatedTime: 120, owner: 'me' }
          ]}
        ]
      }
    ],
    participantGoal: null,
    createdAt: '2026-03-16T00:00:00.000Z'
  },
  {
    id: 'default-ro',
    name: 'RO (리서치 오퍼레이션)',
    isDefault: true,
    stageNames: ['킥오프', '모객 준비', '모객 진행', '환경 세팅', '테스트 진행', '테스트 종료'],
    stages: [
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] }
    ],
    participantGoal: null,
    createdAt: '2026-03-27T00:00:00.000Z'
  },
  {
    id: 'default-cx-research',
    name: 'CX 리서치',
    isDefault: true,
    stageNames: ['킥오프', '리서치 준비/설계', '리서치 실사', '결과 분석'],
    stages: [
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] }
    ],
    participantGoal: null,
    createdAt: '2026-03-27T00:00:00.000Z'
  }
];

/**
 * 기본 템플릿 시딩: ID 기반 체크 (기존 유저도 새 기본 템플릿을 받음)
 */
function seedDefaultTemplates() {
  let seeded = false;
  for (const defaultTemplate of DEFAULT_WORK_TEMPLATES) {
    const alreadyExists = appState.workTemplates.some(t => t.id === defaultTemplate.id);
    const wasDeleted = appState.deletedIds.workTemplates && appState.deletedIds.workTemplates[defaultTemplate.id];
    if (!alreadyExists && !wasDeleted) {
      appState.workTemplates.push({ ...defaultTemplate });
      seeded = true;
    }
  }
  if (seeded) {
    saveWorkTemplates();
    console.log('[seed] 기본 템플릿 시딩 완료');
  }
}

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
        console.log('프로젝트 마이그레이션 완료');
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

/**
 * 템플릿으로 저장
 */
function saveAsTemplate(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const templateName = prompt('템플릿 이름을 입력하세요:', project.name + ' 템플릿');
  if (!templateName) return;

  const template = {
    id: generateId(),
    name: templateName,
    stageNames: project.stages.map(s => s.name || ''),
    stages: project.stages.map(stage => ({
      subcategories: (stage.subcategories || []).map(sub => ({
        name: sub.name,
        tasks: sub.tasks.map(t => ({
          title: t.title,
          owner: t.owner || 'me',
          estimatedTime: t.estimatedTime || 30,
          ...(t.canStartEarly && { canStartEarly: true })
        }))
      }))
    })),
    participantGoal: project.participantGoal,
    createdAt: new Date().toISOString()
  };

  appState.workTemplates.push(template);
  saveWorkTemplates();
  showToast('템플릿 저장됨', 'success');
}
window.saveAsTemplate = saveAsTemplate;

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
