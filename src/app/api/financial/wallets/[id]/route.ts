import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdmin } from '@/lib/apiAuth';
import { normalizePaymentMethodKey } from '@/lib/payment-methods';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;
    const body = await request.json();

    const existing = await prisma.bankWallet.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) {
        return NextResponse.json({ error: 'Wallet name cannot be empty' }, { status: 400 });
      }
      data.name = name;
    }

    if (body.type !== undefined) {
      data.type = String(body.type).toUpperCase();
    }

    if (body.accountNumber !== undefined) {
      data.accountNumber = body.accountNumber ? String(body.accountNumber).trim() : null;
    }

    if (body.accountTitle !== undefined) {
      data.accountTitle = body.accountTitle ? String(body.accountTitle).trim() : null;
    }

    if (body.bankName !== undefined) {
      data.bankName = body.bankName ? String(body.bankName).trim() : null;
    }

    if (body.gradient !== undefined) {
      data.gradient = String(body.gradient).trim();
    }

    if (body.labelTone !== undefined) {
      data.labelTone = String(body.labelTone).trim();
    }

    if (body.icon !== undefined) {
      data.icon = String(body.icon).trim();
    }

    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }

    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }

    if (body.sortOrder !== undefined) {
      data.sortOrder = Number.isInteger(body.sortOrder) ? Number(body.sortOrder) : existing.sortOrder;
    }

    const updated = await prisma.bankWallet.update({
      where: { id },
      data,
    });

    return NextResponse.json({ wallet: updated });
  } catch (error) {
    console.error('Wallet PUT error:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update wallet', details },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;

    const { id } = await context.params;

    const wallet = await prisma.bankWallet.findUnique({
      where: { id },
    });

    if (!wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 });
    }

    const code = wallet.code;
    const spaced = code.replace(/_/g, ' ');

    // Check if any transactions reference this wallet code
    const [
      b2bCount,
      b2cCount,
      vendorCount,
      officeExpCount,
      personalExpCount,
      salaryCount,
      movementCount,
    ] = await Promise.all([
      prisma.b2BTransaction.count({
        where: {
          OR: [{ paymentMethod: code }, { paymentMethod: spaced }],
        },
      }),
      prisma.b2CTransaction.count({
        where: {
          OR: [{ paymentMethod: code }, { paymentMethod: spaced }],
        },
      }),
      prisma.vendorPayment.count({
        where: {
          OR: [{ method: code }, { method: spaced }],
        },
      }),
      prisma.officeExpense.count({
        where: {
          OR: [{ paymentMethod: code }, { paymentMethod: spaced }],
        },
      }),
      prisma.personalExpense.count({
        where: {
          OR: [{ paymentMethod: code }, { paymentMethod: spaced }],
        },
      }),
      prisma.salaryRecord.count({
        where: {
          OR: [{ paymentMethod: code }, { paymentMethod: spaced }],
        },
      }),
      prisma.bankMovement.count({
        where: {
          OR: [
            { fromMethod: code },
            { fromMethod: spaced },
            { toMethod: code },
            { toMethod: spaced },
          ],
        },
      }),
    ]);

    const totalUsage =
      b2bCount +
      b2cCount +
      vendorCount +
      officeExpCount +
      personalExpCount +
      salaryCount +
      movementCount;

    if (totalUsage > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete "${wallet.name}" because it has ${totalUsage} linked transactions (B2B/B2C, vendor payments, expenses, movements). Please deactivate it instead so historical records are preserved.`,
          hasLinkedTransactions: true,
          totalUsage,
        },
        { status: 400 }
      );
    }

    await prisma.bankWallet.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Wallet "${wallet.name}" deleted successfully`,
    });
  } catch (error) {
    console.error('Wallet DELETE error:', error);
    const details = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to delete wallet', details },
      { status: 500 }
    );
  }
}
