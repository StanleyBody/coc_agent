"""執行：python -m unittest discover -s scripts"""
import json
import unittest

import update_upgrade_data as u
import wikilib

BUILDINGS_MENU = """{|border="1" class="wikitable"
!colspan="2"|Home Village [[Buildings]]
|-
|style="width: 140px;"|'''{{H|Defensive Buildings}}'''
|{{H|Cannon}} • [[Mortar]] • {{H|Wall}}<!--
--><br>'''[[Crafting Station]]''': [[Hot Candle]]<br>'''[[Town Hall]]''': [[Town Hall/Giga Tesla|Giga Tesla]]
--><br>'''{{H|Traps}}''': [[Bomb]] • {{H|Spring Trap}}
|-
|'''{{H|Resource Buildings}}'''
|[[Town Hall]] ([[Magic Items]]) • {{H|Gold Mine}}
|-
|'''{{H|Army Buildings}}'''
|[[Laboratory]] • [[Hero Banner]]
|}"""

TROOPS_MENU = """{| class="wikitable"
|-
|'''[[Elixir Troops]]'''
|{{H|Barbarian}} • [[Yeti]] ([[Yeti/Yetimite|Yetimite]])
|-
|'''[[Dark Elixir Troops]]'''
|[[Golem]] ([[Golem/Golemite|Golemite]])
|-
|'''[[Heroes]] & [[Hero Equipment]]'''
|'''[[Barbarian King]]''': [[Rage Vial]] • [[Snake Bracelet]] ([[Snake Bracelet/Snake|Snake]]){{Clr}}
'''[[Grand Warden]]''': [[Life Gem]]{{Clr}}
|-
|'''[[Elixir Spells]]'''
|{{H|Lightning Spell}}
|-
|'''[[Dark Spells]]'''
|[[Poison Spell]]
|-
|'''[[Siege Machines]]'''
|[[Wall Wrecker]]
|-
|'''[[Pets]]'''
|[[L.A.S.S.I]] • [[Frosty]] ([[Frosty/Frostmite|Frostmite]])
|}"""

# 合併欄位的表頭（Inferno Tower 的格式）
COLSPAN_TABLE = """{| class="wikitable"
!rowspan="2"|Level
!colspan="2"|Damage per Second
!rowspan="2"|Hitpoints
!rowspan="2"|Cost<br />{{Res|Gold}}
!rowspan="2"|Build Time
!rowspan="2"|Town Hall Level Required
|-
!Initial!!After 1.5s
|-
|1||30||80||1,500||class="GoldPass bCost"|1,000,000||12h||10
|-
|2||35||90||1,800||class="GoldPass bCost"|1,200,000||1d||10
|}"""

TOWN_HALL_TABLE = """{| class="wikitable"
!TH Level!!Hitpoints!!Build Cost<br/>{{Res|RES = Gold}}!!Build Time
|-
|1||400||N/A||N/A
|-
|2||800||1,000||10s
|}"""

TROOP_TABLE = """{| class="wikitable"
!Level!!Hitpoints!![[Resources#Dark Elixir|Research Cost]]<br/>{{Res|Dark Elixir}}!!Research Time!!Laboratory Level Required
|-
|1||6,100||colspan="3"|N/A
|-
|2||6,500||14,000||2d||7
|}"""

WALL_TABLE = """{| class="wikitable"
!Level!!Hitpoints!![[Resources#Gold|Cost]]<br/>{{Res|Gold}}!!Cumulative Cost<br/>{{Res|Gold}}!![[Resources#Elixir|Cost]]<br/>{{Res|Elixir}}!!Town Hall Level Required
|-
|1||100||0||0||N/A||2
|-
|2||200||1,000||1,000||1,000||2
|}"""

EQUIPMENT_TABLE = """{|class="wikitable"
!rowspan="2"|Level<br>{{Res|Level}}
!colspan="2"|Ability Attributes
!Hero Boosts
!colspan="3"|Upgrade Cost
!rowspan="2"|[[Blacksmith]] Level Required<br>{{Res|Blacksmith}}
|-
!Slow Down<br>{{Res|Frost}}
!Duration<br>{{Res|Time}}
!Damage per Second Increase<br>{{Res|Damage}}
!Shiny Ore<br>{{Res|Shiny Ore}}
!Glowy Ore<br>{{Res|Glowy Ore}}
!Starry Ore<br>{{Res|Starry Ore}}
|-
|1||30%||0.75s||35||N/A||N/A||N/A||1
|-
|2||30%||1.00s||40||120||-||-||1
|-
|3||35%||1.00s||45||240||20||-||1
|}"""

PET_TABLE = """{| class="wikitable"
!Level!!Hitpoints!![[Resources#Dark Elixir|Upgrade Cost]]<br/>{{Res|Dark Elixir}}!!Upgrade Time!!Pet House Level Required
|-
|1||2,800||N/A||N/A||1
|-
|2||2,900||20,000||1d||1
|}"""

LAB_TABLE = """{| class="wikitable"
!Level!!Hitpoints!!Build Cost<br/>{{Res|Elixir}}!!Build Time!!Town Hall Level Required
|-
|1||500||5,000||1m||3
|-
|2||550||25,000||5m||4
|}"""



class MenuTests(unittest.TestCase):
    def test_buildings_menu(self):
        items = u.parse_buildings_menu(BUILDINGS_MENU)
        self.assertEqual(items, [
            ('Bomb', 'Bomb', 'trap'),
            ('Spring Trap/Home Village', 'Spring Trap', 'trap'),
            ('Cannon/Home Village', 'Cannon', 'defense'),
            ('Mortar', 'Mortar', 'defense'),
            ('Wall/Home Village', 'Wall', 'defense'),
            ('Town Hall', 'Town Hall', 'resource'),
            ('Gold Mine/Home Village', 'Gold Mine', 'resource'),
            ('Laboratory', 'Laboratory', 'army'),
        ])

    def test_troops_menu_skips_sub_units(self):
        menu = u.parse_troops_menu(TROOPS_MENU)
        self.assertEqual([n for _, n, _ in menu['units']],
                         ['Barbarian', 'Yeti', 'Golem', 'Lightning Spell', 'Poison Spell', 'Wall Wrecker'])
        self.assertEqual(menu['units'][0], ('Barbarian/Home Village', 'Barbarian', 'elixir_troop'))
        self.assertEqual(menu['heroes'], [('Barbarian King', 'Barbarian King'), ('Grand Warden', 'Grand Warden')])

    def test_troops_menu_equipment_and_pets(self):
        menu = u.parse_troops_menu(TROOPS_MENU)
        self.assertEqual(menu['equipment'], [
            ('Rage Vial', 'Rage Vial', 'Barbarian King'),
            ('Snake Bracelet', 'Snake Bracelet', 'Barbarian King'),
            ('Life Gem', 'Life Gem', 'Grand Warden'),
        ])
        self.assertEqual(menu['pets'], [('L.A.S.S.I', 'L.A.S.S.I'), ('Frosty', 'Frosty')])

    def test_missing_row(self):
        with self.assertRaises(wikilib.WikiParseError):
            u.parse_troops_menu(TROOPS_MENU.replace("'''[[Siege Machines]]'''", "'''[[Siege]]'''"))


class LevelTableTests(unittest.TestCase):
    def test_colspan_header(self):
        t = u.parse_level_table(COLSPAN_TABLE, 'Town Hall Level Required')
        self.assertEqual(t['resources'], ['gold'])
        self.assertEqual(t['levels'][0], {'level': 1, 'costs': {'gold': 1000000}, 'time': 43200, 'required': 10,
                                          'hp': 1500.0, 'dps': 30.0})
        self.assertEqual(t['levels'][1]['time'], 86400)

    def test_town_hall_requirement_is_level(self):
        t = u.parse_level_table(TOWN_HALL_TABLE, 'Town Hall Level Required')
        self.assertEqual([(lv['level'], lv['costs'], lv['required']) for lv in t['levels']],
                         [(1, {}, 1), (2, {'gold': 1000}, 2)])

    def test_troop_with_merged_na(self):
        t = u.parse_level_table(TROOP_TABLE, 'Laboratory Level Required')
        self.assertEqual(t['resources'], ['dark_elixir'])
        self.assertEqual(t['levels'][0]['costs'], {})
        self.assertEqual(t['levels'][1], {'level': 2, 'costs': {'dark_elixir': 14000}, 'time': 172800, 'required': 7,
                                          'hp': 6500.0})

    def test_wall_alt_resource(self):
        t = u.parse_level_table(WALL_TABLE, 'Town Hall Level Required')
        self.assertEqual((t['resources'], t['alt_resource']), (['gold'], 'elixir'))
        self.assertEqual([lv['costs'] for lv in t['levels']], [{'gold': 0}, {'gold': 1000}])

    def test_equipment_multiple_ores(self):
        t = u.parse_level_table(EQUIPMENT_TABLE, 'Blacksmith Level Required')
        self.assertEqual(t['resources'], ['shiny_ore', 'glowy_ore', 'starry_ore'])
        self.assertEqual([lv['costs'] for lv in t['levels']],
                         [{}, {'shiny_ore': 120}, {'shiny_ore': 240, 'glowy_ore': 20}])
        self.assertEqual(t['levels'][2]['time'], None)
        self.assertEqual(t['levels'][2]['required'], 1)

    def test_pet(self):
        t = u.parse_level_table(PET_TABLE, 'Pet House Level Required')
        self.assertEqual(t['levels'][1]['costs'], {'dark_elixir': 20000})
        self.assertEqual(t['levels'][1]['required'], 1)

    def test_missing_requirement_column(self):
        with self.assertRaises(wikilib.WikiParseError):
            u.parse_level_table(LAB_TABLE, 'Laboratory Level Required')


class HelperTests(unittest.TestCase):
    def test_parse_time(self):
        self.assertEqual(u.parse_time('1d 14h 30m'), 138600)
        self.assertEqual(u.parse_time('5s'), 5)
        self.assertIsNone(u.parse_time('N/A'))

    def test_slug(self):
        self.assertEqual(u.slug('P.E.K.K.A'), 'p_e_k_k_a')
        self.assertEqual(u.slug("Builder's Hut"), 'builder_s_hut')


def fake_fetch(pages):
    return lambda titles: {t: pages[t] for t in titles if t in pages}


class CollectTests(unittest.TestCase):
    def test_reports_all_failures_together(self):
        pages = {
            u.BUILDINGS_MENU: BUILDINGS_MENU, u.TROOPS_MENU: TROOPS_MENU,
            'Cannon/Home Village': COLSPAN_TABLE, 'L.A.S.S.I': PET_TABLE,
        }
        with self.assertRaises(wikilib.WikiParseError) as ctx:
            u.collect(fetch=fake_fetch(pages))
        message = str(ctx.exception)
        self.assertIn('Mortar：找不到頁面', message)
        self.assertIn('Wall Wrecker：找不到頁面', message)
        self.assertIn('Rage Vial：找不到頁面', message)
        self.assertNotIn('L.A.S.S.I', message)

    def test_render_has_metadata(self):
        rendered = json.loads(u.render({'buildings': []}))
        self.assertEqual(rendered['generated_by'], u.GENERATED_BY)


if __name__ == '__main__':
    unittest.main()
