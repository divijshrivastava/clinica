# CI/CD Setup Guide

## Overview

Automated deployment pipeline using GitHub Actions:
- **Backend** → Automatically deploys to Fly.io when `backend/**` files change
- **Frontend** → Automatically deploys to Vercel when `frontend/**` files change

---

## Setup Steps

### 1. Get Fly.io API Token

```bash
# Generate Fly.io token
fly auth token
```

Copy the token output.

### 2. Get Vercel Token

```bash
# Login to Vercel
vercel login

# Generate token
vercel token create mymedic-ci-cd
```

Or get it from Vercel dashboard:
1. Go to https://vercel.com/account/tokens
2. Click "Create Token"
3. Name: `mymedic-ci-cd`
4. Scope: Full Access
5. Copy the token

### 3. Add Secrets to GitHub

Go to your GitHub repository: https://github.com/divijshrivastava/clinica

1. Click **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**

Add these two secrets:

**Secret 1: FLY_API_TOKEN**
- Name: `FLY_API_TOKEN`
- Value: Paste your Fly.io token from step 1

**Secret 2: VERCEL_TOKEN**
- Name: `VERCEL_TOKEN`
- Value: Paste your Vercel token from step 2

---

## How It Works

### Backend Deployment

**Trigger**: Push to `main` branch that modifies files in `backend/` directory

**Process**:
1. Checkout code
2. Setup Node.js 18
3. Install dependencies (`npm ci`)
4. Build TypeScript (`npm run build`)
5. Deploy to Fly.io using `flyctl deploy`

**Workflow File**: `.github/workflows/deploy-backend.yml`

**Estimated Time**: 2-3 minutes

### Frontend Deployment

**Trigger**: Push to `main` branch that modifies files in `frontend/` directory

**Process**:
1. Checkout code
2. Setup Node.js 18
3. Install Vercel CLI
4. Pull Vercel environment info
5. Build production artifacts
6. Deploy to Vercel

**Workflow File**: `.github/workflows/deploy-frontend.yml`

**Estimated Time**: 1-2 minutes

---

## Testing CI/CD

### Test Backend Deployment

```bash
# Make a small change to backend
cd backend
echo "# CI/CD Test" >> README.md

# Commit and push
git add .
git commit -m "test: trigger backend CI/CD"
git push origin main
```

### Test Frontend Deployment

```bash
# Make a small change to frontend
cd frontend
echo "# CI/CD Test" >> README.md

# Commit and push
git add .
git commit -m "test: trigger frontend CI/CD"
git push origin main
```

### Monitor Deployments

- **GitHub Actions**: https://github.com/divijshrivastava/clinica/actions
- **Fly.io Dashboard**: https://fly.io/dashboard
- **Vercel Dashboard**: https://vercel.com/dashboard

---

## Deployment Status Badges (Optional)

Add these to your README.md:

```markdown
## Deployment Status

![Backend Deployment](https://github.com/divijshrivastava/clinica/workflows/Deploy%20Backend%20to%20Fly.io/badge.svg)
![Frontend Deployment](https://github.com/divijshrivastava/clinica/workflows/Deploy%20Frontend%20to%20Vercel/badge.svg)
```

---

## What Happens on Push

### Scenario 1: Change backend code
```bash
git add backend/
git commit -m "fix: update API endpoint"
git push
```
→ ✅ Backend workflow runs
→ ✅ Deploys to Fly.io
→ ⏭️ Frontend workflow skipped (no changes)

### Scenario 2: Change frontend code
```bash
git add frontend/
git commit -m "feat: add new dashboard widget"
git push
```
→ ⏭️ Backend workflow skipped (no changes)
→ ✅ Frontend workflow runs
→ ✅ Deploys to Vercel

### Scenario 3: Change both
```bash
git add backend/ frontend/
git commit -m "feat: add new feature"
git push
```
→ ✅ Both workflows run in parallel
→ ✅ Both deploy simultaneously

---

## Deployment Notifications

### GitHub Actions Notifications

By default, you'll receive email notifications for:
- ✅ Successful deployments
- ❌ Failed deployments

Configure in GitHub Settings → Notifications

### Slack/Discord Notifications (Optional)

Add to workflow files:

```yaml
      - name: Notify Slack
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Troubleshooting

### Backend Deployment Fails

**Check**:
1. Fly.io token is correct: `FLY_API_TOKEN` secret
2. Build succeeds locally: `cd backend && npm run build`
3. View logs in GitHub Actions

**Common Issues**:
- TypeScript compilation errors → Fix in code
- Missing dependencies → Run `npm install` locally first
- Fly.io quota exceeded → Check Fly.io dashboard

### Frontend Deployment Fails

**Check**:
1. Vercel token is correct: `VERCEL_TOKEN` secret
2. Build succeeds locally: `cd frontend && npm run build`
3. View logs in GitHub Actions

**Common Issues**:
- Build errors → Fix TypeScript/Vite errors
- Environment variables missing → Check `.env.production`
- Vercel quota exceeded → Check Vercel dashboard

---

## Manual Deployment (Fallback)

If CI/CD fails, you can always deploy manually:

```bash
# Backend
cd backend
fly deploy --ha=false

# Frontend
cd frontend
vercel --prod
```

---

## Best Practices

### Branch Protection

Recommended: Set up branch protection for `main`:
1. GitHub → Settings → Branches
2. Add rule for `main`
3. Enable: "Require status checks to pass before merging"
4. Select: Backend and Frontend deployment workflows

### Staging Environment

For testing before production:

1. Create `staging` branch
2. Deploy to separate Fly.io app and Vercel project
3. Test on staging first
4. Merge to `main` when ready

### Rollback Strategy

If deployment breaks production:

```bash
# Quick rollback to previous deployment

# Backend
fly releases list
fly releases rollback <version>

# Frontend (Vercel)
# Go to Vercel dashboard → Deployments → Click previous deployment → Promote to Production
```

---

## Security Notes

⚠️ **Important**:
- Never commit tokens to git
- Rotate tokens every 90 days
- Use GitHub secrets for sensitive data
- Enable 2FA on all accounts

---

## Next Steps

1. ✅ Get Fly.io token
2. ✅ Get Vercel token
3. ✅ Add secrets to GitHub
4. ✅ Test deployments
5. ✅ Monitor first few deployments
6. ✅ Set up branch protection (optional)
7. ✅ Configure deployment notifications (optional)

---

**Your deployment pipeline is ready!** Every push to `main` will automatically deploy your changes. 🚀
