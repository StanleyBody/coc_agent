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
|'''[[Barbarian King]]''': [[Rage Vial]]{{Clr}}
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

LAB_TABLE = """{| class="wikitable"
!Level!!Hitpoints!!Build Cost<br/>{{Res|Elixir}}!!Build Time!!Town Hall Level Required
|-
|1||500||5,000||1m||3
|-
|2||550||25,000||5m||4
|}"""

BARRACKS_TABLE = """{| class="wikitable"
!Level!!Unlocked Unit!!Build Cost<br/>{{Res|Elixir}}!!Town Hall Level Required
|-
|1||[[Barbarian]]||100||1
|-
|2||{{H|Archer}}||500||1
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
        units, heroes = u.parse_troops_menu(TROOPS_MENU)
        self.assertEqual([n for _, n, _ in units],
                         ['Barbarian', 'Yeti', 'Golem', 'Lightning Spell', 'Poison Spell', 'Wall Wrecker'])
        self.assertEqual(units[0], ('Barbarian/Home Village', 'Barbarian', 'elixir_troop'))
        self.assertEqual(heroes, [('Barbarian King', 'Barbarian King'), ('Grand Warden', 'Grand Warden')])

    def test_missing_row(self):
        with self.assertRaises(wikilib.WikiParseError):
            u.parse_troops_menu(TROOPS_MENU.replace("'''[[Siege Machines]]'''", "'''[[Siege]]'''"))


class LevelTableTests(unittest.TestCase):
    def test_colspan_header(self):
        t = u.parse_level_table(COLSPAN_TABLE, 'Town Hall Level Required')
        self.assertEqual(t['resource'], 'gold')
        self.assertEqual(t['levels'][0], {'level': 1, 'cost': 1000000, 'time': 43200, 'required': 10,
                                          'hp': 1500.0, 'dps': 30.0})
        self.assertEqual(t['levels'][1]['time'], 86400)

    def test_town_hall_requirement_is_level(self):
        t = u.parse_level_table(TOWN_HALL_TABLE, 'Town Hall Level Required')
        self.assertEqual([(lv['level'], lv['cost'], lv['required']) for lv in t['levels']],
                         [(1, None, 1), (2, 1000, 2)])

    def test_troop_with_merged_na(self):
        t = u.parse_level_table(TROOP_TABLE, 'Laboratory Level Required')
        self.assertEqual(t['resource'], 'dark_elixir')
        self.assertEqual(t['levels'][0]['cost'], None)
        self.assertEqual(t['levels'][1], {'level': 2, 'cost': 14000, 'time': 172800, 'required': 7, 'hp': 6500.0})

    def test_wall_alt_resource(self):
        t = u.parse_level_table(WALL_TABLE, 'Town Hall Level Required')
        self.assertEqual((t['resource'], t['alt_resource']), ('gold', 'elixir'))
        self.assertEqual([lv['cost'] for lv in t['levels']], [0, 1000])

    def test_missing_requirement_column(self):
        with self.assertRaises(wikilib.WikiParseError):
            u.parse_level_table(LAB_TABLE, 'Laboratory Level Required')


class RequirementMapTests(unittest.TestCase):
    def test_level_to_town_hall(self):
        self.assertEqual(u.parse_requirement_map(LAB_TABLE, None), {1: 3, 2: 4})

    def test_unlocked_unit(self):
        self.assertEqual(u.parse_requirement_map(BARRACKS_TABLE, 'Unlocked Unit'), {'Barbarian': 1, 'Archer': 1})


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
            u.BUILDINGS_MENU: BUILDINGS_MENU, u.TROOPS_MENU: TROOPS_MENU, u.LABORATORY: LAB_TABLE,
            **{name: BARRACKS_TABLE.replace('Unlocked Unit', header) for name, header in u.UNLOCK_SOURCES.items()},
            'Cannon/Home Village': COLSPAN_TABLE,
        }
        with self.assertRaises(wikilib.WikiParseError) as ctx:
            u.collect(fetch=fake_fetch(pages))
        message = str(ctx.exception)
        self.assertIn('Mortar：找不到頁面', message)
        self.assertIn('Wall Wrecker：找不到頁面', message)

    def test_render_has_metadata(self):
        rendered = json.loads(u.render({'buildings': []}))
        self.assertEqual(rendered['generated_by'], u.GENERATED_BY)


if __name__ == '__main__':
    unittest.main()
