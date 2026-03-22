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
  await prisma.photographer.deleteMany();
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

  await prisma.photographer.createMany({
    data: [
      {
        name: '陈映',
        title: '首席摄影师',
        avatar: imageUrls[0],
        shootingStyle:
          '纪实与唯美结合，擅长自然光人像与海边、古镇情绪片，注重抓拍真实互动瞬间。',
        yearsExperience: 10,
        bio: '从业十年，服务新人超过 800 对，作品多次入选行业年鉴。相信最好的照片来自放松的状态与真诚的笑。',
        gender: '女',
        age: 34,
        specialtyTopics: '婚纱旅拍、海边情绪片、古镇纪实',
        awards: '省摄影家协会会员；2023 年度旅拍作品金奖（样片）',
        portfolioImages: [imageUrls[0], imageUrls[1], imageUrls[2], imageUrls[3]],
        availableDates: ['2026-04-05', '2026-04-12', '2026-04-19', '2026-04-26'],
        scheduleNote: '每周二店休；节假日档期紧张，建议尽早预约。',
        sortOrder: 0,
        enabled: true,
      },
      {
        name: '林溪',
        title: '艺术总监',
        avatar: imageUrls[1],
        shootingStyle:
          '偏文艺胶片感与电影叙事构图，适合喜欢故事感与氛围感的新人。',
        yearsExperience: 7,
        bio: '摄影与美术双背景，擅长用光影与留白讲述两个人的旅程。',
        gender: '男',
        age: 31,
        specialtyTopics: '文艺胶片、电影感构图、室内棚拍',
        awards: '中国美术学院摄影方向进修；平台认证签约摄影师',
        portfolioImages: [imageUrls[2], imageUrls[3], imageUrls[0]],
        availableDates: ['2026-04-03', '2026-04-10', '2026-04-17'],
        scheduleNote: '工作日与周末均可；拍摄前请提前 3 天确认行程。',
        sortOrder: 1,
        enabled: true,
      },
      {
        name: '周远',
        title: '资深旅拍摄影师',
        avatar: imageUrls[2],
        shootingStyle:
          '户外冒险与轻婚纱结合，擅长山地、公路与日落黄金时刻大片。',
        yearsExperience: 6,
        bio: '曾驻云南、川西多地创作，熟悉各地最佳机位与光线节奏。',
        gender: '男',
        age: 29,
        specialtyTopics: '户外旅拍、公路与山地、日落黄金时刻',
        awards: '国家高级摄影师（三级）',
        portfolioImages: [imageUrls[3], imageUrls[0], imageUrls[1]],
        availableDates: ['2026-04-01', '2026-04-08', '2026-04-15', '2026-04-22', '2026-05-01'],
        scheduleNote: '户外档期受天气影响，可能微调；客服会提前与您沟通。',
        sortOrder: 2,
        enabled: true,
      },
    ],
  });

  const spotCount = await prisma.spot.count();
  const phCount = await prisma.photographer.count();
  console.log(
    `Seed OK: styleTags=6, spots=${spotCount}, packages=${packagesData.length}, photographers=${phCount}`,
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
