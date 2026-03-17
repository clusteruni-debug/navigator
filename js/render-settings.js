// ============================================
// 렌더링 - 설정 모달 + 온보딩 모달
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
                    <img class="user-avatar" src="${appState.user.photoURL || 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23667eea%22 width=%22100%22 height=%22100%22 rx=%2250%22/><text x=%2250%22 y=%2265%22 font-size=%2250%22 text-anchor=%22middle%22 fill=%22white%22>👤</text></svg>'}" alt="프로필">
                    <div class="user-info">
                      <div class="user-name">${appState.user.displayName || '사용자'}</div>
                      <div class="user-email">${appState.user.email}</div>
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
                          <button class="btn btn-secondary" style="font-size: 15px; padding: 4px 8px; color: var(--danger);"
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
                    <span style="display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.1);border-radius:8px;padding:4px 10px;font-size:15px;cursor:pointer;" onclick="removeOrganizerFromList(${i})" title="클릭하여 삭제">
                      ${escapeHtml(o)} ✕
                    </span>
                  `).join('')}
                </div>
                <div style="display:flex;gap:8px;">
                  <input type="text" id="new-organizer-input" class="work-modal-input" placeholder="새 주최자 이름" style="flex:1;font-size:15px;padding:8px 12px;border-radius:8px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:inherit;"
                    onkeypress="if(event.key==='Enter') addOrganizerToList()">
                  <button onclick="addOrganizerToList()" style="padding:8px 14px;border-radius:8px;background:var(--accent-primary,#667eea);border:none;color:#fff;font-size:15px;cursor:pointer;">추가</button>
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
                    if (days > 30) return '⚠️ 마지막 백업: ' + days + '일 전 — 자동 정리가 일시 중지됨';
                    return '✅ 마지막 백업: ' + days + '일 전';
                  })()}
                </div>
                <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.1);">
                  <button class="backup-btn" onclick="restoreFromSyncBackup()" style="width: 100%; background: var(--accent-danger-alpha); border-color: var(--accent-danger); color: var(--accent-danger);" aria-label="동기화 백업에서 데이터 복원">
                    🔄 동기화 백업에서 복원
                  </button>
                  <div class="settings-label-desc" style="text-align: center; margin-top: 6px; opacity: 0.5; font-size: 15px;">
                    동기화 중 데이터가 유실된 경우 직전 상태로 복원
                  </div>
                </div>
              </div>
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
