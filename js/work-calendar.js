// ============================================
// 본업 프로젝트 - 달력 뷰 (스케줄 + 월간 달력)
// (work.js에서 분리)
// ============================================

/**
 * 프로젝트 스케줄 뷰 + 달력 렌더링
 */
function renderWorkCalendarView() {
  var now = new Date();
  var todayStr = getLocalDateStr(now);
  var activeAll = appState.workProjects.filter(function(p) { return !p.archived; });
  // 기본: 진행중 + 마감없음(활성)만 표시
  var defaultProjects = activeAll.filter(function(p) {
    return !p.onHold && !isProjectCompleted(p);
  });
  // 토글 시 완료/보류도 포함
  var showAll = appState.scheduleShowAll || false;
  var projects = showAll ? activeAll : defaultProjects;
  var hiddenCount = activeAll.length - defaultProjects.length;
  var projectColors = ['var(--accent-primary)', 'var(--accent-success)', 'var(--accent-warning)', 'var(--cat-부업)', 'var(--chart-cyan)', 'var(--accent-danger)', 'var(--chart-lavender)', 'var(--chart-tangerine)'];

  // 시간 범위: 오늘 기준 -2주 ~ +8주 (총 10주 = 70일)
  var rangeStart = new Date(now);
  rangeStart.setDate(rangeStart.getDate() - 14);
  rangeStart.setHours(0, 0, 0, 0);
  var rangeEnd = new Date(now);
  rangeEnd.setDate(rangeEnd.getDate() + 56);
  rangeEnd.setHours(23, 59, 59, 999);
  var totalDays = Math.round((rangeEnd - rangeStart) / (1000 * 60 * 60 * 24));

  // 주 단위 헤더 생성
  var weekStart = new Date(rangeStart);
  var dayOfWeek = weekStart.getDay();
  var mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  weekStart.setDate(weekStart.getDate() + mondayOffset);

  var weekLabels = [];
  var tempWeek = new Date(weekStart);
  while (tempWeek < rangeEnd) {
    var wMonth = tempWeek.getMonth() + 1;
    var wDay = tempWeek.getDate();
    var weekDaysFromStart = Math.round((tempWeek - rangeStart) / (1000 * 60 * 60 * 24));
    var leftPct = Math.max(0, (weekDaysFromStart / totalDays) * 100);
    weekLabels.push({ label: wMonth + '/' + wDay, left: leftPct });
    tempWeek.setDate(tempWeek.getDate() + 7);
  }

  var weeksHtml = '';
  weeksHtml += '<div style="display: flex; align-items: center; border-bottom: 1px solid var(--border-color); padding: 8px 0; font-size: 14px; color: var(--text-muted);">';
  weeksHtml += '<div style="min-width: 130px; max-width: 130px; padding: 0 8px; font-weight: 600; color: var(--text-primary);">프로젝트</div>';
  weeksHtml += '<div style="flex: 1; position: relative; height: 24px; overflow: hidden;">';
  for (var wi = 0; wi < weekLabels.length; wi++) {
    weeksHtml += '<div style="position: absolute; left: ' + weekLabels[wi].left + '%; top: 0; font-size: 14px; color: var(--text-muted); white-space: nowrap; transform: translateX(-50%);">' + weekLabels[wi].label + '</div>';
    weeksHtml += '<div style="position: absolute; left: ' + weekLabels[wi].left + '%; top: 18px; width: 1px; height: 6px; background: var(--border-color);"></div>';
  }
  weeksHtml += '</div>';
  weeksHtml += '</div>';

  // 오늘 세로선 위치
  var todayDaysFromStart = Math.round((now - rangeStart) / (1000 * 60 * 60 * 24));
  var todayPct = (todayDaysFromStart / totalDays) * 100;

  // 프로젝트 행 생성
  var rowsHtml = '';
  if (projects.length === 0) {
    rowsHtml += '<div style="text-align: center; padding: 30px; color: var(--text-muted);">활성 프로젝트가 없습니다</div>';
  }
  for (var pi = 0; pi < projects.length; pi++) {
    var proj = projects[pi];
    var color = projectColors[pi % projectColors.length];
    var pStart = proj.createdAt ? new Date(proj.createdAt) : now;
    var pEnd = proj.deadline ? new Date(proj.deadline + 'T23:59:59') : null;
    var isOverdue = pEnd && pEnd < now;

    // 진행률 계산
    var totalStages = proj.stages.length;
    var completedStages = proj.stages.filter(function(s) { return s.completed; }).length;
    var progress = totalStages > 0 ? Math.round((completedStages / totalStages) * 100) : 0;

    // 바 위치 계산
    var barStartDays = Math.round((pStart - rangeStart) / (1000 * 60 * 60 * 24));
    var barLeft = Math.max(0, (barStartDays / totalDays) * 100);
    var barWidth = 0;
    var hasBar = false;

    if (pEnd) {
      var barEndDays = Math.round((pEnd - rangeStart) / (1000 * 60 * 60 * 24));
      var barRight = Math.min(100, (barEndDays / totalDays) * 100);
      barWidth = Math.max(2, barRight - barLeft);
      hasBar = true;
    }

    var barColor = isOverdue ? 'var(--accent-danger)' : color;
    var barBg = 'color-mix(in srgb, ' + barColor + ' 15%, transparent)';

    // 프로젝트 내 작업 마감일 점(dot) 수집
    var taskDots = [];
    proj.stages.forEach(function(stage) {
      (stage.subcategories || []).forEach(function(sub) {
        sub.tasks.forEach(function(task) {
          if (task.deadline && task.status !== 'completed') {
            var tDate = new Date(task.deadline);
            var tDays = Math.round((tDate - rangeStart) / (1000 * 60 * 60 * 24));
            var tPct = (tDays / totalDays) * 100;
            if (tPct >= 0 && tPct <= 100) {
              taskDots.push({ pct: tPct, title: task.title, overdue: tDate < now });
            }
          }
        });
      });
    });

    // 마감일 라벨
    var deadlineLabel = proj.deadline ? proj.deadline.substring(5).replace('-', '/') : '';

    rowsHtml += '<div style="display: flex; align-items: center; padding: 6px 0; border-bottom: 1px solid var(--border-color); min-height: 40px; cursor: pointer; transition: background 0.15s;" onmouseenter="this.style.background=&quot;var(--bg-tertiary)&quot;" onmouseleave="this.style.background=&quot;transparent&quot;" onclick="appState.activeWorkProject=&quot;' + proj.id + '&quot;; setWorkView(&quot;detail&quot;);">';
    // 프로젝트 이름
    rowsHtml += '<div style="min-width: 130px; max-width: 130px; padding: 0 8px; display: flex; align-items: center; gap: 6px;">';
    rowsHtml += '<div style="width: 8px; height: 8px; border-radius: 50%; background: ' + barColor + '; flex-shrink: 0;"></div>';
    rowsHtml += '<span style="font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-primary);" title="' + escapeAttr(proj.name) + '">' + escapeHtml(proj.name) + '</span>';
    rowsHtml += '</div>';
    // 타임라인 영역
    rowsHtml += '<div style="flex: 1; position: relative; height: 32px; overflow: hidden;">';
    // 오늘 세로선
    rowsHtml += '<div style="position: absolute; left: ' + todayPct + '%; top: 0; bottom: 0; width: 2px; background: var(--accent-danger); z-index: 2; opacity: 0.7;"></div>';
    // 주 구분선
    for (var wli = 0; wli < weekLabels.length; wli++) {
      rowsHtml += '<div style="position: absolute; left: ' + weekLabels[wli].left + '%; top: 0; bottom: 0; width: 1px; background: var(--border-color); opacity: 0.3;"></div>';
    }

    if (hasBar) {
      // 프로젝트 바
      rowsHtml += '<div style="position: absolute; left: ' + barLeft + '%; width: ' + barWidth + '%; top: 4px; height: 24px; background: ' + barBg + '; border-radius: 6px; overflow: hidden; border: 1px solid ' + barColor + ';">';
      // 진행률 채우기
      if (progress > 0) {
        rowsHtml += '<div style="position: absolute; left: 0; top: 0; bottom: 0; width: ' + progress + '%; background: ' + barColor + '; opacity: 0.35; border-radius: 5px 0 0 5px;"></div>';
      }
      // 바 내부 텍스트
      rowsHtml += '<div style="position: relative; z-index: 1; display: flex; align-items: center; justify-content: center; height: 100%; font-size: 14px; font-weight: 600; color: ' + barColor + '; padding: 0 6px; white-space: nowrap; overflow: hidden;">';
      if (barWidth > 8) {
        rowsHtml += progress + '%';
        if (deadlineLabel && barWidth > 15) {
          rowsHtml += ' &middot; ' + deadlineLabel;
        }
      }
      rowsHtml += '</div>';
      rowsHtml += '</div>';
    } else {
      // 마감일 없으면 시작점에 점으로 표시
      if (barLeft >= 0 && barLeft <= 100) {
        rowsHtml += '<div style="position: absolute; left: ' + barLeft + '%; top: 10px; width: 12px; height: 12px; border-radius: 50%; background: ' + color + '; transform: translateX(-50%); opacity: 0.7;" title="마감일 미설정"></div>';
      }
    }

    // 작업 마감일 점
    for (var di = 0; di < taskDots.length; di++) {
      var dot = taskDots[di];
      rowsHtml += '<div style="position: absolute; left: ' + dot.pct + '%; bottom: 2px; width: 5px; height: 5px; border-radius: 50%; background: ' + (dot.overdue ? 'var(--accent-danger)' : barColor) + '; transform: translateX(-50%); opacity: 0.8;" title="' + escapeAttr(dot.title) + '"></div>';
    }

    rowsHtml += '</div>'; // 타임라인 영역 닫기
    rowsHtml += '</div>'; // 행 닫기
  }

  // === 프로젝트 스케줄 뷰 조립 ===
  var scheduleHtml = '<div style="background: var(--bg-secondary); border-radius: 12px; padding: 16px; margin-bottom: 16px;">';
  scheduleHtml += '<div style="font-weight: 600; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; color: var(--text-primary);">';
  scheduleHtml += '<span style="font-size: 17px;">프로젝트 스케줄</span>';
  scheduleHtml += '<span style="font-size: 15px; color: var(--text-muted); font-weight: 400;">' + projects.length + '개 · -2주~+8주</span>';
  scheduleHtml += '<span style="flex: 1;"></span>';
  if (hiddenCount > 0) {
    scheduleHtml += '<button onclick="appState.scheduleShowAll=!appState.scheduleShowAll; renderStatic();" style="background: ' + (showAll ? 'var(--accent-primary-alpha)' : 'var(--bg-tertiary)') + '; border: 1px solid ' + (showAll ? 'color-mix(in srgb, var(--accent-primary) 30%, transparent)' : 'var(--border-color)') + '; border-radius: 6px; padding: 4px 10px; font-size: 15px; color: ' + (showAll ? 'var(--accent-primary)' : 'var(--text-muted)') + '; cursor: pointer;">' + (showAll ? '활성만' : '완료/보류 +' + hiddenCount) + '</button>';
  }
  scheduleHtml += '</div>';
  scheduleHtml += weeksHtml;
  scheduleHtml += rowsHtml;
  // 범례
  scheduleHtml += '<div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 10px; font-size: 14px; color: var(--text-muted);">';
  scheduleHtml += '<span style="display: inline-flex; align-items: center; gap: 3px;"><span style="display: inline-block; width: 2px; height: 10px; background: var(--accent-danger);"></span> 오늘</span>';
  scheduleHtml += '<span style="display: inline-flex; align-items: center; gap: 3px;"><span style="display: inline-block; width: 16px; height: 6px; background: var(--accent-primary-alpha); border: 1px solid var(--accent-primary); border-radius: 3px;"></span> 프로젝트 기간</span>';
  scheduleHtml += '<span style="display: inline-flex; align-items: center; gap: 3px;"><span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background: var(--accent-primary);"></span> 작업 마감일</span>';
  scheduleHtml += '<span style="display: inline-flex; align-items: center; gap: 3px;"><span style="display: inline-block; width: 16px; height: 6px; background: var(--accent-danger-alpha); border: 1px solid var(--accent-danger); border-radius: 3px;"></span> 기한 초과</span>';
  scheduleHtml += '</div>';
  scheduleHtml += '</div>';

  // === 기존 달력 그리드 (프로젝트 마감일 표시 포함) ===
  var viewYear = appState.workCalendarYear || now.getFullYear();
  var viewMonth = appState.workCalendarMonth !== undefined ? appState.workCalendarMonth : now.getMonth();
  var firstDay = new Date(viewYear, viewMonth, 1);
  var lastDay = new Date(viewYear, viewMonth + 1, 0);
  var daysInMonth = lastDay.getDate();
  var startDow = firstDay.getDay();

  var deadlineMap = {};
  appState.workProjects.filter(function(p) { return !p.archived; }).forEach(function(p, pIdx) {
    var pColor = projectColors[pIdx % projectColors.length];
    if (p.deadline) {
      var pdStr = p.deadline.substring(0, 10);
      if (!deadlineMap[pdStr]) deadlineMap[pdStr] = [];
      deadlineMap[pdStr].push({ title: p.name + ' (마감)', project: p.name, status: 'project', color: pColor });
    }
    p.stages.forEach(function(stage, si) {
      if (stage.endDate && !stage.completed) {
        var sdStr = stage.endDate.substring(0, 10);
        if (!deadlineMap[sdStr]) deadlineMap[sdStr] = [];
        var sName = (p.stageNames && p.stageNames[si]) || stage.name || ((si+1) + '단계');
        deadlineMap[sdStr].push({ title: sName + ' (단계)', project: p.name, status: 'stage', color: pColor });
      }
      (stage.subcategories || []).forEach(function(sub) {
        if (sub.endDate) {
          var scStr = sub.endDate.substring(0, 10);
          if (!deadlineMap[scStr]) deadlineMap[scStr] = [];
          deadlineMap[scStr].push({ title: sub.name + ' (중분류)', project: p.name, status: 'subcategory', color: pColor });
        }
        sub.tasks.forEach(function(task) {
          if (task.deadline && task.status !== 'completed') {
            var dateStr = task.deadline.substring(0, 10);
            if (!deadlineMap[dateStr]) deadlineMap[dateStr] = [];
            deadlineMap[dateStr].push({ title: task.title, project: p.name, status: task.status });
          }
        });
      });
    });
  });
  appState.tasks.filter(function(t) { return t.category === '본업' && !t.completed && t.deadline; }).forEach(function(t) {
    var dateStr = t.deadline.substring(0, 10);
    if (!deadlineMap[dateStr]) deadlineMap[dateStr] = [];
    deadlineMap[dateStr].push({ title: t.title, project: null, status: 'task' });
  });

  var daysHtml = '';
  var maxVisible = 3;
  for (var i = 0; i < startDow; i++) daysHtml += '<div class="calendar-day empty"></div>';
  for (var day = 1; day <= daysInMonth; day++) {
    var dateStr = viewYear + '-' + String(viewMonth + 1).padStart(2,'0') + '-' + String(day).padStart(2,'0');
    var tasks = deadlineMap[dateStr] || [];
    var isToday = dateStr === todayStr;
    var isSelected = dateStr === appState.workCalendarSelected;
    var classes = 'calendar-day' + (isToday ? ' today' : '') + (isSelected ? ' selected' : '') + (tasks.length > 0 ? ' has-activity' : '');
    daysHtml += '<div class="' + classes + '" onclick="selectWorkCalendarDate(&quot;' + dateStr + '&quot;)">';
    daysHtml += '<span class="calendar-day-number">' + day + '</span>';
    if (tasks.length > 0) {
      daysHtml += '<div class="calendar-day-tasks">';
      var visibleTasks = tasks.slice(0, maxVisible);
      for (var ti = 0; ti < visibleTasks.length; ti++) {
        var t = visibleTasks[ti];
        var taskColor = t.status === 'project' ? (t.color || 'var(--accent-primary)') : t.status === 'in-progress' ? 'var(--accent-primary)' : t.status === 'blocked' ? 'var(--accent-danger)' : 'var(--accent-success)';
        daysHtml += '<div class="calendar-day-task" style="background: color-mix(in srgb, ' + taskColor + ' 13%, transparent); border-left: 2px solid ' + taskColor + ';" title="' + escapeAttr(t.title) + (t.project ? ' (' + escapeAttr(t.project) + ')' : '') + '">' + escapeHtml(t.title) + '</div>';
      }
      if (tasks.length > maxVisible) {
        daysHtml += '<div class="calendar-day-more">+' + (tasks.length - maxVisible) + '개</div>';
      }
      daysHtml += '</div>';
    }
    daysHtml += '</div>';
  }

  var monthNames = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  var selectedTasks = appState.workCalendarSelected ? (deadlineMap[appState.workCalendarSelected] || []) : [];

  var calendarHtml = '<div class="calendar-container work-calendar">' +
    '<div class="calendar-header">' +
      '<div class="calendar-title">' + viewYear + '년 ' + monthNames[viewMonth] + '</div>' +
      '<div class="calendar-nav">' +
        '<button class="calendar-nav-btn" onclick="navigateWorkCalendar(-1)">◀</button>' +
        '<button class="calendar-nav-btn" onclick="navigateWorkCalendar(1)">▶</button>' +
      '</div>' +
    '</div>' +
    '<div class="calendar-weekdays"><div class="calendar-weekday">일</div><div class="calendar-weekday">월</div><div class="calendar-weekday">화</div><div class="calendar-weekday">수</div><div class="calendar-weekday">목</div><div class="calendar-weekday">금</div><div class="calendar-weekday">토</div></div>' +
    '<div class="calendar-days">' + daysHtml + '</div>' +
  '</div>';

  if (appState.workCalendarSelected && selectedTasks.length > 0) {
    calendarHtml += '<div style="margin-top: 16px; background: var(--bg-secondary); border-radius: 12px; padding: 16px;">' +
      '<div style="font-weight: 600; margin-bottom: 10px;">' + appState.workCalendarSelected + ' 마감 작업</div>';
    selectedTasks.forEach(function(t) {
      calendarHtml += '<div style="padding: 8px 12px; background: var(--bg-primary); border-radius: 8px; margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">' +
        '<span style="color: ' + (t.status === 'in-progress' ? 'var(--accent-primary)' : t.status === 'blocked' ? 'var(--accent-danger)' : t.status === 'project' ? (t.color || 'var(--accent-primary)') : 'var(--accent-neutral)') + ';">&#9679;</span>' +
        '<span style="flex:1;">' + escapeHtml(t.title) + '</span>' +
        (t.project ? '<span style="font-size: 15px; color: var(--text-muted);">' + escapeHtml(t.project) + '</span>' : '') +
      '</div>';
    });
    calendarHtml += '</div>';
  } else if (appState.workCalendarSelected && selectedTasks.length === 0) {
    calendarHtml += '<div style="margin-top: 16px; text-align: center; color: var(--text-muted); padding: 20px;">이 날짜에 마감인 작업이 없습니다</div>';
  }

  return scheduleHtml + calendarHtml;
}
