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
  // 应你的要求：seed 改为「完全不修改数据库」的只读模式（no-op）。
  const [userCount, photographerCount, spotCount, packageCount] = await Promise.all([
    prisma.user.count(),
    prisma.photographer.count(),
    prisma.spot.count(),
    prisma.travelPackage.count(),
  ]);
  console.log(
    `Seed NO-OP: users=${userCount}, photographers=${photographerCount}, spots=${spotCount}, packages=${packageCount}`,
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
