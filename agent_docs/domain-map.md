# Navigator — CC/CX File Ownership

| Domain | File/Directory | Owner | Rationale |
|--------|---------------|:-----:|-----------|
| Main App | navigator-v5.html (787KB) | CC | Entire app in single file, wide change impact |
| Rhythm Engine | js/rhythm.js (68KB) | CC | Complex business logic |
| Commute Engine | js/commute.js | CX | Independent module |
| Service Worker | sw.js | CX | Boilerplate |

> Due to the single HTML architecture, UI changes are often handled by CC as well.
