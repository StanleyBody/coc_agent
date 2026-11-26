"""執行：python -m unittest discover -s scripts"""
import json
import unittest

import update_sixth_builder_data as u

# 單行格式（例如 Double Cannon 頁面）
SINGLE_LINE_TABLE = '''{|class="wikitable"
!Level<br />{{Res|Level}}
!Hitpoints<br />{{Res|Hitpoint}}
!Build Cost<br />{{Res|GoldB}}
!Builder Hall Level Required<br />{{Res|Builder Hall}}
|-
|1||600||class="GoldPass bCost"|20,000 ||2
|-
|2||690||class="GoldPass bCost"|50,000||3
|}'''

# 多行格式、表頭含連結（例如 Star Laboratory 頁面）
MULTI_LINE_TABLE = '''{| class="wikitable"
!Level<br />{{Res|Level}}
!Hitpoints<br />{{Res|Hitpoint}}
![[Resources#Builder Elixir|Build Cost]]<br />{{Res|ElixirB}}
|-
|1
|650
|class="GoldPass bCost"|1,000*
|-
|2
|800
| class="GoldPass bCost" |15,000
|}'''

STORAGE_TABLE = '''{| class="wikitable"
!Level<br />{{Res|RES=Level}}
!Storage Capacity<br />{{Res|RES=GoldB}}
!Build Cost<br />{{Res|RES=ElixirB}}
|-
|1
|70,000
| class="GoldPass bCost" |20,000
|-
|2
|150,000
| class="GoldPass bCost" |80,000
|}'''

BUILDER_HALL_TABLE = '''{| border="0"
|+Builder Hall - Available Resources
|-
!scope="row"  |BH Level
!scope="col"  |Gold Available {{Res|GoldB}}
!scope="col"  |Elixir Available {{Res|ElixirB}}
|-
!scope="row" class="rowheader"|9
|1,500,000
|1,500,000
|-
!scope="row" class="rowheader"|10
|1,500,000
|1,500,000
|}'''

BOB_CONTROL_TEXT = '''
**Gearing up ... a level 4 [[Double Cannon]], a level 6 {{B|Archer Tower}}, and a level 8 {{B|Multi Mortar}} in the Builder Base.
**Upgrading any troop to level 18 (which requires [[Star Laboratory]] level 9).
**Upgrading any defensive building in the Builder Base to level 9.
**Upgrading the [[Battle Machine]] and [[Battle Copter]] to a combined level of 45.
{| class="wikitable"
!Hitpoints {{Res|Hitpoint}}!!Build Cost {{Res|GoldB}}!!Build Time {{Res|Time}}!!Builder Hall Level Required {{Res|Builder Hall}}
|-
|250||class="GoldPass bCost"|100,000||None||9
|}'''

TROOP_TABLE = '''{| class="wikitable"
!Level<br />{{Res|Level}}
!Hitpoints<br />{{Res|Hitpoint}}
![[Resources#Builder Elixir|Research Cost]]<br />{{Res|ElixirB}}
![[Star Laboratory|Research Time]]<br />{{Res|Time}}
![[Star Laboratory]] Level Required<br />{{Res|Star Laboratory}}
|-
|9
|750
|N/A
|N/A
|N/A
|-
|10
|750
|class="GoldPass bCost"|1,400,000
|class="GoldPass bTime"|2d
|6
|-
|11
|830
|class="GoldPass bCost"|1,600,000
|class="GoldPass bTime"|2d
|class="change-highlight"|7
|}'''

HERO_TABLE = '''{| class="wikitable"
!Level<br />{{Res|Level}}
!Ability Level<br />{{Res|Ability}}
![[Resource Buildings/Builder Base#Builder Elixir|Upgrade Cost]]<br />{{Res|ElixirB}}
!Upgrade Time<br />{{Res|Time}}
![[Builder Hall]] Level Required<br />{{Res|Builder Hall}}
|-
|15||1|||class="GoldPass bCost"|2,500,000||N/A||8
|-
|16||1|||class="GoldPass bCost"|2,600,000|||class="GoldPass bTime"|5d||class="change-highlight"|9
|}'''

NIGHT_WITCH_TEXT = 'which is unlocked by upgrading the [[Builder Barracks]] to level 8, which requires'


class TableParseTests(unittest.TestCase):
    def test_single_line(self):
        self.assertEqual(u.level_table(SINGLE_LINE_TABLE, 'Build Cost'), {'Build Cost': [20000, 50000]})

    def test_multi_line_with_link_header(self):
        self.assertEqual(u.level_table(MULTI_LINE_TABLE, 'Build Cost'), {'Build Cost': [1000, 15000]})

    def test_two_columns(self):
        self.assertEqual(u.level_table(STORAGE_TABLE, 'Storage Capacity', 'Build Cost'),
                         {'Storage Capacity': [70000, 150000], 'Build Cost': [20000, 80000]})

    def test_non_contiguous_levels(self):
        broken = SINGLE_LINE_TABLE.replace('|2||690', '|3||690')
        with self.assertRaises(u.WikiParseError):
            u.level_table(broken, 'Build Cost')

    def test_missing_table(self):
        with self.assertRaises(u.WikiParseError):
            u.level_table('no tables here', 'Build Cost')

    def test_builder_hall_capacity(self):
        self.assertEqual(u.parse_builder_hall_capacity(BUILDER_HALL_TABLE), {'9': 1500000, '10': 1500000})


class RequirementTests(unittest.TestCase):
    def test_bob_control(self):
        self.assertEqual(u.parse_bob_control(BOB_CONTROL_TEXT), {
            'build_cost': 100000, 'builder_hall': 9,
            'double_cannon': 4, 'archer_tower': 6, 'multi_mortar': 8,
            'troop_level': 18, 'star_laboratory': 9, 'defense_level': 9, 'hero_total': 45,
        })

    def test_bob_control_wording_changed(self):
        with self.assertRaises(u.WikiParseError):
            u.parse_bob_control(BOB_CONTROL_TEXT.replace('Upgrading any troop', 'Research any unit'))

    def test_troop_table_starts_at_unlock_level(self):
        self.assertEqual(u.troop_table(TROOP_TABLE),
                         {'first_level': 9, 'costs': [1400000, 1600000], 'required': [6, 7]})

    def test_hero_table_includes_build_cost(self):
        self.assertEqual(u.hero_table(HERO_TABLE),
                         {'first_level': 15, 'costs': [2500000, 2600000], 'required': [8, 9]})

    def test_level_table_requires_level_1(self):
        with self.assertRaises(u.WikiParseError):
            u.level_table(HERO_TABLE, 'Upgrade Cost')

    def test_night_witch(self):
        self.assertEqual(u.parse_night_witch(NIGHT_WITCH_TEXT), 8)


def sample_data():
    storage = {'capacity': [70000, 150000], 'costs': [20000, 80000]}
    return {
        'buildings': {
            'double_cannon': [1] * 4, 'archer_tower': [1] * 6, 'multi_mortar': [1] * 9,
            'star_laboratory': [1] * 9, 'builder_barracks': [1] * 8,
        },
        'storages': {'gold_storage': dict(storage), 'elixir_storage': dict(storage)},
        'builder_hall_capacity': {'9': 1500000, '10': 1500000},
        'bob_control': u.parse_bob_control(BOB_CONTROL_TEXT),
        'night_witch_barracks': 8,
        'night_witch': {'first_level': 9, 'costs': [1] * 11, 'required': [6, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10]},
        'heroes': {
            'battle_machine': {'first_level': 1, 'costs': [1] * 35, 'required': [5] * 25 + [9] * 5 + [10] * 5},
            'battle_copter': {'first_level': 15, 'costs': [1] * 21, 'required': [8] * 11 + [9] * 5 + [10] * 5},
        },
    }


class ValidateTests(unittest.TestCase):
    def test_valid(self):
        u.validate(sample_data())

    def test_too_few_levels(self):
        data = sample_data()
        data['buildings']['multi_mortar'] = [1] * 8
        with self.assertRaises(u.WikiParseError):
            u.validate(data)

    def test_night_witch_needs_higher_lab(self):
        data = sample_data()
        data['night_witch']['required'][8] = 10
        with self.assertRaises(u.WikiParseError):
            u.validate(data)

    def test_hero_total_unreachable(self):
        data = sample_data()
        data['bob_control']['hero_total'] = 99
        with self.assertRaises(u.WikiParseError):
            u.validate(data)

    def test_storages_differ(self):
        data = sample_data()
        data['storages']['elixir_storage'] = {'capacity': [1, 2], 'costs': [1, 2]}
        with self.assertRaises(u.WikiParseError):
            u.validate(data)


class RenderTests(unittest.TestCase):
    def test_render_is_json_with_metadata(self):
        data = sample_data()
        rendered = json.loads(u.render(data))
        self.assertEqual(rendered['generated_by'], u.GENERATED_BY)
        self.assertEqual({k: v for k, v in rendered.items() if k not in ('generated_by', 'source')}, data)


if __name__ == '__main__':
    unittest.main()
