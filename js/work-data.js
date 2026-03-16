// ============================================
// 본업 프로젝트 - 데이터/상태 관리
// ============================================

// 모달 상태
let workModalState = {
  type: null, // 'project', 'subcategory', 'task', 'log'
  projectId: null,
  stageIdx: null,
  subcategoryIdx: null,
  taskIdx: null
};

// 상태 목록
const WORK_STATUS = {
  'not-started': { label: '미시작', color: '#a0a0a0' },
  'in-progress': { label: '진행중', color: '#667eea' },
  'completed': { label: '완료', color: '#48bb78' },
  'blocked': { label: '보류', color: '#f5576c' }
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
  }
];

/**
 * workTemplates가 비어있으면 기본 템플릿 추가
 */
function seedDefaultTemplates() {
  if (appState.workTemplates.length === 0) {
    const defaults = DEFAULT_WORK_TEMPLATES.map(t => ({ ...t }));
    appState.workTemplates.push(...defaults);
    if (!appState.user) {
      localStorage.setItem('navigator-work-templates', JSON.stringify(appState.workTemplates));
    }
    if (appState.user) { syncToFirebase(); }
    console.log('[seed] 기본 템플릿 추가:', defaults.map(t => t.name).join(', '));
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

  // 모든 단계와 항목 초기화
  newProject.stages.forEach(stage => {
    stage.completed = false;
    (stage.subcategories || []).forEach(sub => {
      sub.tasks.forEach(task => {
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

/**
 * 프로젝트 슬랙 형식으로 클립보드 복사
 * - 슬랙에 붙여넣기 용도의 체크리스트 텍스트 생성
 */
function copyProjectToSlack(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const statusLabel = {
    'not-started': '',
    'in-progress': '[진행중]',
    'completed': '[완료]',
    'blocked': '[보류]'
  };

  // 마감일 포맷 헬퍼
  const fmtDeadline = (task) => {
    if (!task.deadline) return '';
    const d = new Date(task.deadline);
    return ' ~' + (d.getMonth() + 1) + '/' + d.getDate();
  };

  let lines = [];
  lines.push('[ ' + project.name + ' 진행 리스트 ]');
  lines.push('');

  project.stages.forEach((stage, stageIdx) => {
    const stageName = getStageName(project, stageIdx);
    const subcats = stage.subcategories || [];
    if (subcats.length === 0) return;

    // 단계별 완료율 계산
    const total = subcats.reduce((s, sub) => s + sub.tasks.length, 0);
    const done = subcats.reduce((s, sub) => s + sub.tasks.filter(t => t.status === 'completed').length, 0);
    const stageStatus = total > 0 && done === total ? ' ✅' : '';

    lines.push('■ ' + stageName + stageStatus);

    subcats.forEach(sub => {
      // 중분류명이 "일반"이면 생략하고 작업만 나열
      const isGeneral = sub.name === '일반';

      if (!isGeneral) {
        // 중분류에 작업이 있으면 중분류명을 상위 항목으로 표시
        const subDone = sub.tasks.filter(t => t.status === 'completed').length;
        const subStatus = sub.tasks.length > 0 && subDone === sub.tasks.length ? ' [완료]' : '';
        lines.push(sub.name + ':' + subStatus);

        sub.tasks.forEach(task => {
          const status = statusLabel[task.status] || '';
          const deadline = fmtDeadline(task);
          const lastLog = task.logs && task.logs.length > 0 ? task.logs[task.logs.length - 1] : null;
          let line = '  ' + task.title;
          if (status) line += ' ' + status;
          if (deadline) line += deadline;
          if (lastLog && lastLog.content !== '✓ 완료') line += ' - ' + lastLog.content;
          lines.push(line);
        });
      } else {
        // "일반" 중분류: 작업을 최상위로 나열
        sub.tasks.forEach(task => {
          const status = statusLabel[task.status] || '';
          const deadline = fmtDeadline(task);
          const lastLog = task.logs && task.logs.length > 0 ? task.logs[task.logs.length - 1] : null;
          let line = task.title;
          if (status) line += ': ' + status;
          if (deadline) line += deadline;
          if (lastLog && lastLog.content !== '✓ 완료') line += ' - ' + lastLog.content;
          lines.push(line);
        });
      }
    });

    lines.push(''); // 단계 사이 빈 줄
  });

  const text = lines.join('\n').trim();
  navigator.clipboard.writeText(text).then(() => {
    showToast('슬랙용 진행 리스트 복사됨', 'success');
  }).catch(() => {
    // 클립보드 API 실패 시 fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('슬랙용 진행 리스트 복사됨', 'success');
  });
}
window.copyProjectToSlack = copyProjectToSlack;

/**
 * 본업 프로젝트 단계(stage) 단위 슬랙 복사
 */
function copyStageToSlack(projectId, stageIdx) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project || !project.stages[stageIdx]) return;

  const stage = project.stages[stageIdx];
  const stageName = getStageName(project, stageIdx);
  const statusLabel = { 'not-started': '', 'in-progress': '[진행중]', 'completed': '[완료]', 'blocked': '[보류]' };
  const fmtDeadline = (task) => {
    if (!task.deadline) return '';
    const d = new Date(task.deadline);
    return ' ~' + (d.getMonth() + 1) + '/' + d.getDate();
  };

  let lines = ['■ ' + stageName];
  (stage.subcategories || []).forEach(sub => {
    const isGeneral = sub.name === '일반';
    if (!isGeneral && sub.tasks.length > 0) {
      lines.push(sub.name + ':');
    }
    sub.tasks.forEach(task => {
      const status = statusLabel[task.status] || '';
      const deadline = fmtDeadline(task);
      const prefix = isGeneral ? '' : '  ';
      let line = prefix + task.title;
      if (status) line += ' ' + status;
      if (deadline) line += deadline;
      lines.push(line);
    });
  });

  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast('단계 복사됨 (슬랙용)', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast('단계 복사됨 (슬랙용)', 'success');
  });
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

  const statusLabel = { 'not-started': '미시작', 'in-progress': '진행중', 'completed': '완료', 'blocked': '보류' };
  let text = task.title;
  text += ' [' + (statusLabel[task.status] || '미시작') + ']';
  if (task.deadline) {
    const d = new Date(task.deadline);
    text += ' ~' + (d.getMonth()+1) + '/' + d.getDate();
  }
  if (task.logs && task.logs.length > 0) {
    text += '\n최근 기록:';
    task.logs.slice(-3).forEach(log => {
      text += '\n  - ' + log.date + ': ' + log.content;
    });
  }

  navigator.clipboard.writeText(text).then(() => {
    showToast('작업 복사됨', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast('작업 복사됨', 'success');
  });
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
  if (!appState.user) {
    localStorage.setItem('navigator-work-templates', JSON.stringify(appState.workTemplates));
  }
  if (appState.user) { syncToFirebase(); }
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

// ============================================
// 펄스 (건강 상태) 계산
// ============================================

const PULSE_COLORS = {
  overdue:   '#f5576c',
  critical:  '#f5576c',
  warning:   '#ff9500',
  attention: '#ff9500',
  'on-track': '#48bb78',
  waiting:   '#667eea',
  done:      'transparent',
  normal:    'transparent'
};

/**
 * 태스크 펄스 계산
 */
function calculateTaskPulse(task) {
  if (task.completed || task.status === 'completed') return 'done';
  if (task.status === 'blocked' || task.owner === 'waiting') return 'waiting';
  if (!task.deadline) return 'normal';

  const now = new Date();
  const deadline = new Date(task.deadline);
  const daysLeft = (deadline - now) / (1000 * 60 * 60 * 24);

  if (daysLeft < 0) return 'overdue';
  if (daysLeft < 1) return 'critical';
  if (daysLeft < 3 && task.status !== 'in-progress') return 'warning';
  if (daysLeft < 7 && task.status === 'not-started') return 'attention';
  return 'on-track';
}

/**
 * 프로젝트의 모든 태스크 수집
 */
function getAllProjectTasks(project) {
  const tasks = [];
  (project.stages || []).forEach(stage => {
    (stage.subcategories || []).forEach(sub => {
      (sub.tasks || []).forEach(t => tasks.push(t));
    });
  });
  return tasks;
}

/**
 * 프로젝트 펄스 계산
 */
function calculateProjectPulse(project) {
  if (project.onHold) return 'waiting';
  const allTasks = getAllProjectTasks(project);
  const myTasks = allTasks.filter(t => t.owner === 'me' && t.status !== 'completed');
  if (myTasks.length === 0) return 'done';

  const pulses = myTasks.map(t => calculateTaskPulse(t));
  if (pulses.includes('overdue') || pulses.includes('critical')) return 'critical';
  if (pulses.includes('warning')) return 'warning';
  if (pulses.includes('attention')) return 'attention';
  return 'on-track';
}

/**
 * 오늘의 포커스: 모드 기반 태스크 추천
 * @returns {{ task: object|null, mode: 'urgent'|'normal'|'proactive'|'general'|'all-done'|'empty' }}
 */
function getWorkFocus() {
  const candidates = [];
  appState.workProjects.filter(p => !p.archived && !p.onHold).forEach(p => {
    (p.stages || []).forEach((stage, si) => {
      (stage.subcategories || []).forEach((sub, sci) => {
        (sub.tasks || []).forEach((task, ti) => {
          if (task.status !== 'completed' && task.owner === 'me') {
            candidates.push({
              ...task,
              _projectName: p.name,
              _projectId: p.id,
              _stageIdx: si,
              _subcatIdx: sci,
              _taskIdx: ti,
              _stageName: stage.name || ('단계 ' + (si + 1))
            });
          }
        });
      });
    });
  });

  if (candidates.length === 0) {
    // 일반 업무 체크
    const generalTasks = appState.tasks.filter(t => t.category === '본업' && !t.workProjectId && !t.completed);
    if (generalTasks.length > 0) {
      return { task: generalTasks[0], mode: 'general' };
    }
    // 프로젝트 태스크가 하나라도 있었는지 확인
    const hasAnyTask = appState.workProjects.some(p => !p.archived && getAllProjectTasks(p).length > 0);
    return { task: null, mode: hasAnyTask ? 'all-done' : 'empty' };
  }

  const pulseOrder = { overdue: 0, critical: 1, warning: 2, attention: 3, normal: 4, 'on-track': 4 };

  // 1순위: 급한 태스크 (overdue ~ attention)
  const urgent = candidates
    .filter(t => {
      const p = calculateTaskPulse(t);
      return ['overdue', 'critical', 'warning', 'attention'].includes(p);
    })
    .sort((a, b) => {
      const pa = pulseOrder[calculateTaskPulse(a)] ?? 4;
      const pb = pulseOrder[calculateTaskPulse(b)] ?? 4;
      if (pa !== pb) return pa - pb;
      return (a.estimatedTime || 30) - (b.estimatedTime || 30);
    });

  if (urgent.length > 0) {
    return { task: urgent[0], mode: 'urgent' };
  }

  // 프로젝트별 현재 단계 이하의 태스크 vs 다음 단계 canStartEarly 분리
  const currentStageTasks = [];
  const earlyStartTasks = [];

  candidates.forEach(t => {
    const pulse = calculateTaskPulse(t);
    if (pulse === 'waiting' || t.status === 'blocked') return;

    // 해당 태스크가 속한 프로젝트의 currentStage 확인
    const proj = appState.workProjects.find(p => p.id === t._projectId);
    const projCurrentStage = proj ? (proj.currentStage || 0) : 0;

    if (t._stageIdx <= projCurrentStage) {
      // 현재 단계 이하 → 일반 작업
      currentStageTasks.push(t);
    } else if (t.canStartEarly) {
      // 다음 단계 + canStartEarly → 선제적 추천 후보
      earlyStartTasks.push(t);
    }
  });

  // 2순위: 현재 단계의 일반 태스크
  currentStageTasks.sort((a, b) => {
    const sa = a._stageIdx ?? 99;
    const sb = b._stageIdx ?? 99;
    if (sa !== sb) return sa - sb;
    return (a.estimatedTime || 30) - (b.estimatedTime || 30);
  });

  if (currentStageTasks.length > 0) {
    return { task: currentStageTasks[0], mode: 'normal' };
  }

  // 3순위: 다음 단계의 canStartEarly 태스크 (선제적 추천)
  earlyStartTasks.sort((a, b) => {
    const sa = a._stageIdx ?? 99;
    const sb = b._stageIdx ?? 99;
    if (sa !== sb) return sa - sb;
    return (a.estimatedTime || 30) - (b.estimatedTime || 30);
  });

  if (earlyStartTasks.length > 0) {
    return { task: earlyStartTasks[0], mode: 'proactive' };
  }

  // 4순위: 일반 업무 (비프로젝트)
  const generalTasks = appState.tasks.filter(t => t.category === '본업' && !t.workProjectId && !t.completed);
  if (generalTasks.length > 0) {
    return { task: generalTasks[0], mode: 'general' };
  }

  return { task: null, mode: 'all-done' };
}

/**
 * 이번 달 남은 근무일 수 (주말 제외, 오늘 포함)
 */
function getRemainingWorkdays() {
  const now = new Date();
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  let count = 0;
  for (let d = new Date(now.getFullYear(), now.getMonth(), now.getDate()); d <= lastDay; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count++;
  }
  return count;
}

/**
 * 부하 게이지 계산
 */
function calculateWorkload() {
  const myTasks = appState.workProjects
    .filter(p => !p.archived && !p.onHold)
    .flatMap(p => getAllProjectTasks(p))
    .filter(t => t.owner === 'me' && t.status !== 'completed');

  const totalRemainingMinutes = myTasks.reduce((sum, t) => sum + (t.estimatedTime || 30), 0);
  const remainingWorkdays = getRemainingWorkdays();
  const dailyAvailableMinutes = (appState.settings && appState.settings.dailyAvailableMinutes) || 360;
  const totalAvailableMinutes = remainingWorkdays * dailyAvailableMinutes;

  const loadPercentage = totalAvailableMinutes > 0
    ? Math.round((totalRemainingMinutes / totalAvailableMinutes) * 100)
    : 0;

  return {
    totalRemainingMinutes,
    remainingWorkdays,
    totalAvailableMinutes,
    loadPercentage,
    taskCount: myTasks.length,
    status: loadPercentage > 120 ? 'overloaded'
          : loadPercentage > 90  ? 'tight'
          : loadPercentage > 60  ? 'moderate'
          : 'comfortable'
  };
}

// ============================================
// MM (Monthly Report) Auto-Generation
// ============================================

/**
 * Generate monthly work report combining completionLog + Work project data.
 * @param {number} year - e.g. 2026
 * @param {number} month - 1-12
 * @returns {string} formatted report text
 */
function generateMMReport(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDate = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDate}`;
  // Handle month overflow: use first day of next month as exclusive end
  const endExcl = new Date(year, month, 1); // first day of next month
  const endExclStr = getLocalDateStr(endExcl);

  // 1. Completion log entries filtered to 'Main Job' category (본업)
  const entries = getCompletionLogEntries(startDate, endExclStr)
    .filter(e => e.c === '본업' || e.c === 'Main Job');

  // 2. Work project task completions in the date range
  const workCompletions = [];
  appState.workProjects.forEach(project => {
    (project.stages || []).forEach((stage, si) => {
      (stage.subcategories || []).forEach((sub, sci) => {
        (sub.tasks || []).forEach((task, ti) => {
          if (task.status === 'completed' && task.completedAt) {
            const completedDate = task.completedAt.slice(0, 10); // YYYY-MM-DD
            if (completedDate >= startDate && completedDate <= endDate) {
              workCompletions.push({
                title: task.title,
                projectName: project.name,
                projectId: project.id,
                stageName: stage.name || ('단계 ' + (si + 1)),
                estimatedTime: task.estimatedTime || 30,
                actualTime: task.actualTime || null,
                completedAt: task.completedAt
              });
            }
          }
        });
      });
    });
  });

  // Check if there's any data
  if (workCompletions.length === 0 && entries.length === 0) {
    return null; // Signal: no data
  }

  let report = `${year}년 ${month}월 업무 보고\n`;
  report += `${'─'.repeat(30)}\n\n`;

  // 3. Group work completions by project
  const projects = {};
  workCompletions.forEach(t => {
    if (!projects[t.projectName]) {
      projects[t.projectName] = [];
    }
    projects[t.projectName].push(t);
  });

  if (Object.keys(projects).length > 0) {
    for (const [name, tasks] of Object.entries(projects)) {
      const totalMinutes = tasks.reduce((s, t) => s + (t.actualTime || t.estimatedTime || 30), 0);
      const hours = Math.round(totalMinutes / 60 * 10) / 10;
      report += `[${name}] (${hours}h)\n`;
      tasks.forEach(t => {
        const time = t.actualTime || t.estimatedTime || 30;
        report += `- ${t.title} (${time}분)\n`;
      });
      report += '\n';
    }
  }

  // 4. General completion log entries (not linked to work projects)
  // Filter out entries whose titles already appear in workCompletions
  const workTitles = new Set(workCompletions.map(t => t.title));
  const general = entries.filter(e => !workTitles.has(e.t) && e.t !== '(요약)');
  if (general.length > 0) {
    report += `[일반 업무]\n`;
    general.forEach(t => report += `- ${t.t}\n`);
    report += '\n';
  }

  // 5. Summary stats
  const totalTasks = workCompletions.length + general.length;
  const totalMinutes = workCompletions.reduce((s, t) => s + (t.actualTime || t.estimatedTime || 30), 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  report += `${'─'.repeat(30)}\n`;
  report += `총 완료: ${totalTasks}건`;
  if (totalHours > 0) report += ` / 총 ${totalHours}h`;
  report += '\n';

  return report;
}

// ============================================
// Notion Progress Copy (진행상황 복사)
// ============================================

/**
 * Copy completed tasks from a subcategory in Notion-compatible format.
 * Format:
 *   YYYY년 M월 D일
 *   * [task title]
 *      *
 * @param {string} projectId
 * @param {number} stageIdx
 * @param {number} subcatIdx
 * @param {'today'|'week'} range
 */
function copyNotionProgress(projectId, stageIdx, subcatIdx, range) {
  range = range || 'today';
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const subcat = project.stages[stageIdx]?.subcategories[subcatIdx];
  if (!subcat) return;

  // Determine date range
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let startDate;
  if (range === 'week') {
    const dayOfWeek = today.getDay();
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    startDate = new Date(today);
    startDate.setDate(startDate.getDate() + mondayOffset);
  } else {
    startDate = new Date(today);
  }
  const endDate = new Date(today);
  endDate.setDate(endDate.getDate() + 1); // end of today (exclusive)

  // Filter completed tasks within date range
  const completedTasks = subcat.tasks.filter(t => {
    if (t.status !== 'completed' || !t.completedAt) return false;
    const completedDate = new Date(t.completedAt);
    return completedDate >= startDate && completedDate < endDate;
  });

  let lines = [];

  if (range === 'today') {
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    lines.push(y + '년 ' + m + '월 ' + d + '일');

    completedTasks.forEach(t => {
      lines.push('* ' + t.title);
      lines.push('   * ');
    });
  } else {
    // Week mode: group by date
    const byDate = {};
    completedTasks.forEach(t => {
      const dateStr = t.completedAt.slice(0, 10);
      if (!byDate[dateStr]) byDate[dateStr] = [];
      byDate[dateStr].push(t);
    });

    const dates = Object.keys(byDate).sort();

    if (dates.length === 0) {
      // No completions this week - still output today's date
      const y = now.getFullYear();
      const m = now.getMonth() + 1;
      const d = now.getDate();
      lines.push(y + '년 ' + m + '월 ' + d + '일');
    } else {
      dates.forEach(dateStr => {
        const dt = new Date(dateStr + 'T00:00:00');
        const y = dt.getFullYear();
        const m = dt.getMonth() + 1;
        const d = dt.getDate();
        lines.push(y + '년 ' + m + '월 ' + d + '일');

        byDate[dateStr].forEach(t => {
          lines.push('* ' + t.title);
          lines.push('   * ');
        });
      });
    }
  }

  const text = lines.join('\n');
  const label = range === 'today' ? '오늘' : '이번 주';
  navigator.clipboard.writeText(text).then(() => {
    showToast('Notion 진행상황 복사됨 (' + label + ')', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Notion 진행상황 복사됨 (' + label + ')', 'success');
  });

  // Close popup menu if open
  const menu = document.getElementById('notion-copy-menu');
  if (menu) menu.remove();
}
window.copyNotionProgress = copyNotionProgress;

/**
 * Show a small popup menu for Notion progress copy range selection.
 */
function showNotionCopyMenu(event, projectId, stageIdx, subcatIdx) {
  event.stopPropagation();

  // Remove existing menu
  const existing = document.getElementById('notion-copy-menu');
  if (existing) existing.remove();

  const menu = document.createElement('div');
  menu.id = 'notion-copy-menu';
  menu.style.cssText = 'position: fixed; z-index: 9999; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); display: flex; flex-direction: column; gap: 2px; min-width: 140px;';

  const rect = event.target.getBoundingClientRect();
  menu.style.top = (rect.bottom + 4) + 'px';
  menu.style.left = Math.min(rect.left, window.innerWidth - 160) + 'px';

  const btnStyle = 'display: block; width: 100%; padding: 10px 12px; background: transparent; border: none; border-radius: 6px; color: var(--text-primary); font-size: 14px; cursor: pointer; text-align: left; min-height: 44px;';

  menu.innerHTML =
    '<button style="' + btnStyle + '" onmouseenter="this.style.background=\'var(--bg-tertiary)\'" onmouseleave="this.style.background=\'transparent\'" ' +
      'onclick="copyNotionProgress(\'' + escapeAttr(projectId) + '\', ' + stageIdx + ', ' + subcatIdx + ', \'today\')">📋 오늘</button>' +
    '<button style="' + btnStyle + '" onmouseenter="this.style.background=\'var(--bg-tertiary)\'" onmouseleave="this.style.background=\'transparent\'" ' +
      'onclick="copyNotionProgress(\'' + escapeAttr(projectId) + '\', ' + stageIdx + ', ' + subcatIdx + ', \'week\')">📋 이번 주</button>';

  document.body.appendChild(menu);

  // Auto-close on outside click
  setTimeout(() => {
    document.addEventListener('click', function handler() {
      const m = document.getElementById('notion-copy-menu');
      if (m) m.remove();
      document.removeEventListener('click', handler);
    }, { once: true });
  }, 0);
}
window.showNotionCopyMenu = showNotionCopyMenu;
