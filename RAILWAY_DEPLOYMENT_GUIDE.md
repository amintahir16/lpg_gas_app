# Railway Deployment Guide - Development Mode

This guide will help you deploy your LPG Gas App to Railway in development mode (`npm run dev`) instead of production build.

## 🚀 Quick Setup

### 1. Files Created for Railway
- ✅ `railway.json` - Railway configuration
- ✅ `Procfile` - Process file for Railway
- ✅ This deployment guide

### 2. Railway Configuration
The `railway.json` file tells Railway to:
- Use `npm run dev` as the start command
- Enable health checks
- Auto-restart on failure
- Run in development mode with Turbopack

### 3. Environment Variables Setup

#### Required Environment Variables:
```bash
# Database (Railway will provide this automatically)
DATABASE_URL="postgresql://..."

# NextAuth Configuration
NEXTAUTH_URL="https://your-app-name.railway.app"
NEXTAUTH_SECRET="your-secret-key-here"

# Optional: Debug mode
DEBUG_ENABLED="true"
```

#### How to Set Environment Variables in Railway:
1. Go to your Railway project dashboard
2. Click on your service
3. Go to "Variables" tab
4. Add the environment variables above

### 4. Database Setup

#### Option A: Use Railway PostgreSQL (Recommended)
1. In Railway dashboard, add a PostgreSQL service
2. Railway will automatically provide `DATABASE_URL`
3. Run database migrations:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

#### Option B: Use External Database
1. Set your own `DATABASE_URL` in Railway variables
2. Make sure your database is accessible from Railway

### 5. Deployment Steps

1. **Push to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Add Railway dev mode configuration"
   git push origin main
   ```

2. **Connect to Railway**:
   - Go to [railway.app](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Choose your repository

3. **Configure Environment Variables**:
   - Add PostgreSQL service (if using Railway DB)
   - Set `NEXTAUTH_URL` to your Railway app URL
   - Set `NEXTAUTH_SECRET` to a secure random string

4. **Deploy**:
   - Railway will automatically detect the configuration
   - It will run `npm run dev` instead of `npm run build`
   - Your app will be available at `https://your-app-name.railway.app`

## 🔧 Development Mode Benefits

### ✅ What You Get:
- **Hot Reload**: Changes reflect immediately
- **Turbopack**: Faster builds and development
- **Debug Mode**: Full development features
- **Source Maps**: Better error tracking
- **Fast Refresh**: React component updates

### ⚠️ Important Notes:
- **Not for Production**: This is development mode
- **Slower Performance**: Dev mode is slower than production
- **Debug Info**: May expose sensitive information
- **Resource Usage**: Higher memory usage than production

## 🛠️ Troubleshooting

### Common Issues:

1. **App Won't Start**:
   - Check environment variables are set correctly
   - Verify `DATABASE_URL` is accessible
   - Check Railway logs for errors

2. **Database Connection Issues**:
   - Ensure `DATABASE_URL` is correct
   - Run `npx prisma db push` to sync schema
   - Check if database service is running

3. **NextAuth Issues**:
   - Verify `NEXTAUTH_URL` matches your Railway domain
   - Ensure `NEXTAUTH_SECRET` is set
   - Check that the URL is accessible

### Useful Commands:
```bash
# Check Railway logs
railway logs

# Connect to Railway CLI
railway login
railway link

# Deploy manually
railway up
```

## 📝 Next Steps

1. **Test Your Deployment**:
   - Visit your Railway app URL
   - Test all major features
   - Check database connectivity
   - Verify authentication works

2. **Monitor Performance**:
   - Check Railway dashboard for resource usage
   - Monitor logs for any errors
   - Test with real data

3. **When Ready for Production**:
   - Remove `railway.json` and `Procfile`
   - Let Railway use default build process
   - Set `NODE_ENV=production`
   - Use production-optimized settings

## 🎯 Summary

Your app is now configured to run in development mode on Railway with:
- ✅ `npm run dev` as start command
- ✅ Turbopack for faster development
- ✅ Hot reload enabled
- ✅ Debug mode active
- ✅ Auto-restart on failure

**Perfect for development and testing!** 🚀
