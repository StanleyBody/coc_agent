/*
 * 升級資訊的資料與計算
 * 資料來源：src/data/upgrade-info.json（每週由 Clash of Clans Fandom Wiki 自動更新）
 */
import rawData from '../../data/upgrade-info.json' with { type: 'json' };

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
  name: string;
  name_zh: string | null;
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

export const RESOURCES: Resource[] = ['gold', 'elixir', 'dark_elixir', 'shiny_ore', 'glowy_ore', 'starry_ore'];
/** 礦石沒有確定的中文名稱，顯示英文原名 */
export const RESOURCE_NAMES: Record<Resource, string> = {
  gold: '金幣', elixir: '聖水', dark_elixir: '暗黑重油',
  shiny_ore: 'Shiny Ore', glowy_ore: 'Glowy Ore', starry_ore: 'Starry Ore',
};
export const RESOURCE_SHORT: Record<Resource, string> = {
  gold: '金', elixir: '聖', dark_elixir: '暗',
  shiny_ore: 'Shiny', glowy_ore: 'Glowy', starry_ore: 'Starry',
};

/** 需求欄位的名稱 */
export const REQUIREMENT_NAMES: Record<Source, string> = {
  buildings: '大本營', heroes: '大本營', units: '實驗室', pets: 'Pet House', equipment: 'Blacksmith',
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

const heroGroups: Group[] = DATA.heroes.map((h) => ({ key: h.key, name: h.name_zh ?? h.name, icon: '👑' }));

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
      { key: 'elixir_troop', name: '聖水兵種', icon: '💧' },
      { key: 'dark_troop', name: '暗黑重油兵種', icon: '⚫' },
    ],
  },
  { key: 'heroes', name: '英雄', icon: '👑', source: 'heroes', groups: [] },
  {
    key: 'spells', name: '法術', icon: '✨', source: 'units', groupField: 'type',
    groups: [
      { key: 'elixir_spell', name: '聖水法術', icon: '✨' },
      { key: 'dark_spell', name: '暗黑重油法術', icon: '🌑' },
    ],
  },
  {
    key: 'sieges', name: '攻城機器', icon: '🏰', source: 'units', groupField: 'type',
    groups: [{ key: 'siege', name: '攻城機器', icon: '🏰' }],
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
  return item.name_zh ?? item.name;
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
      || (item.name_zh ?? '').toLowerCase().includes(search));
}

/** 減免後的數值（無條件捨去）；percent 為 0 時不變 */
export function applyDiscount(value: number, percent: number): number {
  if (!value || percent <= 0) return value;
  return Math.floor(value * (1 - percent / 100));
}

export type Costs = Record<Resource, number>;

export function emptyCosts(): Costs {
  return { gold: 0, elixir: 0, dark_elixir: 0, shiny_ore: 0, glowy_ore: 0, starry_ore: 0 };
}

export interface Totals {
  cost: Costs;
  time: number;
}

/** 把每個項目從 Lv1 升到滿級的費用與時間加總，各資源分開計算 */
export function totals(items: Item[], discount = 0): Totals {
  const result: Totals = { cost: emptyCosts(), time: 0 };
  for (const item of items) {
    for (const lv of item.levels) {
      for (const [res, amount] of Object.entries(lv.costs) as [Resource, number][]) {
        result.cost[res] += applyDiscount(amount, discount);
      }
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
export function requirementText(source: Source, level: Level): string {
  if (level.required === null) return '—';
  if (source === 'buildings' || source === 'heroes') return `TH${level.required}`;
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
