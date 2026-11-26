/* 升級資訊的 HTML（名稱來自 Wiki 與遊戲語系檔，一律跳脫） */
import {
  RESOURCE_NAMES, REQUIREMENT_NAMES, applyDiscount, displayName, formatNumber, formatTime, hasChineseName, itemIcon,
  requirementText,
} from './logic.ts';
import type { Item, Resource, Source, TabConfig } from './logic.ts';
import { escapeHtml } from '../html.ts';

export { escapeHtml };

const COST_CLASS: Record<Resource, string> = {
  gold: 'cost-gold', elixir: 'cost-elixir', dark_elixir: 'cost-dark',
  shiny_ore: 'cost-ore', glowy_ore: 'cost-ore', starry_ore: 'cost-ore',
};

/** 有減免時顯示「原價（刪除線） 減免後」 */
function withDiscount(value: number, percent: number, format: (n: number) => string): string {
  if (!value || percent <= 0) return format(value);
  return `<span class="cost-original">${format(value)}</span> <span class="cost-discounted">${format(applyDiscount(value, percent))}</span>`;
}

function timeWithDiscount(seconds: number | null, percent: number): string {
  if (seconds === null || seconds === 0 || percent <= 0) return formatTime(seconds);
  return withDiscount(seconds, percent, (n) => formatTime(n));
}

/** 卡片：最高等級的費用（多種資源分行） */
export function cardHtml(tab: TabConfig, item: Item, discount: number): string {
  const top = item.levels[item.levels.length - 1];
  const entries = Object.entries(top.costs) as [Resource, number][];
  const cost = entries.length
    ? entries.map(([res, amount]) => `<span class="stat-line">${withDiscount(amount, discount, formatNumber)} ${escapeHtml(RESOURCE_NAMES[res])}</span>`).join('')
    : '—';
  const subtitle = hasChineseName(item) ? escapeHtml(item.name) : '';
  const showTime = top.time !== null;
  return `<button type="button" class="item-card" data-key="${escapeHtml(item.key)}">`
    + '<div class="item-card-header">'
    + `<div class="item-icon" aria-hidden="true">${itemIcon(tab, item)}</div>`
    + '<div class="item-info">'
    + `<div class="item-name">${escapeHtml(displayName(item))}</div>`
    + `<div class="item-subtitle">${subtitle}</div>`
    + '</div></div>'
    + '<div class="item-stats">'
    + `<div class="stat"><span class="stat-label">最高等級</span><span class="stat-value">${top.level}級</span></div>`
    + `<div class="stat"><span class="stat-label">升級費用</span><span class="stat-value">${cost}</span></div>`
    + (showTime ? `<div class="stat"><span class="stat-label">升級時間</span><span class="stat-value">${timeWithDiscount(top.time, discount)}</span></div>` : '')
    + '</div></button>';
}

export function emptyHtml(text: string): string {
  return `<div class="empty-state"><div class="empty-state-icon">🏗️</div><p class="empty-state-text">${escapeHtml(text)}</p></div>`;
}

export function modalTitle(item: Item): string {
  return hasChineseName(item) ? `${displayName(item)}（${item.name}）` : item.name;
}

/** 等級表：每種資源一欄；時間、HP、DPS 只在有資料時顯示 */
export function levelTableHtml(source: Source, item: Item, discount: number): { head: string; body: string } {
  const levels = item.levels;
  const hasTime = levels.some((lv) => lv.time !== null);
  const hasHp = levels.some((lv) => lv.hp != null);
  const hasDps = levels.some((lv) => lv.dps != null);
  const altNote = item.alt_resource ? `（也可用${escapeHtml(RESOURCE_NAMES[item.alt_resource])}）` : '';
  const head = '<th>等級</th>'
    + item.resources.map((res, i) => `<th>${escapeHtml(RESOURCE_NAMES[res])}${i === 0 ? altNote : ''}</th>`).join('')
    + (hasTime ? '<th>升級時間</th>' : '')
    + `<th>${escapeHtml(REQUIREMENT_NAMES[source])}需求</th>`
    + (hasHp ? '<th>HP</th>' : '')
    + (hasDps ? '<th>DPS</th>' : '');
  const body = levels.map((lv) => '<tr>'
    + `<td class="level-num">${lv.level}</td>`
    + item.resources.map((res) => {
      const amount = lv.costs[res];
      return `<td class="${COST_CLASS[res]}">${amount ? withDiscount(amount, discount, formatNumber) : '—'}</td>`;
    }).join('')
    + (hasTime ? `<td class="time">${timeWithDiscount(lv.time, discount)}</td>` : '')
    + `<td>${escapeHtml(requirementText(source, lv))}</td>`
    + (hasHp ? `<td>${lv.hp != null ? formatNumber(lv.hp) : '—'}</td>` : '')
    + (hasDps ? `<td>${lv.dps != null ? formatNumber(lv.dps) : '—'}</td>` : '')
    + '</tr>').join('');
  return { head, body };
}
