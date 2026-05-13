# GitHub Deployment Guide

## Create Repository

1. Go to GitHub.
2. Create a new repository.
3. Suggested repository name:

```text
smallbiz-cyber-ai-readiness-advisor
```

4. Upload all files from this folder.

## Recommended Git Commands

```bash
git init
git add .
git commit -m "Initial release of SmallBiz Cyber AI Readiness Advisor"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/smallbiz-cyber-ai-readiness-advisor.git
git push -u origin main
```

## Enable GitHub Pages

1. Open the repository on GitHub.
2. Go to **Settings**.
3. Click **Pages**.
4. Under **Build and deployment**:
   - Source: Deploy from branch
   - Branch: main
   - Folder: `/root`
5. Save.
6. Wait for the deployment link.

Your link should look like:

```text
https://YOUR-USERNAME.github.io/smallbiz-cyber-ai-readiness-advisor/
```

Use that URL as your live demo link if you do not use Serverbyt.

## Update After Changes

```bash
git add .
git commit -m "Update readiness advisor demo"
git push
```
