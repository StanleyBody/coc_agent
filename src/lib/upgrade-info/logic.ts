/*
 * 升級資訊的資料與計算
 * 資料來源：src/data/upgrade-info.json（每週由 Clash of Clans Fandom Wiki 自動更新）
 */
import rawData from '../../data/upgrade-info.json' with { type: 'json' };

export type Resource = 'gold' | 'elixir' | 'dark_elixir';
export type BuildingCategory = 'defense' | 'trap' | 'resource' | 'army';
export type UnitType = 'elixir_troop' | 'dark_troop' | 'elixir_spell' | 'dark_spell' | 'siege';
export type Tab = 'buildings' | 'heroes' | 'units';

export interface Level {
  level: number;
  /** null：無法用資源升級（例如解鎖時的初始等級） */
  cost: number | null;
  /** 秒；null：沒有資料 */
  time: number | null;
  /** 建築與英雄為大本營等級，兵種為實驗室等級；null：沒有需求 */
  required: number | null;
  hp?: number | null;
  dps?: number | null;
}

interface BaseItem {
  key: string;
  name: string;
  name_zh: string | null;
  wiki: string;
  resource: Resource;
  alt_resource: Resource | null;
  levels: Level[];
}

export interface Building extends BaseItem {
  category: BuildingCategory;
}

export type Hero = BaseItem;

export interface Unit extends BaseItem {
  type: UnitType;
  unlock_th: number;
}

export type Item = Building | Hero | Unit;

export interface UpgradeData {
  buildings: Building[];
  heroes: Hero[];
  units: Unit[];
  /** 實驗室等級 → 需要的大本營等級 */
  laboratory: Record<string, number>;
  town_hall_max: number;
}

export const DATA = rawData as unknown as UpgradeData;

export const RESOURCE_NAMES: Record<Resource, string> = { gold: '金幣', elixir: '聖水', dark_elixir: '暗黑聖水' };
export const RESOURCE_SHORT: Record<Resource, string> = { gold: '金', elixir: '聖', dark_elixir: '暗' };
export const RESOURCES: Resource[] = ['gold', 'elixir', 'dark_elixir'];

export const BUILDING_CATEGORIES: { key: BuildingCategory; name: string; icon: string }[] = [
  { key: 'defense', name: '防禦建築', icon: '🛡️' },
  { key: 'trap', name: '陷阱', icon: '💣' },
  { key: 'resource', name: '資源建築', icon: '💰' },
  { key: 'army', name: '軍事建築', icon: '⚔️' },
];

export const UNIT_TYPES: { key: UnitType; name: string; icon: string }[] = [
  { key: 'elixir_troop', name: '聖水兵種', icon: '💧' },
  { key: 'dark_troop', name: '暗黑兵種', icon: '⚫' },
  { key: 'elixir_spell', name: '聖水法術', icon: '✨' },
  { key: 'dark_spell', name: '暗黑法術', icon: '🌑' },
  { key: 'siege', name: '攻城機器', icon: '🏰' },
];

export const HERO_ICON = '👑';

export function itemIcon(item: Item): string {
  if ('category' in item) return BUILDING_CATEGORIES.find((c) => c.key === item.category)?.icon ?? '🏠';
  if ('type' in item) return UNIT_TYPES.find((t) => t.key === item.type)?.icon ?? '⚔️';
  return HERO_ICON;
}

export function displayName(item: Item): string {
  return item.name_zh ?? item.name;
}

/** 大本營等級可用的最高實驗室等級；沒有實驗室時回傳 0 */
export function maxLabLevel(th: number, data: UpgradeData = DATA): number {
  let max = 0;
  for (const [lab, required] of Object.entries(data.laboratory)) {
    if (required <= th) max = Math.max(max, Number(lab));
  }
  return max;
}

/**
 * 大本營等級可達到的等級；th 為 null 表示不限制（全部等級）。
 * 回傳空陣列表示這個大本營還不能使用此項目。
 */
export function availableLevels(item: Item, th: number | null, data: UpgradeData = DATA): Level[] {
  if (th === null) return item.levels;
  if ('type' in item) {
    if (item.unlock_th > th) return [];
    const lab = maxLabLevel(th, data);
    return item.levels.filter((lv) => lv.required === null || lv.required <= lab);
  }
  return item.levels.filter((lv) => lv.required === null || lv.required <= th);
}

export interface Filters {
  tab: Tab;
  th: number | null;
  /** 建築類別或兵種類型；null 表示全部 */
  group: string | null;
  search: string;
}

export function itemsForTab(tab: Tab, data: UpgradeData = DATA): Item[] {
  return data[tab];
}

/** 依篩選條件列出項目，並附上可達到的等級 */
export function filterItems(filters: Filters, data: UpgradeData = DATA): { item: Item; levels: Level[] }[] {
  const search = filters.search.trim().toLowerCase();
  return itemsForTab(filters.tab, data)
    .filter((item) => {
      if (!filters.group) return true;
      if ('category' in item) return item.category === filters.group;
      if ('type' in item) return item.type === filters.group;
      return true;
    })
    .filter((item) => !search || item.name.toLowerCase().includes(search)
      || (item.name_zh ?? '').toLowerCase().includes(search))
    .map((item) => ({ item, levels: availableLevels(item, filters.th, data) }))
    .filter(({ levels }) => levels.length > 0);
}

/** 減免後的數值（無條件捨去）；percent 為 0 時不變 */
export function applyDiscount(value: number, percent: number): number {
  if (!value || percent <= 0) return value;
  return Math.floor(value * (1 - percent / 100));
}

export interface Totals {
  cost: Record<Resource, number>;
  time: number;
}

/** 把每個項目從 Lv1 升到可達最高等級的費用與時間加總，各資源分開計算 */
export function totals(rows: { item: Item; levels: Level[] }[], discount = 0): Totals {
  const result: Totals = { cost: { gold: 0, elixir: 0, dark_elixir: 0 }, time: 0 };
  for (const { item, levels } of rows) {
    for (const lv of levels) {
      if (lv.cost) result.cost[item.resource] += applyDiscount(lv.cost, discount);
      if (lv.time) result.time += applyDiscount(lv.time, discount);
    }
  }
  return result;
}

/** 1,234,567 → 1.2M；12,345 → 12K */
export function formatLarge(num: number): string {
  if (!num) return '0';
  if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(0)}K`;
  return num.toLocaleString('en-US');
}

/** 卡片與表格用的短格式：1天12時、3時20分、45秒；0 為「即時」 */
export function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds === 0) return '即時';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return hours > 0 ? `${days}天${hours}時` : `${days}天`;
  if (hours > 0) return minutes > 0 ? `${hours}時${minutes}分` : `${hours}時`;
  if (minutes > 0) return `${minutes}分`;
  return `${seconds}秒`;
}

/** 摘要用的長格式：12 天 5 時 */
export function formatTimeLong(seconds: number): string {
  if (!seconds) return '0';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  if (days > 0) return `${days} 天 ${hours} 時`;
  if (hours > 0) return `${hours} 時`;
  return `${Math.floor(seconds / 60)} 分`;
}

/** 需求欄位的文字 */
export function requirementText(item: Item, level: Level): string {
  if (level.required === null) return '—';
  return 'type' in item ? `實驗室 ${level.required}` : `TH${level.required}`;
}

// ---------------------------------------------------------------- 減免設定（與舊版相同）

export type DiscountKey = 'goldPass' | 'worker';
export type DiscountSettings = Record<DiscountKey, number>;

export const DISCOUNT_GROUPS: {
  key: DiscountKey;
  title: string;
  label: string;
  options: { value: number; name: string }[];
}[] = [
  {
    key: 'goldPass', title: '🏅 月卡等級（Gold Pass）', label: '月卡',
    options: [{ value: 0, name: '無' }, { value: 10, name: '白銀' }, { value: 15, name: '黃金' }, { value: 20, name: '鑽石' }],
  },
  {
    key: 'worker', title: '👷 特殊工人等級', label: '工人',
    options: [{ value: 0, name: '無' }, { value: 5, name: 'Lv.1' }, { value: 10, name: 'Lv.2' }, { value: 15, name: 'Lv.3' }],
  },
];

export const NO_DISCOUNT: DiscountSettings = { goldPass: 0, worker: 0 };

export function totalDiscount(settings: DiscountSettings): number {
  return settings.goldPass + settings.worker;
}

/** 只接受選項內的數值，其餘當作 0 */
export function normalizeDiscount(value: unknown): DiscountSettings {
  const result = { ...NO_DISCOUNT };
  if (value && typeof value === 'object') {
    for (const group of DISCOUNT_GROUPS) {
      const v = Number((value as Record<string, unknown>)[group.key]);
      if (group.options.some((o) => o.value === v)) result[group.key] = v;
    }
  }
  return result;
}

/** 面板上的摘要文字，例如「月卡: 黃金(-15%) | 總減免: -15%」 */
export function discountSummary(settings: DiscountSettings): string {
  const total = totalDiscount(settings);
  if (total === 0) return '未設定減免';
  const parts = DISCOUNT_GROUPS
    .filter((g) => settings[g.key] > 0)
    .map((g) => `${g.label}: ${g.options.find((o) => o.value === settings[g.key])?.name}(-${settings[g.key]}%)`);
  return `${parts.join(' | ')} | 總減免: -${total}%`;
}
