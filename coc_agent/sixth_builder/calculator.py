"""
第六工人（B.O.B）資源計算

資料來源：Clash of Clans Fandom Wiki（B.O.B Control 及各建築頁面，2026-11 擷取）。
B.O.B Control 升級條件中，與夜世界建築有關的部分：
  - Gear Up 需要：雙管加農砲 Lv4、箭塔 Lv6、多管迫擊砲 Lv8
  - 任一兵種升到 Lv18：需要星空實驗室 Lv9；以 Baby Dragon 為例需要訓練營 Lv6
  - 任一防禦建築升到 Lv9：以多管迫擊砲為例（同時滿足 Lv8 的條件）
未計入：兵種研究費用、英雄等級（合計 45 級）、主世界的 Gear Up 費用。
"""
import math

GOLD = 'gold'
ELIXIR = 'elixir'

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
        'target': 6,
        'reason': '解鎖 Baby Dragon（用來研究到 Lv18）',
        'costs': [1_000, 4_000, 10_000, 25_000, 100_000, 150_000,
                  300_000, 500_000, 1_000_000, 1_500_000, 2_000_000, 3_000_000],
    },
]

BOB_CONTROL_COST = 100_000  # 建造 B.O.B Control（金幣）

RESOURCE_NAMES = {GOLD: '金幣', ELIXIR: '聖水'}


def upgrade_cost(costs, current, target):
    """由 current 升到 target 的總費用；已達標回傳 0"""
    if current >= target:
        return 0
    return sum(costs[current:target])


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


def _resource_summary(resource, items, current, capacity, rate):
    needed_items = [i for i in items if i['resource'] == resource and i['cost'] > 0]
    total = sum(i['cost'] for i in needed_items)
    shortage = max(total - current, 0)
    # 單次升級中最貴的一筆（多級升級是分次付款，只看單級費用）
    max_single = max((i['max_single'] for i in needed_items), default=0)

    if shortage == 0:
        hours = 0
        time_text = '已足夠'
    elif rate > 0:
        hours = shortage / rate
        time_text = format_hours(hours)
    else:
        hours = None
        time_text = '每小時產量為 0，無法估算'

    return {
        'resource': resource,
        'name': RESOURCE_NAMES[resource],
        'total': total,
        'current': current,
        'capacity': capacity,
        'shortage': shortage,
        'rate': rate,
        'hours': hours,
        'time_text': time_text,
        'max_single': max_single,
        'capacity_ok': capacity >= max_single,
    }


def calculate(data):
    """
    data 需包含：
      各建築 key 的目前等級、bob_control_built、
      gold_current / gold_capacity / elixir_current / elixir_capacity、
      gold_rate / elixir_rate、player_tag
    """
    items = []
    for b in BUILDINGS:
        current = data[b['key']]
        cost = upgrade_cost(b['costs'], current, b['target'])
        max_single = max(b['costs'][current:b['target']], default=0)
        items.append({
            'key': b['key'],
            'name': b['name'],
            'resource': b['resource'],
            'resource_name': RESOURCE_NAMES[b['resource']],
            'current': current,
            'target': b['target'],
            'reason': b['reason'],
            'cost': cost,
            'max_single': max_single,
            'done': cost == 0,
        })

    if not data.get('bob_control_built'):
        items.insert(0, {
            'key': 'bob_control',
            'name': 'B.O.B Control（建造）',
            'resource': GOLD,
            'resource_name': RESOURCE_NAMES[GOLD],
            'current': 0,
            'target': 1,
            'reason': '需要 Builder Hall Lv9',
            'cost': BOB_CONTROL_COST,
            'max_single': BOB_CONTROL_COST,
            'done': False,
        })

    gold = _resource_summary(GOLD, items, data['gold_current'],
                             data['gold_capacity'], data['gold_rate'])
    elixir = _resource_summary(ELIXIR, items, data['elixir_current'],
                               data['elixir_capacity'], data['elixir_rate'])

    known_hours = [r['hours'] for r in (gold, elixir) if r['hours'] is not None]
    if gold['hours'] is None or elixir['hours'] is None:
        overall_text = '無法估算（有資源每小時產量為 0）'
    else:
        overall_text = '已足夠' if max(known_hours) == 0 else format_hours(max(known_hours))

    return {
        'player_tag': data['player_tag'],
        'items': items,
        'gold': gold,
        'elixir': elixir,
        'overall_text': overall_text,
    }
