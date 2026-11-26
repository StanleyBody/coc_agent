import test from 'node:test';
import assert from 'node:assert/strict';
import { DATA, activeSpecials, formatCountdown, nextOccurrence, splitDuration } from './schedule.ts';
import type { SpecialEvent } from './schedule.ts';

// 台灣時間 → Date
const tw = (iso: string) => new Date(`${iso}+08:00`);

test('每月固定日：當月尚未開始取當月，已開始取下個月', () => {
  const rule = { type: 'monthly', day: 22, hour: 16 } as const;
  assert.deepEqual(nextOccurrence(rule, tw('2026-11-10T09:00:00')), tw('2026-11-22T16:00:00'));
  assert.deepEqual(nextOccurrence(rule, tw('2026-11-22T16:00:00')), tw('2026-12-22T16:00:00'));
  assert.deepEqual(nextOccurrence(rule, tw('2026-12-25T00:00:00')), tw('2027-01-22T16:00:00'));
});

test('每週固定日：當天時間已過取下週', () => {
  const rule = { type: 'weekly', weekday: 5, hour: 15 } as const; // 週五 15:00
  // 2026-11-26 是週四
  assert.deepEqual(nextOccurrence(rule, tw('2026-11-26T20:00:00')), tw('2026-11-27T15:00:00'));
  assert.deepEqual(nextOccurrence(rule, tw('2026-11-27T14:59:00')), tw('2026-11-27T15:00:00'));
  assert.deepEqual(nextOccurrence(rule, tw('2026-11-27T15:00:00')), tw('2026-12-04T15:00:00'));
});

test('每月最後一個週一', () => {
  const rule = { type: 'last_monday', hour: 13 } as const;
  // 2026-11 最後一個週一是 11/30；2026-12 是 12/28
  assert.deepEqual(nextOccurrence(rule, tw('2026-11-26T00:00:00')), tw('2026-11-30T13:00:00'));
  assert.deepEqual(nextOccurrence(rule, tw('2026-11-30T13:00:00')), tw('2026-12-28T13:00:00'));
});

test('與瀏覽器時區無關：以 UTC 表示的同一時刻結果相同', () => {
  const rule = { type: 'weekly', weekday: 2, hour: 16 } as const;
  // 台灣週二 01:00 = UTC 週一 17:00
  const now = new Date('2026-12-07T17:00:00Z');
  assert.deepEqual(nextOccurrence(rule, now), tw('2026-12-08T16:00:00'));
});

test('倒數格式', () => {
  assert.deepEqual(splitDuration(90061000), { days: 1, hours: 1, minutes: 1, seconds: 1 });
  assert.deepEqual(splitDuration(-5), { days: 0, hours: 0, minutes: 0, seconds: 0 });
  assert.equal(formatCountdown(90061000), '1天 1時 1分');
  assert.equal(formatCountdown(3661000), '1時 1分 1秒');
  assert.equal(formatCountdown(61000), '1分 1秒');
});

test('限時活動：只列出進行中與即將開始', () => {
  const ev = (title: string, start: string, end: string): SpecialEvent => ({ icon: '🎉', title, description: '', start, end });
  const list = activeSpecials([
    ev('已結束', '2026-11-01T00:00:00+08:00', '2026-11-10T00:00:00+08:00'),
    ev('即將開始', '2026-12-01T00:00:00+08:00', '2026-12-10T00:00:00+08:00'),
    ev('進行中', '2026-11-20T00:00:00+08:00', '2026-11-30T00:00:00+08:00'),
  ], tw('2026-11-26T12:00:00'));
  assert.deepEqual(list.map((e) => [e.title, e.status]), [['進行中', 'live'], ['即將開始', 'upcoming']]);
});

test('資料檔的固定活動都有合法規則', () => {
  assert.ok(DATA.recurring.length >= 5);
  const now = new Date();
  for (const event of DATA.recurring) {
    assert.ok(nextOccurrence(event.rule, now) > now, event.key);
  }
});
