from django.test import SimpleTestCase
from django.urls import reverse

# 計算邏輯的測試在 sixth_builder/js_tests/，用 `node --test sixth_builder/js_tests/calc.test.js` 執行


class ViewTests(SimpleTestCase):
    def test_page_loads_calculator_scripts(self):
        resp = self.client.get(reverse('sixth_builder'))
        self.assertEqual(resp.status_code, 200)
        self.assertContains(resp, 'id="sixth-builder-app"')
        self.assertContains(resp, 'js/sixth_builder_data.js')
        self.assertContains(resp, 'js/sixth_builder_calc.js')
        self.assertContains(resp, 'js/sixth_builder.js')
