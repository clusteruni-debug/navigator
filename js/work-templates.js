// ============================================
// 본업 프로젝트 템플릿
// (work-data.js에서 분리)
// ============================================

/**
 * 기본 템플릿: 빈 workTemplates에 자동 추가
 */
const DEFAULT_WORK_TEMPLATES = [
  {
    id: 'default-uxr-ro',
    name: 'UXR RO (모객) 프로젝트',
    isDefault: true,
    stageNames: ['킥오프', '모객 준비', '모객 진행', '테스트 준비', '테스트 진행', '테스트 종료 후'],
    stages: [
      { // 0: 킥오프
        subcategories: [
          { name: '타겟 유저', tasks: [
            { title: '타겟 게임 리스트', estimatedTime: 30, owner: 'me' },
            { title: '타겟 게임 경험 수준', estimatedTime: 20, owner: 'me' },
            { title: '그룹 구분', estimatedTime: 30, owner: 'me' },
            { title: '인원 (버퍼 포함)', estimatedTime: 15, owner: 'me' }
          ]},
          { name: '기본', tasks: [
            { title: '방법론 결정', estimatedTime: 60, owner: 'me' },
            { title: '테스트 플랫폼 결정 (PC/모바일)', estimatedTime: 10, owner: 'me' },
            { title: '모객 채널 결정', estimatedTime: 20, owner: 'me' },
            { title: '보상 규모 결정', estimatedTime: 30, owner: 'me' },
            { title: '일정 수립', estimatedTime: 30, owner: 'me' },
            { title: '소요 시간 산정', estimatedTime: 15, owner: 'me' },
            { title: '데이터 검증 기준 설정', estimatedTime: 30, owner: 'me' },
            { title: '테스트용 계정 발급', estimatedTime: 20, owner: 'other' }
          ]}
        ]
      },
      { // 1: 모객 준비
        subcategories: [
          { name: '넥슨퍼스트 세팅', tasks: [
            { title: '계정 수집 설정', estimatedTime: 30, owner: 'me' },
            { title: '개인정보 수집 설정', estimatedTime: 20, owner: 'me' },
            { title: '스크린샷 수집 설정', estimatedTime: 15, owner: 'me' }
          ]},
          { name: '기본', tasks: [
            { title: '아웃소싱팀 외주 발주', estimatedTime: 30, owner: 'me' },
            { title: '스크리너 설계', estimatedTime: 120, owner: 'me' },
            { title: '게시용 배너 제작', estimatedTime: 15, owner: 'other' },
            { title: '넥슨플레이 게시/푸시 요청', estimatedTime: 15, owner: 'me' }
          ]}
        ]
      },
      { // 2: 모객 진행
        subcategories: [
          { name: '기본', tasks: [
            { title: '신청 현황 모니터링', estimatedTime: 15, owner: 'me' },
            { title: '모객 채널 추가 오픈 (현황에 따라)', estimatedTime: 30, owner: 'me' },
            { title: '유관 커뮤니티 동향 체크', estimatedTime: 15, owner: 'me' },
            { title: '데이터 검증', estimatedTime: 60, owner: 'me' },
            { title: '컨택 대상 리스트업', estimatedTime: 60, owner: 'me' },
            { title: '섭외 진행', estimatedTime: 120, owner: 'me' },
            { title: '테스트 참여 안내', estimatedTime: 30, owner: 'me' }
          ]}
        ]
      },
      { // 3: 테스트 준비
        subcategories: [
          { name: '기본', tasks: [
            { title: '넥슨 스페이스 공유 (2주 전)', estimatedTime: 30, owner: 'me', canStartEarly: true },
            { title: '다과/생수 확인', estimatedTime: 15, owner: 'me', canStartEarly: true },
            { title: '서약서 준비', estimatedTime: 20, owner: 'me', canStartEarly: true },
            { title: '출석 동선 세팅', estimatedTime: 30, owner: 'me', canStartEarly: true },
            { title: '목걸이 번호 지정/세팅', estimatedTime: 20, owner: 'me', canStartEarly: true },
            { title: 'UX표준프로파일 수집', estimatedTime: 30, owner: 'me' }
          ]}
        ]
      },
      { // 4: 테스트 진행
        subcategories: [
          { name: '출석 관리', tasks: [
            { title: '본인 확인', estimatedTime: 5, owner: 'me' },
            { title: '목걸이 배포', estimatedTime: 5, owner: 'me' },
            { title: '보안스티커 부착', estimatedTime: 5, owner: 'me' },
            { title: '휴대폰 수거', estimatedTime: 10, owner: 'me' }
          ]},
          { name: '기본', tasks: [
            { title: 'X배너 세팅', estimatedTime: 15, owner: 'me', canStartEarly: true },
            { title: '보안서약서 작성', estimatedTime: 10, owner: 'me' },
            { title: '버퍼인원 안내', estimatedTime: 10, owner: 'me' },
            { title: '출석 인원 최종 프로파일 정리', estimatedTime: 30, owner: 'me' },
            { title: '종료 후 현장 정리', estimatedTime: 30, owner: 'me' }
          ]}
        ]
      },
      { // 5: 테스트 종료 후
        subcategories: [
          { name: '보상 지급', tasks: [
            { title: '무료캐시 지급신청', estimatedTime: 30, owner: 'me' },
            { title: '이벤트 보상구매 신청', estimatedTime: 20, owner: 'me' },
            { title: '외주업체를 통한 지급', estimatedTime: 15, owner: 'other' }
          ]},
          { name: '기본', tasks: [
            { title: '외주업체 비용 처리', estimatedTime: 20, owner: 'me' },
            { title: '보고서 모객 페이지 작성', estimatedTime: 120, owner: 'me' }
          ]}
        ]
      }
    ],
    participantGoal: null,
    createdAt: '2026-03-16T00:00:00.000Z'
  },
  {
    id: 'default-ro',
    name: 'RO (리서치 오퍼레이션)',
    isDefault: true,
    stageNames: ['킥오프', '모객 준비', '모객 진행', '환경 세팅', '테스트 진행', '테스트 종료'],
    stages: [
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] }
    ],
    participantGoal: null,
    createdAt: '2026-03-27T00:00:00.000Z'
  },
  {
    id: 'default-cx-research',
    name: 'CX 리서치',
    isDefault: true,
    stageNames: ['킥오프', '리서치 준비/설계', '리서치 실사', '결과 분석'],
    stages: [
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] },
      { subcategories: [] }
    ],
    participantGoal: null,
    createdAt: '2026-03-27T00:00:00.000Z'
  }
];

/**
 * 기본 템플릿 시딩: ID 기반 체크 (기존 유저도 새 기본 템플릿을 받음)
 */
function seedDefaultTemplates() {
  let seeded = false;
  for (const defaultTemplate of DEFAULT_WORK_TEMPLATES) {
    const alreadyExists = appState.workTemplates.some(t => t.id === defaultTemplate.id);
    const wasDeleted = appState.deletedIds.workTemplates && appState.deletedIds.workTemplates[defaultTemplate.id];
    if (!alreadyExists && !wasDeleted) {
      appState.workTemplates.push({ ...defaultTemplate });
      seeded = true;
    }
  }
  if (seeded) {
    saveWorkTemplates();
    console.log('[seed] 기본 템플릿 시딩 완료');
  }
}

/**
 * 템플릿으로 저장
 */
function saveAsTemplate(projectId) {
  const project = appState.workProjects.find(p => p.id === projectId);
  if (!project) return;

  const templateName = prompt('템플릿 이름을 입력하세요:', project.name + ' 템플릿');
  if (!templateName) return;

  const template = {
    id: generateId(),
    name: templateName,
    stageNames: project.stages.map(s => s.name || ''),
    stages: project.stages.map(stage => ({
      subcategories: (stage.subcategories || []).map(sub => ({
        name: sub.name,
        tasks: sub.tasks.map(t => ({
          title: t.title,
          owner: t.owner || 'me',
          estimatedTime: t.estimatedTime || 30,
          ...(t.canStartEarly && { canStartEarly: true })
        }))
      }))
    })),
    participantGoal: project.participantGoal,
    createdAt: new Date().toISOString()
  };

  appState.workTemplates.push(template);
  saveWorkTemplates();
  showToast('템플릿 저장됨', 'success');
}
window.saveAsTemplate = saveAsTemplate;
