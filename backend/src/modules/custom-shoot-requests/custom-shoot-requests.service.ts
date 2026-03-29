import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PhotographersService } from '../photographers/photographers.service';

function genRequestNo(): string {
  return `CSR${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

@Injectable()
export class CustomShootRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly photographersService: PhotographersService,
  ) {}

  private async assertUserRole(userId: number, role: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!u || u.role !== role) {
      throw new ForbiddenException(
        role === 'user'
          ? '仅普通用户可发布定制需求'
          : '仅工作人员可查看接单广场',
      );
    }
  }

  /** 发布/查看「我的」定制需求：普通用户与管理员可用；工作人员走接单广场 */
  private async assertCustomShootClient(userId: number) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    if (!u) throw new ForbiddenException();
    if (u.role === 'worker') {
      throw new ForbiddenException(
        '工作人员请到「工作台 → 定制需求广场」查看与接单',
      );
    }
    if (u.role !== 'user' && u.role !== 'admin') {
      throw new ForbiddenException('当前账号无法使用定制旅拍需求');
    }
  }

  async create(
    userId: number,
    body: {
      title?: string;
      description?: string;
      location: string;
      style: string;
      shootingDate: string;
      duration?: number;
      numberOfPeople?: number;
      budgetHint?: number | null;
      contactName: string;
      phone: string;
    },
  ) {
    await this.assertCustomShootClient(userId);
    const location = String(body?.location || '').trim();
    const style = String(body?.style || '').trim();
    const shootingDate = String(body?.shootingDate || '').trim();
    const contactName = String(body?.contactName || '').trim();
    const phone = String(body?.phone || '').trim();
    if (!location || !style || !shootingDate || !contactName || !phone) {
      throw new BadRequestException(
        '请填写地点、风格、期望拍摄日、联系人及手机',
      );
    }
    const duration = Math.min(
      30,
      Math.max(1, Math.floor(Number(body?.duration) || 1)),
    );
    const numberOfPeople = Math.min(
      20,
      Math.max(1, Math.floor(Number(body?.numberOfPeople) || 2)),
    );
    let budgetHint: number | null = null;
    if (body?.budgetHint != null) {
      const n = Number(body.budgetHint);
      if (Number.isFinite(n) && n > 0) budgetHint = Math.floor(n);
    }

    return this.prisma.customShootRequest.create({
      data: {
        requestNo: genRequestNo(),
        userId,
        title: body.title?.trim() || null,
        description: body.description?.trim() || null,
        location,
        style,
        shootingDate,
        duration,
        numberOfPeople,
        budgetHint: budgetHint && budgetHint > 0 ? budgetHint : null,
        contactName,
        phone,
        status: 'open',
      },
      include: {
        photographer: { select: { id: true, name: true } },
      },
    });
  }

  async listMine(userId: number) {
    await this.assertCustomShootClient(userId);
    return this.prisma.customShootRequest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        photographer: { select: { id: true, name: true, avatar: true } },
        linkedBookingOrder: true,
      },
    });
  }

  async listMarket(workerUserId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: workerUserId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker') {
      throw new ForbiddenException('仅工作人员可访问');
    }
    // 广场：待接单 + 已被任一摄影师接单/确认的需求均展示，便于知晓已被谁接单
    return this.prisma.customShootRequest.findMany({
      where: {
        status: { in: ['open', 'pending_user_confirm', 'confirmed'] },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true } },
        photographer: { select: { id: true, name: true } },
      },
    });
  }

  async getOne(id: number, viewerUserId: number) {
    const row = await this.prisma.customShootRequest.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        photographer: { select: { id: true, name: true, avatar: true } },
      },
    });
    if (!row) throw new NotFoundException('需求不存在');

    const viewer = await this.prisma.user.findUnique({
      where: { id: viewerUserId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!viewer) throw new ForbiddenException();

    if (viewer.role === 'user') {
      if (row.userId !== viewerUserId) throw new ForbiddenException('无权查看');
      return row;
    }
    if (viewer.role === 'worker') {
      const pid = viewer.workerPhotographerId;
      if (row.status === 'open') return row;
      if (!pid) throw new ForbiddenException('请先绑定摄影师档案');
      if (row.photographerId === pid) return row;
      throw new ForbiddenException('无权查看该需求');
    }
    throw new ForbiddenException();
  }

  async cancel(userId: number, id: number) {
    await this.assertCustomShootClient(userId);
    const row = await this.prisma.customShootRequest.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('需求不存在');
    if (row.userId !== userId) throw new ForbiddenException('无权操作');
    if (row.status === 'cancelled') return row;
    if (row.status === 'confirmed') {
      throw new ConflictException(
        '已确认摄影师，如需取消请联系客服或摄影师沟通',
      );
    }
    return this.prisma.customShootRequest.update({
      where: { id },
      data: { status: 'cancelled' },
      include: { photographer: { select: { id: true, name: true } } },
    });
  }

  /**
   * 永久删除需求记录。
   * - 待用户确认接单：不可删（需先「不同意」等）。
   * - 已确认合作：同时删除关联的预约订单（booking_orders）。
   */
  async remove(userId: number, id: number) {
    await this.assertCustomShootClient(userId);
    const row = await this.prisma.customShootRequest.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('需求不存在');
    if (row.userId !== userId) throw new ForbiddenException('无权操作');
    if (row.status === 'pending_user_confirm') {
      throw new ConflictException(
        '请先点击「不同意」结束当前接单，或等待处理后再删除',
      );
    }
    if (
      row.status !== 'open' &&
      row.status !== 'cancelled' &&
      row.status !== 'confirmed'
    ) {
      throw new ConflictException('当前状态不可删除');
    }

    return this.prisma.$transaction(async (tx) => {
      const bo = await tx.bookingOrder.findFirst({
        where: { customShootRequestId: id },
        select: { id: true, orderNo: true },
      });
      let removedOrderNo: string | undefined;
      if (bo) {
        removedOrderNo = bo.orderNo;
        await tx.bookingOrder.delete({ where: { id: bo.id } });
      }
      await tx.customShootRequest.delete({ where: { id } });
      return { id, deleted: true as const, removedOrderNo };
    });
  }

  async claim(workerUserId: number, id: number, claimMessage?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: workerUserId },
      select: { id: true, role: true, workerPhotographerId: true, name: true },
    });
    if (!user || user.role !== 'worker') {
      throw new ForbiddenException('仅工作人员可接单');
    }
    await this.photographersService.assertPhotographerApprovedForWorker(
      workerUserId,
    );
    if (!user.workerPhotographerId) {
      throw new ForbiddenException('请先绑定摄影师档案后再接单');
    }

    const row = await this.prisma.customShootRequest.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('需求不存在');
    if (row.status !== 'open') {
      throw new ConflictException('该需求不可接单（已被接单或已关闭）');
    }

    return this.prisma.customShootRequest.update({
      where: { id },
      data: {
        status: 'pending_user_confirm',
        photographerId: user.workerPhotographerId,
        claimedWorkerUserId: user.id,
        claimMessage: claimMessage?.trim()?.slice(0, 500) || null,
        claimedAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true } },
        photographer: { select: { id: true, name: true } },
      },
    });
  }

  async withdrawClaim(workerUserId: number, id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: workerUserId },
      select: { id: true, role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker') {
      throw new ForbiddenException('仅工作人员可操作');
    }
    const row = await this.prisma.customShootRequest.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('需求不存在');
    if (row.status !== 'pending_user_confirm') {
      throw new ConflictException('当前状态不可撤回接单');
    }
    if (
      row.claimedWorkerUserId !== user.id ||
      row.photographerId !== user.workerPhotographerId
    ) {
      throw new ForbiddenException('仅能撤回本人发起的接单');
    }
    return this.prisma.customShootRequest.update({
      where: { id },
      data: {
        status: 'open',
        photographerId: null,
        claimedWorkerUserId: null,
        claimMessage: null,
        claimedAt: null,
      },
      include: { photographer: { select: { id: true, name: true } } },
    });
  }

  async confirmPhotographer(userId: number, id: number) {
    await this.assertCustomShootClient(userId);
    const row = await this.prisma.customShootRequest.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('需求不存在');
    if (row.userId !== userId) throw new ForbiddenException('无权操作');

    if (row.status === 'confirmed') {
      const full = await this.prisma.customShootRequest.findUnique({
        where: { id },
        include: {
          photographer: { select: { id: true, name: true, avatar: true } },
          linkedBookingOrder: true,
        },
      });
      if (!full) throw new NotFoundException('需求不存在');
      return {
        ...full,
        bookingOrder: full.linkedBookingOrder,
      };
    }

    if (row.status !== 'pending_user_confirm') {
      throw new ConflictException('当前无需确认或已处理');
    }

    if (row.photographerId && row.shootingDate) {
      const occupied = await this.prisma.bookingOrder.findFirst({
        where: {
          photographerId: row.photographerId,
          shootingDate: row.shootingDate,
          paymentStatus: { not: 'cancelled' },
        },
      });
      if (occupied) {
        throw new ConflictException(
          '该摄影师在该拍摄日已有其他预约，暂无法确认。请与摄影师沟通改期，或拒绝后等待其他摄影师接单。',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.customShootRequest.update({
        where: { id },
        data: {
          status: 'confirmed',
          userConfirmedAt: new Date(),
        },
        include: {
          photographer: { select: { id: true, name: true, avatar: true } },
        },
      });

      let bookingOrder = await tx.bookingOrder.findFirst({
        where: { customShootRequestId: id },
      });

      if (!bookingOrder) {
        const ph = updated.photographerId
          ? await tx.photographer.findUnique({
              where: { id: updated.photographerId },
              select: { name: true },
            })
          : null;
        const worker = updated.claimedWorkerUserId
          ? await tx.user.findUnique({
              where: { id: updated.claimedWorkerUserId },
              select: { name: true },
            })
          : null;

        const np = Math.max(1, updated.numberOfPeople);
        const hint = updated.budgetHint;
        const totalAmount =
          hint != null && hint > 0 ? Math.min(10_000_000, Math.floor(hint)) : 0;
        const unitPrice =
          totalAmount > 0 ? Math.max(1, Math.floor(totalAmount / np)) : 0;
        const orderNo = `ORD-${Date.now()}-${id}`;
        const paymentNo = `PAY-${Date.now()}`;
        const titlePart = updated.title
          ? ` · ${updated.title.slice(0, 80)}`
          : '';
        let packageName = `定制旅拍${titlePart}`;
        if (packageName.length > 255) {
          packageName = packageName.slice(0, 255);
        }

        bookingOrder = await tx.bookingOrder.create({
          data: {
            orderNo,
            packageId: null,
            packageName,
            location: updated.location.slice(0, 100),
            style: updated.style.slice(0, 100),
            duration: updated.duration,
            unitPrice,
            numberOfPeople: np,
            shootingDate: updated.shootingDate.slice(0, 40),
            contactName: updated.contactName.slice(0, 100),
            phone: updated.phone.slice(0, 40),
            paymentMethod: 'offline',
            remark:
              updated.description?.trim() ||
              `定制需求编号 ${updated.requestNo}`,
            photographerId: updated.photographerId,
            photographerName: ph?.name ? ph.name.slice(0, 100) : null,
            totalAmount,
            paymentStatus: 'offline_pending',
            paymentNo,
            userId: updated.userId,
            customShootRequestId: id,
            workerUserId: updated.claimedWorkerUserId,
            workerName: worker?.name ? worker.name.slice(0, 100) : null,
            workerType: 'photographer',
            workerTakenAt: updated.claimedAt ?? new Date(),
          },
        });
      }

      return { ...updated, bookingOrder };
    });
  }

  async rejectPhotographer(userId: number, id: number) {
    await this.assertCustomShootClient(userId);
    const row = await this.prisma.customShootRequest.findUnique({
      where: { id },
    });
    if (!row) throw new NotFoundException('需求不存在');
    if (row.userId !== userId) throw new ForbiddenException('无权操作');
    if (row.status !== 'pending_user_confirm') {
      throw new ConflictException('当前无可拒绝的接单');
    }
    return this.prisma.customShootRequest.update({
      where: { id },
      data: {
        status: 'open',
        photographerId: null,
        claimedWorkerUserId: null,
        claimMessage: null,
        claimedAt: null,
      },
      include: { photographer: { select: { id: true, name: true } } },
    });
  }
}
