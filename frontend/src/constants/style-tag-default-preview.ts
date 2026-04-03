/**
 * 六种预设旅拍风格在用户端虚拍试衣中的默认示例图与图标（与 VirtualTryOn stylePreviewMap 一致）
 */
import xpsy1 from '@/assets/images/hero/xpsy1.jpg';
import xpsy2 from '@/assets/images/hero/xpsy2.jpg';
import xpsy3 from '@/assets/images/hero/xpsy3.jpg';
import xpsy4 from '@/assets/images/hero/xpsy4.jpg';
import xpsy5 from '@/assets/images/hero/xpsy5.jpg';
import xpsy6 from '@/assets/images/hero/xpsy6.jpg';

export const CANONICAL_STYLE_PREVIEW_BY_KEY: Record<string, string> = {
  minimalist: xpsy1,
  classical: xpsy2,
  bohemian: xpsy3,
  romantic: xpsy4,
  adventure: xpsy5,
  artistic: xpsy6,
};

export const CANONICAL_STYLE_DEFAULT_ICON: Record<string, string> = {
  minimalist: '⬜',
  classical: '👑',
  bohemian: '🌻',
  romantic: '✨',
  adventure: '⛰️',
  artistic: '🎨',
};
