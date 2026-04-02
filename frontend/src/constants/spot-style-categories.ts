import { TRAVEL_STYLE_LABELS } from './travel-style-labels';

/** 景点「风格分类」选项，与旅拍风格 key / 套餐 style 一致 */
export const SPOT_STYLE_CATEGORY_OPTIONS = Object.entries(TRAVEL_STYLE_LABELS).map(
  ([value, label]) => ({ value, label })
);

export function getSpotCategoryLabel(category: string): string {
  if (!category) return '—';
  return TRAVEL_STYLE_LABELS[category] ?? category;
}
