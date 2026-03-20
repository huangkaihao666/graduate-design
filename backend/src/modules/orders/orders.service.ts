import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(data: any) {
    return (this.prisma as any).bookingOrder.create({ data });
  }

  async findAll() {
    return (this.prisma as any).bookingOrder.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: number, status: string) {
    const nextPaymentStatus =
      status === '已支付'
        ? 'paid'
        : status === '已完成'
          ? 'completed'
          : status === '已取消'
            ? 'cancelled'
            : 'unpaid';

    return (this.prisma as any).bookingOrder.update({
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
        (this.prisma as any).bookingOrder.count(),
        (this.prisma as any).bookingOrder.count({
          where: { paymentStatus: 'paid' },
        }),
        (this.prisma as any).bookingOrder.count({
          where: { paymentStatus: 'completed' },
        }),
        this.prisma.user.count(),
      ]);

    const locationGroups = await (this.prisma as any).bookingOrder.groupBy({
      by: ['location'],
      _count: { location: true },
      orderBy: { _count: { location: 'desc' } },
      take: 5,
    });

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
    };
  }
}
