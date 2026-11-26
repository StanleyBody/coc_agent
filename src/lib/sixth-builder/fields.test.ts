import test from 'node:test';
import assert from 'node:assert/strict';
import { BUILDER_HALL_FIELD, FIELDS, RATE_FIELDS, UNIT_FIELDS, parseValues, validateField } from './fields.ts';
import type { NumberKey } from './fields.ts';
import { HEROES } from './calc.ts';

const copterField = UNIT_FIELDS.find((f) => f.key === 'battle_copter')!;

test('必填', () => {
  assert.equal(validateField(BUILDER_HALL_FIELD, ' '), '必填');
});

test('範圍與整數', () => {
  assert.equal(validateField(BUILDER_HALL_FIELD, '9'), null);
  assert.match(validateField(BUILDER_HALL_FIELD, '0')!, /請輸入 1–/);
  assert.match(validateField(BUILDER_HALL_FIELD, '9.5')!, /整數/);
  assert.equal(validateField(RATE_FIELDS[0], '123456789'), null);
  assert.equal(validateField(RATE_FIELDS[0], '-1'), '請輸入 0 以上的整數');
});

test('未解鎖填 0，其餘須從解鎖等級開始', () => {
  assert.equal(validateField(copterField, '0'), null);
  assert.equal(validateField(copterField, String(HEROES[1].firstLevel)), null);
  assert.equal(validateField(copterField, '5'), `請輸入 0 或 ${HEROES[1].firstLevel}–${HEROES[1].maxLevel} 的整數`);
});

test('parseValues：全部正確時回傳 input', () => {
  const values = Object.fromEntries(FIELDS.map((f) => [f.key, String(f.min)])) as Record<NumberKey, string>;
  values.builder_hall = '9';
  const { input, errors } = parseValues(values, true);
  assert.deepEqual(errors, {});
  assert.equal(input?.builder_hall, 9);
  assert.equal(input?.bob_control_built, true);
});

test('parseValues：有錯誤時 input 為 null', () => {
  const { input, errors } = parseValues({ builder_hall: '9' }, false);
  assert.equal(input, null);
  assert.equal(errors.gold_rate, '必填');
  assert.equal(errors.builder_hall, undefined);
});
