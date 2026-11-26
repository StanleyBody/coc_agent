import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DATA, applyDiscount, availableLevels, discountSummary, filterItems, formatLarge, formatTime, formatTimeLong,
  maxLabLevel, normalizeDiscount, requirementText, totals,
} from './logic.ts';
import type { Building, Unit, UpgradeData } from './logic.ts';

const building = (name: string) => DATA.buildings.find((b) => b.name === name)!;
const unit = (name: string) => DATA.units.find((u) => u.name === name)!;

test('資料檔包含三類項目與實驗室對照', () => {
  assert.ok(DATA.buildings.length >= 40);
  assert.ok(DATA.heroes.length >= 5);
  assert.ok(DATA.units.length >= 40);
  assert.ok(DATA.town_hall_max >= 16);
  assert.ok(Object.keys(DATA.laboratory).length > 0);
});

test('maxLabLevel 依實驗室需要的大本營等級', () => {
  for (const [lab, th] of Object.entries(DATA.laboratory)) {
    assert.ok(maxLabLevel(th) >= Number(lab));
  }
  assert.equal(maxLabLevel(1), 0);
});

test('建築可達等級不超過大本營需求', () => {
  const cannon = building('Cannon');
  const levels = availableLevels(cannon, 10);
  assert.ok(levels.length > 0);
  assert.ok(levels.every((lv) => lv.required === null || lv.required <= 10));
  assert.equal(availableLevels(cannon, null).length, cannon.levels.length);
});

test('Town Hall 的等級等於大本營等級', () => {
  assert.equal(availableLevels(building('Town Hall'), 12).at(-1)!.level, 12);
});

test('兵種未解鎖時不列出，解鎖後依實驗室等級限制', () => {
  const late = DATA.units.reduce((a, b) => (b.unlock_th > a.unlock_th ? b : a));
  assert.deepEqual(availableLevels(late, late.unlock_th - 1), []);
  const barbarian = unit('Barbarian');
  const th = 10;
  const lab = maxLabLevel(th);
  const levels = availableLevels(barbarian, th);
  assert.ok(levels.every((lv) => lv.required === null || lv.required <= lab));
  assert.ok(levels.length < barbarian.levels.length);
});

test('filterItems：類別、搜尋（中英文）、大本營', () => {
  const traps = filterItems({ tab: 'buildings', th: null, group: 'trap', search: '' });
  assert.ok(traps.length > 0 && traps.every(({ item }) => (item as Building).category === 'trap'));
  assert.deepEqual(filterItems({ tab: 'buildings', th: null, group: null, search: '加農' }).map(({ item }) => item.name), ['Cannon']);
  assert.deepEqual(filterItems({ tab: 'units', th: null, group: null, search: 'golem' }).map(({ item }) => item.name).sort(),
    DATA.units.filter((u) => u.name.toLowerCase().includes('golem')).map((u) => u.name).sort());
  const th3 = filterItems({ tab: 'units', th: 3, group: null, search: '' });
  assert.ok(th3.every(({ item }) => (item as Unit).unlock_th <= 3));
});

test('totals：各資源分開加總並套用減免', () => {
  const data: UpgradeData = {
    buildings: [
      { key: 'a', name: 'A', name_zh: null, wiki: 'A', category: 'defense', resource: 'gold', alt_resource: null,
        levels: [{ level: 1, cost: 1000, time: 60, required: 1 }, { level: 2, cost: 3000, time: null, required: 2 }] },
      { key: 'b', name: 'B', name_zh: null, wiki: 'B', category: 'army', resource: 'elixir', alt_resource: null,
        levels: [{ level: 1, cost: null, time: 100, required: 1 }] },
    ],
    heroes: [], units: [], laboratory: {}, town_hall_max: 2,
  };
  const rows = filterItems({ tab: 'buildings', th: null, group: null, search: '' }, data);
  assert.deepEqual(totals(rows), { cost: { gold: 4000, elixir: 0, dark_elixir: 0 }, time: 160 });
  assert.deepEqual(totals(rows, 10), { cost: { gold: 3600, elixir: 0, dark_elixir: 0 }, time: 144 });
});

test('applyDiscount 無條件捨去', () => {
  assert.equal(applyDiscount(999, 15), 849);
  assert.equal(applyDiscount(1000, 0), 1000);
});

test('格式化', () => {
  assert.equal(formatLarge(1_234_567), '1.2M');
  assert.equal(formatLarge(12_345), '12K');
  assert.equal(formatLarge(999), '999');
  assert.equal(formatTime(0), '即時');
  assert.equal(formatTime(null), '—');
  assert.equal(formatTime(129_600), '1天12時');
  assert.equal(formatTime(12_000), '3時20分');
  assert.equal(formatTimeLong(1_054_800), '12 天 5 時');
});

test('requirementText：建築顯示大本營、兵種顯示實驗室', () => {
  assert.equal(requirementText(building('Cannon'), { level: 2, cost: 1, time: 1, required: 1 }), 'TH1');
  assert.equal(requirementText(unit('Barbarian'), { level: 2, cost: 1, time: 1, required: 1 }), '實驗室 1');
  assert.equal(requirementText(unit('Barbarian'), { level: 1, cost: null, time: null, required: null }), '—');
});

test('減免設定', () => {
  assert.deepEqual(normalizeDiscount({ goldPass: 15, worker: 7 }), { goldPass: 15, worker: 0 });
  assert.deepEqual(normalizeDiscount('bad'), { goldPass: 0, worker: 0 });
  assert.equal(discountSummary({ goldPass: 0, worker: 0 }), '未設定減免');
  assert.equal(discountSummary({ goldPass: 15, worker: 5 }), '月卡: 黃金(-15%) | 工人: Lv.1(-5%) | 總減免: -20%');
});
