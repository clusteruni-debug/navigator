# Technical Architecture — Navigator

> Current structure and future structure

---

## System Overview

### Current (v5 - HTML)
```
┌─────────────────┐
│   Browser       │
│  ┌───────────┐  │
│  │  HTML     │  │
│  │  ↓        │  │
│  │ Vanilla   │  │
│  │   JS      │  │
│  │  ↓        │  │
│  │LocalStore │  │
│  └───────────┘  │
└─────────────────┘
```

### Future (v6+ - Production)
```
┌──────────┐     ┌──────────┐     ┌──────────┐
│          │     │          │     │          │
│ Browser  │────▶│ Vercel   │────▶│ Supabase │
│ (React)  │     │(Next.js) │     │   (DB)   │
│          │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘
     │                                  │
     │          Realtime                │
     └─────────────────────────────────┘
```

---

## Current Structure (v5.1)

### File Structure
```
navigator-app/
├── navigator-v5.html (main app, ~3800 lines)
│   ├── HTML (markup)
│   ├── CSS (styles)
│   │   ├── PC layout (3-column)
│   │   ├── Mobile layout (1-column)
│   │   ├── Completion animation
│   │   └── Progress display
│   └── JavaScript
│       ├── State management (appState)
│       ├── Business logic
│       │   ├── Priority calculation
│       │   ├── Mode determination
│       │   ├── Filtering
│       │   ├── Recurring task generation
│       │   └── Time calculation
│       ├── UI rendering (renderStatic)
│       ├── Event handlers
│       ├── Notification system
│       └── LocalStorage
├── manifest.json (PWA config)
└── sw.js (Service Worker)
```

### State Management
```javascript
const appState = {
  // UI state
  currentTab: 'action' | 'dashboard',
  showDetailedAdd: boolean,
  showTaskList: boolean,
  showCompletedTasks: boolean,

  // Data
  tasks: Task[],
  shuttleSuccess: boolean,

  // Temporary data
  quickAddValue: string,
  detailedTask: Partial<Task>,
  editingTaskId: number | null,

  // Touch events
  touchStart: {x: number, taskId: number} | null,
  touchingTaskId: number | null
}
```

---

## Core Modules

### 1. Priority Calculation Engine

```javascript
/**
 * Calculate priority score for a task
 *
 * Input: Task object
 * Output: number (score)
 *
 * Scoring factors:
 * 1. Deadline (-100 ~ +100)
 * 2. Category (+25 ~ +40)
 * 3. ROI (+0 ~ +30)
 * 4. Estimated time (+0 ~ +10)
 */
function calculatePriority(task: Task): number {
  let score = 0;

  // 1. Deadline score
  if (task.deadline) {
    const hoursLeft = (deadline - now) / (1000 * 60 * 60);

    if (hoursLeft < 0) score -= 100;      // Overdue
    else if (hoursLeft < 3) score += 100; // Urgent
    else if (hoursLeft < 24) score += 70; // Warning
    else if (hoursLeft < 72) score += 40; // Comfortable
  }

  // 2. Category score
  const categoryScores = {
    'Main Job': 40,   // Salary matters
    'Side Job': 35,   // Cash flow matters
    'Daily': 25       // Survival minimum
  };
  score += categoryScores[task.category];

  // 3. ROI score (side jobs only)
  if (task.category === 'Side Job' && task.expectedRevenue) {
    const roi = task.expectedRevenue / task.estimatedTime;
    score += Math.min(roi * 0.1, 30); // Max 30 points
  }

  // 4. Short task bonus
  if (task.estimatedTime <= 10) {
    score += 10;
  }

  return score;
}
```

**Characteristics**:
- Deadline is most important (100 points)
- Category provides base weight
- ROI is a bonus (side jobs only)
- Short tasks are favored (quick sense of achievement)

---

### 2. Mode System

```javascript
/**
 * Determine mode based on current time and shuttle status
 *
 * Input: hour, shuttleSuccess
 * Output: 'Work' | 'Survival' | 'Leisure' | 'Commute' | 'Rest'
 */
function getCurrentMode(
  hour: number,
  shuttleSuccess: boolean
): Mode {
  // Priority: time of day > shuttle status

  if (hour >= 11 && hour < 20) {
    return 'Work'; // Show main job only
  }

  if (hour >= 22 && hour < 24) {
    if (shuttleSuccess) {
      return 'Leisure'; // Show all (5 hours secured)
    } else {
      return 'Survival'; // Short and urgent only (2 hours only)
    }
  }

  if (hour >= 19 && hour < 22 && shuttleSuccess) {
    return 'Leisure'; // Utilize bonus time
  }

  if (hour >= 7 && hour < 11) {
    return 'Commute'; // In transit
  }

  return 'Rest'; // Late night/early morning
}
```

**Mode-based filtering**:
```javascript
function filterByMode(tasks: Task[], mode: Mode): Task[] {
  switch (mode) {
    case 'Work':
      // Main job only
      return tasks.filter(t => t.category === 'Main Job');

    case 'Survival':
      // 15 min or less OR urgent (priority > 90)
      return tasks.filter(t =>
        t.estimatedTime <= 15 || t.priority > 90
      );

    case 'Leisure':
    case 'Commute':
    case 'Rest':
    default:
      // All tasks
      return tasks;
  }
}
```

---

### 3. Urgency Assessment

```javascript
/**
 * Deadline-based urgency level
 *
 * Input: Task
 * Output: 'urgent' | 'warning' | 'normal' | 'expired'
 */
function getUrgencyLevel(task: Task): UrgencyLevel {
  if (!task.deadline) return 'normal';

  const hoursLeft = (task.deadline - now) / (1000 * 60 * 60);

  if (hoursLeft < 0) return 'expired';   // Overdue (gray)
  if (hoursLeft < 3) return 'urgent';    // Urgent (red)
  if (hoursLeft < 24) return 'warning';  // Warning (orange)
  return 'normal';                       // Normal (blue)
}
```

**UI Mapping**:
```css
.urgent {
  border: 2px solid #f5576c; /* Red */
  animation: pulse 1s infinite;
}

.warning {
  border: 2px solid #ff9500; /* Orange */
}

.normal {
  border: 1px solid #667eea; /* Blue */
}

.expired {
  opacity: 0.5;
  text-decoration: line-through;
}
```

---

### 4. Rendering System

```javascript
/**
 * Full screen render
 *
 * Problem: Calling every 1 second causes input focus loss
 * Solution: Separated time-only updates into updateTime()
 */
function renderStatic() {
  // 1. Prepare data
  const filteredTasks = getFilteredTasks();
  const nextAction = filteredTasks[0];
  const stats = calculateStats();

  // 2. Generate HTML
  const html = generateHTML({
    tasks: filteredTasks,
    nextAction,
    stats,
    // ... all state
  });

  // 3. Update DOM
  document.getElementById('root').innerHTML = html;

  // 4. Re-register event handlers
  setupInputHandlers();
}

/**
 * Update time only (every 1 second)
 */
function updateTime() {
  const timeEl = document.getElementById('time-value');
  if (timeEl) {
    timeEl.textContent = formatTime();
  }
}

// Usage
renderStatic(); // On state change
setInterval(updateTime, 1000); // Every second
```

---

## Data Structures

### Task Object
```typescript
interface Task {
  // Identity
  id: number;  // timestamp (temporary)

  // Basic
  title: string;
  category: 'Main Job' | 'Side Job' | 'Daily';

  // Time
  deadline: string;        // ISO datetime
  estimatedTime: number;   // minutes
  createdAt: string;       // ISO datetime

  // Meta
  link: string;            // URL
  expectedRevenue: string; // number (stored as string)

  // Recurring (added in v5.1)
  repeatType?: 'none' | 'daily' | 'weekday' | 'weekly' | 'monthly';

  // Status
  completed: boolean;

  // Computed (runtime)
  priority?: number;
  urgency?: 'urgent' | 'warning' | 'normal' | 'expired';
}
```

### LocalStorage Structure
```javascript
// localStorage['navigator-tasks']
[
  {
    id: 1738048239847,
    title: "Polygon Quiz",
    category: "Side Job",
    deadline: "2026-01-28T23:59:00",
    estimatedTime: 10,
    link: "https://t.me/...",
    expectedRevenue: "50000",
    repeatType: "none",  // Added in v5.1
    completed: false,
    createdAt: "2026-01-28T14:30:00"
  },
  // ...
]

// localStorage['navigator-shuttle']
true // or false

// localStorage['navigator-streak'] (added in v5.1)
{
  "count": 3,
  "lastDate": "2026-01-28"
}

// localStorage['navigator-notified-tasks'] (added in v5.1)
["task-id-1", "task-id-2"]  // Task IDs already notified
```

---

## UI Architecture

### Layout Structure
```
App
├── Header (title, logo)
├── TabNav (Action | Dashboard | Schedule)
└── TabContent
    ├── ActionTab (default)
    │   ├── PC 3-column layout
    │   │   ├── Left: CurrentTime, ShuttleStatus, Stats, Backup
    │   │   ├── Center: QuickAdd, NextAction, TaskList
    │   │   └── Right: TodayProgress, UrgentList
    │   └── Mobile 1-column layout
    │       ├── CurrentTimeSection (NEW)
    │       ├── ShuttleStatus
    │       ├── TodayProgress (NEW)
    │       ├── Stats
    │       ├── QuickAdd
    │       ├── DetailedAdd (optional)
    │       ├── NextAction
    │       ├── TaskList
    │       └── CompletedTasks (optional)
    ├── DashboardTab
    │   ├── TodaySummary
    │   ├── CategoryStats
    │   ├── UrgentList (optional)
    │   ├── AllTasksList
    │   └── CompletedList (optional)
    └── ScheduleTab (NEW)
        ├── ScheduleFilter (All | Today | Weekday | Weekend)
        └── ScheduleList (grouped by date)
```

### Completion Feedback System (NEW)
```
CompletionOverlay
├── Check icon (animated)
├── "Done!" text
└── Auto fade-out (0.5s)

TodayProgress
├── Progress bar
├── Completed/Total count
└── Consecutive days streak

CurrentTimeSection
├── Current time (real-time)
├── Current mode (Work/Leisure/Survival/Commute/Rest)
└── Time remaining per mode
```

### Component Responsibilities

**ShuttleStatus**:
- Display/toggle shuttle status
- Click -> change status
- localStorage persistence

**NextAction**:
- Display top priority task
- [GO] -> open link
- [Done] -> completeTask()

**TaskList**:
- Full task list
- Swipe gestures
- Complete/edit/delete buttons

---

## Data Flow

### Task Addition Flow
```
1. User input
   ↓
2. quickAdd() or detailedAdd()
   ↓
3. appState.tasks.push(newTask)
   ↓
4. saveState() -> localStorage
   ↓
5. renderStatic() -> UI update
   ↓
6. showToast('Success')
```

### Task Completion Flow
```
1. User action (button or swipe)
   ↓
2. completeTask(id)
   ↓
3. appState.tasks[i].completed = true
   ↓
4. saveState() -> localStorage
   ↓
5. renderStatic() -> UI update
   ↓
6. Haptic feedback (vibration)
   ↓
7. showToast('Done!')
```

### Next-Action Decision Flow
```
1. getFilteredTasks()
   ↓
2. tasks.filter(t => !t.completed)
   ↓
3. tasks.map(t => ({...t, priority: calculatePriority(t)}))
   ↓
4. tasks.sort((a,b) => b.priority - a.priority)
   ↓
5. filterByMode(tasks, getCurrentMode())
   ↓
6. return tasks[0] // Top priority
```

---

## Technical Debt & Improvements Needed

### 1. ID Generation (Critical)
```javascript
// Current
id: Date.now() // timestamp

// Problem
- Collision on millisecond-level simultaneous creation
- Predictable (security risk)

// Solution (Phase 2)
import { v4 as uuidv4 } from 'uuid';
id: uuidv4() // "550e8400-e29b-41d4-a716-446655440000"
```

### 2. Type Safety (High)
```javascript
// Current
task.category // Any string is allowed

// Problem
- Runtime errors possible
- No autocomplete
- Hard to find bugs

// Solution (Phase 2)
type TaskCategory = 'Main Job' | 'Side Job' | 'Daily';
task.category: TaskCategory // Type checked
```

### 3. State Management (High)
```javascript
// Current
const appState = { ... } // Global variable

// Problem
- Hard to track
- Hard to debug
- Cannot test

// Solution (Phase 2)
import { create } from 'zustand';
const useTaskStore = create((set) => ({
  tasks: [],
  addTask: (task) => set((state) => ({
    tasks: [...state.tasks, task]
  }))
}))
```

### 4. Rendering Performance (Medium)
```javascript
// Current
renderStatic() // Regenerates entire HTML

// Problem
- Slow (with 100+ tasks)
- Memory waste
- Scroll position reset

// Solution (Phase 2)
React Virtual DOM // Only changed parts
```

### ~~5. Responsive Design~~ Done (v5.1)
```css
/* Implemented in v5.1 */
@media (min-width: 1024px) {
  .pc-layout {
    display: grid;
    grid-template-columns: 1fr 1fr 380px;
    gap: 24px;
  }
}

/* Tablet support too */
@media (min-width: 768px) and (max-width: 1023px) {
  /* Partial 2-column support */
}
```

---

## Performance Goals

### Current (v5)
- Loading: < 1 second
- Rendering: < 100ms
- Task addition: < 50ms

### Target (v6)
- First Paint: < 1 second
- Time to Interactive: < 2 seconds
- Rendering: < 16ms (60fps)
- API response: < 500ms

---

## Security Considerations

### Current (Local only)
- XSS: None (no external input)
- CSRF: None (no server)
- Auth: None (local only)

### Future (Supabase)
- RLS (Row Level Security)
- JWT token authentication
- HTTPS only
- Secret keys managed via environment variables

---

## Testing Strategy (Phase 2+)

### Unit Tests
```typescript
describe('calculatePriority', () => {
  it('urgent tasks score above 100', () => {
    const task = {
      deadline: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2 hours from now
    };
    expect(calculatePriority(task)).toBeGreaterThan(100);
  });
});
```

### Integration Tests
```typescript
describe('Task addition flow', () => {
  it('add -> save -> display', async () => {
    await addTask({ title: 'Test' });
    expect(localStorage.getItem('tasks')).toContain('Test');
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

### E2E Tests (Playwright)
```typescript
test('user adds and completes a task', async ({ page }) => {
  await page.goto('/');
  await page.fill('#quick-add-input', 'Test Task');
  await page.click('text=+');
  await page.click('text=✓');
  await expect(page.locator('text=Test Task')).toHaveClass(/completed/);
});
```

---

**This architecture evolves. Updated per phase.**

**Last updated: 2026-01-28 (v5.1 expansion)**
