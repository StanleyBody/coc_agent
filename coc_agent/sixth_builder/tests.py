import io
import json
import urllib.error
from unittest import mock

from django.test import SimpleTestCase, override_settings
from django.urls import reverse

from .calculator import (BOB_CONTROL_COST, calculate, format_hours,
                         plan_storages, upgrade_cost)
from .coc_api import CocApiError, get_player, summarize_player
from .forms import SixthBuilderForm


def make_data(**overrides):
    data = {
        'player_tag': '#2YPJ8VCRL',
        'double_cannon': 4,
        'archer_tower': 6,
        'multi_mortar': 9,
        'star_laboratory': 9,
        'builder_barracks': 8,
        'gold_storage_1': 9,
        'gold_storage_2': 9,
        'elixir_storage_1': 9,
        'elixir_storage_2': 9,
        'bob_control_built': True,
        'gold_rate': 1_000,
        'elixir_rate': 1_000,
    }
    data.update(overrides)
    return data


def item(result, key):
    return next(i for i in result['items'] if i['key'] == key)


SAMPLE_PLAYER = {
    'tag': '#2YPJ8VCRL',
    'name': 'StarDestroyer',
    'townHallLevel': 16,
    'builderHallLevel': 10,
    'troops': [
        {'name': 'Night Witch', 'level': 15, 'village': 'builderBase'},
        {'name': 'Witch', 'level': 5, 'village': 'home'},
    ],
    'heroes': [
        {'name': 'Barbarian King', 'level': 90, 'village': 'home'},
        {'name': 'Battle Machine', 'level': 25, 'village': 'builderBase'},
        {'name': 'Battle Copter', 'level': 20, 'village': 'builderBase'},
    ],
}


class UpgradeCostTests(SimpleTestCase):
    def test_sums_levels_between_current_and_target(self):
        self.assertEqual(upgrade_cost([10, 20, 30, 40], 1, 3), 50)

    def test_already_reached(self):
        self.assertEqual(upgrade_cost([10, 20, 30], 3, 2), 0)


class FormatHoursTests(SimpleTestCase):
    def test_days_hours_minutes(self):
        self.assertEqual(format_hours(25.5), '1 天 1 小時 30 分')

    def test_rounds_up_minutes(self):
        self.assertEqual(format_hours(0.001), '1 分')

    def test_whole_days(self):
        self.assertEqual(format_hours(48), '2 天')


class PlanStoragesTests(SimpleTestCase):
    def test_upgrades_lowest_first(self):
        # 1,500,000 + 1,600,000 + 1,600,000 = 4,700,000 >= 4,500,000
        self.assertEqual(plan_storages([6, 6], 4_500_000, 9), ([8, 8], True))

    def test_already_enough(self):
        self.assertEqual(plan_storages([9, 9], 4_500_000, 9), ([9, 9], True))

    def test_cannot_reach(self):
        self.assertEqual(plan_storages([0, 0], 10_000_000, 9), ([9, 9], False))


class CalculateTests(SimpleTestCase):
    def test_all_done(self):
        r = calculate(make_data())
        self.assertEqual(r['gold']['shortage'], 0)
        self.assertEqual(r['elixir']['shortage'], 0)
        self.assertEqual(r['overall_text'], '不需要')

    def test_multi_mortar_from_7_to_9(self):
        r = calculate(make_data(multi_mortar=7, gold_rate=500_000))
        # Lv8 3,500,000 + Lv9 4,500,000
        self.assertEqual(r['gold']['shortage'], 8_000_000)
        self.assertEqual(r['gold']['hours'], 16)

    def test_bob_control_cost_added_when_not_built(self):
        r = calculate(make_data(bob_control_built=False))
        self.assertEqual(r['gold']['shortage'], BOB_CONTROL_COST)
        self.assertEqual(r['items'][0]['key'], 'bob_control')

    def test_barracks_target_is_night_witch(self):
        r = calculate(make_data(builder_barracks=6))
        # Lv7 300,000 + Lv8 500,000
        self.assertEqual(item(r, 'builder_barracks')['target'], 8)
        self.assertEqual(r['elixir']['shortage'], 800_000)

    def test_gold_storage_upgrades_cost_elixir(self):
        r = calculate(make_data(multi_mortar=8, gold_storage_1=6, gold_storage_2=6))
        # 每座 6→8：1,500,000 + 2,000,000
        self.assertEqual(item(r, 'gold_storage_1')['target'], 8)
        self.assertEqual(item(r, 'gold_storage_2')['target'], 8)
        self.assertEqual(r['elixir']['shortage'], 7_000_000)
        self.assertEqual(r['gold']['shortage'], 4_500_000)

    def test_elixir_storage_upgrades_cost_gold(self):
        r = calculate(make_data(star_laboratory=8, elixir_storage_1=5, elixir_storage_2=5))
        # 需容納 4,000,000：升到 8 / 7
        self.assertEqual(item(r, 'elixir_storage_1')['target'], 8)
        self.assertEqual(item(r, 'elixir_storage_2')['target'], 7)
        # 5→8：4,500,000；5→7：2,500,000
        self.assertEqual(r['gold']['shortage'], 7_000_000)
        self.assertEqual(r['elixir']['shortage'], 4_000_000)

    def test_storage_level_limited_without_builder_hall_10(self):
        r = calculate(make_data())
        self.assertEqual(r['max_storage_level'], 9)
        r = calculate(make_data(), builder_hall_level=10)
        self.assertEqual(r['max_storage_level'], 10)

    def test_below_builder_hall_9_assumes_fresh_bh9(self):
        r = calculate(make_data(bob_control_built=True), builder_hall_level=7)
        self.assertTrue(r['assumed_builder_hall'])
        self.assertEqual(r['max_storage_level'], 9)
        # 視為還沒蓋 B.O.B Control
        self.assertEqual(r['items'][0]['key'], 'bob_control')
        self.assertEqual(r['gold']['shortage'], BOB_CONTROL_COST)

    def test_builder_hall_9_keeps_input(self):
        r = calculate(make_data(bob_control_built=True), builder_hall_level=9)
        self.assertFalse(r['assumed_builder_hall'])
        self.assertEqual(r['gold']['shortage'], 0)

    def test_zero_rate_cannot_estimate(self):
        r = calculate(make_data(archer_tower=5, gold_rate=0))
        self.assertIsNone(r['gold']['hours'])
        self.assertIn('無法估算', r['overall_text'])

    def test_overall_uses_slower_resource(self):
        r = calculate(make_data(archer_tower=5, star_laboratory=8,
                                gold_rate=100_000, elixir_rate=100_000))
        # 金幣 1,200,000 → 12 小時；聖水 4,000,000 → 40 小時
        self.assertEqual(r['overall_text'], '1 天 16 小時')


class FormTests(SimpleTestCase):
    def form_data(self, **overrides):
        data = make_data(**overrides)
        data['bob_control_built'] = 'on' if data['bob_control_built'] else ''
        return data

    def test_tag_normalized(self):
        form = SixthBuilderForm(self.form_data(player_tag='2ypj8vcrl'))
        self.assertTrue(form.is_valid(), form.errors)
        self.assertEqual(form.cleaned_data['player_tag'], '#2YPJ8VCRL')

    def test_invalid_tag(self):
        form = SixthBuilderForm(self.form_data(player_tag='#ABC123'))
        self.assertFalse(form.is_valid())
        self.assertIn('player_tag', form.errors)

    def test_storage_level_out_of_range(self):
        form = SixthBuilderForm(self.form_data(gold_storage_2=11))
        self.assertFalse(form.is_valid())
        self.assertIn('gold_storage_2', form.errors)


class CocApiTests(SimpleTestCase):
    @override_settings(COC_API_TOKEN='')
    def test_missing_token(self):
        with self.assertRaisesMessage(CocApiError, 'COC_API_TOKEN'):
            get_player('#2YPJ8VCRL')

    @override_settings(COC_API_TOKEN='test-token', COC_API_BASE_URL='https://api.example.com/v1/')
    def test_request(self):
        resp = io.BytesIO(json.dumps(SAMPLE_PLAYER).encode())
        with mock.patch('urllib.request.urlopen', return_value=resp) as urlopen:
            data = get_player('#2YPJ8VCRL')
        req = urlopen.call_args.args[0]
        self.assertEqual(req.full_url, 'https://api.example.com/v1/players/%232YPJ8VCRL')
        self.assertEqual(req.get_header('Authorization'), 'Bearer test-token')
        self.assertEqual(data['name'], 'StarDestroyer')

    @override_settings(COC_API_TOKEN='test-token')
    def test_not_found(self):
        err = urllib.error.HTTPError('url', 404, 'Not Found', {}, io.BytesIO(b''))
        with mock.patch('urllib.request.urlopen', side_effect=err):
            with self.assertRaisesMessage(CocApiError, '找不到這個玩家標籤'):
                get_player('#2YPJ8VCRL')

    @override_settings(COC_API_TOKEN='test-token')
    def test_invalid_ip_shows_api_message(self):
        body = json.dumps({'reason': 'accessDenied.invalidIp',
                           'message': 'API key does not allow access from IP 1.2.3.4'}).encode()
        err = urllib.error.HTTPError('url', 403, 'Forbidden', {}, io.BytesIO(body))
        with mock.patch('urllib.request.urlopen', side_effect=err):
            with self.assertRaisesMessage(CocApiError, 'IP 1.2.3.4'):
                get_player('#2YPJ8VCRL')

    @override_settings(COC_API_TOKEN='test-token')
    def test_connection_error(self):
        with mock.patch('urllib.request.urlopen', side_effect=urllib.error.URLError('x')):
            with self.assertRaisesMessage(CocApiError, '無法連線'):
                get_player('#2YPJ8VCRL')

    def test_summarize_player(self):
        p = summarize_player(SAMPLE_PLAYER)
        self.assertEqual(p['builder_hall_level'], 10)
        self.assertEqual(p['night_witch_level'], 15)
        self.assertEqual(p['hero_total'], 45)

    def test_summarize_player_missing_fields(self):
        p = summarize_player({'name': 'New', 'tag': '#2PP'})
        self.assertIsNone(p['night_witch_level'])
        self.assertEqual(p['hero_total'], 0)


class ViewTests(SimpleTestCase):
    def params(self, **overrides):
        params = make_data(**overrides)
        params['bob_control_built'] = 'on'
        return params

    def test_empty_page(self):
        resp = self.client.get(reverse('sixth_builder'))
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.context['result'])

    @mock.patch('sixth_builder.views.get_player', return_value=SAMPLE_PLAYER)
    def test_with_player(self, get_player_mock):
        resp = self.client.get(reverse('sixth_builder'), self.params(multi_mortar=7, gold_rate=500_000))
        self.assertEqual(resp.status_code, 200)
        get_player_mock.assert_called_once_with('#2YPJ8VCRL')
        self.assertContains(resp, 'StarDestroyer')
        self.assertContains(resp, '8,000,000')
        self.assertContains(resp, '16 小時')
        self.assertEqual(resp.context['result']['max_storage_level'], 10)

    @mock.patch('sixth_builder.views.get_player',
                return_value={**SAMPLE_PLAYER, 'builderHallLevel': 6})
    def test_low_builder_hall_player(self, _):
        resp = self.client.get(reverse('sixth_builder'), self.params())
        self.assertContains(resp, '以剛升上 Lv9')
        self.assertEqual(resp.context['result']['gold']['shortage'], BOB_CONTROL_COST)

    @mock.patch('sixth_builder.views.get_player', side_effect=CocApiError('找不到這個玩家標籤'))
    def test_api_error_still_calculates(self, _):
        resp = self.client.get(reverse('sixth_builder'), self.params(archer_tower=5))
        self.assertContains(resp, '找不到這個玩家標籤')
        self.assertEqual(resp.context['result']['gold']['shortage'], 1_200_000)
