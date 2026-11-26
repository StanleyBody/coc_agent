import test from 'node:test';
import assert from 'node:assert/strict';
import { hasZh, zh } from './i18n.ts';

test('遊戲內名稱使用官方繁體中文', () => {
  assert.equal(zh('Cannon'), '加農炮');
  assert.equal(zh('Dark Elixir'), '闇黑重油');
  assert.equal(zh('B.O.B Control'), '巴布控制台');
  assert.equal(zh('Gear Up'), '改裝');
});

test('沒有翻譯時回傳英文原名', () => {
  assert.equal(zh('Not A Real Unit'), 'Not A Real Unit');
  assert.equal(hasZh('Not A Real Unit'), false);
});
