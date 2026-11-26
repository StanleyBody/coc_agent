#!/usr/bin/env python3
"""
從 Clash of Clans Fandom Wiki 抓取第六工人計算機需要的資料，
產生 src/data/sixth-builder.json。

抓取內容：
  - 各建築每級升級費用（雙管加農砲、箭塔、多管迫擊砲、星空實驗室、訓練營、金庫、聖水瓶）
  - 倉庫每級容量、Builder Hall 可存的資源量
  - B.O.B Control 的建造費用與升級條件等級、Night Witch 解鎖所需的訓練營等級
  - Night Witch 每級研究費用與所需星空實驗室等級
  - 戰爭機器、戰鬥直升機每級升級費用與所需 Builder Hall 等級

Wiki 格式改變導致解析失敗時，腳本會以非 0 結束，不會寫入檔案。
只使用標準函式庫。用法：python scripts/update_sixth_builder_data.py [--check]
  --check：只比對，不寫入；資料有變動時以 1 結束
"""
import argparse
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path

API_URL = 'https://clashofclans.fandom.com/api.php'
USER_AGENT = 'coc_agent-data-updater/1.0'
OUTPUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'sixth-builder.json'
GENERATED_BY = 'scripts/update_sixth_builder_data.py（自動產生，請勿手動修改）'
SOURCE = 'https://clashofclans.fandom.com'

# key → Wiki 頁面
BUILDING_PAGES = {
    'double_cannon': 'Double Cannon',
    'archer_tower': 'Archer Tower/Builder Base',
    'multi_mortar': 'Multi Mortar/Builder Base',
    'star_laboratory': 'Star Laboratory',
    'builder_barracks': 'Builder Barracks',
}
STORAGE_PAGES = {
    'gold_storage': 'Gold Storage/Builder Base',
    'elixir_storage': 'Elixir Storage/Builder Base',
}
HERO_PAGES = {
    'battle_machine': 'Battle Machine',
    'battle_copter': 'Battle Copter',
}
BOB_CONTROL_PAGE = 'B.O.B Control'
NIGHT_WITCH_PAGE = 'Night Witch'
BUILDER_HALL_PAGE = 'Builder Hall'


class WikiParseError(Exception):
    pass


# ---------------------------------------------------------------- 抓取

def fetch_wikitext(page):
    params = urllib.parse.urlencode({
        'action': 'parse', 'page': page, 'prop': 'wikitext',
        'format': 'json', 'redirects': 1,
    })
    req = urllib.request.Request(f'{API_URL}?{params}', headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    if 'parse' not in data:
        raise WikiParseError(f'{page}: API 回應沒有內容：{data.get("error")}')
    return data['parse']['wikitext']['*']


# ---------------------------------------------------------------- 表格解析

ATTR_CELL = re.compile(r'^\s*(?:[\w-]+\s*=\s*"[^"]*"\s*)+\|(.*)$', re.S)


def clean_text(text):
    """去掉 wiki 連結、模板與 HTML，留下純文字"""
    text = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', text)
    text = re.sub(r'\{\{[^{}]*\}\}', '', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    return ' '.join(text.split())


def _cell_content(cell):
    m = ATTR_CELL.match(cell)
    return (m.group(1) if m else cell).strip()


def _split_cells(lines):
    cells = []
    for line in lines:
        if line.startswith('!'):
            cells.extend(_cell_content(c) for c in line[1:].split('!!'))
        elif line.startswith('|'):
            cells.extend(_cell_content(c) for c in line[1:].split('||'))
        elif cells:
            cells[-1] += ' ' + line.strip()
    return cells


def iter_tables(wikitext):
    """依序回傳每個表格的原始文字（不處理巢狀表格）"""
    for m in re.finditer(r'^\{\|.*?^\|\}', wikitext, re.S | re.M):
        yield m.group(0)


def parse_table(table):
    """回傳 (表頭清單, 資料列清單)；表頭為純文字"""
    lines = [ln.rstrip() for ln in table.splitlines()[1:-1]]
    blocks, current = [], []
    for line in lines:
        if line.startswith('|-'):
            blocks.append(current)
            current = []
        elif not line.startswith('|+'):
            current.append(line)
    blocks.append(current)

    headers, rows = None, []
    for block in blocks:
        if not block:
            continue
        is_header = all(ln.startswith('!') or not ln.startswith('|') for ln in block) \
            and headers is None
        cells = _split_cells(block)
        if is_header:
            headers = [clean_text(c) for c in cells]
        else:
            rows.append(cells)
    if headers is None:
        raise WikiParseError('表格沒有表頭')
    return headers, rows


def find_table(wikitext, *required_headers):
    """找第一個包含所有指定表頭的表格"""
    for table in iter_tables(wikitext):
        try:
            headers, rows = parse_table(table)
        except WikiParseError:
            continue
        if all(any(h in header for header in headers) for h in required_headers):
            return headers, rows
    raise WikiParseError(f'找不到包含 {required_headers} 的表格')


def column(headers, name):
    for i, header in enumerate(headers):
        if name in header:
            return i
    raise WikiParseError(f'找不到欄位 {name}：{headers}')


def to_int(text):
    m = re.search(r'\d[\d,]*', clean_text(text))
    if not m:
        raise WikiParseError(f'無法解析數字：{text!r}')
    return int(m.group(0).replace(',', ''))


def to_int_or_none(text):
    """N/A 或空白回傳 None"""
    return None if re.search(r'N/?A', text) or not re.search(r'\d', clean_text(text)) else to_int(text)


def level_rows(wikitext, *value_columns):
    """
    解析「Level」開頭的等級表，回傳 (第一列的等級, {欄位名稱: [每列的值]})。
    檢查等級是否連續；N/A 的值為 None。
    """
    headers, rows = find_table(wikitext, 'Level', *value_columns)
    level_idx = column(headers, 'Level')
    indexes = {name: column(headers, name) for name in value_columns}
    result = {name: [] for name in value_columns}
    first = expected = None
    for row in rows:
        if len(row) < len(headers):
            continue
        level = to_int(row[level_idx])
        if expected is None:
            first = expected = level
        if level != expected:
            raise WikiParseError(f'等級不連續：預期 Lv{expected}，得到 {row[level_idx]!r}')
        for name, idx in indexes.items():
            result[name].append(to_int_or_none(row[idx]))
        expected += 1
    if first is None:
        raise WikiParseError('等級表沒有資料')
    return first, result


def level_table(wikitext, *value_columns):
    """從 Lv1 開始、每個值都必須有數字的等級表，回傳 {欄位名稱: [Lv1 值, Lv2 值, ...]}"""
    first, result = level_rows(wikitext, *value_columns)
    if first != 1:
        raise WikiParseError(f'等級表應從 Lv1 開始，實際從 Lv{first} 開始')
    for name, values in result.items():
        if None in values:
            raise WikiParseError(f'{name} 欄位有缺值：{values}')
    return result


def troop_table(wikitext):
    """
    兵種研究表：第一列為解鎖時的等級（沒有費用）。
    回傳 {first_level, costs, required}；costs[i] 為升到 first_level+i+1 的費用。
    """
    first, t = level_rows(wikitext, 'Research Cost', 'Star Laboratory Level Required')
    costs, required = t['Research Cost'][1:], t['Star Laboratory Level Required'][1:]
    if None in costs or None in required:
        raise WikiParseError(f'研究表有缺值：{t}')
    return {'first_level': first, 'costs': costs, 'required': required}


def hero_table(wikitext):
    """
    英雄升級表：第一列為建造（解鎖）時的等級，費用為建造費。
    回傳 {first_level, costs, required}；costs[i] 為到達 first_level+i 的費用。
    """
    first, t = level_rows(wikitext, 'Upgrade Cost', 'Builder Hall Level Required')
    costs, required = t['Upgrade Cost'], t['Builder Hall Level Required']
    if None in costs or None in required:
        raise WikiParseError(f'英雄升級表有缺值：{t}')
    return {'first_level': first, 'costs': costs, 'required': required}


# ---------------------------------------------------------------- 各頁面

def search_int(pattern, text, label):
    m = re.search(pattern, text, re.I)
    if not m:
        raise WikiParseError(f'找不到 {label}（pattern: {pattern}）')
    return [int(g) for g in m.groups()]


def parse_bob_control(wikitext):
    headers, rows = find_table(wikitext, 'Build Cost', 'Builder Hall Level Required')
    cost = to_int(rows[0][column(headers, 'Build Cost')])
    builder_hall = to_int(rows[0][column(headers, 'Builder Hall Level Required')])
    (dc,) = search_int(r'level (\d+) \[\[Double Cannon\]\]', wikitext, '雙管加農砲條件')
    (at,) = search_int(r'level (\d+) \{\{B\|Archer Tower\}\}', wikitext, '箭塔條件')
    (mm,) = search_int(r'level (\d+) \{\{B\|Multi Mortar\}\}', wikitext, '多管迫擊砲條件')
    troop, lab = search_int(
        r'Upgrading any troop to level (\d+) \(which requires \[\[Star Laboratory\]\] level (\d+)\)',
        wikitext, '兵種等級條件')
    (defense,) = search_int(r'Upgrading any defensive building in the Builder Base to level (\d+)',
                            wikitext, '防禦建築條件')
    (hero_total,) = search_int(
        r'Upgrading the \[\[Battle Machine\]\] and \[\[Battle Copter\]\] to a combined level of (\d+)',
        wikitext, '英雄合計等級條件')
    return {
        'build_cost': cost,
        'builder_hall': builder_hall,
        'double_cannon': dc,
        'archer_tower': at,
        'multi_mortar': mm,
        'troop_level': troop,
        'star_laboratory': lab,
        'defense_level': defense,
        'hero_total': hero_total,
    }


def parse_night_witch(wikitext):
    (level,) = search_int(r'upgrading the \[\[Builder Barracks\]\] to level (\d+)',
                          wikitext, 'Night Witch 解鎖等級')
    return level


def parse_builder_hall_capacity(wikitext):
    headers, rows = find_table(wikitext, 'BH Level', 'Gold Available')
    level_idx = column(headers, 'BH Level')
    gold_idx = column(headers, 'Gold Available')
    return {str(to_int(r[level_idx])): to_int(r[gold_idx]) for r in rows if len(r) > gold_idx}


def collect(fetch=fetch_wikitext):
    data = {'buildings': {}, 'storages': {}}
    for key, page in BUILDING_PAGES.items():
        data['buildings'][key] = level_table(fetch(page), 'Build Cost')['Build Cost']
    for key, page in STORAGE_PAGES.items():
        table = level_table(fetch(page), 'Storage Capacity', 'Build Cost')
        data['storages'][key] = {'capacity': table['Storage Capacity'], 'costs': table['Build Cost']}
    data['builder_hall_capacity'] = parse_builder_hall_capacity(fetch(BUILDER_HALL_PAGE))
    data['bob_control'] = parse_bob_control(fetch(BOB_CONTROL_PAGE))
    night_witch = fetch(NIGHT_WITCH_PAGE)
    data['night_witch_barracks'] = parse_night_witch(night_witch)
    data['night_witch'] = troop_table(night_witch)
    data['heroes'] = {key: hero_table(fetch(page)) for key, page in HERO_PAGES.items()}
    validate(data)
    return data


def validate(data):
    """基本檢查；不合理時中止，避免寫入錯誤資料"""
    req = data['bob_control']
    targets = {
        'double_cannon': req['double_cannon'],
        'archer_tower': req['archer_tower'],
        'multi_mortar': max(req['multi_mortar'], req['defense_level']),
        'star_laboratory': req['star_laboratory'],
        'builder_barracks': data['night_witch_barracks'],
    }
    for key, costs in data['buildings'].items():
        if not all(c > 0 for c in costs):
            raise WikiParseError(f'{key} 有非正數的費用：{costs}')
        if len(costs) < targets[key]:
            raise WikiParseError(f'{key} 只有 {len(costs)} 級，低於目標 Lv{targets[key]}')
    gold, elixir = data['storages']['gold_storage'], data['storages']['elixir_storage']
    if gold != elixir:
        raise WikiParseError('金庫與聖水瓶的數值不同，計算機假設兩者相同，請人工確認')
    if gold['capacity'] != sorted(gold['capacity']):
        raise WikiParseError(f'倉庫容量不是遞增：{gold["capacity"]}')
    nw = data['night_witch']
    top = nw['first_level'] + len(nw['costs'])
    if top < req['troop_level']:
        raise WikiParseError(f'Night Witch 最高 Lv{top}，低於條件 Lv{req["troop_level"]}')
    need_lab = max(nw['required'][:req['troop_level'] - nw['first_level']])
    if need_lab > req['star_laboratory']:
        raise WikiParseError(f'Night Witch Lv{req["troop_level"]} 需要星空實驗室 Lv{need_lab}，'
                             f'高於條件 Lv{req["star_laboratory"]}，請人工確認')
    hero_top = 0
    for key, hero in data['heroes'].items():
        if len(hero['costs']) != len(hero['required']) or not hero['costs']:
            raise WikiParseError(f'{key} 升級表長度不一致')
        levels = [hero['first_level'] + i for i, r in enumerate(hero['required'])
                  if r <= req['builder_hall']]
        hero_top += max(levels, default=0)
    if hero_top < req['hero_total']:
        raise WikiParseError(f'Builder Hall {req["builder_hall"]} 的英雄合計上限 {hero_top} '
                             f'低於條件 {req["hero_total"]}')
    for level in (str(req['builder_hall']), str(req['builder_hall'] + 1)):
        if level not in data['builder_hall_capacity']:
            raise WikiParseError(f'找不到 Builder Hall {level} 的容量')


# ---------------------------------------------------------------- 輸出

def render(data):
    """輸出 JSON；不放抓取時間，資料沒變時檔案就不會變"""
    output = {'generated_by': GENERATED_BY, 'source': SOURCE, **data}
    return json.dumps(output, ensure_ascii=False, indent=2) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[1])
    parser.add_argument('--check', action='store_true', help='只比對，不寫入')
    args = parser.parse_args()

    try:
        content = render(collect())
    except WikiParseError as e:
        print(f'解析失敗：{e}', file=sys.stderr)
        return 2

    old = OUTPUT.read_text(encoding='utf-8') if OUTPUT.exists() else ''
    if content == old:
        print('資料沒有變動')
        return 0
    if args.check:
        print('資料有變動')
        return 1
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(content, encoding='utf-8')
    print(f'已更新 {OUTPUT}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
