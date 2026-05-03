# AGENTS.md

## Cursor Cloud specific instructions

### Overview
This repo contains two applications:
1. **Legacy CLI** (`LCF.py`) — single-file Python CLI for mushroom observation tracking
2. **Dashboard** (`dashboard/`) — React + Express web dashboard for PNW edible mushroom observations

### Legacy CLI (`LCF.py`)
```
python3 LCF.py
```
Interactive Rich-powered menu. Automate via piped input: `printf '1\n\nq\n' | python3 LCF.py`.
- **numpy/pandas compatibility:** Pinned `pandas==2.1.1` requires `numpy<2.0` (update script handles this).
- **No test suite.** Use `python3 -m pyflakes LCF.py` or `python3 -m py_compile LCF.py`.

### Dashboard (`dashboard/`)
```bash
cd dashboard
npm run dev        # starts both Express API (port 3001) and Vite dev server (port 5173)
npm run dev:server # Express API only
npm run dev:client # Vite frontend only
npm run lint       # ESLint
npm run build      # production build
```
- **Backend** syncs data from iNaturalist API on startup; first run takes ~2 min (20 species × rate limit). Subsequent runs use SQLite cache (`dashboard/data/cache.db`).
- **iNaturalist rate limit:** 1.1s between requests enforced server-side. Do not lower this.
- **PNW species config** in `dashboard/server/species.js` — 20 verified taxon IDs.
- **Frontend** proxies `/api/*` to the Express server via Vite config.
- Lint: `npx eslint src/` — warnings are expected (ESLint default parser doesn't fully track JSX usage); 0 errors is passing.
