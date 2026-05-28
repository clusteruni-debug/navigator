// ============================================
// 수익 관련 함수
// ============================================

/**
 * 수익 통계 계산 (월별/카테고리별)
 */
function getRevenueStats() {
  // 월별 수익 (최근 6개월)
  const monthlyRevenue = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    monthlyRevenue[key] = { month: key, label: `${d.getMonth() + 1}월`, revenue: 0, count: 0 };
  }

  // 카테고리별 수익
  const categoryRevenue = { '부업': 0, '본업': 0, '일상': 0, '가족': 0 };

  // 총 수익
  let totalRevenue = 0;
  let thisMonthRevenue = 0;
  let taskCount = 0;
  const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 1) completionLog 기반 — 모든 과거+현재 완료 기록 포함
  const loggedDates = new Set();
  for (const [dateKey, entries] of Object.entries(appState.completionLog || {})) {
    if (!Array.isArray(entries)) continue;
    const monthKey = dateKey.slice(0, 7); // "YYYY-MM"

    entries.forEach(e => {
      if (e._summary) {
        // 압축된 데이터 — totalRevenue만 사용 (카테고리별 분배 불가)
        const rev = e.totalRevenue || 0;
        totalRevenue += rev;
        taskCount += e.count || 0;
        if (monthlyRevenue[monthKey]) {
          monthlyRevenue[monthKey].revenue += rev;
          monthlyRevenue[monthKey].count += e.count || 0;
        }
        if (monthKey === thisMonthKey) thisMonthRevenue += rev;
      } else {
        const rev = e.rv || 0;
        taskCount++;
        if (rev > 0) {
          totalRevenue += rev;
          if (monthlyRevenue[monthKey]) {
            monthlyRevenue[monthKey].revenue += rev;
            monthlyRevenue[monthKey].count++;
          }
          if (monthKey === thisMonthKey) thisMonthRevenue += rev;
          if (e.c && categoryRevenue.hasOwnProperty(e.c)) {
            categoryRevenue[e.c] += rev;
          }
        }
      }
    });
    loggedDates.add(dateKey);
  }

  // 2) appState.tasks 보완 — completionLog 도입 전 완료된 태스크
  appState.tasks.forEach(task => {
    if (!task.completed || !task.expectedRevenue) return;
    const revenue = parseInt(task.expectedRevenue) || 0;
    if (revenue <= 0) return;

    const completedDate = task.completedAt ? new Date(task.completedAt) : null;
    if (!completedDate) return; // completedAt 없으면 날짜 불명 → 이미 log에 있을 가능성 높음
    const dateKey = getLocalDateStr(completedDate);
    if (loggedDates.has(dateKey)) return; // 해당 날짜에 log가 있으면 이미 집계됨

    totalRevenue += revenue;
    taskCount++;
    const monthKey = `${completedDate.getFullYear()}-${String(completedDate.getMonth() + 1).padStart(2, '0')}`;
    if (monthlyRevenue[monthKey]) {
      monthlyRevenue[monthKey].revenue += revenue;
      monthlyRevenue[monthKey].count++;
    }
    if (monthKey === thisMonthKey) thisMonthRevenue += revenue;
    if (categoryRevenue.hasOwnProperty(task.category)) {
      categoryRevenue[task.category] += revenue;
    }
  });

  // 월별 데이터를 배열로 변환
  const monthlyData = Object.values(monthlyRevenue);
  const maxMonthlyRevenue = Math.max(...monthlyData.map(m => m.revenue), 1);

  // 카테고리별 데이터를 배열로 변환
  const categoryData = Object.entries(categoryRevenue)
    .filter(([_, v]) => v > 0)
    .map(([category, revenue]) => ({
      category,
      revenue,
      percentage: totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0
    }))
    .sort((a, b) => b.revenue - a.revenue);

  return {
    totalRevenue,
    thisMonthRevenue,
    monthlyData,
    maxMonthlyRevenue,
    categoryData,
    taskCount
  };
}

/**
 * 자산관리 앱으로 수익 내보내기
 * 완료된 부업 Task의 수익을 자산관리 transaction 형식으로 변환
 */
function exportToAssetManager() {
  const completedTasks = appState.tasks.filter(t =>
    t.completed &&
    t.expectedRevenue &&
    parseInt(t.expectedRevenue) > 0
  );

  if (completedTasks.length === 0) {
    showToast('내보낼 수익 데이터가 없습니다', 'warning');
    return;
  }

  // 자산관리 transaction 형식으로 변환
  const transactions = completedTasks.map(task => {
    const completedDate = task.completedAt ? new Date(task.completedAt) : new Date();
    return {
      type: 'income',
      category: task.category === '부업' ? '에어드랍' : (task.category === '본업' ? '급여' : '기타수입'),
      amount: parseInt(task.expectedRevenue),
      title: task.title,
      description: `[Navigator] ${task.category} - ${task.title}`,
      date: getLocalDateStr(completedDate),
      tags: ['navigator', task.category.toLowerCase()],
      source: 'navigator'
    };
  });

  // JSON으로 변환
  const exportData = {
    source: 'navigator',
    exportedAt: new Date().toISOString(),
    summary: {
      totalRevenue: transactions.reduce((sum, t) => sum + t.amount, 0),
      taskCount: transactions.length
    },
    transactions: transactions
  };

  // 클립보드에 복사
  const jsonStr = JSON.stringify(exportData, null, 2);

  navigator.clipboard.writeText(jsonStr).then(() => {
    showToast(`${transactions.length}개 수익 데이터가 클립보드에 복사되었습니다.\n자산관리 앱에서 가져오기 해주세요.`, 'success');
  }).catch(() => {
    // 클립보드 접근 실패 시 다운로드 제공
    downloadAssetExport(exportData);
  });
}

/**
 * 수익 데이터 JSON 다운로드
 */
function downloadAssetExport(data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `navigator-revenue-${getLocalDateStr()}.json`;
  document.body.appendChild(a);
  try { a.click(); } finally {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  showToast('수익 데이터 파일이 다운로드되었습니다', 'success');
}

// 전역 함수로 노출
window.exportToAssetManager = exportToAssetManager;
