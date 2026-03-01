# Navigator - Git Workflow Guide

> A collection of everyday commands

---

## Core 3 Lines (Memorize These)

```bash
git pull    # Morning: pull work done at home/office
git add .   # After work: stage changes
git push    # Evening: push changes to GitHub
```

**This covers 90% of what you need.**

---

## Daily Workflow

### Morning (Before Starting Work)

```bash
# 1. Navigate to folder
cd ~/Documents/navigator-app
# or
cd To-do-list-for-adhd

# 2. Pull latest code
git pull

# Ready to start working!
```

**What it means**:
- `git pull`: Pull work done on another computer at home/office
- Always start with the latest state

---

### Evening (After Finishing Work)

```bash
# 1. Check changes
git status

# 2. Add all changes
git add .

# 3. Commit (save)
git commit -m "Describe today's work"

# 4. Push to GitHub
git push

# Done! Continue from home/office
```

**What it means**:
- `git add .`: Select all changed files
- `git commit`: Save locally (not on GitHub yet)
- `git push`: Upload to GitHub

---

## Initial Setup (One Time Only)

### On Office Computer (Folder Already Exists)

```bash
# 1. Navigate to folder
cd ~/Documents/navigator-project

# 2. Initialize Git
git init

# 3. Add files
git add .

# 4. First commit
git commit -m "v5 prototype complete"

# 5. Connect to GitHub
git remote add origin https://github.com/clusteruni-debug/To-do-list-for-adhd.git

# 6. Upload
git branch -M main
git push -u origin main

# Done! Now just use the daily workflow
```

---

### On Home Computer (First Time)

```bash
# 1. Navigate to desired location
cd ~/Documents

# 2. Clone from GitHub
git clone https://github.com/clusteruni-debug/To-do-list-for-adhd.git

# 3. Enter folder
cd To-do-list-for-adhd

# Done! Now use the daily workflow
```

---

## Commit Message Guide

### Good Examples
```bash
git commit -m "Next-Action screen complete"
git commit -m "Fix priority calculation bug"
git commit -m "Add dashboard statistics"
git commit -m "Implement swipe gesture"
```

### Bad Examples
```bash
git commit -m "fix"         # What was fixed?
git commit -m "asdfgh"      # Incomprehensible
git commit -m "asdf"        # Meaningless
```

### Pattern
```
[verb] [subject]

Add: "Add task edit feature"
Fix: "Improve priority calculation logic"
Remove: "Remove unnecessary comments"
Bug: "Fix input focus bug"
```

---

## Frequently Used Commands

### Check Status
```bash
# View current status
git status

# View change history
git log --oneline

# Last 5 commits
git log -5
```

### View Changes
```bash
# See what changed
git diff

# Specific file only
git diff navigator-v5.html
```

### Branches (For Later)
```bash
# Check current branch
git branch

# Create new branch
git branch feature-name

# Switch branch
git checkout feature-name
```

---

## Common Mistakes & Solutions

### Mistake 1: Pull Without Committing

**Symptom**:
```
error: Your local changes would be overwritten by merge.
```

**Solution**:
```bash
# Option A: Commit now
git add .
git commit -m "work in progress"
git pull

# Option B: Stash temporarily
git stash
git pull
git stash pop
```

---

### Mistake 2: Typo in Commit Message

**Symptom**:
```
git commit -m "add tsk"    # Typo!
```

**Solution**:
```bash
# Fix last commit message
git commit --amend -m "add task"

# OK if not pushed yet
# If already pushed, just leave it (not a big deal)
```

---

### Mistake 3: Conflict

**Symptom**:
```
CONFLICT (content): Merge conflict in navigator-v5.html
```

**Solution**:
```bash
# 1. Open the file
code navigator-v5.html

# 2. Find <<<<<<< ======= >>>>>>> markers
# 3. Choose desired version and remove markers
# 4. Save

# 5. Mark as resolved
git add navigator-v5.html
git commit -m "resolve conflict"
git push
```

**Example**:
```html
<<<<<<< HEAD
<div>Work from office</div>
=======
<div>Work from home</div>
>>>>>>> origin/main
```

**After fixing**:
```html
<div>Work from office</div>
<!-- or -->
<div>Work from home</div>
<!-- or keep both -->
```

---

### Mistake 4: Push Rejected

**Symptom**:
```
! [rejected] main -> main (non-fast-forward)
```

**Solution**:
```bash
# Someone pushed first (or from another computer)
# Pull their changes first
git pull

# If no conflicts, auto-resolved
# If conflicts, see "Mistake 3" above

# Push again
git push
```

---

## Viewing on GitHub Web

### View Code
```
https://github.com/clusteruni-debug/To-do-list-for-adhd
```

### Commit History
```
https://github.com/clusteruni-debug/To-do-list-for-adhd/commits/main
```

### Download Files
```
Code button → Download ZIP
```

---

## Tips & Tricks

### Tip 1: Commit Often
```bash
# Bad
Morning work → one big commit in the evening (hard to track history)

# Good
Complete a feature → commit
Fix a bug → commit
Small change → commit
```

### Tip 2: Use .gitignore
```bash
# Add to .gitignore file
node_modules/
.DS_Store
.env
*.log
```

### Tip 3: Branch Strategy (For Later)
```bash
# main: stable version
# develop: in development
# feature/xxx: new features

git checkout -b feature/dashboard
# work
git commit -m "add dashboard"
git checkout main
git merge feature/dashboard
```

---

## Emergency Situations

### Everything Is Gone!
```bash
# If it's on GitHub, you're fine
rm -rf To-do-list-for-adhd
git clone https://github.com/clusteruni-debug/To-do-list-for-adhd.git

# Recovery complete
```

### Git Is Completely Broken
```bash
# Remove Git but keep folder
rm -rf .git

# Re-initialize
git init
git add .
git commit -m "fresh start"
git remote add origin https://github.com/clusteruni-debug/To-do-list-for-adhd.git
git push -f origin main  # Warning: force push
```

### Accidentally Deleted Something
```bash
# If before commit, recoverable
git checkout -- navigator-v5.html

# If after commit, recover from history
git log  # Find the commit
git checkout <commit-hash> -- navigator-v5.html
```

---

## Learn More

### Recommended Resources
1. GitHub Official Guide: https://docs.github.com
2. Git Simple Guide: https://rogerdudler.github.io/git-guide/
3. Visual Git: https://learngitbranching.js.org/

### Command Cheat Sheet
```bash
# Frequently used
git status      # Check status
git add .       # Add all
git commit      # Commit
git push        # Upload
git pull        # Download

# Occasionally used
git log         # History
git diff        # Changes
git branch      # Branches
git checkout    # Switch

# Rarely used
git reset       # Undo
git revert      # Revert
git stash       # Temporary save
git merge       # Merge
```

---

## Summary: 3 Daily Steps

```bash
# Morning
cd ~/Documents/To-do-list-for-adhd
git pull

# [Work]

# Evening
git add .
git commit -m "today's work"
git push
```

**Just memorize this!**

---

**If problems arise, refer to TROUBLESHOOTING.md**
