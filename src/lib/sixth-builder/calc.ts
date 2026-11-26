/*
 * 第六工人（巴布）資源計算；遊戲名稱使用 src/lib/i18n.ts 的遊戲內翻譯
 *
 * 資料來源：src/data/sixth-builder.json（每週由 Clash of Clans Fandom Wiki 自動更新）。
 * 巴布控制台（B.O.B Control）升級條件中，與建築大師建築有關的部分（以 2026-11 的 Wiki 為例）：
 *   - 改裝（Gear Up）需要：雙管加農炮 Lv4、箭塔 Lv6、多管迫擊炮 Lv8
 *   - 任一兵種升到 Lv18：需要星空實驗室 Lv9；以暗夜女巫為例需要建築大師訓練營 Lv8
 *   - 任一防禦建築升到 Lv9：以多管迫擊炮為例（同時滿足 Lv8 的條件）
 * 儲金罐／聖水瓶：建築大師大本營加上兩座倉庫的容量，要能容納單次最高的升級費用。
 * 建築大師大本營低於 9：當作剛升上 Lv9，還沒蓋 Lv9 的新建築（巴布控制台）。
 * 假設玩家目前沒有任何資源。
 * 兵種：以暗夜女巫研究到 Lv18 計算（未解鎖時以解鎖等級起算）。
 * 英雄：戰爭機器＋戰鬥直升機合計等級，在建築大師大本營允許的等級內取最省聖水的組合。
 * 建築大師大本營升級費用不計入。
 */
import rawData from '../../data/sixth-builder.json' with { type: 'json' };
import { zh } from '../i18n.ts';

export type Resource = 'gold' | 'elixir';

interface LevelTable {
  first_level: number;
  costs: number[];
  required: number[];
}

export interface SixthBuilderData {
  buildings: Record<BuildingKey, number[]>;
  storages: Record<'gold_storage' | 'elixir_storage', { capacity: number[]; costs: number[] }>;
  builder_hall_capacity: Record<string, number>;
  bob_control: {
    build_cost: number;
    builder_hall: number;
    double_cannon: number;
    archer_tower: number;
    multi_mortar: number;
    troop_level: number;
    star_laboratory: number;
    defense_level: number;
    hero_total: number;
  };
  night_witch_barracks: number;
  /** first_level 為解鎖時的等級；costs[i] 為升到 first_level+i+1 的費用 */
  night_witch: LevelTable;
  /** first_level 為建造時的等級；costs[i] 為到達 first_level+i 的費用（costs[0] 為建造費） */
  heroes: Record<HeroKey, LevelTable>;
}

export type BuildingKey = 'double_cannon' | 'archer_tower' | 'multi_mortar' | 'star_laboratory' | 'builder_barracks';
export type HeroKey = 'battle_machine' | 'battle_copter';

export const DATA = rawData as unknown as SixthBuilderData;
const REQ = DATA.bob_control;

export const RESOURCE_NAMES: Record<Resource, string> = { gold: zh('Builder Gold'), elixir: zh('Builder Elixir') };

export interface Building {
  key: BuildingKey;
  name: string;
  resource: Resource;
  min: number;
  max: number;
  target: number;
  reason: string;
  /** costs[i] = 由 Lv i 升到 Lv i+1 的費用（costs[0] 為建造 Lv1 的費用） */
  costs: number[];
}

function building(key: BuildingKey, name: string, resource: Resource, min: number, target: number, reason: string): Building {
  const costs = DATA.buildings[key];
  return { key, name, resource, min, max: costs.length, target, reason, costs };
}

export const BUILDINGS: Building[] = [
  building('double_cannon', zh('Double Cannon'), 'gold', 0, REQ.double_cannon, `${zh('Gear Up')}${zh('Cannon')}`),
  building('archer_tower', zh('Archer Tower'), 'gold', 0, REQ.archer_tower, `${zh('Gear Up')}${zh('Archer Tower')}`),
  building(
    'multi_mortar', zh('Multi Mortar'), 'gold', 0,
    Math.max(REQ.multi_mortar, REQ.defense_level),
    `${zh('Gear Up')}${zh('Mortar')}（Lv${REQ.multi_mortar}）＋ 任一防禦建築 Lv${REQ.defense_level}`,
  ),
  building('star_laboratory', zh('Star Laboratory'), 'elixir', 1, REQ.star_laboratory, `任一兵種研究到 Lv${REQ.troop_level}`),
  building(
    'builder_barracks', zh('Builder Barracks'), 'elixir', 1, DATA.night_witch_barracks,
    `解鎖${zh('Night Witch')}（用來研究到 Lv${REQ.troop_level}）`,
  ),
];

// 儲金罐與聖水瓶的每級容量與升級費用（兩者數值相同，付款資源相反）
export const STORAGE_CAPACITY = DATA.storages.gold_storage.capacity;
export const STORAGE_COSTS = DATA.storages.gold_storage.costs;
export const STORAGE_MAX_LEVEL = STORAGE_CAPACITY.length;

interface StorageInfo {
  key: 'gold_storage' | 'elixir_storage';
  name: string;
  /** 升級要付的資源 */
  resource: Resource;
}

const STORAGES: Record<Resource, StorageInfo> = {
  gold: { key: 'gold_storage', name: zh('Gold Storage'), resource: 'elixir' },
  elixir: { key: 'elixir_storage', name: zh('Elixir Storage'), resource: 'gold' },
};

export const REQUIRED_BUILDER_HALL = REQ.builder_hall;
export const BUILDER_HALL_MAX_LEVEL = Math.max(...Object.keys(DATA.builder_hall_capacity).map(Number));
export const BOB_CONTROL_COST = REQ.build_cost;
export const NIGHT_WITCH = DATA.night_witch;
export const NIGHT_WITCH_MAX_LEVEL = NIGHT_WITCH.first_level + NIGHT_WITCH.costs.length;

export interface Hero {
  key: HeroKey;
  name: string;
  firstLevel: number;
  maxLevel: number;
  costs: number[];
  required: number[];
}

function hero(key: HeroKey, name: string): Hero {
  const d = DATA.heroes[key];
  return {
    key, name, firstLevel: d.first_level, maxLevel: d.first_level + d.costs.length - 1,
    costs: d.costs, required: d.required,
  };
}

export const HEROES: [Hero, Hero] = [hero('battle_machine', zh('Battle Machine')), hero('battle_copter', zh('Battle Copter'))];

export interface Input {
  builder_hall: number;
  double_cannon: number;
  archer_tower: number;
  multi_mortar: number;
  star_laboratory: number;
  builder_barracks: number;
  /** 0 表示未解鎖 */
  night_witch: number;
  /** 0 表示未建造 */
  battle_machine: number;
  battle_copter: number;
  gold_storage_1: number;
  gold_storage_2: number;
  elixir_storage_1: number;
  elixir_storage_2: number;
  gold_rate: number;
  elixir_rate: number;
  bob_control_built: boolean;
}

export interface Item {
  key: string;
  name: string;
  resource: Resource;
  resourceName: string;
  current: number;
  target: number;
  reason: string;
  cost: number;
  maxSingle: number;
  done: boolean;
}

type DraftItem = Omit<Item, 'resourceName' | 'done'>;

export interface ResourceSummary {
  resource: Resource;
  name: string;
  storageName: string;
  shortage: number;
  rate: number;
  /** null：產量為 0 無法估算 */
  hours: number | null;
  timeText: string;
  maxSingle: number;
  capacityOk: boolean;
}

export interface Result {
  items: Item[];
  gold: ResourceSummary;
  elixir: ResourceSummary;
  overallText: string;
  maxStorageLevel: number;
  builderHallCapacity: number;
  builderHall: number;
  assumedBuilderHall: boolean;
  heroesOk: boolean;
}

const sum = (list: number[]) => list.reduce((a, b) => a + b, 0);
const maxOf = (list: number[]) => (list.length ? Math.max(...list) : 0);

export function builderHallCapacity(level: number): number {
  return DATA.builder_hall_capacity[String(level)] ?? 0;
}

/** 由 current 升到 target 的總費用；已達標回傳 0 */
export function upgradeCost(costs: number[], current: number, target: number): number {
  return current >= target ? 0 : sum(costs.slice(current, target));
}

function maxSingleCost(costs: number[], current: number, target: number): number {
  return current >= target ? 0 : maxOf(costs.slice(current, target));
}

function storageCapacity(level: number): number {
  return level > 0 ? STORAGE_CAPACITY[level - 1] : 0;
}

function totalCapacity(levels: number[], hallCapacity: number): number {
  return hallCapacity + sum(levels.map(storageCapacity));
}

/** 每次升級等級最低的一座，直到總容量 >= need */
export function planStorages(
  levels: number[], need: number, maxLevel: number, hallCapacity: number,
): { levels: number[]; ok: boolean } {
  const next = levels.slice();
  while (totalCapacity(next, hallCapacity) < need) {
    const i = next.indexOf(Math.min(...next));
    if (next[i] >= maxLevel) return { levels: next, ok: false };
    next[i] += 1;
  }
  return { levels: next, ok: true };
}

/** 小時數 → 「X 天 Y 小時 Z 分」 */
export function formatHours(hours: number): string {
  const totalMinutes = Math.ceil(Math.round(hours * 60 * 1e6) / 1e6);
  const days = Math.floor(totalMinutes / 1440);
  const hrs = Math.floor((totalMinutes % 1440) / 60);
  const mins = totalMinutes % 60;
  const parts: string[] = [];
  if (days) parts.push(`${days} 天`);
  if (hrs) parts.push(`${hrs} 小時`);
  if (mins || !parts.length) parts.push(`${mins} 分`);
  return parts.join(' ');
}

export function formatNumber(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function buildingItems(data: Input, bobControlBuilt: boolean): DraftItem[] {
  const items: DraftItem[] = [];
  if (!bobControlBuilt) {
    items.push({
      key: 'bob_control', name: `${zh('B.O.B Control')}（建造）`, resource: 'gold',
      current: 0, target: 1, reason: `需要${zh('Builder Hall')} Lv${REQUIRED_BUILDER_HALL}`,
      cost: BOB_CONTROL_COST, maxSingle: BOB_CONTROL_COST,
    });
  }
  for (const b of BUILDINGS) {
    const current = data[b.key];
    items.push({
      key: b.key, name: b.name, resource: b.resource,
      current, target: Math.max(current, b.target), reason: b.reason,
      cost: upgradeCost(b.costs, current, b.target),
      maxSingle: maxSingleCost(b.costs, current, b.target),
    });
  }
  return items;
}

function nightWitchItem(data: Input): DraftItem {
  const first = NIGHT_WITCH.first_level;
  const target = REQ.troop_level;
  const current = data.night_witch || 0;
  const start = Math.max(current, first); // 未解鎖：訓練營升級後為 first_level
  const list = start >= target ? [] : NIGHT_WITCH.costs.slice(start - first, target - first);
  return {
    key: 'night_witch', name: `${zh('Night Witch')}研究`, resource: 'elixir',
    current: start, target: Math.max(start, target),
    reason: `任一兵種研究到 Lv${target}${current === 0 ? `（解鎖時為 Lv${first}）` : ''}`,
    cost: sum(list), maxSingle: maxOf(list),
  };
}

/** 英雄由 from 升到 to 的每一級費用；from 為 0 表示尚未建造 */
export function heroCostList(h: Hero, from: number, to: number): number[] {
  if (to <= from) return [];
  const start = from === 0 ? 0 : from - h.firstLevel + 1;
  return h.costs.slice(start, to - h.firstLevel + 1);
}

/** 建築大師大本營等級允許的最高英雄等級；不能建造時回傳 0 */
export function heroMaxLevel(h: Hero, builderHall: number): number {
  let max = 0;
  h.required.forEach((req, i) => {
    if (req <= builderHall) max = h.firstLevel + i;
  });
  return max;
}

export interface HeroPlan {
  levels: [number, number];
  cost: number;
  ok: boolean;
}

/**
 * 找出戰爭機器＋戰鬥直升機合計達到 total 時，總費用最低的目標等級。
 * 戰鬥直升機一建造就是 first_level，所以逐一列舉它的目標等級，再算出戰爭機器至少要幾級。
 */
export function planHeroes(current: [number, number], total: number, builderHall: number): HeroPlan {
  const [machine, copter] = HEROES;
  const maxMachine = heroMaxLevel(machine, builderHall);
  const maxCopter = heroMaxLevel(copter, builderHall);

  const copterOptions = [current[1]];
  for (let lv = Math.max(current[1] + 1, copter.firstLevel); lv <= maxCopter; lv++) copterOptions.push(lv);

  let best: HeroPlan | null = null;
  for (const b of copterOptions) {
    let a = Math.max(current[0], total - b);
    if (a > 0 && a < machine.firstLevel) a = machine.firstLevel;
    if (a > Math.max(maxMachine, current[0])) continue;
    const cost = sum(heroCostList(machine, current[0], a)) + sum(heroCostList(copter, current[1], b));
    if (best === null || cost < best.cost) best = { levels: [a, b], cost, ok: true };
  }
  return best ?? { levels: [current[0], current[1]], cost: 0, ok: false };
}

function heroItems(data: Input, builderHall: number): { ok: boolean; items: DraftItem[] } {
  const total = REQ.hero_total;
  const current: [number, number] = [data.battle_machine || 0, data.battle_copter || 0];
  const plan = planHeroes(current, total, builderHall);
  const reason = plan.ok
    ? `英雄合計 Lv${total}（目標 ${plan.levels[0]} ＋ ${plan.levels[1]}，最省聖水）`
    : `${zh('Builder Hall')} Lv${builderHall} 的等級上限無法達到合計 Lv${total}`;
  return {
    ok: plan.ok,
    items: HEROES.map((h, i) => {
      const list = plan.ok ? heroCostList(h, current[i], plan.levels[i]) : [];
      return {
        key: h.key, name: h.name, resource: 'elixir' as const,
        current: current[i], target: plan.ok ? plan.levels[i] : current[i],
        reason, cost: sum(list), maxSingle: maxOf(list),
      };
    }),
  };
}

/*
 * 依單次最高費用決定兩種倉庫要升到幾級。
 * 儲金罐升級付聖水、聖水瓶升級付金幣，所以重複計算到結果不再變動。
 */
function storageItems(data: Input, items: DraftItem[], maxLevel: number, hallCapacity: number) {
  const resources: Resource[] = ['gold', 'elixir'];
  const baseMax = {} as Record<Resource, number>;
  const current = {} as Record<Resource, number[]>;
  for (const res of resources) {
    baseMax[res] = maxOf(items.filter((i) => i.resource === res).map((i) => i.maxSingle));
    const key = STORAGES[res].key;
    current[res] = [data[`${key}_1`], data[`${key}_2`]];
  }

  let need = { ...baseMax };
  let plans = {} as Record<Resource, { levels: number[]; ok: boolean }>;
  for (let round = 0; round < 5; round++) {
    plans = {
      gold: planStorages(current.gold, need.gold, maxLevel, hallCapacity),
      elixir: planStorages(current.elixir, need.elixir, maxLevel, hallCapacity),
    };
    const newNeed = { ...baseMax };
    for (const res of resources) {
      const pay = STORAGES[res].resource;
      current[res].forEach((cur, idx) => {
        newNeed[pay] = Math.max(newNeed[pay], maxSingleCost(STORAGE_COSTS, cur, plans[res].levels[idx]));
      });
    }
    if (newNeed.gold === need.gold && newNeed.elixir === need.elixir) break;
    need = newNeed;
  }

  const result: DraftItem[] = [];
  for (const res of resources) {
    const s = STORAGES[res];
    current[res].forEach((cur, idx) => {
      const tgt = plans[res].levels[idx];
      result.push({
        key: `${s.key}_${idx + 1}`, name: `${s.name} ${idx + 1}`, resource: s.resource,
        current: cur, target: tgt,
        reason: `容量需容納單次最高${RESOURCE_NAMES[res]}費用 ${formatNumber(need[res])}`,
        cost: upgradeCost(STORAGE_COSTS, cur, tgt),
        maxSingle: maxSingleCost(STORAGE_COSTS, cur, tgt),
      });
    });
  }
  return { items: result, need, capacityOk: { gold: plans.gold.ok, elixir: plans.elixir.ok } };
}

function resourceSummary(
  resource: Resource, items: Item[], rate: number, maxSingle: number, capacityOk: boolean,
): ResourceSummary {
  const total = sum(items.filter((i) => i.resource === resource).map((i) => i.cost));
  let hours: number | null;
  let timeText: string;
  if (total === 0) {
    hours = 0;
    timeText = '不需要';
  } else if (rate > 0) {
    hours = total / rate;
    timeText = formatHours(hours);
  } else {
    hours = null;
    timeText = '每小時產量為 0，無法估算';
  }
  return {
    resource, name: RESOURCE_NAMES[resource], storageName: STORAGES[resource].name,
    shortage: total, rate, hours, timeText, maxSingle, capacityOk,
  };
}

export function calculate(data: Input): Result {
  const bh = data.builder_hall;
  const assumedBuilderHall = bh < REQUIRED_BUILDER_HALL;
  const effectiveBh = assumedBuilderHall ? REQUIRED_BUILDER_HALL : bh;
  const bobControlBuilt = data.bob_control_built && !assumedBuilderHall;
  // 倉庫最高等級：Lv n 需要建築大師大本營 n
  const maxStorageLevel = Math.min(effectiveBh, STORAGE_MAX_LEVEL);
  const hallCapacity = builderHallCapacity(effectiveBh);

  const heroes = heroItems(data, effectiveBh);
  const drafts = [...buildingItems(data, bobControlBuilt), nightWitchItem(data), ...heroes.items];
  const storage = storageItems(data, drafts, maxStorageLevel, hallCapacity);
  const items: Item[] = [...drafts, ...storage.items].map((item) => ({
    ...item,
    resourceName: RESOURCE_NAMES[item.resource],
    done: item.cost === 0,
  }));

  const gold = resourceSummary('gold', items, data.gold_rate, storage.need.gold, storage.capacityOk.gold);
  const elixir = resourceSummary('elixir', items, data.elixir_rate, storage.need.elixir, storage.capacityOk.elixir);

  let overallText: string;
  if (gold.hours === null || elixir.hours === null) {
    overallText = '無法估算（有資源每小時產量為 0）';
  } else {
    const longest = Math.max(gold.hours, elixir.hours);
    overallText = longest === 0 ? '不需要' : formatHours(longest);
  }

  return {
    items, gold, elixir, overallText, maxStorageLevel,
    builderHallCapacity: hallCapacity, builderHall: bh, assumedBuilderHall, heroesOk: heroes.ok,
  };
}
