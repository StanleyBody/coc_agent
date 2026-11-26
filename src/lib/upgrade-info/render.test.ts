import test from 'node:test';
import assert from 'node:assert/strict';
import { DATA, totals } from './logic.ts';
import { summaryValues } from './render.ts';

test('裝備沒有升級時間，總升級時間顯示「即時」', () => {
  const t = totals(DATA.equipment);
  assert.equal(summaryValues(t, t).time, '即時');
});

test('有時間資料時顯示天與時', () => {
  const t = totals(DATA.pets);
  assert.match(summaryValues(t, t).time, /天/);
});
