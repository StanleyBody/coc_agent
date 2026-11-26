# coc_agent

Clash of Clans 部落衝突社區網站，以 [Astro](https://astro.build) + TypeScript 建置的靜態網站，部署在 GitHub Pages：

https://stanleybody.github.io/coc_agent/

舊版 Django 網站保存在 [`legacy-django`](https://github.com/StanleyBody/coc_agent/tree/legacy-django) branch。

## 功能

| 頁面 | 說明 |
|---|---|
| 首頁 | 活動倒數、熱門攻略、網站工具入口 |
| 升級資訊 | 建築、兵種、英雄、法術、攻城機器、戰寵、裝備的每級費用與時間，可依子分類與名稱篩選、套用減免 |
| 第六工人計算機 | 計算解鎖第六工人（B.O.B）還缺多少夜世界金幣與聖水 |
| 活動公告 | 部落競賽、部落聯賽等固定活動倒數（台灣時間），以及限時活動 |
| 攻略影片 | 依分類與名稱篩選攻略 |
| 聯繫我們 | 聯絡方式 |

## 開發

需要 Node.js 22（22.23.4 以上）。

```bash
npm install
npm run dev       # 開發伺服器 http://localhost:4321/coc_agent/
npm test          # 前端測試（node --test）
npm run build     # 型別檢查並建置到 dist/
npm run preview   # 預覽建置結果
```

## 資料

| 檔案 | 內容 | 更新方式 |
|---|---|---|
| `src/data/upgrade-info.json` | 升級資訊 | `python scripts/update_upgrade_data.py` 自動產生 |
| `src/data/sixth-builder.json` | 第六工人計算機 | `python scripts/update_sixth_builder_data.py` 自動產生 |
| `src/data/events.json` | 固定活動排程、限時活動 | 手動編輯 |
| `src/data/guides.json` | 攻略清單 | 手動編輯 |

- 兩支抓取腳本從 [Clash of Clans Fandom Wiki](https://clashofclans.fandom.com) 抓資料，只使用 Python 標準函式庫；加上 `--check` 只比對不寫入。
- 抓取腳本的測試：`python -m unittest discover -s scripts`
- 自動產生的 JSON 請勿手動修改。
- 限時活動加在 `events.json` 的 `special`，`start`／`end` 使用 ISO 8601 時間，例如 `2026-12-01T16:00:00+08:00`。
- 攻略的 `url` 留空會顯示「影片準備中」。

## 部署與自動化

- `.github/workflows/pages.yml`：推到 `main` 時跑測試、建置並部署到 GitHub Pages（Settings → Pages 的 Source 需設為「GitHub Actions」）。
- `.github/workflows/update-wiki-data.yml`：每週一 03:23 UTC 從 Wiki 更新資料，有變動時開 PR（Settings → Actions → General 需允許 GitHub Actions 建立 PR）。
- `.github/workflows/claude-review.yml`：PR 開啟或更新時先跑測試與建置，再由 Claude Code 依 CLAUDE.md 審查（問題留在程式碼行上並留總結），核准後自動合併並部署。
  - 需要安裝 [Claude GitHub App](https://github.com/apps/claude)，並在 Settings → Secrets and variables → Actions 新增 `CLAUDE_CODE_OAUTH_TOKEN`（`claude setup-token` 產生）或 `ANTHROPIC_API_KEY`。
  - 不自動合併：草稿 PR、加上 `no-auto-merge` 標籤、來自 fork、審查後又推了新 commit。
  - 每週資料更新的 PR 也會自動審查。

## Coding Style

### Commit Message

```txt
[commit-type](Component|Scope|feature): Title | Short Description
- Detail Description
- Detail Description

# commit-type = [feat, fix, docs, style, refactor, test, chore]
```
References: https://wadehuanglearning.blogspot.com/2019/05/commit-commit-commit-why-what-commit.html
