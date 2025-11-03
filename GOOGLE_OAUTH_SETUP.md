# 🔐 Google OAuth Setup Guide

This guide walks you through setting up Google OAuth authentication for the St Peter's Library Reading Tracker, restricted to `@stpeters.co.za` email addresses.

## Prerequisites

- Google Workspace administrator access for `stpeters.co.za`
- Ability to manage Google Cloud Platform projects for your organization

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **NEW PROJECT**
3. Enter project details:
   - **Project name**: St Peters Library Tracker
   - **Organization**: stpeters.co.za
   - Click **CREATE**

## Step 2: Enable Required APIs

1. In your new project, go to **APIs & Services** → **Library**
2. Search for and enable:
   - **Google+ API** (for user profile information)
   - **Google Identity Services API**

## Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **Internal** (restricts to your organization)
   - This automatically limits access to `@stpeters.co.za` accounts
   - Click **CREATE**

3. Fill in the App information:
   - **App name**: St Peter's Reading Tracker
   - **User support email**: Choose your school email
   - **App logo**: (Optional) Upload school logo
   - **Application home page**: Your Railway deployment URL (add later)
   - **Authorized domains**: 
     - `stpeters.co.za`
     - `railway.app` (for deployment)
   - **Developer contact email**: Your school email

4. **Scopes** section:
   - Click **ADD OR REMOVE SCOPES**
   - Add these scopes:
     - `.../auth/userinfo.email` - View your email address
     - `.../auth/userinfo.profile` - See your personal info
   - Click **UPDATE**

5. Click **SAVE AND CONTINUE** through remaining sections

## Step 4: Create OAuth 2.0 Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth 2.0 Client ID**
3. Configure the client:
   - **Application type**: Web application
   - **Name**: Library Tracker Web Client

4. **Authorized JavaScript origins**:
   - Local development:
     ```
     http://localhost:5173
     http://localhost:3001
     ```
   - Production (add your Railway URLs):
     ```
     https://your-frontend-railway-url.railway.app
     https://your-backend-railway-url.railway.app
     ```

5. **Authorized redirect URIs**:
   - Local development:
     ```
     http://localhost:3001/auth/google/callback
     ```
   - Production (add your Railway backend URL):
     ```
     https://your-backend-railway-url.railway.app/auth/google/callback
     ```

6. Click **CREATE**

7. **IMPORTANT**: Copy your credentials:
   - **Client ID**: `xxxxxx.apps.googleusercontent.com`
   - **Client Secret**: `xxxxxxxxxxxxxxxx`
   - Save these securely!

## Step 5: Update Environment Variables

### Local Development

Update `backend/.env`:
```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:3001/auth/google/callback
```

### Production (Railway)

Add these environment variables to your Railway backend service:
```env
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret_here
GOOGLE_CALLBACK_URL=https://your-backend.railway.app/auth/google/callback
FRONTEND_URL=https://your-frontend.railway.app
```

## Step 6: Domain Verification (For Production)

1. Go to **Google Search Console**: https://search.google.com/search-console
2. Add and verify ownership of `stpeters.co.za`
3. This ensures your OAuth app can use the domain

## Step 7: Test Authentication

### Test Locally

1. Start your servers:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:5173

3. Click **Sign in with Google**

4. You should see:
   - Google sign-in page
   - Only `@stpeters.co.za` accounts can sign in (if configured as Internal)
   - Permission request for email and profile
   - Redirect back to app after successful login

### Test Different User Types

Try logging in with:
- A student account: `student3a1@stpeters.co.za`
- A teacher account: `teacher1@stpeters.co.za`
- A librarian account: `librarian@stpeters.co.za`

Each should see their appropriate dashboard.

## Troubleshooting

### Error: "Access blocked: This app's request is invalid"

**Solution**: Check that:
- Authorized redirect URIs exactly match your callback URL
- Include both http://localhost:3001 and https://your-railway-backend.railway.app

### Error: "This app isn't verified"

**Solution**: 
- For internal apps (stpeters.co.za only), this shouldn't appear
- If it does, ensure OAuth consent screen is set to **Internal**

### Error: "Only @stpeters.co.za email addresses are allowed"

This is expected behavior! The app correctly rejects external emails.

**To test with non-school emails during development:**
1. Temporarily comment out the domain check in `backend/src/auth/passport.ts`:
   ```typescript
   // if (!email.endsWith('@stpeters.co.za')) {
   //   return done(new Error('Only @stpeters.co.za email addresses are allowed'), undefined);
   // }
   ```
2. Remember to re-enable before deploying to production!

### Error: "Redirect URI mismatch"

**Solution**: 
1. Go to Google Cloud Console → Credentials
2. Edit your OAuth 2.0 Client
3. Add the exact redirect URI from the error message
4. Wait 5 minutes for changes to propagate

### Users Can't Access After Sign-in

**Solution**: Check that:
- Backend `.env` has correct `FRONTEND_URL`
- JWT_SECRET is set
- Database connection is working
- User was created in database (check Railway Postgres)

## Security Best Practices

1. **Never commit credentials**:
   - `.env` files are in `.gitignore`
   - Use Railway environment variables for production

2. **Rotate secrets regularly**:
   - Generate new OAuth credentials annually
   - Update JWT_SECRET and SESSION_SECRET

3. **Monitor OAuth usage**:
   - Check Google Cloud Console for unusual activity
   - Review OAuth consent screen regularly

4. **Keep domain restriction**:
   - Never change from "Internal" to "External"
   - This ensures only school accounts can access

## Production Checklist

Before deploying to production:

- [ ] OAuth consent screen configured as **Internal**
- [ ] Authorized redirect URIs include Railway backend URL
- [ ] Authorized JavaScript origins include Railway URLs
- [ ] Domain verification completed for stpeters.co.za
- [ ] Environment variables set in Railway
- [ ] Test login with multiple user types
- [ ] Confirm non-school emails are rejected
- [ ] Document credentials in secure location (not in code!)

## Support

For OAuth issues:
- Check [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- Review [Google Cloud Console](https://console.cloud.google.com/)
- Contact Google Workspace administrator

For app-specific issues:
- See main [README.md](./README.md)
- See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Last Updated**: November 2025

