/**
 * 与用户端 TRAVEL_STYLE_LABELS 一致的六种旅拍风格（key + 展示名）
 */
export const CANONICAL_STYLE_TAGS = [
  { key: 'minimalist', name: '韩式简约', sortOrder: 10 },
  { key: 'classical', name: '国风典雅', sortOrder: 20 },
  { key: 'bohemian', name: '海岛松弛', sortOrder: 30 },
  { key: 'romantic', name: '森系草坪', sortOrder: 40 },
  { key: 'adventure', name: '旷野自由', sortOrder: 50 },
  { key: 'artistic', name: '纪实故事', sortOrder: 60 },
] as const;

export const CANONICAL_STYLE_KEYS: ReadonlySet<string> = new Set<string>(
  CANONICAL_STYLE_TAGS.map((t) => t.key),
);
