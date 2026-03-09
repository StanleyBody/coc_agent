import json
import os
from django.core.management.base import BaseCommand
from django.conf import settings
from upgrade_info.models import (
    BuildingCategory, Building, BuildingLevel,
    Hero, HeroLevel,
    TroopType, Troop, TroopLevel,
)

STATIC_DATA_DIR = os.path.join(
    settings.BASE_DIR, 'upgrade_info', 'static', 'data'
)


def load_json(filename):
    path = os.path.join(STATIC_DATA_DIR, filename)
    with open(path, encoding='utf-8') as f:
        return json.load(f)


class Command(BaseCommand):
    help = '從靜態 JSON 檔案載入升級資料到資料庫'

    def add_arguments(self, parser):
        parser.add_argument(
            '--clear',
            action='store_true',
            help='匯入前先清除現有資料',
        )

    def handle(self, *args, **options):
        if options['clear']:
            self.stdout.write('清除現有資料...')
            TroopLevel.objects.all().delete()
            Troop.objects.all().delete()
            TroopType.objects.all().delete()
            HeroLevel.objects.all().delete()
            Hero.objects.all().delete()
            BuildingLevel.objects.all().delete()
            Building.objects.all().delete()
            BuildingCategory.objects.all().delete()

        self._load_buildings()
        self._load_heroes()
        self._load_troops()
        self.stdout.write(self.style.SUCCESS('資料載入完成！'))

    def _load_buildings(self):
        data = load_json('buildings.json')

        # 建築類別
        for cat in data.get('building_categories', []):
            obj, created = BuildingCategory.objects.update_or_create(
                id=cat['id'],
                defaults={
                    'name': cat['name'],
                    'name_en': cat['name_en'],
                    'icon': cat.get('icon', ''),
                    'order': cat.get('order', 0),
                },
            )
            self.stdout.write(f"  {'建立' if created else '更新'} 建築類別: {obj.name}")

        # 建築與等級
        for b in data.get('buildings', []):
            category = BuildingCategory.objects.get(id=b['category_id'])
            building, created = Building.objects.update_or_create(
                id=b['id'],
                defaults={
                    'name': b['name'],
                    'name_en': b['name_en'],
                    'category': category,
                    'max_level': b['max_level'],
                    'image': b.get('image', ''),
                    'description': b.get('description', ''),
                },
            )
            self.stdout.write(f"  {'建立' if created else '更新'} 建築: {building.name}")

            for lvl in b.get('levels', []):
                BuildingLevel.objects.update_or_create(
                    building=building,
                    level=lvl['level'],
                    defaults={
                        'gold_cost': lvl.get('gold_cost', 0),
                        'elixir_cost': lvl.get('elixir_cost', 0),
                        'dark_elixir_cost': lvl.get('dark_elixir_cost', 0),
                        'build_time': lvl.get('build_time', 0),
                        'th_required': lvl.get('th_required', 1),
                        'hp': lvl.get('hp', 0),
                        'dps': lvl.get('dps', 0),
                    },
                )

    def _load_heroes(self):
        data = load_json('heroes.json')

        for h in data.get('heroes', []):
            hero, created = Hero.objects.update_or_create(
                id=h['id'],
                defaults={
                    'name': h['name'],
                    'name_en': h['name_en'],
                    'max_level': h['max_level'],
                    'unlock_th': h['unlock_th'],
                    'image': h.get('image', ''),
                    'description': h.get('description', ''),
                },
            )
            self.stdout.write(f"  {'建立' if created else '更新'} 英雄: {hero.name}")

            for lvl in h.get('levels', []):
                HeroLevel.objects.update_or_create(
                    hero=hero,
                    level=lvl['level'],
                    defaults={
                        'dark_elixir_cost': lvl.get('dark_elixir_cost', 0),
                        'upgrade_time': lvl.get('upgrade_time', 0),
                        'th_required': lvl.get('th_required', 1),
                        'hp': lvl.get('hp', 0),
                        'dps': lvl.get('dps', 0),
                        'ability_damage': lvl.get('ability_damage', 0),
                    },
                )

    def _load_troops(self):
        data = load_json('troops.json')

        # 兵種類別
        for tt in data.get('troop_types', []):
            obj, created = TroopType.objects.update_or_create(
                id=tt['id'],
                defaults={
                    'name': tt['name'],
                    'name_en': tt['name_en'],
                    'icon': tt.get('icon', ''),
                    'order': tt.get('order', 0),
                },
            )
            self.stdout.write(f"  {'建立' if created else '更新'} 兵種類別: {obj.name}")

        # 兵種與等級
        for t in data.get('troops', []):
            troop_type = TroopType.objects.get(id=t['type_id'])
            troop, created = Troop.objects.update_or_create(
                id=t['id'],
                defaults={
                    'name': t['name'],
                    'name_en': t['name_en'],
                    'troop_type': troop_type,
                    'max_level': t['max_level'],
                    'housing_space': t.get('housing_space', 1),
                    'training_time': t.get('training_time', 0),
                    'image': t.get('image', ''),
                    'description': t.get('description', ''),
                },
            )
            self.stdout.write(f"  {'建立' if created else '更新'} 兵種: {troop.name}")

            for lvl in t.get('levels', []):
                TroopLevel.objects.update_or_create(
                    troop=troop,
                    level=lvl['level'],
                    defaults={
                        'elixir_cost': lvl.get('elixir_cost', 0),
                        'dark_elixir_cost': lvl.get('dark_elixir_cost', 0),
                        'upgrade_time': lvl.get('upgrade_time', 0),
                        'lab_required': lvl.get('lab_required', 1),
                        'dps': lvl.get('dps', 0),
                        'hp': lvl.get('hp', 0),
                    },
                )
