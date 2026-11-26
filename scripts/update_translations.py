#!/usr/bin/env python3
"""
產生遊戲內名稱的官方繁體中文對照表 src/data/zh-tw.json（英文名稱 → 繁體中文）。

資料來源：PyPI 上 coc.py 套件附帶的 coc/static/translations.json，
內容是從遊戲語系檔（texts.csv）匯出的字串，其中 CNT 欄為遊戲內的繁體中文。
腳本會下載最新版的 coc.py，所以新版發布後，新單位的名稱也會自動補上。

另外有少數用語只出現在遊戲內的句子裡（例如成就說明），列在 TERMS，
腳本會檢查這些用語確實出現在指定的遊戲字串中，避免自行翻譯。

coc.py 尚未收錄的新名稱，取自 Supercell 官網的繁體中文公告，列在 OFFICIAL_NOTES。
腳本會下載公告的繁中版與英文版，確認譯名與英文名稱都出現在同一篇公告中；
coc.py 之後收錄同一名稱時，以遊戲語系檔為準。
官網也沒有公告的名稱，由維護者對照遊戲畫面確認後列在 CONFIRMED_NAMES。

只使用標準函式庫。用法：python scripts/update_translations.py [--check]
"""
import argparse
import html
import io
import json
import re
import sys
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

OUTPUT = Path(__file__).resolve().parent.parent / 'src' / 'data' / 'zh-tw.json'
GENERATED_BY = 'scripts/update_translations.py（自動產生，請勿手動修改）'
PYPI_URL = 'https://pypi.org/pypi/coc.py/json'
TRANSLATIONS_PATH = 'coc/static/translations.json'
USER_AGENT = 'coc_agent-data-updater/1.0'
# 譯文會顯示在網頁上，含 HTML 特殊字元的字串不收錄
UNSAFE = re.compile(r'[<>&"\']')

# 排除成就與說明文字，只收錄名稱類的短字串（TID 的命名沒有一致規則，不用開頭篩選）
SKIP_TID = re.compile(r'(ACHIEVEMENT|_INFO|_DESC|_TUTORIAL)')

# 英文用語 → (遊戲字串 TID, 該字串中的繁體中文用語)
TERMS = {
    'Clan Games': ('TID_ACHIEVEMENT_CLAN_GAMES_POINTS', '部落競賽'),
    'Clan War': ('TID_ACHIEVEMENT_WAR_STARS', '部落對戰'),
    'Clan War League': ('TID_ACHIEVEMENT_WL_STARS', '部落對戰聯盟賽'),
    'Gear Up': ('TID_ACHIEVEMENT_GEAR_UP_ONE', '改裝'),
    'Siege Machines': ('TID_ACHIEVEMENT_DONATE_SIEGES', '攻城機器'),
    'B.O.B': ('TID_BOB_HUT', '巴布'),
}


# 英文名稱 → (官網繁中公告路徑, 公告中的繁體中文名稱)
BLOG = 'https://supercell.com/en/games/clashofclans/zh/blog/'
OFFICIAL_NOTES = {
    'Spiky Tower': ('release-notes/泰坦-大戰-更新-上線/', '尖刺塔'),
    'Firecracker Tower': ('release-notes/泰坦-大戰-更新-上線/', '煙火射手塔'),
    'Heroic Spell': ('release-notes/泰坦-大戰-更新-上線/', '英勇法術'),
    'Dragon Duke': ('release-notes/泰坦-大戰-更新-上線/', '飛龍公爵'),
    'Ruin Witch': ('release-notes/泰坦-大戰-更新-上線/', '廢墟女巫'),
    'Angry Spell': ('release-notes/動漫-狂怒-更新-登場-2/', '憤怒法術'),
    'Monolith Arrow': ('release-notes/動漫-狂怒-更新-登場-2/', '巨石箭矢'),
    'Flame Blower': ('release-notes/動漫-狂怒-更新-登場-2/', '助燃器'),
    'Rocket Backpack': ('release-notes/動漫-狂怒-更新-登場-2/', '火箭背包'),
    'Sky Wagon': ('release-notes/衝突-之聲-更新/', '空中戰車'),
    'Electro Fangs': ('release-notes/衝突-之聲-更新/', '雷電獠牙'),
    'Greedy Raven': ('release-notes/2月-更新-猛獸-出籠-2/', '貪婪渡鴉'),
    'Portal Pendant': ('news/宇宙-詛咒-裂隙-之亂-降臨/', '傳送吊飾'),
    'Fire Heart': ('news/2026年-10月-平衡性-調整-即將-登場-2/', '烈焰之心'),
    'Revenge Deck': ('news/神勇-大陸-等你-來征服/', '復仇牌組'),
}

# 英文名稱 → 遊戲內的繁體中文名稱（coc.py 與官網公告都沒有，由維護者對照遊戲畫面確認）
CONFIRMED_NAMES = {
    'Stun Blaster': '爆震器',
}


class TranslationError(Exception):
    pass


def http_get(url):
    req = urllib.request.Request(url, headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req, timeout=120) as resp:
        return resp.read()


def page_text(url):
    return html.unescape(http_get(urllib.parse.quote(url, safe=':/')).decode('utf-8', 'replace'))


def fetch_article(path):
    """回傳 (繁中版內容, 英文版內容)；英文版由繁中頁面的 hrefLang="en" 連結取得"""
    zh_page = page_text(BLOG + path)
    m = re.search(r'hrefLang="en" href="([^"]+)"', zh_page)
    if not m:
        raise TranslationError(f'官網公告 {path} 找不到英文版連結')
    return zh_page, page_text(m.group(1))


def build_official(fetch=fetch_article):
    pages = {}
    names = {}
    for en, (path, zh) in OFFICIAL_NOTES.items():
        if path not in pages:
            pages[path] = fetch(path)
        zh_page, en_page = pages[path]
        if zh not in zh_page or en not in en_page:
            raise TranslationError(f'「{en}」：官網公告 {path} 沒有同時出現「{en}」與「{zh}」')
        if UNSAFE.search(zh):
            raise TranslationError(f'「{en}」的譯文含有 HTML 特殊字元：{zh!r}')
        names[en] = zh
    return names


def download_translations():
    """回傳 (coc.py 版本, translations.json 內容)"""
    info = json.loads(http_get(PYPI_URL))
    version = info['info']['version']
    wheels = [f for f in info['releases'].get(version, []) if f['filename'].endswith('.whl')]
    if not wheels:
        raise TranslationError(f'coc.py {version} 沒有 wheel 檔')
    with zipfile.ZipFile(io.BytesIO(http_get(wheels[0]['url']))) as zf:
        return version, json.loads(zf.read(TRANSLATIONS_PATH))


def build_names(translations):
    """
    英文名稱 → 繁體中文。同一個英文名稱對應到不同中文時視為不明確，不收錄。
    回傳 (names, ambiguous)
    """
    candidates = {}
    for tid, langs in translations.items():
        if SKIP_TID.search(tid):
            continue
        en, cnt = (langs.get('EN') or '').strip(), (langs.get('CNT') or '').strip()
        # 英文只當查詢用的鍵；會顯示在網頁上的是譯文，所以只檢查譯文
        if not en or not cnt or '<' in en or len(en) > 40 or en[-1] in '.!?' or UNSAFE.search(cnt):
            continue
        candidates.setdefault(en, set()).add(cnt)
    names = {en: next(iter(c)) for en, c in candidates.items() if len(c) == 1}
    ambiguous = sorted(en for en, c in candidates.items() if len(c) > 1)
    return names, ambiguous


def build_terms(translations):
    terms = {}
    for en, (tid, zh) in TERMS.items():
        text = (translations.get(tid) or {}).get('CNT') or ''
        if zh not in text:
            raise TranslationError(f'「{en}」：{tid} 的繁體中文不包含「{zh}」（實際：{text!r}）')
        if UNSAFE.search(zh):
            raise TranslationError(f'「{en}」的譯文含有 HTML 特殊字元：{zh!r}')
        terms[en] = zh
    return terms


def collect(download=download_translations, fetch=fetch_article):
    version, translations = download()
    names, ambiguous = build_names(translations)
    if len(names) < 200:
        raise TranslationError(f'只取得 {len(names)} 個名稱，少於預期')
    names.update(build_terms(translations))
    # 遊戲語系檔已有的名稱以遊戲為準
    for en, zh in {**CONFIRMED_NAMES, **build_official(fetch)}.items():
        names.setdefault(en, zh)
    return {
        'version': version,
        'names': dict(sorted(names.items())),
        'ambiguous': ambiguous,
    }


def render(data):
    output = {
        'generated_by': GENERATED_BY,
        'source': f'coc.py {data["version"]}（遊戲語系檔 texts.csv 的 CNT 欄）；尚未收錄的名稱取自 Supercell 官網繁體中文公告',
        'names': data['names'],
    }
    return json.dumps(output, ensure_ascii=False, indent=1) + '\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n')[1])
    parser.add_argument('--check', action='store_true', help='只比對，不寫入')
    args = parser.parse_args()
    try:
        data = collect()
    except (TranslationError, KeyError, zipfile.BadZipFile, OSError) as e:
        print(f'取得翻譯失敗：{e}', file=sys.stderr)
        return 2
    if data['ambiguous']:
        print(f'略過 {len(data["ambiguous"])} 個有多種譯名的名稱：{", ".join(data["ambiguous"][:20])}')

    content = render(data)
    old = OUTPUT.read_text(encoding='utf-8') if OUTPUT.exists() else ''
    if content == old:
        print('資料沒有變動')
        return 0
    if args.check:
        print('資料有變動')
        return 1
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(content, encoding='utf-8')
    print(f'已更新 {OUTPUT}（{len(data["names"])} 個名稱）')
    return 0


if __name__ == '__main__':
    sys.exit(main())
