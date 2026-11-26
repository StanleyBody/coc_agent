import test from 'node:test';
import assert from 'node:assert/strict';
import { DATA, tabByKey } from './logic.ts';
import type { Item } from './logic.ts';
import { cardHtml, levelTableHtml } from './render.ts';

const item: Item = {
  key: 'a', name: 'A', wiki: 'A', category: 'defense', resources: ['gold', 'dark_elixir'], alt_resource: null,
  levels: [{ level: 14, costs: { gold: 9_000_000, dark_elixir: 120_000 }, time: 129_600, required: 17 }],
};

test('卡片使用資源全名與完整數字', () => {
  const html = cardHtml(tabByKey('buildings'), item, 0);
  assert.ok(html.includes('9,000,000 金幣'));
  assert.ok(html.includes('120,000 闇黑重油'));
  assert.ok(html.includes('14級'));
  assert.ok(html.includes('1天12小時'));
  assert.ok(!html.includes('Lv.'));
});

test('卡片減免後同時顯示原價與減免後價格', () => {
  const html = cardHtml(tabByKey('buildings'), item, 10);
  assert.ok(html.includes('9,000,000</span> <span class="cost-discounted">8,100,000'));
});

test('裝備卡片不顯示升級時間', () => {
  const html = cardHtml(tabByKey('equipment'), DATA.equipment[0], 0);
  assert.ok(!html.includes('升級時間'));
});

test('等級表的需求欄位使用全名', () => {
  const { head, body } = levelTableHtml('buildings', item, 0);
  assert.ok(head.includes('大本營需求'));
  assert.ok(body.includes('大本營 17'));
});
