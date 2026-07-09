// ============================================
// 반복 작업 생성 / 레이블
// (actions-complete.js에서 분리)
// ============================================

/**
 * 반복 유형 라벨 반환
 */
function getRepeatLabel(repeatType, task = null) {
  const labels = {
    'daily': '매일',
    'weekdays': '평일',
    'weekends': '주말',
    'weekly': '매주',
    'monthly': '매월'
  };

  if (repeatType === 'custom' && task && task.repeatDays && task.repeatDays.length > 0) {
    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
    const selectedDays = task.repeatDays.map(d => dayNames[d]).join(',');
    return `매주 ${selectedDays}`;
  }

  if (repeatType === 'monthly' && task && task.repeatMonthDay) {
    return `매월 ${task.repeatMonthDay}일`;
  }

  if (repeatType === 'interval' && task && task.repeatInterval) {
    return `${task.repeatInterval}일마다`;
  }

  return labels[repeatType] || '';
}

/**
 * 다음 반복 작업 생성
 * 반복 작업은 항상 다음 날짜를 기준으로 생성됨 (오늘 목록에 즉시 나타나지 않음)
 */
function createNextRepeatTask(task) {
  const now = new Date();
  let nextDeadline = null;

  // 마감일이 있으면 그 기준으로, 없으면 오늘 기준으로 다음 날짜 계산
  const baseDate = task.deadline ? new Date(task.deadline) : new Date();
  nextDeadline = new Date(baseDate);

  switch (task.repeatType) {
    case 'daily':
      nextDeadline.setDate(nextDeadline.getDate() + 1);
      break;
    case 'weekdays':
      // 평일만: 금요일이면 월요일로, 아니면 다음 날
      nextDeadline.setDate(nextDeadline.getDate() + 1);
      while (nextDeadline.getDay() === 0 || nextDeadline.getDay() === 6) {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    case 'weekends':
      // 주말만: 토요일이면 일요일로, 일요일이면 토요일로
      nextDeadline.setDate(nextDeadline.getDate() + 1);
      while (nextDeadline.getDay() !== 0 && nextDeadline.getDay() !== 6) {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    case 'weekly':
      nextDeadline.setDate(nextDeadline.getDate() + 7);
      break;
    case 'monthly':
      nextDeadline.setMonth(nextDeadline.getMonth() + 1);
      break;
    case 'custom':
      // 특정 요일 반복: 다음 해당 요일 찾기
      if (task.repeatDays && task.repeatDays.length > 0) {
        let found = false;
        for (let i = 1; i <= 7 && !found; i++) {
          nextDeadline.setDate(nextDeadline.getDate() + 1);
          if (task.repeatDays.includes(nextDeadline.getDay())) {
            found = true;
          }
        }
      } else {
        nextDeadline.setDate(nextDeadline.getDate() + 1);
      }
      break;
    case 'interval':
      nextDeadline.setDate(nextDeadline.getDate() + (task.repeatInterval || 2));
      break;
    default:
      nextDeadline.setDate(nextDeadline.getDate() + 1);
  }

  // 시간은 원래 작업과 동일하게 (없으면 자정)
  if (task.deadline) {
    const originalTime = new Date(task.deadline);
    nextDeadline.setHours(originalTime.getHours(), originalTime.getMinutes(), 0, 0);
  } else {
    nextDeadline.setHours(23, 59, 0, 0); // 마감일 없던 작업은 하루 끝으로
  }

  return {
    id: generateId(),
    title: task.title,
    category: task.category,
    deadline: getLocalDateTimeStr(nextDeadline),
    estimatedTime: task.estimatedTime,
    link: task.link,
    expectedRevenue: task.expectedRevenue,
    repeatType: task.repeatType,
    repeatDays: task.repeatDays,
    repeatMonthDay: task.repeatMonthDay,
    repeatInterval: task.repeatInterval,
    subtasks: (task.subtasks || []).map(st => ({ ...st, completed: false, completedAt: null })),
    tags: task.tags || [],
    completed: false,
    spawnedFromTaskId: task.id,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString()
  };
}
