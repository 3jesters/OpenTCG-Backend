# GitHub Setup Guide

This guide documents the steps to set up a repository for pushing to GitHub using SSH authentication.

## Prerequisites

- Git installed and configured
- GitHub account created
- Terminal/command line access

## Step 1: Configure Git Identity

Set your Git identity (name and email) to match your GitHub account:

```bash
git config --global user.name "3jesters"
git config --global user.email "amitbenvenisti@gmail.com"
```

Verify the configuration:
```bash
git config --global user.name
git config --global user.email
```

## Step 2: Generate SSH Key for GitHub

Generate a new SSH key specifically for GitHub (if you don't already have one):

```bash
ssh-keygen -t ed25519 -C "amitbenvenisti@gmail.com" -f ~/.ssh/id_ed25519_github -N ""
```

This creates:
- Private key: `~/.ssh/id_ed25519_github`
- Public key: `~/.ssh/id_ed25519_github.pub`

## Step 3: Configure SSH for GitHub

Update or create `~/.ssh/config` to use the GitHub-specific key:

```bash
# Open or create the SSH config file
nano ~/.ssh/config
# or
vim ~/.ssh/config
```

Add or update the following configuration:

```
Host github.com
  AddKeysToAgent yes
  IdentityFile ~/.ssh/id_ed25519_github
```

## Step 4: Add SSH Key to SSH Agent

Add the key to your SSH agent:

```bash
ssh-add ~/.ssh/id_ed25519_github
```

Verify it was added:
```bash
ssh-add -l
```

## Step 5: Add SSH Key to GitHub

1. **Display your public key:**
   ```bash
   cat ~/.ssh/id_ed25519_github.pub
   ```

2. **Copy the entire output** (it should look like):
   ```
   ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIJJl786qNQrspi+ud3miiZ8obo4kOjhqT0Ev80rdb0IE amitbenvenisti@gmail.com
   ```

3. **Add to GitHub:**
   - Go to https://github.com/settings/keys
   - Click "New SSH key"
   - Title: Enter a descriptive name (e.g., "MacBook Pro" or "Development Machine")
   - Key: Paste your public key
   - Click "Add SSH key"

## Step 6: Test SSH Connection

Test that your SSH key is working:

```bash
ssh -T git@github.com
```

You should see:
```
Hi 3jesters! You've successfully authenticated, but GitHub does not provide shell access.
```

If you see this message, your SSH setup is working correctly.

## Step 7: Create GitHub Repository

1. Go to https://github.com/new
2. Repository name: Enter your project name (e.g., "OpenTCG-Client")
3. Description: (Optional) Add a description
4. Visibility: Choose Public or Private
5. **Important:** Do NOT initialize with README, .gitignore, or license (since you already have a local repository)
6. Click "Create repository"

## Step 8: Add GitHub Remote to Your Repository

Navigate to your project directory and add the GitHub remote:

```bash
cd /path/to/your/project
git remote add origin git@github.com:3jesters/YOUR-REPO-NAME.git
```

Replace `YOUR-REPO-NAME` with your actual repository name.

Verify the remote was added:
```bash
git remote -v
```

You should see:
```
origin	git@github.com:3jesters/YOUR-REPO-NAME.git (fetch)
origin	git@github.com:3jesters/YOUR-REPO-NAME.git (push)
```

## Step 9: Commit Any Pending Changes

If you have uncommitted changes, commit them first:

```bash
# Check status
git status

# Add files
git add .

# Commit
git commit -m "chore: initial commit"
# or use a more descriptive message
```

## Step 10: Push to GitHub

Push your code to GitHub:

```bash
git push -u origin main
```

If your default branch is named `master` instead of `main`:
```bash
git push -u origin master
```

The `-u` flag sets up tracking so future pushes can just use `git push`.

## Step 11: Verify Push

Visit your repository on GitHub to verify all files were pushed:
```
https://github.com/3jesters/YOUR-REPO-NAME
```

## Troubleshooting

### SSH Connection Issues

If you get "Permission denied" errors:
1. Verify your SSH key is added to GitHub (Step 5)
2. Check your SSH config file (Step 3)
3. Ensure the key is in the SSH agent: `ssh-add -l`
4. Try adding the key again: `ssh-add ~/.ssh/id_ed25519_github`

### Remote Already Exists

If you get "remote origin already exists":
```bash
# Remove existing remote
git remote remove origin

# Add the correct remote
git remote add origin git@github.com:3jesters/YOUR-REPO-NAME.git
```

Or update the existing remote:
```bash
git remote set-url origin git@github.com:3jesters/YOUR-REPO-NAME.git
```

### HTTPS Instead of SSH

If you prefer HTTPS (requires Personal Access Token):
```bash
git remote set-url origin https://github.com/3jesters/YOUR-REPO-NAME.git
```

Then when pushing, you'll be prompted for:
- Username: `3jesters`
- Password: Your Personal Access Token (not your GitHub password)

## Quick Reference

**GitHub Account:**
- Username: `3jesters`
- Email: `amitbenvenisti@gmail.com`
- SSH Key Location: `~/.ssh/id_ed25519_github`

**Common Commands:**
```bash
# Check git identity
git config --global user.name
git config --global user.email

# Check SSH connection
ssh -T git@github.com

# Check remote
git remote -v

# Push changes
git push
```

## Notes

- The SSH key setup (Steps 2-6) only needs to be done once per machine
- For each new repository, you only need to:
  1. Create the repository on GitHub (Step 7)
  2. Add the remote (Step 8)
  3. Push your code (Step 10)
