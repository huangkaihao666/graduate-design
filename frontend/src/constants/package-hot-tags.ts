import type { Package } from '@/api/packages';

export type HotTagKey = 'island' | 'ancientCity' | 'cityWalk' | 'couple' | 'weekend' | 'luxury';

type HotTagRule = {
  locations?: string[];
  styles?: string[];
  maxDuration?: number;
  minPrice?: number;
};

export type HotTagConfigItem = {
  label: string;
  value: HotTagKey;
  rule: HotTagRule;
};

export const HOT_TAGS_CONFIG: HotTagConfigItem[] = [
  {
    label: '海岛旅拍',
    value: 'island',
    rule: { locations: ['三亚', '厦门', '巴厘岛', '普吉岛', '马尔代夫'] },
  },
  {
    label: '古城旅拍',
    value: 'ancientCity',
    rule: { locations: ['大理', '丽江', '西安', '京都', '罗马'] },
  },
  {
    label: '城市地标',
    value: 'cityWalk',
    rule: { locations: ['北京', '上海', '成都', '东京', '首尔', '巴黎'] },
  },
  {
    label: '情侣首选',
    value: 'couple',
    rule: { styles: ['romantic', 'artistic', 'classical'] },
  },
  {
    label: '周末短途',
    value: 'weekend',
    rule: { maxDuration: 3 },
  },
  {
    label: '高端定制',
    value: 'luxury',
    rule: { minPrice: 7999 },
  },
];

export const matchPackageByHotTag = (pkg: Package, tag: HotTagConfigItem): boolean => {
  const { rule } = tag;

  if (rule.locations && !rule.locations.includes(pkg.location)) {
    return false;
  }
  if (rule.styles && !rule.styles.includes(pkg.style)) {
    return false;
  }
  if (rule.maxDuration !== undefined && pkg.duration > rule.maxDuration) {
    return false;
  }
  if (rule.minPrice !== undefined && pkg.price < rule.minPrice) {
    return false;
  }

  return true;
};
