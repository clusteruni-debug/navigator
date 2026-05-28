# Navigator - Survival-Mode Task Management

> ADHD-friendly task management app: "Execute without thinking"

[![Status](https://img.shields.io/badge/status-active-success.svg)]()
[![Version](https://img.shields.io/badge/version-5.1-blue.svg)]()
[![License](https://img.shields.io/badge/license-MIT-blue.svg)]()
[![PWA](https://img.shields.io/badge/PWA-ready-brightgreen.svg)]()

---

## What Problem Does It Solve?

### Problem
- **"Todo list -> actual action" gap**: Lists exist but nothing gets done
- **Priority judgment fatigue**: Importance shifts arbitrarily based on mood/fatigue
- **Recording becomes work itself**: Managing Notion itself becomes a burden
- **ADHD characteristics**: Executive function impairment, difficulty multitasking

### Solution
- **Auto priority calculation**: Auto-sorting based on deadline, category, ROI
- **Next-Action single display**: Only one thing to do now, displayed large
- **Auto mode by time of day**: Auto-switching between Work/Survival/Leisure modes
- **Minimize judgment**: Swipe to complete/delete, haptic feedback
- **Completion feedback**: Notion-style check animation, progress display

---

## Current Status (v5.1)

### Completed Features (Core)
- [x] Quick add (title only input)
- [x] Detailed add (category-specific input fields)
- [x] Task edit/delete
- [x] Complete/undo completion
- [x] Swipe gestures (complete/delete)
- [x] Auto priority calculation
- [x] Time-based modes (Work/Survival/Leisure)
- [x] Shuttle mode toggle
- [x] Sleep countdown (after 22:00)
- [x] Deadline visual emphasis (red at 3h, orange at 24h)
- [x] Dashboard (statistics, category status)
- [x] View completed tasks
- [x] JSON backup/restore
- [x] Error handling and toast notifications

### Completed Features (Extended)
- [x] **Recurring tasks** (daily/weekday/weekly/monthly)
- [x] **PWA support** (home screen install, offline caching)
- [x] **Push notifications** (3h/1h before deadline)
- [x] **PC/mobile responsive** (PC 3-column, mobile 1-column)
- [x] **Schedule tab** (weekday/weekend filter, date grouping)
- [x] **Completion animation** (Notion-style check overlay)
- [x] **Progress display** (today's progress, consecutive achievement days)
- [x] **Current time display** (real-time clock, remaining time per mode)
- [x] **Search & filter** (title search, category filter)

### Next Steps
- [ ] Migrate to Next.js (Phase 2)
- [ ] Vercel deployment
- [ ] Supabase integration (login, real-time sync)

### Later
- [ ] Telegram integration
- [ ] X activity tracker
- [ ] Advanced statistics/insights

---

## Tech Stack

### Current (v5.1 - HTML Prototype + PWA)
- **Frontend**: Vanilla JavaScript
- **Storage**: LocalStorage
- **PWA**: manifest.json + Service Worker
- **Deployment**: Local HTML file

### File Structure
```
navigator-app/
├── navigator-v5.html     # Main app
├── manifest.json         # PWA configuration
├── sw.js                 # Service Worker
├── README.md             # Project introduction
├── CONTEXT.md            # Full context
├── ROADMAP.md            # Development roadmap
├── ARCHITECTURE.md       # Technical design
├── DECISIONS.md          # Design decision records
├── WORKFLOW.md           # Git guide
├── SETUP-GUIDE.md        # Initial setup
└── TROUBLESHOOTING.md    # Troubleshooting
```

### Planned (v6+ - Production)
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL + Realtime)
- **Auth**: Supabase Auth
- **Deployment**: Vercel
- **PWA**: next-pwa

---

## Key Features

### 1. Next-Action Screen
```
Display only one thing to do now, large
-> Eliminates judgment
-> Just execute
```

### 2. Auto Priority Calculation
```javascript
priority = f(
  deadline,        // Within 3 hours: +100 points
  category,        // Main Job: +40, Side Job: +35, Daily: +25
  ROI,             // Revenue/time (side jobs only)
  estimatedTime    // 10 min or less: +10
)
```

### 3. Time-Based Modes
- **Work (11:00-20:00)**: Show main job only
- **Survival (22:00-24:00, shuttle missed)**: 15 min or less + urgent only
- **Leisure (19:00-24:00, shuttle caught)**: Show everything
- **Commute (7:00-11:00)**: In transit
- **Rest (other)**: Free time

### 4. Swipe Gestures
- Swipe left: complete
- Swipe right: delete
- Haptic feedback

### 5. Completion Feedback (NEW)
- Notion-style check animation
- Today's progress bar
- Consecutive achievement days (streak) tracking
- Current time & remaining time per mode

### 6. Recurring Tasks (NEW)
- Daily/weekday/weekly/monthly recurring
- Auto-generate next task on completion

---

## Usage

### Installation
```bash
# 1. Clone repository
git clone https://github.com/clusteruni-debug/To-do-list-for-adhd.git
cd To-do-list-for-adhd

# 2. Open in browser
open navigator-v5.html  # Mac
start navigator-v5.html # Windows
```

### Basic Usage
1. **Quick add**: Enter title -> Enter
2. **Detailed add**: "Expand detailed options" -> Enter all information
3. **Complete**: Check button or swipe left
4. **Edit**: Edit button
5. **Delete**: X button or swipe right

### Data Management
- **Backup**: Export -> JSON download
- **Restore**: Import -> JSON upload

---

## Documentation

Essential documents for understanding the project:

1. **[CONTEXT.md](./CONTEXT.md)** - Full context and background
2. **[ROADMAP.md](./ROADMAP.md)** - Development roadmap
3. **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical design
4. **[DECISIONS.md](./DECISIONS.md)** - Design decision records
5. **[WORKFLOW.md](./WORKFLOW.md)** - Git workflow guide
6. **[TROUBLESHOOTING.md](./TROUBLESHOOTING.md)** - Troubleshooting

---

## User Profile

This app is designed for users who:

- **Have ADHD**: Executive function impairment, difficulty judging priorities
- **Are time-constrained**: Childcare + main job + side jobs = time pressure
- **Have high cognitive load**: Need to minimize decision fatigue
- **Prefer immediate feedback**: Visual/tactile feedback

Details: [CONTEXT.md](./CONTEXT.md)

---

## Contributing

This project is currently a personal project.

### Development Environment Setup
```bash
# 1. Fork and clone repository
git clone https://github.com/YOUR_USERNAME/To-do-list-for-adhd.git

# 2. Create branch
git checkout -b feature/your-feature

# 3. Commit changes
git commit -am "Add feature"

# 4. Push
git push origin feature/your-feature

# 5. Create Pull Request
```

---

## License

MIT License - Free to use, modify, and distribute

---

## Contact

- **GitHub**: [@clusteruni-debug](https://github.com/clusteruni-debug)
- **Issues**: [GitHub Issues](https://github.com/clusteruni-debug/To-do-list-for-adhd/issues)

---

## Acknowledgements

- **Claude (Anthropic)**: Full development support
- **Vibe Coding**: A non-CS background person's challenge, day 4

---

**Built with care for people with ADHD, by someone with ADHD**
