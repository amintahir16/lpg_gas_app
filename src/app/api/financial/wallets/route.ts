import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/apiAuth';
import { DEFAULT_WALLETS, normalizePaymentMethodKey } from '@/lib/payment-methods';

/** Ensure default core wallets exist in DB if table is empty */
async function ensureDefaultWalletsExist() {
  const count = await prisma.bankWallet.count();
  if (count === 0) {
    for (const w of DEFAULT_WALLETS) {
      await prisma.bankWallet.upsert({
        where: { code: w.code },
        update: {},
        create: {
          name: w.name,
          code: w.code,
          type: w.type || 'BANK',
          gradient: w.gradient || 'from-indigo-500 to-indigo-600',
          labelTone: w.labelTone || 'text-indigo-100',
          icon: w.icon || 'BANK',
          description: w.description || null,
          isActive: w.isActive ?? true,
          isDefault: w.isDefault ?? false,
          sortOrder: w.sortOrder ?? 0,
        },
      });
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    await ensureDefaultWalletsExist();

    const { searchParams } = new URL(request.url);
    const includeInactive = searchParams.get('includeInactive') === 'true';

    const wallets = await prisma.bankWallet.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return NextResponse.json({ wallets });
  } catch (error) {
    console.error('Wallets GET API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bank/wallets' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ error: 'Wallet name is required' }, { status: 400 });
    }

    const rawCode = body.code ? String(body.code) : name;
    const code = normalizePaymentMethodKey(rawCode);
    if (!code) {
      return NextResponse.json({ error: 'Valid wallet code is required' }, { status: 400 });
    }

    const type = String(body.type || 'BANK').toUpperCase();
    const accountNumber = body.accountNumber ? String(body.accountNumber).trim() : null;
    const accountTitle = body.accountTitle ? String(body.accountTitle).trim() : null;
    const bankName = body.bankName ? String(body.bankName).trim() : null;
    const gradient = body.gradient ? String(body.gradient).trim() : 'from-indigo-500 to-indigo-600';
    const labelTone = body.labelTone ? String(body.labelTone).trim() : 'text-indigo-100';
    const icon = body.icon ? String(body.icon).trim() : 'BANK';
    const description = body.description ? String(body.description).trim() : null;
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true;
    const sortOrder = Number.isInteger(body.sortOrder) ? Number(body.sortOrder) : 0;

    const existing = await prisma.bankWallet.findFirst({
      where: {
        OR: [
          { code: { equals: code, mode: 'insensitive' } },
          { name: { equals: name, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Wallet with name "${name}" or code "${code}" already exists` },
        { status: 409 }
      );
    }

    const wallet = await prisma.bankWallet.create({
      data: {
        name,
        code,
        type,
        accountNumber,
        accountTitle,
        bankName,
        gradient,
        labelTone,
        icon,
        description,
        isActive,
        isDefault: false,
        sortOrder,
      },
    });

    return NextResponse.json({ wallet }, { status: 201 });
  } catch (error) {
    console.error('Wallets POST API error:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create wallet', details },
      { status: 500 }
    );
  }
}
