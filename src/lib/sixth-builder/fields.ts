/* 計算機的輸入欄位定義與驗證（頁面產生表單、瀏覽器驗證都用這份） */
import {
  BUILDER_HALL_MAX_LEVEL, BUILDINGS, HEROES, NIGHT_WITCH, NIGHT_WITCH_MAX_LEVEL, STORAGE_MAX_LEVEL,
} from './calc.ts';
import type { Input } from './calc.ts';

export type NumberKey = Exclude<keyof Input, 'bob_control_built'>;

export interface Field {
  key: NumberKey;
  label: string;
  min: number;
  /** null：沒有上限 */
  max: number | null;
  /** 有設定時：0 表示未解鎖，其餘須介於 unlockMin 與 max 之間 */
  unlockMin?: number;
}

const [MACHINE, COPTER] = HEROES;

export const BUILDER_HALL_FIELD: Field = { key: 'builder_hall', label: 'Builder Hall', min: 1, max: BUILDER_HALL_MAX_LEVEL };

export const BUILDING_FIELDS: Field[] = BUILDINGS.map((b) => ({ key: b.key, label: b.name, min: b.min, max: b.max }));

export const UNIT_FIELDS: Field[] = [
  { key: 'night_witch', label: 'Night Witch', min: 0, max: NIGHT_WITCH_MAX_LEVEL, unlockMin: NIGHT_WITCH.first_level },
  { key: MACHINE.key, label: MACHINE.name, min: 0, max: MACHINE.maxLevel, unlockMin: MACHINE.firstLevel },
  { key: COPTER.key, label: COPTER.name, min: 0, max: COPTER.maxLevel, unlockMin: COPTER.firstLevel },
];

export const STORAGE_PAIRS: { label: string; fields: [Field, Field] }[] = [
  {
    label: '金庫',
    fields: [
      { key: 'gold_storage_1', label: '金庫 1', min: 0, max: STORAGE_MAX_LEVEL },
      { key: 'gold_storage_2', label: '金庫 2', min: 0, max: STORAGE_MAX_LEVEL },
    ],
  },
  {
    label: '聖水瓶',
    fields: [
      { key: 'elixir_storage_1', label: '聖水瓶 1', min: 0, max: STORAGE_MAX_LEVEL },
      { key: 'elixir_storage_2', label: '聖水瓶 2', min: 0, max: STORAGE_MAX_LEVEL },
    ],
  },
];

export const RATE_FIELDS: Field[] = [
  { key: 'gold_rate', label: '每小時金幣產量', min: 0, max: null },
  { key: 'elixir_rate', label: '每小時聖水產量', min: 0, max: null },
];

export const FIELDS: Field[] = [
  BUILDER_HALL_FIELD,
  ...BUILDING_FIELDS,
  ...UNIT_FIELDS,
  ...STORAGE_PAIRS.flatMap((p) => p.fields),
  ...RATE_FIELDS,
];

/** 檢查單一欄位；回傳錯誤訊息，沒有錯誤時回傳 null */
export function validateField(field: Field, raw: string): string | null {
  const text = raw.trim();
  if (text === '') return '必填';
  const n = Number(text);
  if (field.unlockMin !== undefined && field.max !== null && Number.isInteger(n) && n !== 0
    && (n < field.unlockMin || n > field.max)) {
    return `請輸入 0 或 ${field.unlockMin}–${field.max} 的整數`;
  }
  if (!Number.isInteger(n) || n < field.min || (field.max !== null && n > field.max)) {
    return field.max !== null ? `請輸入 ${field.min}–${field.max} 的整數` : '請輸入 0 以上的整數';
  }
  return null;
}

/** 檢查所有欄位；全部正確時回傳 input，否則 input 為 null */
export function parseValues(
  values: Partial<Record<NumberKey, string>>, bobControlBuilt: boolean,
): { input: Input | null; errors: Partial<Record<NumberKey, string>> } {
  const errors: Partial<Record<NumberKey, string>> = {};
  const numbers: Partial<Record<NumberKey, number>> = {};
  for (const field of FIELDS) {
    const raw = values[field.key] ?? '';
    const error = validateField(field, raw);
    if (error) errors[field.key] = error;
    else numbers[field.key] = Number(raw.trim());
  }
  const input = Object.keys(errors).length
    ? null
    : ({ ...numbers, bob_control_built: bobControlBuilt } as Input);
  return { input, errors };
}
