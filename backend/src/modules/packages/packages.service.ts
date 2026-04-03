import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

function asStringArray(v: unknown): string[] {
  if (Array.isArray(v)) {
    return v.map((x) => String(x));
  }
  return [];
}

type TravelPackageWithSpot = Prisma.TravelPackageGetPayload<{
  include: { spot: { include: { city: true } } };
}>;

const packageSpotInclude = {
  spot: { include: { city: true } },
} as const;

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: TravelPackageWithSpot) {
    return {
      id: row.id,
      spotId: row.spotId,
      name: row.name,
      description: row.description ?? '',
      price: row.price,
      originalPrice: row.originalPrice ?? undefined,
      duration: row.duration,
      location: row.location,
      spotName: row.spot?.name,
      style: row.style,
      coverImage: row.coverImage ?? '',
      images: asStringArray(row.images),
      features: asStringArray(row.features),
      includes: asStringArray(row.includes),
      excludes: asStringArray(row.excludes),
      maxPeople: row.maxPeople,
      isPopular: row.isPopular,
      isHot: row.isHot,
      status: row.status,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  /** 用户端：仅已上架 */
  async findPublishedList() {
    const rows = await this.prisma.travelPackage.findMany({
      where: { status: 'published' },
      orderBy: { id: 'asc' },
      include: packageSpotInclude,
    });
    const items = rows.map((r) => this.mapRow(r));
    return {
      items,
      pagination: {
        page: 1,
        pageSize: items.length,
        total: items.length,
        totalPages: 1,
      },
    };
  }

  /**
   * 协同滤波推荐（ItemCF，隐式反馈）
   * - 行为源：收藏、下单
   * - 反馈权重：收藏(3)、下单未支付(4)、下单已支付/完成(6)
   */
  async recommendForUser(userId: number, limit = 6) {
    const safeLimit = Math.min(Math.max(Number(limit) || 6, 1), 20);
    const published = await this.prisma.travelPackage.findMany({
      where: { status: 'published' },
      include: packageSpotInclude,
      orderBy: { id: 'asc' },
    });
    if (!published.length) {
      return { items: [], locations: [] as string[] };
    }

    const packageIdSet = new Set(published.map((p) => p.id));
    const packageById = new Map(published.map((p) => [p.id, p]));

    const [favorites, orders] = await Promise.all([
      this.prisma.favorite.findMany({
        select: { userId: true, packageId: true },
      }),
      this.prisma.bookingOrder.findMany({
        select: {
          id: true,
          packageId: true,
          paymentStatus: true,
          contactName: true,
          phone: true,
        },
      }),
    ]);

    // 行为矩阵：userId -> (packageId -> weight)
    const userMatrix = new Map<number, Map<number, number>>();
    const addAction = (uid: number, pid: number, w: number) => {
      if (!packageIdSet.has(pid) || !uid || w <= 0) return;
      let row = userMatrix.get(uid);
      if (!row) {
        row = new Map<number, number>();
        userMatrix.set(uid, row);
      }
      row.set(pid, (row.get(pid) || 0) + w);
    };

    for (const f of favorites) {
      addAction(f.userId, f.packageId, 3);
    }

    // 订单无直接 userId，采用联系人手机号分组为“隐式用户”
    const pseudoUserBase = 10_000_000;
    const contactMap = new Map<string, number>();
    let nextPseudo = 1;
    const getPseudoUid = (name: string, phone: string) => {
      const key = `${name || ''}#${phone || ''}`.trim();
      if (!key || key === '#') return 0;
      if (!contactMap.has(key)) {
        contactMap.set(key, pseudoUserBase + nextPseudo);
        nextPseudo += 1;
      }
      return contactMap.get(key)!;
    };

    for (const o of orders as any[]) {
      if (o.packageId == null) continue;
      const pid = Number(o.packageId);
      if (!Number.isFinite(pid) || pid <= 0) continue;
      const status = String(o.paymentStatus || '').toLowerCase();
      const weight = status === 'paid' || status === 'completed' ? 6 : 4;
      const pseudoUid = getPseudoUid(
        String(o.contactName || ''),
        String(o.phone || ''),
      );
      addAction(pseudoUid, pid, weight);
    }

    const seed = userMatrix.get(userId) || new Map<number, number>();
    const hasSeed = seed.size > 0;

    // 冷启动：回退热门
    if (!hasSeed) {
      const items = [...published]
        .sort((a, b) => {
          const sa = (a.isPopular ? 2 : 0) + (a.isHot ? 1 : 0);
          const sb = (b.isPopular ? 2 : 0) + (b.isHot ? 1 : 0);
          if (sb !== sa) return sb - sa;
          return b.id - a.id;
        })
        .slice(0, safeLimit)
        .map((r) => this.mapRow(r));
      const locations = [
        ...new Set(items.map((x) => x.location).filter(Boolean)),
      ].slice(0, 5);
      return { items, locations };
    }

    // ItemCF: co[i][j] 与 norm[i]
    const norm = new Map<number, number>();
    const co = new Map<number, Map<number, number>>();
    for (const row of userMatrix.values()) {
      const entries = [...row.entries()];
      for (let i = 0; i < entries.length; i += 1) {
        const [pi, wi] = entries[i];
        norm.set(pi, (norm.get(pi) || 0) + wi * wi);
        for (let j = i + 1; j < entries.length; j += 1) {
          const [pj, wj] = entries[j];
          const val = wi * wj;
          if (!co.has(pi)) co.set(pi, new Map());
          if (!co.has(pj)) co.set(pj, new Map());
          co.get(pi)!.set(pj, (co.get(pi)!.get(pj) || 0) + val);
          co.get(pj)!.set(pi, (co.get(pj)!.get(pi) || 0) + val);
        }
      }
    }

    const seedIds = new Set(seed.keys());
    const candidateScore = new Map<number, number>();
    for (const [pi, wi] of seed.entries()) {
      const related = co.get(pi);
      if (!related) continue;
      const normI = Math.sqrt(norm.get(pi) || 0);
      if (!normI) continue;
      for (const [pj, cij] of related.entries()) {
        if (seedIds.has(pj)) continue; // 已交互的不再推荐
        const normJ = Math.sqrt(norm.get(pj) || 0);
        if (!normJ) continue;
        const sim = cij / (normI * normJ);
        if (sim <= 0) continue;
        candidateScore.set(pj, (candidateScore.get(pj) || 0) + wi * sim);
      }
    }

    const scored = [...candidateScore.entries()]
      .map(([pid, score]) => {
        const p = packageById.get(pid);
        if (!p) return null;
        // 加少量先验：热门略微抬升
        const prior = (p.isPopular ? 0.12 : 0) + (p.isHot ? 0.08 : 0);
        return { row: p, score: score + prior };
      })
      .filter((x): x is { row: TravelPackageWithSpot; score: number } => !!x)
      .sort((a, b) => b.score - a.score)
      .slice(0, safeLimit);

    // 若候选不足，补齐热门
    if (scored.length < safeLimit) {
      const used = new Set(scored.map((x) => x.row.id));
      for (const p of published) {
        if (used.has(p.id) || seedIds.has(p.id)) continue;
        scored.push({
          row: p,
          score: (p.isPopular ? 0.2 : 0) + (p.isHot ? 0.1 : 0),
        });
        if (scored.length >= safeLimit) break;
      }
    }

    const items = scored.slice(0, safeLimit).map((x) => this.mapRow(x.row));
    const locationScore = new Map<string, number>();
    scored.forEach((x) => {
      const loc = x.row.location || '';
      if (!loc) return;
      locationScore.set(loc, (locationScore.get(loc) || 0) + x.score);
    });
    const locations = [...locationScore.entries()]
      .sort((a, b) => b[1] - a[1])
      .map((x) => x[0])
      .slice(0, 5);
    return { items, locations };
  }

  /** 管理端：全部套餐 */
  async findAllAdmin() {
    const rows = await this.prisma.travelPackage.findMany({
      orderBy: { id: 'asc' },
      include: packageSpotInclude,
    });
    return rows.map((r) => this.mapRow(r));
  }

  async findOnePublic(id: number) {
    const row = await this.prisma.travelPackage.findUnique({
      where: { id },
      include: packageSpotInclude,
    });
    if (!row || row.status !== 'published') {
      throw new NotFoundException('套餐不存在或已下架');
    }
    return this.mapRow(row);
  }

  async create(data: {
    spotId?: number;
    location?: string;
    name: string;
    style: string;
    price: number;
    description?: string;
    duration?: number;
    coverImage?: string;
    images?: string[];
    features?: string[];
    includes?: string[];
    excludes?: string[];
    maxPeople?: number;
    originalPrice?: number | null;
    isPopular?: boolean;
    isHot?: boolean;
    status?: string;
  }) {
    let spotId: number | null = null;
    let location = String(data.location || '').trim();
    if (data.spotId !== undefined && data.spotId !== null) {
      const spot = await this.prisma.spot.findUnique({
        where: { id: data.spotId },
        include: { city: true },
      });
      if (!spot) {
        throw new BadRequestException(
          '无效的景点，请先选择「景点管理」中的目的地',
        );
      }
      spotId = spot.id;
      location = spot.city.name;
    }
    if (!location) {
      throw new BadRequestException('请填写目的地');
    }

    const row = await this.prisma.travelPackage.create({
      data: {
        spotId,
        location,
        name: data.name,
        style: data.style,
        price: data.price,
        description: data.description ?? '',
        duration: data.duration ?? 1,
        coverImage: data.coverImage ?? '',
        images: data.images ?? [],
        features: data.features ?? [],
        includes: data.includes ?? [],
        excludes: data.excludes ?? [],
        maxPeople: data.maxPeople ?? 2,
        originalPrice: data.originalPrice ?? null,
        isPopular: data.isPopular ?? false,
        isHot: data.isHot ?? false,
        status: data.status ?? 'published',
      },
      include: packageSpotInclude,
    });
    return this.mapRow(row);
  }

  async update(
    id: number,
    data: Partial<{
      spotId: number | null;
      location: string;
      name: string;
      style: string;
      price: number;
      description: string;
      duration: number;
      coverImage: string;
      images: string[];
      features: string[];
      includes: string[];
      excludes: string[];
      maxPeople: number;
      originalPrice: number | null;
      isPopular: boolean;
      isHot: boolean;
      status: string;
    }>,
  ) {
    await this.ensureExists(id);
    const updateData: Record<string, unknown> = { ...data };

    if (data.spotId !== undefined) {
      if (data.spotId === null) {
        updateData.spotId = null;
      } else {
        const spot = await this.prisma.spot.findUnique({
          where: { id: data.spotId },
          include: { city: true },
        });
        if (!spot) {
          throw new BadRequestException(
            '无效的景点，请先选择「景点管理」中的目的地',
          );
        }
        updateData.spotId = data.spotId;
        updateData.location = spot.city.name;
      }
    }

    if (data.location !== undefined) {
      const location = String(data.location || '').trim();
      if (!location) {
        throw new BadRequestException('目的地不能为空');
      }
      updateData.location = location;
      if (data.spotId === undefined) {
        // 手填地点时默认解除景点绑定，避免数据冲突
        updateData.spotId = null;
      }
    }

    const row = await this.prisma.travelPackage.update({
      where: { id },
      data: updateData as Prisma.TravelPackageUpdateInput,
      include: packageSpotInclude,
    });
    return this.mapRow(row);
  }

  async toggleStatus(id: number) {
    const row = await this.prisma.travelPackage.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('套餐不存在');
    }
    const next = row.status === 'published' ? 'offline' : 'published';
    const updated = await this.prisma.travelPackage.update({
      where: { id },
      data: { status: next },
      include: packageSpotInclude,
    });
    return this.mapRow(updated);
  }

  private async ensureExists(id: number) {
    const row = await this.prisma.travelPackage.findUnique({ where: { id } });
    if (!row) {
      throw new NotFoundException('套餐不存在');
    }
  }
}
