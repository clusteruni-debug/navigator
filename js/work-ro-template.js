// ============================================
// RO 표준 체크리스트 v3 (산출물 4b 반영)
// 새 RO 프로젝트 생성 시 deep copy
// ============================================

window.RO_CHECKLIST_TEMPLATE = {
  template_name: "RO 표준 체크리스트 v3 (산출물 4b 반영)",
  version: "3.0",
  based_on: "report_02b_actions.md",
  stages: [
    {
      stage_order: 1,
      stage_name: "킥오프",
      tasks: [
        { task_order: 1, title: "방법론", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 2, title: "타겟 유저", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: [
          { title: "타겟 게임 리스트", is_required: true },
          { title: "타겟 게임 경험 수준", is_required: true },
          { title: "그룹 구분", is_required: true },
          { title: "인원 (버퍼 포함)", is_required: true }
        ] },
        { task_order: 3, title: "테스트 플랫폼 (PC/모바일)", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 4, title: "모객 채널", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 5, title: "보상 규모", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 6, title: "일정", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 7, title: "소요 시간", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 8, title: "데이터 검증 (1차)", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null,
          notes: "킥오프 단계의 데이터 검증은 모집 조건 정합성 확인. 실제 응답 데이터 검증은 3단계." },
        { task_order: 9, title: "테스트용 계정 발급", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 10, title: "warning/제외 기준 사전 확정", is_required: false, is_new_from_v2: true, rationale_ref: "F2", subtasks: null,
          notes: "장기테스트일 경우 필수. 실사 중 기준 변경 방지." },
        { task_order: 11, title: "일정 역산 체크", is_required: true, is_new_from_v2: true, rationale_ref: "F5", subtasks: [
          { title: "외주 견적 회신 영업일", is_required: true },
          { title: "법무 검토 필요 여부·영업일", is_required: true },
          { title: "내부 결재 단계·영업일", is_required: true },
          { title: "데이터 검수 소요일", is_required: true }
        ] },
        { task_order: 12, title: "현재 동시 진행 프로젝트 수 확인", is_required: true, is_new_from_v2: true, rationale_ref: "F6", subtasks: null,
          notes: "3개 이상이면 일정 재검토. 5개는 3년 중 1회뿐인 이상치." },
        { task_order: 13, title: "예상 수명 타입 명시", is_required: false, is_new_from_v2: true, rationale_ref: "F7", subtasks: [
          { title: "고밀도 단기 (50~120일)", is_required: false },
          { title: "중밀도 중기 (280~420일)", is_required: false },
          { title: "저밀도 장기 (340일+)", is_required: false }
        ], notes: "단일 선택. 일정 역산과 교차 검증용." }
      ]
    },
    {
      stage_order: 2,
      stage_name: "모객 준비",
      tasks: [
        { task_order: 1, title: "아웃소싱팀을 통한 외주 발주", is_required: false, is_new_from_v2: false, rationale_ref: null, subtasks: null,
          notes: "외주 진행 시에만 필수." },
        { task_order: 2, title: "스크리너 설계", is_required: true, is_new_from_v2: false, rationale_ref: "F1", subtasks: [
          { title: "초안 작성", is_required: true },
          { title: "셀프 체크 — 측정 의도 (각 문항이 어떤 의사결정에 쓰이는가)", is_required: true },
          { title: "셀프 체크 — 누락·중복 (같은 걸 다르게 묻지 않는가)", is_required: true },
          { title: "셀프 체크 — 응답 부담 (5분 초과 여부, 행렬형 과다)", is_required: true },
          { title: "셀프 체크 — 분기 영향 (분기 로직이 단일 의도로 귀결되는가)", is_required: true },
          { title: "셀프 체크 — 노출 위험 (회사명·연구 목적 노출 여부)", is_required: true },
          { title: "시니어 리뷰 요청", is_required: true }
        ], notes: "셀프 체크 5개는 제출 전 필수. 전 기간 15~29% 유지되는 리뷰 수정 패턴 대응." },
        { task_order: 3, title: "넥슨퍼스트 세팅", is_required: false, is_new_from_v2: false, rationale_ref: null, subtasks: [
          { title: "계정 수집", is_required: true },
          { title: "개인정보 수집", is_required: true },
          { title: "스크린샷 수집", is_required: true }
        ] },
        { task_order: 4, title: "게시용 배너 제작", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 5, title: "넥슨플레이 게시/푸시 요청", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null }
      ]
    },
    {
      stage_order: 3,
      stage_name: "모객 진행",
      tasks: [
        { task_order: 1, title: "신청 현황 모니터링", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 2, title: "모객 채널 추가오픈 (현황 부족 시)", is_required: false, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 3, title: "유관 커뮤니티 동향 체크", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 4, title: "데이터 검증 (응답 데이터)", is_required: true, is_new_from_v2: true, rationale_ref: "F3", subtasks: [
          { title: "응답 원본 파일 시트 전체 확인 (다중 시트 누락 방지)", is_required: true },
          { title: "날짜 필드 형식 일관성 확인", is_required: true },
          { title: "참가자 ID - 응답 매칭 무결성 확인", is_required: true },
          { title: "데이터 소스 간 정합성 (NXSN / 스크리너 / 응답 3자 대조)", is_required: true },
          { title: "검증 완료 일시·확인자 기록", is_required: true }
        ], notes: "기존 모호한 '데이터 검증' 항목 분해. 실제 발생 실수 유형 기반." },
        { task_order: 5, title: "컨택 대상 리스트업", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 6, title: "섭외 진행", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 7, title: "테스트 참여 안내", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null }
      ]
    },
    {
      stage_order: 4,
      stage_name: "테스트 준비",
      tasks: [
        { task_order: 1, title: "넥슨 스페이스 공유 (2주 전)", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 2, title: "다과/생수 확인", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 3, title: "서약서 준비", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 4, title: "출석 동선 세팅", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 5, title: "목걸이 번호 지정/세팅", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 6, title: "UX표준프로파일 수집", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null }
      ]
    },
    {
      stage_order: 5,
      stage_name: "테스트 진행",
      tasks: [
        { task_order: 1, title: "X배너 세팅", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 2, title: "출석 관리", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: [
          { title: "본인 확인", is_required: true },
          { title: "목걸이 배포", is_required: true },
          { title: "보안스티커 부착", is_required: true },
          { title: "휴대폰 수거", is_required: true }
        ] },
        { task_order: 3, title: "보안서약서 작성", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 4, title: "버퍼인원 안내", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 5, title: "출석 인원 최종 프로파일 정리", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 6, title: "종료 후 현장 정리", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null }
      ]
    },
    {
      stage_order: 6,
      stage_name: "테스트 종료 후",
      tasks: [
        { task_order: 1, title: "보상 지급", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: [
          { title: "무료캐시 지급신청", is_required: false },
          { title: "이벤트 보상구매 신청", is_required: false },
          { title: "외주업체를 통한 지급", is_required: false }
        ], notes: "지급 방식 중 해당하는 것만 체크." },
        { task_order: 2, title: "외주업체 비용 처리", is_required: false, is_new_from_v2: false, rationale_ref: null, subtasks: null,
          notes: "외주 진행한 경우만." },
        { task_order: 3, title: "보고서 모객 페이지 작성", is_required: true, is_new_from_v2: false, rationale_ref: null, subtasks: null },
        { task_order: 4, title: "시행착오 1줄 기록", is_required: true, is_new_from_v2: true, rationale_ref: "F4", subtasks: [
          { title: "이번 프로젝트에서 한 번 이상 되돌린 판단 1가지", is_required: true },
          { title: "다음에 같은 상황이면 어떻게 다르게 할지 1줄", is_required: true }
        ], notes: "회고 부재가 데이터로 드러남. 형식 무거우면 안 하게 되므로 2줄로 제한." },
        { task_order: 5, title: "벤더 카드 업데이트", is_required: false, is_new_from_v2: true, rationale_ref: "F8", subtasks: [
          { title: "단가 업데이트", is_required: false },
          { title: "강점 1줄 추가", is_required: false },
          { title: "이슈 로그 추가 (있을 경우)", is_required: false }
        ], notes: "외주 발주건만 해당. 프로젝트 정의서의 벤더 카드 운영 원칙." }
      ]
    }
  ]
};

/**
 * RO v3 템플릿을 navigator stages 구조로 변환
 * mapping: prompt task → navigator task (각 stage 안 default sub "표준 항목" 1개)
 */
function applyRoV3Template() {
  const template = window.RO_CHECKLIST_TEMPLATE;
  if (!template || !template.stages) return [];

  return template.stages.map(stageDef => ({
    id: generateId(),
    name: stageDef.stage_name,
    completed: false,
    subcategories: [{
      id: generateId(),
      name: '표준 항목',
      tasks: stageDef.tasks.map(taskDef => ({
        id: generateId(),
        title: taskDef.title,
        status: 'not-started',
        priority: 0,
        deadline: null,
        owner: 'me',
        estimatedTime: 30,
        actualTime: null,
        completedAt: null,
        canStartEarly: false,
        isRequired: taskDef.is_required !== false,
        isNewFromV2: !!taskDef.is_new_from_v2,
        rationaleRef: taskDef.rationale_ref || null,
        notes: taskDef.notes || null,
        subtasks: (taskDef.subtasks || []).map(st => ({
          text: st.title,
          completed: false,
          isRequired: st.is_required !== false
        })),
        logs: []
      }))
    }]
  }));
}
window.applyRoV3Template = applyRoV3Template;

/**
 * RO v3 표준으로 새 프로젝트 생성
 */
function createRoV3Project() {
  const name = prompt('새 RO v3 프로젝트 이름:', '');
  if (!name || !name.trim()) return;

  const newProject = {
    id: generateId(),
    name: name.trim(),
    description: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    archived: false,
    onHold: false,
    archivedReport: null,
    currentStage: 0,
    participantCount: 0,
    stages: applyRoV3Template()
  };

  appState.workProjects.push(newProject);
  appState.activeWorkProject = newProject.id;
  appState.workView = 'detail';
  saveWorkProjects();
  renderStatic();
  if (typeof showToast === 'function') showToast('RO v3 표준 프로젝트 "' + name.trim() + '" 생성됨', 'success');
}
window.createRoV3Project = createRoV3Project;
