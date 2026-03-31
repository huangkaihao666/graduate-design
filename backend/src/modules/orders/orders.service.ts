import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PhotographersService } from '../photographers/photographers.service';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private photographersService: PhotographersService,
  ) {}

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

  private isMakeupProfile(profile: {
    name?: string | null;
    title?: string | null;
    shootingStyle?: string | null;
    specialtyTopics?: string | null;
    bio?: string | null;
  }): boolean {
    const hay = [
      profile.name || '',
      profile.title || '',
      profile.shootingStyle || '',
      profile.specialtyTopics || '',
      profile.bio || '',
    ]
      .join(' ')
      .toLowerCase();
    const keys = [
      '化妆',
      '妆造',
      '新娘妆',
      '跟妆',
      'makeup',
      'mua',
      '试妆',
      '造型',
    ];
    return keys.some((k) => hay.includes(k));
  }

  private async validateMakeupArtistAvailability(
    makeupArtistId: number,
    shootingDate: string,
    ignoreOrderId?: number,
  ) {
    const makeup = await this.prisma.photographer.findUnique({
      where: { id: makeupArtistId },
      select: {
        id: true,
        name: true,
        title: true,
        shootingStyle: true,
        specialtyTopics: true,
        bio: true,
        enabled: true,
        approvalStatus: true,
        availableDates: true,
        restDates: true,
      },
    });
    if (!makeup || !makeup.enabled || makeup.approvalStatus !== 'approved') {
      throw new ConflictException('指定妆造师不可用，请更换');
    }
    if (!this.isMakeupProfile(makeup)) {
      throw new ConflictException('指定档案不是妆造师，请重新选择');
    }
    const available = this.normalizeDateStrings(makeup.availableDates ?? []);
    const rest = this.normalizeDateStrings(makeup.restDates ?? []);
    if (!available.includes(shootingDate) || rest.includes(shootingDate)) {
      throw new ConflictException(
        '指定妆造师该日期档期不可用，请更换日期或妆造师',
      );
    }
    const conflict = await this.prisma.bookingOrder.findFirst({
      where: {
        id: ignoreOrderId ? { not: ignoreOrderId } : undefined,
        OR: [
          { assignedMakeupArtistId: makeupArtistId } as any,
          { requestedMakeupArtistId: makeupArtistId } as any,
        ],
        shootingDate,
        paymentStatus: { not: 'cancelled' },
      } as any,
      select: { id: true },
    });
    if (conflict) {
      throw new ConflictException('指定妆造师该日期已被占用，请更换');
    }
    return makeup;
  }

  private async autoPickMakeupArtist(
    shootingDate: string,
    orderStyle: string,
  ): Promise<{ id: number; name: string } | null> {
    const rows = await this.prisma.photographer.findMany({
      where: { enabled: true, approvalStatus: 'approved' },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
      select: {
        id: true,
        name: true,
        title: true,
        shootingStyle: true,
        specialtyTopics: true,
        bio: true,
        availableDates: true,
        restDates: true,
      },
    });
    const styleNeedle = String(orderStyle || '').toLowerCase();
    const makeupList = rows.filter((r) => this.isMakeupProfile(r));

    const availableList = makeupList.filter((m) => {
      const available = this.normalizeDateStrings(m.availableDates ?? []);
      const rest = this.normalizeDateStrings(m.restDates ?? []);
      return available.includes(shootingDate) && !rest.includes(shootingDate);
    });
    if (!availableList.length) return null;

    const withLoad = await Promise.all(
      availableList.map(async (m) => {
        const occupied = await this.prisma.bookingOrder.count({
          where: {
            assignedMakeupArtistId: m.id,
            shootingDate,
            paymentStatus: { not: 'cancelled' },
          } as any,
        });
        const styleHit = String(
          `${m.shootingStyle || ''} ${m.specialtyTopics || ''}`,
        )
          .toLowerCase()
          .includes(styleNeedle);
        return { id: m.id, name: m.name, occupied, styleHit };
      }),
    );

    withLoad.sort((a, b) => {
      if (a.styleHit !== b.styleHit) return a.styleHit ? -1 : 1;
      if (a.occupied !== b.occupied) return a.occupied - b.occupied;
      return a.id - b.id;
    });
    const best = withLoad[0];
    return best ? { id: best.id, name: best.name } : null;
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
    const requestedMakeupArtistId =
      typeof (data as any).requestedMakeupArtistId === 'number'
        ? (data as any).requestedMakeupArtistId
        : undefined;
    if (requestedMakeupArtistId && shootingDate) {
      const mk = await this.validateMakeupArtistAvailability(
        requestedMakeupArtistId,
        shootingDate,
      );
      (data as any).requestedMakeupArtistName =
        (data as any).requestedMakeupArtistName || mk.name;
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

  async getBookedDatesByMakeupArtist(makeupArtistId: number) {
    const rows = await this.prisma.bookingOrder.findMany({
      where: {
        assignedMakeupArtistId: makeupArtistId,
        paymentStatus: { not: 'cancelled' },
      } as any,
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

  async findForUser(userId: number) {
    if (!Number.isFinite(userId) || userId <= 0) {
      throw new ForbiddenException('无效用户');
    }
    return this.prisma.bookingOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * 工作人员订单列表：
   * - 未绑定本店摄影师（演示账号）：返回全部订单
   * - 已绑定 photographerId：仅返回该摄影师订单，或已指派给当前工作人员账号的订单
   */
  async findForWorkerUser(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker') {
      throw new ForbiddenException('仅工作人员可访问');
    }
    if (!user.workerPhotographerId) {
      return this.findAll();
    }
    const pid = user.workerPhotographerId;
    const profile = await this.prisma.photographer.findUnique({
      where: { id: pid },
      select: {
        id: true,
        name: true,
        title: true,
        shootingStyle: true,
        specialtyTopics: true,
        bio: true,
      },
    });
    if (profile && this.isMakeupProfile(profile)) {
      return this.prisma.bookingOrder.findMany({
        where: {
          OR: [
            { assignedMakeupArtistId: pid } as any,
            {
              requestedMakeupArtistId: pid,
              assignedMakeupArtistId: null,
            } as any,
          ],
        } as any,
        orderBy: { createdAt: 'desc' },
      });
    }
    return this.prisma.bookingOrder.findMany({
      where: {
        OR: [{ photographerId: pid }, { workerUserId: userId }],
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async takeForWorkerUser(userId: number, orderId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker') {
      throw new ForbiddenException('仅工作人员可访问');
    }

    await this.photographersService.assertPhotographerApprovedForWorker(userId);

    const order = (await this.prisma.bookingOrder.findUnique({
      where: { id: orderId },
    })) as any;
    if (!order) throw new NotFoundException('订单不存在');

    if (user.workerPhotographerId) {
      const profile = await this.prisma.photographer.findUnique({
        where: { id: user.workerPhotographerId },
        select: {
          id: true,
          name: true,
          title: true,
          shootingStyle: true,
          specialtyTopics: true,
          bio: true,
          fixedMakeupArtistId: true,
        },
      });
      if (profile && this.isMakeupProfile(profile)) {
        throw new ForbiddenException(
          '妆造师不参与抢单，仅需确认已分配订单档期',
        );
      }
    }

    // 若账号绑定了摄影师，仅允许接与该摄影师相关订单
    if (
      user.workerPhotographerId &&
      order.photographerId &&
      order.photographerId !== user.workerPhotographerId
    ) {
      throw new ForbiddenException('无权接单：订单不属于当前摄影师');
    }

    // 已被其他工作人员接单则提示
    if (order.workerUserId && Number(order.workerUserId) !== userId) {
      throw new ConflictException('该订单已被其他工作人员接单');
    }

    const updated = await this.prisma.bookingOrder.update({
      where: { id: orderId },
      data: {
        workerUserId: user.id,
        workerName: user.name,
        workerType: 'photographer',
        workerTakenAt: new Date(),
      } as any,
    });

    const photographerProfile = user.workerPhotographerId
      ? await this.prisma.photographer.findUnique({
          where: { id: user.workerPhotographerId },
          select: { fixedMakeupArtistId: true },
        })
      : null;
    const requestedMid = Number(order.requestedMakeupArtistId || 0) || null;
    const fixedMid =
      Number(photographerProfile?.fixedMakeupArtistId || 0) || null;
    let assigned: { id: number; name: string } | null = null;

    if (requestedMid) {
      const mk = await this.validateMakeupArtistAvailability(
        requestedMid,
        String(order.shootingDate || '').trim(),
        Number(order.id),
      );
      assigned = { id: mk.id, name: mk.name };
    } else if (fixedMid) {
      try {
        const mk = await this.validateMakeupArtistAvailability(
          fixedMid,
          String(order.shootingDate || '').trim(),
          Number(order.id),
        );
        assigned = { id: mk.id, name: mk.name };
      } catch {
        assigned = null;
      }
    }
    if (!assigned) {
      assigned = await this.autoPickMakeupArtist(
        String(order.shootingDate || '').trim(),
        String(order.style || '').trim(),
      );
    }
    if (!assigned) return updated;

    return this.prisma.bookingOrder.update({
      where: { id: orderId },
      data: {
        assignedMakeupArtistId: assigned.id,
        assignedMakeupArtistName: assigned.name,
        makeupScheduleStatus: 'pending',
        makeupScheduleConfirmedAt: null,
      } as any,
    });
  }

  async confirmMakeupScheduleForWorkerUser(userId: number, orderId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      throw new ForbiddenException('仅妆造师可操作');
    }
    const pid = user.workerPhotographerId;
    const profile = await this.prisma.photographer.findUnique({
      where: { id: pid },
      select: {
        id: true,
        name: true,
        title: true,
        shootingStyle: true,
        specialtyTopics: true,
        bio: true,
      },
    });
    if (!profile || !this.isMakeupProfile(profile)) {
      throw new ForbiddenException('当前账号不是妆造师');
    }
    const order = (await this.prisma.bookingOrder.findUnique({
      where: { id: orderId },
    })) as any;
    if (!order) throw new NotFoundException('订单不存在');
    if (Number(order.assignedMakeupArtistId || 0) !== pid) {
      throw new ForbiddenException('该订单未分配给当前妆造师');
    }
    return this.prisma.bookingOrder.update({
      where: { id: orderId },
      data: {
        makeupScheduleStatus: 'confirmed',
        makeupScheduleConfirmedAt: new Date(),
      } as any,
    });
  }

  async rescheduleForWorkerUser(
    userId: number,
    orderId: number,
    body: { newShootingDate: string; note?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker') {
      throw new ForbiddenException('仅工作人员可访问');
    }

    await this.photographersService.assertPhotographerApprovedForWorker(userId);

    const order = (await this.prisma.bookingOrder.findUnique({
      where: { id: orderId },
    })) as any;
    if (!order) throw new NotFoundException('订单不存在');

    // 若绑定摄影师，则仅允许改自己的订单
    if (
      user.workerPhotographerId &&
      order.photographerId &&
      order.photographerId !== user.workerPhotographerId
    ) {
      throw new ForbiddenException('无权改期：订单不属于当前摄影师');
    }

    const nextDate = String(body?.newShootingDate || '').trim();
    this.parseIsoDate(nextDate);
    if (nextDate === String(order.shootingDate || '').trim()) {
      throw new BadRequestException('新拍摄日期不能与当前日期相同');
    }

    // 校验摄影师档期冲突（同一 photographerId + shootingDate 不可重复）
    if (order.photographerId) {
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
        throw new ConflictException('目标日期已被预约，请选择其他日期');
      }
    }

    const note = String(body?.note || '').trim();
    return this.prisma.bookingOrder.update({
      where: { id: orderId },
      data: {
        shootingDate: nextDate,
        // 复用既有字段用于记录改期说明（便于后台追溯）
        rescheduleRequestStatus: 'approved',
        rescheduleReviewNote: note || '工作人员改期',
        rescheduleReviewedAt: new Date(),
      } as any,
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
