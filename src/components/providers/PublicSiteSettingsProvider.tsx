'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import {
  DEFAULT_PUBLIC_SITE_SETTINGS,
  type PublicSiteSettings,
} from '@/lib/public-site-settings';

type PublicSiteSettingsContextValue = {
  settings: PublicSiteSettings;
  loading: boolean;
};

const PublicSiteSettingsContext = createContext<PublicSiteSettingsContextValue>({
  settings: DEFAULT_PUBLIC_SITE_SETTINGS,
  loading: true,
});

export function PublicSiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<PublicSiteSettings>(DEFAULT_PUBLIC_SITE_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/public/site-settings', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setSettings({ ...DEFAULT_PUBLIC_SITE_SETTINGS, ...data });
        }
      } catch (error) {
        console.error('Failed to load public site settings', error);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <PublicSiteSettingsContext.Provider value={{ settings, loading }}>
      {children}
    </PublicSiteSettingsContext.Provider>
  );
}

export function usePublicSiteSettings() {
  return useContext(PublicSiteSettingsContext);
}
