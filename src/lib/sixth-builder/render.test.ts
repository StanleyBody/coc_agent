import test from 'node:test';
import assert from 'node:assert/strict';
import { calculate } from './calc.ts';
import type { Input } from './calc.ts';
import { placeholderHtml, resultHtml } from './render.ts';

const input: Input = {
  builder_hall: 8, double_cannon: 3, archer_tower: 5, multi_mortar: 7, star_laboratory: 8,
  builder_barracks: 5, night_witch: 0, battle_machine: 20, battle_copter: 0,
  gold_storage_1: 6, gold_storage_2: 6, elixir_storage_1: 6, elixir_storage_2: 5,
  gold_rate: 60000, elixir_rate: 55000, bob_control_built: false,
};

test('結果畫面列出需要升級的項目與總額', () => {
  const result = calculate(input);
  const html = resultHtml(result);
  assert.ok(html.includes(result.gold.shortage.toLocaleString('en-US')));
  assert.ok(html.includes('B.O.B Control（建造）'));
  assert.ok(html.includes('以剛升上 Lv9'));
  assert.ok(html.includes(`<strong>${result.overallText}</strong>`));
});

test('全部達標時不顯示表格', () => {
  const result = calculate({
    ...input, builder_hall: 9, double_cannon: 4, archer_tower: 6, multi_mortar: 9, star_laboratory: 9,
    builder_barracks: 8, night_witch: 18, battle_machine: 25, battle_copter: 20,
    gold_storage_1: 9, gold_storage_2: 9, elixir_storage_1: 9, elixir_storage_2: 9, bob_control_built: true,
  });
  const html = resultHtml(result);
  assert.ok(html.includes('所有條件都已達標'));
  assert.ok(!html.includes('<table'));
});

test('空白卡片', () => {
  assert.ok(placeholderHtml().includes('填完左側所有欄位後會自動計算'));
});
