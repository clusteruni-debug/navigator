// ============================================
// 상태 타입 정의 + 초기 상태
// (state.js에서 분리)
// ============================================

// ============================================
// Supabase (tgeventbot) — 이벤트 탭에서 직접 사용
// ============================================
const TG_SUPABASE_URL = 'https://hgygyilcrkygnvaquvko.supabase.co';
const TG_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhneWd5aWxjcmt5Z252YXF1dmtvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMzE5NDIsImV4cCI6MjA4NDkwNzk0Mn0.iEVFwhZmfpjZqaaZyVVBiwK8GWNWfydXAtN-OaNsjFk';

// ============================================
// 이벤트 탭 UI 상태 (비영속적 — 새로고침 시 초기화)
// ============================================
let _eventBulkSelectMode = false;
const _eventBulkSelectedIds = new Set();
const _collapsedEventGroups = new Set(); // 접힌 그룹 ID
let _completedLogPage = 0; // 참여 완료 로그 페이지 (0-based)
const COMPLETED_LOG_PAGE_SIZE = 10;

// 수신 이벤트 캐시 (UI-only, not synced to Firebase)
let _supabaseEventCache = { data: [], fetchedAt: null, loading: false, error: null };
const SUPABASE_CACHE_TTL = 3 * 60 * 1000; // 3분

// ============================================
// 앱 상태 관리
// ============================================

/**
 * @typedef {Object} Subtask
 * @property {string} text - 서브태스크 내용
 * @property {boolean} completed - 완료 여부
 */

/**
 * @typedef {Object} Task
 * @property {string} id - 고유 ID (crypto.randomUUID, 레거시: 숫자→문자열 마이그레이션)
 * @property {string} title - 작업 제목
 * @property {'본업'|'부업'|'일상'|'가족'} category - 카테고리
 * @property {boolean} completed - 완료 여부
 * @property {string} [startDate] - 시작일 (YYYY-MM-DD)
 * @property {string} [deadline] - 마감일 (YYYY-MM-DD)
 * @property {number} [estimatedTime] - 예상 소요시간 (분)
 * @property {number|null} [actualTime] - 실제 소요시간 (분)
 * @property {string} [link] - 관련 링크 URL
 * @property {string|number} [expectedRevenue] - 예상 수익 (원)
 * @property {string} [description] - 작업 설명/메모
 * @property {'none'|'daily'|'weekdays'|'weekends'|'weekly'|'custom'|'monthly'|'interval'} [repeatType] - 반복 유형
 * @property {number[]} [repeatDays] - 특정 요일 반복 시 요일 배열 (0=일 ~ 6=토)
 * @property {number|null} [repeatMonthDay] - 매월 반복 시 날짜 (1~31)
 * @property {number|null} [repeatInterval] - N일에 한 번 반복 시 간격 (2~)
 * @property {string} [organizer] - 주최자 (부업용)
 * @property {string} [eventType] - 이벤트 종류 (부업용)
 * @property {string[]} [tags] - 태그 목록
 * @property {Subtask[]} [subtasks] - 서브태스크 목록
 * @property {string|null} [workProjectId] - 본업 프로젝트 연결 ID
 * @property {number|null} [workStageIdx] - 본업 단계 인덱스
 * @property {number|null} [workSubcatIdx] - 본업 중분류 인덱스
 * @property {string} createdAt - 생성 시각 (ISO 8601)
 * @property {string} updatedAt - 수정 시각 (ISO 8601)
 * @property {string} [completedAt] - 완료 시각 (ISO 8601)
 * @property {number} [priority] - 정렬 우선순위
 * @property {string} [deletedAt] - 삭제 시각 (휴지통용, ISO 8601)
 * @property {string} [telegramEventId] - 텔레그램 이벤트 연동 ID
 */

/**
 * @typedef {Object} WorkTask
 * @property {string} id - 고유 ID
 * @property {string} title - 작업 제목
 * @property {'not-started'|'in-progress'|'completed'|'blocked'} status - 진행 상태
 * @property {'me'|string} owner - 담당자 ('me' = 본인)
 * @property {number} estimatedTime - 예상 소요시간 (분, 기본 30)
 * @property {number|null} actualTime - 실제 소요시간 (분)
 * @property {string|null} completedAt - 완료 시각 (YYYY-MM-DDTHH:MM)
 * @property {boolean} [canStartEarly] - 이전 단계 완료 전에도 시작 가능 (기본: false)
 * @property {Array<{date: string, content: string}>} logs - 작업 로그
 * @property {string} [createdAt] - 생성 시각 (ISO 8601)
 * @property {number} [goal] - 목표 수량
 * @property {number} [count] - 현재 수량
 */

/**
 * @typedef {Object} WorkSubcategory
 * @property {string} id - 고유 ID
 * @property {string} name - 중분류 이름
 * @property {WorkTask[]} tasks - 하위 작업 목록
 */

/**
 * @typedef {Object} WorkStage
 * @property {string} name - 단계 이름 (준비/설계/진행/점검/실행/마무리)
 * @property {boolean} completed - 단계 완료 여부
 * @property {WorkSubcategory[]} subcategories - 중분류 목록
 * @property {string|null} startDate - 단계 시작일
 * @property {string|null} endDate - 단계 종료일
 */

/**
 * @typedef {Object} WorkProjectMeta
 * @property {string} [methodology] - 방법론 (예: "사용성 테스트", "FGI")
 * @property {string} [targetPlatform] - 플랫폼 (예: "PC", "모바일", "크로스")
 * @property {string} [recruitChannel] - 모객 채널
 * @property {string} [rewardType] - 보상 유형
 * @property {string} [rewardAmount] - 보상 규모
 * @property {number} [participantCount] - 참여 인원
 * @property {number} [bufferCount] - 버퍼 인원
 * @property {number} [groupCount] - 그룹 수
 * @property {string} [testDuration] - 테스트 소요시간
 * @property {string} [testDate] - 테스트 예정일
 * @property {string} [location] - 테스트 장소
 * @property {string} [outsourcingCompany] - 외주업체명
 * @property {string} [notes] - 기타 메모
 *
 * @typedef {Object} WorkProject
 * @property {string} id - 고유 ID
 * @property {string} name - 프로젝트 이름
 * @property {number} currentStage - 현재 단계 인덱스
 * @property {string|null} deadline - 마감일 (YYYY-MM-DD)
 * @property {WorkStage[]} stages - 단계 목록
 * @property {WorkProjectMeta} [meta] - 프로젝트 메타 데이터
 * @property {string} createdAt - 생성 시각 (ISO 8601)
 * @property {string} updatedAt - 수정 시각 (ISO 8601)
 * @property {boolean} [archived] - 아카이브 여부
 */

/**
 * @typedef {Object} CompletionLogEntry
 * @property {string} t - 작업 제목 (title)
 * @property {string} c - 카테고리 (category)
 * @property {string} at - 완료 시각 (HH:MM)
 * @property {string} [r] - 반복 유형 (repeatType, none이 아닌 경우만)
 * @property {number} [rv] - 수익 (revenue)
 * @property {number} [st] - 완료된 서브태스크 수
 */

/**
 * @typedef {Object} CommuteRoute
 * @property {string} id - 고유 ID ('route-' 접두사 + UUID)
 * @property {string} name - 루트 이름
 * @property {'morning'|'evening'|'both'} type - 출퇴근 유형
 * @property {string} [description] - 루트 설명
 * @property {number} expectedDuration - 예상 소요시간 (분)
 * @property {string} color - 표시 색상 (hex)
 * @property {boolean} isActive - 활성 여부
 * @property {string} createdAt - 생성 시각 (ISO 8601)
 */

/**
 * @typedef {Object} CommuteTrip
 * @property {string} routeId - 사용한 루트 ID
 * @property {string} [departTime] - 출발 시각 (HH:MM)
 * @property {string} [arriveTime] - 도착 시각 (HH:MM)
 * @property {number|null} duration - 소요시간 (분)
 * @property {'clear'|'rain'|'snow'|'delay'} conditions - 교통 상황
 */

/**
 * @typedef {Object} MedicationSlot
 * @property {string} id - 슬롯 ID (예: 'med_morning')
 * @property {string} label - 표시 이름
 * @property {string} icon - 이모지 아이콘
 * @property {boolean} required - 필수 복약 여부
 */

/**
 * @typedef {Object} LifeRhythmDay
 * @property {string|null} date - 날짜 (YYYY-MM-DD)
 * @property {string|null} wakeUp - 기상 시간 (HH:MM)
 * @property {string|null} homeDepart - 집 출발 시간
 * @property {string|null} workArrive - 회사 도착 시간
 * @property {string|null} workDepart - 회사 출발 시간
 * @property {string|null} homeArrive - 집 도착 시간
 * @property {string|null} sleep - 취침 시간
 * @property {Object<string, string|null>} medications - 복약 기록 { slotId: 'HH:MM' | null }
 */

/**
 * @typedef {Object} AppState
 * @property {'action'|'schedule'|'all'|'work'|'more'} currentTab - 현재 활성 탭
 * @property {boolean} shuttleSuccess - 셔틀 탑승 여부
 * @property {Task[]} tasks - 모든 작업 목록
 * @property {boolean} showDetailedAdd - 상세 추가 폼 표시 여부
 * @property {boolean} showTaskList - 작업 리스트 표시 여부
 * @property {boolean} showCompletedTasks - 완료된 작업 표시 여부
 * @property {string} quickAddValue - 빠른 추가 입력값
 *
 * @property {Object} detailedTask - 상세 추가/수정용 임시 데이터
 * @property {string} detailedTask.title
 * @property {'본업'|'부업'|'일상'|'가족'} detailedTask.category
 * @property {string} detailedTask.startDate
 * @property {string} detailedTask.deadline
 * @property {number} detailedTask.estimatedTime
 * @property {string} detailedTask.link
 * @property {string} detailedTask.expectedRevenue
 * @property {string} detailedTask.description
 * @property {string} detailedTask.repeatType
 * @property {number[]} detailedTask.repeatDays
 * @property {number|null} detailedTask.repeatMonthDay
 * @property {number|null} detailedTask.repeatInterval
 * @property {string} detailedTask.organizer
 * @property {string} detailedTask.eventType
 * @property {string[]} detailedTask.tags
 * @property {Subtask[]} detailedTask.subtasks
 * @property {string|null} detailedTask.workProjectId
 * @property {number|null} detailedTask.workStageIdx
 * @property {number|null} detailedTask.workSubcatIdx
 *
 * @property {string[]} availableTags - 사용 가능한 태그 목록
 * @property {string|null} editingTaskId - 수정 중인 작업 ID
 * @property {string|null} quickEditTaskId - 빠른 수정 모달용 작업 ID
 * @property {Object|null} touchStart - 스와이프 시작 지점
 * @property {string|null} touchingTaskId - 스와이프 중인 작업 ID
 * @property {'default'|'granted'|'denied'} notificationPermission - 알림 권한 상태
 * @property {'all'|'weekday'|'weekend'|'today'} scheduleFilter - 일정 필터
 * @property {string} searchQuery - 검색어
 * @property {'all'|'본업'|'부업'|'일상'|'가족'} categoryFilter - 카테고리 필터
 * @property {string|null} tagFilter - 태그 필터
 * @property {Object<string, boolean>} showCompletedByCategory - 카테고리별 완료 작업 표시 여부
 * @property {'dark'|'light'} theme - 테마
 * @property {string|null} draggedTaskId - 드래그 중인 작업 ID
 * @property {boolean} focusMode - 포커스 모드
 *
 * @property {Object} streak - 연속 달성 기록
 * @property {number} streak.current - 현재 연속일
 * @property {number} streak.best - 최고 연속일
 * @property {string|null} streak.lastActiveDate - 마지막 활동 날짜
 *
 * @property {boolean} showOnboarding - 온보딩 모달 표시
 * @property {boolean} moreMenuOpen - 더보기 메뉴 열림 상태
 *
 * @property {Object} pomodoro - 포모도로 상태
 * @property {boolean} pomodoro.isRunning
 * @property {boolean} pomodoro.isBreak
 * @property {number} pomodoro.timeLeft - 남은 시간 (초)
 * @property {number} pomodoro.workDuration - 작업 시간 (초, 기본 25분)
 * @property {number} pomodoro.breakDuration - 휴식 시간 (초, 기본 5분)
 * @property {number} pomodoro.completedPomodoros - 완료한 포모도로 수
 * @property {string|null} pomodoro.currentTaskId - 현재 작업 중인 태스크 ID
 *
 * @property {Object} todayStats - 오늘의 진행 상황
 * @property {number} todayStats.completedToday - 오늘 완료한 작업 수
 * @property {number} todayStats.streak - 연속 완료 (세션 내)
 * @property {string|null} todayStats.lastCompletedDate - 마지막 완료 날짜
 *
 * @property {Object} lifeRhythm - 라이프 리듬 트래커
 * @property {LifeRhythmDay} lifeRhythm.today - 오늘 기록
 * @property {Object<string, LifeRhythmDay>} lifeRhythm.history - 날짜별 기록
 * @property {Object} lifeRhythm.settings - 설정
 * @property {number} lifeRhythm.settings.targetSleep - 목표 수면 시간
 * @property {number[]} lifeRhythm.settings.workdays - 근무일 (0=일 ~ 6=토)
 * @property {MedicationSlot[]} lifeRhythm.settings.medicationSlots - 복약 슬롯 목록
 *
 * @property {Object} commuteTracker - 통근 트래커
 * @property {CommuteRoute[]} commuteTracker.routes - 루트 목록
 * @property {Object<string, Object<string, CommuteTrip>>} commuteTracker.trips - 날짜별/방향별 통근 기록
 * @property {Object} commuteTracker.settings - 통근 설정
 * @property {string} commuteTracker.settings.targetArrivalTime - 목표 도착 시각
 * @property {number} commuteTracker.settings.bufferMinutes - 여유 시간 (분)
 * @property {string|null} commuteTracker.settings.preferredMorningRoute - 선호 출근 루트 ID
 * @property {string|null} commuteTracker.settings.preferredEveningRoute - 선호 퇴근 루트 ID
 * @property {boolean} commuteTracker.settings.enableAutoTag - 자동 태그 활성화
 *
 * @property {'morning'|'evening'} commuteSubTab - 통근 서브탭
 * @property {string|null} commuteRouteModal - 루트 모달 상태 ('add' | routeId | null)
 * @property {Object<string, string>} commuteSelectedRoute - 방향별 선택 루트 ID
 *
 * @property {Object} historyState - 히스토리/캘린더 상태
 * @property {number} historyState.viewingYear
 * @property {number} historyState.viewingMonth
 * @property {string|null} historyState.selectedDate - 선택된 날짜 (YYYY-MM-DD)
 * @property {Object<string, boolean>} historyState.expandedDates - 펼쳐진 날짜 그룹
 * @property {'tasks'|'rhythm'} historyView - 히스토리 뷰 모드
 *
 * @property {Object} settings - 사용자 설정
 * @property {string} settings.targetWakeTime - 목표 기상 시간 (HH:MM)
 * @property {string} settings.targetBedtime - 목표 취침 시간 (HH:MM)
 * @property {string} settings.workStartTime - 출근 시간 (HH:MM)
 * @property {string} settings.workEndTime - 퇴근 시간 (HH:MM)
 * @property {number} settings.dailyGoal - 일일 목표 (완료 작업 수)
 * @property {number} settings.weeklyGoal - 주간 목표
 * @property {boolean} settings.bedtimeReminder - 취침 알림 활성화
 * @property {number} settings.bedtimeReminderMinutes - 취침 알림 (N분 전)
 * @property {number} settings.dayStartHour - 하루 시작 시각 (기본 5)
 *
 * @property {Task[]} templates - 작업 템플릿 목록
 * @property {boolean} showSettings - 설정 모달 표시
 * @property {boolean} hideSwipeHint - 스와이프 힌트 숨기기
 *
 * @property {Object} quickTimer - ADHD 퀵 타이머
 * @property {boolean} quickTimer.isRunning
 * @property {number} quickTimer.timeLeft - 남은 시간 (초)
 * @property {string|null} quickTimer.taskId - 연결된 작업 ID
 *
 * @property {boolean} showCelebration - 축하 효과 표시
 * @property {string} lastMotivation - 마지막 동기부여 메시지
 * @property {Object<string, boolean>} expandedSubtasks - 펼쳐진 서브태스크 목록
 *
 * @property {Object} weeklyPlan - 주간 계획
 * @property {string[]} weeklyPlan.focusTasks - 이번 주 집중 작업 ID (최대 3개)
 * @property {string|null} weeklyPlan.lastReviewDate
 * @property {string|null} weeklyPlan.lastReminderDate
 * @property {boolean} weeklyPlan.dismissed
 *
 * @property {string|null} quickFilter - 퀵 필터 ('2min'|'5min'|'urgent'|null)
 * @property {Object|null} pendingTimeInput - 실제 소요시간 입력 대기 작업
 *
 * @property {WorkProject[]} workProjects - 업무 프로젝트 목록
 * @property {string|null} activeWorkProject - 현재 선택된 프로젝트 ID
 * @property {string[]} workProjectStages - 기본 단계 이름 목록
 * @property {'dashboard'|'detail'} workView - 본업 뷰 모드
 * @property {Object[]} workTemplates - 저장된 본업 템플릿 목록
 * @property {boolean} showArchivedProjects - 아카이브 프로젝트 표시 여부
 *
 * @property {Object|null} user - 로그인한 Firebase 사용자
 * @property {'offline'|'syncing'|'synced'|'error'} syncStatus - 동기화 상태
 * @property {string|null} lastSyncTime - 마지막 동기화 시간
 *
 * @property {Object<string, CompletionLogEntry[]>} completionLog - 날짜별 완료 기록
 *
 * @property {Object} deletedIds - Soft-Delete 추적 (동기화 시 오판 방지)
 * @property {Object<string, string>} deletedIds.tasks - { taskId: 삭제시각 }
 * @property {Object<string, string>} deletedIds.workProjects
 * @property {Object<string, string>} deletedIds.templates
 * @property {Object<string, string>} deletedIds.workTemplates
 *
 * @property {Task[]} trash - 삭제된 태스크 보관 (30일 후 자동 정리)
 */
/** @type {AppState} */
const appState = {
  currentTab: 'action',           // 현재 활성 탭
  shuttleSuccess: false,          // 셔틀 탑승 여부
  tasks: [],                      // 모든 작업 목록
  showDetailedAdd: false,         // 상세 추가 폼 표시 여부
  showTaskList: true,             // 작업 리스트 표시 여부
  showCompletedTasks: false,      // 완료된 작업 표시 여부
  quickAddValue: '',              // 빠른 추가 입력값
  detailedTask: {                 // 상세 추가/수정용 임시 데이터
    title: '',
    category: '부업',
    startDate: '',                // 시작일 (일정 범위 표시용)
    deadline: '',
    estimatedTime: 10,
    link: '',
    expectedRevenue: '',
    description: '',              // 작업 설명/메모
    repeatType: 'none',           // 반복 유형: none/daily/weekdays/weekends/weekly/custom/monthly/interval
    repeatDays: [],               // 특정 요일 반복 시 요일 배열 (0=일, 1=월, ... 6=토)
    repeatMonthDay: null,         // 매월 반복 시 날짜 (1~31)
    repeatInterval: null,         // N일에 한 번 반복 시 간격 (2~)
    organizer: '',                // 주최자 (부업용): 불개미, 코같투, 맨틀 등
    eventType: '',                // 이벤트 종류 (부업용): 의견작성, 리캡, AMA 등
    tags: [],                     // 태그 목록
    subtasks: [],                 // 서브태스크 목록
    workProjectId: null,          // 본업 프로젝트 연결 ID
    workStageIdx: null,           // 본업 단계 인덱스
    workSubcatIdx: null           // 본업 중분류 인덱스
  },
  availableTags: ['긴급', '회의', '전화', '외출', '대기중', '검토필요'],  // 사용 가능한 태그
  organizerList: ['불개미', '코같투', '맨틀', 'xmaquina'],              // 부업 주최자 목록 (편집 가능)
  editingTaskId: null,            // 수정 중인 작업 ID (null이면 새로 추가)
  quickEditTaskId: null,          // 빠른 수정 모달용 작업 ID
  touchStart: null,               // 스와이프 시작 지점
  touchingTaskId: null,           // 스와이프 중인 작업 ID
  notificationPermission: 'default', // 알림 권한 상태
  scheduleFilter: 'all',          // 일정 필터: all/weekday/weekend/today
  searchQuery: '',                // 검색어
  categoryFilter: 'all',          // 카테고리 필터: all/본업/부업/일상/가족
  tagFilter: null,                 // 태그 필터: null이면 전체
  showCompletedByCategory: {},     // 전체 탭에서 카테고리별 완료 작업 표시 여부
  theme: 'dark',                   // 테마: dark/light
  draggedTaskId: null,             // 드래그 중인 작업 ID
  focusMode: false,                // 포커스 모드 (한 번에 하나만)
  streak: {                        // 연속 달성 기록
    current: 0,
    best: 0,
    lastActiveDate: null
  },
  habitStreaks: {},                  // 습관별 스트릭: { "작업제목": { current, best, lastActiveDate } }
  habitFilter: 'all',               // 습관 트래커 필터: 'all' 또는 작업 제목
  resolutions: [],                   // 결심 트래커: [{ id, title, startDate, icon, active, createdAt }]
  showOnboarding: false,           // 온보딩 모달 표시
  moreMenuOpen: false,             // 더보기 메뉴 열림 상태
  // 포모도로 상태
  pomodoro: {
    isRunning: false,
    isBreak: false,
    timeLeft: 25 * 60,            // 25분 (초)
    workDuration: 25 * 60,        // 작업 시간
    breakDuration: 5 * 60,        // 휴식 시간
    completedPomodoros: 0,        // 완료한 포모도로 수
    currentTaskId: null           // 현재 작업 중인 태스크
  },
  // 오늘의 진행 상황
  todayStats: {
    completedToday: 0,            // 오늘 완료한 작업 수
    streak: 0,                    // 연속 완료 (세션 내)
    lastCompletedDate: null       // 마지막 완료 날짜
  },
  // 라이프 리듬 트래커 (6개 항목 + 복약)
  lifeRhythm: {
    today: {
      date: null,                 // 오늘 날짜 (YYYY-MM-DD)
      wakeUp: null,               // 기상 시간 (HH:MM)
      homeDepart: null,           // 집 출발 시간
      workArrive: null,           // 회사 도착 시간
      workDepart: null,           // 회사 출발 시간
      homeArrive: null,           // 집 도착 시간
      sleep: null,                // 취침 시간
      medications: {}             // 복약 기록 { slotId: 'HH:MM' or null }
    },
    history: {},                  // 날짜별 기록
    settings: {
      targetSleep: 7,             // 목표 수면 시간
      workdays: [1, 2, 3, 4, 5],  // 근무일 (0=일, 1=월, ... 6=토)
      medicationSlots: [
        { id: 'med_morning', label: 'ADHD약(아침)', icon: '💊', required: true },
        { id: 'med_afternoon_adhd', label: 'ADHD약(점심)', icon: '💊', required: true },
        { id: 'med_afternoon_nutrient', label: '영양제(점심)', icon: '🌿', required: false },
        { id: 'med_evening', label: '영양제(저녁)', icon: '🌿', required: false }
      ]
    }
  },
  // 통근 트래커
  commuteTracker: {
    routes: [],
    trips: {},
    settings: {
      targetArrivalTime: '09:00',
      bufferMinutes: 10,
      preferredMorningRoute: null,
      preferredEveningRoute: null,
      enableAutoTag: true
    }
  },
  commuteSubTab: 'morning',
  commuteViewDate: null, // null = today, string = 'YYYY-MM-DD' for past dates
  commuteRouteModal: null,
  commuteSelectedRoute: {},
  // 히스토리/캘린더 상태
  historyState: {
    viewingYear: new Date().getFullYear(),
    viewingMonth: new Date().getMonth(),
    selectedDate: null,           // 선택된 날짜 (YYYY-MM-DD)
    expandedDates: {}             // 펼쳐진 날짜 그룹
  },
  historyView: 'tasks',           // 히스토리 뷰: tasks / rhythm
  completedBrowseState: {          // "다한 것" 서브뷰 상태 (UI-only, not synced to Firebase)
    page: 0,
    expandedDates: {}
  },
  showCompletedGeneral: false,     // 본업 일반 작업 완료 섹션 펼침 (UI-only, not synced to Firebase)
  workGeneralCompletedPage: 0,     // 본업 일반 작업 완료 섹션 페이지 (0-based, UI-only, not synced to Firebase)
  // 사용자 설정
  settings: {
    targetWakeTime: '07:00',      // 목표 기상 시간
    targetBedtime: '23:00',       // 목표 취침 시간
    workStartTime: '11:00',       // 출근 시간 (회사 모드 시작)
    workEndTime: '20:00',         // 퇴근 시간 (회사 모드 끝)
    dailyGoal: 5,                 // 일일 목표 (완료 작업 수)
    weeklyGoal: 25,               // 주간 목표 (완료 작업 수)
    bedtimeReminder: true,        // 취침 알림 활성화
    bedtimeReminderMinutes: 30,   // 취침 몇 분 전 알림
    dayStartHour: 5,              // 하루 시작 시각 (이 시각 이후 반복 태스크 리셋, 기본 05:00)
    dailyAvailableMinutes: 360    // 하루 본업 가용 시간 (분, 기본 6시간)
  },
  templates: [],                    // 작업 템플릿 목록
  showSettings: false,             // 설정 모달 표시
  hideSwipeHint: false,            // 스와이프 힌트 숨기기
  // ADHD 특화 기능
  quickTimer: {
    isRunning: false,
    timeLeft: 5 * 60,              // 5분 (초)
    taskId: null                    // 타이머와 연결된 작업 ID
  },
  showCelebration: false,          // 축하 효과 표시
  lastMotivation: '',              // 마지막 동기부여 메시지
  expandedSubtasks: {},             // 펼쳐진 서브태스크 목록 (taskId: true/false)
  collapsedSubtaskChips: safeParseJSON('navigator-collapsed-subtask-chips', {}), // 접힌 서브태스크 칩 (UI only, localStorage)
  collapsedSubcategories: {},       // 접힌 중분류 (projectId-stageIdx-subcatIdx: true)
  // 주간 계획
  weeklyPlan: {
    focusTasks: [],                   // 이번 주 집중할 작업 ID 목록 (최대 3개)
    lastReviewDate: null,             // 마지막 주간 리뷰 날짜
    lastReminderDate: null,           // 마지막 월요일 리마인더 날짜
    dismissed: false                  // 이번 주 리마인더 닫음 여부
  },
  allTasksSubView: 'all',              // 할일 서브뷰: all/today/upcoming/inbox
  quickFilter: null,                  // 퀵 필터: null, '2min', '5min', 'urgent'
  pendingTimeInput: null,             // 실제 소요시간 입력 대기 중인 작업
  // 본업 프로젝트 관리
  workProjects: [],                   // 업무 프로젝트 목록
  activeWorkProject: null,            // 현재 선택된 프로젝트 ID
  workProjectStages: ['준비', '설계', '진행', '점검', '실행', '마무리'],
  workView: 'dashboard',              // 뷰 모드: 'dashboard' | 'detail'
  workQuickAddOwner: 'me',            // 빠른 추가 담당자: 'me' | 'other'
  workTemplates: [],                  // 저장된 템플릿 목록
  showArchivedProjects: false,        // 아카이브 프로젝트 표시 여부
  workMetaExpanded: {},               // 프로젝트별 메타정보 펼침 상태 { projectId: true/false }
  expandedWorkLogs: {},               // 작업 로그 펼침 상태 { taskUid: true/false }
  scheduleShowAll: false,             // 스케줄 뷰: 완료/보류 포함 여부
  // Firebase 동기화
  user: null,                       // 로그인한 사용자
  syncStatus: 'offline',            // 동기화 상태: offline/syncing/synced/error
  lastSyncTime: null,               // 마지막 동기화 시간
  // 태스크 완료 영구 기록 (날짜별)
  // { "2026-02-05": [{ t, c, at, r?, rv?, st? }], ... }
  completionLog: {},
  // Soft-Delete 추적: 삭제된 항목의 ID + 삭제 시각 기록
  // 다른 기기에서 동기화 시 "로컬에만 있음 = 새 항목" 오판 방지
  deletedIds: {
    tasks: {},          // { "task-uuid": "2026-02-05T..." }
    workProjects: {},
    templates: {},
    workTemplates: {},
    commuteRoutes: {},  // 삭제된 통근 루트 추적
    completionLog: {},  // { "dateStr|title|at": "2026-03-06T..." } 삭제된 완료 기록
    commuteTrips: {},   // { "dateStr|direction": "2026-03-06T..." } 삭제된 통근 기록
    resolutions: {}     // 삭제된 결심 추적
  },
  // 휴지통: 삭제된 태스크 보관 (30일 후 자동 정리)
  trash: []
};
