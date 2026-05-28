// ============================================
// Cmd/Ctrl+K 커맨드 팔레트
// ============================================

(function() {
  let paletteEl = null;
  let selectedIdx = 0;
  let filteredCommands = [];

  const commands = [
    { id: 'tab-action', label: '오늘', desc: '오늘 할 일 보기', icon: '🎯', action: () => { switchTab('action'); } },
    { id: 'tab-all', label: '할일', desc: '전체 작업 목록', icon: '📋', action: () => { switchTab('all'); } },
    { id: 'tab-work', label: '본업', desc: '본업 프로젝트', icon: '💼', action: () => { switchTab('work'); } },
    { id: 'tab-events', label: '이벤트', desc: '부업 이벤트', icon: '💰', action: () => { switchTab('events'); } },
    { id: 'tab-life', label: '일상', desc: '일상/가족', icon: '🏠', action: () => { switchTab('life'); } },
    { id: 'tab-commute', label: '통근', desc: '통근 트래커', icon: '🚌', action: () => { switchTab('commute'); } },
    { id: 'tab-dashboard', label: '통계', desc: '대시보드', icon: '📊', action: () => { switchTab('dashboard'); } },
    { id: 'tab-history', label: '히스토리', desc: '활동 기록', icon: '📅', action: () => { switchTab('history'); } },
    { id: 'sep-1', separator: true },
    { id: 'add-task', label: '새 작업 추가', desc: '빠른 추가 입력', icon: '➕', action: () => { switchTab('action'); setTimeout(() => { const input = document.getElementById('quick-add-input'); if (input) input.focus(); }, 100); } },
    { id: 'toggle-theme', label: '테마 전환', desc: () => appState.theme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환', icon: () => appState.theme === 'dark' ? '☀️' : '🌙', action: () => { toggleTheme(); } },
    { id: 'toggle-focus', label: '포커스 모드', desc: () => appState.focusMode ? '포커스 모드 끄기' : '하나만 집중하기', icon: '🎯', action: () => { toggleFocusMode(); } },
    { id: 'open-settings', label: '설정', desc: '앱 설정 열기', icon: '⚙️', action: () => { openSettings(); } },
    { id: 'sep-2', separator: true },
    { id: 'search-tasks', label: '작업 검색', desc: '할일 탭에서 검색', icon: '🔍', action: () => { switchTab('all'); setTimeout(() => { const input = document.querySelector('.search-input'); if (input) input.focus(); }, 100); } },
    { id: 'export-data', label: '데이터 내보내기', desc: 'JSON 백업', icon: '📤', action: () => { exportData(); } },
  ];

  function getCommandLabel(cmd, field) {
    const val = cmd[field];
    return typeof val === 'function' ? val() : val;
  }

  function openPalette() {
    if (paletteEl) return;

    selectedIdx = 0;
    filteredCommands = commands.filter(c => !c.separator);

    const backdrop = document.createElement('div');
    backdrop.className = 'cmd-palette-backdrop';
    backdrop.onclick = closePalette;

    const palette = document.createElement('div');
    palette.className = 'cmd-palette';
    palette.innerHTML = `
      <div class="cmd-palette-input-wrap">
        <span class="cmd-palette-icon">🔍</span>
        <input class="cmd-palette-input" type="text" placeholder="명령어 검색..." autocomplete="off" spellcheck="false">
        <kbd class="cmd-palette-esc">ESC</kbd>
      </div>
      <div class="cmd-palette-list"></div>
    `;

    backdrop.appendChild(palette);
    document.body.appendChild(backdrop);
    paletteEl = backdrop;

    const input = palette.querySelector('.cmd-palette-input');
    input.focus();

    input.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase().trim();
      filterCommands(q);
    });

    input.addEventListener('keydown', handleKeydown);

    renderList();
  }

  function closePalette() {
    if (paletteEl) {
      paletteEl.remove();
      paletteEl = null;
    }
  }

  function filterCommands(query) {
    if (!query) {
      filteredCommands = commands.filter(c => !c.separator);
    } else {
      filteredCommands = commands.filter(c => {
        if (c.separator) return false;
        const label = getCommandLabel(c, 'label').toLowerCase();
        const desc = getCommandLabel(c, 'desc').toLowerCase();
        return label.includes(query) || desc.includes(query);
      });
    }
    selectedIdx = 0;
    renderList();
  }

  function renderList() {
    if (!paletteEl) return;
    const listEl = paletteEl.querySelector('.cmd-palette-list');

    if (filteredCommands.length === 0) {
      listEl.innerHTML = '<div class="cmd-palette-empty">일치하는 명령이 없습니다</div>';
      return;
    }

    listEl.innerHTML = filteredCommands.map((cmd, i) => `
      <div class="cmd-palette-item ${i === selectedIdx ? 'selected' : ''}"
           data-idx="${i}"
           onmouseenter="this.parentNode.querySelectorAll('.cmd-palette-item').forEach(el=>el.classList.remove('selected'));this.classList.add('selected');"
           onclick="document.dispatchEvent(new CustomEvent('cmd-palette-exec', {detail: ${i}}))">
        <span class="cmd-palette-item-icon">${getCommandLabel(cmd, 'icon')}</span>
        <div class="cmd-palette-item-text">
          <span class="cmd-palette-item-label">${getCommandLabel(cmd, 'label')}</span>
          <span class="cmd-palette-item-desc">${getCommandLabel(cmd, 'desc')}</span>
        </div>
      </div>
    `).join('');
  }

  function handleKeydown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closePalette();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIdx = (selectedIdx + 1) % filteredCommands.length;
      renderList();
      scrollToSelected();
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIdx = (selectedIdx - 1 + filteredCommands.length) % filteredCommands.length;
      renderList();
      scrollToSelected();
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      executeSelected();
      return;
    }
  }

  function scrollToSelected() {
    if (!paletteEl) return;
    const selected = paletteEl.querySelector('.cmd-palette-item.selected');
    if (selected) selected.scrollIntoView({ block: 'nearest' });
  }

  function executeSelected() {
    if (filteredCommands.length === 0) return;
    const cmd = filteredCommands[selectedIdx];
    closePalette();
    if (cmd && cmd.action) cmd.action();
  }

  // Global keyboard shortcut
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (paletteEl) {
        closePalette();
      } else {
        openPalette();
      }
    }
  });

  // Click execution from inline handler
  document.addEventListener('cmd-palette-exec', (e) => {
    selectedIdx = e.detail;
    executeSelected();
  });
})();
