import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { notifySuperAdmins } from '@/lib/superAdminNotifier';
import {
  buildInquiryNotificationCopy,
  computeCartTotal,
  isValidEmail,
  normalizeCartItems,
  sanitizeWebsiteField,
} from '@/lib/website-inquiry';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const honeypot = sanitizeWebsiteField(body.company, 100);
    if (honeypot) {
      return NextResponse.json({ success: true, id: 'accepted' });
    }

    const name = sanitizeWebsiteField(body.name, 120);
    const email = sanitizeWebsiteField(body.email, 200);
    const phone = sanitizeWebsiteField(body.phone, 40);
    const deliveryAddress = sanitizeWebsiteField(body.deliveryAddress, 500);
    const notes = sanitizeWebsiteField(body.notes, 2000);
    const items = normalizeCartItems(body.items);

    if (!name || !phone || !deliveryAddress) {
      return NextResponse.json(
        { error: 'Name, phone, and delivery address are required.' },
        { status: 400 }
      );
    }
    if (email && !isValidEmail(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ error: 'Your cart is empty.' }, { status: 400 });
    }

    const totalAmount = computeCartTotal(items);
    const message = [
      `Delivery address: ${deliveryAddress}`,
      notes ? `Notes: ${notes}` : null,
      `Items: ${items.map((i) => `${i.name}${i.size ? ` (${i.size})` : ''} x${i.quantity}`).join(', ')}`,
    ]
      .filter(Boolean)
      .join('\n');

    const inquiry = await prisma.websiteInquiry.create({
      data: {
        type: 'SHOP_ORDER',
        name,
        email: email || null,
        phone,
        subject: 'Shop trolley checkout',
        message,
        deliveryAddress,
        cartItems: items,
        totalAmount,
      },
    });

    const copy = buildInquiryNotificationCopy('SHOP_ORDER', { name, totalAmount });
    await notifySuperAdmins({
      type: 'SYSTEM_ALERT',
      title: copy.title,
      message: copy.message,
      link: '/admin/website-inquiries',
      priority: 'HIGH',
      metadata: { inquiryId: inquiry.id, inquiryType: 'SHOP_ORDER' },
    });

    return NextResponse.json({ success: true, id: inquiry.id }, { status: 201 });
  } catch (error) {
    console.error('Public shop order error:', error);
    return NextResponse.json({ error: 'Failed to submit order. Please try again.' }, { status: 500 });
  }
}
