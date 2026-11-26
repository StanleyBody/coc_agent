import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DATA, RESOURCE_NAMES, TABS, applyDiscount, discountSummary, filterItems, formatNumber, formatTime,
  hasGroupFilter, itemsInTab, normalizeDiscount, requirementText, tabByKey,
} from './logic.ts';
import type { UpgradeData } from './logic.ts';

const tab = (key: string) => tabByKey(key);

test('資料檔包含各類項目', () => {
  assert.ok(DATA.buildings.length >= 40);
  assert.ok(DATA.heroes.length >= 5);
  assert.ok(DATA.units.length >= 40);
  assert.ok(DATA.pets.length >= 8);
  assert.ok(DATA.equipment.length >= 30);
});

test('資源與分頁名稱使用遊戲內翻譯', () => {
  assert.equal(RESOURCE_NAMES.dark_elixir, '闇黑重油');
  assert.equal(RESOURCE_NAMES.shiny_ore, '閃光礦石');
  assert.equal(tab('sieges').name, '攻城機器');
});

test('分頁順序與名稱', () => {
  assert.deepEqual(TABS.map((t) => t.name), ['建築', '兵種', '英雄', '法術', '攻城機器', '戰寵', '裝備']);
  assert.deepEqual(tab('buildings').groups.map((g) => g.name), ['軍隊相關', '防禦相關', '資源相關', '陷阱']);
  assert.deepEqual(tab('troops').groups.map((g) => g.name), ['聖水兵種', '闇黑重油兵種']);
  assert.deepEqual(tab('spells').groups.map((g) => g.name), ['聖水法術', '闇黑重油法術']);
  assert.equal(tab('equipment').groups.length, DATA.heroes.length);
});

test('每個項目都屬於且只屬於一個分頁', () => {
  const all = [...DATA.buildings, ...DATA.heroes, ...DATA.units, ...DATA.pets, ...DATA.equipment];
  const seen = TABS.flatMap((t) => itemsInTab(t));
  assert.equal(seen.length, all.length);
  assert.equal(new Set(seen).size, all.length);
});

test('子分類選單只在超過一個子分類時顯示', () => {
  assert.equal(hasGroupFilter(tab('buildings')), true);
  assert.equal(hasGroupFilter(tab('sieges')), false);
  assert.equal(hasGroupFilter(tab('heroes')), false);
});

test('tabByKey 找不到時回到第一個分頁', () => {
  assert.equal(tabByKey('nope'), TABS[0]);
  assert.equal(tabByKey(null), TABS[0]);
});

test('filterItems：子分類與搜尋（中英文）', () => {
  const traps = filterItems({ tab: tab('buildings'), group: 'trap', search: '' });
  assert.ok(traps.length > 0 && traps.every((i) => i.category === 'trap'));
  assert.ok(filterItems({ tab: tab('buildings'), group: null, search: '加農炮' }).some((i) => i.name === 'Cannon'));
  assert.ok(filterItems({ tab: tab('buildings'), group: null, search: 'cannon' }).some((i) => i.name === 'Cannon'));
  const dark = filterItems({ tab: tab('troops'), group: 'dark_troop', search: '' });
  assert.ok(dark.length > 0 && dark.every((i) => i.type === 'dark_troop'));
  const king = DATA.heroes.find((h) => h.name === 'Barbarian King')!;
  const kingGear = filterItems({ tab: tab('equipment'), group: king.key, search: '' });
  assert.ok(kingGear.length > 0 && kingGear.every((i) => i.hero === king.key));
});

test('裝備的費用有多種礦石', () => {
  const epic = DATA.equipment.find((e) => e.resources.includes('starry_ore'));
  assert.ok(epic);
  assert.ok(epic.levels.some((lv) => Object.keys(lv.costs).length > 1));
});

test('filterItems 可以傳入測試資料', () => {
  const data: UpgradeData = { buildings: [], heroes: [], units: [], pets: [], equipment: [] };
  assert.deepEqual(filterItems({ tab: tab('pets'), group: null, search: '' }, data), []);
});

test('applyDiscount 無條件捨去', () => {
  assert.equal(applyDiscount(999, 15), 849);
  assert.equal(applyDiscount(1000, 0), 1000);
});

test('格式化', () => {
  assert.equal(formatNumber(1_234_567), '1,234,567');
  assert.equal(formatTime(0), '即時');
  assert.equal(formatTime(null), '—');
  assert.equal(formatTime(129_600), '1天12小時');
  assert.equal(formatTime(12_000), '3小時20分鐘');
  assert.equal(formatTime(300), '5分鐘');
});

test('requirementText', () => {
  const lv = { level: 2, costs: {}, time: 1, required: 3 };
  assert.equal(requirementText('buildings', lv), '大本營 3');
  assert.equal(requirementText('heroes', lv), '大本營 3');
  assert.equal(requirementText('units', lv), '實驗室 3');
  assert.equal(requirementText('pets', lv), '戰寵小屋 3');
  assert.equal(requirementText('equipment', lv), '鐵匠鋪 3');
  assert.equal(requirementText('units', { ...lv, required: null }), '—');
});

test('減免設定', () => {
  assert.deepEqual(normalizeDiscount({ goldPass: 15, worker: 7 }), { goldPass: 15, worker: 0 });
  assert.deepEqual(normalizeDiscount('bad'), { goldPass: 0, worker: 0 });
  assert.equal(discountSummary({ goldPass: 0, worker: 0 }), '未設定減免');
  assert.equal(discountSummary({ goldPass: 15, worker: 5 }), '月卡: 黃金(-15%) | 工人: Lv.1(-5%) | 總減免: -20%');
});
