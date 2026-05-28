# Navigator - Design Decision Records

> Architecture Decision Records (ADR)

**Why was it designed this way? Were there no alternatives?**

---

## Decision 1: Auto Priority vs Manual Priority

**Date**: 2026-01-27

### Context
User has difficulty judging task priorities. Importance shifts arbitrarily based on mood/fatigue.

### Options Considered

#### Option A: Manual Priority
```
Pros:
- User has direct control
- Flexible
- Simple to implement

Cons:
- Requires judgment every time (decision fatigue)
- Disadvantageous for ADHD
- Time-consuming
```

#### Option B: Auto Priority
```
Pros:
- Eliminates judgment
- Enables immediate execution
- ADHD-friendly

Cons:
- Complex algorithm
- May not be perfect
- Lacks transparency
```

### Decision
**Option B: Auto Priority**

### Rationale
1. ADHD users have executive function impairment
2. Judgment = energy consumption = no execution
3. "Execute without thinking" is the core philosophy
4. Not judging at all is better, even if imperfect

### Tradeoffs
- May not match user's intent
- However: manual adjustment (edit feature) is available
- Algorithm can be continuously improved

### Result
Success. User executes immediately without deliberation.

---

## Decision 2: Next-Action Single Display vs Full List

**Date**: 2026-01-27

### Context
When there are 10+ tasks, how should they be displayed?

### Options Considered

#### Option A: Full List
```
Pros:
- Full overview possible
- Standard todo app approach

Cons:
- Choice barrier ("Which one first?")
- Overwhelming (seeing 10 items leads to giving up)
- Priority confusion
```

#### Option B: Show Only One Next-Action
```
Pros:
- Choice impossible (eliminates thinking)
- No overwhelm
- Immediate execution

Cons:
- Hard to see full picture
- Anxiety ("What about the rest?")
```

#### Option C: Hybrid
```
Pros:
- Next-Action displayed large + collapsible list
- Expandable when needed

Cons:
- Increased complexity
```

### Decision
**Option C: Hybrid**

Next-Action displayed prominently + "View All Tasks" collapse/expand

### Rationale
1. Default is simple (Next-Action)
2. Anxious users can expand to view all
3. Freedom of choice preserved
4. Progressive Disclosure

### Tradeoffs
- Slightly increased UI complexity
- However: increased user control

### Result
Success. Most users only look at Next-Action, occasionally checking the list.

---

## Decision 3: Different Input Fields Per Category

**Date**: 2026-01-28

### Context
If Main Job/Side Job/Daily all require the same input fields, users must enter unnecessary information.

### Options Considered

#### Option A: Identical Input Fields
```
Pros:
- Simple to implement
- Consistency

Cons:
- Unnecessary fields (expected revenue for Main Job?)
- Increased input barrier
```

#### Option B: Category-Specific Fields
```
Pros:
- Context-appropriate
- Reduced input burden

Cons:
- More complex implementation
- Reduced consistency
```

### Decision
**Option B: Category-Specific Fields**

- Main Job: deadline/time/link
- Side Job: deadline/time/revenue(optional)/link
- Daily: time only

### Rationale
1. Main Job: expected revenue is meaningless (salary)
2. Side Job: revenue may be unknown (made optional)
3. Daily: revenue is irrelevant
4. Context-appropriate = better usability

### Tradeoffs
- Increased code complexity
- However: significantly improved user experience

### Result
Success. Eliminated unnecessary inputs -> faster task addition.

---

## Decision 4: Swipe Gestures vs Buttons Only

**Date**: 2026-01-28

### Context
How to complete/delete tasks on mobile.

### Options Considered

#### Option A: Buttons Only
```
Pros:
- Clear
- Prevents mistakes

Cons:
- Requires click accuracy
- Slow (find -> click)
```

#### Option B: Swipe Only
```
Pros:
- Fast
- Intuitive

Cons:
- Mistakes possible
- Low discoverability (unknown at first)
```

#### Option C: Swipe + Buttons
```
Pros:
- Power users: swipe
- Beginners: buttons

Cons:
- Increased complexity
```

### Decision
**Option C: Swipe + Buttons**

- Swipe left: complete
- Swipe right: delete
- Buttons: always visible

### Rationale
1. Mobile UX standard (iOS/Android)
2. Fast actions (power users)
3. Clear alternative (beginners)
4. Progressive learning

### Tradeoffs
- Increased implementation complexity
- However: significantly improved usability

### Result
Success. Once familiar, users only use swipe.

---

## Decision 5: LocalStorage vs Server

**Date**: 2026-01-27

### Context
Where to store data in Phase 1?

### Options Considered

#### Option A: Server (Supabase)
```
Pros:
- Cross-platform sync
- Automatic backup
- Scalable

Cons:
- Takes too long
- Complex initial setup
- Authentication required
- Cannot validate quickly
```

#### Option B: LocalStorage
```
Pros:
- Works immediately
- Simple
- No authentication needed
- Quick validation

Cons:
- Single device only
- Manual backup
- Size limit (5MB)
```

### Decision
**Phase 1: LocalStorage -> Phase 3: Supabase**

### Rationale
1. "Working garbage -> good code" strategy
2. Quick validation is the priority
3. Collect user feedback first
4. Migrate later

### Tradeoffs
- No sync initially
- However: manual transfer possible via JSON backup
- Automated in Phase 3

### Result
Success. Quick validation complete. Preparing for Phase 3.

---

## Decision 6: Vanilla JS vs React (Phase 1)

**Date**: 2026-01-27

### Context
What to build the Phase 1 prototype with?

### Options Considered

#### Option A: React
```
Pros:
- Component reuse
- Easy state management
- Good performance

Cons:
- Build setup required
- Complex deployment
- Learning curve (non-CS background)
```

#### Option B: Vanilla JS
```
Pros:
- Works immediately (just open HTML)
- No deployment needed
- Low learning burden

Cons:
- Difficult state management
- Poor performance
- Hard to scale
```

### Decision
**Phase 1: Vanilla JS -> Phase 2: React (Next.js)**

### Rationale
1. Non-CS background, day 4
2. Quick validation first
3. Save build/deploy time
4. Must be immediately usable

### Tradeoffs
- Technical debt accumulates
- However: cleaned up in Phase 2
- Learn while transitioning

### Result
Success. Prototype completed quickly. Preparing for Phase 2 transition.

---

## Decision 7: Hide vs Show After Completion

**Date**: 2026-01-28

### Context
How to display completed tasks?

### Options Considered

#### Option A: Hide Immediately
```
Pros:
- Clean
- Focused

Cons:
- Less sense of achievement
- Hard to undo mistakes
```

#### Option B: Always Show
```
Pros:
- Sense of achievement
- Transparency

Cons:
- List gets long
- Distracting
```

#### Option C: Toggle (Collapse/Expand)
```
Pros:
- Freedom of choice
- Check when needed

Cons:
- Increased complexity
```

### Decision
**Option C: Toggle**

Hidden by default + "View Completed Tasks" button

### Rationale
1. Default is clean
2. Expand for sense of achievement if desired
3. Undo completion possible
4. User control

### Tradeoffs
- Slightly increased UI complexity
- However: increased flexibility

### Result
Success. Only those who want to see completed tasks expand the section.

---

## Decision 8: Auto Mode Switching vs Manual Selection

**Date**: 2026-01-27

### Context
How to switch between Work/Survival/Leisure modes?

### Options Considered

#### Option A: Manual Selection
```
Pros:
- User control
- Clear

Cons:
- Must select every time
- Easy to forget
```

#### Option B: Auto Switching
```
Pros:
- No thinking required
- Accurate

Cons:
- Lacks transparency
- Reduced flexibility
```

### Decision
**Option B: Auto Switching**

Auto-determined by time of day + shuttle status

### Rationale
1. "Execute without thinking"
2. Time doesn't change (reliable)
3. Only shuttle is manual (once per day)
4. Prevents forgetting

### Tradeoffs
- Hard to handle exceptions
- However: covers most cases
- Manual override can be added later

### Result
Success. Switches automatically and accurately.

---

## Decision 9: Manual vs Auto JSON Backup

**Date**: 2026-01-28

### Context
How to back up data in Phase 1?

### Options Considered

#### Option A: Auto Backup
```
Pros:
- Safe
- User doesn't need to worry

Cons:
- Complex to implement
- Where to store? (no server)
```

#### Option B: Manual Backup
```
Pros:
- Simple
- User control

Cons:
- Easy to forget
- Tedious
```

### Decision
**Phase 1: Manual (JSON) -> Phase 3: Auto (Supabase)**

### Rationale
1. Phase 1 is LocalStorage only
2. Auto backup = requires server
3. Having manual backup is better than nothing
4. Automated in Phase 3

### Tradeoffs
- Manual initially
- However: backup feature is provided
- Progressive improvement

### Result
Acceptable. Waiting for Phase 3.

---

## Decision 10: TypeScript vs JavaScript (Phase 1)

**Date**: 2026-01-27

### Context
Language choice for Phase 1 prototype.

### Options Considered

#### Option A: TypeScript
```
Pros:
- Type safety
- Early error detection
- Autocomplete

Cons:
- Build required
- Learning curve
- Takes too long
```

#### Option B: JavaScript
```
Pros:
- Immediate execution
- Simple
- Quick validation

Cons:
- Runtime errors
- No autocomplete
- Hard to refactor
```

### Decision
**Phase 1: JavaScript -> Phase 2: TypeScript**

### Rationale
1. Quick validation first
2. Non-CS background, day 4
3. Types can be added later
4. Learn while transitioning

### Tradeoffs
- Runtime errors possible
- However: types specified via comments
- Formal transition in Phase 2

### Result
Success. Quick validation complete. Learning TypeScript.

---

## Decision 11: Recurring Task Implementation

**Date**: 2026-01-28

### Context
How to implement recurring tasks?

### Options Considered

#### Option A: Template + Auto Generation
```
Pros:
- Original preserved
- History tracking

Cons:
- Complex logic
- Separate storage needed
```

#### Option B: Generate Next Task on Completion
```
Pros:
- Simple implementation
- Uses existing structure

Cons:
- No template management
```

### Decision
**Option B: Generate Next Task on Completion**

### Rationale
1. Phase 1 prioritizes fast implementation
2. Just add repeatType to existing Task structure
3. Complex template system is for Phase 2+

### Result
Success. Simple recurring task implementation.

---

## Decision 12: Completion Feedback (Dopamine)

**Date**: 2026-01-28

### Context
Need satisfying feedback on completion, like Notion.

### Options Considered

#### Option A: Check Animation Only
```
Pros:
- Simple
- Fast

Cons:
- No sustained feedback
```

#### Option B: Animation + Progress + Streak
```
Pros:
- Enhanced dopamine
- Sustained motivation

Cons:
- Complex to implement
```

### Decision
**Option B: Animation + Progress + Streak**

### Rationale
1. Immediate feedback is important for ADHD
2. Consecutive achievement days help habit formation
3. Progress bar provides motivation

### Result
Success. Increased satisfaction with each completion.

---

## Decision 13: PC/Mobile Layout

**Date**: 2026-01-28

### Context
Screen too narrow on PC (600px fixed)

### Options Considered

#### Option A: Simple Enlargement
```
Pros:
- Simple

Cons:
- Space not utilized
```

#### Option B: 3-Column Grid
```
Pros:
- Information at a glance
- Efficient space utilization

Cons:
- Complex to implement
- Requires mobile branching
```

### Decision
**Option B: 3-Column Grid**

- Left: time/status/statistics
- Center: input/task list
- Right: progress/urgent list

### Rationale
1. Multiple information at a glance on PC
2. 1-column maintained on mobile
3. Simple implementation with CSS Grid

### Result
Success. Significantly improved PC usability.

---

## Decision 14: Schedule Tab Addition

**Date**: 2026-01-28

### Context
Want to view weekday/weekend schedules separately

### Decision
Add new "Schedule" tab with filters (All/Today/Weekday/Weekend)

### Rationale
1. Weekdays are work schedule, weekends are personal
2. Date grouping for full overview
3. Uses existing tab structure

### Result
Success. Easy to grasp full schedule.

---

## Decision 15: Current Time & Remaining Time Per Mode

**Date**: 2026-01-28

### Context
Want to know what time it is and when the current mode ends

### Decision
Add current time + remaining time per mode display

### Rationale
1. Time awareness is difficult for ADHD
2. Info like "3 hours until leaving work" is motivating
3. Mode transition timing becomes predictable

### Result
Success. Improved time management awareness.

---

## Future Decisions

### Decision 16: State Management Library (Phase 2)
- Redux vs Zustand vs Context API
- See ROADMAP.md

### Decision 17: Styling (Phase 2)
- CSS Modules vs Styled-Components vs Tailwind
- See ROADMAP.md

### Decision 18: Deployment Platform (Phase 2)
- Vercel vs Netlify vs Cloudflare Pages
- See ROADMAP.md

---

## Decision 16: Modular File Splitting (Tier 1 Tech Debt)

**Date**: 2026-04-07

### Context
13 JS files exceeded 500-line threshold (firebase-sync.js 992, tasks-history.js 871, etc.). Code splitting rule: component 500 lines, service 660 lines. Project had 49 JS files with sequential script loading (no ES6 modules).

### Options Considered

#### Option A: ES6 Module Migration
Pros: Proper import/export, tree-shaking, modern tooling
Cons: Requires bundler setup, scope explosion, breaks sequential loading architecture

#### Option B: File Extraction (Chosen)
Pros: Preserves sequential loading, backward-compatible, incremental
Cons: No static dependency checking, relies on load order discipline

### Chosen Option
**Option B** — Extract cohesive function groups into new files, maintain global scope, update navigator-v5.html script tag order.

### Result
49 → 66 JS files. 17 new files extracted. 10 of 13 original files now under 500 lines.
3 files kept above threshold with rationale:
- `firebase-sync.js` (723): listener state machine — loadFromFirebase/startRealtimeSync share 9 module-level state variables
- `state-types.js` (522): pure declarations (JSDoc typedefs + appState), no logic
- `actions-add.js` (588): task creation domain cohesion (quickAdd + brainDump + detailedAdd)

### Tradeoffs
- Load order in navigator-v5.html is now critical (66 entries)
- globals.js _navFunctions registry must reference functions from files that load before it
- ES6 module migration deferred to Phase 2 (Next.js)

---

## Decision Template

Use this template when a new decision is needed:

```markdown
## Decision X: [Title]

**Date**: YYYY-MM-DD

### Context
[Problem description]

### Options Considered

#### Option A: [Name]
Pros:
-
Cons:
-

#### Option B: [Name]
Pros:
-
Cons:
-

### Decision
**[Chosen option]**

### Rationale
1.
2.

### Tradeoffs
-
-

### Result
Success/Failure/Pending
```

---

**This document is alive. It is updated whenever decisions are made.**

**Last updated: 2026-01-28 (v5.1 extension decisions added)**
