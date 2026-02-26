from django.shortcuts import render


def index(request):
    return render(request, 'home.html')


def strategy_guides(request):
    """攻略影片頁面"""
    guides = [
        {
            'title': 'TH16 天女蠻王流',
            'title_en': 'Queen Charge Barbarian King',
            'category': '進攻',
            'difficulty': '進階',
            'description': '利用天使搭配蠻王開路，配合大部隊三星的經典戰術。適合 TH16 的核心進攻策略。',
            'views': '12.5K',
            'thumbnail': '🗡️',
        },
        {
            'title': '天女豬騎流',
            'title_en': 'Queen Charge Hog Riders',
            'category': '進攻',
            'difficulty': '進階',
            'description': '結合天女打前排和豬騎士拆後排的高效進攻流派，穩定三星的首選。',
            'views': '9.8K',
            'thumbnail': '🐗',
        },
        {
            'title': '飛龍閃電流',
            'title_en': 'Dragon Lightning',
            'category': '進攻',
            'difficulty': '新手',
            'description': '最適合新手的進攻策略，使用飛龍搭配雷電法術快速推平敵方基地。',
            'views': '18.2K',
            'thumbnail': '🐉',
        },
        {
            'title': '雷龍寒冰流',
            'title_en': 'Electro Dragon Freeze',
            'category': '進攻',
            'difficulty': '中等',
            'description': '利用雷龍的連鎖攻擊搭配冰凍法術控場，適合密集防禦陣型。',
            'views': '7.3K',
            'thumbnail': '⚡',
        },
        {
            'title': '最強防禦陣型 TH16',
            'title_en': 'Best TH16 War Base',
            'category': '防守',
            'difficulty': '進階',
            'description': '針對當前主流進攻流派設計的防禦陣型，有效防止三星。',
            'views': '15.1K',
            'thumbnail': '🛡️',
        },
        {
            'title': '資源速刷指南',
            'title_en': 'Farming Guide',
            'category': '資源',
            'difficulty': '新手',
            'description': '高效刷取金幣、聖水與暗黑聖水的技巧，快速升級你的基地。',
            'views': '21.0K',
            'thumbnail': '💰',
        },
        {
            'title': '女武神雷龍混編流',
            'title_en': 'Valkyrie Electro Mix',
            'category': '進攻',
            'difficulty': '中等',
            'description': '地面與空中部隊結合的創新戰術，打破敵方防守預期。',
            'views': '5.6K',
            'thumbnail': '⚔️',
        },
        {
            'title': '部落戰爭勝率提升',
            'title_en': 'Clan War Tips',
            'category': '策略',
            'difficulty': '中等',
            'description': '從選人、排兵到進攻順序，全面提升部落戰爭的勝率。',
            'views': '11.4K',
            'thumbnail': '🏰',
        },
    ]
    categories = ['全部', '進攻', '防守', '資源', '策略']
    context = {
        'guides': guides,
        'categories': categories,
    }
    return render(request, 'strategy_guides.html', context)


def player_search(request):
    """玩家查詢頁面"""
    # 示範排行榜資料
    top_players = [
        {'rank': 1, 'name': 'StarDestroyer', 'tag': '#2YPJ8VCRL', 'trophies': 6847, 'th_level': 16, 'clan': '勇者部落'},
        {'rank': 2, 'name': 'DragonSlayer', 'tag': '#9QR2JLYP8', 'trophies': 6723, 'th_level': 16, 'clan': '無敵軍團'},
        {'rank': 3, 'name': 'WarChief', 'tag': '#8LGPC2RV0', 'trophies': 6691, 'th_level': 16, 'clan': '戰鬥狂人'},
        {'rank': 4, 'name': 'ElixirKing', 'tag': '#PYJG28QU', 'trophies': 6580, 'th_level': 16, 'clan': '勇者部落'},
        {'rank': 5, 'name': 'DarkWarrior', 'tag': '#L2QRVJY9P', 'trophies': 6534, 'th_level': 15, 'clan': '無敵軍團'},
    ]
    context = {
        'top_players': top_players,
    }
    return render(request, 'player_search.html', context)


def events(request):
    """活動公告頁面"""
    return render(request, 'events.html')
