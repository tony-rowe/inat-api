# PNW Observation Platform

This repository contains tools for collecting, analyzing, and reporting iNaturalist observations for Pacific Northwest taxa.

## Repository components

### 1) Legacy CLI (`LCF.py`)

A single-file Python CLI for tracking mushroom observations and generating reports.

```bash
python3 LCF.py
```

Quick validation:

```bash
python3 -m py_compile LCF.py
python3 -m pyflakes LCF.py
```

### 2) Web Dashboard (`dashboard/`)

A React + Express application for operational monitoring, maps, forecasting, and species management.

```bash
cd dashboard
npm install
npm run dev
```

Other useful commands:

```bash
npm run dev:server
npm run dev:client
npm run lint
npm run build
```

In-app reporting center:

- Open the **Reports** section in the dashboard sidebar for rolling 7-day trends and cache status.
- Cache location: `dashboard/data/cache.db`

### 3) Streamlit Reporting (`streamlit/app.py`)

A reporting-oriented Streamlit dashboard that pulls iNaturalist observations with query-efficient chained pagination.

```bash
python3 -m pip install -r requirements.txt
python3 -m streamlit run streamlit/app.py
```

See `streamlit/README.md` for details on query strategy and cache behavior.

## Docker deployment

`docker-compose.yml` now starts two services:

- `app` on `http://<host>:3060`
- `streamlit` on `http://<host>:8501`

On Synology at hostname `desertbuddha`, Streamlit is:

- `http://desertbuddha:8501`

## Data sourcing and rate limits

- iNaturalist API base: `https://api.inaturalist.org/v1`
- PNW defaults: Oregon (`10`) and Washington (`11`)
- Server-side iNat requests are rate-limited to ~1.1 seconds between calls
- Dashboard sync now supports batched, chained retrieval across many taxa to reduce total request count

## Installation

### Python dependencies

```bash
python3 -m pip install -r requirements.txt
```

### Dashboard dependencies

```bash
cd dashboard
npm install
```

## Project layout

```text
.
├── LCF.py
├── dashboard/
│   ├── server/
│   └── src/
├── streamlit/
│   ├── app.py
│   └── README.md
└── requirements.txt
```

## License

MIT
