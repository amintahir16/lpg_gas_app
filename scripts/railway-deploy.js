#!/usr/bin/env node

/**
 * Railway Deployment Helper Script
 * This script helps prepare your app for Railway deployment in dev mode
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Railway Deployment Helper');
console.log('============================\n');

// Check if required files exist
const requiredFiles = [
  'railway.json',
  'Procfile',
  'package.json',
  'next.config.ts'
];

console.log('📋 Checking required files...');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file} - Found`);
  } else {
    console.log(`❌ ${file} - Missing`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.log('\n❌ Some required files are missing. Please ensure all files are present.');
  process.exit(1);
}

console.log('\n✅ All required files are present!');

// Check package.json scripts
console.log('\n📦 Checking package.json scripts...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (packageJson.scripts.dev) {
  console.log(`✅ dev script: ${packageJson.scripts.dev}`);
} else {
  console.log('❌ dev script not found in package.json');
}

if (packageJson.scripts.build) {
  console.log(`✅ build script: ${packageJson.scripts.build}`);
} else {
  console.log('❌ build script not found in package.json');
}

// Check Railway configuration
console.log('\n🚂 Checking Railway configuration...');
const railwayConfig = JSON.parse(fs.readFileSync('railway.json', 'utf8'));

if (railwayConfig.deploy && railwayConfig.deploy.startCommand === 'npm run dev') {
  console.log('✅ Railway configured for dev mode');
} else {
  console.log('❌ Railway not configured for dev mode');
}

// Check Procfile
console.log('\n📄 Checking Procfile...');
const procfile = fs.readFileSync('Procfile', 'utf8').trim();
if (procfile === 'web: npm run dev') {
  console.log('✅ Procfile configured for dev mode');
} else {
  console.log('❌ Procfile not configured correctly');
}

console.log('\n🎯 Deployment Checklist:');
console.log('========================');
console.log('1. ✅ Push code to GitHub');
console.log('2. ✅ Connect repository to Railway');
console.log('3. ⏳ Add PostgreSQL service (if needed)');
console.log('4. ⏳ Set environment variables:');
console.log('   - NEXTAUTH_URL=https://your-app.railway.app');
console.log('   - NEXTAUTH_SECRET=your-secret-key');
console.log('   - DATABASE_URL (auto-provided by Railway)');
console.log('5. ⏳ Deploy and test');

console.log('\n🚀 Your app is ready for Railway deployment in dev mode!');
console.log('📖 See RAILWAY_DEPLOYMENT_GUIDE.md for detailed instructions.');
