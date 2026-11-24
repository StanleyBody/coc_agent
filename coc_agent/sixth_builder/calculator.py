"""
第六工人（B.O.B）資源計算

資料來源：Clash of Clans Fandom Wiki（B.O.B Control 及各建築頁面，2026-11 擷取）。
B.O.B Control 升級條件中，與夜世界建築有關的部分：
  - Gear Up 需要：雙管加農砲 Lv4、箭塔 Lv6、多管迫擊砲 Lv8
  - 任一兵種升到 Lv18：需要星空實驗室 Lv9；以 Night Witch 為例需要訓練營 Lv8
  - 任一防禦建築升到 Lv9：以多管迫擊砲為例（同時滿足 Lv8 的條件）
金庫／聖水瓶：Builder Hall 加上兩座倉庫的容量，要能容納單次最高的升級費用。
假設玩家目前沒有任何資源。
未計入：兵種研究費用、英雄等級（合計 45 級）、主世界的 Gear Up 費用。
"""
import math

GOLD = 'gold'
ELIXIR = 'elixir'

RESOURCE_NAMES = {GOLD: '金幣', ELIXIR: '聖水'}

# costs[i] = 由 Lv i 升到 Lv i+1 的費用（costs[0] 為建造 Lv1 的費用）
BUILDINGS = [
    {
        'key': 'double_cannon',
        'name': '雙管加農砲',
        'resource': GOLD,
        'target': 4,
        'reason': 'Gear Up 加農砲',
        'costs': [20_000, 50_000, 80_000, 300_000, 900_000,
                  1_400_000, 2_200_000, 3_200_000, 4_200_000, 5_200_000],
    },
    {
        'key': 'archer_tower',
        'name': '箭塔',
        'resource': GOLD,
        'target': 6,
        'reason': 'Gear Up 箭塔',
        'costs': [12_000, 30_000, 60_000, 250_000, 800_000,
                  1_200_000, 2_000_000, 2_800_000, 3_600_000, 4_600_000],
    },
    {
        'key': 'multi_mortar',
        'name': '多管迫擊砲',
        'resource': GOLD,
        'target': 9,
        'reason': 'Gear Up 迫擊砲（Lv8）＋ 任一防禦建築 Lv9',
        'costs': [600_000, 700_000, 800_000, 1_000_000, 1_200_000,
                  1_600_000, 2_500_000, 3_500_000, 4_500_000, 5_500_000],
    },
    {
        'key': 'star_laboratory',
        'name': '星空實驗室',
        'resource': ELIXIR,
        'target': 9,
        'reason': '任一兵種研究到 Lv18',
        'costs': [1_000, 15_000, 50_000, 300_000, 700_000,
                  1_000_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000],
    },
    {
        'key': 'builder_barracks',
        'name': '訓練營',
        'resource': ELIXIR,
        'target': 8,
        'reason': '解鎖 Night Witch（用來研究到 Lv18）',
        'costs': [1_000, 4_000, 10_000, 25_000, 100_000, 150_000,
                  300_000, 500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000],
    },
]

# 金庫與聖水瓶的每級容量與升級費用（兩者數值相同，付款資源相反）
STORAGE_CAPACITY = [70_000, 150_000, 250_000, 350_000, 600_000,
                    800_000, 1_200_000, 1_600_000, 2_000_000, 2_500_000]
STORAGE_COSTS = [20_000, 80_000, 200_000, 300_000, 600_000,
                 1_000_000, 1_500_000, 2_000_000, 2_500_000, 3_200_000]

STORAGES = {
    # stores：儲存的資源；resource：升級要付的資源
    GOLD: {'key': 'gold_storage', 'name': '金庫', 'stores': GOLD, 'resource': ELIXIR},
    ELIXIR: {'key': 'elixir_storage', 'name': '聖水瓶', 'stores': ELIXIR, 'resource': GOLD},
}

# B.O.B Control 需要 Builder Hall 9；Builder Hall 9 與 10 本身各可存 1,500,000
BUILDER_HALL_CAPACITY = 1_500_000
BOB_CONTROL_COST = 100_000  # 建造 B.O.B Control（金幣）


def upgrade_cost(costs, current, target):
    """由 current 升到 target 的總費用；已達標回傳 0"""
    if current >= target:
        return 0
    return sum(costs[current:target])


def storage_capacity(level):
    return STORAGE_CAPACITY[level - 1] if level > 0 else 0


def total_capacity(levels):
    return BUILDER_HALL_CAPACITY + sum(storage_capacity(lv) for lv in levels)


def plan_storages(levels, need, max_level):
    """
    每次升級等級最低的一座，直到總容量 >= need。
    回傳 (升級後等級, 是否達成)。
    """
    levels = list(levels)
    while total_capacity(levels) < need:
        i = levels.index(min(levels))
        if levels[i] >= max_level:
            return levels, False
        levels[i] += 1
    return levels, True


def format_hours(hours):
    """小時數 → 「X 天 Y 小時 Z 分」"""
    total_minutes = math.ceil(hours * 60)
    days, rem = divmod(total_minutes, 24 * 60)
    hrs, mins = divmod(rem, 60)
    parts = []
    if days:
        parts.append(f'{days} 天')
    if hrs:
        parts.append(f'{hrs} 小時')
    if mins or not parts:
        parts.append(f'{mins} 分')
    return ' '.join(parts)


def _building_items(data):
    items = []
    if not data.get('bob_control_built'):
        items.append({
            'key': 'bob_control',
            'name': 'B.O.B Control（建造）',
            'resource': GOLD,
            'current': 0,
            'target': 1,
            'reason': '需要 Builder Hall Lv9',
            'cost': BOB_CONTROL_COST,
            'max_single': BOB_CONTROL_COST,
        })
    for b in BUILDINGS:
        current = data[b['key']]
        items.append({
            'key': b['key'],
            'name': b['name'],
            'resource': b['resource'],
            'current': current,
            'target': max(current, b['target']),
            'reason': b['reason'],
            'cost': upgrade_cost(b['costs'], current, b['target']),
            'max_single': max(b['costs'][current:b['target']], default=0),
        })
    return items


def _storage_items(data, building_items, max_level):
    """
    依單次最高費用決定兩種倉庫要升到幾級。
    金庫升級付聖水、聖水瓶升級付金幣，所以重複計算到結果不再變動。
    """
    base_max = {
        res: max((i['max_single'] for i in building_items if i['resource'] == res), default=0)
        for res in (GOLD, ELIXIR)
    }
    current = {
        res: [data[f"{STORAGES[res]['key']}_1"], data[f"{STORAGES[res]['key']}_2"]]
        for res in (GOLD, ELIXIR)
    }
    need = dict(base_max)
    for _ in range(5):
        plans = {res: plan_storages(current[res], need[res], max_level) for res in (GOLD, ELIXIR)}
        new_need = dict(base_max)
        for res, (targets, _ok) in plans.items():
            pay = STORAGES[res]['resource']
            for cur, tgt in zip(current[res], targets):
                single = max(STORAGE_COSTS[cur:tgt], default=0)
                new_need[pay] = max(new_need[pay], single)
        if new_need == need:
            break
        need = new_need

    items, capacity_ok = [], {}
    for res in (GOLD, ELIXIR):
        s = STORAGES[res]
        targets, ok = plans[res]
        capacity_ok[res] = ok
        for idx, (cur, tgt) in enumerate(zip(current[res], targets), start=1):
            items.append({
                'key': f"{s['key']}_{idx}",
                'name': f"{s['name']} {idx}",
                'resource': s['resource'],
                'current': cur,
                'target': tgt,
                'reason': f"容量需容納單次最高{RESOURCE_NAMES[res]}費用 {need[res]:,}",
                'cost': upgrade_cost(STORAGE_COSTS, cur, tgt),
                'max_single': max(STORAGE_COSTS[cur:tgt], default=0),
            })
    return items, need, capacity_ok


def _resource_summary(resource, items, rate, max_single, capacity_ok):
    total = sum(i['cost'] for i in items if i['resource'] == resource)
    if total == 0:
        hours, time_text = 0, '不需要'
    elif rate > 0:
        hours = total / rate
        time_text = format_hours(hours)
    else:
        hours, time_text = None, '每小時產量為 0，無法估算'
    return {
        'resource': resource,
        'name': RESOURCE_NAMES[resource],
        'storage_name': STORAGES[resource]['name'],
        'shortage': total,
        'rate': rate,
        'hours': hours,
        'time_text': time_text,
        'max_single': max_single,
        'capacity_ok': capacity_ok,
    }


def calculate(data, builder_hall_level=None):
    """
    data 需包含：各建築 key 的目前等級、gold_storage_1/2、elixir_storage_1/2、
    bob_control_built、gold_rate、elixir_rate、player_tag。
    builder_hall_level：由 API 取得時用來決定倉庫等級上限（Lv10 需要 Builder Hall 10）。
    """
    max_storage_level = 10 if (builder_hall_level or 0) >= 10 else 9

    building_items = _building_items(data)
    storage_items, need, capacity_ok = _storage_items(data, building_items, max_storage_level)
    items = building_items + storage_items
    for item in items:
        item['resource_name'] = RESOURCE_NAMES[item['resource']]
        item['done'] = item['cost'] == 0

    gold = _resource_summary(GOLD, items, data['gold_rate'], need[GOLD], capacity_ok[GOLD])
    elixir = _resource_summary(ELIXIR, items, data['elixir_rate'], need[ELIXIR], capacity_ok[ELIXIR])

    if gold['hours'] is None or elixir['hours'] is None:
        overall_text = '無法估算（有資源每小時產量為 0）'
    else:
        longest = max(gold['hours'], elixir['hours'])
        overall_text = '不需要' if longest == 0 else format_hours(longest)

    return {
        'player_tag': data['player_tag'],
        'items': items,
        'gold': gold,
        'elixir': elixir,
        'overall_text': overall_text,
        'max_storage_level': max_storage_level,
    }
