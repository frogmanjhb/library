# 🚀 Railway Deployment Guide

This guide walks you through deploying the St Peter's Library Reading Tracker to Railway.

## Overview

The application consists of three Railway services:
1. **Postgres Database** - Managed PostgreSQL database
2. **Backend API** - Node.js/Express server
3. **Frontend** - React static site

## Prerequisites

- [Railway account](https://railway.app) (sign up with GitHub)
- GitHub repository with your code
- Google OAuth credentials configured (see [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md))

## Step 1: Create Railway Project

1. Go to [Railway](https://railway.app) and sign in
2. Click **New Project**
3. Select **Deploy from GitHub repo**
4. Authorize Railway to access your GitHub
5. Select your repository

## Step 2: Add Postgres Database

1. In your Railway project, click **+ New**
2. Select **Database** → **PostgreSQL**
3. Railway will create and start the database
4. Click on the Postgres service
5. Go to **Variables** tab
6. Copy the `DATABASE_URL` - you'll need this!

## Step 3: Deploy Backend Service

### 3.1 Create Backend Service

1. Click **+ New** → **GitHub Repo**
2. Select your repository
3. Railway will detect it's a monorepo

### 3.2 Configure Backend Service

1. Click on the backend service
2. Go to **Settings** tab:
   - **Name**: `library-tracker-backend`
   - **Root Directory**: `/backend`
   - **Build Command**: `npm install && npm run prisma:generate && npm run build`
   - **Start Command**: `npm run migrate:deploy && npm run start`

3. Go to **Variables** tab and add:
   ```env
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   NODE_ENV=production
   PORT=3001
   
   GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_google_client_secret
   GOOGLE_CALLBACK_URL=https://library-tracker-backend-production.up.railway.app/auth/google/callback
   
   JWT_SECRET=generate_a_random_32_character_string
   SESSION_SECRET=generate_another_random_32_character_string
   
   FRONTEND_URL=https://library-tracker-frontend-production.up.railway.app
   ```

   **Notes:**
   - `${{Postgres.DATABASE_URL}}` automatically references your Postgres service
   - Generate secrets with: `openssl rand -base64 32`
   - Update `GOOGLE_CALLBACK_URL` and `FRONTEND_URL` with your actual Railway URLs (you'll get these after deployment)

4. Go to **Networking** tab:
   - Enable **Public Networking**
   - Copy the generated domain (e.g., `library-tracker-backend-production.up.railway.app`)

### 3.3 Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to **APIs & Services** → **Credentials**
3. Edit your OAuth 2.0 Client
4. Add to **Authorized redirect URIs**:
   ```
   https://your-backend-railway-url.railway.app/auth/google/callback
   ```
5. Add to **Authorized JavaScript origins**:
   ```
   https://your-backend-railway-url.railway.app
   ```
6. Save changes

### 3.4 Deploy Backend

Railway will automatically deploy when you push to your GitHub repo.

Check deployment logs in Railway dashboard.

## Step 4: Deploy Frontend Service

### 4.1 Create Frontend Service

1. Click **+ New** → **GitHub Repo**
2. Select your repository again
3. Railway will create a second service

### 4.2 Configure Frontend Service

1. Click on the frontend service
2. Go to **Settings** tab:
   - **Name**: `library-tracker-frontend`
   - **Root Directory**: `/frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l $PORT`

3. Go to **Variables** tab and add:
   ```env
   VITE_API_URL=https://your-backend-railway-url.railway.app
   ```
   
   Replace with your actual backend Railway URL.

4. Go to **Networking** tab:
   - Enable **Public Networking**
   - Copy the generated domain (e.g., `library-tracker-frontend-production.up.railway.app`)

5. **Important**: Update backend's `FRONTEND_URL` variable:
   - Go to backend service → Variables
   - Update `FRONTEND_URL` with your frontend Railway URL
   - Redeploy backend

### 4.3 Update Google OAuth (Again)

Add frontend URL to Google OAuth:
1. Go to Google Cloud Console → Credentials
2. Edit OAuth Client
3. Add to **Authorized JavaScript origins**:
   ```
   https://your-frontend-railway-url.railway.app
   ```
4. Save

## Step 5: Run Database Migrations

1. In Railway dashboard, click on **Backend service**
2. Go to **Deployments** tab
3. Click on the latest deployment
4. Click **View Logs**
5. Confirm you see: "Migration successful" messages

If migrations didn't run automatically:
1. Go to backend service
2. Click **Settings** → **Deploy** button to force redeploy

## Step 6: Seed Database (Optional)

To add test data:

1. In Railway, go to **Backend service**
2. Click **Settings** → **Service Variables**
3. Temporarily add:
   ```env
   SEED_ON_START=true
   ```
4. Redeploy the service
5. Check logs to confirm seed completed
6. Remove the `SEED_ON_START` variable

**Or manually via Railway CLI:**
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Link to your project
railway link

# Run seed
railway run npm run seed --workspace=backend
```

## Step 7: Test Deployment

1. Visit your frontend URL: `https://your-frontend-railway-url.railway.app`
2. Click **Sign in with Google**
3. Sign in with a `@stpeters.co.za` account
4. Verify:
   - You're redirected back to the app
   - Dashboard loads correctly
   - You can log a book
   - Leaderboard updates
   - Announcements appear

## Environment Variables Reference

### Backend Service

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Postgres connection string | `${{Postgres.DATABASE_URL}}` |
| `NODE_ENV` | Environment | `production` |
| `PORT` | Server port | `3001` |
| `GOOGLE_CLIENT_ID` | OAuth client ID | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth secret | `GOCSPX-xxx` |
| `GOOGLE_CALLBACK_URL` | OAuth redirect | `https://backend.railway.app/auth/google/callback` |
| `JWT_SECRET` | Token secret | Random 32+ char string |
| `SESSION_SECRET` | Session secret | Random 32+ char string |
| `FRONTEND_URL` | Frontend URL | `https://frontend.railway.app` |

### Frontend Service

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `https://backend.railway.app` |

## Updating the Application

### Update Code

1. Push changes to your GitHub repository:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```

2. Railway automatically detects changes and redeploys

### Update Environment Variables

1. Go to Railway project
2. Select service (backend or frontend)
3. Go to **Variables** tab
4. Update variable
5. Service automatically redeploys

### Manual Redeploy

If needed:
1. Go to service in Railway
2. Click **Settings**
3. Click **Deploy** button

## Database Management

### Access Database

**Via Railway Dashboard:**
1. Click on Postgres service
2. Go to **Data** tab
3. Use built-in query editor

**Via psql:**
1. Go to Postgres service → **Connect** tab
2. Copy connection command
3. Run in terminal:
   ```bash
   psql postgresql://user:pass@host:port/db
   ```

### Backup Database

Railway automatically backs up your database, but you can also:

```bash
# Export schema and data
pg_dump $DATABASE_URL > backup.sql

# Restore from backup
psql $DATABASE_URL < backup.sql
```

### Run Migrations

Migrations run automatically on deployment. To run manually:

```bash
railway run npm run migrate:deploy --workspace=backend
```

## Monitoring & Logs

### View Logs

1. Go to Railway project
2. Click on service (backend/frontend)
3. Go to **Deployments** tab
4. Click on deployment
5. View logs in real-time

### Key Metrics

Railway provides:
- **CPU usage**
- **Memory usage**
- **Network traffic**
- **Build time**
- **Deploy time**

Access via service → **Metrics** tab

## Troubleshooting

### Backend Won't Start

**Check:**
1. **Logs**: Look for errors in deployment logs
2. **DATABASE_URL**: Ensure Postgres reference is correct
3. **Migrations**: Confirm migrations completed
4. **Environment Variables**: All required variables set

**Common fixes:**
```bash
# Force rebuild
railway up --service backend

# Check Prisma
railway run npx prisma generate --workspace=backend
```

### Frontend Shows API Errors

**Check:**
1. `VITE_API_URL` points to correct backend URL
2. Backend is running (check backend service status)
3. CORS is configured (backend `FRONTEND_URL` is correct)

### OAuth Redirect Fails

**Check:**
1. `GOOGLE_CALLBACK_URL` matches Google Cloud Console
2. Frontend and backend URLs in Authorized origins
3. Railway URLs haven't changed (they're stable but check)

### Database Connection Issues

**Check:**
1. Postgres service is running
2. `DATABASE_URL` variable exists
3. Backend has reference: `${{Postgres.DATABASE_URL}}`

**Test connection:**
```bash
railway run node -e "const { PrismaClient } = require('@prisma/client'); new PrismaClient().\$connect().then(() => console.log('Connected!'))"
```

### Build Fails

**Common issues:**
- **TypeScript errors**: Fix in code and push
- **Missing dependencies**: Check package.json
- **Wrong node version**: Railway uses Node 18 by default

**Force clean build:**
1. Go to service → **Settings**
2. Delete **Build Cache**
3. Redeploy

## Custom Domains (Optional)

To use custom domains like `library.stpeters.co.za`:

1. Go to service → **Settings** → **Domains**
2. Click **Custom Domain**
3. Enter your domain
4. Add DNS records as instructed by Railway
5. Update Google OAuth with new domain

## Cost Management

Railway pricing:
- **Hobby Plan**: $5/month per active service
- **Free tier**: $5 credit monthly

**Optimize costs:**
- Use a single Postgres instance
- Combine services if possible
- Monitor usage in **Usage** tab

## Security Checklist

Before going live:

- [ ] All environment variables set correctly
- [ ] OAuth restricted to @stpeters.co.za
- [ ] Database has backups enabled
- [ ] HTTPS enforced (automatic with Railway)
- [ ] JWT secrets are strong and unique
- [ ] No sensitive data in code/logs
- [ ] Railway services have appropriate permissions

## Support

**Railway Issues:**
- [Railway Docs](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- Railway dashboard support chat

**Application Issues:**
- See [README.md](./README.md)
- See [GOOGLE_OAUTH_SETUP.md](./GOOGLE_OAUTH_SETUP.md)
- Check deployment logs

---

**Happy Deploying! 🚂**

