/**
 * 복약/영양제 트래커 모듈
 * rhythm.js에서 분리 — 복약 슬롯 관리, 기록, 수정, 삭제, 연속일 계산
 *
 * 의존성 (메인 HTML / rhythm.js에서 제공):
 *   appState, renderStatic, showToast, escapeAttr,
 *   getLogicalDate, generateId,
 *   markFieldDeleted, unmarkFieldDeleted,
 *   transitionRhythmDay, saveLifeRhythm, hideRhythmActionMenu
 */

// ============================================
// 복약/영양제 트래커
// ============================================

/**
 * 복약 슬롯 설정 가져오기 (기본값 포함)
 */
function getMedicationSlots() {
  return (appState.lifeRhythm.settings && appState.lifeRhythm.settings.medicationSlots) || [
    { id: 'med_morning', label: 'ADHD약(아침)', icon: '\u{1F48A}', required: true },
    { id: 'med_afternoon_adhd', label: 'ADHD약(점심)', icon: '\u{1F48A}', required: true },
    { id: 'med_morning_nutrient', label: '영양제(아침)', icon: '\u{1F33F}', required: false },
    { id: 'med_afternoon_nutrient', label: '영양제(점심)', icon: '\u{1F33F}', required: false },
    { id: 'med_evening', label: '영양제(저녁)', icon: '\u{1F33F}', required: false }
  ];
}

function _getActionMedicationRecords(todayRhythm) {
  var records = Object.assign({}, (todayRhythm && todayRhythm.medications) || {});
  var compactMedication = todayRhythm && todayRhythm.medication;

  if (Array.isArray(compactMedication)) {
    compactMedication.forEach(function(item) {
      if (!item) return;
      var id = item.slotId || item.id || item.key;
      if (!id) return;
      records[id] = item.time || item.takenAt || item.value || item.taken || records[id] || null;
    });
  } else if (compactMedication && typeof compactMedication === 'object') {
    Object.keys(compactMedication).forEach(function(key) {
      records[key] = compactMedication[key];
    });
  }

  return records;
}

function _takeActionMedicationSlots(slots, required, limit) {
  return slots.filter(function(slot) { return !!slot.required === required; }).slice(0, limit);
}

function _renderActionMedicationSlot(slot, todayMeds, requiredGroup) {
  var taken = !!todayMeds[slot.id];
  var timeVal = todayMeds[slot.id];
  var timeText = taken && typeof timeVal === 'string' ? timeVal : (taken ? '완료' : '--:--');
  var shortLabel = (typeof _getMedicationSlotShortLabel === 'function')
    ? _getMedicationSlotShortLabel(slot)
    : String(slot.label || slot.id);

  return '' +
    '<button class="med-compact-slot ' + (taken ? 'taken ' : '') + (requiredGroup ? 'required' : 'optional') + '"' +
      ' type="button" onclick="handleMedicationClick(\'' + escapeAttr(slot.id) + '\', ' + taken + ', event)"' +
      ' aria-label="' + escapeAttr(slot.label || shortLabel) + (taken ? ' 기록됨' : ' 기록') + '">' +
      '<span class="med-compact-slot-main">' +
        (taken && typeof _renderActionIcon === 'function' ? _renderActionIcon('check', 14) : '') +
        '<span class="med-compact-slot-label">' + escapeHtml(shortLabel) + '</span>' +
      '</span>' +
      '<span class="med-compact-slot-time">' + escapeHtml(timeText) + '</span>' +
    '</button>';
}

function _renderActionMedicationRow(label, iconName, slots, todayMeds, requiredGroup) {
  var slotsClass = slots.length >= 3 ? 'med-compact-slots med-compact-slots-3col' : 'med-compact-slots';
  var icon = typeof _renderActionIcon === 'function' ? _renderActionIcon(iconName, 14) : '';
  return '' +
    '<div class="med-compact-row ' + (requiredGroup ? 'med-compact-adhd' : 'med-compact-vitamin') + '">' +
      '<span class="med-compact-group-label">' +
        icon +
        '<span>' + escapeHtml(label) + '</span>' +
        (requiredGroup ? '<span class="med-compact-tag">필수</span>' : '') +
      '</span>' +
      '<div class="' + slotsClass + '">' +
        slots.map(function(slot) { return _renderActionMedicationSlot(slot, todayMeds, requiredGroup); }).join('') +
      '</div>' +
    '</div>';
}

function renderActionMedicationCompact() {
  var allSlots = getMedicationSlots();
  if (!allSlots || allSlots.length === 0) return '';

  var todayStr = getLogicalDate();
  var lifeRhythm = appState.lifeRhythm || {};
  var todayBlock = lifeRhythm.today || {};
  var todayRhythm = (todayBlock.date === todayStr) ? todayBlock : {};
  var todayMeds = _getActionMedicationRecords(todayRhythm);
  var adhdSlots = _takeActionMedicationSlots(allSlots, true, 2);
  var vitaminSlots = _takeActionMedicationSlots(allSlots, false, 3);
  var compactSlots = adhdSlots.concat(vitaminSlots);
  var takenCount = compactSlots.filter(function(slot) { return !!todayMeds[slot.id]; }).length;
  var totalCount = compactSlots.length;

  if (totalCount === 0) return '';

  return '' +
    '<div class="med-compact-section">' +
      _renderActionSectionTitle('약 복용', takenCount + ' / ' + totalCount) +
      _renderActionMedicationRow('ADHD 약', 'pill', adhdSlots, todayMeds, true) +
      _renderActionMedicationRow('영양제', 'smile', vitaminSlots, todayMeds, false) +
      '<div class="med-compact-link-row">' +
        '<button type="button" class="med-compact-link" onclick="switchTab(\'life\')">일상 탭 → 약 복용 전체 관리 →</button>' +
      '</div>' +
    '</div>';
}
window.renderActionMedicationCompact = renderActionMedicationCompact;

/**
 * 복약 기록 (현재 시간)
 */
function recordMedication(slotId) {
  var now = new Date();
  var today = getLogicalDate(now);
  var timeStr = now.toTimeString().slice(0, 5);

  transitionRhythmDay(appState.lifeRhythm, today);

  if (!appState.lifeRhythm.today.medications) {
    appState.lifeRhythm.today.medications = {};
  }
  appState.lifeRhythm.today.medications[slotId] = timeStr;
  unmarkFieldDeleted(appState.lifeRhythm.today, slotId);

  saveLifeRhythm();
  renderStatic();

  var slots = getMedicationSlots();
  var slot = slots.find(function(s) { return s.id === slotId; });
  var label = slot ? slot.label : slotId;
  showToast(label + ' 복용 기록: ' + timeStr, 'success');

  if (navigator.vibrate) navigator.vibrate(30);
}
window.recordMedication = recordMedication;

/**
 * 복약 시간 수정 (직접 입력)
 */
function editMedication(slotId) {
  var today = getLogicalDate();
  var currentValue = (appState.lifeRhythm.today.date === today && appState.lifeRhythm.today.medications)
    ? appState.lifeRhythm.today.medications[slotId] : null;

  var slots = getMedicationSlots();
  var slot = slots.find(function(s) { return s.id === slotId; });
  var label = slot ? slot.label : slotId;

  var newTime = prompt(label + ' 복용 시간을 입력하세요 (HH:MM):', currentValue || '');
  if (newTime === null) return;

  if (newTime && !/^\d{1,2}:\d{2}$/.test(newTime)) {
    showToast('올바른 시간 형식이 아닙니다 (예: 08:30)', 'error');
    return;
  }

  transitionRhythmDay(appState.lifeRhythm, today);

  if (!appState.lifeRhythm.today.medications) {
    appState.lifeRhythm.today.medications = {};
  }

  if (!newTime) {
    appState.lifeRhythm.today.medications[slotId] = null;
    markFieldDeleted(appState.lifeRhythm.today, slotId);
  } else {
    var parts = newTime.split(':');
    appState.lifeRhythm.today.medications[slotId] = parts[0].padStart(2, '0') + ':' + parts[1];
    unmarkFieldDeleted(appState.lifeRhythm.today, slotId);
  }

  saveLifeRhythm();
  renderStatic();
  showToast(label + ' 복용 시간이 수정되었습니다', 'success');
}
window.editMedication = editMedication;

/**
 * 복약 기록 삭제
 */
function deleteMedication(slotId) {
  var today = getLogicalDate();
  if (appState.lifeRhythm.today.date === today && appState.lifeRhythm.today.medications) {
    appState.lifeRhythm.today.medications[slotId] = null;
    markFieldDeleted(appState.lifeRhythm.today, slotId);
    saveLifeRhythm();
    renderStatic();

    var slots = getMedicationSlots();
    var slot = slots.find(function(s) { return s.id === slotId; });
    showToast((slot ? slot.label : '복약') + ' 기록이 삭제되었습니다', 'success');
  }
}
window.deleteMedication = deleteMedication;

/**
 * 복약 버튼 클릭 핸들러
 * - 기록 없으면: 현재 시간 기록
 * - 기록 있으면: 수정/삭제 메뉴
 */
function handleMedicationClick(slotId, hasRecord, event) {
  if (hasRecord) {
    showMedicationActionMenu(slotId, event);
  } else {
    recordMedication(slotId);
  }
}
window.handleMedicationClick = handleMedicationClick;

/**
 * 복약 액션 메뉴 표시 (수정/삭제)
 * 기존 rhythm-action-menu 패턴 재사용
 */
function showMedicationActionMenu(slotId, event) {
  hideRhythmActionMenu(); // 기존 메뉴 닫기

  var overlay = document.createElement('div');
  overlay.className = 'rhythm-action-menu-overlay';
  overlay.onclick = hideRhythmActionMenu;

  var menu = document.createElement('div');
  menu.className = 'rhythm-action-menu';
  menu.id = 'rhythm-action-menu';
  menu.innerHTML = '<button onclick="hideRhythmActionMenu(); editMedication(\'' + escapeAttr(slotId) + '\')">' + svgIcon('edit', 14) + ' 시간 수정</button>' +
    '<button class="danger" onclick="hideRhythmActionMenu(); deleteMedication(\'' + escapeAttr(slotId) + '\')">' + svgIcon('trash', 14) + ' 기록 삭제</button>';

  document.body.appendChild(overlay);
  document.body.appendChild(menu);

  var btn = event.currentTarget;
  var rect = btn.getBoundingClientRect();
  var menuHeight = 96;
  var menuWidth = 140;

  var top = rect.bottom + 4;
  if (top + menuHeight > window.innerHeight) {
    top = rect.top - menuHeight - 4;
  }

  var left = rect.left + rect.width / 2 - menuWidth / 2;
  if (left < 8) left = 8;
  if (left + menuWidth > window.innerWidth - 8) left = window.innerWidth - 8 - menuWidth;

  menu.style.top = top + 'px';
  menu.style.left = left + 'px';
}
window.showMedicationActionMenu = showMedicationActionMenu;

/**
 * 복약 슬롯 추가 (설정)
 */
function addMedicationSlot() {
  var label = prompt('복약/영양제 이름:', '');
  if (!label) return;

  var icon = prompt('레거시 아이콘 값 (선택):', '') || '\u{1F48A}';
  var required = confirm('필수 복약인가요? (확인=필수, 취소=선택)');

  if (!appState.lifeRhythm.settings) appState.lifeRhythm.settings = {};
  if (!appState.lifeRhythm.settings.medicationSlots) {
    appState.lifeRhythm.settings.medicationSlots = getMedicationSlots();
  }

  var id = 'med_' + generateId();
  appState.lifeRhythm.settings.medicationSlots.push({ id: id, label: label, icon: icon, required: required });

  saveLifeRhythm();
  renderStatic();
  showToast('복약 슬롯이 추가되었습니다: ' + label, 'success');
}
window.addMedicationSlot = addMedicationSlot;

/**
 * 복약 슬롯 편집 (설정)
 */
function editMedicationSlot(idx) {
  if (!appState.lifeRhythm.settings) appState.lifeRhythm.settings = {};
  if (!appState.lifeRhythm.settings.medicationSlots) {
    appState.lifeRhythm.settings.medicationSlots = getMedicationSlots();
  }

  var slots = appState.lifeRhythm.settings.medicationSlots;
  if (idx < 0 || idx >= slots.length) return;

  var slot = slots[idx];
  var newLabel = prompt('복약/영양제 이름:', slot.label);
  if (newLabel === null) return;
  if (!newLabel) { showToast('이름은 비워둘 수 없습니다', 'error'); return; }

  var newIcon = prompt('레거시 아이콘 값 (선택):', '');
  if (newIcon === null) newIcon = slot.icon;
  if (!newIcon) newIcon = slot.icon || '\u{1F48A}';
  var newRequired = confirm('필수 복약인가요? (확인=필수, 취소=선택)');

  slot.label = newLabel;
  slot.icon = newIcon;
  slot.required = newRequired;

  saveLifeRhythm();
  renderStatic();
  showToast('복약 슬롯이 수정되었습니다', 'success');
}
window.editMedicationSlot = editMedicationSlot;

/**
 * 복약 슬롯 삭제 (설정)
 */
function deleteMedicationSlot(idx) {
  if (!appState.lifeRhythm.settings) appState.lifeRhythm.settings = {};
  if (!appState.lifeRhythm.settings.medicationSlots) {
    appState.lifeRhythm.settings.medicationSlots = getMedicationSlots().slice();
  }

  var slots = appState.lifeRhythm.settings.medicationSlots;
  if (idx < 0 || idx >= slots.length) return;

  var slot = slots[idx];
  if (!confirm(slot.label + ' 슬롯을 삭제하시겠습니까?\n(기존 기록은 유지됩니다)')) return;

  slots.splice(idx, 1);

  saveLifeRhythm();
  renderStatic();
  showToast('복약 슬롯이 삭제되었습니다', 'success');
}
window.deleteMedicationSlot = deleteMedicationSlot;

/**
 * 필수 복약 연속일 계산
 * 필수(required) 슬롯을 모두 복용한 날이 연속으로 며칠인지 계산
 */
function getMedicationStreak() {
  var slots = getMedicationSlots();
  var requiredSlots = slots.filter(function(s) { return s.required; });
  if (requiredSlots.length === 0) return 0;

  var streak = 0;
  var today = new Date();
  var todayStr = getLogicalDate();

  // 오늘부터 역순으로 확인
  for (var i = 0; i < 365; i++) {
    var date = new Date(today);
    date.setDate(today.getDate() - i);
    var dateStr = getLocalDateStr(date);

    var dayMeds;
    var lifeRhythm = appState.lifeRhythm || {};
    var todayBlock = lifeRhythm.today || {};
    var historyMap = lifeRhythm.history || {};
    if (dateStr === todayStr && todayBlock.date === todayStr) {
      dayMeds = todayBlock.medications || {};
    } else {
      var histEntry = historyMap[dateStr];
      dayMeds = histEntry ? (histEntry.medications || {}) : {};
    }

    // 필수 슬롯 모두 복용했는지 확인
    var allTaken = requiredSlots.every(function(s) { return dayMeds[s.id]; });
    if (allTaken) {
      streak++;
    } else {
      // 오늘은 아직 복용 안 했을 수 있으므로 스킵
      if (i === 0) continue;
      break;
    }
  }

  return streak;
}
