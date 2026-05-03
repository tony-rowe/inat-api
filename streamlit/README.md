# Streamlit Reporting Dashboard

Turnkey reporting for iNaturalist observations across the Pacific Northwest. Shows data shortly after spin-up; the shared cache grows over time as API fetches and background sync run.

## Features

- **Quick first view**: Load preset (Quick ~25 sec) shows observations immediately; cache grows with each fetch
- **Shared cache**: API fetches upsert into the dashboard SQLite cache for zero-API loads on refresh
- **Smart defaults**: Prefers cache when it has data; defaults to API with Quick preset when empty
- **Load presets**: Quick (5k), Standard (50k), Full (200k+) for flexible depth
- Chained pagination and single-query taxon batching for API efficiency
- Year filter, quality grades, PNW bounds enforcement
- Rolling 7-day report, momentum by taxon, CSV export

## Run

From the repository root:

```bash
python3 -m pip install -r requirements.txt
python3 -m streamlit run streamlit/app.py
```

### Run with Docker Compose

From the repo root:

```bash
docker compose up -d --build streamlit
```

Default URL:

- `http://desertbuddha:8501` (Synology host example)

By default, the app loads tracked taxon IDs from `dashboard/server/species.js` and queries:

- Oregon (`10`)
- Washington (`46`)

Adjust load preset (Quick/Standard/Full) or Max records/pages in the sidebar for deeper historical coverage.

## Testing

Run API integration tests:

```bash
python streamlit/test_api.py
```

This verifies chained taxon queries, pagination, date filters, and a Quick-load simulation (~78 sec).
