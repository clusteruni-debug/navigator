# Navigator - Initial Setup Guide

> Pushing to GitHub from your work computer

---

## Prerequisites

- Downloaded files (outputs folder)
- GitHub account
- Repository: `clusteruni-debug/To-do-list-for-adhd`

---

## Step 1: Prepare Folder

### 1-1. Organize Files

```bash
# 1. Create folder at desired location
mkdir ~/Documents/navigator-app
cd ~/Documents/navigator-app

# 2. Copy all downloaded files
# (Drag & drop from Finder/Explorer)

# 3. Verify
ls
```

**Required files**:
```
navigator-v5.html     # Main app
manifest.json         # PWA configuration (added in v5.1)
sw.js                 # Service Worker (added in v5.1)
README.md
CONTEXT.md
ROADMAP.md
ARCHITECTURE.md
DECISIONS.md
WORKFLOW.md
SETUP-GUIDE.md
TROUBLESHOOTING.md
.gitignore
```

---

## Step 2: Initialize Git

### 2-1. Git Configuration (one-time only)

```bash
# Set Git user info
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# Verify
git config --list
```

### 2-2. Initialize Repository

```bash
# Navigate to folder (skip if already there)
cd ~/Documents/navigator-app

# Initialize Git
git init

# Check status
git status
```

---

## Step 3: Push to GitHub

### 3-1. Add Files

```bash
# Stage all files
git add .

# Verify
git status

# First commit
git commit -m "v5 prototype complete + documentation added"
```

### 3-2. Connect to GitHub

```bash
# Add remote repository
git remote add origin https://github.com/clusteruni-debug/To-do-list-for-adhd.git

# Verify
git remote -v
```

### 3-3. Push!

```bash
# Set branch name
git branch -M main

# Upload to GitHub
git push -u origin main
```

**Result**:
```
Enumerating objects: ...
Counting objects: ...
Writing objects: ...
Total ... pushed
```

---

## Step 4: Verify

### 4-1. Check on GitHub Web

```
https://github.com/clusteruni-debug/To-do-list-for-adhd
```

**You should see**:
- navigator-v5.html
- README.md
- All .md files
- Commit history

### 4-2. Test App Execution

```bash
# Open in browser
open navigator-v5.html  # Mac
start navigator-v5.html # Windows
```

---

## Step 5: Home Computer Setup

### 5-1. Clone

```bash
# Navigate to desired location
cd ~/Documents

# Copy from GitHub
git clone https://github.com/clusteruni-debug/To-do-list-for-adhd.git

# Enter folder
cd To-do-list-for-adhd

# Verify
ls
```

---

## Step 6: Daily Usage

### Morning (before starting work)

```bash
cd ~/Documents/navigator-app  # or To-do-list-for-adhd
git pull
```

### Evening (after finishing work)

```bash
git add .
git commit -m "Today's work"
git push
```

**That's all there is to it!**

---

## If Problems Occur

### Push Rejected

```bash
git pull
# Resolve conflicts
git push
```

### Something Went Wrong

```bash
# See WORKFLOW.md
# or
# See TROUBLESHOOTING.md
```

---

## Viewing on Mobile

### Temporary Method (Phase 1)

```bash
# 1. View file on GitHub
https://github.com/clusteruni-debug/To-do-list-for-adhd/blob/main/navigator-v5.html

# 2. Click Raw button

# 3. Copy URL

# 4. Use htmlpreview
https://htmlpreview.github.io/?[copied-url]

# Warning: May not work properly
```

### Official Method (Phase 2)

```bash
# After Vercel deployment
https://navigator.vercel.app
# Access from both mobile and PC
```

---

## Checklist

Confirm setup completion:

- [ ] Git initialization complete
- [ ] Pushed to GitHub
- [ ] Files verified on GitHub web
- [ ] navigator-v5.html execution confirmed
- [ ] Task add/complete tested
- [ ] Cloned on home computer (if applicable)

---

## Next Steps

### Phase 2 Preparation

```bash
# Read ROADMAP.md
# Check Phase 2: Next.js migration plan

# Start with Claude Code
# Proceed in a separate conversation
```

---

## Tips

### Tip 1: Commit Frequently

```bash
# Good habit
Morning work -> commit
After lunch -> commit
Evening -> commit
```

### Tip 2: Meaningful Messages

```bash
# Good example
git commit -m "Add dashboard statistics"

# Bad example
git commit -m "fix"
```

### Tip 3: Daily Backup

```bash
# In the app
Export -> Save JSON

# With Git
git push -> Auto backup to GitHub
```

---

## Done!

**Congratulations! Git setup complete!**

Now:
- Work from anywhere (office/home)
- Track history
- Safe backups
- Continue development with Claude Code

---

**Next**: Start daily workflow with WORKFLOW.md!
