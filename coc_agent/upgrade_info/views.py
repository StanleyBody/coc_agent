import json
from django.shortcuts import render
from django.http import JsonResponse
from .models import (
    BuildingCategory, Building, BuildingLevel,
    Hero, HeroLevel,
    TroopType, Troop, TroopLevel
)

def upgrade_info_view(request):
    """升級資訊主頁面"""
    building_categories = list(
        BuildingCategory.objects.values('id', 'name', 'name_en', 'icon', 'order')
    )
    troop_types = list(
        TroopType.objects.values('id', 'name', 'name_en', 'icon', 'order')
    )
    context = {
        'building_categories_json': json.dumps(building_categories, ensure_ascii=False),
        'troop_types_json': json.dumps(troop_types, ensure_ascii=False),
        'th_levels': range(1, 19),
    }
    return render(request, 'upgrade_info.html', context)


def api_buildings(request):
    """建築資料 API"""
    th_level = request.GET.get('th', None)
    category_id = request.GET.get('category', None)
    search = request.GET.get('search', '').strip()
    
    # 驗證 th_level 參數
    if th_level:
        try:
            th_level = int(th_level)
        except (ValueError, TypeError):
            return JsonResponse({'error': 'Invalid th parameter'}, status=400)
    
    buildings = Building.objects.select_related('category').prefetch_related('levels').all()
    
    if category_id:
        buildings = buildings.filter(category_id=category_id)
    
    if search:
        buildings = buildings.filter(name__icontains=search)
    
    data = []
    for building in buildings:
        levels = building.levels.all()
        if th_level:
            levels = levels.filter(th_required__lte=th_level)
        
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
                'category_id': building.category_id,
                'max_level': building.max_level,
                'image': building.image,
                'levels': level_data,
            })
    
    return JsonResponse({'buildings': data})


def api_heroes(request):
    """英雄資料 API"""
    th_level = request.GET.get('th', None)
    search = request.GET.get('search', '').strip()
    
    # 驗證 th_level 參數
    if th_level:
        try:
            th_level = int(th_level)
        except (ValueError, TypeError):
            return JsonResponse({'error': 'Invalid th parameter'}, status=400)
    
    heroes = Hero.objects.prefetch_related('levels').all()
    
    if search:
        heroes = heroes.filter(name__icontains=search)
    
    data = []
    for hero in heroes:
        if th_level and hero.unlock_th > th_level:
            continue
            
        levels = hero.levels.all()
        if th_level:
            levels = levels.filter(th_required__lte=th_level)
        
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
    
    # 驗證 th_level 參數
    if th_level:
        try:
            th_level = int(th_level)
        except (ValueError, TypeError):
            return JsonResponse({'error': 'Invalid th parameter'}, status=400)
    
    troops = Troop.objects.select_related('troop_type').prefetch_related('levels').all()
    
    if type_id:
        troops = troops.filter(troop_type_id=type_id)
    
    if search:
        troops = troops.filter(name__icontains=search)
    
    data = []
    for troop in troops:
        levels = troop.levels.all()
        if th_level:
            # 根據實驗室等級篩選
            levels = levels.filter(lab_required__lte=th_level)
        
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
                'type_id': troop.troop_type_id,
                'max_level': troop.max_level,
                'housing_space': troop.housing_space,
                'image': troop.image,
                'levels': level_data,
            })
    
    return JsonResponse({'troops': data})


def api_schema(request):
    """Return OpenAPI 3.0 specification as JSON."""
    schema = {
        "openapi": "3.0.3",
        "info": {
            "title": "Clash of Clans Upgrade Info API",
            "version": "1.0.0",
            "description": (
                "Query upgrade data for buildings, heroes, and troops.\n\n"
                "All endpoints support filtering by Town Hall level (`th`), "
                "returning only upgrade levels unlocked at or below that level."
            ),
        },
        "servers": [{"url": "/upgrade_info", "description": "API base path"}],
        "paths": {
            "/api/buildings/": {
                "get": {
                    "tags": ["Buildings"],
                    "summary": "List buildings with upgrade data",
                    "description": (
                        "Returns a list of buildings, each with per-level upgrade costs and stats.\n"
                        "When both `th` and `category` are provided, both filters are applied."
                    ),
                    "operationId": "listBuildings",
                    "parameters": [
                        {
                            "name": "th",
                            "in": "query",
                            "description": "Town Hall level (1-18). Only returns levels where `th_required <= th`.",
                            "schema": {"type": "integer", "minimum": 1, "maximum": 18},
                            "example": 10,
                        },
                        {
                            "name": "category",
                            "in": "query",
                            "description": "Building category ID (matches `BuildingCategory.id`).",
                            "schema": {"type": "integer"},
                            "example": 1,
                        },
                        {
                            "name": "search",
                            "in": "query",
                            "description": "Case-insensitive name search (icontains).",
                            "schema": {"type": "string"},
                            "example": "Cannon",
                        },
                    ],
                    "responses": {
                        "200": {
                            "description": "OK",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "buildings": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/Building"},
                                            }
                                        },
                                    },
                                    "example": {
                                        "buildings": [
                                            {
                                                "id": 1,
                                                "name": "Cannon",
                                                "name_en": "Cannon",
                                                "category": "Defense",
                                                "category_id": 1,
                                                "max_level": 21,
                                                "image": "",
                                                "levels": [
                                                    {
                                                        "level": 1,
                                                        "gold_cost": 250,
                                                        "elixir_cost": 0,
                                                        "dark_elixir_cost": 0,
                                                        "build_time": 5,
                                                        "build_time_display": "5s",
                                                        "th_required": 1,
                                                        "hp": 300,
                                                        "dps": 7,
                                                    }
                                                ],
                                            }
                                        ]
                                    },
                                }
                            },
                        },
                        "400": {"$ref": "#/components/responses/BadRequest"},
                    },
                }
            },
            "/api/heroes/": {
                "get": {
                    "tags": ["Heroes"],
                    "summary": "List heroes with upgrade data",
                    "description": (
                        "Returns a list of heroes, each with per-level upgrade costs and stats.\n"
                        "When `th` is provided, heroes with `unlock_th > th` are excluded "
                        "and only levels where `th_required <= th` are returned."
                    ),
                    "operationId": "listHeroes",
                    "parameters": [
                        {
                            "name": "th",
                            "in": "query",
                            "description": "Town Hall level (1-18). Filters both hero unlock condition and level `th_required`.",
                            "schema": {"type": "integer", "minimum": 1, "maximum": 18},
                            "example": 13,
                        },
                        {
                            "name": "search",
                            "in": "query",
                            "description": "Case-insensitive name search.",
                            "schema": {"type": "string"},
                            "example": "Barbarian King",
                        },
                    ],
                    "responses": {
                        "200": {
                            "description": "OK",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "heroes": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/Hero"},
                                            }
                                        },
                                    },
                                    "example": {
                                        "heroes": [
                                            {
                                                "id": 1,
                                                "name": "Barbarian King",
                                                "name_en": "Barbarian King",
                                                "max_level": 100,
                                                "unlock_th": 7,
                                                "image": "",
                                                "levels": [
                                                    {
                                                        "level": 1,
                                                        "dark_elixir_cost": 15000,
                                                        "upgrade_time": 14400,
                                                        "upgrade_time_display": "4h",
                                                        "th_required": 7,
                                                        "hp": 1580,
                                                        "dps": 108,
                                                        "ability_damage": 215,
                                                    }
                                                ],
                                            }
                                        ]
                                    },
                                }
                            },
                        },
                        "400": {"$ref": "#/components/responses/BadRequest"},
                    },
                }
            },
            "/api/troops/": {
                "get": {
                    "tags": ["Troops"],
                    "summary": "List troops with upgrade data",
                    "description": (
                        "Returns a list of troops, each with per-level upgrade costs and stats.\n"
                        "Troop upgrade availability is gated by Laboratory level (`lab_required`). "
                        "When `th` is provided, it is used as the lab level upper bound."
                    ),
                    "operationId": "listTroops",
                    "parameters": [
                        {
                            "name": "th",
                            "in": "query",
                            "description": "Town Hall level (1-18). Filters levels where `lab_required <= th`.",
                            "schema": {"type": "integer", "minimum": 1, "maximum": 18},
                            "example": 10,
                        },
                        {
                            "name": "type",
                            "in": "query",
                            "description": "Troop type ID (matches `TroopType.id`).",
                            "schema": {"type": "integer"},
                            "example": 1,
                        },
                        {
                            "name": "search",
                            "in": "query",
                            "description": "Case-insensitive name search.",
                            "schema": {"type": "string"},
                            "example": "Barbarian",
                        },
                    ],
                    "responses": {
                        "200": {
                            "description": "OK",
                            "content": {
                                "application/json": {
                                    "schema": {
                                        "type": "object",
                                        "properties": {
                                            "troops": {
                                                "type": "array",
                                                "items": {"$ref": "#/components/schemas/Troop"},
                                            }
                                        },
                                    },
                                    "example": {
                                        "troops": [
                                            {
                                                "id": 1,
                                                "name": "Barbarian",
                                                "name_en": "Barbarian",
                                                "type": "Elixir Troops",
                                                "type_id": 1,
                                                "max_level": 12,
                                                "housing_space": 1,
                                                "image": "",
                                                "levels": [
                                                    {
                                                        "level": 1,
                                                        "elixir_cost": 550000,
                                                        "dark_elixir_cost": 0,
                                                        "upgrade_time": 43200,
                                                        "upgrade_time_display": "12h",
                                                        "lab_required": 1,
                                                        "dps": 16,
                                                        "hp": 35,
                                                    }
                                                ],
                                            }
                                        ]
                                    },
                                }
                            },
                        },
                        "400": {"$ref": "#/components/responses/BadRequest"},
                    },
                }
            },
        },
        "components": {
            "schemas": {
                "BuildingLevel": {
                    "type": "object",
                    "properties": {
                        "level":              {"type": "integer", "description": "Upgrade level number"},
                        "gold_cost":          {"type": "integer", "description": "Gold cost"},
                        "elixir_cost":        {"type": "integer", "description": "Elixir cost"},
                        "dark_elixir_cost":   {"type": "integer", "description": "Dark Elixir cost"},
                        "build_time":         {"type": "integer", "description": "Build time in seconds"},
                        "build_time_display": {"type": "string",  "description": "Build time as human-readable string (e.g. '2d 4h')"},
                        "th_required":        {"type": "integer", "description": "Town Hall level required to unlock this upgrade"},
                        "hp":                 {"type": "integer", "description": "Hitpoints"},
                        "dps":                {"type": "integer", "description": "Damage per second"},
                    },
                },
                "Building": {
                    "type": "object",
                    "properties": {
                        "id":          {"type": "integer"},
                        "name":        {"type": "string",  "description": "Display name"},
                        "name_en":     {"type": "string",  "description": "English name"},
                        "category":    {"type": "string",  "description": "Category display name"},
                        "category_id": {"type": "integer", "description": "Category ID"},
                        "max_level":   {"type": "integer", "description": "Maximum upgrade level"},
                        "image":       {"type": "string",  "description": "Image path"},
                        "levels": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/BuildingLevel"},
                        },
                    },
                },
                "HeroLevel": {
                    "type": "object",
                    "properties": {
                        "level":                {"type": "integer"},
                        "dark_elixir_cost":     {"type": "integer", "description": "Dark Elixir cost"},
                        "upgrade_time":         {"type": "integer", "description": "Upgrade time in seconds"},
                        "upgrade_time_display": {"type": "string",  "description": "Upgrade time as human-readable string"},
                        "th_required":          {"type": "integer", "description": "Town Hall level required"},
                        "hp":                   {"type": "integer", "description": "Hitpoints"},
                        "dps":                  {"type": "integer", "description": "Damage per second"},
                        "ability_damage":       {"type": "integer", "description": "Special ability damage"},
                    },
                },
                "Hero": {
                    "type": "object",
                    "properties": {
                        "id":        {"type": "integer"},
                        "name":      {"type": "string"},
                        "name_en":   {"type": "string"},
                        "max_level": {"type": "integer"},
                        "unlock_th": {"type": "integer", "description": "Town Hall level required to unlock"},
                        "image":     {"type": "string"},
                        "levels": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/HeroLevel"},
                        },
                    },
                },
                "TroopLevel": {
                    "type": "object",
                    "properties": {
                        "level":                {"type": "integer"},
                        "elixir_cost":          {"type": "integer", "description": "Elixir cost"},
                        "dark_elixir_cost":     {"type": "integer", "description": "Dark Elixir cost"},
                        "upgrade_time":         {"type": "integer", "description": "Upgrade time in seconds"},
                        "upgrade_time_display": {"type": "string",  "description": "Upgrade time as human-readable string"},
                        "lab_required":         {"type": "integer", "description": "Laboratory level required"},
                        "dps":                  {"type": "integer", "description": "Damage per second"},
                        "hp":                   {"type": "integer", "description": "Hitpoints"},
                    },
                },
                "Troop": {
                    "type": "object",
                    "properties": {
                        "id":            {"type": "integer"},
                        "name":          {"type": "string"},
                        "name_en":       {"type": "string"},
                        "type":          {"type": "string",  "description": "Troop type display name"},
                        "type_id":       {"type": "integer", "description": "Troop type ID"},
                        "max_level":     {"type": "integer"},
                        "housing_space": {"type": "integer", "description": "Housing space consumed"},
                        "image":         {"type": "string"},
                        "levels": {
                            "type": "array",
                            "items": {"$ref": "#/components/schemas/TroopLevel"},
                        },
                    },
                },
            },
            "responses": {
                "BadRequest": {
                    "description": "Bad Request",
                    "content": {
                        "application/json": {
                            "schema": {
                                "type": "object",
                                "properties": {
                                    "error": {"type": "string", "example": "Invalid th parameter"}
                                },
                            }
                        }
                    },
                }
            },
        },
    }
    return JsonResponse(schema)


def api_docs(request):
    """Swagger UI 文件頁面"""
    return render(request, 'api_docs.html')
