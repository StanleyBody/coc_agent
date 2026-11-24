// 執行：node --test sixth_builder/js_tests/calc.test.js
// 預期值由 sixth_builder_data.js 推算，Wiki 數值更新時不需要改測試。
const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../static/js/sixth_builder_calc.js');

const D = Calc.DATA;
const REQ = D.bob_control;
const BH = Calc.REQUIRED_BUILDER_HALL;
const target = (key) => Calc.BUILDINGS.find((b) => b.key === key).target;
const costs = (key) => D.buildings[key];
const sumRange = (list, from, to) => list.slice(from, to).reduce((a, b) => a + b, 0);
const hallCap = Calc.builderHallCapacity(BH);
const storageCap = (lv) => (lv > 0 ? Calc.STORAGE_CAPACITY[lv - 1] : 0);

function makeData(overrides = {}) {
    return {
        builder_hall: BH,
        double_cannon: target('double_cannon'),
        archer_tower: target('archer_tower'),
        multi_mortar: target('multi_mortar'),
        star_laboratory: target('star_laboratory'),
        builder_barracks: target('builder_barracks'),
        gold_storage_1: Calc.STORAGE_MAX_LEVEL,
        gold_storage_2: Calc.STORAGE_MAX_LEVEL,
        elixir_storage_1: Calc.STORAGE_MAX_LEVEL,
        elixir_storage_2: Calc.STORAGE_MAX_LEVEL,
        bob_control_built: true,
        gold_rate: 1000,
        elixir_rate: 1000,
        ...overrides,
    };
}

const item = (r, key) => r.items.find((i) => i.key === key);

test('資料檔結構', () => {
    for (const b of Calc.BUILDINGS) {
        assert.ok(b.costs.length >= b.target, `${b.key} 等級數不足`);
        assert.ok(b.costs.every((c) => c > 0), `${b.key} 有非正數費用`);
    }
    assert.equal(Calc.STORAGE_CAPACITY.length, Calc.STORAGE_COSTS.length);
    assert.ok(hallCap > 0);
    assert.ok(Calc.BOB_CONTROL_COST > 0);
});

test('目標等級來自 B.O.B Control 條件', () => {
    assert.equal(target('double_cannon'), REQ.double_cannon);
    assert.equal(target('archer_tower'), REQ.archer_tower);
    assert.equal(target('multi_mortar'), Math.max(REQ.multi_mortar, REQ.defense_level));
    assert.equal(target('star_laboratory'), REQ.star_laboratory);
    assert.equal(target('builder_barracks'), D.night_witch_barracks);
});

test('upgradeCost 加總 current 到 target 之間的費用', () => {
    assert.equal(Calc.upgradeCost([10, 20, 30, 40], 1, 3), 50);
    assert.equal(Calc.upgradeCost([10, 20, 30], 3, 2), 0);
});

test('formatHours', () => {
    assert.equal(Calc.formatHours(25.5), '1 天 1 小時 30 分');
    assert.equal(Calc.formatHours(0.001), '1 分');
    assert.equal(Calc.formatHours(48), '2 天');
    assert.equal(Calc.formatHours(14), '14 小時');
});

test('formatNumber 加千分位', () => {
    assert.equal(Calc.formatNumber(4500000), '4,500,000');
    assert.equal(Calc.formatNumber(0), '0');
});

test('planStorages 優先升級等級低的一座', () => {
    // 從 [1, 1] 開始，需求比 [2, 1] 的總容量多 1 → 需要升到 [2, 2]
    const need = hallCap + storageCap(2) + storageCap(1) + 1;
    const r = Calc.planStorages([1, 1], need, Calc.STORAGE_MAX_LEVEL, hallCap);
    assert.deepEqual(r, { levels: [2, 2], ok: true });
    assert.deepEqual(Calc.planStorages([3, 3], 0, 9, hallCap), { levels: [3, 3], ok: true });
    assert.deepEqual(Calc.planStorages([0, 0], Infinity, 2, hallCap), { levels: [2, 2], ok: false });
});

test('全部達標', () => {
    const r = Calc.calculate(makeData());
    assert.equal(r.gold.shortage, 0);
    assert.equal(r.elixir.shortage, 0);
    assert.equal(r.overallText, '不需要');
});

test('多管迫擊砲差兩級', () => {
    const t = target('multi_mortar');
    const expected = sumRange(costs('multi_mortar'), t - 2, t);
    const r = Calc.calculate(makeData({ multi_mortar: t - 2, gold_rate: expected / 16 }));
    assert.equal(r.gold.shortage, expected);
    assert.equal(r.gold.hours, 16);
});

test('未建造 B.O.B Control 時加上建造費', () => {
    const r = Calc.calculate(makeData({ bob_control_built: false }));
    assert.equal(r.gold.shortage, Calc.BOB_CONTROL_COST);
    assert.equal(r.items[0].key, 'bob_control');
});

test('訓練營升到 Night Witch 解鎖等級', () => {
    const t = target('builder_barracks');
    const r = Calc.calculate(makeData({ builder_barracks: t - 2 }));
    assert.equal(item(r, 'builder_barracks').target, t);
    assert.equal(r.elixir.shortage, sumRange(costs('builder_barracks'), t - 2, t));
});

test('倉庫容量不足時升級，金庫付聖水、聖水瓶付金幣', () => {
    const t = target('multi_mortar');
    const r = Calc.calculate(makeData({
        multi_mortar: t - 1, gold_storage_1: 1, gold_storage_2: 1,
        star_laboratory: target('star_laboratory') - 1, elixir_storage_1: 1, elixir_storage_2: 1,
    }));
    const g1 = item(r, 'gold_storage_1');
    const g2 = item(r, 'gold_storage_2');
    const e1 = item(r, 'elixir_storage_1');
    const e2 = item(r, 'elixir_storage_2');
    // 升級後要能容納單次最高費用，且兩座等級相差不超過 1
    assert.ok(hallCap + storageCap(g1.target) + storageCap(g2.target) >= r.gold.maxSingle);
    assert.ok(hallCap + storageCap(e1.target) + storageCap(e2.target) >= r.elixir.maxSingle);
    assert.ok(Math.abs(g1.target - g2.target) <= 1);
    assert.equal(g1.resource, 'elixir');
    assert.equal(e1.resource, 'gold');
    // 總額 = 建築費用 + 倉庫升級費用
    const goldBuildings = costs('multi_mortar')[t - 1];
    const elixirBuildings = costs('star_laboratory')[target('star_laboratory') - 1];
    assert.equal(r.gold.shortage, goldBuildings + e1.cost + e2.cost);
    assert.equal(r.elixir.shortage, elixirBuildings + g1.cost + g2.cost);
});

test('Builder Hall 越高，倉庫可升的等級越高', () => {
    assert.equal(Calc.calculate(makeData()).maxStorageLevel, Math.min(BH, Calc.STORAGE_MAX_LEVEL));
    const top = Calc.BUILDER_HALL_MAX_LEVEL;
    assert.equal(Calc.calculate(makeData({ builder_hall: top })).maxStorageLevel,
        Math.min(top, Calc.STORAGE_MAX_LEVEL));
});

test('Builder Hall 低於條件：當作剛升上、還沒蓋 B.O.B Control', () => {
    const r = Calc.calculate(makeData({ builder_hall: BH - 2, bob_control_built: true }));
    assert.equal(r.assumedBuilderHall, true);
    assert.equal(r.builderHallCapacity, hallCap);
    assert.equal(r.items[0].key, 'bob_control');
    assert.equal(r.gold.shortage, Calc.BOB_CONTROL_COST);
});

test('Builder Hall 達到條件時依勾選欄位', () => {
    const r = Calc.calculate(makeData({ bob_control_built: true }));
    assert.equal(r.assumedBuilderHall, false);
    assert.equal(r.gold.shortage, 0);
});

test('產量為 0 時無法估算', () => {
    const r = Calc.calculate(makeData({ archer_tower: target('archer_tower') - 1, gold_rate: 0 }));
    assert.equal(r.gold.hours, null);
    assert.match(r.overallText, /無法估算/);
});

test('整體時間取較慢的資源', () => {
    const gold = costs('archer_tower')[target('archer_tower') - 1];
    const elixir = costs('star_laboratory')[target('star_laboratory') - 1];
    // 金幣 12 小時、聖水 40 小時
    const r = Calc.calculate(makeData({
        archer_tower: target('archer_tower') - 1,
        star_laboratory: target('star_laboratory') - 1,
        gold_rate: gold / 12,
        elixir_rate: elixir / 40,
    }));
    assert.equal(r.overallText, '1 天 16 小時');
});
