#!/usr/bin/env python3
"""
從 Clash of Clans Fandom Wiki 抓取大本營（Home Village）的升級資料，
產生 src/data/upgrade-info.json。

項目清單由 Wiki 的導覽模板自動取得：
  - Template:BuildingsMenuHV：防禦建築、陷阱、資源建築、軍事建築
  - Template:TroopsMenuHV：聖水兵種、暗黑兵種、聖水法術、暗黑法術、攻城機器、英雄
每個項目解析頁面上第一張等級表：每級費用、資源種類、時間、需要的大本營／實驗室等級。
另外抓取實驗室各級需要的大本營等級，以及兵營等建築解鎖各兵種的大本營等級。

Wiki 格式改變導致解析失敗時，腳本會以非 0 結束，不會寫入檔案。
只使用標準函式庫。用法：python scripts/update_upgrade_data.py [--check]
  --check：只比對，不寫入；資料有變動時以 1 結束
"""
import argparse
import json
import re
import sys
from pathlib import Path

from wikilib import SOURCE, WikiParseError, clean_text, fetch_many, iter_tables, parse_table_full, to_int

OUTPUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'upgrade-info.json'
GENERATED_BY = 'scripts/update_upgrade_data.py（自動產生，請勿手動修改）'

BUILDINGS_MENU = 'Template:BuildingsMenuHV'
TROOPS_MENU = 'Template:TroopsMenuHV'
LABORATORY = 'Laboratory'

# 導覽模板的列標題 → 類別
BUILDING_ROWS = {
    'Defensive Buildings': 'defense',
    'Traps': 'trap',
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

# 沒有升級表、不需要列出的項目
SKIP = {
    'Hero Banner',      # 英雄旗幟，沒有升級
    'Squad Barracks',   # 小隊兵營，另一套機制
}

# 解鎖兵種的建築與欄位
UNLOCK_SOURCES = {
    'Barracks': 'Unlocked Unit',
    'Dark Barracks': 'Unlocked Unit',
    'Spell Factory': 'Spell(s) Unlocked',
    'Dark Spell Factory': 'Spell(s) Unlocked',
    'Workshop': 'Unlocked Siege Machine',
}

# 中文名稱：沿用舊版資料庫已有的名稱，其餘顯示英文原名
NAME_ZH = {
    'Cannon': '加農砲', 'Archer Tower': '箭塔', 'Mortar': '迫擊砲',
    'Barbarian King': '野蠻人之王', 'Archer Queen': '弓箭女皇', 'Grand Warden': '大守護者',
    'Royal Champion': '神盾勇者', 'Minion Prince': '亡靈王子',
    'Barbarian': '野蠻人', 'Archer': '弓箭手', 'Giant': '巨人', 'Goblin': '哥布林',
    'Wall Breaker': '炸彈人', 'Balloon': '氣球兵', 'Wizard': '法師', 'Healer': '天使',
    'Dragon': '飛龍', 'P.E.K.K.A': '皮卡超人', 'Electro Dragon': '雷電龍',
    'Minion': '亡靈', 'Hog Rider': '野豬騎士', 'Valkyrie': '女武神', 'Golem': '石頭人',
    'Witch': '女巫', 'Lava Hound': '熔岩獵犬', 'Bowler': '保齡球手',
}

COST_HEADERS = ('Build Cost', 'Upgrade Cost', 'Research Cost', 'Cost')
TIME_HEADERS = ('Build Time', 'Upgrade Time', 'Research Time')
RES_PATTERN = re.compile(r'\{\{Res\|\s*(?:RES\s*=\s*)?(Gold|Elixir|Dark Elixir)\s*(?:\|[^}]*)?\}\}')
RESOURCES = {'Gold': 'gold', 'Elixir': 'elixir', 'Dark Elixir': 'dark_elixir'}


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


def parse_buildings_menu(wikitext):
    """回傳 [(頁面標題, 名稱, 類別)]"""
    rows = menu_rows(wikitext)
    items = []
    for row, category in BUILDING_ROWS.items():
        if row == 'Traps':
            continue
        if row not in rows:
            raise WikiParseError(f'建築導覽模板找不到「{row}」列')
        text = rows[row]
        if row == 'Defensive Buildings':
            # 第一行是防禦建築；<br> 之後依序為 Crafting Station、Town Hall 武器、陷阱
            parts = re.split(r'<br\s*/?>', text)
            text = parts[0]
            traps = [p for p in parts if "{{H|Traps}}" in p]
            if not traps:
                raise WikiParseError('建築導覽模板找不到陷阱')
            items += [(t, n, 'trap') for t, n in menu_links(traps[0].split("'''", 2)[-1])]
        items += [(t, n, category) for t, n in menu_links(text)]
    return [i for i in items if i[1] not in SKIP]


def parse_troops_menu(wikitext):
    """回傳 ([(頁面標題, 名稱, 類型)], [(頁面標題, 名稱)])"""
    rows = menu_rows(wikitext)
    units = []
    for row, unit_type in UNIT_ROWS.items():
        if row not in rows:
            raise WikiParseError(f'兵種導覽模板找不到「{row}」列')
        units += [(t, n, unit_type) for t, n in menu_links(rows[row])]
    hero_block = rows.get(HERO_ROW)
    if hero_block is None:
        raise WikiParseError('兵種導覽模板找不到英雄列')
    heroes = [(m.group(1), m.group(1)) for m in re.finditer(r"'''\[\[([^\]|]+)\]\]'''", hero_block)]
    if not heroes:
        raise WikiParseError('兵種導覽模板找不到英雄')
    return units, heroes


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


def _find_index(headers, names, exact=True):
    for i, header in enumerate(headers):
        h = header.replace('*', '').strip()
        if (h in names) if exact else any(h.startswith(n) for n in names):
            return i
    return None


def parse_level_table(wikitext, requirement):
    """
    解析頁面上第一張「Level」等級表。
    requirement：'Town Hall Level Required' 或 'Laboratory Level Required'。
    回傳 {levels: [...], resource, alt_resource}
    """
    for table in iter_tables(wikitext):
        try:
            headers, raw_headers, rows = parse_table_full(table)
        except WikiParseError:
            continue
        first = headers[0].replace('*', '').strip() if headers else ''
        if first not in ('Level', 'TH Level'):
            continue
        cost_idx = _find_index(headers, COST_HEADERS)
        if cost_idx is None:
            continue
        is_town_hall = first == 'TH Level'
        return _rows_to_levels(headers, raw_headers, rows, cost_idx, requirement, is_town_hall)
    raise WikiParseError('找不到等級表')


def _rows_to_levels(headers, raw_headers, rows, cost_idx, requirement, is_town_hall):
    res = RES_PATTERN.search(raw_headers[cost_idx])
    if not res:
        raise WikiParseError(f'無法判斷費用的資源種類：{raw_headers[cost_idx]!r}')
    resource = RESOURCES[res.group(1)]
    # 城牆等可改用另一種資源支付（第二個「Cost」欄）
    alt_resource = None
    for i in range(cost_idx + 1, len(headers)):
        if headers[i].replace('*', '').strip() == 'Cost':
            alt = RES_PATTERN.search(raw_headers[i])
            if alt and RESOURCES[alt.group(1)] != resource:
                alt_resource = RESOURCES[alt.group(1)]
            break

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
        entry = {
            'level': level,
            'cost': _int_or_none(row[cost_idx]),
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
    return {'levels': levels, 'resource': resource, 'alt_resource': alt_resource}


def parse_requirement_map(wikitext, value_header):
    """
    解析「等級 → 需要的大本營等級」或「解鎖項目 → 大本營等級」。
    value_header 為 None 時回傳 {等級: 大本營等級}，否則回傳 {解鎖項目名稱: 大本營等級}。
    """
    for table in iter_tables(wikitext):
        try:
            headers, _raw, rows = parse_table_full(table)
        except WikiParseError:
            continue
        if not headers or headers[0] != 'Level':
            continue
        th_idx = _find_index(headers, ('Town Hall Level Required',))
        value_idx = _find_index(headers, (value_header,)) if value_header else 0
        if th_idx is None or value_idx is None:
            continue
        result = {}
        for row in rows:
            if len(row) < len(headers):
                continue
            th = _int_or_none(row[th_idx])
            if value_header is None:
                result[to_int(row[0])] = th
            else:
                for _title, name in menu_links(row[value_idx]):
                    result.setdefault(name, th)
        if result:
            return result
    raise WikiParseError(f'找不到需要大本營等級的表格（{value_header}）')


# ---------------------------------------------------------------- 彙整

def slug(name):
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


def collect(fetch=fetch_many):
    menus = fetch([BUILDINGS_MENU, TROOPS_MENU, LABORATORY, *UNLOCK_SOURCES])
    for title in (BUILDINGS_MENU, TROOPS_MENU, LABORATORY, *UNLOCK_SOURCES):
        if title not in menus:
            raise WikiParseError(f'找不到頁面：{title}')

    buildings = parse_buildings_menu(menus[BUILDINGS_MENU])
    units, heroes = parse_troops_menu(menus[TROOPS_MENU])
    pages = fetch([t for t, *_ in buildings + units + heroes])

    def page(title):
        if title not in pages:
            raise WikiParseError(f'找不到頁面：{title}')
        return pages[title]

    errors = []

    def safe(name, func):
        try:
            return func()
        except WikiParseError as e:
            errors.append(f'{name}：{e}')
            return None

    data = {'buildings': [], 'heroes': [], 'units': []}

    for title, name, category in buildings:
        table = safe(name, lambda: parse_level_table(page(title), 'Town Hall Level Required'))
        if table:
            data['buildings'].append({'key': slug(name), 'name': name, 'name_zh': NAME_ZH.get(name),
                                      'category': category, 'wiki': title, **table})

    for title, name in heroes:
        table = safe(name, lambda: parse_level_table(page(title), 'Town Hall Level Required'))
        if table:
            data['heroes'].append({'key': slug(name), 'name': name, 'name_zh': NAME_ZH.get(name),
                                   'wiki': title, **table})

    unlock = {}
    for source, header in UNLOCK_SOURCES.items():
        for unit, th in parse_requirement_map(menus[source], header).items():
            unlock.setdefault(unit, th)

    for title, name, unit_type in units:
        table = safe(name, lambda: parse_level_table(page(title), 'Laboratory Level Required'))
        if table:
            if name not in unlock:
                errors.append(f'{name}：找不到解鎖的大本營等級')
                continue
            data['units'].append({'key': slug(name), 'name': name, 'name_zh': NAME_ZH.get(name),
                                  'type': unit_type, 'unlock_th': unlock[name], 'wiki': title, **table})

    data['laboratory'] = {str(k): v for k, v in parse_requirement_map(menus[LABORATORY], None).items()}
    town_hall = next((b for b in data['buildings'] if b['name'] == 'Town Hall'), None)
    if town_hall is None:
        errors.append('找不到 Town Hall')
    else:
        data['town_hall_max'] = town_hall['levels'][-1]['level']

    if errors:
        raise WikiParseError('以下項目解析失敗：\n  ' + '\n  '.join(errors))
    validate(data)
    return data


def validate(data):
    """基本檢查；不合理時中止，避免寫入錯誤資料"""
    minimum = {'buildings': 40, 'heroes': 5, 'units': 40}
    for key, count in minimum.items():
        if len(data[key]) < count:
            raise WikiParseError(f'{key} 只有 {len(data[key])} 項，少於預期的 {count} 項')
    keys = [i['key'] for group in ('buildings', 'heroes', 'units') for i in data[group]]
    duplicates = {k for k in keys if keys.count(k) > 1}
    if duplicates:
        raise WikiParseError(f'重複的項目：{sorted(duplicates)}')
    for group in ('buildings', 'heroes', 'units'):
        for item in data[group]:
            costs = [lv['cost'] for lv in item['levels'] if lv['cost'] is not None]
            if not costs:
                raise WikiParseError(f'{item["name"]} 沒有任何費用資料')
            if any(c < 0 for c in costs):
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
