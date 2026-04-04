// ============================================
// 본업 프로젝트 - MM Report 모달
// (work-modal.js에서 분리)
// ============================================

/**
 * Show MM (Monthly Report) modal with month selector and generated report.
 */
function showMMReportModal() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12

  const modal = document.getElementById('work-input-modal');
  const title = document.getElementById('work-modal-title');
  const body = document.getElementById('work-modal-body');

  workModalState = { type: 'mm-report', projectId: null, stageIdx: null, subcategoryIdx: null, taskIdx: null };

  title.textContent = '📊 MM 리포트';

  body.innerHTML = `
    <div class="work-modal-field">
      <label class="work-modal-label">리포트 기간</label>
      <input type="month" class="work-modal-input" id="mm-report-month" value="${year}-${String(month).padStart(2, '0')}">
    </div>
    <div id="mm-report-output" style="margin-top: 12px;">
      <div style="text-align: center; color: var(--text-muted); padding: 20px;">
        리포트를 생성하려면 아래 "생성" 버튼을 누르세요
      </div>
    </div>
    <div style="display: flex; gap: 8px; margin-top: 12px;">
      <button type="button" class="work-project-action-btn" onclick="renderMMReport()" style="flex: 1; padding: 10px; font-size: 14px; font-weight: 600; background: var(--accent-blue); color: white; border-radius: 8px; border: none; cursor: pointer;">📊 생성</button>
      <button type="button" class="work-project-action-btn" id="mm-report-copy-btn" onclick="copyMMReport()" style="flex: 1; padding: 10px; font-size: 14px; font-weight: 600; background: var(--bg-tertiary); color: var(--text-secondary); border-radius: 8px; border: none; cursor: pointer; display: none;">📋 클립보드 복사</button>
    </div>
  `;

  // Override the confirm button to act as close
  const actions = modal.querySelector('.work-modal-actions');
  if (actions) {
    actions.innerHTML = `
      <button class="cancel" onclick="closeWorkModal()">닫기</button>
    `;
  }

  modal.classList.add('show');

  // Auto-generate for current month
  setTimeout(() => renderMMReport(), 100);
}
window.showMMReportModal = showMMReportModal;

/**
 * Render the MM report text into the modal output area.
 */
function renderMMReport() {
  const monthInput = document.getElementById('mm-report-month');
  if (!monthInput) return;

  const [yearStr, monthStr] = monthInput.value.split('-');
  const year = parseInt(yearStr);
  const month = parseInt(monthStr);

  const report = generateMMReport(year, month);
  const output = document.getElementById('mm-report-output');
  const copyBtn = document.getElementById('mm-report-copy-btn');

  if (!report) {
    output.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 20px; background: var(--bg-secondary); border-radius: 8px;">
        📭 ${year}년 ${month}월 기록이 없습니다
      </div>
    `;
    if (copyBtn) copyBtn.style.display = 'none';
    return;
  }

  // Generate proportion table
  const proportionTable = generateMMProportionTable(year, month);

  let proportionHtml = '';
  if (proportionTable) {
    proportionHtml = `
      <div style="margin-top: 12px;">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
          <span style="font-size: 14px; font-weight: 600; color: var(--text-secondary);">📊 비율 테이블</span>
          <button type="button" onclick="copyMMProportionTable()" style="padding: 6px 12px; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: 6px; color: var(--text-primary); font-size: 13px; cursor: pointer;">📋 비율 복사</button>
        </div>
        <pre style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; font-family: 'Pretendard', -apple-system, sans-serif;" id="mm-proportion-text">${escapeHtml(proportionTable)}</pre>
      </div>
    `;
  }

  output.innerHTML = `
    <pre style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: 8px; padding: 14px; font-size: 14px; line-height: 1.6; white-space: pre-wrap; word-break: break-word; max-height: 400px; overflow-y: auto; font-family: 'Pretendard', -apple-system, sans-serif;" id="mm-report-text">${escapeHtml(report)}</pre>
    ${proportionHtml}
  `;
  if (copyBtn) copyBtn.style.display = 'block';
}
window.renderMMReport = renderMMReport;

/**
 * Copy the generated MM report to clipboard.
 */
function copyMMReport() {
  const reportEl = document.getElementById('mm-report-text');
  if (!reportEl) return;

  const text = reportEl.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('MM 리포트 클립보드에 복사됨', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('MM 리포트 클립보드에 복사됨', 'success');
  });
}
window.copyMMReport = copyMMReport;

/**
 * Copy MM proportion table to clipboard (Notion-pasteable format).
 */
function copyMMProportionTable() {
  const el = document.getElementById('mm-proportion-text');
  if (!el) return;

  const text = el.textContent;
  navigator.clipboard.writeText(text).then(() => {
    showToast('비율 테이블 클립보드에 복사됨', 'success');
  }).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('비율 테이블 클립보드에 복사됨', 'success');
  });
}
window.copyMMProportionTable = copyMMProportionTable;
