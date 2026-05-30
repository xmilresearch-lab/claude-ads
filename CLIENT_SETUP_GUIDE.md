# Your AI Automation Platform — Setup Guide

> This guide will walk you through every step needed to get your platform live
> and working. No technical background required. Each step tells you exactly
> where to go, what to click, and what to copy.

---

## What You're Setting Up

Your platform has two pieces:

| Piece | What it does | Where it runs |
|---|---|---|
| **The engine (backend)** | Handles all the AI, automations, and talks to social platforms | A cloud server (Railway) |
| **The dashboard (frontend)** | The website you log in to and manage everything | Vercel (a web host) |

Both need to be online before the app works.

---

## Time Estimates

| Task | Time |
|---|---|
| Getting your AI key | 5 minutes |
| Deploying the backend (engine) | 20–30 minutes |
| Deploying the frontend (dashboard) | 15–20 minutes |
| Registering social media apps | 1–2 hours |
| First login & setup | 15 minutes |
| **Total** | **~3–4 hours** (can be split across days) |

---

## Accounts You'll Need

Create these accounts before you start. All are free to sign up; some have usage fees.

| Service | Why you need it | Sign up at | Cost |
|---|---|---|---|
| **Railway** | Hosts the backend engine | railway.app | ~$10–$20/month |
| **Vercel** | Hosts the dashboard | vercel.com | Free tier is enough |
| **Anthropic** | Powers the AI (Claude) | console.anthropic.com | Pay per use (~$5–$20/month) |
| **GitHub** | Stores the code (you likely have this) | github.com | Free |

Plus, for any social platform you want to automate, you'll need a **developer account** on that platform. Instructions are in Part 4.

---

---

# PART 1 — Get Your AI Key (5 minutes)

The platform uses Claude AI to generate content. This key is required for anything to work.

1. Go to **https://console.anthropic.com**
2. Click **Sign Up** and create an account, or log in if you already have one
3. After logging in, click your name or email in the top-right corner
4. Click **API Keys** in the dropdown menu
5. Click **+ Create Key**
6. Name it something like `My Automation Platform`
7. Click **Create Key**
8. You'll see a long code starting with `sk-ant-` — **copy it immediately**

> ⚠️ **Important:** You can only see this key once. Paste it into a password manager
> or a secure notes app right now before continuing.

**Save this as:** `ANTHROPIC_API_KEY`

---

---

# PART 2 — Deploy the Backend Engine (20–30 minutes)

The backend is the "brain" — it runs your automations, calls the AI, and connects to social platforms.

## Step 2.1 — Create a Railway account

1. Go to **https://railway.app**
2. Click **Login** then **Login with GitHub**
3. Authorize Railway to access your GitHub account
4. You'll land on your Railway dashboard

## Step 2.2 — Create a new project

1. Click **+ New Project** (large button)
2. Click **Deploy from GitHub Repo**
3. Find the repository named **`claude-ads`** in the list
   - If you don't see it, click **Configure GitHub App** → select the repo → save
4. Click the `claude-ads` repo to select it
5. When prompted to configure the service, click **Add Variables** — but don't fill anything in yet, just continue
6. Click **Deploy** to create the project shell

## Step 2.3 — Add a database (PostgreSQL)

Your app needs a database to store users, automations, and content.

1. In your project, click **+ New** (top right)
2. Click **Database**
3. Click **Add PostgreSQL**
4. Wait about 30 seconds for it to appear in your project
5. Click on the new **PostgreSQL** box that appeared
6. Click the **Variables** tab on the left
7. Find the row labelled **`DATABASE_URL`** — click the copy icon next to it
8. **Save this as:** `DATABASE_URL`

## Step 2.4 — Add a cache (Redis)

Redis handles job queues and temporary data.

1. Click **+ New** again
2. Click **Database**
3. Click **Add Redis**
4. Wait ~30 seconds
5. Click on the new **Redis** box
6. Click the **Variables** tab
7. Find **`REDIS_URL`** — copy it
8. **Save this as:** `REDIS_URL`

## Step 2.5 — Configure your main service

1. Click on your main service (the one that says `claude-ads`)
2. Click the **Settings** tab
3. Under **Root Directory**, type: `backend`
4. Under **Build Command**, type: `pip install -r requirements.txt && alembic upgrade head`
5. Under **Start Command**, type: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Click **Save**

## Step 2.6 — Set your environment variables

1. Click the **Variables** tab on your main service
2. Click **Raw Editor** (this lets you paste all variables at once)
3. Paste the following block, replacing every `YOUR_VALUE_HERE` with the actual values.
   Values you've already collected are marked with where to find them:

```
DATABASE_URL=<paste the DATABASE_URL you copied in Step 2.3>
REDIS_URL=<paste the REDIS_URL you copied in Step 2.4>
ANTHROPIC_API_KEY=<paste your key from Part 1>
CLAUDE_MODEL=claude-sonnet-4-20250514
SECRET_KEY=<generate one at: https://generate-secret.vercel.app/64>
ENCRYPTION_KEY=<generate another one at: https://generate-secret.vercel.app/64>
MCP_AUTH_TOKEN=<generate another one at: https://generate-secret.vercel.app/64>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30
DEBUG=false
VAPID_PUBLIC_KEY=BBWouitioeUSFDsNu0t-qeYt7kKqd1uTH6C8ZawO8W1gYK6Ocm8ZcxkGr_VSHsRyzOl0O2XDpkKJO8nas4oPWCQ
VAPID_PRIVATE_KEY=geaQEgcsqiFpYJ2yYRdznQTVN7-KFMLoOyc-zrWpRFk
VAPID_MAILTO=mailto:<your support email address>
SOCIAL_MCP_URL=http://localhost:3001
EMAIL_MCP_URL=http://localhost:3002
CRM_MCP_URL=http://localhost:3003
ALLOWED_ORIGINS=["https://<your-frontend-vercel-url>"]
```

> ℹ️ **Note about ALLOWED_ORIGINS:** You'll come back and fill in your Vercel URL after
> Part 3. For now, you can leave it as `["http://localhost:3000"]` and update it later.

> ℹ️ **About SECRET_KEY, ENCRYPTION_KEY, and MCP_AUTH_TOKEN:** These are security keys
> that protect your users' data. Visit https://generate-secret.vercel.app/64 three times
> to generate three different random keys. Each must be different.

4. Click **Save Variables**

> ⚠️ **OAuth credentials (Twitter, LinkedIn, Facebook, etc.) will be added in Part 4.**
> Leave those blank for now — you'll add them after registering your apps.

## Step 2.7 — Add the background workers

Your platform needs two background worker processes to send emails, post content, and run scheduled automations.

**Worker 1 — The Task Processor:**

1. Click **+ New** in your project
2. Click **GitHub Repo** → select `claude-ads`
3. Click **Settings** → set Root Directory to `backend`
4. Set Start Command to:
   ```
   celery -A app.workers.celery_app worker --loglevel=info --concurrency=4
   ```
5. Click the **Variables** tab → click **Shared Variables** → select the same variables you set in Step 2.6

**Worker 2 — The Scheduler:**

1. Click **+ New** → **GitHub Repo** → `claude-ads`
2. Settings → Root Directory: `backend`
3. Start Command:
   ```
   celery -A app.workers.celery_app beat --loglevel=info
   ```
4. Variables → Shared Variables → same set

## Step 2.8 — Get your backend URL

1. Click on your main API service
2. Click **Settings**
3. Under **Domains**, click **Generate Domain**
4. Railway will give you a URL like `https://claude-ads-production-xxxx.up.railway.app`
5. **Copy and save this URL** — you'll need it throughout the rest of this guide

> ✅ **Your backend URL is:** `https://___________________________`
>
> Write it down — you'll use it in many places.

---

---

# PART 3 — Deploy the Frontend Dashboard (15–20 minutes)

The dashboard is the website you'll log in to. It's hosted on Vercel.

## Step 3.1 — Create a Vercel account

1. Go to **https://vercel.com**
2. Click **Sign Up** then **Continue with GitHub**
3. Authorize Vercel to access your GitHub account

## Step 3.2 — Import your project

1. On your Vercel dashboard, click **Add New…** → **Project**
2. Find `claude-ads` in the list and click **Import**
3. Under **Root Directory**, click **Edit** and type: `frontend`
4. Under **Framework Preset**, make sure it shows **Next.js** (it should auto-detect)
5. Don't click Deploy yet — you need to set environment variables first

## Step 3.3 — Set environment variables

Still on the import screen, scroll down to **Environment Variables** and add these one at a time:

| Variable Name | Value |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://<your Railway backend URL>/api/v1` |
| `NEXT_PUBLIC_APP_URL` | `https://<this will be your Vercel URL — see note below>` |
| `NEXT_PUBLIC_APP_NAME` | `Automate` (or your product name) |
| `NEXT_PUBLIC_APP_ENV` | `production` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | `BBWouitioeUSFDsNu0t-qeYt7kKqd1uTH6C8ZawO8W1gYK6Ocm8ZcxkGr_VSHsRyzOl0O2XDpkKJO8nas4oPWCQ` |

> ℹ️ **About NEXT_PUBLIC_APP_URL:** Vercel will give your app a URL like
> `https://claude-ads-frontend.vercel.app` after deploying. You can come back
> and update this variable after your first deploy. For now, enter a placeholder.

## Step 3.4 — Deploy

1. Click **Deploy**
2. Vercel will build and deploy your app — this takes 2–4 minutes
3. When it says **Congratulations!**, click **Continue to Dashboard**
4. Find your live URL at the top (e.g., `https://claude-ads-frontend.vercel.app`)
5. **Copy and save this URL**

> ✅ **Your frontend URL is:** `https://___________________________`

## Step 3.5 — Update your backend with the frontend URL

Now go back to Railway:

1. Open your main API service → Variables
2. Find `ALLOWED_ORIGINS` and change it to:
   ```
   ["https://<your Vercel URL>"]
   ```
3. Save — Railway will redeploy automatically

## Step 3.6 — Set up automatic deployments (GitHub secrets)

This step means every time your developer updates the code, it automatically deploys.

**Get your Vercel credentials:**

1. In Vercel, click your profile picture (top right) → **Settings**
2. Click **Tokens** in the left menu
3. Click **Create** → name it `GitHub Actions` → set scope to **Full Account**
4. Copy the token — **save it immediately, you can't see it again**
5. Save as: `VERCEL_TOKEN`

6. Go to your Vercel project → **Settings** → **General**
7. Scroll down to find **Project ID** — copy it
8. Save as: `VERCEL_PROJECT_ID`

9. Click your Vercel profile → **Settings** → **General**
10. Find **Team ID** (or Vercel ID if personal account) — copy it
11. Save as: `VERCEL_ORG_ID`

**Add these to GitHub:**

1. Go to your GitHub repository: `https://github.com/xmilresearch-lab/claude-ads`
2. Click **Settings** (tab at the top, not the gear icon)
3. In the left sidebar, click **Secrets and variables** → **Actions**
4. Click **New repository secret** and add each one:
   - Name: `VERCEL_TOKEN` → paste the token
   - Name: `VERCEL_PROJECT_ID` → paste the project ID
   - Name: `VERCEL_ORG_ID` → paste the org/team ID

---

---

# PART 4 — Register Your Social Media Apps (1–2 hours)

This is the most important part. For each social platform you want to automate,
you need to register your app with that platform. They give you two codes
(**Client ID** and **Client Secret**) that your platform uses to connect.

> ⚠️ **You must use accounts that have admin/business access to the platforms.
> Personal accounts may not have permission to create developer apps.**

**Your callback URL** (you'll need this for every platform):
```
https://<your Railway backend URL>/api/v1/integrations/oauth/callback
```
> Write it down now: `https://______________________________/api/v1/integrations/oauth/callback`

---

## 4A — Google / Gmail

**Time:** ~15 minutes
**Required for:** Sending emails via Gmail, email automations

1. Go to **https://console.cloud.google.com**
2. Sign in with your Google account
3. Click **Select a project** (top navigation bar) → **New Project**
4. Name it `AI Automation Platform` → click **Create**
5. Make sure your new project is selected in the top bar
6. In the left menu, click **APIs & Services** → **Enabled APIs & Services**
7. Click **+ Enable APIs and Services** (top bar)
8. Search for `Gmail API` → click it → click **Enable**
9. Now go to **APIs & Services** → **Credentials**
10. Click **+ Create Credentials** → **OAuth client ID**
11. If prompted to configure a consent screen first:
    - Click **Configure Consent Screen**
    - Choose **External** → **Create**
    - Fill in App name: `AI Automation Platform`
    - Fill in User support email: your email
    - Fill in Developer contact: your email
    - Click **Save and Continue** through all steps
    - Click **Back to Dashboard**
    - Go back to **Credentials** → **+ Create Credentials** → **OAuth client ID**
12. Set Application type: **Web application**
13. Name: `AI Automation Platform`
14. Under **Authorized redirect URIs**, click **+ Add URI**
15. Paste your callback URL (from the box above)
16. Click **Create**
17. A popup shows your credentials — copy both values:

| Save as | Value |
|---|---|
| `GOOGLE_CLIENT_ID` | The long string ending in `.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | The shorter `GOCSPX-...` string |

---

## 4B — Twitter / X

**Time:** ~15 minutes
**Required for:** Posting tweets, scheduling Twitter content

1. Go to **https://developer.twitter.com/en/portal/dashboard**
2. Sign in with your Twitter/X account
3. Click **+ Create Project**
4. Name it `AI Automation Platform` → click **Next**
5. Select use case: **Making a bot** or **Automating work tasks** → **Next**
6. Name your app: `AI Automation Platform` → **Next**
7. You'll see your API keys — **copy them immediately** and save:
   - Save **API Key** as: `TWITTER_CLIENT_ID`
   - Save **API Key Secret** as: `TWITTER_CLIENT_SECRET`
8. Click **App Settings**
9. Scroll to **User authentication settings** → click **Set up**
10. Enable **OAuth 2.0**
11. Set App type: **Web App, Automated App or Bot**
12. Set Callback URI: paste your callback URL
13. Set Website URL: your Vercel frontend URL
14. Click **Save**

---

## 4C — LinkedIn

**Time:** ~15 minutes
**Required for:** Posting LinkedIn updates, company page posts

1. Go to **https://www.linkedin.com/developers/apps/new**
2. Sign in with your LinkedIn account
3. Fill in:
   - App name: `AI Automation Platform`
   - LinkedIn Page: your company page (or create one)
   - Privacy policy URL: your website + `/privacy` (e.g., `https://yoursite.com/privacy`)
   - App logo: upload any logo image
4. Check the terms checkbox → click **Create app**
5. Click the **Auth** tab
6. Under **OAuth 2.0 settings**, find **Authorized redirect URLs for your app**
7. Click the pencil icon → **+ Add redirect URL**
8. Paste your callback URL → click **Update**
9. Copy your credentials from the **Auth** tab:

| Save as | Value |
|---|---|
| `LINKEDIN_CLIENT_ID` | Client ID |
| `LINKEDIN_CLIENT_SECRET` | Client Secret (click the eye icon to reveal) |

10. Click the **Products** tab
11. Click **Request Access** next to:
    - **Share on LinkedIn**
    - **Sign In with LinkedIn using OpenID Connect**

---

## 4D — Facebook, Instagram, and Threads

**Time:** ~20 minutes
**Note on Instagram:** Instagram connections require Meta to review and approve your app.
This review takes **1–2 weeks**. Start the application now — it doesn't block other features.

All three (Facebook, Instagram, Threads) use one single Meta developer app.

1. Go to **https://developers.facebook.com**
2. Sign in with a Facebook account that manages your Business page
3. Click **My Apps** (top right) → **Create App**
4. Select **Other** → **Next**
5. Select **Business** → **Next**
6. App name: `AI Automation Platform`
7. App contact email: your email
8. Connect to your business account if prompted → click **Create App**

9. You're now in the app dashboard. Click **Add Product** (left sidebar)
10. Find **Facebook Login** → click **Set up**
    - Choose **Web**
    - Site URL: your Vercel frontend URL → **Save**
11. In the left sidebar under **Facebook Login**, click **Settings**
12. Under **Valid OAuth Redirect URIs**, paste your callback URL → click **Save Changes**

13. Find **Instagram** in the Products list → click **Set up**
    (Skip if you don't need Instagram yet)

14. Find **Threads API** → click **Set up**
    (Skip if you don't need Threads yet)

15. In the left sidebar, click **App settings** → **Basic**
16. Copy your credentials:

| Save as | Value |
|---|---|
| `FACEBOOK_CLIENT_ID` | App ID (shown at the top of the page) |
| `FACEBOOK_CLIENT_SECRET` | App Secret (click **Show** to reveal) |
| `THREADS_CLIENT_ID` | Same as `FACEBOOK_CLIENT_ID` |
| `THREADS_CLIENT_SECRET` | Same as `FACEBOOK_CLIENT_SECRET` |

17. **To make Instagram work for all users (not just testers):**
    - Click **App Review** in the left sidebar
    - Click **Requests**
    - Request access to: `instagram_basic`, `instagram_content_publish`, `pages_show_list`
    - Submit your app for review
    - This review takes **1–2 weeks** — your app can go live on other platforms while waiting

---

## 4E — TikTok

**Time:** ~15 minutes to register, **2–4 weeks** for content posting approval
**Note:** TikTok requires approving your app before it can post content.
You can still launch with other platforms while waiting.

1. Go to **https://developers.tiktok.com**
2. Sign in with your TikTok account
3. Click **Manage apps** → **Connect an app**
4. Fill in:
   - App name: `AI Automation Platform`
   - Description: Short description of your platform
   - Platform: **Web**
5. Click **Submit for review** → **Save**
6. After basic review (usually 1–2 days), your app will be approved for basic access
7. In your app settings, go to **Login Kit** → add your callback URL
8. Copy credentials:

| Save as | Value |
|---|---|
| `TIKTOK_CLIENT_KEY` | Client Key |
| `TIKTOK_CLIENT_SECRET` | Client Secret |

9. To enable content posting, find the **Content Posting API** in the Products section
   and submit a separate access request — this takes **2–4 weeks**

---

## 4F — HubSpot (CRM)

**Time:** ~10 minutes
**Required for:** Creating/updating contacts and deals in HubSpot

1. Log in to your HubSpot account at **https://app.hubspot.com**
2. Click your account name (top right) → **Account Settings**
3. In the left sidebar, click **Integrations** → **Private Apps**
4. Click **Create a private app**
5. Name it: `AI Automation Platform`
6. Click the **Scopes** tab
7. Enable these scopes (search for each):
   - `crm.objects.contacts.read`
   - `crm.objects.contacts.write`
   - `crm.objects.deals.read`
   - `crm.objects.deals.write`
8. Click **Create app**
9. Copy the token shown:

| Save as | Value |
|---|---|
| `HUBSPOT_CLIENT_ID` | Your HubSpot Account ID (found in Account Settings → General) |
| `HUBSPOT_CLIENT_SECRET` | The access token (starts with `pat-`) |

> ℹ️ HubSpot private apps use an access token rather than a separate Client ID and Secret.
> Use the token value for HUBSPOT_CLIENT_SECRET and your Account ID for HUBSPOT_CLIENT_ID.

---

## 4G — SendGrid (Email Sending)

**Time:** ~10 minutes
**Required for:** Sending marketing emails and newsletters

1. Go to **https://app.sendgrid.com**
2. Create a free account or sign in
3. In the left sidebar, click **Settings** → **API Keys**
4. Click **Create API Key**
5. Name it: `AI Automation Platform`
6. Select **Full Access**
7. Click **Create & View**
8. Copy the key that appears (starts with `SG.`):

| Save as | Value |
|---|---|
| `SENDGRID_API_KEY` | The SG. key |

> ℹ️ SendGrid uses a single API key rather than a Client ID + Secret.
> Add `SENDGRID_API_KEY` as an extra variable in Railway's Variables tab.

---

## 4H — Zendesk (Customer Support)

**Time:** ~10 minutes
**Required for:** Auto-responding to support tickets

> ℹ️ Only needed if you use Zendesk for customer support. Skip if not applicable.

1. Log in to your Zendesk admin at: `https://yoursubdomain.zendesk.com/admin`
2. Go to **Apps and Integrations** → **APIs** → **Zendesk API**
3. Click **OAuth Clients** → **Add OAuth Client**
4. Fill in:
   - Client name: `AI Automation Platform`
   - Redirect URLs: paste your callback URL
5. Click **Save**
6. Copy credentials:

| Save as | Value |
|---|---|
| `ZENDESK_CLIENT_ID` | Client ID shown after saving |
| `ZENDESK_CLIENT_SECRET` | Secret shown after saving |
| `ZENDESK_SUBDOMAIN` | Your Zendesk subdomain (the part before `.zendesk.com`) |

---

---

# PART 5 — Add Your Credentials to the Backend (15 minutes)

Now that you have all your OAuth credentials, add them to Railway.

1. Go to **https://railway.app** → open your project → click your main API service
2. Click the **Variables** tab
3. Click **Raw Editor**
4. Add all the credentials you collected in Part 4 to the existing variables block:

```
GOOGLE_CLIENT_ID=<paste here>
GOOGLE_CLIENT_SECRET=<paste here>
TWITTER_CLIENT_ID=<paste here>
TWITTER_CLIENT_SECRET=<paste here>
LINKEDIN_CLIENT_ID=<paste here>
LINKEDIN_CLIENT_SECRET=<paste here>
FACEBOOK_CLIENT_ID=<paste here>
FACEBOOK_CLIENT_SECRET=<paste here>
THREADS_CLIENT_ID=<paste here>
THREADS_CLIENT_SECRET=<paste here>
TIKTOK_CLIENT_KEY=<paste here>
TIKTOK_CLIENT_SECRET=<paste here>
HUBSPOT_CLIENT_ID=<paste here>
HUBSPOT_CLIENT_SECRET=<paste here>
OAUTH_REDIRECT_URI=https://<your Railway backend URL>/api/v1/integrations/oauth/callback
```

5. Click **Save** — Railway will restart your service automatically

---

---

# PART 6 — First Login and Admin Setup (15 minutes)

## Step 6.1 — Verify your backend is healthy

1. Open a new browser tab
2. Go to: `https://<your Railway backend URL>/health/ready`
3. You should see something like: `{"status":"ready","checks":{...}}`

If you see `{"status":"ready"}` — ✅ your backend is online.
If you see an error — see the Troubleshooting section at the bottom.

## Step 6.2 — Open your dashboard

1. Go to your Vercel URL: `https://<your Vercel frontend URL>`
2. You should see a login page with the platform branding

## Step 6.3 — Create your admin account

1. Click **Create an account** or **Sign Up**
2. Register with your email and a strong password
3. After registering, log in
4. You'll be taken to the main dashboard

> ℹ️ The first account registered doesn't automatically get admin privileges.
> To grant admin access, your developer needs to run a one-line database command.
> Contact your developer and ask them to run: "grant admin role to [your email]"

## Step 6.4 — Create your workspace

1. After logging in, you'll be prompted to set up your workspace
2. Enter your company or brand name
3. Optionally fill in your brand voice (how you want AI to write — e.g., "professional and concise")
4. Click **Save**

---

---

# PART 7 — Connect Your Social Accounts (15–30 minutes)

Now you'll connect your actual Twitter, LinkedIn, Facebook, etc. accounts so the platform can post on your behalf.

1. In your dashboard, click **Integrations** in the left sidebar
2. You'll see cards for each platform (Twitter, LinkedIn, Gmail, etc.)
3. For each platform you want to use:
   - Click the card
   - Click **Connect**
   - A popup will open taking you to that platform's login page
   - Log in with the account you want to automate
   - Click **Authorize** or **Allow**
   - You'll be redirected back to the dashboard
   - The card should now show **Connected** with a green dot
4. Repeat for each platform

> ℹ️ If a Connect button does nothing or shows an error, double-check that you
> added the credentials for that platform in Part 5.

---

---

# PART 8 — Create Your First Automation (10 minutes)

1. Click **Automations** in the left sidebar
2. Click **+ New Automation**
3. Fill in:
   - **Name:** e.g., `Daily Twitter Post`
   - **Type:** Social Post
   - **Platform:** Twitter
   - **Schedule:** Select how often it should run (e.g., Daily at 9am)
   - **Topic/Instructions:** What you want the AI to write about
4. Click **Save**
5. To test it immediately, click the **▶ Run** button on the automation card
6. Check the **Content Queue** (left sidebar) to see the generated post
7. Review it and click **Approve** to publish it, or **Edit** to change it first

---

---

# Setting Up a Custom Domain (Optional)

If you want your dashboard at `https://app.yourcompany.com` instead of the Vercel URL:

**Frontend (Vercel):**
1. Go to your Vercel project → **Settings** → **Domains**
2. Click **Add** and enter your domain: `app.yourcompany.com`
3. Vercel will give you a CNAME record to add — it looks like:
   - Name: `app`
   - Value: `cname.vercel-dns.com`
4. Log in to wherever you bought your domain (GoDaddy, Namecheap, Cloudflare, etc.)
5. Find **DNS Settings** and add the CNAME record
6. Wait 5–15 minutes for the domain to work

**Backend (Railway):**
1. Go to your Railway service → **Settings** → **Networking**
2. Click **+ Custom Domain**
3. Enter: `api.yourcompany.com`
4. Railway will give you a CNAME record — add it the same way as above

**After adding custom domains, update:**
- Railway variable `ALLOWED_ORIGINS` → change to your new `app.yourcompany.com` URL
- Vercel variable `NEXT_PUBLIC_API_URL` → change to `https://api.yourcompany.com/api/v1`
- Every OAuth provider → add your new callback URL: `https://api.yourcompany.com/api/v1/integrations/oauth/callback`

---

---

# Troubleshooting

## "The app won't load / I see a blank white page"

- Check that your Vercel deployment completed successfully (green checkmark in Vercel dashboard)
- Check that `NEXT_PUBLIC_API_URL` is set correctly and points to your Railway backend
- Open browser Developer Tools (press F12) → Console tab — look for red error messages

## "Login doesn't work / I can't register"

- Check your Railway backend is running: visit `https://<backend URL>/health/ready`
- Check Railway → your service → **Logs** for any red error messages

## "I click Connect on Twitter/LinkedIn/etc. and nothing happens"

- Check that you added the `TWITTER_CLIENT_ID` and `TWITTER_CLIENT_SECRET` in Railway variables
- Check the callback URL in the Twitter developer portal matches exactly:
  `https://<your backend URL>/api/v1/integrations/oauth/callback`

## "The backend shows an error about the database"

- Go to Railway → your PostgreSQL service → check it shows **Running** (green dot)
- Go to your API service → Variables → check `DATABASE_URL` is set

## "Automations run but nothing gets posted"

- Check your Celery worker service is running (green dot in Railway)
- Go to the **Content Queue** page — if items are stuck in "Pending Approval", approve them
- Check the social account is still **Connected** in Integrations

## "Instagram won't connect"

- Instagram requires Meta to review your app before it works for all users
- During review (1–2 weeks), it only works for accounts added as Test Users
- Go to developers.facebook.com → your app → **Roles** → add your Instagram account as a Tester

## "TikTok says my app isn't approved for posting"

- This is normal — TikTok's Content Posting API approval takes 2–4 weeks
- While waiting, users can connect their TikTok account but posting will be disabled

---

---

# Quick Reference — All the URLs You'll Need

| Service | URL |
|---|---|
| Anthropic (AI keys) | https://console.anthropic.com |
| Railway (backend hosting) | https://railway.app |
| Vercel (frontend hosting) | https://vercel.com |
| GitHub (code + secrets) | https://github.com/xmilresearch-lab/claude-ads |
| Google / Gmail developer | https://console.cloud.google.com |
| Twitter / X developer | https://developer.twitter.com/en/portal/dashboard |
| LinkedIn developer | https://www.linkedin.com/developers/apps/new |
| Facebook / Meta developer | https://developers.facebook.com |
| TikTok developer | https://developers.tiktok.com |
| HubSpot developer | https://app.hubspot.com/developer |
| SendGrid | https://app.sendgrid.com |
| Generate a random secret key | https://generate-secret.vercel.app/64 |

---

# What Your Developer Must Do (Requires Technical Access)

These items require a developer and cannot be done through web interfaces:

| Task | Why it's needed | Estimated time |
|---|---|---|
| Merge code to main branch | Activates the CI/CD pipeline for auto-deployments | 5 min |
| Grant admin role to your account | Makes you a platform admin | 5 min |
| Run database migrations | Ensures all database tables are set up | 5 min |
| Verify push notifications work | Test that browser alerts are sending | 15 min |
| Run smoke tests | Automated check that all 10 key pages load | 10 min |

---

# Notes on Platform Approval Timelines

Some platforms require manual review of your app before it can be used publicly:

| Platform | What's pending | Typical wait |
|---|---|---|
| **Instagram** | Meta Business API review | 1–2 weeks |
| **TikTok** | Content Posting API approval | 2–4 weeks |
| **All others** | Nothing — works immediately | — |

> ℹ️ You can launch your platform and start using Twitter, LinkedIn, Facebook,
> Gmail, HubSpot, and SendGrid right away. Instagram and TikTok will become
> available once their approvals complete.

---

*Last updated: 2026-05-30*
*Guide version: 1.0*
