/* 攻略影片資料與篩選；資料來源 src/data/guides.json */
import rawData from '../../data/guides.json' with { type: 'json' };

export interface Guide {
  title: string;
  title_en: string;
  category: string;
  difficulty: string;
  description: string;
  views: string;
  icon: string;
  /** null：影片尚未提供 */
  url: string | null;
}

export interface GuidesData {
  categories: string[];
  difficulties: string[];
  guides: Guide[];
}

export const DATA = rawData as unknown as GuidesData;
export const ALL = '全部';

/** 「12.5K」→ 12500，用來排序熱門攻略 */
export function parseViews(text: string): number {
  const m = /([\d.]+)\s*([KMB]?)/i.exec(text.replace(/,/g, ''));
  if (!m) return 0;
  const scale = { '': 1, K: 1e3, M: 1e6, B: 1e9 }[m[2].toUpperCase() as '' | 'K' | 'M' | 'B'];
  return Math.round(Number(m[1]) * scale);
}

/** 觀看次數最多的前幾篇 */
export function popularGuides(count: number, guides: Guide[] = DATA.guides): Guide[] {
  return [...guides].sort((a, b) => parseViews(b.views) - parseViews(a.views)).slice(0, count);
}

/** 分類與搜尋同時套用；搜尋比對中文與英文標題 */
export function matchGuide(guide: Pick<Guide, 'category' | 'title' | 'title_en'>, category: string, query: string): boolean {
  const q = query.trim().toLowerCase();
  const inCategory = category === ALL || guide.category === category;
  const inSearch = !q || guide.title.toLowerCase().includes(q) || guide.title_en.toLowerCase().includes(q);
  return inCategory && inSearch;
}
