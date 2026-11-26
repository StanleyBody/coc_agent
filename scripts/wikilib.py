"""
Clash of Clans Fandom Wiki 的共用抓取與表格解析工具。
只使用標準函式庫。
"""
import json
import re
import urllib.parse
import urllib.request

API_URL = 'https://clashofclans.fandom.com/api.php'
USER_AGENT = 'coc_agent-data-updater/1.0'
SOURCE = 'https://clashofclans.fandom.com'


class WikiParseError(Exception):
    pass


# ---------------------------------------------------------------- 抓取

def fetch_wikitext(page):
    params = urllib.parse.urlencode({
        'action': 'parse', 'page': page, 'prop': 'wikitext',
        'format': 'json', 'redirects': 1,
    })
    req = urllib.request.Request(f'{API_URL}?{params}', headers={'User-Agent': USER_AGENT})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.load(resp)
    if 'parse' not in data:
        raise WikiParseError(f'{page}: API 回應沒有內容：{data.get("error")}')
    return data['parse']['wikitext']['*']


def fetch_many(titles, batch_size=50):
    """
    一次抓取多個頁面（自動跟隨重新導向），回傳 {要求的標題: wikitext}。
    找不到的頁面不會出現在結果中。
    """
    result = {}
    titles = list(dict.fromkeys(titles))
    for i in range(0, len(titles), batch_size):
        batch = titles[i:i + batch_size]
        params = urllib.parse.urlencode({
            'action': 'query', 'prop': 'revisions', 'rvprop': 'content', 'rvslots': 'main',
            'format': 'json', 'formatversion': 2, 'redirects': 1, 'titles': '|'.join(batch),
        })
        req = urllib.request.Request(f'{API_URL}?{params}', headers={'User-Agent': USER_AGENT})
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.load(resp)
        query = data.get('query', {})
        # 要求的標題 → 實際頁面標題（經過正規化與重新導向）
        resolved = {t: t for t in batch}
        for step in ('normalized', 'redirects'):
            mapping = {m['from']: m['to'] for m in query.get(step, [])}
            resolved = {t: mapping.get(r, r) for t, r in resolved.items()}
        pages = {p['title']: p for p in query.get('pages', [])}
        for title, actual in resolved.items():
            page = pages.get(actual)
            if page and not page.get('missing') and page.get('revisions'):
                result[title] = page['revisions'][0]['slots']['main']['content']
    return result


# ---------------------------------------------------------------- 表格解析

ATTR_CELL = re.compile(r'^\s*(?:[\w-]+\s*=\s*(?:"[^"]*"|[^\s|"\[\]{}]+)\s*)+\|(.*)$', re.S)
COLSPAN = re.compile(r'colspan\s*=\s*"?(\d+)', re.I)


def clean_text(text):
    """去掉 wiki 連結、模板與 HTML，留下純文字"""
    text = re.sub(r'\[\[(?:[^\]|]*\|)?([^\]]*)\]\]', r'\1', text)
    text = re.sub(r'\{\{[^{}]*\}\}', '', text)
    text = re.sub(r'<[^>]+>', ' ', text)
    return ' '.join(text.split())


def _cell_content(cell):
    m = ATTR_CELL.match(cell)
    return (m.group(1) if m else cell).strip()


def _expand_cell(cell):
    """依 colspan 重複儲存格內容，讓每一列的欄位數一致"""
    m = ATTR_CELL.match(cell)
    span = COLSPAN.search(cell[:m.start(1)]) if m else None
    return [_cell_content(cell)] * (int(span.group(1)) if span else 1)


def _split_cells(lines):
    cells = []
    for line in lines:
        if line.startswith('!'):
            parts = line[1:].split('!!')
        elif line.startswith('|'):
            parts = line[1:].split('||')
        else:
            if cells:
                cells[-1] += ' ' + line.strip()
            continue
        for part in parts:
            cells.extend(_expand_cell(part))
    return cells


def _is_header_block(block):
    return all(ln.startswith('!') or not ln.startswith('|') for ln in block)


def iter_tables(wikitext):
    """依序回傳每個表格的原始文字（不處理巢狀表格）"""
    for m in re.finditer(r'^\{\|.*?^\|\}', wikitext, re.S | re.M):
        yield m.group(0)


def parse_table_full(table):
    """回傳 (純文字表頭, 原始表頭, 資料列清單)"""
    lines = [ln.rstrip() for ln in table.splitlines()[1:-1]]
    blocks, current = [], []
    for line in lines:
        if line.startswith('|-'):
            blocks.append(current)
            current = []
        elif not line.startswith('|+'):
            current.append(line)
    blocks.append(current)

    headers, raw_headers, rows = None, None, []
    for block in blocks:
        if not block:
            continue
        cells = _split_cells(block)
        if _is_header_block(block):
            if headers is None:
                raw_headers = cells
                headers = [clean_text(c) for c in cells]
            # 之後的表頭列（合併欄位底下的子欄位名稱）不是資料，略過
            continue
        rows.append(cells)
    if headers is None:
        raise WikiParseError('表格沒有表頭')
    return headers, raw_headers, rows


def parse_table(table):
    """回傳 (表頭清單, 資料列清單)；表頭為純文字"""
    headers, _raw, rows = parse_table_full(table)
    return headers, rows


def find_table(wikitext, *required_headers):
    """找第一個包含所有指定表頭的表格"""
    for table in iter_tables(wikitext):
        try:
            headers, rows = parse_table(table)
        except WikiParseError:
            continue
        if all(any(h in header for header in headers) for h in required_headers):
            return headers, rows
    raise WikiParseError(f'找不到包含 {required_headers} 的表格')


def column(headers, name):
    for i, header in enumerate(headers):
        if name in header:
            return i
    raise WikiParseError(f'找不到欄位 {name}：{headers}')


def to_int(text):
    m = re.search(r'\d[\d,]*', clean_text(text))
    if not m:
        raise WikiParseError(f'無法解析數字：{text!r}')
    return int(m.group(0).replace(',', ''))


def to_int_or_none(text):
    """N/A 或空白回傳 None"""
    return None if re.search(r'N/?A', text) or not re.search(r'\d', clean_text(text)) else to_int(text)


def level_rows(wikitext, *value_columns):
    """
    解析「Level」開頭的等級表，回傳 (第一列的等級, {欄位名稱: [每列的值]})。
    檢查等級是否連續；N/A 的值為 None。
    """
    headers, rows = find_table(wikitext, 'Level', *value_columns)
    level_idx = column(headers, 'Level')
    indexes = {name: column(headers, name) for name in value_columns}
    result = {name: [] for name in value_columns}
    first = expected = None
    for row in rows:
        if len(row) < len(headers):
            continue
        level = to_int(row[level_idx])
        if expected is None:
            first = expected = level
        if level != expected:
            raise WikiParseError(f'等級不連續：預期 Lv{expected}，得到 {row[level_idx]!r}')
        for name, idx in indexes.items():
            result[name].append(to_int_or_none(row[idx]))
        expected += 1
    if first is None:
        raise WikiParseError('等級表沒有資料')
    return first, result


def level_table(wikitext, *value_columns):
    """從 Lv1 開始、每個值都必須有數字的等級表，回傳 {欄位名稱: [Lv1 值, Lv2 值, ...]}"""
    first, result = level_rows(wikitext, *value_columns)
    if first != 1:
        raise WikiParseError(f'等級表應從 Lv1 開始，實際從 Lv{first} 開始')
    for name, values in result.items():
        if None in values:
            raise WikiParseError(f'{name} 欄位有缺值：{values}')
    return result
