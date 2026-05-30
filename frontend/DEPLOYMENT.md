# Deployment Guide — AI Automation Platform Frontend

## Vercel Deployment

### Required GitHub Secrets
Add these in GitHub → Settings → Secrets → Actions:
- `VERCEL_TOKEN`       — from Vercel → Account Settings → Tokens
- `VERCEL_ORG_ID`      — from Vercel → Settings (team or personal)
- `VERCEL_PROJECT_ID`  — from Vercel → Project → Settings → General

### Required Vercel Environment Variables
Set these in Vercel → Project → Settings → Environment Variables:

| Variable                | Value                              | Environments        |
|-------------------------|------------------------------------|---------------------|
| NEXT_PUBLIC_API_URL     | https://api.yourdomain.com         | Production, Preview |
| NEXT_PUBLIC_APP_URL     | https://app.yourdomain.com         | Production          |
| NEXT_PUBLIC_APP_URL     | https://your-branch.vercel.app     | Preview             |
| NEXT_PUBLIC_APP_ENV     | production                         | Production          |
| NEXT_PUBLIC_APP_ENV     | staging                            | Preview             |

### OAuth Callback URLs
Update these in each OAuth provider's developer console to match production:
- Google/Gmail:   https://api.yourdomain.com/api/v1/integrations/oauth/callback
- Twitter:        https://api.yourdomain.com/api/v1/integrations/oauth/callback
- LinkedIn:       https://api.yourdomain.com/api/v1/integrations/oauth/callback
- HubSpot:        https://api.yourdomain.com/api/v1/integrations/oauth/callback

Frontend OAuth return URL (`NEXT_PUBLIC_APP_URL` + `/integrations/callback`):
  https://app.yourdomain.com/integrations/callback

### Custom Domain Setup
1. Vercel Dashboard → Project → Settings → Domains
2. Add: `app.yourdomain.com`
3. Add CNAME record: `app` → `cname.vercel-dns.com`
4. SSL is automatic via Vercel

### First Deploy Checklist
- [ ] GitHub secrets set (VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID)
- [ ] Vercel env vars set for Production and Preview
- [ ] Backend deployed and `/health/ready` returns `{"status":"ready"}`
- [ ] `NEXT_PUBLIC_API_URL` points to live backend
- [ ] OAuth callback URLs updated in all provider consoles
- [ ] Custom domain configured in Vercel
- [ ] Push to `main` branch — CI pipeline triggers automatically
- [ ] Smoke tests pass in GitHub Actions
- [ ] Manual verification: login, create automation, check integrations page

### Rolling Back
Vercel keeps all previous deployments. To roll back:
Vercel Dashboard → Deployments → select a prior build → "..." → Promote to Production
