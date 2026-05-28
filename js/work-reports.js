// ============================================
// 본업 프로젝트 - MM 리포트 / Notion 진행상황 복사
// (work-data.js에서 분리)
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

/**
 * Generate proportion table for MM report (Notion-pasteable format).
 * @param {number} year
 * @param {number} month
 * @returns {string|null} proportion table text, or null if no data
 */
function generateMMProportionTable(year, month) {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDate = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDate}`;

  // Collect time per project
  const projectMinutes = {};
  appState.workProjects.forEach(project => {
    (project.stages || []).forEach(stage => {
      (stage.subcategories || []).forEach(sub => {
        (sub.tasks || []).forEach(task => {
          if (task.status === 'completed' && task.completedAt) {
            const completedDate = task.completedAt.slice(0, 10);
            if (completedDate >= startDate && completedDate <= endDate) {
              const name = project.name;
              if (!projectMinutes[name]) projectMinutes[name] = 0;
              projectMinutes[name] += (task.actualTime || task.estimatedTime || 30);
            }
          }
        });
      });
    });
  });

  const entries = Object.entries(projectMinutes);
  if (entries.length === 0) return null;

  const totalMinutes = entries.reduce((s, [, m]) => s + m, 0);
  if (totalMinutes === 0) return null;

  // Sort by proportion descending
  entries.sort((a, b) => b[1] - a[1]);

  let table = '프로젝트명 | 비율\n';
  entries.forEach(([name, minutes]) => {
    const ratio = (minutes / totalMinutes).toFixed(2);
    table += name + ' | ' + ratio + '\n';
  });

  return table.trim();
}

// ============================================
// Notion Progress Copy (진행상황 복사)
// ============================================

/**
 * Copy completed tasks from a subcategory in Notion-compatible format.
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
  menu.style.cssText = 'position: fixed; z-index: 9999; background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 4px; box-shadow: 0 4px 12px var(--shadow-color); display: flex; flex-direction: column; gap: 2px; min-width: 140px;';

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
