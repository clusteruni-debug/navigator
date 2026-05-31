// ============================================
// 렌더링 - 설정 모달 + 온보딩 모달 렌더링 (상태 로직은 ui-onboarding.js)
// ============================================

/**
 * 온보딩 모달 HTML을 반환한다.
 */
function renderOnboardingModal() {
  if (!appState.showOnboarding) return '';
  return `
        <div class="modal-overlay" onclick="completeOnboarding(false)">
          <div class="modal onboarding-modal" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h2>👋 Navigator에 오신 것을 환영합니다!</h2>
            </div>
            <div class="modal-body">
              <div class="onboarding-feature">
                <span class="onboarding-icon">🎯</span>
                <div>
                  <strong>자동 우선순위</strong>
                  <p>마감일, 카테고리를 기반으로 가장 중요한 작업을 자동 정렬</p>
                </div>
              </div>
              <div class="onboarding-feature">
                <span class="onboarding-icon">🏷️</span>
                <div>
                  <strong>태그 & 서브태스크</strong>
                  <p>유연한 분류와 큰 작업의 단계별 분해</p>
                </div>
              </div>
              <div class="onboarding-feature">
                <span class="onboarding-icon">🔥</span>
                <div>
                  <strong>연속 달성 스트릭</strong>
                  <p>매일 작업 완료 시 스트릭 증가! 동기부여 UP</p>
                </div>
              </div>
              <div class="onboarding-feature">
                <span class="onboarding-icon">🎯</span>
                <div>
                  <strong>포커스 모드</strong>
                  <p>ADHD 친화적! 가장 중요한 작업 1개만 표시</p>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-primary" onclick="completeOnboarding(true)">
                🚀 샘플 작업으로 시작하기
              </button>
              <button class="btn btn-secondary" onclick="completeOnboarding(false)">
                빈 상태로 시작하기
              </button>
            </div>
          </div>
        </div>
      `;
}

/**
 * 설정 모달 HTML을 반환한다.
 */
function renderSettingsModal() {
  if (!appState.showSettings) return '';
  return `
        <div class="modal-overlay" onclick="closeSettings()">
          <div class="modal settings-modal" onclick="event.stopPropagation()">
            <div class="modal-header">
              <h2>⚙️ 설정</h2>
            </div>
            <div class="modal-body">
              <!-- 클라우드 동기화 섹션 -->
              <div class="settings-section">
                <div class="settings-section-title">☁️ 클라우드 동기화</div>
                ${appState.user ? `
                  <div class="user-section">
                    <img class="user-avatar" src="${appState.user.photoURL ? escapeAttr(appState.user.photoURL) : 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23667eea%22 width=%22100%22 height=%22100%22 rx=%2250%22/><text x=%2250%22 y=%2265%22 font-size=%2250%22 text-anchor=%22middle%22 fill=%22white%22>👤</text></svg>'}" alt="프로필">
                    <div class="user-info">
                      <div class="user-name">${escapeHtml(appState.user.displayName || '사용자')}</div>
                      <div class="user-email">${escapeHtml(appState.user.email || '')}</div>
                      <div id="sync-indicator" class="sync-status ${appState.syncStatus}">
                        <span class="sync-icon">${appState.syncStatus === 'syncing' ? '🔄' : appState.syncStatus === 'synced' ? '✅' : appState.syncStatus === 'error' ? '⚠️' : '☁️'}</span>
                        ${appState.syncStatus === 'syncing' ? '동기화 중...' : appState.syncStatus === 'synced' ? '동기화됨' : appState.syncStatus === 'error' ? '동기화 오류' : '대기 중'}
                      </div>
                    </div>
                    <button class="logout-btn" onclick="logout()">로그아웃</button>
                  </div>
                  <div style="display: flex; gap: 8px; margin-top: 8px;">
                    <button onclick="forceSync()" style="flex: 1; padding: 10px; background: var(--primary); color: white; border: none; border-radius: 8px; font-size: 15px; cursor: pointer; font-weight: 500;">
                      🔄 동기화 갱신
                    </button>
                  </div>
                  <div style="font-size: 14px; color: var(--text-secondary); text-align: center; margin-top: 8px;">
                    다른 기기에서 같은 계정으로 로그인하면 자동 동기화됩니다
                  </div>
                ` : `
                  <div style="text-align: center; padding: 10px 0;">
                    <p style="font-size: 15px; color: var(--text-secondary); margin-bottom: 15px;">
                      Google 계정으로 로그인하면<br>여러 기기에서 동기화할 수 있어요
                    </p>
                    <button class="login-btn" onclick="loginWithGoogle()">
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google">
                      Google로 로그인
                    </button>
                  </div>
                `}
              </div>

              <div class="settings-section">
                <div class="settings-section-title">⏰ 시간 설정</div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🌅</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">목표 기상 시간</span>
                      <span class="settings-label-desc">출근 준비 시작 시간</span>
                    </div>
                  </div>
                  <input
                    type="time"
                    class="settings-input"
                    value="${appState.settings.targetWakeTime || '07:00'}"
                    onchange="updateSetting('targetWakeTime', this.value)"
                  >
                </div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🔄</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">하루 시작 시각</span>
                      <span class="settings-label-desc">이 시각 이후 반복 태스크 리셋</span>
                    </div>
                  </div>
                  <select
                    class="settings-input"
                    value="${appState.settings.dayStartHour || 5}"
                    onchange="updateSetting('dayStartHour', parseInt(this.value))"
                  >
                    <option value="3" ${appState.settings.dayStartHour === 3 ? 'selected' : ''}>03:00</option>
                    <option value="4" ${appState.settings.dayStartHour === 4 ? 'selected' : ''}>04:00</option>
                    <option value="5" ${(appState.settings.dayStartHour || 5) === 5 ? 'selected' : ''}>05:00</option>
                    <option value="6" ${appState.settings.dayStartHour === 6 ? 'selected' : ''}>06:00</option>
                    <option value="7" ${appState.settings.dayStartHour === 7 ? 'selected' : ''}>07:00</option>
                  </select>
                </div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🏢</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">출근 시간</span>
                      <span class="settings-label-desc">회사 모드 시작</span>
                    </div>
                  </div>
                  <input
                    type="time"
                    class="settings-input"
                    value="${appState.settings.workStartTime || '11:00'}"
                    onchange="updateSetting('workStartTime', this.value)"
                  >
                </div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🚶</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">퇴근 시간</span>
                      <span class="settings-label-desc">회사 모드 종료</span>
                    </div>
                  </div>
                  <input
                    type="time"
                    class="settings-input"
                    value="${appState.settings.workEndTime || '20:00'}"
                    onchange="updateSetting('workEndTime', this.value)"
                  >
                </div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">📊</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">하루 가용 시간</span>
                      <span class="settings-label-desc">본업 부하 게이지 계산 기준</span>
                    </div>
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <input
                      type="number"
                      class="settings-input"
                      style="width: 70px;"
                      value="${Math.round((appState.settings.dailyAvailableMinutes || 360) / 60)}"
                      min="1" max="12"
                      onchange="updateSetting('dailyAvailableMinutes', parseInt(this.value) * 60 || 360)"
                    >
                    <span style="font-size: 14px; color: var(--text-muted);">시간</span>
                  </div>
                </div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🌙</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">목표 취침 시간</span>
                      <span class="settings-label-desc">이 시간 전에 잠자리에</span>
                    </div>
                  </div>
                  <input
                    type="time"
                    class="settings-input"
                    value="${appState.settings.targetBedtime || '23:00'}"
                    onchange="updateSetting('targetBedtime', this.value)"
                  >
                </div>

                <!-- 타임라인 미리보기 -->
                <div class="settings-time-preview">
                  <div class="settings-time-preview-title">📅 하루 일정 미리보기</div>
                  <div class="settings-time-preview-timeline">
                    <div class="timeline-item">
                      <span class="timeline-icon">🌅</span>
                      <span class="timeline-time">${appState.settings.targetWakeTime || '07:00'}</span>
                    </div>
                    <span class="timeline-arrow">→</span>
                    <div class="timeline-item">
                      <span class="timeline-icon">🏢</span>
                      <span class="timeline-time">${appState.settings.workStartTime || '11:00'}</span>
                    </div>
                    <span class="timeline-arrow">→</span>
                    <div class="timeline-item">
                      <span class="timeline-icon">🚶</span>
                      <span class="timeline-time">${appState.settings.workEndTime || '20:00'}</span>
                    </div>
                    <span class="timeline-arrow">→</span>
                    <div class="timeline-item">
                      <span class="timeline-icon">🌙</span>
                      <span class="timeline-time">${appState.settings.targetBedtime || '23:00'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="settings-section">
                <div class="settings-section-title">💊 복약/영양제 설정</div>

                <div style="margin-bottom: 12px;">
                  ${(() => {
                    const medSlots = getMedicationSlots();
                    return medSlots.map((slot, idx) => `
                      <div class="settings-row" style="padding: 10px 0; border-bottom: 1px solid var(--border-color);">
                        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                          <span style="font-size: 18px;">${slot.icon}</span>
                          <div style="flex: 1;">
                            <div style="font-size: 16px; font-weight: 500;">${escapeHtml(slot.label)}</div>
                            <div style="font-size: 15px; color: var(--text-muted);">${slot.required ? '필수' : '선택'}</div>
                          </div>
                        </div>
                        <div style="display: flex; gap: 4px;">
                          <button class="btn btn-secondary" style="font-size: 15px; padding: 4px 8px;"
                                  onclick="editMedicationSlot(${idx})" aria-label="${escapeHtml(slot.label)} 편집">${svgIcon('edit', 14)}</button>
                          <button class="btn btn-secondary" style="font-size: 15px; padding: 4px 8px; color: var(--accent-danger);"
                                  onclick="deleteMedicationSlot(${idx})" aria-label="${escapeHtml(slot.label)} 삭제">${svgIcon('trash', 14)}</button>
                        </div>
                      </div>
                    `).join('');
                  })()}
                </div>

                <button class="btn btn-secondary" style="width: 100%; font-size: 15px;"
                        onclick="addMedicationSlot()" aria-label="복약 슬롯 추가">
                  ${svgIcon('plus', 16)} 복약 슬롯 추가
                </button>
              </div>

              <div class="settings-section">
                <div class="settings-section-title">🎯 목표 설정</div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">📅</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">일일 목표</span>
                      <span class="settings-label-desc">하루에 완료할 작업 수</span>
                    </div>
                  </div>
                  <input
                    type="number"
                    class="settings-input-number"
                    min="1"
                    max="20"
                    value="${appState.settings.dailyGoal}"
                    onchange="updateSetting('dailyGoal', parseInt(this.value) || 5)"
                  >
                </div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">📆</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">주간 목표</span>
                      <span class="settings-label-desc">일주일에 완료할 작업 수</span>
                    </div>
                  </div>
                  <input
                    type="number"
                    class="settings-input-number"
                    min="1"
                    max="100"
                    value="${appState.settings.weeklyGoal}"
                    onchange="updateSetting('weeklyGoal', parseInt(this.value) || 25)"
                  >
                </div>
              </div>

              <div class="settings-section">
                <div class="settings-section-title">🔔 알림 설정</div>

                <div class="settings-row">
                  <div class="settings-label">
                    <span class="settings-label-icon">🌙</span>
                    <div class="settings-label-text">
                      <span class="settings-label-title">취침 알림</span>
                      <span class="settings-label-desc">취침 시간 전 알림 받기</span>
                    </div>
                  </div>
                  <button
                    class="btn-small ${appState.settings.bedtimeReminder ? 'complete' : ''}"
                    onclick="updateSetting('bedtimeReminder', !appState.settings.bedtimeReminder); renderStatic();"
                    style="min-width: 60px;"
                  >
                    ${appState.settings.bedtimeReminder ? 'ON' : 'OFF'}
                  </button>
                </div>

                ${appState.settings.bedtimeReminder ? `
                  <div class="settings-row">
                    <div class="settings-label">
                      <span class="settings-label-icon">⏰</span>
                      <div class="settings-label-text">
                        <span class="settings-label-title">알림 시간</span>
                        <span class="settings-label-desc">취침 몇 분 전에 알림</span>
                      </div>
                    </div>
                    <select
                      class="settings-input"
                      style="width: 100px;"
                      onchange="updateSetting('bedtimeReminderMinutes', parseInt(this.value))"
                    >
                      <option value="15" ${appState.settings.bedtimeReminderMinutes === 15 ? 'selected' : ''}>15분 전</option>
                      <option value="30" ${appState.settings.bedtimeReminderMinutes === 30 ? 'selected' : ''}>30분 전</option>
                      <option value="60" ${appState.settings.bedtimeReminderMinutes === 60 ? 'selected' : ''}>1시간 전</option>
                    </select>
                  </div>
                ` : ''}
              </div>

              <div class="settings-section">
                <div class="settings-section-title">💰 부업 주최자 목록</div>
                <div class="settings-label-desc" style="margin-bottom: 10px;">자동완성에 사용되는 주최자 목록입니다. 입력 후 추가, 클릭하면 삭제됩니다.</div>
                <div id="organizer-list-display" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                  ${(appState.organizerList || []).map((o, i) => `
                    <span style="display:inline-flex;align-items:center;gap:4px;background:var(--bg-tertiary);border-radius:8px;padding:4px 10px;font-size:15px;cursor:pointer;" onclick="removeOrganizerFromList(${i})" title="클릭하여 삭제">
                      ${escapeHtml(o)} ✕
                    </span>
                  `).join('')}
                </div>
                <div style="display:flex;gap:8px;">
                  <input type="text" id="new-organizer-input" class="work-modal-input" placeholder="새 주최자 이름" style="flex:1;font-size:15px;padding:8px 12px;border-radius:8px;background:var(--bg-tertiary);border:1px solid var(--border-color);color:inherit;"
                    onkeypress="if(event.key==='Enter') addOrganizerToList()">
                  <button onclick="addOrganizerToList()" style="padding:8px 14px;border-radius:8px;background:var(--accent-primary);border:none;color:white;font-size:15px;cursor:pointer;">추가</button>
                </div>
              </div>

              <div class="settings-section">
                <div class="settings-section-title">💾 데이터 백업</div>
                <div class="settings-row" style="justify-content: center; gap: 12px;">
                  <button class="backup-btn export" onclick="exportData()" style="flex: 1;">
                    📤 내보내기
                  </button>
                  <button class="backup-btn import" onclick="importData()" style="flex: 1;">
                    📥 가져오기
                  </button>
                </div>
                <div class="settings-label-desc" style="text-align: center; margin-top: 8px; opacity: 0.6;">
                  주기적으로 백업하여 데이터를 안전하게 보관하세요
                </div>
                <div class="settings-label-desc" style="text-align: center; margin-top: 4px; opacity: 0.5; font-size: 13px;">
                  ${(() => {
                    const last = localStorage.getItem('navigator-last-archive-date');
                    if (!last) return '⚠️ 아직 백업한 적 없음 — 오래된 데이터 자동 정리가 비활성 상태입니다';
                    const days = Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
                    if (isNaN(days)) return '⚠️ 백업 날짜를 읽을 수 없음';
                    if (days > 30) return '⚠️ 마지막 백업: ' + days + '일 전 — 자동 정리가 일시 중지됨';
                    if (days === 0) return '✅ 마지막 백업: 오늘';
                    return '✅ 마지막 백업: ' + days + '일 전';
                  })()}
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                  <button class="backup-btn" onclick="exportArchivedData()" style="width: 100%; background: var(--bg-secondary); border-color: var(--border-color);" aria-label="자동 정리된 오래된 데이터 내보내기">
                    📦 아카이브 내보내기
                  </button>
                  <div class="settings-label-desc" style="text-align: center; margin-top: 6px; opacity: 0.5; font-size: 13px;">
                    자동 정리된 2년 이전 데이터 (기상/출퇴근/완료 기록)
                  </div>
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-color);">
                  <button class="backup-btn" onclick="restoreFromSyncBackup()" style="width: 100%; background: var(--accent-danger-alpha); border-color: var(--accent-danger); color: var(--accent-danger);" aria-label="동기화 백업에서 데이터 복원">
                    🔄 동기화 백업에서 복원
                  </button>
                  <div class="settings-label-desc" style="text-align: center; margin-top: 6px; opacity: 0.5; font-size: 15px;">
                    동기화 중 데이터가 유실된 경우 직전 상태로 복원
                  </div>
                </div>
              </div>

              <div class="settings-section">
                <div class="settings-section-title">🌙 매일 자문</div>
                <div class="settings-row">
                  <label for="reflection-evening-time" style="flex: 1;">저녁 자문 시각</label>
                  <input type="time" id="reflection-evening-time"
                         value="${appState.dailyReflection.settings.eveningTime}"
                         onchange="applyReflectionSettings()"
                         style="padding: 6px 10px; border-radius: 6px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary);">
                </div>
                <div class="settings-row">
                  <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="reflection-morning-enabled"
                           ${appState.dailyReflection.settings.morningTime ? 'checked' : ''}
                           onchange="applyReflectionSettings()">
                    아침 자문 활성화
                  </label>
                </div>
                <div class="settings-row">
                  <label for="reflection-morning-time" style="flex: 1;">아침 자문 시각</label>
                  <input type="time" id="reflection-morning-time"
                         value="${appState.dailyReflection.settings.morningTime || '09:00'}"
                         ${appState.dailyReflection.settings.morningTime ? '' : 'disabled'}
                         onchange="applyReflectionSettings()"
                         style="padding: 6px 10px; border-radius: 6px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary);">
                </div>
                <details style="margin-top: 8px;">
                  <summary style="cursor: pointer; padding: 6px 0; font-size: 14px;">질문 customize (저녁 3개 + 아침 3개)</summary>
                  <div style="display: flex; flex-direction: column; gap: 6px; padding: 8px 0;">
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">저녁</div>
                    ${[0,1,2].map(i => `
                      <textarea data-q-time="evening" data-q-idx="${i}"
                                maxlength="100" rows="2"
                                onchange="applyReflectionSettings()"
                                style="padding: 6px 10px; border-radius: 6px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); font-family: inherit; font-size: 13px; resize: vertical;">${escapeHtml(appState.dailyReflection.settings.questions.evening[i]||'')}</textarea>
                    `).join('')}
                    <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">아침</div>
                    ${[0,1,2].map(i => `
                      <textarea data-q-time="morning" data-q-idx="${i}"
                                maxlength="100" rows="2"
                                onchange="applyReflectionSettings()"
                                style="padding: 6px 10px; border-radius: 6px; background: var(--bg-secondary); border: 1px solid var(--border-color); color: var(--text-primary); font-family: inherit; font-size: 13px; resize: vertical;">${escapeHtml(appState.dailyReflection.settings.questions.morning[i]||'')}</textarea>
                    `).join('')}
                  </div>
                </details>
                <div class="settings-row">
                  <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="reflection-auto-modal"
                           ${appState.dailyReflection.settings.autoModalEnabled ? 'checked' : ''}
                           onchange="applyReflectionSettings()">
                    시각 도달 시 modal 자동 노출
                  </label>
                </div>
                <div class="settings-row">
                  <label style="display: flex; align-items: center; gap: 8px;">
                    <input type="checkbox" id="reflection-push"
                           ${appState.dailyReflection.settings.pushEnabled ? 'checked' : ''}
                           onchange="applyReflectionSettings()">
                    PWA 알림 (앱 설치된 경우만, iOS 17.4+)
                  </label>
                </div>
                <button onclick="resetReflectionSettings()" class="backup-btn" style="width: 100%; margin-top: 8px;">🔄 자문 설정 기본값 복원</button>
              </div>

              ${_renderCategoryCleanupSection()}
            </div>
            <div class="modal-footer" style="display: flex; gap: 10px; justify-content: center;">
              <button class="btn btn-secondary" onclick="closeSettings(); startFeatureTour();">
                📖 기능 가이드
              </button>
              <button class="btn btn-primary" onclick="closeSettings()">
                ✓ 완료
              </button>
            </div>
          </div>
        </div>
      `;
}

// ============================================
// Phase 4.5 — 자문 settings handlers
// ============================================

function applyReflectionSettings() {
  const settings = appState.dailyReflection.settings;
  const evTime = document.getElementById('reflection-evening-time')?.value;
  const mEnabled = document.getElementById('reflection-morning-enabled')?.checked;
  const mTime = document.getElementById('reflection-morning-time')?.value;
  const auto = document.getElementById('reflection-auto-modal')?.checked;
  const push = document.getElementById('reflection-push')?.checked;

  if (evTime) settings.eveningTime = evTime;
  settings.morningTime = mEnabled ? (mTime || '09:00') : null;
  settings.autoModalEnabled = !!auto;
  settings.pushEnabled = !!push;

  const evTextareas = document.querySelectorAll('textarea[data-q-time="evening"]');
  const mTextareas = document.querySelectorAll('textarea[data-q-time="morning"]');
  if (evTextareas.length === 3) {
    settings.questions.evening = Array.from(evTextareas).map(t => t.value.trim());
  }
  if (mTextareas.length === 3) {
    settings.questions.morning = Array.from(mTextareas).map(t => t.value.trim());
  }

  // morning time input disable toggle (live)
  const mTimeInput = document.getElementById('reflection-morning-time');
  if (mTimeInput) mTimeInput.disabled = !mEnabled;

  if (typeof saveState === 'function') saveState();

  // review fix Phase 7: settings 변경 시 push 스케줄 재시작 (시각/활성/비활성 모두 반영)
  if (typeof stopReflectionPushSchedule === 'function') stopReflectionPushSchedule();
  if (typeof startReflectionPushSchedule === 'function') startReflectionPushSchedule();
}

function resetReflectionSettings() {
  const confirmFn = (typeof destructiveConfirm === 'function') ? destructiveConfirm : (msg) => window.confirm(msg);
  if (!confirmFn('자문 설정을 기본값으로 복원할까요? (시각 / 질문 / 알림 모두 초기화)')) return;
  appState.dailyReflection.settings = {
    eveningTime: '22:00',
    morningTime: null,
    questions: {
      evening: [
        '오늘 30분 룰 깬 충동 있었나? 무엇이었나?',
        '오늘 과잉 약속 / 압력솥 발현 있었나?',
        '내일 한 가지 완성할 작은 약속은?'
      ],
      morning: [
        '오늘 분기 목표 3개 중 무엇을 진전시킬까?',
        '신체 베이스라인 (수면·카페인·운동) 오늘 무엇이 약한가?',
        '어제 후회한 충동 행동이 있나? 패턴은?'
      ]
    },
    pushEnabled: false,
    autoModalEnabled: true
  };
  if (typeof saveState === 'function') saveState();
  // settings modal 재 render
  if (typeof closeSettings === 'function' && typeof openSettings === 'function') {
    closeSettings();
    setTimeout(() => openSettings(), 100);
  }
}

// ============================================
// M4 — 카테고리 정리 (bulk reclassify + 시스템 추천)
// ============================================

/**
 * 시스템 추천 후보: 일상 category + repeatType none + deadline 있음 = 일회성 패턴
 * 분류 미정: '미분류' 또는 invalid enum
 */
function _getCategoryCleanupCandidates() {
  const tasks = appState.tasks || [];
  // utils.js loaded before render-settings.js (navigator-v5.html script order) — _NAV_VALID_CATEGORIES is global
  const eventCandidates = tasks.filter(t =>
    !t.completed &&
    t.category === '일상' &&
    (!t.repeatType || t.repeatType === 'none') &&
    t.deadline
  );
  const unclassified = tasks.filter(t =>
    !t.completed &&
    (t.category === '미분류' || !_NAV_VALID_CATEGORIES.includes(t.category))
  );
  // 옛 silent fallback 시기 (M3 SHIPPED 2026-05-24 이전) 잘못 분류된 일상 monthly/yearly task 추정.
  // daily/weekly 는 진짜 habit 가능성 ↑ → 의도적 제외 (false positive 차단)
  const confirmed = Array.isArray(appState.confirmedLifeHabits) ? appState.confirmedLifeHabits : [];
  const habitSuspects = tasks.filter(t =>
    !t.completed &&
    t.category === '일상' &&
    t.repeatType &&
    (t.repeatType === 'monthly' || t.repeatType === 'yearly') &&
    !confirmed.includes(t.title)
  );
  return { eventCandidates, unclassified, habitSuspects };
}

function _renderCategoryCleanupSection() {
  const { eventCandidates, unclassified, habitSuspects } = _getCategoryCleanupCandidates();

  const recHtml = eventCandidates.length > 0 ? `
    <div style="background: rgba(6, 182, 212, 0.08); border-left: 3px solid var(--cat-이벤트); border-radius: var(--radius-sm); padding: 10px; margin-bottom: 10px;">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px;">
        <span style="font-weight: 600; color: var(--cat-이벤트);">💡 시스템 추천: 일회성 task ${eventCandidates.length}개 → '이벤트'</span>
        <button onclick="applyEventReclassifyRecommendation()" style="background: var(--cat-이벤트); color: var(--bg-primary); border: 0; border-radius: var(--radius-sm); padding: 6px 12px; font-weight: 600; cursor: pointer; font-size: var(--font-xs);">일괄 적용</button>
      </div>
      <div style="font-size: var(--font-xs); color: var(--text-secondary);">
        ${eventCandidates.slice(0, 5).map(t => `<div>• ${escapeHtml(t.title)} <span style="color: var(--text-muted);">(${escapeHtml(t.deadline)})</span></div>`).join('')}
        ${eventCandidates.length > 5 ? `<div style="color: var(--text-muted); margin-top: 4px;">외 ${eventCandidates.length - 5}개</div>` : ''}
      </div>
    </div>
  ` : '';

  const ucOptions = ['본업', '부업', '자기계발', '일상', '가족', '이벤트', '미분류'].map(c =>
    `<option value="${escapeAttr(c)}">${escapeHtml(c)}</option>`
  ).join('');

  const ucHtml = unclassified.length > 0 ? `
    <div style="background: rgba(251, 113, 133, 0.08); border-left: 3px solid var(--cat-미분류); border-radius: var(--radius-sm); padding: 10px;">
      <div style="font-weight: 600; color: var(--cat-미분류); margin-bottom: 8px;">⚠️ 분류 안 된 task ${unclassified.length}개</div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${unclassified.slice(0, 10).map(t => `
          <div style="display: flex; align-items: center; gap: 8px; padding: 6px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
            <span style="flex: 1; font-size: var(--font-sm);">${escapeHtml(t.title)}</span>
            <select onchange="reclassifyTaskCategory('${escapeAttr(t.id)}', this.value)" style="padding: 4px 8px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: var(--font-xs);">
              <option value="" selected disabled>선택... (현재: ${escapeHtml(t.category || '미분류')})</option>
              ${ucOptions}
            </select>
          </div>
        `).join('')}
        ${unclassified.length > 10 ? `<div style="color: var(--text-muted); font-size: var(--font-xs); margin-top: 4px;">외 ${unclassified.length - 10}개 — 위 task 처리 후 새로고침</div>` : ''}
      </div>
    </div>
  ` : '';

  const suspectHtml = habitSuspects.length > 0 ? `
    <div style="background: rgba(167, 139, 250, 0.08); border-left: 3px solid var(--cat-자기계발); border-radius: var(--radius-sm); padding: 10px; margin-top: 10px;">
      <div style="font-weight: 600; color: var(--cat-자기계발); margin-bottom: 4px;">🔍 옛 분류 의심 — 일상+월/년 반복 task ${habitSuspects.length}개</div>
      <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 8px;">옛 silent fallback (~2026-05-24 이전) 시기 본업/부업 의도였는데 일상으로 저장됐을 가능성. 재분류하거나 진짜 일상이면 "유지" — 다음에 다시 안 뜸</div>
      <div style="display: flex; flex-direction: column; gap: 6px;">
        ${habitSuspects.slice(0, 10).map(t => `
          <div style="display: flex; align-items: center; gap: 8px; padding: 6px; background: var(--bg-tertiary); border-radius: var(--radius-sm);">
            <span style="flex: 1; font-size: var(--font-sm);">${escapeHtml(t.title)} <span style="color: var(--text-muted); font-size: var(--font-xs);">(${escapeHtml(t.repeatType)})</span></span>
            <select onchange="reclassifyTaskCategory('${escapeAttr(t.id)}', this.value)" style="padding: 4px 8px; background: var(--bg-secondary); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); font-size: var(--font-xs);">
              <option value="" selected disabled>재분류...</option>
              ${ucOptions}
            </select>
            <button onclick="confirmLifeHabit('${escapeAttr(t.title)}')" style="padding: 4px 10px; background: transparent; color: var(--text-secondary); border: 1px solid var(--border-light); border-radius: var(--radius-sm); font-size: var(--font-xs); cursor: pointer;" title="진짜 일상 습관임 — 다시 surface 안 함">유지</button>
          </div>
        `).join('')}
        ${habitSuspects.length > 10 ? `<div style="color: var(--text-muted); font-size: var(--font-xs); margin-top: 4px;">외 ${habitSuspects.length - 10}개 — 위 task 처리 후 새로고침</div>` : ''}
      </div>
    </div>
  ` : '';

  const confirmed = Array.isArray(appState.confirmedLifeHabits) ? appState.confirmedLifeHabits : [];
  const confirmedHtml = confirmed.length > 0 ? `
    <div style="background: rgba(72, 187, 120, 0.06); border-left: 3px solid var(--cat-일상); border-radius: var(--radius-sm); padding: 10px; margin-top: 10px;">
      <div style="font-weight: 600; color: var(--cat-일상); margin-bottom: 4px;">✓ 유지 중인 일상 습관 ${confirmed.length}개</div>
      <div style="font-size: var(--font-xs); color: var(--text-secondary); margin-bottom: 8px;">"유지" 누른 title list. 실수로 누른 거 있으면 × 로 제거 → 다시 cleanup section에 surface</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        ${confirmed.map(title => `
          <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 4px 4px 10px; background: var(--bg-tertiary); border: 1px solid var(--border-light); border-radius: 999px; font-size: var(--font-xs);">
            <span>${escapeHtml(title)}</span>
            <button onclick="unconfirmLifeHabit('${escapeAttr(title)}')" style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; background: transparent; border: 0; color: var(--text-muted); cursor: pointer; padding: 0; font-size: 14px; line-height: 1; border-radius: 999px;" aria-label="${escapeAttr(title)} 유지 취소" title="유지 취소">×</button>
          </span>
        `).join('')}
      </div>
    </div>
  ` : '';

  const emptyHtml = (eventCandidates.length === 0 && unclassified.length === 0 && habitSuspects.length === 0 && confirmed.length === 0) ? `
    <div style="text-align: center; padding: 16px; color: var(--text-secondary); font-size: var(--font-sm);">✅ 모든 task가 분류됐어. 추천 작업 없음.</div>
  ` : '';

  return `
    <div class="settings-section">
      <div class="settings-section-title">🏷️ 카테고리 정리</div>
      ${recHtml}
      ${ucHtml}
      ${suspectHtml}
      ${confirmedHtml}
      ${emptyHtml}
    </div>
  `;
}

function confirmLifeHabit(title) {
  if (!title) return;
  if (!Array.isArray(appState.confirmedLifeHabits)) appState.confirmedLifeHabits = [];
  if (!Array.isArray(appState.deletedConfirmedLifeHabits)) appState.deletedConfirmedLifeHabits = [];
  if (!appState.confirmedLifeHabits.includes(title)) {
    appState.confirmedLifeHabits.push(title);
  }
  // tombstone 에서 제거 (재 confirm — un-confirm 했다가 다시 유지)
  appState.deletedConfirmedLifeHabits = appState.deletedConfirmedLifeHabits.filter(t => t !== title);
  if (typeof saveState === 'function') saveState();
  if (typeof showToast === 'function') showToast(`'${escapeHtml(title)}' — 일상 습관으로 유지`, 'success');
  // settings modal 재 render — list 갱신
  if (typeof closeSettings === 'function' && typeof openSettings === 'function') {
    closeSettings();
    setTimeout(() => openSettings(), 100);
  }
}
window.confirmLifeHabit = confirmLifeHabit;

function unconfirmLifeHabit(title) {
  if (!title) return;
  if (!Array.isArray(appState.confirmedLifeHabits)) appState.confirmedLifeHabits = [];
  if (!Array.isArray(appState.deletedConfirmedLifeHabits)) appState.deletedConfirmedLifeHabits = [];
  // confirmedLifeHabits 에서 제거
  appState.confirmedLifeHabits = appState.confirmedLifeHabits.filter(t => t !== title);
  // tombstone 에 추가 (cross-device union 후 다시 살아나는 거 차단)
  if (!appState.deletedConfirmedLifeHabits.includes(title)) {
    appState.deletedConfirmedLifeHabits.push(title);
  }
  if (typeof saveState === 'function') saveState();
  if (typeof showToast === 'function') showToast(`'${escapeHtml(title)}' — 유지 취소 (다시 cleanup에 surface)`, 'info');
  if (typeof closeSettings === 'function' && typeof openSettings === 'function') {
    closeSettings();
    setTimeout(() => openSettings(), 100);
  }
}
window.unconfirmLifeHabit = unconfirmLifeHabit;

function applyEventReclassifyRecommendation() {
  const { eventCandidates } = _getCategoryCleanupCandidates();
  if (eventCandidates.length === 0) return;
  const confirmFn = (typeof destructiveConfirm === 'function') ? destructiveConfirm : (msg) => window.confirm(msg);
  if (!confirmFn(`${eventCandidates.length}개 task를 '이벤트'로 변경할까요?\n(repeatType=none + deadline 있는 일상 task)`)) return;
  const now = new Date().toISOString();
  const idSet = new Set(eventCandidates.map(c => c.id));
  appState.tasks = appState.tasks.map(t =>
    idSet.has(t.id) ? { ...t, category: '이벤트', updatedAt: now } : t
  );
  if (typeof saveState === 'function') saveState();
  if (typeof renderStatic === 'function') renderStatic();
  if (typeof showToast === 'function') showToast(`${eventCandidates.length}개 task → '이벤트' 변경됨`, 'success');
  // settings modal 재 render — 추천 list 갱신
  if (typeof closeSettings === 'function' && typeof openSettings === 'function') {
    closeSettings();
    setTimeout(() => openSettings(), 100);
  }
}
window.applyEventReclassifyRecommendation = applyEventReclassifyRecommendation;

function reclassifyTaskCategory(taskId, newCategory) {
  if (!newCategory || !_NAV_VALID_CATEGORIES.includes(newCategory)) {
    if (typeof showToast === 'function') showToast('유효하지 않은 카테고리', 'error');
    return;
  }
  const task = (appState.tasks || []).find(t => t.id === taskId);
  if (!task) {
    if (typeof showToast === 'function') showToast('task를 찾을 수 없어 — 새로고침 필요', 'error');
    return;
  }
  task.category = newCategory;
  task.updatedAt = new Date().toISOString();
  if (typeof saveState === 'function') saveState();
  if (typeof renderStatic === 'function') renderStatic();
  if (typeof showToast === 'function') showToast(`'${escapeHtml(task.title)}' → ${escapeHtml(newCategory)}`, 'success');
}
window.reclassifyTaskCategory = reclassifyTaskCategory;
