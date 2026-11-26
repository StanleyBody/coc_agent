/* 計算結果的 HTML（內容只有程式內的固定文字與數字，不含使用者輸入的字串） */
import { DATA, REQUIRED_BUILDER_HALL, formatNumber as fmt } from './calc.ts';
import type { Resource, ResourceSummary, Result } from './calc.ts';

const ICONS: Record<Resource, string> = { gold: '🪙', elixir: '💧' };

/** 尚未填完時顯示的空白資源卡片 */
function placeholderCard(resource: Resource, name: string): string {
  return `<div class="sb-res sb-res-${resource} is-placeholder">`
    + `<div class="sb-res-head">${ICONS[resource]} ${name}</div><dl>`
    + '<dt>還缺</dt><dd class="sb-num sb-shortage">—</dd>'
    + '<dt>每小時產量</dt><dd class="sb-num">—</dd>'
    + '<dt class="sb-time-label">採集器補足需要</dt><dd class="sb-time">—</dd>'
    + '</dl></div>';
}

function resourceCard(r: ResourceSummary): string {
  const warn = r.capacityOk
    ? ''
    : `<p class="sb-warn">⚠️ ${r.storageName}升到上限仍無法容納單次最高費用 ${fmt(r.maxSingle)}。</p>`;
  return `<div class="sb-res sb-res-${r.resource}">`
    + `<div class="sb-res-head">${ICONS[r.resource]} ${r.name}</div><dl>`
    + `<dt>還缺</dt><dd class="sb-num sb-shortage">${fmt(r.shortage)}</dd>`
    + `<dt>每小時產量</dt><dd class="sb-num">${fmt(r.rate)}</dd>`
    + `<dt class="sb-time-label">採集器補足需要</dt><dd class="sb-time">${r.timeText}</dd>`
    + `</dl>${warn}</div>`;
}

export function placeholderHtml(): string {
  return '<h2 class="sb-result-title">計算結果</h2>'
    + `<div class="sb-summary">${placeholderCard('gold', '金幣')}${placeholderCard('elixir', '聖水')}</div>`
    + '<p class="sb-empty">填完左側所有欄位後會自動計算。</p>';
}

export function resultHtml(result: Result): string {
  const bh = REQUIRED_BUILDER_HALL;
  const bhWarn = result.assumedBuilderHall
    ? `<p class="sb-warn">⚠️ 目前 Builder Hall Lv${result.builderHall}，以剛升上 Lv${bh}、`
      + `尚未建造 Lv${bh} 新建築（B.O.B Control）計算，未計入 Builder Hall 升級費用。</p>`
    : '';
  const heroWarn = result.heroesOk
    ? ''
    : `<p class="sb-warn">⚠️ 英雄等級上限無法達到合計 Lv${DATA.bob_control.hero_total}，英雄費用未計入。</p>`;

  const todo = result.items.filter((item) => !item.done);
  const done = result.items.filter((item) => item.done);
  const rows = todo.map((item) => `<tr><td>${item.name}<span class="sb-item-reason">${item.reason}</span></td>`
    + `<td class="sb-level">Lv${item.current} → Lv${item.target}</td>`
    + `<td class="sb-num sb-${item.resource}">${fmt(item.cost)} ${item.resourceName}</td></tr>`).join('');
  const table = todo.length
    ? `<table class="sb-table"><thead><tr><th>項目</th><th>等級</th><th>費用</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<p class="sb-empty">所有條件都已達標。</p>';
  const doneLine = done.length && todo.length
    ? `<p class="sb-done">✅ 已達標：${done.map((i) => i.name).join('、')}</p>`
    : '';

  return `<h2 class="sb-result-title">計算結果</h2>${bhWarn}${heroWarn}`
    + `<div class="sb-summary">${resourceCard(result.gold)}${resourceCard(result.elixir)}</div>`
    + `<p class="sb-overall">兩種資源都夠所需時間：<strong>${result.overallText}</strong></p>`
    + table + doneLine;
}
