/*
 * 升級資訊在瀏覽器的互動：分頁、子分類、搜尋、減免設定、卡片與等級表彈窗。
 * 減免設定存在 localStorage（與舊版相同的 key），分頁與篩選條件同步到網址參數。
 */
import {
  NO_DISCOUNT, TABS, discountSummary, filterItems, hasGroupFilter, itemIcon, itemsInTab, normalizeDiscount,
  tabByKey, totalDiscount, totals,
} from './logic.ts';
import type { DiscountSettings, Filters, Item } from './logic.ts';
import { cardHtml, emptyHtml, levelTableHtml, modalTitle, summaryValues } from './render.ts';

const DISCOUNT_KEY = 'coc_discount';

function loadDiscount(): DiscountSettings {
  try {
    return normalizeDiscount(JSON.parse(localStorage.getItem(DISCOUNT_KEY) ?? 'null'));
  } catch {
    return { ...NO_DISCOUNT };
  }
}

function saveDiscount(settings: DiscountSettings): void {
  try {
    localStorage.setItem(DISCOUNT_KEY, JSON.stringify(settings));
  } catch {
    // 無法儲存時僅本次有效
  }
}

function $(root: ParentNode, selector: string): HTMLElement {
  const el = root.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`找不到元素：${selector}`);
  return el;
}

export function initUpgradeInfo(root: HTMLElement): void {
  const groupSelect = $(root, '#groupSelect') as HTMLSelectElement;
  const groupLabel = $(root, '#groupLabel');
  const searchInput = $(root, '#searchInput') as HTMLInputElement;
  const grid = $(root, '#itemsGrid');
  const modal = $(document, '#levelModal');

  const params = new URLSearchParams(location.search);
  const state: Filters & { discount: DiscountSettings } = {
    tab: tabByKey(params.get('tab')),
    group: params.get('group'),
    search: params.get('q') ?? '',
    discount: loadDiscount(),
  };

  function syncUrl(): void {
    const p = new URLSearchParams();
    if (state.tab !== TABS[0]) p.set('tab', state.tab.key);
    if (state.group) p.set('group', state.group);
    if (state.search) p.set('q', state.search);
    const query = p.toString();
    try {
      history.replaceState(null, '', query ? `?${query}` : location.pathname);
    } catch {
      // 部分預覽環境不允許修改網址
    }
  }

  function renderGroupSelect(): void {
    const tab = state.tab;
    const field = groupSelect.closest<HTMLElement>('.filter-group');
    if (field) field.hidden = !hasGroupFilter(tab);
    groupLabel.textContent = tab.key === 'equipment' ? '英雄' : `${tab.name}類別`;
    if (!tab.groups.some((g) => g.key === state.group)) state.group = null;
    const counts = new Map<string, number>();
    for (const item of itemsInTab(tab)) {
      const key = tab.groupField ? item[tab.groupField] ?? '' : '';
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    groupSelect.innerHTML = '<option value="">全部</option>'
      + tab.groups.map((g) => `<option value="${g.key}">${g.icon} ${g.name}（${counts.get(g.key) ?? 0}）</option>`).join('');
    groupSelect.value = state.group ?? '';
  }

  function renderDiscountPanel(): void {
    const total = totalDiscount(state.discount);
    const totalEl = $(root, '#totalDiscount');
    totalEl.textContent = total > 0 ? `-${total}%` : '0%';
    totalEl.classList.toggle('zero', total === 0);
    const summaryEl = $(root, '#discountSummary');
    summaryEl.textContent = discountSummary(state.discount);
    summaryEl.classList.toggle('has-discount', total > 0);
    root.querySelectorAll<HTMLInputElement>('.discount-option input').forEach((input) => {
      const checked = state.discount[input.name as keyof DiscountSettings] === Number(input.value);
      input.checked = checked;
      input.closest('.discount-option')?.classList.toggle('active', checked);
    });
  }

  function render(): void {
    const discount = totalDiscount(state.discount);
    const items = filterItems(state);

    grid.innerHTML = items.length
      ? items.map((item) => cardHtml(state.tab, item, discount)).join('')
      : emptyHtml(`找不到符合條件的${state.tab.name}`);

    const values = summaryValues(totals(items), totals(items, discount));
    $(root, '#totalCost').innerHTML = values.cost;
    $(root, '#totalTime').textContent = values.time;
    const savingsEl = $(root, '#totalSavings');
    const timeSavingsEl = $(root, '#timeSavings');
    if (discount > 0) {
      savingsEl.innerHTML = values.savings;
      timeSavingsEl.textContent = values.timeSavings;
    } else {
      savingsEl.textContent = '-';
      timeSavingsEl.textContent = '-';
    }
    root.querySelectorAll<HTMLElement>('.summary-badge').forEach((badge) => {
      badge.textContent = `-${discount}%`;
      badge.hidden = discount === 0;
    });
    $(root, '#summaryScope').textContent = `${items.length} 個項目，從 Lv1 升到滿級`;

    root.querySelectorAll<HTMLButtonElement>('.tab').forEach((button) => {
      const active = button.dataset.tab === state.tab.key;
      button.classList.toggle('active', active);
      button.setAttribute('aria-selected', String(active));
    });
    syncUrl();
  }

  // ----- 彈窗
  let lastFocus: HTMLElement | null = null;

  function openModal(item: Item): void {
    const table = levelTableHtml(state.tab.source, item, totalDiscount(state.discount));
    $(modal, '#modalIcon').textContent = itemIcon(state.tab, item);
    $(modal, '#modalTitle').textContent = modalTitle(item);
    $(modal, '#tableHeader').innerHTML = table.head;
    $(modal, '#tableBody').innerHTML = table.body;
    lastFocus = document.activeElement as HTMLElement | null;
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    $(modal, '#modalClose').focus();
  }

  function closeModal(): void {
    modal.classList.remove('active');
    document.body.style.overflow = '';
    lastFocus?.focus();
  }

  // ----- 事件
  root.querySelectorAll<HTMLButtonElement>('.tab').forEach((button) => {
    button.addEventListener('click', () => {
      state.tab = tabByKey(button.dataset.tab ?? null);
      state.group = null;
      renderGroupSelect();
      render();
    });
  });
  groupSelect.addEventListener('change', () => {
    state.group = groupSelect.value || null;
    render();
  });
  searchInput.addEventListener('input', () => {
    state.search = searchInput.value;
    render();
  });
  grid.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement).closest<HTMLElement>('.item-card');
    const item = card && itemsInTab(state.tab).find((i) => i.key === card.dataset.key);
    if (item) openModal(item);
  });

  root.querySelectorAll<HTMLInputElement>('.discount-option input').forEach((input) => {
    input.addEventListener('change', () => {
      state.discount = { ...state.discount, [input.name]: Number(input.value) };
      saveDiscount(state.discount);
      renderDiscountPanel();
      render();
    });
  });
  $(root, '#discountReset').addEventListener('click', () => {
    state.discount = { ...NO_DISCOUNT };
    saveDiscount(state.discount);
    renderDiscountPanel();
    render();
  });
  const toggle = $(root, '#discountToggle');
  toggle.addEventListener('click', () => {
    const open = $(root, '#discountPanel').classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
  });

  $(modal, '#modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal.classList.contains('active')) closeModal();
  });

  // ----- 初始畫面
  searchInput.value = state.search;
  renderGroupSelect();
  renderDiscountPanel();
  render();
}
