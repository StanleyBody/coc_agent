from django.contrib import admin
from .models import (
    BuildingCategory, Building, BuildingLevel,
    Hero, HeroLevel,
    TroopType, Troop, TroopLevel
)


# ===== Buildings =====
class BuildingLevelInline(admin.TabularInline):
    model = BuildingLevel
    extra = 1
    fields = ['level', 'gold_cost', 'elixir_cost', 'dark_elixir_cost', 'build_time', 'th_required', 'hp', 'dps']

@admin.register(BuildingCategory)
class BuildingCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'name_zh', 'order']
    ordering = ['order']

@admin.register(Building)
class BuildingAdmin(admin.ModelAdmin):
    list_display = ['name', 'name_zh', 'category', 'max_level']
    list_filter = ['category']
    search_fields = ['name', 'name_zh']
    inlines = [BuildingLevelInline]


# ===== Heroes =====
class HeroLevelInline(admin.TabularInline):
    model = HeroLevel
    extra = 1
    fields = ['level', 'dark_elixir_cost', 'upgrade_time', 'th_required', 'hp', 'dps', 'ability_damage']

@admin.register(Hero)
class HeroAdmin(admin.ModelAdmin):
    list_display = ['name', 'name_zh', 'max_level', 'unlock_th']
    search_fields = ['name', 'name_zh']
    inlines = [HeroLevelInline]


# ===== Troops =====
class TroopLevelInline(admin.TabularInline):
    model = TroopLevel
    extra = 1
    fields = ['level', 'elixir_cost', 'dark_elixir_cost', 'upgrade_time', 'lab_required', 'dps', 'hp']

@admin.register(TroopType)
class TroopTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'name_zh', 'order']
    ordering = ['order']

@admin.register(Troop)
class TroopAdmin(admin.ModelAdmin):
    list_display = ['name', 'name_zh', 'troop_type', 'max_level', 'housing_space']
    list_filter = ['troop_type']
    search_fields = ['name', 'name_zh']
    inlines = [TroopLevelInline]
