"""
Clash of Clans 官方 API（https://developer.clashofclans.com）

設定（環境變數）：
  COC_API_TOKEN     開發者網站建立的 API 金鑰（金鑰綁定伺服器的對外 IP）
  COC_API_BASE_URL  預設 https://api.clashofclans.com/v1
"""
import json
import urllib.error
import urllib.parse
import urllib.request

from django.conf import settings

TIMEOUT_SECONDS = 10

HTTP_ERROR_MESSAGES = {
    400: '請求參數錯誤',
    403: 'API 金鑰無效，或伺服器 IP 不在金鑰的允許清單中',
    404: '找不到這個玩家標籤',
    429: 'API 請求過於頻繁，請稍後再試',
    503: 'Clash of Clans API 維護中',
}


class CocApiError(Exception):
    pass


def get_player(tag):
    """取得玩家資料（API 原始 JSON）"""
    token = getattr(settings, 'COC_API_TOKEN', '')
    if not token:
        raise CocApiError('尚未設定 COC_API_TOKEN，無法查詢玩家資料')

    base_url = getattr(settings, 'COC_API_BASE_URL', 'https://api.clashofclans.com/v1')
    url = f"{base_url.rstrip('/')}/players/{urllib.parse.quote(tag, safe='')}"
    request = urllib.request.Request(url, headers={
        'Authorization': f'Bearer {token}',
        'Accept': 'application/json',
    })
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        raise CocApiError(HTTP_ERROR_MESSAGES.get(e.code, f'Clash of Clans API 錯誤（HTTP {e.code}）')) from e
    except (urllib.error.URLError, TimeoutError) as e:
        raise CocApiError('無法連線到 Clash of Clans API') from e
    except ValueError as e:
        raise CocApiError('Clash of Clans API 回傳格式錯誤') from e


def _builder_base_level(entries, name):
    for entry in entries or []:
        if entry.get('name') == name and entry.get('village') == 'builderBase':
            return entry.get('level')
    return None


def summarize_player(data):
    """整理計算機需要的欄位"""
    battle_machine = _builder_base_level(data.get('heroes'), 'Battle Machine')
    battle_copter = _builder_base_level(data.get('heroes'), 'Battle Copter')
    return {
        'name': data.get('name', ''),
        'tag': data.get('tag', ''),
        'town_hall_level': data.get('townHallLevel'),
        'builder_hall_level': data.get('builderHallLevel'),
        'night_witch_level': _builder_base_level(data.get('troops'), 'Night Witch'),
        'battle_machine_level': battle_machine,
        'battle_copter_level': battle_copter,
        'hero_total': (battle_machine or 0) + (battle_copter or 0),
    }
