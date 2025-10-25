#!/usr/bin/env node

/**
 * Quick commit script for Railway setup
 */

const { execSync } = require('child_process');

console.log('🚀 Committing Railway setup files...\n');

try {
  // Add all new files
  execSync('git add railway.json Procfile RAILWAY_DEPLOYMENT_GUIDE.md scripts/railway-deploy.js scripts/commit-railway-setup.js', { stdio: 'inherit' });
  
  // Add modified files
  execSync('git add next.config.ts', { stdio: 'inherit' });
  
  // Commit with descriptive message
  execSync('git commit -m "Add Railway dev mode configuration

- Add railway.json for dev mode deployment
- Add Procfile with npm run dev command  
- Update next.config.ts for Railway optimization
- Add deployment guide and helper scripts
- Configure for development mode instead of production build"', { stdio: 'inherit' });
  
  console.log('\n✅ Successfully committed Railway setup files!');
  console.log('\n📤 Next steps:');
  console.log('1. Push to GitHub: git push origin main');
  console.log('2. Connect to Railway and deploy');
  console.log('3. Set environment variables in Railway dashboard');
  console.log('4. Test your deployment');
  
} catch (error) {
  console.error('❌ Error committing files:', error.message);
  process.exit(1);
}
