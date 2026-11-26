/*
 * 遊戲內名稱的官方繁體中文（src/data/zh-tw.json，由 scripts/update_translations.py 自動產生）。
 * 查不到時回傳英文原名，不自行翻譯。
 */
import rawData from '../data/zh-tw.json' with { type: 'json' };

const NAMES = (rawData as unknown as { names: Record<string, string> }).names;

/** 英文名稱 → 遊戲內繁體中文；沒有翻譯時回傳原文 */
export function zh(name: string): string {
  return hasZh(name) ? NAMES[name] : name;
}

/** 只查對照表本身的鍵，避免 constructor、toString 等查到物件原型 */
export function hasZh(name: string): boolean {
  return Object.hasOwn(NAMES, name);
}
