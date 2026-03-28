import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AvatarUploadFile } from '../users/users.service';

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x));
  }
  return [];
}

/** 档期日期：去重、排序、过滤非法格式 */
function normalizeDateStrings(v: unknown): string[] {
  const raw = asStringArray(v);
  const seen = new Set<string>();
  const out: string[] = [];
  const re = /^\d{4}-\d{2}-\d{2}$/;
  for (const s of raw) {
    const t = s.trim();
    if (!re.test(t) || seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out.sort();
}

/** 休息日与可约日互斥时，输出层以可约为准 */
function restDatesMinusAvailable(
  rest: string[],
  available: string[],
): string[] {
  const a = new Set(available);
  return rest.filter((d) => !a.has(d));
}

type PhotographerRow = {
  id: number;
  name: string;
  title: string | null;
  avatar: string | null;
  shootingStyle: string;
  yearsExperience: number;
  bio: string | null;
  gender: string | null;
  age: number | null;
  specialtyTopics: string | null;
  awards: string | null;
  portfolioImages: unknown;
  availableDates: unknown;
  restDates: unknown;
  scheduleNote: string | null;
  sortOrder: number;
  enabled: boolean;
  approvalStatus: string;
  approvalReviewNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class PhotographersService {
  constructor(private readonly prisma: PrismaService) {}

  buildDataUrlFromImage(file: AvatarUploadFile | undefined): { url: string } {
    if (!file) {
      throw new BadRequestException('请选择图片文件');
    }
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('只能上传图片文件');
    }
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('图片大小不能超过 5MB');
    }
    const url = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    return { url };
  }

  private mapPublic(row: PhotographerRow) {
    const availableDates = normalizeDateStrings(row.availableDates);
    const restDates = restDatesMinusAvailable(
      normalizeDateStrings(row.restDates),
      availableDates,
    );
    return {
      id: row.id,
      name: row.name,
      title: row.title ?? undefined,
      avatar: row.avatar ?? undefined,
      shootingStyle: row.shootingStyle,
      yearsExperience: row.yearsExperience,
      bio: row.bio ?? undefined,
      gender: row.gender ?? undefined,
      age: row.age ?? undefined,
      specialtyTopics: row.specialtyTopics ?? undefined,
      awards: row.awards ?? undefined,
      portfolioImages: asStringArray(row.portfolioImages),
      availableDates,
      restDates,
      scheduleNote: row.scheduleNote ?? undefined,
      sortOrder: row.sortOrder,
    };
  }

  private toAdminListItem(row: PhotographerRow) {
    return {
      ...this.mapPublic(row),
      enabled: row.enabled,
      approvalStatus: row.approvalStatus,
      approvalReviewNote: row.approvalReviewNote ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** 用户端：已上架且审核通过 */
  async findPublic() {
    const rows = await this.prisma.photographer.findMany({
      where: { enabled: true, approvalStatus: 'approved' },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => this.mapPublic(r as PhotographerRow));
  }

  async findOnePublic(id: number) {
    const row = await this.prisma.photographer.findFirst({
      where: { id, enabled: true, approvalStatus: 'approved' },
    });
    if (!row) {
      throw new NotFoundException('摄影师不存在或已下架');
    }
    return this.mapPublic(row as PhotographerRow);
  }

  async findAllAdmin() {
    const rows = await this.prisma.photographer.findMany({
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((r) => this.toAdminListItem(r as PhotographerRow));
  }

  async findMineByUserId(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      throw new ForbiddenException('当前账号未绑定摄影师档案');
    }
    const row = await this.prisma.photographer.findUnique({
      where: { id: user.workerPhotographerId },
    });
    if (!row) {
      throw new NotFoundException('摄影师档案不存在');
    }
    return this.toAdminListItem(row as PhotographerRow);
  }

  /** 提交审核前：档案须已保存且必填项完整 */
  private assertProfileCompleteForSubmitApproval(
    row: {
      name: string;
      avatar: string | null;
      shootingStyle: string;
      bio: string | null;
      specialtyTopics: string | null;
      portfolioImages: unknown;
    },
    user: { name: string; phone: string | null },
  ): void {
    const missing: string[] = [];
    const pname = String(row.name || '').trim();
    const uname = String(user.name || '').trim();
    if (!pname || !uname) missing.push('姓名');
    if (!String(row.avatar || '').trim()) missing.push('头像');
    const bio = String(row.bio || '').trim();
    if (!bio || bio.length < 10) missing.push('个人简介（至少10个字）');
    const style = String(row.shootingStyle || '').trim();
    if (!style || style === '（请补充拍摄风格）') missing.push('擅长风格');
    const phone = String(user.phone || '').trim();
    if (!/^1[3-9]\d{9}$/.test(phone)) missing.push('绑定11位手机号');
    if (!String(row.specialtyTopics || '').trim()) missing.push('擅长题材');
    const imgs = asStringArray(row.portfolioImages).filter(Boolean);
    if (imgs.length < 1) missing.push('至少一张作品');
    if (missing.length) {
      throw new BadRequestException(
        `请先完善个人信息并保存后再提交审核，尚缺：${missing.join('、')}`,
      );
    }
  }

  async submitForApprovalByUserId(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        workerPhotographerId: true,
        name: true,
        phone: true,
      },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      throw new ForbiddenException('当前账号未绑定摄影师档案');
    }
    const row = await this.prisma.photographer.findUnique({
      where: { id: user.workerPhotographerId },
      select: {
        id: true,
        approvalStatus: true,
        name: true,
        avatar: true,
        shootingStyle: true,
        bio: true,
        specialtyTopics: true,
        portfolioImages: true,
      },
    });
    if (!row) throw new NotFoundException('摄影师档案不存在');
    if (!['draft', 'rejected'].includes(row.approvalStatus)) {
      throw new BadRequestException('当前状态不可提交审核');
    }
    this.assertProfileCompleteForSubmitApproval(row, {
      name: user.name,
      phone: user.phone,
    });
    await this.prisma.photographer.update({
      where: { id: row.id },
      data: { approvalStatus: 'pending', approvalReviewNote: null },
    });
    return { ok: true as const };
  }

  async updateMineByUserId(
    userId: number,
    data: Partial<{
      name: string;
      avatar: string | null;
      shootingStyle: string;
      yearsExperience: number;
      bio: string | null;
      gender: string | null;
      age: number | null;
      specialtyTopics: string | null;
      awards: string | null;
      portfolioImages: string[];
      availableDates: string[];
      restDates: string[];
      scheduleNote: string | null;
    }>,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      throw new ForbiddenException('仅摄影师账号可编辑本档案');
    }
    const id = user.workerPhotographerId;
    await this.ensureExists(id);

    await this.prisma.$transaction(async (tx) => {
      if (data.name !== undefined) {
        const n = String(data.name || '').trim();
        if (n) {
          await tx.user.update({
            where: { id: userId },
            data: { name: n },
          });
        }
      }
      const patch = await this.buildProfilePatch(id, data, tx);
      if (Object.keys(patch).length > 0) {
        await tx.photographer.update({ where: { id }, data: patch });
      }
    });

    return this.findMineByUserId(userId);
  }

  private async buildProfilePatch(
    id: number,
    data: Partial<{
      name: string;
      avatar: string | null;
      shootingStyle: string;
      yearsExperience: number;
      bio: string | null;
      gender: string | null;
      age: number | null;
      specialtyTopics: string | null;
      awards: string | null;
      portfolioImages: string[];
      availableDates: string[];
      restDates: string[];
      scheduleNote: string | null;
    }>,
    tx: Prisma.TransactionClient = this.prisma,
  ): Promise<Prisma.PhotographerUpdateInput> {
    const patch: Prisma.PhotographerUpdateInput = {};
    if (data.name !== undefined) {
      const n = String(data.name || '').trim();
      if (n) patch.name = n;
    }
    if (data.avatar !== undefined) patch.avatar = data.avatar;
    if (data.shootingStyle !== undefined)
      patch.shootingStyle = data.shootingStyle;
    if (data.yearsExperience !== undefined) {
      patch.yearsExperience = data.yearsExperience;
    }
    if (data.bio !== undefined) patch.bio = data.bio;
    if (data.gender !== undefined) patch.gender = data.gender;
    if (data.age !== undefined) patch.age = data.age;
    if (data.specialtyTopics !== undefined) {
      patch.specialtyTopics = data.specialtyTopics;
    }
    if (data.awards !== undefined) patch.awards = data.awards;
    if (data.portfolioImages !== undefined) {
      patch.portfolioImages =
        data.portfolioImages as unknown as Prisma.InputJsonValue;
    }
    if (data.scheduleNote !== undefined) patch.scheduleNote = data.scheduleNote;

    if (data.availableDates !== undefined || data.restDates !== undefined) {
      let availNorm: string[];
      if (data.availableDates !== undefined) {
        availNorm = normalizeDateStrings(data.availableDates);
        patch.availableDates = availNorm as unknown as Prisma.InputJsonValue;
      } else {
        const row = await tx.photographer.findUnique({
          where: { id },
          select: { availableDates: true },
        });
        availNorm = normalizeDateStrings(row?.availableDates);
      }
      if (data.restDates !== undefined) {
        patch.restDates = restDatesMinusAvailable(
          normalizeDateStrings(data.restDates),
          availNorm,
        ) as unknown as Prisma.InputJsonValue;
      } else if (data.availableDates !== undefined) {
        const row = await tx.photographer.findUnique({
          where: { id },
          select: { restDates: true },
        });
        patch.restDates = restDatesMinusAvailable(
          normalizeDateStrings(row?.restDates),
          availNorm,
        ) as unknown as Prisma.InputJsonValue;
      }
    }

    return patch;
  }

  async setAdminApproval(
    id: number,
    approved: boolean,
    reviewNote?: string | null,
  ) {
    await this.ensureExists(id);
    if (approved) {
      return this.prisma.photographer.update({
        where: { id },
        data: { approvalStatus: 'approved', approvalReviewNote: null },
      });
    }
    const note =
      (reviewNote && String(reviewNote).trim()) ||
      '未通过审核，请修改资料后重新提交';
    return this.prisma.photographer.update({
      where: { id },
      data: {
        approvalStatus: 'rejected',
        approvalReviewNote: note,
        enabled: false,
      },
    });
  }

  async setAdminEnabled(id: number, enabled: boolean) {
    await this.ensureExists(id);
    return this.prisma.photographer.update({
      where: { id },
      data: { enabled },
    });
  }

  /** 管理员设置对外展示头衔（摄影师端不可自改） */
  async setAdminTitle(id: number, title: string | null) {
    await this.ensureExists(id);
    const t = title != null ? String(title).trim() : '';
    await this.prisma.photographer.update({
      where: { id },
      data: { title: t || null },
    });
    const row = await this.prisma.photographer.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('摄影师不存在');
    }
    return this.toAdminListItem(row as PhotographerRow);
  }

  /** 脚本/种子用：新建已通过审核的摄影师 */
  async create(data: {
    name: string;
    title?: string;
    avatar?: string;
    shootingStyle: string;
    yearsExperience?: number;
    bio?: string;
    gender?: string;
    age?: number;
    specialtyTopics?: string;
    awards?: string;
    portfolioImages?: string[];
    availableDates?: string[];
    restDates?: string[];
    scheduleNote?: string;
    sortOrder?: number;
    enabled?: boolean;
  }) {
    const portfolioImages = data.portfolioImages?.length
      ? data.portfolioImages
      : [];
    const availableDates = normalizeDateStrings(data.availableDates ?? []);
    const restDates = restDatesMinusAvailable(
      normalizeDateStrings(data.restDates ?? []),
      availableDates,
    );
    return this.prisma.photographer.create({
      data: {
        name: data.name,
        title: data.title,
        avatar: data.avatar,
        shootingStyle: data.shootingStyle,
        yearsExperience: data.yearsExperience ?? 0,
        bio: data.bio,
        gender: data.gender,
        age: data.age,
        specialtyTopics: data.specialtyTopics,
        awards: data.awards,
        portfolioImages: portfolioImages as unknown as Prisma.InputJsonValue,
        availableDates: availableDates as unknown as Prisma.InputJsonValue,
        restDates: restDates as unknown as Prisma.InputJsonValue,
        scheduleNote: data.scheduleNote,
        sortOrder: data.sortOrder ?? 0,
        enabled: data.enabled ?? true,
        approvalStatus: 'approved',
        approvalReviewNote: null,
      },
    });
  }

  async assertPhotographerApprovedForWorker(userId: number): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { workerPhotographerId: true, role: true },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      return;
    }
    const p = await this.prisma.photographer.findUnique({
      where: { id: user.workerPhotographerId },
      select: { approvalStatus: true },
    });
    if (p && p.approvalStatus !== 'approved') {
      throw new ForbiddenException(
        '摄影师档案未通过管理员审核，暂不可接单或处理订单改期',
      );
    }
  }

  private async ensureExists(id: number) {
    const row = await this.prisma.photographer.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('摄影师不存在');
    }
  }
}
