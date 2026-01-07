from django.shortcuts import render
from django.http import JsonResponse
from .models import (
    BuildingCategory, Building, BuildingLevel,
    Hero, HeroLevel,
    TroopType, Troop, TroopLevel
)

def upgrade_info_view(request):
    """升級資訊主頁面"""
    context = {
        'building_categories': BuildingCategory.objects.all(),
        'troop_types': TroopType.objects.all(),
        'heroes': Hero.objects.all(),
        'th_levels': range(1, 19),  # TH1 到 TH18
    }
    return render(request, 'upgrade_info.html', context)


def api_buildings(request):
    """建築資料 API"""
    th_level = request.GET.get('th', None)
    category_id = request.GET.get('category', None)
    search = request.GET.get('search', '').strip()
    
    buildings = Building.objects.prefetch_related('levels').all()
    
    if category_id:
        buildings = buildings.filter(category_id=category_id)
    
    if search:
        buildings = buildings.filter(name__icontains=search)
    
    data = []
    for building in buildings:
        levels = building.levels.all()
        if th_level:
            levels = levels.filter(th_required__lte=int(th_level))
        
        level_data = []
        for lvl in levels:
            level_data.append({
                'level': lvl.level,
                'gold_cost': lvl.gold_cost,
                'elixir_cost': lvl.elixir_cost,
                'dark_elixir_cost': lvl.dark_elixir_cost,
                'build_time': lvl.build_time,
                'build_time_display': lvl.get_time_display(),
                'th_required': lvl.th_required,
                'hp': lvl.hp,
                'dps': lvl.dps,
            })
        
        if level_data:  # 只返回有等級資料的建築
            data.append({
                'id': building.id,
                'name': building.name,
                'name_en': building.name_en,
                'category': building.category.name,
                'max_level': building.max_level,
                'image': building.image,
                'levels': level_data,
            })
    
    return JsonResponse({'buildings': data})


def api_heroes(request):
    """英雄資料 API"""
    th_level = request.GET.get('th', None)
    search = request.GET.get('search', '').strip()
    
    heroes = Hero.objects.prefetch_related('levels').all()
    
    if search:
        heroes = heroes.filter(name__icontains=search)
    
    data = []
    for hero in heroes:
        if th_level and hero.unlock_th > int(th_level):
            continue
            
        levels = hero.levels.all()
        if th_level:
            levels = levels.filter(th_required__lte=int(th_level))
        
        level_data = []
        for lvl in levels:
            level_data.append({
                'level': lvl.level,
                'dark_elixir_cost': lvl.dark_elixir_cost,
                'upgrade_time': lvl.upgrade_time,
                'upgrade_time_display': lvl.get_time_display(),
                'th_required': lvl.th_required,
                'hp': lvl.hp,
                'dps': lvl.dps,
                'ability_damage': lvl.ability_damage,
            })
        
        if level_data:
            data.append({
                'id': hero.id,
                'name': hero.name,
                'name_en': hero.name_en,
                'max_level': hero.max_level,
                'unlock_th': hero.unlock_th,
                'image': hero.image,
                'levels': level_data,
            })
    
    return JsonResponse({'heroes': data})


def api_troops(request):
    """兵種資料 API"""
    th_level = request.GET.get('th', None)
    type_id = request.GET.get('type', None)
    search = request.GET.get('search', '').strip()
    
    troops = Troop.objects.prefetch_related('levels').all()
    
    if type_id:
        troops = troops.filter(troop_type_id=type_id)
    
    if search:
        troops = troops.filter(name__icontains=search)
    
    data = []
    for troop in troops:
        levels = troop.levels.all()
        if th_level:
            # 根據實驗室等級篩選（可以在前端做對應）
            levels = levels.filter(lab_required__lte=int(th_level))
        
        level_data = []
        for lvl in levels:
            level_data.append({
                'level': lvl.level,
                'elixir_cost': lvl.elixir_cost,
                'dark_elixir_cost': lvl.dark_elixir_cost,
                'upgrade_time': lvl.upgrade_time,
                'upgrade_time_display': lvl.get_time_display(),
                'lab_required': lvl.lab_required,
                'dps': lvl.dps,
                'hp': lvl.hp,
            })
        
        if level_data:
            data.append({
                'id': troop.id,
                'name': troop.name,
                'name_en': troop.name_en,
                'type': troop.troop_type.name,
                'max_level': troop.max_level,
                'housing_space': troop.housing_space,
                'image': troop.image,
                'levels': level_data,
            })
    
    return JsonResponse({'troops': data})
