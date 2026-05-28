# X Analysis - Twitter/X Post Analysis Tool

## Project
- **Name**: X Analysis
- **Stack**: Python 3 (script-based)
- **One-liner**: X (Twitter) post data analysis + insight extraction

---

## Absolute Rules (Stop work on violation)

**Always stop and confirm:**
1. File/function deletion
2. Modifying 3+ files simultaneously
3. Overwriting existing analysis result files
4. Adding/removing dependencies

**Strictly forbidden:**
- Overwriting working code without confirmation
- Repeating the same approach 3+ times for the same error
- Modifying original data files

---

## Proactive Work Principles (Go beyond what's asked)

> **Core: Don't just fix what's requested — find other places with the same problem and fix them together, and proactively prevent anticipated issues.**

### 1. Comprehensive Pattern Fix
- When fixing one place, **search for identical patterns everywhere else** and fix them together
- Show the full list of discovered instances before proceeding
- Format:
  ```
  Identical pattern found: [N] locations
  1. [file:line] — [code summary]
  2. ...
  Fix all together?
  ```

### 2. Side-Effect Prediction & Proactive Suggestions
- When modifying code, **analyze what could break and affected features first, then suggest**
- Not just "there's an impact" but **specific scenarios + solutions** together
- Format:
  ```
  Expected side-effects:
  1. [Scenario] -> [Solution] (recommend fixing now)
  2. [Scenario] -> [Solution] (can be done later)

  Apply now?
  ```

### 3. Difficulty Assessment -> Ralph Loop Suggestion
Suggest `/ralph-loop` usage **first** when these conditions apply:
- Batch work with **10+ scattered** modification targets
- **Repetitive pattern fixes** (bulk replacement, batch refactoring)
- **Multi-step implementation** difficult to complete at once
- Format:
  ```
  High-difficulty task detected
  - Expected modifications: [N] locations / [N] steps
  - Recommend: `/ralph-loop "[task description]" --max 10`
  - Reason: [why iterative loop is appropriate]

  Proceed with Ralph or manually?
  ```

### 4. Proactive Quality Improvements
The following issues found during work are **reported immediately without asking** (fixes applied after confirmation):
- Security vulnerabilities (hardcoded keys, sensitive data exposure)
- Obvious bugs (null references, typos, logic errors)
- Performance issues (unnecessary loops, memory leaks)

---

## Plan Format

```
Request: [understood content]

Impact: [files to modify] -> [affected features]

Plan:
1. [step]
2. ...

Identical patterns: [full search results — N locations found, suggest fixing together]

Side-effects: [predicted issues + solutions]

Difficulty: [suggest Ralph Loop if high]

Proceed?
```

---

## Work Rules

**Code:**
- Comments/commits: Korean
- One feature at a time
- Complex logic: explain "why" with comments

**Error handling:**
- 1-2 times: fix directly
- 3 times: suggest different approach
- 5 times: stop, commit current state, present options

**Commits:**
- Only from a working state
- Format: `feat:`, `fix:`, `refactor:`
- Commit immediately after code changes (don't batch multiple features)

---

## Session Protocol

**Start:**
1. Read this file
2. Suggest "Last time [X], today shall we do [Y]?"
3. Check local repo status (`git status`)

**In progress:**
- For large tasks (3+ steps), set **phase-by-phase checkpoints**
- Commit immediately after each phase completion

**End (required):**
- Record completed/in-progress/next
- Clearly record resume point for incomplete work

---

## Security Rules

1. Personal Twitter data (archive) — **never push to git**
2. Check whether analysis results contain personally identifiable information
3. API keys -> use environment variables

---

## File Structure

```
X Analysis/
└── CLAUDE.md           # Project context (analysis scripts/data not yet created)
```

> **Note**: scripts/, data/, assets/ etc. will be created when analysis work begins

---

## Quick Commands

| Situation | What to say |
|-----------|-------------|
| Before implementation | "Analyze impact first" |
| Pattern check | "Check if other places need this too" |
| Verification | "Verify and show test scenarios" |
| Large-scale work | "Split into phases and commit at each step" |
| Security cleanup | "Full scan first, show the list" |
| Session management | "Tell me how far we can get this session" |
