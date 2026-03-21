import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  create(data: Prisma.BookingOrderCreateInput) {
    return this.prisma.bookingOrder.create({ data });
  }

  findAll() {
    return this.prisma.bookingOrder.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(id: number, status: string) {
    const nextPaymentStatus =
      status === '已支付'
        ? 'paid'
        : status === '已完成'
          ? 'completed'
          : status === '已取消'
            ? 'cancelled'
            : 'unpaid';

    return this.prisma.bookingOrder.update({
      where: { id },
      data: {
        paymentStatus: nextPaymentStatus,
        paidAt: nextPaymentStatus === 'paid' ? new Date() : undefined,
      },
    });
  }

  async getDashboardStats() {
    const [totalOrders, paidOrders, completedOrders, usersCount] =
      await Promise.all([
        this.prisma.bookingOrder.count(),
        this.prisma.bookingOrder.count({
          where: { paymentStatus: 'paid' },
        }),
        this.prisma.bookingOrder.count({
          where: { paymentStatus: 'completed' },
        }),
        this.prisma.user.count(),
      ]);

    const locationGroups = await this.prisma.bookingOrder.groupBy({
      by: ['location'],
      _count: { location: true },
      orderBy: { _count: { location: 'desc' } },
      take: 5,
    });

    const orderStatusRows = await this.prisma.bookingOrder.findMany({
      select: { paymentStatus: true },
    });
    const statusCount: Record<string, number> = {};
    for (const row of orderStatusRows) {
      const s = row.paymentStatus;
      statusCount[s] = (statusCount[s] || 0) + 1;
    }
    const orderByStatus = Object.entries(statusCount).map(
      ([status, count]) => ({
        status,
        count,
      }),
    );

    return {
      totalOrders,
      paidOrders,
      completedOrders,
      usersCount,
      hotLocations: locationGroups.map((x, idx) => ({
        rank: idx + 1,
        name: x.location,
        count: x._count.location,
      })),
      orderByStatus,
    };
  }
}
