import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type PackageSeedRow = {
  name: string;
  description: string;
  price: number;
  originalPrice: number | null;
  duration: number;
  location: string;
  spotId: number;
  style: string;
  coverImage: string;
  images: string[];
  features: string[];
  includes: string[];
  excludes: string[];
  maxPeople: number;
  isPopular: boolean;
  isHot: boolean;
  status: string;
};

const domesticLocations = [
  '三亚',
  '大理',
  '丽江',
  '厦门',
  '青岛',
  '北京',
  '上海',
  '杭州',
  '苏州',
  '南京',
  '成都',
  '重庆',
  '西安',
  '长沙',
  '张家界',
  '桂林',
  '昆明',
  '香格里拉',
  '拉萨',
  '香港',
  '澳门',
];

const overseasLocations = [
  '东京',
  '京都',
  '首尔',
  '新加坡',
  '巴厘岛',
  '普吉岛',
  '清迈',
  '马尔代夫',
  '巴黎',
  '罗马',
];

const styleKeys = [
  'romantic',
  'artistic',
  'bohemian',
  'minimalist',
  'classical',
  'adventure',
];

const styleNames: Record<string, string> = {
  romantic: '浪漫梦幻',
  artistic: '艺术文艺',
  bohemian: '波西米亚',
  minimalist: '极简现代',
  classical: '古典优雅',
  adventure: '冒险活力',
};

const imageUrls = [
  'https://images.unsplash.com/photo-1519741497674-611481863552?w=600&h=400&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&h=400&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1581338834647-b0fb40704e21?w=600&h=400&fit=crop&auto=format&q=80',
  'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&h=400&fit=crop&auto=format&q=80',
];

async function main() {
  await prisma.favorite.deleteMany();
  await prisma.travelPackage.deleteMany();
  await prisma.styleTag.deleteMany();
  await prisma.spot.deleteMany();

  await prisma.styleTag.createMany({
    data: Object.entries(styleNames).map(([key, name], idx) => ({
      key,
      name,
      enabled: true,
      sortOrder: idx,
    })),
  });

  const locations = [...domesticLocations, ...overseasLocations];

  await prisma.spot.createMany({
    data: locations.map((city) => ({
      name: `${city}旅拍目的地`,
      city,
      category: '旅拍',
      recommended: false,
    })),
  });

  const spotRows = await prisma.spot.findMany({
    where: { city: { in: locations } },
  });
  const cityToSpotId = new Map(spotRows.map((s) => [s.city, s.id]));

  const sanya = await prisma.spot.findFirst({ where: { city: '三亚' } });
  if (sanya) {
    await prisma.spot.update({
      where: { id: sanya.id },
      data: { name: '天涯海角', category: '海岛', recommended: true },
    });
  }
  await prisma.spot.updateMany({
    where: { city: { in: ['丽江', '上海'] } },
    data: { recommended: true },
  });

  const durationOptions = [1, 2, 3, 5, 7];
  const priceOptions = [2999, 3999, 4999, 5999, 6999, 8999, 12999];

  const detailImageUrls = [
    [
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=600&fit=crop&auto=format&q=80',
    ],
    [
      'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=800&h=600&fit=crop&auto=format&q=80',
      'https://images.unsplash.com/photo-1519741497674-611481863552?w=800&h=600&fit=crop&auto=format&q=80',
    ],
  ];

  const packagesData: PackageSeedRow[] = [];
  for (let i = 1; i <= 60; i++) {
    const location = locations[(i - 1) % locations.length];
    const spotId = cityToSpotId.get(location);
    if (spotId === undefined) {
      throw new Error(`Missing spot for city: ${location}`);
    }
    const style = styleKeys[(i - 1) % styleKeys.length];
    const duration = durationOptions[(i - 1) % durationOptions.length];
    const basePrice = priceOptions[(i - 1) % priceOptions.length];
    const hasDiscount = i % 2 === 0;
    const imageIndex = (i - 1) % imageUrls.length;
    const detailImageIndex = (i - 1) % detailImageUrls.length;
    const styleLabel = styleNames[style] || style;

    packagesData.push({
      name: `${location}${duration}日${styleLabel}旅拍套餐`,
      description: `精选${location}最美景点，专业摄影师全程跟拍，${duration}天${duration > 1 ? '深度' : ''}体验，为您打造难忘的旅拍回忆。包含专业化妆、精美服装、后期精修等服务。`,
      price: hasDiscount ? Math.floor(basePrice * 0.8) : basePrice,
      originalPrice: hasDiscount ? basePrice : null,
      duration,
      location,
      spotId,
      style,
      coverImage: imageUrls[imageIndex],
      images: detailImageUrls[detailImageIndex],
      features: [
        '专业摄影师全程跟拍',
        '精美婚纱礼服提供',
        '专业化妆造型服务',
        '精修照片30张以上',
        '视频花絮制作',
      ],
      includes: [
        '专业摄影师服务',
        '化妆造型服务',
        '精美婚纱礼服',
        '景点门票',
        '精修照片30张',
        '视频花絮',
      ],
      excludes: ['往返交通', '住宿费用', '餐饮费用'],
      maxPeople: [2, 4, 6][(i - 1) % 3],
      isPopular: i <= 3,
      isHot: i > 3 && i <= 6,
      status: 'published',
    });
  }

  await prisma.travelPackage.createMany({ data: packagesData });

  const spotCount = await prisma.spot.count();
  console.log(
    `Seed OK: styleTags=6, spots=${spotCount}, packages=${packagesData.length}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
