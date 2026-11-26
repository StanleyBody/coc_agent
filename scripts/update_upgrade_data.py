#!/usr/bin/env python3
"""
從 Clash of Clans Fandom Wiki 抓取大本營（Home Village）的升級資料，
產生 src/data/upgrade-info.json。

項目清單由 Wiki 的導覽模板自動取得：
  - Template:BuildingsMenuHV：防禦建築、陷阱、資源建築、軍事建築
  - Template:TroopsMenuHV：聖水兵種、暗黑重油兵種、聖水法術、暗黑重油法術、攻城機器、
    英雄、英雄裝備、戰寵
每個項目解析頁面上第一張等級表：每級各資源的費用、時間、需求等級、HP、DPS。

Wiki 格式改變導致解析失敗時，腳本會以非 0 結束，不會寫入檔案。
只使用標準函式庫。用法：python scripts/update_upgrade_data.py [--check]
  --check：只比對，不寫入；資料有變動時以 1 結束
"""
import argparse
import json
import re
import sys
from pathlib import Path

from wikilib import SOURCE, WikiParseError, clean_text, fetch_many, iter_tables, parse_table_detail, to_int

OUTPUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'upgrade-info.json'
GENERATED_BY = 'scripts/update_upgrade_data.py（自動產生，請勿手動修改）'

BUILDINGS_MENU = 'Template:BuildingsMenuHV'
TROOPS_MENU = 'Template:TroopsMenuHV'

# 導覽模板的列標題 → 類別
BUILDING_ROWS = {
    'Defensive Buildings': 'defense',
    'Resource Buildings': 'resource',
    'Army Buildings': 'army',
}
UNIT_ROWS = {
    'Elixir Troops': 'elixir_troop',
    'Dark Elixir Troops': 'dark_troop',
    'Elixir Spells': 'elixir_spell',
    'Dark Spells': 'dark_spell',
    'Siege Machines': 'siege',
}
HERO_ROW = 'Heroes'
PET_ROW = 'Pets'

# 沒有升級表、不需要列出的項目
SKIP = {
    'Hero Banner',      # 英雄旗幟，沒有升級
    'Squad Barracks',   # 小隊兵營，另一套機制
}

# 各類項目的需求欄位
REQUIREMENTS = {
    'buildings': 'Town Hall Level Required',
    'heroes': 'Town Hall Level Required',
    'units': 'Laboratory Level Required',
    'pets': 'Pet House Level Required',
    'equipment': 'Blacksmith Level Required',
}

COST_HEADERS = ('Build Cost', 'Upgrade Cost', 'Research Cost', 'Cost')
TIME_HEADERS = ('Build Time', 'Upgrade Time', 'Research Time')
RES_PATTERN = re.compile(
    r'\{\{Res\|\s*(?:RES\s*=\s*)?(Gold|Elixir|Dark Elixir|Shiny Ore|Glowy Ore|Starry Ore)\s*(?:\|[^}]*)?\}\}')
RESOURCES = {
    'Gold': 'gold', 'Elixir': 'elixir', 'Dark Elixir': 'dark_elixir',
    'Shiny Ore': 'shiny_ore', 'Glowy Ore': 'glowy_ore', 'Starry Ore': 'starry_ore',
}


# ---------------------------------------------------------------- 導覽模板

def _strip_parens(text):
    """去掉括號內的附屬項目，例如「Golem (Golemite)」"""
    previous = None
    while previous != text:
        previous = text
        text = re.sub(r'\([^()]*\)', '', text)
    return text


LINK = re.compile(r'\{\{H\|([^}|]+)\}\}|\[\[([^\]|]+)(?:\|[^\]]*)?\]\]')


def menu_links(text):
    """回傳 [(頁面標題, 名稱)]；{{H|X}} 對應頁面「X/Home Village」"""
    links = []
    for m in LINK.finditer(_strip_parens(text)):
        if m.group(1):
            name = m.group(1).strip()
            links.append((f'{name}/Home Village', name))
        else:
            name = m.group(2).strip()
            links.append((name, name))
    return links


def menu_rows(wikitext):
    """把導覽模板拆成 {列標題: 內容}；列標題取該列粗體文字裡的第一個連結"""
    rows = {}
    for block in re.split(r'^\|-\s*$', wikitext, flags=re.M):
        m = re.search(r"^\|\s*(?:style=\"[^\"]*\"\|)?'''(.+?)'''\s*$", block, re.M)
        if not m:
            continue
        links = LINK.findall(m.group(1))
        if not links:
            continue
        title = (links[0][0] or links[0][1]).strip()
        rows[title] = block[m.end():]
    return rows


def _row(rows, title, menu):
    if title not in rows:
        raise WikiParseError(f'{menu}找不到「{title}」列')
    return rows[title]


def parse_buildings_menu(wikitext):
    """回傳 [(頁面標題, 名稱, 類別)]"""
    rows = menu_rows(wikitext)
    items = []
    for row, category in BUILDING_ROWS.items():
        text = _row(rows, row, '建築導覽模板')
        if row == 'Defensive Buildings':
            # 第一行是防禦建築；<br> 之後依序為 Crafting Station、Town Hall 武器、陷阱
            parts = re.split(r'<br\s*/?>', text)
            text = parts[0]
            traps = [p for p in parts if '{{H|Traps}}' in p]
            if not traps:
                raise WikiParseError('建築導覽模板找不到陷阱')
            items += [(t, n, 'trap') for t, n in menu_links(traps[0].split("'''", 2)[-1])]
        items += [(t, n, category) for t, n in menu_links(text)]
    return [i for i in items if i[1] not in SKIP]


def parse_troops_menu(wikitext):
    """
    回傳 {units: [(頁面, 名稱, 類型)], heroes: [(頁面, 名稱)],
          equipment: [(頁面, 名稱, 英雄名稱)], pets: [(頁面, 名稱)]}
    """
    rows = menu_rows(wikitext)
    units = []
    for row, unit_type in UNIT_ROWS.items():
        units += [(t, n, unit_type) for t, n in menu_links(_row(rows, row, '兵種導覽模板'))]

    # 英雄列：每行「'''[[英雄]]''': [[裝備]] • ...」
    heroes, equipment = [], []
    for line in _row(rows, HERO_ROW, '兵種導覽模板').splitlines():
        m = re.match(r"^\|?'''\[\[([^\]|]+)\]\]'''\s*:(.*)$", line.strip())
        if not m:
            continue
        hero = m.group(1).strip()
        heroes.append((hero, hero))
        equipment += [(t, n, hero) for t, n in menu_links(m.group(2))]
    if not heroes or not equipment:
        raise WikiParseError('兵種導覽模板找不到英雄或裝備')

    pets = menu_links(_row(rows, PET_ROW, '兵種導覽模板'))
    return {'units': units, 'heroes': heroes, 'equipment': equipment, 'pets': pets}


# ---------------------------------------------------------------- 等級表

def parse_time(text):
    """「1d 14h 30m」→ 秒；N/A、None 等回傳 None"""
    text = clean_text(text)
    units = {'d': 86400, 'h': 3600, 'm': 60, 's': 1}
    parts = re.findall(r'(\d+)\s*([dhms])\b', text)
    if not parts:
        return 0 if re.search(r'instant', text, re.I) else None
    return sum(int(n) * units[u] for n, u in parts)


def _int_or_none(text):
    text = clean_text(text)
    if not re.search(r'\d', text) or re.search(r'N/?A|Varies', text, re.I):
        return None
    return to_int(text)


def _float_or_none(text):
    m = re.search(r'\d[\d,]*(?:\.\d+)?', clean_text(text))
    return float(m.group(0).replace(',', '')) if m else None


def _norm(header):
    return header.replace('*', '').strip()


def _find_index(headers, names, exact=True):
    for i, header in enumerate(headers):
        h = _norm(header)
        if (h in names) if exact else any(h.startswith(n) for n in names):
            return i
    return None


def _resource(raw):
    m = RES_PATTERN.search(raw)
    return RESOURCES[m.group(1)] if m else None


def cost_columns(headers, raw_headers, sub_headers):
    """
    回傳 ([(欄位位置, 資源)], 替代資源)。
    一般項目只有一個費用欄；裝備的「Upgrade Cost」合併欄底下有多種礦石；
    城牆等的第二個「Cost」欄是可替代的資源。
    """
    first = _find_index(headers, COST_HEADERS)
    if first is None:
        return [], None
    name = _norm(headers[first])
    span = [i for i in range(first, len(headers)) if _norm(headers[i]) == name and sub_headers[i]]
    if span and all(_resource(sub_headers[i]) for i in span):
        return [(i, _resource(sub_headers[i])) for i in span], None

    resource = _resource(raw_headers[first])
    if not resource:
        raise WikiParseError(f'無法判斷費用的資源種類：{raw_headers[first]!r}')
    alt_resource = None
    for i in range(first + 1, len(headers)):
        if _norm(headers[i]) == 'Cost':
            alt = _resource(raw_headers[i])
            if alt and alt != resource:
                alt_resource = alt
            break
    return [(first, resource)], alt_resource


def parse_level_table(wikitext, requirement):
    """
    解析頁面上第一張「Level」等級表。
    回傳 {levels: [{level, costs, time, required, hp?, dps?}], resources, alt_resource}
    costs 為 {資源: 數量}，沒有費用的等級為空物件。
    """
    for table in iter_tables(wikitext):
        try:
            detail = parse_table_detail(table)
        except WikiParseError:
            continue
        headers = detail['headers']
        first = _norm(headers[0]) if headers else ''
        if first not in ('Level', 'TH Level'):
            continue
        columns, alt_resource = cost_columns(headers, detail['raw_headers'], detail['sub_headers'])
        if not columns:
            continue
        levels = _rows_to_levels(headers, detail['rows'], columns, requirement, first == 'TH Level')
        resources = list(dict.fromkeys(r for _i, r in columns))
        return {'levels': levels, 'resources': resources, 'alt_resource': alt_resource}
    raise WikiParseError('找不到等級表')


def _rows_to_levels(headers, rows, columns, requirement, is_town_hall):
    time_idx = _find_index(headers, TIME_HEADERS)
    req_idx = _find_index(headers, (requirement,))
    if req_idx is None and not is_town_hall:
        raise WikiParseError(f'找不到「{requirement}」欄位：{headers}')
    hp_idx = _find_index(headers, ('Hitpoints',))
    dps_idx = _find_index(headers, ('Damage per Second',), exact=False)

    levels = []
    for row in rows:
        if len(row) < len(headers):
            continue
        level = to_int(row[0])
        if levels and level != levels[-1]['level'] + 1:
            raise WikiParseError(f'等級不連續：Lv{levels[-1]["level"]} 之後是 {row[0]!r}')
        costs = {}
        for i, resource in columns:
            amount = _int_or_none(row[i])
            if amount is not None:
                costs[resource] = amount
        entry = {
            'level': level,
            'costs': costs,
            'time': parse_time(row[time_idx]) if time_idx is not None else None,
            'required': level if is_town_hall else _int_or_none(row[req_idx]),
        }
        if hp_idx is not None:
            entry['hp'] = _float_or_none(row[hp_idx])
        if dps_idx is not None:
            entry['dps'] = _float_or_none(row[dps_idx])
        levels.append(entry)
    if not levels:
        raise WikiParseError('等級表沒有資料')
    return levels


# ---------------------------------------------------------------- 彙整

def slug(name):
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


def collect(fetch=fetch_many):
    menus = fetch([BUILDINGS_MENU, TROOPS_MENU])
    for title in (BUILDINGS_MENU, TROOPS_MENU):
        if title not in menus:
            raise WikiParseError(f'找不到頁面：{title}')

    buildings = parse_buildings_menu(menus[BUILDINGS_MENU])
    troops = parse_troops_menu(menus[TROOPS_MENU])
    # 每組項目：(資料欄位, [(頁面, 名稱, 額外欄位)])
    groups = {
        'buildings': [(t, n, {'category': c}) for t, n, c in buildings],
        'heroes': [(t, n, {}) for t, n in troops['heroes']],
        'units': [(t, n, {'type': ty}) for t, n, ty in troops['units']],
        'pets': [(t, n, {}) for t, n in troops['pets']],
        'equipment': [(t, n, {'hero': slug(h)}) for t, n, h in troops['equipment']],
    }
    pages = fetch([t for items in groups.values() for t, *_ in items])

    data, errors = {}, []
    for group, items in groups.items():
        data[group] = []
        for title, name, extra in items:
            try:
                if title not in pages:
                    raise WikiParseError(f'找不到頁面：{title}')
                table = parse_level_table(pages[title], REQUIREMENTS[group])
            except WikiParseError as e:
                errors.append(f'{name}：{e}')
                continue
            # 中文名稱在網站端由 src/data/zh-tw.json（遊戲內翻譯）查詢
            data[group].append({'key': slug(name), 'name': name, 'wiki': title, **extra, **table})

    if errors:
        raise WikiParseError('以下項目解析失敗：\n  ' + '\n  '.join(errors))
    validate(data)
    return data


def validate(data):
    """基本檢查；不合理時中止，避免寫入錯誤資料"""
    minimum = {'buildings': 40, 'heroes': 5, 'units': 40, 'pets': 8, 'equipment': 30}
    for key, count in minimum.items():
        if len(data[key]) < count:
            raise WikiParseError(f'{key} 只有 {len(data[key])} 項，少於預期的 {count} 項')
    keys = [i['key'] for group in minimum for i in data[group]]
    duplicates = {k for k in keys if keys.count(k) > 1}
    if duplicates:
        raise WikiParseError(f'重複的項目：{sorted(duplicates)}')
    heroes = {h['key'] for h in data['heroes']}
    for item in data['equipment']:
        if item['hero'] not in heroes:
            raise WikiParseError(f'{item["name"]} 的英雄 {item["hero"]} 不在英雄清單中')
    for group in minimum:
        for item in data[group]:
            amounts = [a for lv in item['levels'] for a in lv['costs'].values()]
            if not amounts:
                raise WikiParseError(f'{item["name"]} 沒有任何費用資料')
            if any(a < 0 for a in amounts):
                raise WikiParseError(f'{item["name"]} 有負數費用')


# ---------------------------------------------------------------- 輸出

def render(data):
    """輸出 JSON；不放抓取時間，資料沒變時檔案就不會變"""
    output = {'generated_by': GENERATED_BY, 'source': SOURCE, **data}
    return json.dumps(output, ensure_ascii=False, indent=1) + '\n'


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
