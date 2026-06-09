# GitHub Setup Guide - Connect from Another PC

**Last Updated:** 2026-06-09  
**Repository:** https://github.com/MohamedAbdeltwabAli/skill-matrix.git  
**Project:** Skill Matrix - Technical Skills Assessment System

---

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Step 1: Install Git](#step-1-install-git)
3. [Step 2: Configure Git](#step-2-configure-git)
4. [Step 3: Choose Authentication Method](#step-3-choose-authentication-method)
5. [Step 4: Clone the Repository](#step-4-clone-the-repository)
6. [Step 5: Verify Setup](#step-5-verify-setup)
7. [Making Changes & Pushing](#making-changes--pushing)
8. [Common Workflows](#common-workflows)
9. [Troubleshooting](#troubleshooting)
10. [Quick Reference](#quick-reference)

---

## Prerequisites

You need:
- ✅ A Windows/Mac/Linux PC
- ✅ Internet connection
- ✅ Administrator access (for installing Git)
- ✅ GitHub account (the same one: MohamedAbdeltwabAli)
- ✅ PowerShell or Terminal access

---

## Step 1: Install Git

### **For Windows:**

1. Go to https://git-scm.com/download/win
2. Download the installer (should be around 50MB)
3. Run the installer executable
4. **Installation Settings** - Use defaults for most options:
   - Choose install location (default is fine)
   - Select components: Keep all checked
   - Default editor: Choose "Visual Studio Code" if installed, otherwise "Notepad"
   - Choose "Git from the command line and also from 3rd-party software"
   - Use bundled OpenSSH (recommended)
   - Use Windows' default console window
   - Default behavior for line endings: "Checkout Windows-style, commit Unix-style"
5. Complete installation
6. Restart your PC (recommended)

### **Verify Installation:**

Open PowerShell and type:
```powershell
git --version
```

Should show something like: `git version 2.42.0.windows.2`

---

## Step 2: Configure Git

This is a one-time setup. Every commit you make will use these settings.

### **Open PowerShell and run:**

```powershell
git config --global user.name "Mohamed Abdeltwab Ali"
git config --global user.email "mmesba01@elaraby.com"
```

**Verify configuration:**
```powershell
git config --global --list
```

Should show:
```
user.name=Mohamed Abdeltwab Ali
user.email=mmesba01@elaraby.com
```

### **Optional: Set Default Editor**
```powershell
git config --global core.editor "code"  # for VS Code
# or
git config --global core.editor "notepad"  # for Notepad
```

---

## Step 3: Choose Authentication Method

You need to choose how Git will authenticate with GitHub. Pick ONE method:

### **Option A: HTTPS with Personal Access Token (Easiest)**

**Best for:** First-time users, simple setup  
**Drawback:** Need to enter token/password on each push

**Steps:**

1. **Generate Personal Access Token:**
   - Go to https://github.com/settings/tokens/new
   - Log in if needed
   - Name: `Skill Matrix Git Access`
   - Expiration: 90 days (or longer if needed)
   - Scopes: Check `repo` (Full control of private repositories)
   - Click "Generate token"
   - **Copy the token and save it somewhere safe** (you won't see it again!)

2. **Store Token for First Push:**
   - When you `git push` for the first time, Git will ask for:
     - Username: `MohamedAbdeltwabAli`
     - Password: Paste the token you copied
   - To avoid re-entering: Store credentials with Windows Credential Manager
     - Windows will offer to save credentials after first use

---

### **Option B: SSH (More Secure & Convenient)**

**Best for:** Regular development, don't want to enter credentials  
**Drawback:** Slightly more setup

**Steps:**

1. **Generate SSH Key Pair:**
   ```powershell
   ssh-keygen -t ed25519 -C "mmesba01@elaraby.com"
   ```
   - When asked for file location, press Enter to use default
   - When asked for passphrase, press Enter (or set one for extra security)
   - Keys are saved in `C:\Users\YourUsername\.ssh\`

2. **Copy Public Key:**
   ```powershell
   Get-Content $env:USERPROFILE\.ssh\id_ed25519.pub
   ```
   - This displays your public key
   - Select all and copy (Ctrl+A, Ctrl+C)

3. **Add Key to GitHub:**
   - Go to https://github.com/settings/keys
   - Click "New SSH key"
   - Title: `My Development PC`
   - Key type: Authentication Key
   - Paste your public key
   - Click "Add SSH key"

4. **Test Connection:**
   ```powershell
   ssh -T git@github.com
   ```
   - First time: type `yes` when asked about authenticity
   - Should see: `Hi MohamedAbdeltwabAli! You've successfully authenticated...`

---

## Step 4: Clone the Repository

### **Choose Your Location:**

Decide where to save the project (Desktop, Documents, etc.):

```powershell
# Navigate to where you want to save it
cd Desktop
# or
cd Documents
# or any other path
```

### **Clone Using HTTPS (Option A):**

```powershell
git clone https://github.com/MohamedAbdeltwabAli/skill-matrix.git
```

First push will ask for credentials.

### **Clone Using SSH (Option B):**

```powershell
git clone git@github.com:MohamedAbdeltwabAli/skill-matrix.git
```

No credentials needed if SSH is set up correctly.

### **Enter the Project Directory:**

```powershell
cd skill-matrix
```

---

## Step 5: Verify Setup

Make sure everything is working:

### **Check Git Status:**
```powershell
git status
```

Should show:
```
On branch main
Your branch is up to date with 'origin/main'.
nothing to commit, working tree clean
```

### **View Recent Commits:**
```powershell
git log --oneline -10
```

Should show the last 10 commits from the repository.

### **Check Remote URL:**
```powershell
git remote -v
```

Should show:
```
origin  https://github.com/MohamedAbdeltwabAli/skill-matrix.git (fetch)
origin  https://github.com/MohamedAbdeltwabAli/skill-matrix.git (push)
```

Or for SSH:
```
origin  git@github.com:MohamedAbdeltwabAli/skill-matrix.git (fetch)
origin  git@github.com:MohamedAbdeltwabAli/skill-matrix.git (push)
```

### **List All Project Files:**
```powershell
ls -la
```

Should show files including `DEVELOPMENT_NOTES.md` and `NEXT_SESSION_PROMPT.md`

---

## Making Changes & Pushing

### **General Workflow:**

```powershell
# 1. Get the latest code from GitHub
git pull origin main

# 2. Make changes to files (edit in your editor/IDE)

# 3. Check what changed
git status

# 4. Stage all changes
git add .

# 5. Create a commit
git commit -m "Describe what you changed"

# 6. Push to GitHub
git push origin main
```

### **Detailed Example:**

```powershell
# Step 1: Update your local copy
git pull origin main

# Output shows:
# Already up to date.

# Step 2: Edit a file (use any editor)
# Edit js/supabase.js or any other file...

# Step 3: Check status
git status

# Output shows:
# On branch main
# Changes not staged for commit:
#   modified:   js/supabase.js
#
# Untracked files:
#   (new file I created).txt

# Step 4: Stage changes
git add .

# Step 5: Commit
git commit -m "Fix: Update Supabase configuration for production"

# Output shows:
# [main a1b2c3d] Fix: Update Supabase configuration for production
#  1 file changed, 2 insertions(+), 1 deletion(-)

# Step 6: Push to GitHub
git push origin main

# Output shows:
# Enumerating objects: 3, done.
# Counting objects: 100% (3/3), done.
# Writing objects: 100% (3/3), 285 bytes | 285.00 KiB/s, done.
# Total 3 (delta 1), reused 0 (delta 0)
# remote: Resolving deltas: 100% (1/1), completed with 1 local object.
# To github.com:MohamedAbdeltwabAli/skill-matrix.git
#    x9y8z7a..a1b2c3d  main -> main
```

---

## Common Workflows

### **Scenario 1: Multiple People Working (Avoid Conflicts)**

```powershell
# Before you start working each day
git pull origin main

# Make your changes
# When ready to push
git add .
git commit -m "Your changes"
git push origin main

# If someone else pushed before you:
# Git will say "rejected"
# Run: git pull origin main
# Resolve any conflicts (Git will mark them)
# Then: git add . && git commit -m "Merge" && git push origin main
```

### **Scenario 2: Undo Last Commit (Before Push)**

```powershell
# See your commit
git log --oneline -1

# Undo it
git reset --soft HEAD~1

# Changes go back to staging area
git status
```

### **Scenario 3: Check What Changed Before Committing**

```powershell
# See differences in one file
git diff js/supabase.js

# See differences in all files
git diff

# Exit by pressing Q
```

### **Scenario 4: View History of a Specific File**

```powershell
git log --oneline js/supabase.js

# See changes in detail
git show a1b2c3d

# (a1b2c3d is the commit hash)
```

---

## Troubleshooting

### **Problem: "Git is not recognized"**

**Solution:**
- Restart PowerShell after installing Git
- Restart your PC if PowerShell restart doesn't work
- Verify installation: `git --version`

---

### **Problem: "Permission denied (publickey)" when using SSH**

**Solution:**
1. Check if SSH key exists:
   ```powershell
   ls $env:USERPROFILE\.ssh\
   ```
   Should show `id_ed25519` and `id_ed25519.pub`

2. Start SSH agent:
   ```powershell
   Start-Service ssh-agent
   ssh-add $env:USERPROFILE\.ssh\id_ed25519
   ```

3. Test connection:
   ```powershell
   ssh -T git@github.com
   ```

---

### **Problem: "fatal: The current branch main has no upstream branch"**

**Solution:**
```powershell
git push -u origin main

# -u sets the upstream branch for future pushes
```

---

### **Problem: "Your branch is ahead of 'origin/main' by 2 commits"**

**Solution:**
You have commits not yet pushed. Push them:
```powershell
git push origin main
```

---

### **Problem: "CRLF vs LF" warning**

**Solution:**
This is normal. Configure Git to handle it:
```powershell
git config --global core.autocrlf true
```

---

### **Problem: "Merge conflict" when pulling**

**Solution:**
1. See conflicts:
   ```powershell
   git status
   ```

2. Open conflicted files in your editor
   - Look for `<<<<<<`, `======`, `>>>>>` markers
   - Decide which version to keep
   - Delete the conflict markers

3. Commit the resolution:
   ```powershell
   git add .
   git commit -m "Resolve merge conflict"
   git push origin main
   ```

---

### **Problem: "Failed to authenticate with https"**

**Solution:**
1. Windows Credential Manager likely has old credentials
2. Open: Settings → Credential Manager → Windows Credentials
3. Find `github.com` and delete it
4. Next `git push` will ask for credentials again
5. Enter your Personal Access Token (not your GitHub password)

---

## Quick Reference

### **Daily Workflow:**

```powershell
# Start of workday
git pull origin main

# Make changes to files...

# When ready to commit
git status
git add .
git commit -m "Clear description of changes"
git push origin main

# End of workday - ensure everything is pushed
git status  # Should show "nothing to commit"
```

### **Essential Commands:**

| Command | Purpose |
|---------|---------|
| `git status` | See current state |
| `git add .` | Stage all changes |
| `git commit -m "msg"` | Create commit with message |
| `git push origin main` | Push to GitHub |
| `git pull origin main` | Get latest from GitHub |
| `git log --oneline -5` | View last 5 commits |
| `git diff` | See what changed |
| `git reset --soft HEAD~1` | Undo last commit |
| `git branch` | List branches |
| `git checkout -b newbranch` | Create new branch |

### **Useful Shortcuts:**

Add to PowerShell profile (`$PROFILE`) for faster access:

```powershell
# Add these aliases to your profile
Set-Alias -Name gs -Value "git status"
Set-Alias -Name gc -Value "git commit -m"
Set-Alias -Name gp -Value "git push origin main"
Set-Alias -Name gpl -Value "git pull origin main"
Set-Alias -Name ga -Value "git add ."
Set-Alias -Name gl -Value "git log --oneline -10"
```

---

## Important Files to Know

When you clone the project, key files are:

| File | Purpose |
|------|---------|
| `DEVELOPMENT_NOTES.md` | Detailed notes on current issues and fixes |
| `NEXT_SESSION_PROMPT.md` | Prompt to give AI for context in next session |
| `js/supabase.js` | Supabase database configuration |
| `index.html` | Employee exam page |
| `admin/index.html` | Admin dashboard |
| `login.html` | Admin/manager login |
| `vercel.json` | Vercel deployment configuration |

---

## Workflow Tips

✅ **Before pushing:** Always do `git pull origin main` first  
✅ **Commit often:** Make small, focused commits with clear messages  
✅ **Write good messages:** "Fix bug in login" vs "asdf" - first is much better  
✅ **Check before commit:** Run `git diff` to review changes  
✅ **Never push directly to main** if working with others - use branches  
✅ **One task per commit:** Don't mix multiple unrelated changes  

---

## Next Steps After Setup

1. **Read the documentation:**
   ```powershell
   cat DEVELOPMENT_NOTES.md
   cat NEXT_SESSION_PROMPT.md
   ```

2. **Understand the current state:** Review what issues exist

3. **Test your access:** Make a small change and push
   ```powershell
   # Add a comment to a file
   git add .
   git commit -m "Test: Verify Git setup from new PC"
   git push origin main
   ```

4. **Check GitHub:** Verify commit appears at https://github.com/MohamedAbdeltwabAli/skill-matrix/commits/main

---

## Support Resources

- **Git Official Docs:** https://git-scm.com/doc
- **GitHub Docs:** https://docs.github.com/
- **SSH Setup Help:** https://docs.github.com/en/authentication/connecting-to-github-with-ssh
- **Personal Access Token:** https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens

---

**Questions?** Reference this guide whenever you need to set up Git on a new PC. All the steps are here!
