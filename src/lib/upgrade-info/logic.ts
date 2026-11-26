/*
 * 升級資訊的資料與計算
 * 資料來源：src/data/upgrade-info.json（每週由 Clash of Clans Fandom Wiki 自動更新）
 */
import rawData from '../../data/upgrade-info.json' with { type: 'json' };
import { hasZh, zh } from '../i18n.ts';

export type Resource = 'gold' | 'elixir' | 'dark_elixir' | 'shiny_ore' | 'glowy_ore' | 'starry_ore';
export type Source = 'buildings' | 'heroes' | 'units' | 'pets' | 'equipment';

export interface Level {
  level: number;
  /** 各資源的費用；空物件表示無法用資源升級（例如解鎖時的初始等級） */
  costs: Partial<Record<Resource, number>>;
  /** 秒；null：沒有資料（例如裝備為即時升級） */
  time: number | null;
  /** 需求等級（大本營、實驗室、Pet House 或 Blacksmith）；null：沒有需求 */
  required: number | null;
  hp?: number | null;
  dps?: number | null;
}

export interface Item {
  key: string;
  /** 英文名稱；中文由 zh() 查詢 */
  name: string;
  wiki: string;
  resources: Resource[];
  alt_resource: Resource | null;
  levels: Level[];
  /** 建築類別 */
  category?: string;
  /** 兵種、法術、攻城機器的類型 */
  type?: string;
  /** 裝備所屬英雄的 key */
  hero?: string;
}

export type UpgradeData = Record<Source, Item[]>;

export const DATA = rawData as unknown as UpgradeData;

/** 資源名稱（遊戲內翻譯） */
export const RESOURCE_NAMES: Record<Resource, string> = {
  gold: zh('Gold'), elixir: zh('Elixir'), dark_elixir: zh('Dark Elixir'),
  shiny_ore: zh('Shiny Ore'), glowy_ore: zh('Glowy Ore'), starry_ore: zh('Starry Ore'),
};

/** 需求欄位的名稱（遊戲內翻譯） */
export const REQUIREMENT_NAMES: Record<Source, string> = {
  buildings: zh('Town Hall'), heroes: zh('Town Hall'), units: zh('Laboratory'),
  pets: zh('Pet House'), equipment: zh('Blacksmith'),
};

export interface Group {
  key: string;
  name: string;
  icon: string;
}

export interface TabConfig {
  key: string;
  name: string;
  icon: string;
  source: Source;
  /** 用來分子分類的欄位；沒有子分類時省略 */
  groupField?: 'category' | 'type' | 'hero';
  /** 子分類；也用來限定這個分頁包含哪些項目 */
  groups: Group[];
}

const heroGroups: Group[] = DATA.heroes.map((h) => ({ key: h.key, name: zh(h.name), icon: '👑' }));
const DARK = RESOURCE_NAMES.dark_elixir;
const ELIXIR = RESOURCE_NAMES.elixir;

export const TABS: TabConfig[] = [
  {
    key: 'buildings', name: '建築', icon: '🏠', source: 'buildings', groupField: 'category',
    groups: [
      { key: 'army', name: '軍隊相關', icon: '⚔️' },
      { key: 'defense', name: '防禦相關', icon: '🛡️' },
      { key: 'resource', name: '資源相關', icon: '💰' },
      { key: 'trap', name: '陷阱', icon: '💣' },
    ],
  },
  {
    key: 'troops', name: '兵種', icon: '⚔️', source: 'units', groupField: 'type',
    groups: [
      { key: 'elixir_troop', name: `${ELIXIR}兵種`, icon: '💧' },
      { key: 'dark_troop', name: `${DARK}兵種`, icon: '⚫' },
    ],
  },
  { key: 'heroes', name: '英雄', icon: '👑', source: 'heroes', groups: [] },
  {
    key: 'spells', name: '法術', icon: '✨', source: 'units', groupField: 'type',
    groups: [
      { key: 'elixir_spell', name: `${ELIXIR}法術`, icon: '✨' },
      { key: 'dark_spell', name: `${DARK}法術`, icon: '🌑' },
    ],
  },
  {
    key: 'sieges', name: zh('Siege Machines'), icon: '🏰', source: 'units', groupField: 'type',
    groups: [{ key: 'siege', name: zh('Siege Machines'), icon: '🏰' }],
  },
  { key: 'pets', name: '戰寵', icon: '🐾', source: 'pets', groups: [] },
  { key: 'equipment', name: '裝備', icon: '🎒', source: 'equipment', groupField: 'hero', groups: heroGroups },
];

export function tabByKey(key: string | null): TabConfig {
  return TABS.find((t) => t.key === key) ?? TABS[0];
}

function groupOf(tab: TabConfig, item: Item): string | undefined {
  return tab.groupField ? item[tab.groupField] : undefined;
}

/** 分頁包含的所有項目 */
export function itemsInTab(tab: TabConfig, data: UpgradeData = DATA): Item[] {
  const items = data[tab.source];
  if (!tab.groupField) return items;
  const keys = new Set(tab.groups.map((g) => g.key));
  return items.filter((item) => keys.has(groupOf(tab, item) ?? ''));
}

/** 子分類只有一個時不需要顯示選單 */
export function hasGroupFilter(tab: TabConfig): boolean {
  return tab.groups.length > 1;
}

export function itemIcon(tab: TabConfig, item: Item): string {
  // 裝備的子分類是英雄，卡片仍使用裝備的圖示
  if (tab.groupField === 'hero') return tab.icon;
  return tab.groups.find((g) => g.key === groupOf(tab, item))?.icon ?? tab.icon;
}

export function displayName(item: Item): string {
  return zh(item.name);
}

/** 有中文名稱時，英文原名作為副標題 */
export function hasChineseName(item: Item): boolean {
  return hasZh(item.name);
}

export interface Filters {
  tab: TabConfig;
  /** 子分類 key；null 表示全部 */
  group: string | null;
  search: string;
}

/** 依子分類與名稱篩選（中英文皆可搜尋） */
export function filterItems(filters: Filters, data: UpgradeData = DATA): Item[] {
  const search = filters.search.trim().toLowerCase();
  return itemsInTab(filters.tab, data)
    .filter((item) => !filters.group || groupOf(filters.tab, item) === filters.group)
    .filter((item) => !search || item.name.toLowerCase().includes(search)
      || zh(item.name).toLowerCase().includes(search));
}

/** 減免後的數值（無條件捨去）；percent 為 0 時不變 */
export function applyDiscount(value: number, percent: number): number {
  if (!value || percent <= 0) return value;
  return Math.floor(value * (1 - percent / 100));
}

/** 1234567 → 1,234,567 */
export function formatNumber(num: number): string {
  return num.toLocaleString('en-US');
}

/** 1天12小時、3小時20分鐘、45秒；0 為「即時」 */
export function formatTime(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds === 0) return '即時';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return hours > 0 ? `${days}天${hours}小時` : `${days}天`;
  if (hours > 0) return minutes > 0 ? `${hours}小時${minutes}分鐘` : `${hours}小時`;
  if (minutes > 0) return `${minutes}分鐘`;
  return `${seconds}秒`;
}

/** 需求欄位的文字 */
export function requirementText(source: Source, level: Level): string {
  if (level.required === null) return '—';
  return `${REQUIREMENT_NAMES[source]} ${level.required}`;
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
