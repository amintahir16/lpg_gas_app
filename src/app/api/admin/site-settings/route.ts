import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/apiAuth';
import {
  loadPublicSiteSettings,
  parsePublicSitePayload,
  savePublicSiteSettings,
} from '@/lib/public-site-settings';

export async function GET() {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;
    const settings = await loadPublicSiteSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Admin site settings fetch error:', error);
    return NextResponse.json({ error: 'Failed to load site settings' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const parsed = parsePublicSitePayload(body);
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    await savePublicSiteSettings(parsed);
    return NextResponse.json({ message: 'Site settings updated successfully', settings: parsed });
  } catch (error) {
    console.error('Admin site settings update error:', error);
    return NextResponse.json({ error: 'Failed to update site settings' }, { status: 500 });
  }
}
