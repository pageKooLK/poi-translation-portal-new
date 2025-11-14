# Zeabur Deployment Guide

## Health Check Endpoint

After deployment, verify your setup by visiting:
```
https://poitranslation.zeabur.app/api/health
```

This endpoint will show:
- Whether environment variables are configured
- Supabase connection status
- Any configuration errors

## Required Environment Variables

You need to set the following environment variables in your Zeabur deployment:

### Essential Variables (MUST HAVE)
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### API Keys for Translation Services
```
OPENAI_API_KEY=your_openai_api_key
SERP_API_KEY=your_serp_api_key
PERPLEXITY_API_KEY=your_perplexity_api_key
```

### Optional (for additional features)
```
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Setting Environment Variables in Zeabur

1. Go to your Zeabur project dashboard
2. Click on your service (poi-translation-portal)
3. Go to "Variables" tab
4. Add each environment variable listed above
5. Click "Save" and redeploy

## Important Notes

1. **Supabase Configuration**:
   - Make sure your Supabase project URL and keys are correct
   - The URL should be something like: `https://xxxxx.supabase.co`
   - DO NOT include trailing slashes in the URL

2. **Authentication Setup**:
   - After deployment, you need to create the admin user in Supabase
   - Use the Supabase Dashboard or run the setup script

3. **Default Admin Account**:
   - Email: `tna_planning_tw@klook.com`
   - Password: `Taipeitna2025!Klook`
   - This needs to be created in your Supabase project

## Creating Admin User

### Option 1: Using Supabase Dashboard
1. Go to your Supabase project
2. Navigate to Authentication > Users
3. Click "Invite user"
4. Enter the admin email and password

### Option 2: Using the Setup Script
1. Clone the repository locally
2. Create `.env.local` with your Supabase credentials
3. Run: `node scripts/setup-admin.js`

## Troubleshooting

### 500 Error on Login
This usually means environment variables are missing.

**Step 1: Check Health Endpoint**
Visit: https://poitranslation.zeabur.app/api/health

If you see:
- `"hasUrl": false` - NEXT_PUBLIC_SUPABASE_URL is missing
- `"hasAnonKey": false` - NEXT_PUBLIC_SUPABASE_ANON_KEY is missing
- `"status": "missing_config"` - Environment variables need to be added

**Step 2: Add Environment Variables in Zeabur**
1. Go to Zeabur Dashboard: https://dash.zeabur.com
2. Select your project
3. Click on "poi-translation-portal" service
4. Go to "Variables" tab
5. Add these variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://przxwihootxbqxmlpwfe.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your anon key from Supabase]
   ```
6. Click "Save"
7. Wait for automatic redeployment (or manually redeploy)

**Step 3: Verify After Deployment**
1. Visit health check again: https://poitranslation.zeabur.app/api/health
2. Should show `"status": "healthy"` and `"supabase": {"status": "connected"}`

### Cannot Connect to Supabase
1. Verify your Supabase project is active
2. Check that the URL doesn't have typos
3. Ensure the anon key is correct

### User Not Found
The admin user needs to be created in Supabase first. See "Creating Admin User" section above.

## Checking Deployment Status

You can verify your deployment is working by:
1. Visiting: `https://your-app.zeabur.app/api/auth/session`
2. It should return: `{"authenticated":false,"user":null}` if not logged in

## Local Development vs Production

- Local: Uses `.env.local` file
- Production (Zeabur): Uses environment variables set in Zeabur dashboard
- Make sure both environments have the same Supabase project configured