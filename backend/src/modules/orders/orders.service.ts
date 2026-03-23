import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  private normalizeDateStrings(v: unknown): string[] {
    const arr = Array.isArray(v) ? v.map((x) => String(x)) : [];
    const seen = new Set<string>();
    const out: string[] = [];
    const re = /^\d{4}-\d{2}-\d{2}$/;
    for (const s of arr) {
      const t = s.trim();
      if (!re.test(t) || seen.has(t)) continue;
      seen.add(t);
      out.push(t);
    }
    return out.sort();
  }

  private parseIsoDate(v: string): Date {
    const t = String(v || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) {
      throw new BadRequestException('日期格式错误，请使用 YYYY-MM-DD');
    }
    const d = new Date(`${t}T00:00:00`);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException('日期格式错误，请使用 YYYY-MM-DD');
    }
    return d;
  }

  private canFreeReschedule(currentShootingDate: string): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const shoot = this.parseIsoDate(currentShootingDate);
    const diffMs = shoot.getTime() - today.getTime();
    const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
    return diffDays >= 3;
  }

  async create(data: Prisma.BookingOrderCreateInput) {
    const photographerId =
      typeof data.photographerId === 'number' ? data.photographerId : undefined;
    const shootingDate = String(data.shootingDate || '').trim();
    if (photographerId && shootingDate) {
      const occupied = await this.prisma.bookingOrder.findFirst({
        where: {
          photographerId,
          shootingDate,
          paymentStatus: { not: 'cancelled' },
        },
        select: { id: true },
      });
      if (occupied) {
        throw new ConflictException('该摄影师在该日期已被预约，请选择其他日期');
      }
    }
    return this.prisma.bookingOrder.create({ data });
  }

  findById(id: number) {
    return this.prisma.bookingOrder.findUnique({ where: { id } });
  }

  findByOrderNo(orderNo: string) {
    return this.prisma.bookingOrder.findUnique({ where: { orderNo } });
  }

  updatePaymentNo(id: number, paymentNo: string) {
    return this.prisma.bookingOrder.update({
      where: { id },
      data: { paymentNo },
    });
  }

  markPaidByOrderNo(orderNo: string) {
    return this.prisma.bookingOrder.update({
      where: { orderNo },
      data: {
        paymentStatus: 'paid',
        paidAt: new Date(),
      },
    });
  }

  async getBookedDatesByPhotographer(photographerId: number) {
    const rows = await this.prisma.bookingOrder.findMany({
      where: {
        photographerId,
        paymentStatus: { not: 'cancelled' },
      },
      select: { shootingDate: true },
      orderBy: { shootingDate: 'asc' },
    });
    return [
      ...new Set(
        rows.map((x) => String(x.shootingDate).trim()).filter(Boolean),
      ),
    ];
  }

  async requestReschedule(
    id: number,
    body: { newShootingDate: string; reason?: string },
  ) {
    const order = (await this.prisma.bookingOrder.findUnique({
      where: { id },
    })) as any;
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (order.paymentStatus === 'cancelled') {
      throw new ConflictException('已取消订单不支持改期');
    }
    if ((order.rescheduleCount || 0) >= 1) {
      throw new ConflictException('该订单已使用过一次免费改期');
    }
    if (order.rescheduleRequestStatus === 'pending') {
      throw new ConflictException('该订单已有待审批的改期申请');
    }
    if (!this.canFreeReschedule(order.shootingDate)) {
      throw new ConflictException('仅支持拍摄日前 3 天及以上免费改期一次');
    }

    const nextDate = String(body.newShootingDate || '').trim();
    this.parseIsoDate(nextDate);
    if (nextDate === order.shootingDate) {
      throw new BadRequestException('新拍摄日期不能与当前日期相同');
    }

    if (order.photographerId) {
      const p = await this.prisma.photographer.findUnique({
        where: { id: order.photographerId },
        select: { availableDates: true, enabled: true },
      });
      const availableDates = this.normalizeDateStrings(
        (p as any)?.availableDates ?? [],
      );
      if (!availableDates.includes(nextDate)) {
        throw new ConflictException(
          '新日期不在该摄影师可预约档期内，请选择档期内日期',
        );
      }

      const occupied = await this.prisma.bookingOrder.findFirst({
        where: {
          id: { not: order.id },
          photographerId: order.photographerId,
          shootingDate: nextDate,
          paymentStatus: { not: 'cancelled' },
        },
        select: { id: true },
      });
      if (occupied) {
        throw new ConflictException(
          '该摄影师在目标日期已被预约，请改选其他日期',
        );
      }
    }

    return this.prisma.bookingOrder.update({
      where: { id },
      data: {
        rescheduleRequestStatus: 'pending',
        rescheduleRequestedDate: nextDate,
        rescheduleRequestReason: body.reason?.trim() || null,
        rescheduleRequestedAt: new Date(),
        rescheduleReviewNote: null,
        rescheduleReviewedAt: null,
      } as any,
    });
  }

  async reviewRescheduleRequest(
    id: number,
    body: { action: 'approve' | 'reject'; reviewNote?: string },
  ) {
    const order = (await this.prisma.bookingOrder.findUnique({
      where: { id },
    })) as any;
    if (!order) {
      throw new NotFoundException('订单不存在');
    }
    if (
      order.rescheduleRequestStatus !== 'pending' ||
      !order.rescheduleRequestedDate
    ) {
      throw new ConflictException('该订单当前无待审批改期申请');
    }

    const note = body.reviewNote?.trim() || '';
    if (!note) {
      throw new BadRequestException('审批备注必填');
    }
    if (body.action === 'reject') {
      return this.prisma.bookingOrder.update({
        where: { id },
        data: {
          rescheduleRequestStatus: 'rejected',
          rescheduleReviewNote: note,
          rescheduleReviewedAt: new Date(),
        } as any,
      });
    }

    const nextDate = order.rescheduleRequestedDate;
    this.parseIsoDate(nextDate);
    if (order.photographerId) {
      const p = await this.prisma.photographer.findUnique({
        where: { id: order.photographerId },
        select: { availableDates: true, enabled: true },
      });
      const availableDates = this.normalizeDateStrings(
        (p as any)?.availableDates ?? [],
      );
      if (!availableDates.includes(nextDate)) {
        throw new ConflictException(
          '审批失败：目标日期已不在摄影师可预约档期内',
        );
      }

      const occupied = await this.prisma.bookingOrder.findFirst({
        where: {
          id: { not: order.id },
          photographerId: order.photographerId,
          shootingDate: nextDate,
          paymentStatus: { not: 'cancelled' },
        },
        select: { id: true },
      });
      if (occupied) {
        throw new ConflictException('审批失败：该摄影师在目标日期已被预约');
      }
    }

    return this.prisma.bookingOrder.update({
      where: { id },
      data: {
        shootingDate: nextDate,
        rescheduleCount: { increment: 1 },
        rescheduleRequestStatus: 'approved',
        rescheduleReviewNote: note,
        rescheduleReviewedAt: new Date(),
      } as any,
    });
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
