import { PrismaClient } from '@prisma/client';

type CandidateOrder = {
  id: number;
  orderNo: string;
  phone: string | null;
  email: string | null;
};

function normalizePhone(v: string | null | undefined): string {
  return String(v || '').replace(/\D/g, '');
}

function normalizeEmail(v: string | null | undefined): string {
  return String(v || '').trim().toLowerCase();
}

async function main() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();

    const orders = (await prisma.bookingOrder.findMany({
      where: { userId: null },
      select: {
        id: true,
        orderNo: true,
        phone: true,
        email: true,
      },
      orderBy: { id: 'asc' },
    })) as CandidateOrder[];

    let matchedByEmail = 0;
    let matchedByPhone = 0;
    let skippedNoMatch = 0;
    let skippedAmbiguous = 0;
    let updated = 0;

    for (const o of orders) {
      const email = normalizeEmail(o.email);
      const phone = normalizePhone(o.phone);

      // 优先邮箱（唯一性强）
      if (email) {
        const users = await prisma.user.findMany({
          where: { email },
          select: { id: true },
          take: 2,
        });
        if (users.length === 1) {
          await prisma.bookingOrder.update({
            where: { id: o.id },
            data: { userId: users[0].id },
          });
          updated += 1;
          matchedByEmail += 1;
          continue;
        }
        if (users.length > 1) {
          skippedAmbiguous += 1;
          continue;
        }
      }

      // 退化到手机号（仅 11 位大陆手机号）
      if (/^1[3-9]\d{9}$/.test(phone)) {
        const users = await prisma.user.findMany({
          where: { phone },
          select: { id: true },
          take: 2,
        });
        if (users.length === 1) {
          await prisma.bookingOrder.update({
            where: { id: o.id },
            data: { userId: users[0].id },
          });
          updated += 1;
          matchedByPhone += 1;
          continue;
        }
        if (users.length > 1) {
          skippedAmbiguous += 1;
          continue;
        }
      }

      skippedNoMatch += 1;
    }

    // eslint-disable-next-line no-console
    console.log(
      [
        '[backfill-order-user-id] done',
        `total_candidates=${orders.length}`,
        `updated=${updated}`,
        `matched_by_email=${matchedByEmail}`,
        `matched_by_phone=${matchedByPhone}`,
        `skipped_no_match=${skippedNoMatch}`,
        `skipped_ambiguous=${skippedAmbiguous}`,
      ].join(' ')
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[backfill-order-user-id] failed', err);
  process.exit(1);
});

