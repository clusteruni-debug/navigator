# Project Context — Navigator

> **This document contains all the context needed for Claude Code and Claude Web to understand the project.**

---

## User Situation (Critically Important)

### Personal Background
- **Coding experience**: Day 4 of vibe coding (non-CS background)
- **Occupation**: UX Research Manager (gaming company)
- **Health**: ADHD (on medication) + hypersomnia (needs sleep clinic)

### Life Constraints
- **Childcare**: 1 child, 21 months old
- **Pregnancy**: Wife at 4-5 weeks (second child)
- **Childcare share**: 0 hours on weekdays, 2-3 hours on weekends (wife handles everything)
- **Commute**: Shuttle (07:10) vs regular (arrives 09:30)
  - Shuttle success: Home by 19:00 -> 5 hours secured
  - Shuttle failure: Home by 22:00 -> only 2 hours secured

### Income Structure (Changing)
#### Past (2024 H1)
```
kAITO Project:
- X activity measurement -> token allocation
- 20+ projects managed via Excel
- Monthly revenue ~$4-5K USD
```

#### Current (2026.01)
```
Main income sources:
1. X Monetization (first payment ~$600/2 weeks)
   - 15.9 posts + 117.4 comments (2 weeks)
   - Sustainability uncertain

2. Crypto Events (Telegram)
   - 11 events (fluctuates daily)
   - 5-10 min simple / 30 min-1 hour research
   - Last-minute rush before deadlines
   - Revenue negligible/unstable

3. Vibe Coding (exploring new opportunities)
   - This project
```

#### Constraints
- **Company pressure**: X usage banned (warned for excessive use during work)
- **Time pressure**: Wife's morning sickness starts in 3 months -> childcare burden increases
- **6 months later**: Wife's belly showing -> need to fully take over childcare
- **12 months later**: Second child born -> survival mode

### Schedule
```
Weekdays:
06:00-09:30  Sleep (target: wake at 07:00, actual: 09:30)
09:30-11:00  Commute (1.5h) - X, YouTube
11:00-20:00  Main job (9h)
20:00-22:00  Return commute (2h) - X, YouTube
22:00-24:00  Free time (2h) - Web surfing, Vibe Coding
??:??        Sleep (irregular)

When shuttle is caught:
08:00 arrival -> 17:00 leave -> 19:00 home -> 5 hours secured
```

---

## Problem to Solve

### Core Problem
```
Gap between "to-do list -> actual action"

What exists:
- Time
- Ability
- Will

What's missing:
- Execution
```

### Specific Symptoms
1. **Priority confusion**
   - Morning me: "Let's exercise today"
   - Evening me: "Too tired... tomorrow"
   - Importance shifts arbitrarily based on mood/fatigue

2. **Deadline-only pattern**
   - "Important but not urgent" = not done
   - "Urgent but less important" = done
   - Only executes when there's a deadline

3. **The recording paradox**
   - Organizing Notion becomes work itself
   - Organizing instead of executing
   - Overhead becomes execution barrier

4. **ADHD characteristics**
   - Cannot multitask
   - Priority judgment is difficult
   - High task-switching cost
   - Executive Dysfunction

---

## Design Philosophy

### 1. "Execute without thinking"
```
Judgment = energy consumption
Judgment down = execution up

Implementation:
- Next-Action: just one thing to do now
- Auto-priority: don't need to think
- Swipe: action without decision
```

### 2. "Working garbage -> good code" (Track C)
```
Phase 1: HTML prototype -- Done + expanded
-> Quick validation, immediate use
-> Technical debt OK
-> PWA, recurring tasks, schedule view, UX improvements added

Phase 2: Next.js migration (waiting)
-> Build properly
-> Make it scalable

Phase 3: Production (waiting)
-> Real-time sync
-> Cross-platform
```

### 3. ADHD-Friendly UX
```
Visual:
- 3-hour deadline: Red + blinking
- 24-hour deadline: Orange
- Next-Action: displayed large

Tactile:
- On completion: vibration (50ms, 100ms, 50ms)
- On addition: vibration (50ms)

Audio:
- (Not implemented) notification sound
```

### 4. "It's okay if you can't" Acceptance
```
0% completion rate -> "It's okay. Do it tomorrow"
8 abandoned items -> explicitly shown
Even 5 minutes -> recognized as achievement
```

---

## Core Concepts

### 1. Mode System
```javascript
Auto-switching by time of day:

Work (11:00-20:00):
- Show main job only
- Hide X-related items (company pressure)

Survival (22:00-24:00, shuttle missed):
- 15 minutes or less only
- Urgent items only
- "Give up today" accepted

Leisure (19:00-24:00, shuttle caught):
- Show everything
- 5-hour utilization strategy
```

### 2. Priority Calculation
```javascript
score = f(
  deadline,        // Most important
  category,        // Main Job > Side Job > Daily
  ROI,             // Revenue/time (side jobs only)
  estimatedTime    // Short tasks favored
)

Deadline score:
- Overdue: -100 (penalty)
- Within 3 hours: +100 (top priority)
- Within 24 hours: +70
- Within 3 days: +40

Category score:
- Main Job: +40 (salary)
- Side Job: +35 (cash flow)
- Daily: +25 (survival minimum)

ROI bonus (side jobs):
- ROI = revenue / time
- Max +30 points

Estimated time bonus:
- 10 min or less: +10
```

### 3. Category Differences
```
Main Job:
- No expected revenue
- Deadline/estimated time/link

Side Job:
- Expected revenue is optional (may not know)
- Deadline/estimated time/revenue/link
- Used for ROI calculation

Daily:
- Estimated time only
- Revenue irrelevant
- Survival minimum
```

### 4. Shuttle Mode
```
Success (home by 19:00):
-> "5 hours secured!"
-> Leisure mode activated
-> All categories displayed

Failure (home by 22:00):
-> "Emergency mode"
-> Survival mode activated
-> Short and urgent only
```

---

## Data Structure

### Task Object
```typescript
interface Task {
  // Identity
  id: number;              // timestamp (temporary, will change to UUID)

  // Basic info
  title: string;           // Task title
  category: 'Main Job' | 'Side Job' | 'Daily';

  // Time info
  deadline: string;        // ISO datetime (optional)
  estimatedTime: number;   // in minutes
  createdAt: string;       // ISO datetime

  // Meta
  link: string;            // URL (Telegram, web)
  expectedRevenue: string; // Side jobs only, optional

  // Recurring (added in v5.1)
  repeatType?: 'none' | 'daily' | 'weekday' | 'weekly' | 'monthly';

  // Status
  completed: boolean;

  // Computed (runtime)
  priority?: number;       // Auto-calculated
  urgency?: 'urgent' | 'warning' | 'normal' | 'expired';
}
```

### State Management (Current)
```javascript
appState = {
  currentTab: string,
  shuttleSuccess: boolean,
  tasks: Task[],
  showDetailedAdd: boolean,
  showTaskList: boolean,
  showCompletedTasks: boolean,
  quickAddValue: string,
  detailedTask: Partial<Task>,
  editingTaskId: number | null,
  touchStart: {x: number, taskId: number} | null,
  touchingTaskId: number | null
}
```

---

## Past Trial and Error (Lessons Learned)

### v1 (Failed)
```
Problem: React library failed to load
Cause: Wrong CDN link
Solution: Switched to Vanilla JS
```

### v2 (Failed)
```
Problem: Black screen, nothing displayed
Cause: Wrong React implementation
Solution: Rewrote in Vanilla JS
```

### v3 (Partial Failure)
```
Problem: Input focus lost while typing
Cause: Full re-render every 1 second
Solution: Separated input handlers into events

Problem: Full list not visible on PC
Cause: Toggle logic bug
Solution: Control via showTaskList state
```

### v4 (Partial Failure)
```
Problem: Cannot delete from dashboard
Cause: confirm() called twice
Solution: confirm only at call site

Problem: Cannot edit completed tasks
Cause: Hidden after completion
Solution: Added undo completion feature
```

### v5 (Base)
```
All bugs fixed
Feature complete
Error handling added
Comments complete
```

### v5.1 (Extended) <- Current
```
PWA support (manifest.json, sw.js)
Push notifications (3 hours/1 hour before deadline)
Recurring tasks (daily/weekday/weekly/monthly)
PC/mobile responsive (3-column/1-column)
Schedule tab (weekday/weekend filter)
Completion animation + progress
Current time & time remaining per mode
Search & category filter
```

---

## Important Design Decisions

### Q1: Why are input fields different per category?
```
A: Context-appropriate

Main Job:
- Expected revenue is meaningless (salary)
- Only deadline/time matter

Side Job:
- May not know revenue
- Forcing it creates input barrier
- Made optional

Daily:
- Revenue irrelevant
- Only estimated time needed
```

### Q2: Why auto-priority?
```
A: ADHD-friendly

Manual priority:
- Requires judgment each time
- Energy consumption
- Decision fatigue -> no execution

Auto-priority:
- Execute without thinking
- Algorithm decides
- Zero decision cost
```

### Q3: Why show only one Next-Action?
```
A: Choice avoidance

Showing 10 items:
- "Which one first?" deliberation
- Deliberation -> avoidance -> not done

Showing just 1:
- Deliberation impossible
- Either do it / or don't
- Execution rate increases
```

### Q4: Why swipe gestures?
```
A: Minimize friction

Buttons:
- Must find them
- Click accuracy needed
- 2 steps (find + click)

Swipe:
- Intuitive
- Fast
- 1 step (swipe)
```

### Q5: Why "It's okay if you can't"?
```
A: Dismantling perfectionism

ADHD + Perfectionism:
- If not 100%, then 0%
- Fear of failure -> don't start
- Vicious cycle

Acceptance philosophy:
- 70% is also success
- 5 minutes is achievement
- Do it tomorrow
- Virtuous cycle
```

### Q6: Why JSON backup?
```
A: LocalStorage limitations

LocalStorage:
- Lost when browser data is cleared
- Cannot transfer between devices
- Max 5-10MB

JSON backup:
- Manual but safe
- Can transfer between devices
- Will be automated in Phase 3
```

---

## Lessons Learned (Non-CS Perspective)

### 1. Importance of State Management
```
Before: Variables scattered everywhere
-> Cannot track bugs
-> Debugging hell

Now: Single appState
-> Everything in one place
-> Understandable

Next: Zustand (React state management)
```

### 2. Rendering vs Events
```
Before: Redraw everything every 1 second
-> Input focus lost
-> Poor performance

Now: Event handlers
-> Update only what's needed
-> Focus preserved

Next: React (auto-optimization)
```

### 3. Importance of Error Handling
```
Before: Ignore errors
-> App crash
-> Data lost

Now: try-catch
-> Toast notifications
-> Graceful failure

Next: Sentry (error tracking)
```

### 4. Value of Comments
```
Before: No comments
-> Can't understand next day
-> Must relearn

Now: Comments on every function
-> Understandable after 1 week
-> Claude understands too

Next: JSDoc (types + comments)
```

---

## Known Limitations (Technical Debt)

### 1. ID Collision Possible
```
Current: Using timestamp
Problem: Collision on millisecond-level simultaneous creation
Solution: Change to UUID (Phase 2)
```

### 2. No Data Types
```
Current: JavaScript (no types)
Problem: Runtime errors possible
Solution: TypeScript migration (Phase 2)
```

### 3. Global State
```
Current: appState global variable
Problem: Hard to manage as complexity grows
Solution: Migrate to Zustand (Phase 2)
```

### 4. Full Re-render
```
Current: renderStatic() draws everything
Problem: Poor performance (slow)
Solution: React (partial updates)
```

### 5. LocalStorage Limitations
```
Current: Single device only
Problem: No sync
Solution: Supabase (Phase 3)
```

### 6. Inadequate Responsive Design
```
Current: Mobile-first
Problem: Awkward on large PC screens
Solution: Tailwind responsive (Phase 2)
```

---

## Tips for the Next Developer

### When Taking Over with Claude Code
```markdown
1. Read this file (CONTEXT.md) first
2. Check current position via ROADMAP.md
3. Understand structure via ARCHITECTURE.md
4. Read navigator-v5.html code
   - Follow comments to understand
5. Start working
```

### When Asking on Claude Web
```markdown
"Read CONTEXT.md and summarize"
-> Grasp full context

"Look at ROADMAP.md and tell me what to do next"
-> Start Phase 2 work

"Why was this part designed this way?"
-> Reference DECISIONS.md
```

### When Adding New Features
```markdown
1. Record in DECISIONS.md
   - Why did you do it this way
   - What alternatives were considered
   - What are the tradeoffs

2. Update ARCHITECTURE.md
   - Structural changes

3. Write comments
   - For your future self
```

---

## Reference During Development

### User's Communication Style
- "Just make it work" (avoiding perfectionism)
- "Learning by doing" (non-CS self-awareness)
- "Get the most out of it" (efficiency-driven)
- "Do both simultaneously" (learning + execution)

### Priorities
1. Working > Perfect
2. Quick validation > Long design
3. Execution > Understanding
4. Results > Process

### Communication Approach
- Technical terms need explanation
- Explain why (user is curious)
- Present options (respect decision authority)
- Encouragement (user has anxiety)

---

**This document is alive. It continues to be updated as the project progresses.**

**Last updated: 2026-01-28 (v5.1 expansion complete)**
