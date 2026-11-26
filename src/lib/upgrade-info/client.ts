/*
 * 升級資訊在瀏覽器的互動：分頁、篩選、減免設定、卡片與等級表彈窗。
 * 減免設定存在 localStorage（與舊版相同的 key），篩選條件同步到網址參數。
 */
import {
  BUILDING_CATEGORIES, DATA, NO_DISCOUNT, UNIT_TYPES, availableLevels, discountSummary,
  filterItems, itemIcon, normalizeDiscount, totalDiscount, totals,
} from './logic.ts';
import type { DiscountSettings, Filters, Item, Tab } from './logic.ts';
import { cardHtml, emptyHtml, levelTableHtml, modalTitle, summaryValues } from './render.ts';

const DISCOUNT_KEY = 'coc_discount';
const TABS: Tab[] = ['buildings', 'heroes', 'units'];
const EMPTY_TEXT: Record<Tab, string> = {
  buildings: '找不到符合條件的建築',
  heroes: '找不到符合條件的英雄',
  units: '找不到符合條件的兵種',
};

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
  const thSelect = $(root, '#thFilter') as HTMLSelectElement;
  const groupSelect = $(root, '#groupSelect') as HTMLSelectElement;
  const groupLabel = $(root, '#groupLabel');
  const searchInput = $(root, '#searchInput') as HTMLInputElement;
  const grid = $(root, '#itemsGrid');
  const modal = $(document, '#levelModal');

  const params = new URLSearchParams(location.search);
  const initialTab = params.get('tab') as Tab | null;
  const state: Filters & { discount: DiscountSettings } = {
    tab: initialTab && TABS.includes(initialTab) ? initialTab : 'buildings',
    th: params.get('th') ? Number(params.get('th')) : null,
    group: params.get('group'),
    search: params.get('q') ?? '',
    discount: loadDiscount(),
  };
  if (state.th !== null && !(state.th >= 1 && state.th <= DATA.town_hall_max)) state.th = null;

  const groupOptions = () => (state.tab === 'buildings' ? BUILDING_CATEGORIES : state.tab === 'units' ? UNIT_TYPES : []);

  function syncUrl(): void {
    const p = new URLSearchParams();
    if (state.tab !== 'buildings') p.set('tab', state.tab);
    if (state.th !== null) p.set('th', String(state.th));
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
    const options = groupOptions();
    const field = groupSelect.closest<HTMLElement>('.filter-group');
    if (field) field.hidden = options.length === 0;
    groupLabel.textContent = state.tab === 'units' ? '兵種類別' : '建築類別';
    if (!options.some((o) => o.key === state.group)) state.group = null;
    groupSelect.innerHTML = '<option value="">全部類別</option>'
      + options.map((o) => `<option value="${o.key}">${o.icon} ${o.name}</option>`).join('');
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
    const rows = filterItems(state);

    grid.innerHTML = rows.length
      ? rows.map(({ item, levels }) => cardHtml(item, levels, discount)).join('')
      : emptyHtml(EMPTY_TEXT[state.tab]);

    const values = summaryValues(totals(rows), totals(rows, discount));
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
    $(root, '#summaryScope').textContent = `${rows.length} 個項目，從 Lv1 升到${state.th ? ` TH${state.th} 的` : ''}最高等級`;

    root.querySelectorAll<HTMLButtonElement>('.tab').forEach((tab) => {
      const active = tab.dataset.tab === state.tab;
      tab.classList.toggle('active', active);
      tab.setAttribute('aria-selected', String(active));
    });
    syncUrl();
  }

  // ----- 彈窗
  let lastFocus: HTMLElement | null = null;

  function openModal(item: Item): void {
    const levels = availableLevels(item, state.th);
    const table = levelTableHtml(item, levels, totalDiscount(state.discount));
    $(modal, '#modalIcon').textContent = itemIcon(item);
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
  root.querySelectorAll<HTMLButtonElement>('.tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      state.tab = tab.dataset.tab as Tab;
      state.group = null;
      renderGroupSelect();
      render();
    });
  });
  thSelect.addEventListener('change', () => {
    state.th = thSelect.value ? Number(thSelect.value) : null;
    render();
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
    const item = card && DATA[state.tab].find((i: Item) => i.key === card.dataset.key);
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
  thSelect.value = state.th === null ? '' : String(state.th);
  searchInput.value = state.search;
  renderGroupSelect();
  renderDiscountPanel();
  render();
}
