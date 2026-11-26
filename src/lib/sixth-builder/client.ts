/*
 * 計算機在瀏覽器的互動：讀取欄位、顯示錯誤、計算並更新結果。
 * 欄位值同步到網址參數，方便分享。
 */
import { calculate } from './calc.ts';
import { FIELDS, parseValues } from './fields.ts';
import type { NumberKey } from './fields.ts';
import { placeholderHtml, resultHtml } from './render.ts';

const BOB_KEY = 'bob_control_built';

function inputOf(form: HTMLFormElement, key: string): HTMLInputElement {
  return form.elements.namedItem(key) as HTMLInputElement;
}

function readValues(form: HTMLFormElement): Partial<Record<NumberKey, string>> {
  const values: Partial<Record<NumberKey, string>> = {};
  for (const f of FIELDS) values[f.key] = inputOf(form, f.key).value;
  return values;
}

/** 只對使用者動過（或由網址帶入）的欄位顯示錯誤 */
function showErrors(form: HTMLFormElement, errors: Partial<Record<NumberKey, string>>): void {
  form.querySelectorAll<HTMLElement>('.sb-field').forEach((el) => {
    const keys = (el.dataset.field ?? '').split(' ') as NumberKey[];
    const messages: string[] = [];
    for (const key of keys) {
      const input = inputOf(form, key);
      const error = input.dataset.touched === '1' ? errors[key] : undefined;
      input.setAttribute('aria-invalid', error ? 'true' : 'false');
      if (error) messages.push(keys.length > 1 ? `第 ${key.slice(-1)} 座：${error}` : error);
    }
    const span = el.querySelector<HTMLElement>('.sb-error');
    if (span) {
      span.textContent = messages.join('；');
      span.hidden = messages.length === 0;
    }
  });
}

function syncUrl(form: HTMLFormElement): void {
  const params = new URLSearchParams();
  for (const f of FIELDS) {
    const value = inputOf(form, f.key).value.trim();
    if (value !== '') params.set(f.key, value);
  }
  if (inputOf(form, BOB_KEY).checked) params.set(BOB_KEY, '1');
  const query = params.toString();
  try {
    history.replaceState(null, '', query ? `?${query}` : location.pathname);
  } catch {
    // 部分預覽環境不允許修改網址
  }
}

function loadUrl(form: HTMLFormElement): void {
  const params = new URLSearchParams(location.search);
  for (const f of FIELDS) {
    const value = params.get(f.key);
    if (value !== null) {
      const input = inputOf(form, f.key);
      input.value = value;
      input.dataset.touched = '1';
    }
  }
  inputOf(form, BOB_KEY).checked = params.get(BOB_KEY) === '1';
}

export function initSixthBuilder(root: HTMLElement): void {
  const form = root.querySelector<HTMLFormElement>('form.sb-form');
  const body = root.querySelector<HTMLElement>('.sb-result-body');
  if (!form || !body) return;

  const update = () => {
    const { input, errors } = parseValues(readValues(form), inputOf(form, BOB_KEY).checked);
    showErrors(form, errors);
    syncUrl(form);
    body.innerHTML = input ? resultHtml(calculate(input)) : placeholderHtml();
  };

  form.addEventListener('input', (e) => {
    const target = e.target as HTMLInputElement;
    if (target.name) target.dataset.touched = '1';
    update();
  });
  form.addEventListener('change', update);
  form.addEventListener('submit', (e) => e.preventDefault());

  loadUrl(form);
  update();
}
