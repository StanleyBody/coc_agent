// 執行：node --test sixth_builder/js_tests/calc.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const Calc = require('../static/js/sixth_builder_calc.js');

function makeData(overrides = {}) {
    return {
        builder_hall: 9,
        double_cannon: 4,
        archer_tower: 6,
        multi_mortar: 9,
        star_laboratory: 9,
        builder_barracks: 8,
        gold_storage_1: 9,
        gold_storage_2: 9,
        elixir_storage_1: 9,
        elixir_storage_2: 9,
        bob_control_built: true,
        gold_rate: 1000,
        elixir_rate: 1000,
        ...overrides,
    };
}

const item = (r, key) => r.items.find((i) => i.key === key);

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
    // 1,500,000 + 1,600,000 + 1,600,000 = 4,700,000 >= 4,500,000
    assert.deepEqual(Calc.planStorages([6, 6], 4500000, 9), { levels: [8, 8], ok: true });
    assert.deepEqual(Calc.planStorages([9, 9], 4500000, 9), { levels: [9, 9], ok: true });
    assert.deepEqual(Calc.planStorages([0, 0], 10000000, 9), { levels: [9, 9], ok: false });
});

test('全部達標', () => {
    const r = Calc.calculate(makeData());
    assert.equal(r.gold.shortage, 0);
    assert.equal(r.elixir.shortage, 0);
    assert.equal(r.overallText, '不需要');
});

test('多管迫擊砲 Lv7 → Lv9', () => {
    const r = Calc.calculate(makeData({ multi_mortar: 7, gold_rate: 500000 }));
    // Lv8 3,500,000 + Lv9 4,500,000
    assert.equal(r.gold.shortage, 8000000);
    assert.equal(r.gold.hours, 16);
});

test('未建造 B.O.B Control 時加上建造費', () => {
    const r = Calc.calculate(makeData({ bob_control_built: false }));
    assert.equal(r.gold.shortage, Calc.BOB_CONTROL_COST);
    assert.equal(r.items[0].key, 'bob_control');
});

test('訓練營目標為 Lv8（Night Witch）', () => {
    const r = Calc.calculate(makeData({ builder_barracks: 6 }));
    assert.equal(item(r, 'builder_barracks').target, 8);
    // Lv7 300,000 + Lv8 500,000
    assert.equal(r.elixir.shortage, 800000);
});

test('金庫升級付聖水', () => {
    const r = Calc.calculate(makeData({ multi_mortar: 8, gold_storage_1: 6, gold_storage_2: 6 }));
    assert.equal(item(r, 'gold_storage_1').target, 8);
    assert.equal(item(r, 'gold_storage_2').target, 8);
    // 每座 6→8：1,500,000 + 2,000,000
    assert.equal(r.elixir.shortage, 7000000);
    assert.equal(r.gold.shortage, 4500000);
});

test('聖水瓶升級付金幣', () => {
    const r = Calc.calculate(makeData({ star_laboratory: 8, elixir_storage_1: 5, elixir_storage_2: 5 }));
    // 需容納 4,000,000：升到 8 / 7
    assert.equal(item(r, 'elixir_storage_1').target, 8);
    assert.equal(item(r, 'elixir_storage_2').target, 7);
    // 5→8：4,500,000；5→7：2,500,000
    assert.equal(r.gold.shortage, 7000000);
    assert.equal(r.elixir.shortage, 4000000);
});

test('Builder Hall 10 才能把倉庫升到 Lv10', () => {
    assert.equal(Calc.calculate(makeData()).maxStorageLevel, 9);
    assert.equal(Calc.calculate(makeData({ builder_hall: 10 })).maxStorageLevel, 10);
});

test('Builder Hall 低於 9：當作剛升上 Lv9、還沒蓋 B.O.B Control', () => {
    const r = Calc.calculate(makeData({ builder_hall: 7, bob_control_built: true }));
    assert.equal(r.assumedBuilderHall, true);
    assert.equal(r.maxStorageLevel, 9);
    assert.equal(r.items[0].key, 'bob_control');
    assert.equal(r.gold.shortage, Calc.BOB_CONTROL_COST);
});

test('Builder Hall 9 依勾選欄位', () => {
    const r = Calc.calculate(makeData({ builder_hall: 9, bob_control_built: true }));
    assert.equal(r.assumedBuilderHall, false);
    assert.equal(r.gold.shortage, 0);
});

test('產量為 0 時無法估算', () => {
    const r = Calc.calculate(makeData({ archer_tower: 5, gold_rate: 0 }));
    assert.equal(r.gold.hours, null);
    assert.match(r.overallText, /無法估算/);
});

test('整體時間取較慢的資源', () => {
    const r = Calc.calculate(makeData({
        archer_tower: 5, star_laboratory: 8, gold_rate: 100000, elixir_rate: 100000,
    }));
    // 金幣 1,200,000 → 12 小時；聖水 4,000,000 → 40 小時
    assert.equal(r.overallText, '1 天 16 小時');
});
