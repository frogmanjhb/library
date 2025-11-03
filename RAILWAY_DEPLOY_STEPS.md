# 🚂 Railway Deployment Steps

## Step 1: Deploy Backend Service

1. Go to https://railway.app
2. Open your existing project (the one with Postgres)
3. Click **+ New** → **GitHub Repo**
4. Select your **library** repository
5. Railway will create a new service

### Configure Backend Service:

6. Click on the new service
7. Go to **Settings** tab:
   - **Name**: `library-backend`
   - **Root Directory**: `backend`
   - **Build Command**: 
     ```
     npm install && npx prisma generate --schema=../prisma/schema.prisma && npm run build
     ```
   - **Start Command**: `npm start`

8. Go to **Variables** tab and add:
   ```
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   NODE_ENV=production
   PORT=3001
   JWT_SECRET=<generate-a-random-32-character-string>
   FRONTEND_URL=<will-add-this-after-step-2>
   ```

9. Go to **Networking** tab:
   - Enable **Public Networking**
   - Copy the generated domain (e.g., `library-backend-production.up.railway.app`)

10. Wait for deployment to complete (check Deployments tab)

---

## Step 2: Deploy Frontend Service

1. In the same Railway project, click **+ New** → **GitHub Repo**
2. Select your **library** repository again
3. Railway will create another service

### Configure Frontend Service:

4. Click on the new frontend service
5. Go to **Settings** tab:
   - **Name**: `library-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npx serve -s dist -l $PORT`

6. Go to **Variables** tab and add:
   ```
   VITE_API_URL=https://your-backend-url.railway.app
   ```
   (Replace with your actual backend URL from Step 1)

7. Go to **Networking** tab:
   - Enable **Public Networking**
   - Copy the frontend domain (e.g., `library-frontend-production.up.railway.app`)

8. Wait for deployment to complete

---

## Step 3: Update Backend Environment Variable

1. Go back to your **Backend service**
2. Go to **Variables** tab
3. Update `FRONTEND_URL` to your frontend Railway URL:
   ```
   FRONTEND_URL=https://your-frontend-url.railway.app
   ```
4. Save - backend will auto-redeploy

---

## Step 4: Run Database Migrations on Production

Option A - Via Railway Dashboard:
1. Go to Backend service → **Deployments** tab
2. The migrations should run automatically on deployment

Option B - Via Railway CLI (if needed):
```bash
railway link
railway run npm run migrate --workspace=backend
```

---

## ✅ Done!

Your app should now be live at:
- **Frontend**: https://your-frontend-url.railway.app
- **Backend API**: https://your-backend-url.railway.app

### Test Accounts:
- Student: `student3a1@stpeters.co.za`
- Teacher: `teacher1@stpeters.co.za`
- Librarian: `librarian@stpeters.co.za`

---

## 🔧 Troubleshooting

**If backend fails to build:**
- Check logs in Deployments tab
- Ensure Prisma can find the schema: `--schema=../prisma/schema.prisma`

**If frontend can't reach backend:**
- Check `VITE_API_URL` in frontend variables
- Make sure backend has Public Networking enabled
- Check CORS settings include frontend URL

**If database connection fails:**
- Verify `DATABASE_URL=${{Postgres.DATABASE_URL}}` in backend variables
- Check Postgres service is running

---

## 🔒 Security Note

Generate a strong JWT_SECRET:
```bash
openssl rand -base64 32
```

Or use: https://generate-secret.vercel.app/32

