import { prisma } from '@/lib/db';

export type PublicSiteSettings = {
  companyName: string;
  heroSubtitle: string;
  footerTagline: string;
  phonePrimary: string;
  phoneSecondary: string;
  emailPrimary: string;
  emailSupport: string;
  emailEmergency: string;
  whatsappNumber: string;
  addressLine1: string;
  addressLine2: string;
  businessHoursWeekday: string;
  businessHoursSaturday: string;
  mapEmbedUrl: string;
  mapTitle: string;
  locationHeadline: string;
  locationSubtitle: string;
};

export const PUBLIC_SITE_SETTING_KEYS: Record<keyof PublicSiteSettings, string> = {
  companyName: 'publicSite.companyName',
  heroSubtitle: 'publicSite.heroSubtitle',
  footerTagline: 'publicSite.footerTagline',
  phonePrimary: 'publicSite.phonePrimary',
  phoneSecondary: 'publicSite.phoneSecondary',
  emailPrimary: 'publicSite.emailPrimary',
  emailSupport: 'publicSite.emailSupport',
  emailEmergency: 'publicSite.emailEmergency',
  whatsappNumber: 'publicSite.whatsappNumber',
  addressLine1: 'publicSite.addressLine1',
  addressLine2: 'publicSite.addressLine2',
  businessHoursWeekday: 'publicSite.businessHoursWeekday',
  businessHoursSaturday: 'publicSite.businessHoursSaturday',
  mapEmbedUrl: 'publicSite.mapEmbedUrl',
  mapTitle: 'publicSite.mapTitle',
  locationHeadline: 'publicSite.locationHeadline',
  locationSubtitle: 'publicSite.locationSubtitle',
};

export const DEFAULT_PUBLIC_SITE_SETTINGS: PublicSiteSettings = {
  companyName: 'Flamora',
  heroSubtitle:
    'Premium LPG cylinder delivery for homes, restaurants & industries. Three cylinder types. One trusted name — Flamora.',
  footerTagline:
    'Premium LPG distribution — delivering clean, safe, and affordable energy solutions to homes and businesses across Pakistan.',
  phonePrimary: '+92 300 1234567',
  phoneSecondary: '+92 301 9876543',
  emailPrimary: 'info@flamora.pk',
  emailSupport: 'support@flamora.pk',
  emailEmergency: 'emergency@flamora.pk',
  whatsappNumber: '923001234567',
  addressLine1: '193 Industrial Estate Rd, Hayatabad',
  addressLine2: 'Peshawar, Pakistan',
  businessHoursWeekday: 'Mon – Fri: 8:00 AM – 6:00 PM',
  businessHoursSaturday: 'Sat: 9:00 AM – 4:00 PM',
  mapEmbedUrl:
    'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3308.1234567890123!2d71.4309233!3d33.9763911!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x38d9108a64127615%3A0x6d377cbefcb04e67!2s193%20Industrial%20Estate%20Rd%2C%20Phase-1%20Hayatabad%2C%20Peshawar%2C%20Pakistan!5e0!3m2!1sen!2spk!4v1234567890123',
  mapTitle: 'Flamora - 193 Industrial Estate Rd, Phase-1 Hayatabad, Peshawar',
  locationHeadline: 'Peshawar, Pakistan',
  locationSubtitle: 'Nationwide Delivery',
};

function stripHtml(value: string): string {
  return value.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/** Accepts a bare embed URL or full Google Maps iframe HTML and returns the embed URL. */
export function extractMapEmbedUrl(input: string): string {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) return '';

  const iframeMatch = trimmed.match(/<iframe[^>]+src=["']([^"']+)["']/i);
  if (iframeMatch?.[1]) return iframeMatch[1].trim();

  const srcMatch = trimmed.match(/src=["'](https?:\/\/[^"']+)["']/i);
  if (srcMatch?.[1]) return srcMatch[1].trim();

  const urlMatch = trimmed.match(
    /(https:\/\/(?:www\.)?google\.com\/maps\/embed[^\s"'<>]*)/i
  );
  if (urlMatch?.[1]) return urlMatch[1].trim();

  if (!/<[^>]+>/.test(trimmed)) return trimmed;

  return '';
}

export function sanitizePublicSiteField(value: unknown, max: number): string {
  if (value === null || value === undefined) return '';
  const cleaned = stripHtml(String(value));
  return cleaned.length > max ? cleaned.slice(0, max) : cleaned;
}

export function phoneToTelHref(phone: string): string {
  const digits = phone.replace(/[^\d+]/g, '');
  return digits ? `tel:${digits.startsWith('+') ? digits : `+${digits}`}` : '#';
}

export function phoneToWhatsAppHref(number: string, text?: string): string {
  const digits = number.replace(/\D/g, '');
  if (!digits) return '#';
  const query = text ? `?text=${encodeURIComponent(text)}` : '';
  return `https://wa.me/${digits}${query}`;
}

export function isValidMapEmbedUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'www.google.com' || parsed.hostname === 'google.com') &&
      parsed.pathname.startsWith('/maps/embed')
    );
  } catch {
    return false;
  }
}

export function mergePublicSiteSettings(
  stored: Partial<Record<keyof PublicSiteSettings, string>>
): PublicSiteSettings {
  const merged = { ...DEFAULT_PUBLIC_SITE_SETTINGS };
  for (const key of Object.keys(PUBLIC_SITE_SETTING_KEYS) as (keyof PublicSiteSettings)[]) {
    const value = stored[key];
    if (typeof value === 'string' && value.trim()) {
      merged[key] = value.trim();
    }
  }
  if (!isValidMapEmbedUrl(merged.mapEmbedUrl)) {
    merged.mapEmbedUrl = DEFAULT_PUBLIC_SITE_SETTINGS.mapEmbedUrl;
  }
  return merged;
}

export function parsePublicSitePayload(body: Record<string, unknown>): PublicSiteSettings | { error: string } {
  const raw: Partial<Record<keyof PublicSiteSettings, string>> = {
    companyName: sanitizePublicSiteField(body.companyName, 120),
    heroSubtitle: sanitizePublicSiteField(body.heroSubtitle, 500),
    footerTagline: sanitizePublicSiteField(body.footerTagline, 500),
    phonePrimary: sanitizePublicSiteField(body.phonePrimary, 40),
    phoneSecondary: sanitizePublicSiteField(body.phoneSecondary, 40),
    emailPrimary: sanitizePublicSiteField(body.emailPrimary, 200),
    emailSupport: sanitizePublicSiteField(body.emailSupport, 200),
    emailEmergency: sanitizePublicSiteField(body.emailEmergency, 200),
    whatsappNumber: sanitizePublicSiteField(body.whatsappNumber, 20).replace(/\D/g, ''),
    addressLine1: sanitizePublicSiteField(body.addressLine1, 200),
    addressLine2: sanitizePublicSiteField(body.addressLine2, 200),
    businessHoursWeekday: sanitizePublicSiteField(body.businessHoursWeekday, 120),
    businessHoursSaturday: sanitizePublicSiteField(body.businessHoursSaturday, 120),
    mapEmbedUrl: extractMapEmbedUrl(String(body.mapEmbedUrl ?? '')).slice(0, 4000),
    mapTitle: sanitizePublicSiteField(body.mapTitle, 200),
    locationHeadline: sanitizePublicSiteField(body.locationHeadline, 120),
    locationSubtitle: sanitizePublicSiteField(body.locationSubtitle, 120),
  };

  if (!raw.companyName) return { error: 'Business name is required.' };
  if (!raw.phonePrimary) return { error: 'Primary phone number is required.' };
  if (!raw.emailPrimary) return { error: 'Primary email is required.' };
  if (!raw.addressLine1) return { error: 'Address line 1 is required.' };
  if (!raw.mapEmbedUrl || !isValidMapEmbedUrl(raw.mapEmbedUrl)) {
    return { error: 'Map embed URL must be a valid Google Maps embed link (https://www.google.com/maps/embed?...).' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  for (const key of ['emailPrimary', 'emailSupport', 'emailEmergency'] as const) {
    const email = raw[key];
    if (email && !emailRegex.test(email)) {
      return { error: `Invalid email for ${key.replace('email', '').toLowerCase() || 'primary'}.` };
    }
  }

  return mergePublicSiteSettings(raw);
}

export async function loadPublicSiteSettings(): Promise<PublicSiteSettings> {
  const keys = Object.values(PUBLIC_SITE_SETTING_KEYS);
  const rows = await prisma.systemSettings.findMany({
    where: { key: { in: keys }, isActive: true },
  });
  const stored: Partial<Record<keyof PublicSiteSettings, string>> = {};
  for (const [field, settingKey] of Object.entries(PUBLIC_SITE_SETTING_KEYS) as [keyof PublicSiteSettings, string][]) {
    const row = rows.find((r) => r.key === settingKey);
    if (row?.value) stored[field] = row.value;
  }
  return mergePublicSiteSettings(stored);
}

export async function savePublicSiteSettings(settings: PublicSiteSettings) {
  for (const [field, settingKey] of Object.entries(PUBLIC_SITE_SETTING_KEYS) as [keyof PublicSiteSettings, string][]) {
    const value = settings[field];
    await prisma.systemSettings.upsert({
      where: { key: settingKey },
      update: { value, updatedAt: new Date(), category: 'PUBLIC_SITE' },
      create: {
        key: settingKey,
        value,
        category: 'PUBLIC_SITE',
        description: `Public website setting: ${field}`,
      },
    });
  }
}
