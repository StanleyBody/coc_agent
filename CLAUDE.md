# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Static Clash of Clans community site built with Astro + TypeScript, deployed to GitHub Pages at `https://stanleybody.github.io/coc_agent/`. No backend: all interactivity is client-side. The previous Django version lives on the `legacy-django` branch.

## Commands

Run from the repo root (Node.js 22.23.4+):

```bash
npm install
npm run dev        # dev server at http://localhost:4321/coc_agent/
npm test           # node --test "src/**/*.test.ts" (Node strips TypeScript types)
npm run build      # astro check (type check) + astro build → dist/
npm run preview

python scripts/update_upgrade_data.py [--check]        # regenerate src/data/upgrade-info.json
python scripts/update_sixth_builder_data.py [--check]  # regenerate src/data/sixth-builder.json
python scripts/update_translations.py [--check]        # regenerate src/data/zh-tw.json (official zh-TW names)
python -m unittest discover -s scripts                 # scraper tests
```

## Structure

```
src/
├── pages/        # one .astro file per route (index, upgrade-info, sixth-builder, events, guides, contact)
├── layouts/      # BaseLayout.astro: navbar, footer, theme toggle, back-to-top
├── components/   # PageHeader, SixthBuilderField
├── lib/          # TypeScript logic per feature + *.test.ts next to the code
│   ├── upgrade-info/   # logic.ts (TABS config, filters, totals, discounts), render.ts (HTML), client.ts (DOM)
│   ├── sixth-builder/  # calc.ts, fields.ts (validation), render.ts, client.ts
│   ├── events/         # schedule.ts (Taiwan-time recurring rules, specials), client.ts (countdowns)
│   ├── guides/         # guides.ts (filtering, popularity)
│   ├── nav.ts, url.ts  # navigation items; url() prefixes the /coc_agent base path
├── data/         # JSON data imported by lib modules
├── styles/       # base.css (theme variables, Clash font), site.css (navbar/footer/home), per-page CSS
├── scripts/      # site.ts: theme toggle, navbar, scroll animations, mobile menu
└── assets/       # font and images (processed by Vite)
scripts/          # Python scrapers for the Fandom Wiki (stdlib only); wikilib.py has shared parsing
```

## Conventions

- **Links**: always build internal links with `url('/path/')` from `src/lib/url.ts`; `astro.config.mjs` sets `base: '/coc_agent'` and `trailingSlash: 'always'`.
- **Pattern for interactive pages**: static markup is rendered in the `.astro` page at build time; a `<script>` imports `lib/<feature>/client.ts`, which reads the DOM and calls pure functions in `logic.ts`/`calc.ts`/`render.ts`. Keep pure logic separate so it is testable with `node --test`.
- **Imports inside `src/lib`** use explicit `.ts` extensions (required by Node type stripping); JSON is imported with `with { type: 'json' }`. Avoid TS-only runtime syntax (enums, namespaces, parameter properties).
- **HTML from data**: escape names that come from the Wiki (`escapeHtml` in `upgrade-info/render.ts`).
- **Theme**: `data-theme` is set on `<html>` by an inline script before paint; CSS uses `[data-theme="light"]` overrides of variables in `base.css`.
- **Game terms**: always use the official in-game Traditional Chinese via `zh('English name')` from `src/lib/i18n.ts` (data: `src/data/zh-tw.json`). Items without a translation show the English name; do not invent translations. Show full names in the UI, not abbreviations (金幣 not 金, 大本營 12 not TH12, full numbers not 9.0M, 小時/分鐘). Data files keep English names. Terms found only inside game sentences (e.g. Gear Up → 改裝) are listed in `TERMS` in `scripts/update_translations.py` and verified against the game text.

## Data

- `src/data/upgrade-info.json`, `src/data/sixth-builder.json` and `src/data/zh-tw.json` are **generated — do not edit by hand**.
  - `update_translations.py` downloads the latest coc.py wheel from PyPI and maps English names to the `CNT` column of its `translations.json` (exported from the game's `texts.csv`); names with conflicting translations are skipped. Names coc.py does not have yet come from Supercell's official zh-TW blog posts, listed in `OFFICIAL_NOTES` (English name → post path, zh-TW name); the script fetches the zh post and its English version and fails unless both names appear. Names in neither source but confirmed in-game by the maintainer go in `CONFIRMED_NAMES`. Game text wins when coc.py later adds the name.
  - `update_upgrade_data.py` discovers Home Village buildings, heroes, troops, spells, siege machines, pets and hero equipment from Wiki navigation templates (`Template:BuildingsMenuHV`, `Template:TroopsMenuHV`) and parses each page's first level table. Each level stores `costs` as `{resource: amount}` (equipment costs several ores; sub-headers under merged `Upgrade Cost` columns name the ore).
  - The upgrade info page shows all levels (no Town Hall filter). Tabs and sub-categories are defined in `TABS` in `src/lib/upgrade-info/logic.ts`.
  - `update_sixth_builder_data.py` scrapes Builder Base costs and B.O.B Control requirements (including Night Witch research and Battle Machine + Battle Copter combined level).
  - Both scripts fail (exit 2, no write) when the Wiki format changes; output has no timestamp so unchanged data produces no diff.
- `src/data/events.json` (recurring rules + `special` events with ISO start/end) and `src/data/guides.json` are edited by hand.

## Sixth builder calculator rules

Assumes the player has no resources. Storages are upgraded (lowest first) until Builder Hall capacity + two storages can hold the largest single upgrade cost. Builder Hall below 9 is treated as a fresh BH9 (B.O.B Control not built). `planHeroes` picks the cheapest Battle Machine / Battle Copter level pair reaching the combined level within the Builder Hall cap.

## CI

- `.github/workflows/pages.yml`: on push to `main`, `npm ci` → `npm test` → `npm run build` → deploy `dist/` (separate build and deploy jobs).
- `.github/workflows/update-wiki-data.yml`: weekly (Mon 03:23 UTC) runs the scrapers and the translation update, tests and builds, then opens a PR on branch `auto/update-wiki-data` if data changed and dispatches `claude-review.yml` for it (PRs opened with `GITHUB_TOKEN` do not trigger `pull_request`).
- `.github/workflows/claude-review.yml`: on PR open/update (or `workflow_dispatch` with `pr_number`): tests/build → `anthropics/claude-code-action@v1` reviews against this file and returns a JSON verdict → on `APPROVE`, merges with `--match-head-commit` and dispatches `pages.yml` (merges with `GITHUB_TOKEN` do not trigger `push`). Skips drafts and forks; label `no-auto-merge` prevents merging. PRs that change `claude-review.yml` itself are skipped by the action's workflow validation (file must match `main`), so the review job fails and they need a manual merge. Needs the Claude GitHub App and a `CLAUDE_CODE_OAUTH_TOKEN` or `ANTHROPIC_API_KEY` secret.

## Commit Message Style

Use conventional commit prefixes: `feat`, `fix`, `doc`, `refactor`, `test`, `style`, `chore`.
