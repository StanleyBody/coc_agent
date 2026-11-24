from django.test import SimpleTestCase
from django.urls import reverse

from .calculator import BOB_CONTROL_COST, calculate, format_hours, upgrade_cost
from .forms import SixthBuilderForm


def make_data(**overrides):
    data = {
        'player_tag': '#2YPJ8VCRL',
        'double_cannon': 4,
        'archer_tower': 6,
        'multi_mortar': 9,
        'star_laboratory': 9,
        'builder_barracks': 6,
        'bob_control_built': True,
        'gold_current': 0,
        'gold_capacity': 5_500_000,
        'elixir_current': 0,
        'elixir_capacity': 5_500_000,
        'gold_rate': 1_000,
        'elixir_rate': 1_000,
    }
    data.update(overrides)
    return data


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


class CalculateTests(SimpleTestCase):
    def test_all_done(self):
        r = calculate(make_data())
        self.assertEqual(r['gold']['shortage'], 0)
        self.assertEqual(r['elixir']['shortage'], 0)
        self.assertEqual(r['overall_text'], '已足夠')

    def test_multi_mortar_from_7_to_9(self):
        r = calculate(make_data(multi_mortar=7, gold_current=1_000_000, gold_rate=500_000))
        # Lv8 3,500,000 + Lv9 4,500,000
        self.assertEqual(r['gold']['total'], 8_000_000)
        self.assertEqual(r['gold']['shortage'], 7_000_000)
        self.assertEqual(r['gold']['hours'], 14)
        self.assertEqual(r['gold']['max_single'], 4_500_000)
        self.assertTrue(r['gold']['capacity_ok'])

    def test_bob_control_cost_added_when_not_built(self):
        r = calculate(make_data(bob_control_built=False))
        self.assertEqual(r['gold']['total'], BOB_CONTROL_COST)
        self.assertEqual(r['items'][0]['key'], 'bob_control')

    def test_elixir_buildings(self):
        r = calculate(make_data(star_laboratory=8, builder_barracks=5))
        # 星空實驗室 Lv9 4,000,000 + 訓練營 Lv6 150,000
        self.assertEqual(r['elixir']['total'], 4_150_000)
        self.assertEqual(r['gold']['total'], 0)

    def test_capacity_warning(self):
        r = calculate(make_data(star_laboratory=8, elixir_capacity=3_000_000))
        self.assertFalse(r['elixir']['capacity_ok'])

    def test_zero_rate_cannot_estimate(self):
        r = calculate(make_data(archer_tower=5, gold_rate=0))
        self.assertIsNone(r['gold']['hours'])
        self.assertIn('無法估算', r['overall_text'])

    def test_overall_uses_slower_resource(self):
        r = calculate(make_data(archer_tower=5, star_laboratory=8,
                                gold_rate=100_000, elixir_rate=100_000))
        # 金幣缺 1,200,000 → 12 小時；聖水缺 4,000,000 → 40 小時
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

    def test_current_over_capacity(self):
        form = SixthBuilderForm(self.form_data(gold_current=10, gold_capacity=5))
        self.assertFalse(form.is_valid())
        self.assertIn('gold_current', form.errors)

    def test_level_out_of_range(self):
        form = SixthBuilderForm(self.form_data(double_cannon=11))
        self.assertFalse(form.is_valid())


class ViewTests(SimpleTestCase):
    def test_empty_page(self):
        resp = self.client.get(reverse('sixth_builder'))
        self.assertEqual(resp.status_code, 200)
        self.assertIsNone(resp.context['result'])

    def test_with_result(self):
        params = make_data(multi_mortar=7, gold_rate=500_000)
        params['bob_control_built'] = 'on'
        resp = self.client.get(reverse('sixth_builder'), params)
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, '8,000,000')
        self.assertContains(resp, '16 小時')
