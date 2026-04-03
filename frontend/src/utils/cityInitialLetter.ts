import { pinyin } from 'pinyin-pro';

/**
 * 城市名称首字母（A–Z），用于列表排序与左侧索引。
 * 中文取拼音首字母；英文取首字符；其余归为「#」（排在本页末尾逻辑中处理）。
 */
export function getCityInitialLetter(name: string): string {
  const t = name.trim();
  if (!t) return '#';
  const c = t[0];
  if (/[A-Za-z]/.test(c)) return c.toUpperCase();
  if (/[\u4e00-\u9fff]/.test(c)) {
    // 对整段名称取首字母，避免单字多音字误判（如「重庆」的「重」单字常判为 zhòng→Z，整词为 chóng→C）
    const py = pinyin(t, { pattern: 'first', toneType: 'none', type: 'string' });
    const firstSeg = (py || '').trim().split(/\s+/)[0] ?? '';
    const letter = firstSeg.charAt(0).toUpperCase();
    if (/[A-Z]/.test(letter)) return letter;
  }
  return '#';
}

/** 城市名称列表：先按首字母（中文为拼音首字母），同字母下按中文拼音序 */
export function sortCityNamesByInitial(names: string[]): string[] {
  return [...names].sort((a, b) => {
    const la = getCityInitialLetter(a);
    const lb = getCityInitialLetter(b);
    if (la !== lb) {
      if (la === '#') return 1;
      if (lb === '#') return -1;
      return la.localeCompare(lb);
    }
    return a.localeCompare(b, 'zh-Hans-CN');
  });
}
