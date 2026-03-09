from django.shortcuts import render

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
