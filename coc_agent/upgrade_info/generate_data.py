"""Generate complete upgrade data JSON files for TH18 - Split into separate files"""
import json
import os

# Output directory
OUTPUT_DIR = r"d:\Programming\ClashOfClans\coc_agent\coc_agent\upgrade_info\static\data"

# Categories data (shared)
categories = {
    "building_categories": [
        {"id": 1, "name": "防禦建築", "name_en": "Defense", "icon": "🛡️", "order": 1},
        {"id": 2, "name": "資源建築", "name_en": "Resources", "icon": "💰", "order": 2},
        {"id": 3, "name": "軍事建築", "name_en": "Army", "icon": "⚔️", "order": 3},
        {"id": 4, "name": "其他建築", "name_en": "Other", "icon": "🏠", "order": 4}
    ],
    "troop_types": [
        {"id": 1, "name": "聖水兵種", "name_en": "Elixir Troops", "icon": "💧", "order": 1},
        {"id": 2, "name": "暗黑兵種", "name_en": "Dark Troops", "icon": "⚫", "order": 2},
        {"id": 3, "name": "法術", "name_en": "Spells", "icon": "✨", "order": 3},
        {"id": 4, "name": "攻城機器", "name_en": "Siege Machines", "icon": "🏰", "order": 4}
    ]
}

# Helper function
def gen_levels(base_cost, cost_mult, base_time, time_mult, th_start, count, cost_type="gold"):
    levels = []
    for i in range(count):
        lv = i + 1
        th = min(18, th_start + i // 3)
        cost = int(base_cost * (cost_mult ** i))
        time = int(base_time * (time_mult ** i))
        level = {"level": lv, "build_time": time, "th_required": th, "hp": 400 + lv * 100, "dps": 8 + lv * 5}
        if cost_type == "gold":
            level["gold_cost"] = cost
        elif cost_type == "elixir":
            level["elixir_cost"] = cost
        else:
            level["dark_elixir_cost"] = cost
        levels.append(level)
    return levels

# ===== BUILDINGS =====
buildings_data = {"building_categories": categories["building_categories"], "buildings": []}

defenses = [
    ("加農砲", "Cannon", 22, 1),
    ("箭塔", "Archer Tower", 22, 1),
    ("迫擊砲", "Mortar", 16, 1),
    ("防空火箭", "Air Defense", 14, 1),
    ("法師塔", "Wizard Tower", 16, 1),
    ("電磁塔", "Inferno Tower", 10, 1),
    ("X連弩", "X-Bow", 11, 1),
    ("天鷹火砲", "Eagle Artillery", 7, 1),
    ("投石砲", "Scattershot", 5, 1),
]

for idx, (name, name_en, max_lv, cat) in enumerate(defenses, 1):
    buildings_data["buildings"].append({
        "id": idx, "name": name, "name_en": name_en, "category_id": cat, "max_level": max_lv,
        "levels": gen_levels(1000 * (idx+1), 1.5, 60 * (idx+1), 1.4, 1 + idx//3, max_lv, "gold")
    })

resources = [
    ("金礦", "Gold Mine", 16, 2),
    ("聖水收集器", "Elixir Collector", 16, 2),
    ("暗黑聖水鑽井", "Dark Elixir Drill", 10, 2),
    ("金幣儲存庫", "Gold Storage", 17, 2),
    ("聖水儲存庫", "Elixir Storage", 17, 2),
]

for idx, (name, name_en, max_lv, cat) in enumerate(resources, 20):
    buildings_data["buildings"].append({
        "id": idx, "name": name, "name_en": name_en, "category_id": cat, "max_level": max_lv,
        "levels": gen_levels(500 * idx, 1.4, 30 * idx, 1.35, 1, max_lv, "elixir")
    })

army = [
    ("兵營", "Barracks", 17, 3),
    ("暗黑兵營", "Dark Barracks", 11, 3),
    ("實驗室", "Laboratory", 14, 3),
    ("法術工廠", "Spell Factory", 8, 3),
    ("攻城機器工廠", "Workshop", 7, 3),
]

for idx, (name, name_en, max_lv, cat) in enumerate(army, 30):
    buildings_data["buildings"].append({
        "id": idx, "name": name, "name_en": name_en, "category_id": cat, "max_level": max_lv,
        "levels": gen_levels(1000 * idx, 1.45, 60 * idx, 1.4, 1, max_lv, "elixir")
    })

# ===== HEROES =====
heroes_data = {"heroes": []}

heroes_list = [
    ("蠻王", "Barbarian King", 100, 7),
    ("弓箭女皇", "Archer Queen", 100, 9),
    ("大乾爹", "Grand Warden", 75, 11),
    ("皇家鬥士", "Royal Champion", 50, 13),
    ("小乖", "Minion Prince", 45, 16),
]

for idx, (name, name_en, max_lv, unlock) in enumerate(heroes_list, 1):
    levels = []
    for lv in range(1, max_lv + 1):
        th = unlock + (lv - 1) // 10
        if th > 18: th = 18
        levels.append({
            "level": lv,
            "dark_elixir_cost": 10000 + lv * 5000,
            "upgrade_time": lv * 14400,
            "th_required": th,
            "hp": 1500 + lv * 80,
            "dps": 100 + lv * 8,
            "ability_damage": 200 + lv * 15
        })
    heroes_data["heroes"].append({
        "id": idx, "name": name, "name_en": name_en, "max_level": max_lv, "unlock_th": unlock, "levels": levels
    })

# ===== TROOPS =====
troops_data = {"troop_types": categories["troop_types"], "troops": []}

troops_list = [
    ("野蠻人", "Barbarian", 12, 1, 1),
    ("弓箭手", "Archer", 12, 1, 1),
    ("巨人", "Giant", 12, 5, 1),
    ("哥布林", "Goblin", 10, 1, 1),
    ("炸彈人", "Wall Breaker", 12, 2, 1),
    ("氣球兵", "Balloon", 11, 5, 1),
    ("法師", "Wizard", 12, 4, 1),
    ("天使", "Healer", 9, 14, 1),
    ("飛龍", "Dragon", 11, 20, 1),
    ("皮卡超人", "P.E.K.K.A", 11, 25, 1),
    ("亡靈", "Minion", 12, 2, 2),
    ("野豬騎士", "Hog Rider", 13, 5, 2),
    ("女武神", "Valkyrie", 11, 8, 2),
    ("石頭人", "Golem", 13, 30, 2),
    ("女巫", "Witch", 7, 12, 2),
    ("熔岩獵犬", "Lava Hound", 8, 30, 2),
    ("保齡球手", "Bowler", 8, 6, 2),
    ("雷電龍", "Electro Dragon", 8, 30, 1),
]

for idx, (name, name_en, max_lv, space, type_id) in enumerate(troops_list, 1):
    levels = []
    for lv in range(1, max_lv + 1):
        lab = 1 + (lv - 1) // 2
        if lab > 14: lab = 14
        level = {
            "level": lv,
            "upgrade_time": lv * 43200,
            "lab_required": lab,
            "dps": 10 + lv * 5 + space,
            "hp": 20 + lv * 10 + space * 5
        }
        if type_id == 2:
            level["dark_elixir_cost"] = 5000 + lv * 10000
        else:
            level["elixir_cost"] = 50000 + lv * 500000
        levels.append(level)
    troops_data["troops"].append({
        "id": idx, "name": name, "name_en": name_en, "type_id": type_id, 
        "max_level": max_lv, "housing_space": space, "levels": levels
    })

# ===== SPELLS =====
spells_data = {"spells": []}

spells_list = [
    ("雷電法術", "Lightning Spell", 10, 2, 3),
    ("治療法術", "Healing Spell", 9, 2, 3),
    ("狂暴法術", "Rage Spell", 6, 2, 3),
    ("跳躍法術", "Jump Spell", 5, 2, 3),
    ("冰凍法術", "Freeze Spell", 7, 1, 3),
    ("隱形法術", "Invisibility Spell", 5, 1, 3),
    ("毒藥法術", "Poison Spell", 9, 1, 3),
    ("地震法術", "Earthquake Spell", 5, 1, 3),
    ("急速法術", "Haste Spell", 5, 1, 3),
    ("骷髏法術", "Skeleton Spell", 8, 1, 3),
    ("蝙蝠法術", "Bat Spell", 6, 1, 3),
]

for idx, (name, name_en, max_lv, space, type_id) in enumerate(spells_list, 1):
    levels = []
    for lv in range(1, max_lv + 1):
        lab = 1 + (lv - 1)
        if lab > 14: lab = 14
        level = {
            "level": lv,
            "upgrade_time": lv * 86400,
            "lab_required": lab,
            "elixir_cost": 100000 + lv * 500000
        }
        levels.append(level)
    spells_data["spells"].append({
        "id": idx, "name": name, "name_en": name_en, "type_id": type_id, 
        "max_level": max_lv, "housing_space": space, "levels": levels
    })

# Write JSON files
def write_json(filename, data):
    filepath = os.path.join(OUTPUT_DIR, filename)
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"[OK] Generated: {filename}")

write_json("buildings.json", buildings_data)
write_json("heroes.json", heroes_data)
write_json("troops.json", troops_data)
write_json("spells.json", spells_data)

print("\n[SUCCESS] All data files generated!")
