// ============================================
// 본업 프로젝트 - 펄스/포커스/부하 분석
// (work-data.js에서 분리)
// ============================================

const PULSE_COLORS = {
  overdue:   'var(--accent-danger)',
  critical:  'var(--accent-danger)',
  warning:   'var(--pulse-warning)',
  attention: 'var(--pulse-warning)',
  'on-track': 'var(--accent-success)',
  waiting:   'var(--accent-primary)',
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
