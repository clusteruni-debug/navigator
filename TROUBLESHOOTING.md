# Navigator - Troubleshooting Guide

> Common problems and solutions

---

## Emergency Situations

### App Won't Open (Black Screen)

**Symptom**: Opening navigator-v5.html shows only a black screen

**Causes**:
1. JavaScript error
2. Browser compatibility
3. File corruption

**Solution**:
```bash
# 1. Check browser console
F12 (Developer Tools) -> Console tab -> Check errors

# 2. Try a different browser
Try Chrome, Safari, Firefox

# 3. Re-download files
Get the latest version from GitHub
```

---

### Data Is Gone

**Symptom**: Entire task list has disappeared

**Causes**:
1. LocalStorage was cleared
2. Browser cache cleared
3. Different browser/incognito mode

**Solution**:
```bash
# 1. If you have a JSON backup
Import button -> Select backup file -> Restore

# 2. If no backup exists
Recovery is not possible
-> Back up frequently going forward

# 3. Prevention
Click Export every evening
```

---

### Cannot Add Tasks

**Symptom**: Nothing happens when pressing the + button

**Causes**:
1. Title not entered
2. JavaScript error
3. LocalStorage is full

**Solution**:
```bash
# 1. Check if title was entered
Empty field -> Toast notification "Please enter a title"

# 2. Check console errors
F12 -> Console -> Error message

# 3. Check LocalStorage capacity
F12 -> Application -> Local Storage
-> Delete old tasks if over 5MB
```

---

## Git Issues

### Git Push Rejected

**Symptom**:
```
! [rejected] main -> main (non-fast-forward)
error: failed to push some refs
```

**Cause**: Someone else pushed first

**Solution**:
```bash
# 1. Pull latest code
git pull

# 2. If no conflicts, resolved automatically
git push

# 3. If conflicts exist (see below)
```

---

### Git Conflict

**Symptom**:
```
CONFLICT (content): Merge conflict in navigator-v5.html
Automatic merge failed; fix conflicts and then commit.
```

**Solution**:
```bash
# 1. Open conflicting file
code navigator-v5.html

# 2. Find <<<<<<< ======= >>>>>>>
<<<<<<< HEAD
My code
=======
GitHub code
>>>>>>> origin/main

# 3. Choose
# Option A: Keep my code only
My code

# Option B: Keep GitHub code only
GitHub code

# Option C: Keep both
My code
GitHub code

# 4. Delete markers and save

# 5. Complete
git add .
git commit -m "Resolve conflict"
git push
```

**Tip**: VSCode lets you resolve with buttons
```
Accept Current Change
Accept Incoming Change
Accept Both Changes
```

---

### Git Clone Failed

**Symptom**:
```
fatal: could not read Username
```

**Cause**: GitHub authentication issue

**Solution**:
```bash
# Option A: Personal Access Token
GitHub -> Settings -> Developer settings
-> Personal access tokens -> Generate new token
-> Check repo -> Generate
-> Copy token

git clone https://TOKEN@github.com/clusteruni-debug/To-do-list-for-adhd.git

# Option B: SSH (recommended)
ssh-keygen -t ed25519 -C "your_email@example.com"
cat ~/.ssh/id_ed25519.pub
# GitHub -> Settings -> SSH Keys -> Add
git clone git@github.com:clusteruni-debug/To-do-list-for-adhd.git
```

---

## PWA & Notification Issues (added in v5.1)

### Notifications Not Coming

**Symptom**: Deadline notifications are not received

**Causes**:
1. Notification permission denied
2. Browser terminated in background
3. Checked between 5-minute interval checks

**Solution**:
```bash
# 1. Check notification permission
Browser settings -> Site settings -> Notifications -> Allow

# 2. App must be open
Current version does not use server push
-> Will be improved in Phase 3

# 3. Refresh the page
F5 or Cmd+R
```

---

### Cannot Install to Home Screen

**Symptom**: "Add to Home Screen" option is not available

**Causes**:
1. Not HTTPS (local file)
2. manifest.json issue
3. No icons

**Solution**:
```bash
# Available after Phase 2 (Vercel deployment)
Currently a local file, so installation is not possible
-> Will be resolved in Phase 2

# Temporary method (PC)
Chrome -> More -> Create shortcut
```

---

### Service Worker Error

**Symptom**: SW error in console

**Solution**:
```bash
# 1. Clear cache
F12 -> Application -> Clear Storage -> Clear site data

# 2. Re-register SW
Restart browser

# 3. Check files
sw.js must be in the same folder as navigator-v5.html
```

---

## Mobile Issues

### Swipe Not Working

**Symptom**: No response when swiping left/right

**Causes**:
1. Touch events not supported
2. Insufficient swipe distance (100px+ required)
3. Browser gesture conflict

**Solution**:
```bash
# 1. Swipe far enough
100px or more (about 1/3 of screen)

# 2. Use buttons
Check button for complete
X button for delete

# 3. Try different browser
Safari -> Try Chrome
```

---

### Vibration Not Working

**Symptom**: No vibration on completion

**Causes**:
1. No browser permission
2. Silent mode on
3. Vibration not supported

**Solution**:
```bash
# 1. Check browser permissions
Settings -> Safari/Chrome -> Allow vibration

# 2. Turn off silent mode
Check physical button

# 3. Vibration not supported
Some browsers/devices don't support it
-> This is normal
```

---

### Screen Too Small

**Symptom**: Text too small on mobile

**Cause**: Browser zoom setting

**Solution**:
```bash
# iOS
Settings -> Display & Brightness -> Text Size

# Android
Settings -> Display -> Font Size

# Browser
Pinch to zoom
```

---

## Bugs & Errors

### "It's Okay If You Can't" Not Showing?

**Symptom**: No encouragement message even with 0 completions

**Cause**: No tasks exist at all

**Solution**:
```bash
# It shows when you have tasks but complete 0
Add 1 task -> Don't complete it -> Wait
-> "It's okay if you can't" message appears
```

---

### Time Not Progressing

**Symptom**: Sleep countdown is frozen

**Cause**: setInterval was interrupted

**Solution**:
```bash
# Refresh
F5 or Cmd+R

# Restart browser
Fully close and relaunch
```

---

### Priority Seems Wrong

**Symptom**: Important tasks are at the bottom

**Causes**:
1. No deadline set
2. Category is low
3. Algorithm characteristics

**Solution**:
```bash
# 1. Add a deadline
Edit button -> Set deadline
-> Priority goes up

# 2. Change category
Side Job -> Main Job
-> Score +5

# 3. Manual adjustment (later)
Currently not possible manually
Will be added in Phase 2
```

---

## PC Issues

### Full List Not Showing

**Symptom**: Clicking doesn't expand the list

**Cause**: Version earlier than v4

**Solution**:
```bash
# Confirm using v5
Must open navigator-v5.html

# Download latest version
Re-download from GitHub
```

---

### Window Too Narrow (PC)

**Symptom**: Fixed at 600px on large PC screen

**Cause**: Mobile-first design

**Solution**:
```bash
# Will be resolved in Phase 2
Currently fixed at 600px

# Temporary fix: Resize browser window
Adjust window size
```

---

## Settings Issues

### Shuttle Mode Changes Automatically

**Symptom**: Resets even after setting

**Cause**: Not saved to LocalStorage (bug)

**Solution**:
```bash
# Fixed in v5
Confirm using latest version

# If still an issue
F12 -> Console -> Check errors
-> File a GitHub Issue
```

---

## Security

### Can Others See My Tasks?

**Answer**: No, impossible.

**Reason**:
```
v5 (current):
- LocalStorage (local only)
- Nothing goes over the internet
- Completely local

v6+ (future):
- Supabase (server)
- Login required
- RLS (Row Level Security)
-> Only your own data accessible
```

---

## Performance Issues

### Slow With 100 Tasks

**Symptom**: Slow rendering, stuttering

**Cause**: Full re-rendering

**Solution**:
```bash
# Short-term:
Delete old tasks
Delete completed tasks

# Long-term:
Migrate to React in Phase 2
-> Significant performance improvement
```

---

### Browser Getting Slow

**Symptom**: Everything slows down when app is open

**Causes**:
1. LocalStorage capacity exceeded
2. Memory leak
3. Too many background tabs

**Solution**:
```bash
# 1. Clean up LocalStorage
Delete unnecessary tasks

# 2. Restart browser
Fully close and relaunch

# 3. Close background tabs
Clean up unused tabs
```

---

## Unrecoverable Issues

### All Data Is Truly Gone

**Symptom**: No backup, cannot recover

**Solution**:
```bash
# 1. Accept it
Recovery is not possible
LocalStorage has no backup

# 2. Start over
With a fresh mindset

# 3. Prevention
Back up daily!
Auto backup from Phase 3 onward
```

---

### Git Is Completely Broken

**Symptom**: Nothing works

**Solution**:
```bash
# Nuclear option: Git reset
rm -rf .git
git init
git add .
git commit -m "Fresh start"
git remote add origin https://github.com/clusteruni-debug/To-do-list-for-adhd.git
git push -f origin main

# Warning: History will be lost
```

---

## Asking for Help

### Problem Not Listed Here

**Method 1: GitHub Issue**
```
https://github.com/clusteruni-debug/To-do-list-for-adhd/issues
-> New Issue
-> Describe the problem in detail
```

**Method 2: Ask Claude**
```
Claude Web or Claude Code
-> Attach CONTEXT.md
-> Describe the problem
```

**Information to include**:
1. Symptom (what isn't working?)
2. Reproduction steps (how to trigger it?)
3. Error message (F12 -> Console)
4. Browser/OS (Chrome/Safari, Mac/Windows)
5. Version (confirm it's v5)

---

## Prevention Is Best

### Back Up Daily
```bash
# Evening routine
1. Click Export
2. Save file (include date in name)
3. Upload to Google Drive/iCloud
```

### Commit Frequently
```bash
# When using Git
git add .
git commit -m "Today's work"
git push

# Safe when it's on GitHub
```

### Test Multiple Browsers
```bash
# Occasionally
Open in Chrome
Open in Safari
-> Confirm both work
```

---

## Additional Resources

### Official Documentation
- README.md: Project overview
- CONTEXT.md: Full context
- WORKFLOW.md: Git usage

### Community
- GitHub Discussions (later)
- Discord (later)

---

**If the problem isn't resolved, file an Issue!**

**GitHub Issues**: https://github.com/clusteruni-debug/To-do-list-for-adhd/issues
