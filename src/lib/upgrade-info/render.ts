/* 升級資訊的 HTML（名稱來自 Wiki，一律跳脫） */
import {
  RESOURCE_NAMES, RESOURCE_SHORT, RESOURCES, applyDiscount, displayName, formatLarge, formatTime, formatTimeLong,
  itemIcon, requirementText,
} from './logic.ts';
import type { Item, Level, Totals } from './logic.ts';

const COST_CLASS = { gold: 'cost-gold', elixir: 'cost-elixir', dark_elixir: 'cost-dark' } as const;

export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** 有減免時顯示「原價（刪除線） 減免後」 */
function withDiscount(value: number, percent: number, format: (n: number) => string): string {
  if (!value || percent <= 0) return format(value);
  return `<span class="cost-original">${format(value)}</span> <span class="cost-discounted">${format(applyDiscount(value, percent))}</span>`;
}

function timeWithDiscount(seconds: number | null, percent: number): string {
  if (seconds === null || seconds === 0 || percent <= 0) return formatTime(seconds);
  return withDiscount(seconds, percent, (n) => formatTime(n));
}

export function cardHtml(item: Item, levels: Level[], discount: number): string {
  const top = levels[levels.length - 1];
  const cost = top.cost
    ? `${withDiscount(top.cost, discount, formatLarge)} ${RESOURCE_SHORT[item.resource]}`
    : '—';
  const subtitle = item.name_zh ? escapeHtml(item.name) : '';
  return `<button type="button" class="item-card" data-key="${escapeHtml(item.key)}">`
    + '<div class="item-card-header">'
    + `<div class="item-icon" aria-hidden="true">${itemIcon(item)}</div>`
    + '<div class="item-info">'
    + `<div class="item-name">${escapeHtml(displayName(item))}</div>`
    + `<div class="item-subtitle">${subtitle}</div>`
    + '</div></div>'
    + '<div class="item-stats">'
    + `<div class="stat"><span class="stat-label">最高等級</span><span class="stat-value">Lv.${top.level}</span></div>`
    + `<div class="stat"><span class="stat-label">升級費用</span><span class="stat-value">${cost}</span></div>`
    + `<div class="stat"><span class="stat-label">升級時間</span><span class="stat-value">${timeWithDiscount(top.time, discount)}</span></div>`
    + '</div></button>';
}

export function emptyHtml(text: string): string {
  return `<div class="empty-state"><div class="empty-state-icon">🏗️</div><p class="empty-state-text">${escapeHtml(text)}</p></div>`;
}

export function modalTitle(item: Item): string {
  return item.name_zh ? `${item.name_zh}（${item.name}）` : item.name;
}

/** 等級表；HP、DPS 只在有資料時顯示 */
export function levelTableHtml(item: Item, levels: Level[], discount: number): { head: string; body: string } {
  const hasHp = levels.some((lv) => lv.hp != null);
  const hasDps = levels.some((lv) => lv.dps != null);
  const altNote = item.alt_resource ? `（也可用${RESOURCE_NAMES[item.alt_resource]}）` : '';
  const head = '<th>等級</th>'
    + `<th>${RESOURCE_NAMES[item.resource]}${altNote}</th>`
    + '<th>升級時間</th>'
    + `<th>${'type' in item ? '實驗室需求' : '大本需求'}</th>`
    + (hasHp ? '<th>HP</th>' : '')
    + (hasDps ? '<th>DPS</th>' : '');
  const body = levels.map((lv) => '<tr>'
    + `<td class="level-num">${lv.level}</td>`
    + `<td class="${COST_CLASS[item.resource]}">${lv.cost ? withDiscount(lv.cost, discount, (n) => n.toLocaleString('en-US')) : '—'}</td>`
    + `<td class="time">${timeWithDiscount(lv.time, discount)}</td>`
    + `<td>${requirementText(item, lv)}</td>`
    + (hasHp ? `<td>${lv.hp != null ? lv.hp.toLocaleString('en-US') : '—'}</td>` : '')
    + (hasDps ? `<td>${lv.dps != null ? lv.dps.toLocaleString('en-US') : '—'}</td>` : '')
    + '</tr>').join('');
  return { head, body };
}

/** 摘要卡片：各資源分開列出 */
export function costLinesHtml(cost: Totals['cost']): string {
  const lines = RESOURCES.filter((r) => cost[r] > 0)
    .map((r) => `<span class="summary-line ${COST_CLASS[r]}">${formatLarge(cost[r])} ${RESOURCE_SHORT[r]}</span>`);
  return lines.length ? lines.join('') : '0';
}

export function summaryValues(original: Totals, discounted: Totals): {
  cost: string; savings: string; time: string; timeSavings: string;
} {
  const saved: Totals['cost'] = { gold: 0, elixir: 0, dark_elixir: 0 };
  for (const r of RESOURCES) saved[r] = original.cost[r] - discounted.cost[r];
  return {
    cost: costLinesHtml(discounted.cost),
    savings: costLinesHtml(saved),
    time: formatTimeLong(discounted.time),
    timeSavings: formatTimeLong(original.time - discounted.time),
  };
}
