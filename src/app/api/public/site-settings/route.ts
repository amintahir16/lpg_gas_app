import { NextResponse } from 'next/server';
import { loadPublicSiteSettings } from '@/lib/public-site-settings';

export async function GET() {
  try {
    const settings = await loadPublicSiteSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Public site settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to load site settings' }, { status: 500 });
  }
}
