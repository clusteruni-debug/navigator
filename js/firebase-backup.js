// ============================================
// Firebase 동기화 백업 / 복원
// (firebase-sync.js에서 분리)
// ============================================

/**
 * 동기화 전 자동 백업 생성
 * Firebase에 쓰기 전 현재 상태를 localStorage에 스냅샷으로 저장
 * 데이터 유실 시 복원 가능 (최근 1개 유지, 데이터가 있을 때만)
 */
function createSyncBackup() {
  try {
    // 데이터가 하나도 없으면 백업할 가치 없음
    if (appState.tasks.length === 0 && appState.workProjects.length === 0) return;

    const backup = {
      timestamp: new Date().toISOString(),
      tasks: appState.tasks,
      workProjects: appState.workProjects,
      workTemplates: appState.workTemplates,
      templates: appState.templates,
      settings: appState.settings,
      lifeRhythm: appState.lifeRhythm,
      availableTags: appState.availableTags,
      streak: appState.streak,
      completionLog: appState.completionLog,
      resolutions: appState.resolutions || []
    };

    localStorage.setItem('navigator-sync-backup', JSON.stringify(backup));
  } catch (e) {
    console.warn('동기화 백업 생성 실패:', e);
  }
}

/**
 * 동기화 백업에서 데이터 복원
 * 데이터 유실 감지 시 또는 수동으로 호출
 */
function restoreFromSyncBackup() {
  const raw = localStorage.getItem('navigator-sync-backup');
  if (!raw) {
    showToast('복원할 동기화 백업이 없습니다', 'error');
    return;
  }

  try {
    const backup = JSON.parse(raw);
    const taskCount = (backup.tasks || []).length;
    const wpCount = (backup.workProjects || []).length;
    const timeStr = new Date(backup.timestamp).toLocaleString('ko-KR');

    if (!confirm(
      `동기화 백업에서 복원하시겠습니까?\n\n` +
      `백업 시각: ${timeStr}\n` +
      `태스크: ${taskCount}개\n` +
      `본업 프로젝트: ${wpCount}개\n\n` +
      `현재 데이터를 백업 데이터로 교체합니다.`
    )) return;

    // 복원
    if (backup.tasks) appState.tasks = validateTasks(backup.tasks);
    if (backup.workProjects) appState.workProjects = backup.workProjects;
    if (backup.workTemplates) appState.workTemplates = backup.workTemplates;
    if (backup.templates) appState.templates = backup.templates;
    if (backup.settings) appState.settings = { ...appState.settings, ...backup.settings };
    if (backup.lifeRhythm) {
      // 복원된 lifeRhythm에 med_afternoon → med_afternoon_adhd 마이그레이션
      if (backup.lifeRhythm.today?.medications?.med_afternoon !== undefined) {
        backup.lifeRhythm.today.medications.med_afternoon_adhd = backup.lifeRhythm.today.medications.med_afternoon;
        delete backup.lifeRhythm.today.medications.med_afternoon;
      }
      if (backup.lifeRhythm.history) {
        for (const date of Object.keys(backup.lifeRhythm.history)) {
          const meds = backup.lifeRhythm.history[date]?.medications;
          if (meds?.med_afternoon !== undefined) {
            meds.med_afternoon_adhd = meds.med_afternoon;
            delete meds.med_afternoon;
          }
        }
      }
      // medicationSlots 마이그레이션: med_afternoon → ADHD약 + 영양제 2개
      const slots = backup.lifeRhythm.settings?.medicationSlots;
      if (slots) {
        const oldIdx = slots.findIndex(s => s.id === 'med_afternoon');
        if (oldIdx !== -1) {
          slots.splice(oldIdx, 1,
            { id: 'med_afternoon_adhd', label: 'ADHD약(점심)', icon: '💊', required: true },
            { id: 'med_afternoon_nutrient', label: '영양제(점심)', icon: '🌿', required: false }
          );
        }
      }
      appState.lifeRhythm = backup.lifeRhythm;
    }
    if (backup.availableTags) appState.availableTags = backup.availableTags;
    if (backup.streak) appState.streak = backup.streak;
    if (backup.completionLog) appState.completionLog = backup.completionLog;
    if (backup.resolutions) appState.resolutions = backup.resolutions;

    // 로컬 저장 + Firebase 동기화
    _doSaveState();

    recomputeTodayStats();
    renderStatic();
    showToast('✅ 동기화 백업에서 복원 완료!', 'success');
  } catch (e) {
    console.error('백업 복원 실패:', e);
    showToast('백업 복원 중 오류가 발생했습니다', 'error');
  }
}
window.restoreFromSyncBackup = restoreFromSyncBackup;
