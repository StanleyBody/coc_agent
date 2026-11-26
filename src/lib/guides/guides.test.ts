import test from 'node:test';
import assert from 'node:assert/strict';
import { ALL, DATA, matchGuide, parseViews, popularGuides } from './guides.ts';

test('parseViews', () => {
  assert.equal(parseViews('12.5K'), 12500);
  assert.equal(parseViews('1.2M'), 1200000);
  assert.equal(parseViews('980'), 980);
  assert.equal(parseViews(''), 0);
});

test('popularGuides 依觀看次數排序', () => {
  const top = popularGuides(3);
  assert.equal(top.length, 3);
  assert.ok(parseViews(top[0].views) >= parseViews(top[1].views));
  assert.ok(parseViews(top[1].views) >= parseViews(top[2].views));
});

test('matchGuide：分類與搜尋同時套用', () => {
  const g = { category: '進攻', title: '飛龍閃電流', title_en: 'Dragon Lightning' };
  assert.ok(matchGuide(g, ALL, ''));
  assert.ok(matchGuide(g, '進攻', 'dragon'));
  assert.ok(matchGuide(g, '進攻', '飛龍'));
  assert.ok(!matchGuide(g, '防守', 'dragon'));
  assert.ok(!matchGuide(g, '進攻', 'hog'));
});

test('資料檔的分類都在分類清單內', () => {
  for (const guide of DATA.guides) {
    assert.ok(DATA.categories.includes(guide.category), guide.title);
    assert.ok(DATA.difficulties.includes(guide.difficulty), guide.title);
  }
});
