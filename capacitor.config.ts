import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Android loads your **live** Vercel site in a WebView. After you deploy,
 * users see updates on the next cold start (no new APK for normal web changes).
 *
 * Set CAPACITOR_SERVER_URL to the production origin only (no path), e.g.
 *   https://your-app.vercel.app
 *
 * The app opens `/login` first (see `server.url` below).
 */
const baseUrl = (process.env.CAPACITOR_SERVER_URL || '').replace(/\/$/, '').trim();

const config: CapacitorConfig = {
  appId: 'com.flamora.lpg',
  appName: 'FLAMORA',
  webDir: 'capacitor-www',
  server: baseUrl
    ? {
        url: `${baseUrl}/login`,
        androidScheme: 'https',
      }
    : undefined,
  android: {
    allowMixedContent: false,
    backgroundColor: '#f8fafc',
  },
};

export default config;
