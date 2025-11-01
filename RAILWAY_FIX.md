# Railway Deployment Fix

## The Problem
Railway is ignoring the dev mode configuration and trying to run `npm run build`, which fails because the app is still in development.

## The Solution

### Option 1: Manual Redeploy (Recommended - No need to disconnect)

1. **Push the new files to GitHub**:
   ```bash
   git add nixpacks.toml railway.json Procfile
   git commit -m "Add Railway dev mode configuration"
   git push origin main
   ```

2. **In Railway Dashboard**:
   - Go to your project
   - Click on "Deployments" tab
   - Click "Manual Deploy" or "Redeploy"
   - This will pull fresh code and see the new config files

### Option 2: Clear Cache (If Option 1 doesn't work)

1. **In Railway Dashboard**:
   - Go to your service
   - Click "Settings"
   - Scroll to "Build Cache"
   - Click "Clear Build Cache"
   - Then trigger a new deployment

### Option 3: Railway CLI (Most Reliable)

If you have Railway CLI installed:

```bash
# Install Railway CLI if you don't have it
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Deploy with the new config
railway up
```

### Option 4: Disconnect and Reconnect (Last Resort)

If none of the above work:

1. **Disconnect from Railway** (don't delete the service, just disconnect):
   - Go to Railway project settings
   - Disconnect the GitHub repository

2. **Push all your code**:
   ```bash
   git add .
   git commit -m "Add Railway configuration files"
   git push origin main
   ```

3. **Reconnect in Railway**:
   - Click "New Service" → "Deploy from GitHub"
   - Select your repository
   - Railway will detect the config files automatically

## Files That Should Be in Your Repo

Make sure these files are committed:

✅ `nixpacks.toml` - Nixpacks configuration
✅ `railway.json` - Railway deployment settings
✅ `Procfile` - Process file (web: npm run dev)
✅ `package.json` - With correct scripts

## Verify Your Config

Check that your files are correct:

### `nixpacks.toml`:
```toml
[phases.setup]
nixPkgs = ["nodejs-20_x", "postgresql_15"]

[phases.build]
cmds = ["echo 'Skipping build - running in dev mode with Turbopack'"]

[start]
cmd = "npm run dev"
```

### `Procfile`:
```
web: npm run dev
```

### `railway.json`:
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm run dev"
  }
}
```

## What These Files Do

1. **`nixpacks.toml`**: Tells Nixpacks to skip the build phase and run `npm run dev`
2. **`Procfile`**: Railway uses this if Nixpacks isn't configured
3. **`railway.json`**: Railway's native config file for deployment settings

## Test It Works

After deployment, check Railway logs:
- Should see "Ready on http://0.0.0.0:3000"
- Should NOT see "Compiling /..." (that's build mode)
- Should see "Turbopack" messages (dev mode)

## Why This Happens

Railway caches deployment configurations. When you add config files after initial deployment, Railway might use the old cached config. A fresh deploy clears this cache.

## Still Not Working?

1. Check Railway logs for exact error messages
2. Verify all three config files are in your repo root
3. Make sure you pushed to the correct branch that Railway is watching
4. Contact Railway support with your deployment logs

