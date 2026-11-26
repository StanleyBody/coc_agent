"""執行：python -m unittest discover -s scripts"""
import json
import unittest

import update_translations as u


def tr(en, cnt):
    return {'EN': en, 'CNT': cnt, 'CN': 'x'}


SAMPLE = {
    'TID_BUILDING_CANNON': tr('Cannon', '加農炮'),
    'TID_WARMACHINE': tr('Battle Machine', '戰爭機器'),
    'TID_GEAR_TITLE_BARBARIAN_CROWN': tr('Barbarian Puppet', '野蠻人玩偶'),
    'TID_BUILDING_CANNON_INFO': tr('A long description.', '很長的說明。'),
    'TID_ACHIEVEMENT_CLAN_GAMES_POINTS': tr('Earn <number> points in Clan Games', '在部落競賽中贏得<number>積分'),
    'TID_ACHIEVEMENT_WAR_STARS': tr('Score <number> Stars in Clan War battles', '在部落對戰中贏得<number>顆星星'),
    'TID_ACHIEVEMENT_WL_STARS': tr('Score <number> Stars in War League', '在部落對戰聯盟賽中贏得<number>顆勝利之星'),
    'TID_ACHIEVEMENT_GEAR_UP_ONE': tr('Gear Up one building', '使用建築大師改裝1個建築'),
    'TID_ACHIEVEMENT_DONATE_SIEGES': tr('Donate <number> Siege Machines', '增援<number>台攻城機器'),
    'TID_BOB_HUT': tr("B.O.B's Hut", '巴布小屋'),
    # 同一個英文名稱有兩種譯名：不收錄
    'TID_A': tr('Shared', '甲'),
    'TID_B': tr('Shared', '乙'),
    # 含 HTML 特殊字元：不收錄
    'TID_UNSAFE_CNT': tr('Unsafe', '<b>危險</b>'),
    'TID_UNSAFE_EN': tr("Builder's Hut", '建築工人小屋'),
}


class BuildNamesTests(unittest.TestCase):
    def test_names_skip_descriptions_and_achievements(self):
        names, ambiguous = u.build_names(SAMPLE)
        self.assertEqual(names['Cannon'], '加農炮')
        self.assertEqual(names['Battle Machine'], '戰爭機器')
        self.assertEqual(names['Barbarian Puppet'], '野蠻人玩偶')
        self.assertNotIn('A long description.', names)
        self.assertFalse(any('<number>' in en for en in names))
        self.assertEqual(ambiguous, ['Shared'])
        self.assertNotIn('Unsafe', names)
        self.assertEqual(names["Builder's Hut"], '建築工人小屋')
        self.assertNotIn('Shared', names)


class TermsTests(unittest.TestCase):
    def test_terms_found_in_game_text(self):
        terms = u.build_terms(SAMPLE)
        self.assertEqual(terms['Clan Games'], '部落競賽')
        self.assertEqual(terms['Gear Up'], '改裝')
        self.assertEqual(terms['B.O.B'], '巴布')

    def test_term_missing_from_game_text(self):
        broken = dict(SAMPLE, TID_ACHIEVEMENT_GEAR_UP_ONE=tr('Gear Up', '升級'))
        with self.assertRaises(u.TranslationError):
            u.build_terms(broken)


class CollectTests(unittest.TestCase):
    def test_too_few_names(self):
        with self.assertRaises(u.TranslationError):
            u.collect(download=lambda: ('9.9.9', SAMPLE))

    def test_render(self):
        rendered = json.loads(u.render({'version': '4.0.0', 'names': {'Cannon': '加農炮'}, 'ambiguous': []}))
        self.assertEqual(rendered['names'], {'Cannon': '加農炮'})
        self.assertIn('coc.py 4.0.0', rendered['source'])


if __name__ == '__main__':
    unittest.main()
