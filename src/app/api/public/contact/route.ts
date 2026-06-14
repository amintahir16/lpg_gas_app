import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notifySuperAdmins } from '@/lib/superAdminNotifier';
import {
  buildInquiryNotificationCopy,
  isValidEmail,
  sanitizeWebsiteField,
} from '@/lib/website-inquiry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Honeypot — bots often fill hidden fields; silently accept to avoid retries.
    const honeypot = sanitizeWebsiteField(body.company, 100);
    if (honeypot) {
      return NextResponse.json({ success: true, id: 'accepted' });
    }

    const name = sanitizeWebsiteField(body.name, 120);
    const email = sanitizeWebsiteField(body.email, 200);
    const phone = sanitizeWebsiteField(body.phone, 40);
    const subject = sanitizeWebsiteField(body.subject, 200);
    const message = sanitizeWebsiteField(body.message, 5000);

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'Name, email, subject, and message are required.' }, { status: 400 });
    }
    if (!isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const inquiry = await prisma.websiteInquiry.create({
      data: {
        type: 'CONTACT',
        name,
        email,
        phone: phone || null,
        subject,
        message,
      },
    });

    const copy = buildInquiryNotificationCopy('CONTACT', { name, subject });
    await notifySuperAdmins({
      type: 'SYSTEM_ALERT',
      title: copy.title,
      message: copy.message,
      link: '/admin/website-inquiries',
      priority: 'HIGH',
      metadata: { inquiryId: inquiry.id, inquiryType: 'CONTACT' },
    });

    return NextResponse.json({ success: true, id: inquiry.id }, { status: 201 });
  } catch (error) {
    console.error('Public contact inquiry error:', error);
    return NextResponse.json({ error: 'Failed to submit inquiry. Please try again.' }, { status: 500 });
  }
}
