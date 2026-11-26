/*
 * 每秒更新頁面上的倒數計時。
 * 元素需有 data-rule（固定活動規則 JSON）或 data-target（ISO 時間），
 * data-format="units" 時更新內部的 [data-unit] 元素，否則更新文字。
 */
import { formatCountdown, nextOccurrence, splitDuration } from './schedule.ts';
import type { Duration, Rule } from './schedule.ts';

function targetOf(el: HTMLElement, now: Date): Date | null {
  if (el.dataset.rule) return nextOccurrence(JSON.parse(el.dataset.rule) as Rule, now);
  if (el.dataset.target) return new Date(el.dataset.target);
  return null;
}

function update(elements: HTMLElement[]): void {
  const now = new Date();
  for (const el of elements) {
    const target = targetOf(el, now);
    if (!target) continue;
    const ms = target.getTime() - now.getTime();
    if (el.dataset.format === 'units') {
      const d = splitDuration(ms);
      el.querySelectorAll<HTMLElement>('[data-unit]').forEach((unit) => {
        unit.textContent = String(d[unit.dataset.unit as keyof Duration]).padStart(2, '0');
      });
    } else {
      el.textContent = ms > 0 ? formatCountdown(ms) : '活動進行中！';
      el.classList.toggle('active', ms <= 0);
    }
  }
}

export function initCountdowns(root: ParentNode = document): void {
  const elements = [...root.querySelectorAll<HTMLElement>('[data-rule], [data-target]')];
  if (!elements.length) return;
  update(elements);
  window.setInterval(() => update(elements), 1000);
}
