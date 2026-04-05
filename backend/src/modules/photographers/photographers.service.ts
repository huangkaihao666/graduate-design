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

type PortfolioItem = {
  url: string;
  category: 'wedding' | 'makeup' | 'styling';
  desc: string;
};

function normalizePortfolioItems(v: unknown): PortfolioItem[] {
  if (!Array.isArray(v)) return [];
  const seen = new Set<string>();
  const out: PortfolioItem[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as {
      url?: unknown;
      category?: unknown;
      desc?: unknown;
    };
    const url = typeof row.url === 'string' ? row.url.trim() : '';
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const c =
      typeof row.category === 'string' ? row.category.trim().toLowerCase() : '';
    const category: PortfolioItem['category'] =
      c === 'makeup' || c === 'styling'
        ? (c as PortfolioItem['category'])
        : 'wedding';
    out.push({
      url,
      category,
      desc: typeof row.desc === 'string' ? row.desc.trim() : '',
    });
  }
  return out;
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
  portfolioItems: unknown;
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
  private isMakeupProfile(row: {
    name?: string | null;
    title?: string | null;
    shootingStyle?: string | null;
    specialtyTopics?: string | null;
    bio?: string | null;
  }): boolean {
    const hay = [
      row.name || '',
      row.title || '',
      row.shootingStyle || '',
      row.specialtyTopics || '',
      row.bio || '',
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

  private toPseudoRating(id: number): number {
    return Number((4.2 + (id % 7) * 0.1).toFixed(1));
  }

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
    const portfolioItems =
      normalizePortfolioItems(row.portfolioItems).length > 0
        ? normalizePortfolioItems(row.portfolioItems)
        : asStringArray(row.portfolioImages)
            .map((x) => String(x || '').trim())
            .filter(Boolean)
            .map((url) => ({ url, category: 'wedding' as const, desc: '' }));
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
      portfolioImages: portfolioItems.map((x) => x.url),
      portfolioItems,
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
    return rows
      .filter((r) => !this.isMakeupProfile(r as PhotographerRow))
      .map((r) => this.mapPublic(r as PhotographerRow));
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

  /** 用户端：妆造师列表（支持按风格/擅长/评分筛选） */
  async findPublicMakeupArtists(query?: {
    style?: string;
    specialty?: string;
    minRating?: number;
  }) {
    const rows = await this.prisma.photographer.findMany({
      where: { enabled: true, approvalStatus: 'approved' },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    const styleQ = String(query?.style || '')
      .trim()
      .toLowerCase();
    const specialtyQ = String(query?.specialty || '')
      .trim()
      .toLowerCase();
    const minRating = Number(query?.minRating || 0);

    return rows
      .filter((r) => this.isMakeupProfile(r as PhotographerRow))
      .map((r) => {
        const mapped = this.mapPublic(r as PhotographerRow);
        const rating = this.toPseudoRating(Number(r.id));
        return {
          ...mapped,
          rating,
        };
      })
      .filter((r) => {
        if (styleQ) {
          const hay = String(r.shootingStyle || '').toLowerCase();
          if (!hay.includes(styleQ)) return false;
        }
        if (specialtyQ) {
          const hay = String(r.specialtyTopics || '').toLowerCase();
          if (!hay.includes(specialtyQ)) return false;
        }
        if (minRating > 0 && Number(r.rating || 0) < minRating) return false;
        return true;
      });
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
    const base = this.toAdminListItem(row as PhotographerRow);
    const makeupCooperations =
      await this.buildMakeupCooperationDtosForPhotographer(row.id);
    return { ...base, makeupCooperations };
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
      portfolioItems: Array<{
        url: string;
        category?: 'wedding' | 'makeup' | 'styling';
        desc?: string;
      }>;
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
      portfolioItems: Array<{
        url: string;
        category?: 'wedding' | 'makeup' | 'styling';
        desc?: string;
      }>;
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
    if (data.portfolioItems !== undefined) {
      const items = normalizePortfolioItems(data.portfolioItems);
      patch.portfolioItems = items as unknown as Prisma.InputJsonValue;
      patch.portfolioImages = items.map(
        (x) => x.url,
      ) as unknown as Prisma.InputJsonValue;
    } else if (data.portfolioImages !== undefined) {
      const urls = asStringArray(data.portfolioImages)
        .map((x) => String(x || '').trim())
        .filter(Boolean);
      patch.portfolioImages = urls as unknown as Prisma.InputJsonValue;
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

  /** 管理员删除档案 */
  async removeAdmin(id: number) {
    await this.ensureExists(id);
    await this.prisma.photographer.delete({ where: { id } });
    return { ok: true as const };
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
    portfolioItems?: Array<{
      url: string;
      category?: 'wedding' | 'makeup' | 'styling';
      desc?: string;
    }>;
    availableDates?: string[];
    restDates?: string[];
    scheduleNote?: string;
    sortOrder?: number;
    enabled?: boolean;
  }) {
    const portfolioImages = data.portfolioImages?.length
      ? data.portfolioImages
      : [];
    const portfolioItems = normalizePortfolioItems(
      data.portfolioItems ??
        portfolioImages.map((url) => ({ url, category: 'wedding', desc: '' })),
    );
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
        portfolioItems: portfolioItems as unknown as Prisma.InputJsonValue,
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

  private normalizeCooperationText(v: unknown, label: string): string {
    const s = typeof v === 'string' ? v.trim() : '';
    if (s.length < 4) {
      throw new BadRequestException(`${label}请至少填写 4 个字`);
    }
    if (s.length > 500) {
      throw new BadRequestException(`${label}请勿超过 500 字`);
    }
    return s;
  }

  /** 摄影师端：当前档案下全部妆造合作（含妆造师公开字段便于展示风格/作品/档期） */
  private async buildMakeupCooperationDtosForPhotographer(
    photographerId: number,
  ) {
    const rows = await this.prisma.photographerMakeupCooperation.findMany({
      where: { photographerId },
      include: { makeupArtist: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    });
    return rows.map((c) => ({
      id: c.id,
      makeupArtistId: c.makeupArtistId,
      status: c.status,
      inviteNote: c.inviteNote
        ? String(c.inviteNote).trim() || undefined
        : undefined,
      cooperationRejectReason: c.cooperationRejectReason
        ? String(c.cooperationRejectReason).trim() || undefined
        : undefined,
      cooperationRejectAt: c.cooperationRejectAt
        ? c.cooperationRejectAt.toISOString()
        : undefined,
      dissolvePending: c.dissolvePending,
      dissolveInitiator: c.dissolveInitiator ?? undefined,
      dissolveRequestedAt: c.dissolveRequestedAt
        ? c.dissolveRequestedAt.toISOString()
        : undefined,
      dissolveNote: c.dissolveNote
        ? String(c.dissolveNote).trim() || undefined
        : undefined,
      dissolveRejectReason: c.dissolveRejectReason
        ? String(c.dissolveRejectReason).trim() || undefined
        : undefined,
      dissolveRejectAt: c.dissolveRejectAt
        ? c.dissolveRejectAt.toISOString()
        : undefined,
      sortOrder: c.sortOrder,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      makeupArtist: this.mapPublic(c.makeupArtist as PhotographerRow),
    }));
  }

  private cooperationClearDissolveFields() {
    return {
      dissolvePending: false,
      dissolveInitiator: null,
      dissolveRequestedAt: null,
      dissolveNote: null,
      dissolveRejectReason: null,
      dissolveRejectAt: null,
    };
  }

  /** 摄影师：新增一位固定合作妆造师邀请（可多位；同一妆造师仅一条记录） */
  async addMakeupCooperationForMine(
    userId: number,
    makeupArtistId: number,
    inviteNote?: string | null,
  ) {
    const mid = Number(makeupArtistId);
    if (!mid) {
      throw new BadRequestException('请选择妆造师');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      throw new ForbiddenException('当前账号未绑定摄影师档案');
    }
    const pid = user.workerPhotographerId;
    const selfRow = await this.prisma.photographer.findUnique({
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
    if (!selfRow) {
      throw new NotFoundException('摄影师档案不存在');
    }
    if (this.isMakeupProfile(selfRow)) {
      throw new BadRequestException('仅摄影师账号可添加固定合作妆造师');
    }

    const target = await this.prisma.photographer.findUnique({
      where: { id: mid },
      select: {
        id: true,
        enabled: true,
        approvalStatus: true,
        name: true,
        title: true,
        shootingStyle: true,
        specialtyTopics: true,
        bio: true,
      },
    });
    if (!target || !target.enabled || target.approvalStatus !== 'approved') {
      throw new NotFoundException('妆造师不存在或不可用');
    }
    if (!this.isMakeupProfile(target)) {
      throw new BadRequestException('目标档案不是妆造师类型');
    }

    const existing = await this.prisma.photographerMakeupCooperation.findUnique(
      {
        where: {
          photographerId_makeupArtistId: {
            photographerId: pid,
            makeupArtistId: mid,
          },
        },
      },
    );

    const note = this.normalizeCooperationText(inviteNote, '合作邀请理由');

    const nextSortOrder = async () => {
      const agg = await this.prisma.photographerMakeupCooperation.aggregate({
        where: { photographerId: pid },
        _max: { sortOrder: true },
      });
      return (agg._max.sortOrder ?? -1) + 1;
    };

    if (existing) {
      if (existing.status === 'confirmed') {
        if (existing.dissolvePending) {
          throw new BadRequestException(
            '与该妆造师的解除合作尚在确认中，请稍后再操作',
          );
        }
        throw new BadRequestException('该妆造师已在你的固定合作列表中');
      }
      if (existing.status === 'pending') {
        throw new BadRequestException(
          '已向该妆造师发送待确认邀请，请等待对方处理',
        );
      }
      await this.prisma.photographerMakeupCooperation.update({
        where: { id: existing.id },
        data: {
          status: 'pending',
          inviteNote: note,
          cooperationRejectReason: null,
          cooperationRejectAt: null,
          ...this.cooperationClearDissolveFields(),
          sortOrder: await nextSortOrder(),
        },
      });
      return this.findMineByUserId(userId);
    }

    await this.prisma.photographerMakeupCooperation.create({
      data: {
        photographerId: pid,
        makeupArtistId: mid,
        status: 'pending',
        inviteNote: note,
        sortOrder: await nextSortOrder(),
      },
    });
    return this.findMineByUserId(userId);
  }

  /** 摄影师：撤销一条待妆造师确认的邀请 */
  async revokePendingMakeupCooperationForMine(
    userId: number,
    cooperationId: number,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      throw new ForbiddenException('当前账号未绑定摄影师档案');
    }
    const pid = user.workerPhotographerId;
    const row = await this.prisma.photographerMakeupCooperation.findFirst({
      where: {
        id: cooperationId,
        photographerId: pid,
        status: 'pending',
      },
    });
    if (!row) {
      throw new NotFoundException('未找到待撤销的邀请或已失效');
    }
    await this.prisma.photographerMakeupCooperation.delete({
      where: { id: row.id },
    });
    return this.findMineByUserId(userId);
  }

  /** 妆造师：待确认的固定合作申请（摄影师侧已提交） */
  async listIncomingFixedCooperationByUserId(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      throw new ForbiddenException('当前账号未绑定工作人员档案');
    }
    const mid = user.workerPhotographerId;
    const selfRow = await this.prisma.photographer.findUnique({
      where: { id: mid },
      select: {
        name: true,
        title: true,
        shootingStyle: true,
        specialtyTopics: true,
        bio: true,
      },
    });
    if (!selfRow || !this.isMakeupProfile(selfRow)) {
      throw new BadRequestException('仅妆造师账号可查看合作邀请');
    }

    const cooperations =
      await this.prisma.photographerMakeupCooperation.findMany({
        where: {
          makeupArtistId: mid,
          status: 'pending',
        },
        include: {
          photographer: {
            select: {
              id: true,
              name: true,
              avatar: true,
              title: true,
              shootingStyle: true,
              enabled: true,
              approvalStatus: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

    return cooperations
      .filter(
        (c) =>
          c.photographer.enabled &&
          c.photographer.approvalStatus === 'approved' &&
          !this.isMakeupProfile(c.photographer as PhotographerRow),
      )
      .map((c) => ({
        cooperationId: c.id,
        photographerId: c.photographer.id,
        name: c.photographer.name,
        avatar: c.photographer.avatar ?? undefined,
        title: c.photographer.title ?? undefined,
        shootingStyle: c.photographer.shootingStyle,
        inviteNote: c.inviteNote ? String(c.inviteNote).trim() : undefined,
        requestedAt: c.updatedAt.toISOString(),
      }));
  }

  /** 妆造师：已将你设为「已确认」固定合作妆造师的摄影师列表（每位摄影师一条合作记录） */
  async listBoundPhotographersForMakeupByUserId(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      throw new ForbiddenException('当前账号未绑定工作人员档案');
    }
    const mid = user.workerPhotographerId;
    const selfRow = await this.prisma.photographer.findUnique({
      where: { id: mid },
      select: {
        name: true,
        title: true,
        shootingStyle: true,
        specialtyTopics: true,
        bio: true,
      },
    });
    if (!selfRow || !this.isMakeupProfile(selfRow)) {
      throw new BadRequestException('仅妆造师账号可查看固定合作摄影师');
    }

    const cooperations =
      await this.prisma.photographerMakeupCooperation.findMany({
        where: {
          makeupArtistId: mid,
          status: 'confirmed',
        },
        include: {
          photographer: {
            select: {
              id: true,
              name: true,
              avatar: true,
              title: true,
              shootingStyle: true,
              specialtyTopics: true,
              bio: true,
              enabled: true,
              approvalStatus: true,
              updatedAt: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      });

    return cooperations
      .filter(
        (c) =>
          c.photographer.enabled &&
          c.photographer.approvalStatus === 'approved' &&
          !this.isMakeupProfile(c.photographer as PhotographerRow),
      )
      .map((c) => ({
        cooperationId: c.id,
        photographerId: c.photographer.id,
        name: c.photographer.name,
        avatar: c.photographer.avatar ?? undefined,
        title: c.photographer.title ?? undefined,
        shootingStyle: c.photographer.shootingStyle,
        boundAt: c.updatedAt.toISOString(),
        dissolvePending: c.dissolvePending,
        dissolveInitiator: c.dissolveInitiator ?? undefined,
        dissolveRequestedAt: c.dissolveRequestedAt
          ? c.dissolveRequestedAt.toISOString()
          : undefined,
        dissolveNote: c.dissolveNote
          ? String(c.dissolveNote).trim() || undefined
          : undefined,
        dissolveRejectReason: c.dissolveRejectReason
          ? String(c.dissolveRejectReason).trim() || undefined
          : undefined,
        dissolveRejectAt: c.dissolveRejectAt
          ? c.dissolveRejectAt.toISOString()
          : undefined,
      }));
  }

  /** 妆造师：同意或拒绝某位摄影师的固定合作申请（cooperationId 优先，兼容 photographerId） */
  async respondFixedCooperationByUserId(
    userId: number,
    photographerProfileId: number | undefined,
    accept: boolean,
    rejectReason?: string | null,
    cooperationId?: number,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      throw new ForbiddenException('当前账号未绑定工作人员档案');
    }
    const mid = user.workerPhotographerId;
    const selfRow = await this.prisma.photographer.findUnique({
      where: { id: mid },
      select: {
        name: true,
        title: true,
        shootingStyle: true,
        specialtyTopics: true,
        bio: true,
      },
    });
    if (!selfRow || !this.isMakeupProfile(selfRow)) {
      throw new BadRequestException('仅妆造师账号可处理合作邀请');
    }

    let coopId = cooperationId;
    if (!coopId && photographerProfileId != null) {
      const found = await this.prisma.photographerMakeupCooperation.findFirst({
        where: {
          photographerId: photographerProfileId,
          makeupArtistId: mid,
          status: 'pending',
        },
        select: { id: true },
      });
      coopId = found?.id;
    }
    if (!coopId) {
      throw new BadRequestException('请提供 cooperationId 或 photographerId');
    }

    const coop = await this.prisma.photographerMakeupCooperation.findFirst({
      where: {
        id: coopId,
        makeupArtistId: mid,
        status: 'pending',
      },
      include: {
        photographer: {
          select: { id: true, name: true, enabled: true, approvalStatus: true },
        },
      },
    });
    if (
      !coop ||
      !coop.photographer.enabled ||
      coop.photographer.approvalStatus !== 'approved'
    ) {
      throw new NotFoundException('未找到待处理的邀请或已失效');
    }

    if (accept) {
      const maxSort = await this.prisma.photographerMakeupCooperation.aggregate(
        {
          where: {
            photographerId: coop.photographerId,
            status: 'confirmed',
          },
          _max: { sortOrder: true },
        },
      );
      const nextSort = (maxSort._max.sortOrder ?? -1) + 1;
      await this.prisma.photographerMakeupCooperation.update({
        where: { id: coop.id },
        data: {
          status: 'confirmed',
          inviteNote: null,
          cooperationRejectReason: null,
          cooperationRejectAt: null,
          ...this.cooperationClearDissolveFields(),
          sortOrder: nextSort,
        },
      });
      return {
        ok: true as const,
        accepted: true as const,
        photographerId: coop.photographer.id,
        photographerName: coop.photographer.name,
      };
    }

    const reason = this.normalizeCooperationText(rejectReason, '拒绝理由');

    await this.prisma.photographerMakeupCooperation.update({
      where: { id: coop.id },
      data: {
        status: 'rejected',
        inviteNote: null,
        cooperationRejectReason: reason,
        cooperationRejectAt: new Date(),
      },
    });
    return {
      ok: true as const,
      accepted: false as const,
      photographerId: coop.photographer.id,
    };
  }

  /** 申请解除：须指定合作记录 id（cooperationId） */
  async requestFixedCooperationDissolveByUserId(
    userId: number,
    reason: string,
    cooperationId: number,
  ) {
    const note = this.normalizeCooperationText(reason, '解除合作理由');
    const cid = Number(cooperationId);
    if (!cid) {
      throw new BadRequestException('请指定合作记录 id');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      throw new ForbiddenException('当前账号未绑定工作人员档案');
    }
    const wid = user.workerPhotographerId;
    const selfRow = await this.prisma.photographer.findUnique({
      where: { id: wid },
      select: {
        name: true,
        title: true,
        shootingStyle: true,
        specialtyTopics: true,
        bio: true,
      },
    });
    if (!selfRow) {
      throw new NotFoundException('档案不存在');
    }

    const coop = await this.prisma.photographerMakeupCooperation.findFirst({
      where: {
        id: cid,
        status: 'confirmed',
      },
    });
    if (!coop) {
      throw new NotFoundException('未找到已确认的合作记录');
    }

    if (this.isMakeupProfile(selfRow)) {
      if (coop.makeupArtistId !== wid) {
        throw new ForbiddenException('无权操作该合作记录');
      }
      if (coop.dissolvePending) {
        throw new BadRequestException('该合作已有进行中的解除申请');
      }
      await this.prisma.photographerMakeupCooperation.update({
        where: { id: cid },
        data: {
          dissolvePending: true,
          dissolveInitiator: 'makeup',
          dissolveRequestedAt: new Date(),
          dissolveNote: note,
          dissolveRejectReason: null,
          dissolveRejectAt: null,
        },
      });
      return { ok: true as const, cooperationId: cid };
    }

    if (coop.photographerId !== wid) {
      throw new ForbiddenException('无权操作该合作记录');
    }
    if (coop.dissolvePending) {
      throw new BadRequestException('已有进行中的解除合作申请');
    }
    await this.prisma.photographerMakeupCooperation.update({
      where: { id: cid },
      data: {
        dissolvePending: true,
        dissolveInitiator: 'photographer',
        dissolveRequestedAt: new Date(),
        dissolveNote: note,
        dissolveRejectReason: null,
        dissolveRejectAt: null,
      },
    });
    return this.findMineByUserId(userId);
  }

  /** 回应解除申请（cooperationId 指定一条已确认合作） */
  async respondFixedCooperationDissolveByUserId(
    userId: number,
    accept: boolean,
    cooperationId: number,
    rejectReason?: string | null,
  ) {
    const cid = Number(cooperationId);
    if (!cid) {
      throw new BadRequestException('请指定合作记录 id');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, workerPhotographerId: true },
    });
    if (!user || user.role !== 'worker' || !user.workerPhotographerId) {
      throw new ForbiddenException('当前账号未绑定工作人员档案');
    }
    const wid = user.workerPhotographerId;
    const selfRow = await this.prisma.photographer.findUnique({
      where: { id: wid },
      select: {
        name: true,
        title: true,
        shootingStyle: true,
        specialtyTopics: true,
        bio: true,
      },
    });
    if (!selfRow) {
      throw new NotFoundException('档案不存在');
    }

    const coop = await this.prisma.photographerMakeupCooperation.findFirst({
      where: {
        id: cid,
        status: 'confirmed',
        dissolvePending: true,
      },
    });
    if (!coop) {
      throw new NotFoundException('未找到待确认的解除申请或已失效');
    }

    if (this.isMakeupProfile(selfRow)) {
      if (coop.makeupArtistId !== wid) {
        throw new ForbiddenException('无权操作该合作记录');
      }
      if (coop.dissolveInitiator !== 'photographer') {
        throw new BadRequestException('当前解除申请不是由摄影师发起');
      }
      if (accept) {
        await this.prisma.photographerMakeupCooperation.delete({
          where: { id: cid },
        });
        return {
          ok: true as const,
          accepted: true as const,
          cooperationId: cid,
          photographerId: coop.photographerId,
        };
      }
      const reason = this.normalizeCooperationText(
        rejectReason,
        '拒绝解除理由',
      );
      await this.prisma.photographerMakeupCooperation.update({
        where: { id: cid },
        data: {
          ...this.cooperationClearDissolveFields(),
          dissolveRejectReason: reason,
          dissolveRejectAt: new Date(),
        },
      });
      return {
        ok: true as const,
        accepted: false as const,
        cooperationId: cid,
        photographerId: coop.photographerId,
      };
    }

    if (coop.photographerId !== wid) {
      throw new ForbiddenException('无权操作该合作记录');
    }
    if (coop.dissolveInitiator !== 'makeup') {
      throw new BadRequestException('当前解除申请不是由妆造师发起');
    }
    if (accept) {
      await this.prisma.photographerMakeupCooperation.delete({
        where: { id: cid },
      });
      return this.findMineByUserId(userId);
    }
    const reason = this.normalizeCooperationText(rejectReason, '拒绝解除理由');
    await this.prisma.photographerMakeupCooperation.update({
      where: { id: cid },
      data: {
        ...this.cooperationClearDissolveFields(),
        dissolveRejectReason: reason,
        dissolveRejectAt: new Date(),
      },
    });
    return this.findMineByUserId(userId);
  }

  private async ensureExists(id: number) {
    const row = await this.prisma.photographer.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('摄影师不存在');
    }
  }
}
