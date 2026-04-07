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
  include: {
    spot: { include: { city: true } };
    packageSpots: { include: { spot: { include: { city: true } } } };
  };
}>;

const packageSpotInclude = {
  spot: { include: { city: true } },
  packageSpots: { include: { spot: { include: { city: true } } } },
} as const;

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  private mapRow(row: TravelPackageWithSpot) {
    const related = row.packageSpots || [];
    const spotIds = related
      .map((x) => Number(x.spotId))
      .filter((id: number) => Number.isFinite(id) && id > 0);
    const spotNames = related
      .map((x) => String(x.spot?.name || '').trim())
      .filter(Boolean);
    const fallbackSpotId = row.spotId ? [row.spotId] : [];
    const fallbackSpotName = row.spot?.name ? [row.spot.name] : [];
    const mergedSpotIds = spotIds.length ? spotIds : fallbackSpotId;
    const mergedSpotNames = spotNames.length ? spotNames : fallbackSpotName;
    return {
      id: row.id,
      spotId: row.spotId,
      spotIds: mergedSpotIds,
      name: row.name,
      description: row.description ?? '',
      price: row.price,
      originalPrice: row.originalPrice ?? undefined,
      duration: row.duration,
      location: row.location,
      spotName: row.spot?.name,
      spotNames: mergedSpotNames,
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

  /**
   * 首页「热门旅拍目的地」：综合全站套餐浏览、收藏、订单（支付状态加权），
   * 与协同推荐中的隐式反馈权重口径一致（收藏 3、未支付单 4、已支付/完成 6）。
   * 行为数据不足时回退为已上架套餐的城市（按热门/爆款标记）。
   */
  async getHotDestinations(limit = 8) {
    type HotItem = { name: string; tag: string; image: string };
    const safeLimit = Math.min(Math.max(Number(limit) || 8, 4), 20);

    const packages = await this.prisma.travelPackage.findMany({
      where: { status: 'published' },
      select: {
        id: true,
        location: true,
        coverImage: true,
        isPopular: true,
        isHot: true,
      },
      orderBy: { id: 'asc' },
    });

    if (!packages.length) {
      return { items: [] as HotItem[] };
    }

    const publishedIds = new Set(packages.map((p) => p.id));
    const pkgToLoc = new Map(
      packages.map((p) => [p.id, String(p.location || '').trim()]),
    );

    const locationScore = new Map<string, number>();
    const add = (loc: string, w: number) => {
      const k = String(loc || '').trim();
      if (!k || w <= 0) return;
      locationScore.set(k, (locationScore.get(k) || 0) + w);
    };

    const W_BROWSE = 1;
    const W_FAV = 3;

    const [browseAgg, favAgg, orders] = await Promise.all([
      this.prisma.packageBrowseLog.groupBy({
        by: ['packageId'],
        _count: { _all: true },
      }),
      this.prisma.favorite.groupBy({
        by: ['packageId'],
        _count: { _all: true },
      }),
      this.prisma.bookingOrder.findMany({
        select: { location: true, paymentStatus: true },
      }),
    ]);

    for (const row of browseAgg) {
      if (!publishedIds.has(row.packageId)) continue;
      const loc = pkgToLoc.get(row.packageId);
      if (!loc) continue;
      add(loc, W_BROWSE * row._count._all);
    }

    for (const row of favAgg) {
      if (!publishedIds.has(row.packageId)) continue;
      const loc = pkgToLoc.get(row.packageId);
      if (!loc) continue;
      add(loc, W_FAV * row._count._all);
    }

    for (const o of orders) {
      const st = String(o.paymentStatus || '').toLowerCase();
      if (st === 'cancelled') continue;
      const w =
        st === 'paid' || st === 'completed'
          ? 6
          : st === 'offline_pending'
            ? 4
            : 4;
      add(o.location, w);
    }

    let ranked = [...locationScore.entries()].filter(([, s]) => s > 0);
    ranked.sort((a, b) => b[1] - a[1]);

    if (ranked.length === 0) {
      const locBest = new Map<string, number>();
      for (const p of packages) {
        const loc = String(p.location || '').trim();
        if (!loc) continue;
        const sc = (p.isPopular ? 2 : 0) + (p.isHot ? 1 : 0);
        locBest.set(loc, Math.max(locBest.get(loc) || 0, sc));
      }
      ranked = [...locBest.entries()].sort((a, b) => b[1] - a[1]);
    }

    const fallbackImages = [
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1519817650390-64a93db51149?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1470219556762-1771e7f9427d?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1549144511-f099e773c147?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1493558103817-58b2924bce98?q=80&w=1200&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1520854221256-17451cc331bf?q=80&w=1200&auto=format&fit=crop',
    ];

    const hashPick = (s: string) => {
      let h = 0;
      for (let i = 0; i < s.length; i += 1) {
        h = (h + s.charCodeAt(i)) % fallbackImages.length;
      }
      return fallbackImages[h] || fallbackImages[0];
    };

    const bestCoverForLocation = (loc: string): string => {
      const candidates = packages
        .filter(
          (p) =>
            String(p.location || '').trim() === loc &&
            String(p.coverImage || '').trim(),
        )
        .sort((a, b) => {
          const sa = (a.isPopular ? 2 : 0) + (a.isHot ? 1 : 0);
          const sb = (b.isPopular ? 2 : 0) + (b.isHot ? 1 : 0);
          if (sb !== sa) return sb - sa;
          return a.id - b.id;
        });
      const url = candidates[0]?.coverImage;
      return url ? String(url) : '';
    };

    const topLocs: string[] = [];
    const used = new Set<string>();
    for (const [loc] of ranked) {
      if (topLocs.length >= safeLimit) break;
      if (!loc || used.has(loc)) continue;
      used.add(loc);
      topLocs.push(loc);
    }

    if (topLocs.length < safeLimit) {
      const rest = [
        ...new Set(
          packages.map((p) => String(p.location || '').trim()).filter(Boolean),
        ),
      ]
        .filter((loc) => !used.has(loc))
        .sort((a, b) => {
          const scoreLoc = (loc: string) =>
            Math.max(
              ...packages
                .filter((p) => String(p.location || '').trim() === loc)
                .map((p) => (p.isPopular ? 2 : 0) + (p.isHot ? 1 : 0)),
              0,
            );
          return scoreLoc(b) - scoreLoc(a);
        });
      for (const loc of rest) {
        if (topLocs.length >= safeLimit) break;
        topLocs.push(loc);
      }
    }

    const items: HotItem[] = topLocs.map((name, idx) => ({
      name,
      tag: idx < 3 ? '热门' : '推荐',
      image: bestCoverForLocation(name) || hashPick(name),
    }));

    return { items };
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
    /** 兼容旧字段：单景点 */
    spotId?: number;
    /** 新字段：多景点（同城），优先于 spotId */
    spotIds?: number[];
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
    const idsFromArray = Array.isArray(data.spotIds)
      ? data.spotIds
          .map((x) => Number(x))
          .filter((x) => Number.isFinite(x) && x > 0)
      : [];
    const chosenIds = idsFromArray.length
      ? [...new Set(idsFromArray)].slice(0, 20)
      : data.spotId != null
        ? [Number(data.spotId)]
        : [];

    let joinRows: Array<{ spotId: number; order: number }> = [];
    if (chosenIds.length) {
      const spots = await this.prisma.spot.findMany({
        where: { id: { in: chosenIds } },
        include: { city: true },
      });
      if (spots.length !== chosenIds.length) {
        throw new BadRequestException('所选景点无效，请重新选择');
      }
      const cityName = String(spots[0]?.city?.name || '').trim();
      const allSameCity = spots.every(
        (s) => String(s.city?.name || '').trim() === cityName,
      );
      if (!cityName || !allSameCity) {
        throw new BadRequestException('一个套餐只能选择同一城市下的多个景点');
      }
      location = cityName;
      spotId = spots[0].id; // 兼容：保留主景点
      joinRows = chosenIds.map((id, idx) => ({ spotId: id, order: idx }));
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
        ...(joinRows.length
          ? {
              packageSpots: {
                createMany: {
                  data: joinRows,
                  skipDuplicates: true,
                },
              },
            }
          : {}),
      },
      include: packageSpotInclude,
    });
    return this.mapRow(row);
  }

  async update(
    id: number,
    data: Partial<{
      spotId: number | null;
      spotIds: number[];
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

    const rawSpotIds = (data as Partial<{ spotIds: number[] }>)
      .spotIds as unknown;
    const hasSpotIdsArray = Array.isArray(rawSpotIds);
    const idsFromArray: number[] = hasSpotIdsArray
      ? (rawSpotIds as unknown[])
          .map((x) => Number(x))
          .filter((x): x is number => Number.isFinite(x) && x > 0)
      : [];

    let packageSpotsUpdate:
      | Prisma.TravelPackageUpdateInput['packageSpots']
      | undefined;

    // 新字段 spotIds 优先（空数组代表清空关联）
    if (hasSpotIdsArray) {
      const chosenIds = [...new Set(idsFromArray)].slice(0, 20);
      if (chosenIds.length === 0) {
        updateData.spotId = null;
        // location 若由前端手填可继续保留；这里不强制改 location
        packageSpotsUpdate = { deleteMany: {} };
      } else {
        const spots = await this.prisma.spot.findMany({
          where: { id: { in: chosenIds } },
          include: { city: true },
        });
        if (spots.length !== chosenIds.length) {
          throw new BadRequestException('所选景点无效，请重新选择');
        }
        const cityName = String(spots[0]?.city?.name || '').trim();
        const allSameCity = spots.every(
          (s) => String(s.city?.name || '').trim() === cityName,
        );
        if (!cityName || !allSameCity) {
          throw new BadRequestException('一个套餐只能选择同一城市下的多个景点');
        }
        updateData.location = cityName;
        updateData.spotId = spots[0].id; // 兼容：保留主景点
        packageSpotsUpdate = {
          deleteMany: {},
          create: chosenIds.map((sid, idx) => ({
            order: idx,
            spot: { connect: { id: sid } },
          })),
        };
      }
    }

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
      if (data.spotId === undefined && !hasSpotIdsArray) {
        // 手填地点时默认解除景点绑定，避免数据冲突
        updateData.spotId = null;
      }
    }

    const row = await this.prisma.travelPackage.update({
      where: { id },
      data: {
        ...(updateData as Prisma.TravelPackageUpdateInput),
        ...(packageSpotsUpdate ? { packageSpots: packageSpotsUpdate } : {}),
      },
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
