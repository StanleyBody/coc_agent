# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `coc_agent/` inner directory (where `manage.py` lives):

```bash
cd coc_agent

# Development server
python manage.py runserver

# Database migrations
python manage.py makemigrations
python manage.py migrate

# Tests (all apps)
python manage.py test

# Tests (single app)
python manage.py test upgrade_info

# Create admin superuser
python manage.py createsuperuser
```

## Project Structure

The repository has a double-nested layout:

```
coc_agent/          ← repo root
└── coc_agent/      ← Django project root (contains manage.py)
    ├── coc_agent/  ← settings package (settings.py, urls.py, wsgi.py, asgi.py)
    ├── home/
    ├── upgrade_info/
    ├── strategy_guides/
    ├── player_search/
    ├── events/
    ├── contact_us/
    └── coming_soon/
```

## Architecture

**Routing**: Root `/` redirects to `/home/`. Each app is included under its own prefix in `coc_agent/coc_agent/urls.py`.

**Templates**: All pages extend `home/templates/base.html`, which provides the nav bar, footer, dark/light theme toggle, and responsive layout. App templates live in `<app>/templates/`.

**Static files**: Each app has its own `static/` directory. CSS is in `static/css/`, JS in `static/js/`. Files are collected to `staticfiles/` for production (`python manage.py collectstatic`).

**Database**: SQLite3 (`db.sqlite3`). Only `home` and `upgrade_info` have models with migrations; the other apps are view-only.

## Apps

**home** — Core models and the landing page.
- Custom `User` model with UUID primary key and manual bcrypt-style password hashing (not Django's `AbstractUser`). Use `user.set_password()` / `user.verify_password()`.
- `TrackingList` → `PlayerTracking` / `ClanTracking` joins let a user watch clans and players.

**upgrade_info** — Most complex app. Displays building/hero/troop upgrade costs filtered by Town Hall level.
- Three JSON APIs consumed by frontend JS:
  - `GET /upgrade_info/api/buildings/?th_level=<n>&category=<id>`
  - `GET /upgrade_info/api/heroes/?th_level=<n>`
  - `GET /upgrade_info/api/troops/?th_level=<n>&troop_type=<id>`
- `format_time_display(seconds)` in `upgrade_info/models.py` converts seconds → human-readable string (used in API responses).
- Admin interface uses `TabularInline` for level rows on each building/hero/troop.

**strategy_guides / player_search** — Currently render hardcoded sample data; no models.

**events / contact_us / coming_soon** — Simple template-only views.

## Commit Message Style

Use conventional commit prefixes: `feat`, `fix`, `doc`, `refactor`, `test`, `style`, `chore`.
