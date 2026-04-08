import type { Package } from '@/api/packages';
import { TRAVEL_STYLE_LABELS } from '@/constants/travel-style-labels';

/**
 * 与虚拍试衣（VirtualTryOn）可选风格 key 一致，共 6 种
 */
export type HotTagKey =
  | 'minimalist'
  | 'classical'
  | 'bohemian'
  | 'romantic'
  | 'adventure'
  | 'artistic';

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

/** 顺序与虚拍试衣默认列表一致 */
export const HOT_TAGS_CONFIG: HotTagConfigItem[] = [
  {
    label: TRAVEL_STYLE_LABELS.minimalist,
    value: 'minimalist',
    rule: { styles: ['minimalist'] },
  },
  {
    label: TRAVEL_STYLE_LABELS.classical,
    value: 'classical',
    rule: { styles: ['classical'] },
  },
  {
    label: TRAVEL_STYLE_LABELS.bohemian,
    value: 'bohemian',
    rule: { styles: ['bohemian'] },
  },
  {
    label: TRAVEL_STYLE_LABELS.romantic,
    value: 'romantic',
    rule: { styles: ['romantic'] },
  },
  {
    label: TRAVEL_STYLE_LABELS.adventure,
    value: 'adventure',
    rule: { styles: ['adventure'] },
  },
  {
    label: TRAVEL_STYLE_LABELS.artistic,
    value: 'artistic',
    rule: { styles: ['artistic'] },
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
