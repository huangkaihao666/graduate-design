import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

type Rank = { key: string; label: string; count: number };

type BrowseGroupRow = { packageId: number; _count: { _all: number } };

@Injectable()
export class AdminInsightsService {
  private readonly logger = new Logger(AdminInsightsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logBrowse(
    packageId: number,
    userId: number | undefined,
    context?: string | null,
  ) {
    if (!Number.isFinite(packageId) || packageId <= 0) {
      throw new BadRequestException('packageId 无效');
    }
    const pkg = await this.prisma.travelPackage.findUnique({
      where: { id: packageId },
      select: { id: true },
    });
    if (!pkg) {
      throw new BadRequestException('套餐不存在');
    }
    try {
      await this.prisma.packageBrowseLog.create({
        data: {
          packageId,
          userId: userId && userId > 0 ? userId : null,
          context: context?.slice(0, 40) || null,
        },
      });
    } catch (e) {
      this.logger.warn(
        `packageBrowseLog 写入失败（若未迁移表 package_browse_logs 可忽略）：${String((e as Error)?.message || e)}`,
      );
    }
    return { ok: true };
  }

  /** 表未迁移或数据库异常时返回空浏览数据，避免运营报告整页 500 */
  private async fetchBrowseSnapshot(
    d7: Date,
    d30: Date,
  ): Promise<{
    browse7: BrowseGroupRow[];
    browse30: BrowseGroupRow[];
    browseTotal7: number;
    browseTotal30: number;
  }> {
    const empty = {
      browse7: [] as BrowseGroupRow[],
      browse30: [] as BrowseGroupRow[],
      browseTotal7: 0,
      browseTotal30: 0,
    };
    try {
      const [browse7, browse30, browseTotal7, browseTotal30] =
        await Promise.all([
          this.prisma.packageBrowseLog.groupBy({
            by: ['packageId'],
            where: { createdAt: { gte: d7 } },
            _count: { _all: true },
            orderBy: { _count: { packageId: 'desc' } },
            take: 10,
          }),
          this.prisma.packageBrowseLog.groupBy({
            by: ['packageId'],
            where: { createdAt: { gte: d30 } },
            _count: { _all: true },
            orderBy: { _count: { packageId: 'desc' } },
            take: 10,
          }),
          this.prisma.packageBrowseLog.count({
            where: { createdAt: { gte: d7 } },
          }),
          this.prisma.packageBrowseLog.count({
            where: { createdAt: { gte: d30 } },
          }),
        ]);
      return { browse7, browse30, browseTotal7, browseTotal30 };
    } catch (e) {
      this.logger.warn(
        `PackageBrowseLog 不可用，浏览指标已降级为空。请在 backend 执行: npx prisma migrate deploy — ${String((e as Error)?.message || e)}`,
      );
      return empty;
    }
  }

  async buildOperationalReport() {
    const now = new Date();
    const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const d14 = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      usersCount,
      ordersAll,
      orders7,
      ordersPrev7,
      orders30,
      byStatus,
      byStyle,
      byLocation,
      byPackage,
      favoritesByPkg,
      vtoByStyle,
      styleRecCount,
      itineraryByDest,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: 'user' } }),
      this.prisma.bookingOrder.count(),
      this.prisma.bookingOrder.count({ where: { createdAt: { gte: d7 } } }),
      this.prisma.bookingOrder.count({
        where: { createdAt: { gte: d14, lt: d7 } },
      }),
      this.prisma.bookingOrder.count({ where: { createdAt: { gte: d30 } } }),
      this.prisma.bookingOrder.groupBy({
        by: ['paymentStatus'],
        _count: { _all: true },
      }),
      this.prisma.bookingOrder.groupBy({
        by: ['style'],
        _count: { _all: true },
        orderBy: { _count: { style: 'desc' } },
        take: 12,
      }),
      this.prisma.bookingOrder.groupBy({
        by: ['location'],
        _count: { _all: true },
        orderBy: { _count: { location: 'desc' } },
        take: 12,
      }),
      this.prisma.bookingOrder.groupBy({
        by: ['packageId', 'packageName'],
        _count: { _all: true },
        orderBy: { _count: { packageId: 'desc' } },
        take: 10,
      }),
      this.prisma.favorite.groupBy({
        by: ['packageId'],
        _count: { _all: true },
        orderBy: { _count: { packageId: 'desc' } },
        take: 10,
      }),
      this.prisma.virtualTryOnHistory.groupBy({
        by: ['style'],
        _count: { _all: true },
        orderBy: { _count: { style: 'desc' } },
        take: 10,
      }),
      this.prisma.styleRecommendationHistory.count(),
      this.prisma.itineraryPlanningHistory.groupBy({
        by: ['destination'],
        _count: { _all: true },
        orderBy: { _count: { destination: 'desc' } },
        take: 10,
      }),
    ]);

    const { browse7, browse30, browseTotal7, browseTotal30 } =
      await this.fetchBrowseSnapshot(d7, d30);

    const paid =
      byStatus.find((x) => x.paymentStatus === 'paid')?._count._all ?? 0;
    const completed =
      byStatus.find((x) => x.paymentStatus === 'completed')?._count._all ?? 0;
    const unpaid =
      byStatus.find((x) => x.paymentStatus === 'unpaid')?._count._all ?? 0;

    const packageNameMap = new Map<number, string>();
    for (const row of byPackage) {
      if (row.packageId != null) {
        packageNameMap.set(row.packageId, row.packageName);
      }
    }
    const extraIds = [
      ...new Set([
        ...browse7.map((x) => x.packageId),
        ...browse30.map((x) => x.packageId),
        ...favoritesByPkg.map((x) => x.packageId),
      ]),
    ].filter((id) => !packageNameMap.has(id));
    if (extraIds.length) {
      const rows = await this.prisma.travelPackage.findMany({
        where: { id: { in: extraIds } },
        select: { id: true, name: true },
      });
      for (const r of rows) packageNameMap.set(r.id, r.name);
    }

    const enrichBrowse = (rows: typeof browse7): Rank[] =>
      rows.map((r) => ({
        key: String(r.packageId),
        label: packageNameMap.get(r.packageId) ?? `套餐 #${r.packageId}`,
        count: r._count._all,
      }));

    const purchaseTopStyles: Rank[] = byStyle.map((r) => ({
      key: r.style,
      label: r.style,
      count: r._count._all,
    }));
    const purchaseTopLocations: Rank[] = byLocation.map((r) => ({
      key: r.location,
      label: r.location,
      count: r._count._all,
    }));
    const purchaseTopPackages: Rank[] = byPackage.map((r) => ({
      key:
        r.packageId != null ? String(r.packageId) : `custom:${r.packageName}`,
      label: r.packageName,
      count: r._count._all,
    }));

    const favoritesTop: Rank[] = favoritesByPkg.map((r) => ({
      key: String(r.packageId),
      label: packageNameMap.get(r.packageId) ?? `套餐 #${r.packageId}`,
      count: r._count._all,
    }));

    const browseTop7 = enrichBrowse(browse7);
    const browseTop30 = enrichBrowse(browse30);

    const aiVirtualTryOn: Rank[] = vtoByStyle.map((r) => ({
      key: r.style,
      label: r.style,
      count: r._count._all,
    }));
    const aiItinerary: Rank[] = itineraryByDest.map((r) => ({
      key: r.destination,
      label: r.destination,
      count: r._count._all,
    }));

    const orderMom =
      ordersPrev7 > 0
        ? Math.round(((orders7 - ordersPrev7) / ordersPrev7) * 100)
        : orders7 > 0
          ? 100
          : 0;

    const narrative = this.buildNarratives({
      usersCount,
      ordersAll,
      orders7,
      orders30,
      orderMom,
      paid,
      completed,
      unpaid,
      purchaseTopStyles,
      purchaseTopLocations,
      purchaseTopPackages,
      favoritesTop,
      browseTotal7,
      browseTotal30,
      browseTop7,
      aiVirtualTryOn,
      styleRecCount,
      aiItinerary,
    });

    return {
      generatedAt: now.toISOString(),
      summary: {
        usersCount,
        ordersTotal: ordersAll,
        ordersLast7Days: orders7,
        ordersLast30Days: orders30,
        orderWeekOverWeekPercent: orderMom,
        paidOrders: paid,
        completedOrders: completed,
        unpaidOrders: unpaid,
        browseEvents7d: browseTotal7,
        browseEvents30d: browseTotal30,
        styleRecommendationSessions: styleRecCount,
      },
      purchaseDemand: {
        topStyles: purchaseTopStyles,
        topLocations: purchaseTopLocations,
        topPackages: purchaseTopPackages,
      },
      browseInterest: {
        topPackages7d: browseTop7,
        topPackages30d: browseTop30,
      },
      favorites: { topPackages: favoritesTop },
      aiBehavior: {
        virtualTryOnByStyle: aiVirtualTryOn,
        styleRecommendationCount: styleRecCount,
        itineraryTopDestinations: aiItinerary,
      },
      businessReport: narrative.businessReport,
      marketingSuggestions: narrative.marketingSuggestions,
      dataAnalysis: narrative.dataAnalysis,
    };
  }

  private buildNarratives(p: {
    usersCount: number;
    ordersAll: number;
    orders7: number;
    orders30: number;
    orderMom: number;
    paid: number;
    completed: number;
    unpaid: number;
    purchaseTopStyles: Rank[];
    purchaseTopLocations: Rank[];
    purchaseTopPackages: Rank[];
    favoritesTop: Rank[];
    browseTotal7: number;
    browseTotal30: number;
    browseTop7: Rank[];
    aiVirtualTryOn: Rank[];
    styleRecCount: number;
    aiItinerary: Rank[];
  }) {
    const businessReport: string[] = [];
    const marketingSuggestions: string[] = [];
    const dataAnalysis: string[] = [];

    businessReport.push(
      `截至报告生成时，平台共有注册用户约 ${p.usersCount} 人（角色为 user），累计预约订单 ${p.ordersAll} 单；近 7 日新增订单 ${p.orders7} 单，近 30 日 ${p.orders30} 单。`,
    );
    if (p.orderMom !== 0) {
      businessReport.push(
        `订单周环比约 ${p.orderMom > 0 ? '增长' : '下降'} ${Math.abs(p.orderMom)}%，可作为短期运营节奏的参考（样本较小时波动会偏大）。`,
      );
    }
    businessReport.push(
      `支付转化方面：已支付 ${p.paid} 单、已完成 ${p.completed} 单、待支付 ${p.unpaid} 单；若待支付占比偏高，建议结合短信/站内提醒与支付链路体验排查。`,
    );

    const topStyle = p.purchaseTopStyles[0];
    const topLoc = p.purchaseTopLocations[0];
    if (topStyle) {
      dataAnalysis.push(
        `下单风格分布：当前最热风格关键词为「${topStyle.label}」（${topStyle.count} 单），可对照套餐库存与摄影师擅长方向做供给匹配。`,
      );
    }
    if (topLoc) {
      dataAnalysis.push(
        `目的地需求：预约量最高的目的地为「${topLoc.label}」（${topLoc.count} 单），适合作为投放落地页与套餐主推城市。`,
      );
    }

    dataAnalysis.push(
      `浏览埋点：近 7 日套餐浏览事件 ${p.browseTotal7} 次、近 30 日 ${p.browseTotal30} 次；与收藏、下单联看可估算「浏览—意向—成交」漏斗。`,
    );
    if (p.browseTop7[0]) {
      dataAnalysis.push(
        `近 7 日被查看最多的套餐为「${p.browseTop7[0].label}」（${p.browseTop7[0].count} 次），若下单转化一般，可检查价格、档期或详情页卖点是否清晰。`,
      );
    }

    if (p.favoritesTop[0]) {
      dataAnalysis.push(
        `收藏热度最高的套餐为「${p.favoritesTop[0].label}」（${p.favoritesTop[0].count} 次收藏），通常代表强意向人群，适合做限时优惠或私域跟进。`,
      );
    }

    if (p.aiVirtualTryOn[0]) {
      dataAnalysis.push(
        `AI 虚拍：用户尝试最多的风格为「${p.aiVirtualTryOn[0].label}」，可在首页与套餐列表强化该风格的案例展示。`,
      );
    }
    dataAnalysis.push(
      `AI 风格推荐历史会话累计 ${p.styleRecCount} 次，说明用户对「选风格」存在决策成本，可补充对比表与套餐映射说明。`,
    );
    if (p.aiItinerary[0]) {
      dataAnalysis.push(
        `行程规划中最常被查询的目的地为「${p.aiItinerary[0].label}」，可与当地景点/套餐打包运营。`,
      );
    }

    if (p.unpaid > 2) {
      marketingSuggestions.push(
        '待支付订单较多：建议在订单详情增加「一键催付」模板（短信/站内信），并对超时未支付订单自动释放档期。',
      );
    }
    if (topLoc && topStyle) {
      marketingSuggestions.push(
        `在「${topLoc.label}」×「${topStyle.label}」组合上加大内容营销（样片、客片故事），并投放与搜索词一致的广告落地页，承接当前主力需求。`,
      );
    }
    if (
      p.browseTotal7 > 10 &&
      p.orders7 < Math.max(1, Math.floor(p.browseTotal7 / 20))
    ) {
      marketingSuggestions.push(
        '浏览量相对下单量偏高：可尝试缩短预约路径、突出「含妆造/精修张数」等决策信息，或增加限时券提升首单转化。',
      );
    }
    if (!p.purchaseTopPackages.length && p.browseTop7.length) {
      marketingSuggestions.push(
        '有浏览热度但订单样本仍少：建议对高热套餐做 A/B 定价或赠品测试，并收集用户未完成下单的原因（问卷/客服记录）。',
      );
    }
    marketingSuggestions.push(
      '持续对比「收藏 TOP」与「下单 TOP」：若高度重合说明转化路径健康；若偏离则说明存在价格或信任障碍，需针对性优化。',
    );
    marketingSuggestions.push(
      '将 AI 功能（虚拍、风格推荐）与具体套餐 ID 关联推荐，可把「玩一下」转化为「拍这个套餐」的明确 CTA。',
    );

    return { businessReport, marketingSuggestions, dataAnalysis };
  }
}
