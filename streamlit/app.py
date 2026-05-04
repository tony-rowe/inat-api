from __future__ import annotations

import calendar
import json
import math
import os
import re
import sqlite3
import time
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from pathlib import Path
from textwrap import dedent
from typing import Iterable

import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import requests
import streamlit as st

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------
API_BASE = "https://api.inaturalist.org/v1"
PER_PAGE = 200
DEFAULT_PNW_PLACE_IDS = [10, 46]  # 10=Oregon, 46=Washington
DEFAULT_DELAY_SECONDS = 1.1
DEFAULT_MAX_RECORDS = 5000
DEFAULT_MAX_PAGES = 25

MONTH_NAMES_FULL = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]
MONTH_NAMES_SHORT = [m[:3] for m in MONTH_NAMES_FULL]
QUALITY_GRADES = ["research", "needs_id", "casual"]

PNW_BOUNDS = {
    "min_latitude": 41.95,
    "max_latitude": 49.05,
    "min_longitude": -124.9,
    "max_longitude": -116.35,
}
DEFAULT_MAP_CENTER = {"lat": 45.5, "lon": -120.7}

DATA_DIR = Path(__file__).resolve().parent.parent / "mushroom_data"
REPORTS_DIR = Path(__file__).resolve().parent.parent / "reports"
MUSHROOM_FILE = Path(__file__).resolve().parent.parent / "mushrooms.txt"

DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)


def resolve_dashboard_cache_db() -> Path:
    docker_path = Path("/app/data/cache.db")
    repo_path = Path(__file__).resolve().parents[1] / "dashboard" / "data" / "cache.db"
    return docker_path if docker_path.exists() else repo_path


DASHBOARD_CACHE_DB = resolve_dashboard_cache_db()

# ---------------------------------------------------------------------------
# Built-in PNW species (from dashboard/server/species.js)
# ---------------------------------------------------------------------------
PNW_SPECIES = [
    {"id": "pacific-golden-chanterelle",  "taxon_id": 120443,  "common_name": "Pacific Golden Chanterelle",     "scientific_name": "Cantharellus formosus",       "season_start": 9,  "season_end": 12, "peak_months": [10, 11],        "edibility": "Choice edible",    "emoji": "🍄",  "color": "#F59E0B"},
    {"id": "white-chanterelle",           "taxon_id": 54132,   "common_name": "White Chanterelle",               "scientific_name": "Cantharellus subalbidus",      "season_start": 9,  "season_end": 12, "peak_months": [10, 11],        "edibility": "Choice edible",    "emoji": "🤍",  "color": "#F5F5DC"},
    {"id": "yellowfoot-chanterelle",      "taxon_id": 350511,  "common_name": "Yellowfoot Chanterelle",          "scientific_name": "Craterellus tubaeformis",      "season_start": 10, "season_end": 2,  "peak_months": [11, 12],        "edibility": "Good edible",      "emoji": "💛",  "color": "#CA8A04"},
    {"id": "king-bolete",                 "taxon_id": 48701,   "common_name": "King Bolete (Porcini)",           "scientific_name": "Boletus edulis",               "season_start": 8,  "season_end": 11, "peak_months": [9, 10],         "edibility": "Choice edible",    "emoji": "👑",  "color": "#8B4513"},
    {"id": "admirable-bolete",            "taxon_id": 790782,  "common_name": "Admirable Bolete",                "scientific_name": "Aureoboletus mirabilis",       "season_start": 8,  "season_end": 11, "peak_months": [9, 10],         "edibility": "Good edible",      "emoji": "🟤",  "color": "#5C4033"},
    {"id": "black-morel",                 "taxon_id": 1467061, "common_name": "Black Morel",                     "scientific_name": "Morchella elata",              "season_start": 3,  "season_end": 6,  "peak_months": [4, 5],          "edibility": "Choice (must cook)", "emoji": "🔥",  "color": "#3D2B1F"},
    {"id": "chicken-of-the-woods",        "taxon_id": 53713,   "common_name": "Chicken of the Woods",            "scientific_name": "Laetiporus sulphureus",        "season_start": 5,  "season_end": 11, "peak_months": [8, 9, 10],      "edibility": "Good edible",      "emoji": "🐔",  "color": "#FF6B00"},
    {"id": "hen-of-the-woods",            "taxon_id": 53714,   "common_name": "Hen of the Woods (Maitake)",      "scientific_name": "Grifola frondosa",             "season_start": 8,  "season_end": 11, "peak_months": [9, 10],         "edibility": "Choice edible",    "emoji": "🐓",  "color": "#6B7280"},
    {"id": "lions-mane",                  "taxon_id": 49158,   "common_name": "Lion's Mane",                     "scientific_name": "Hericium erinaceus",           "season_start": 8,  "season_end": 11, "peak_months": [9, 10],         "edibility": "Choice edible",    "emoji": "🦁",  "color": "#FAFAFA"},
    {"id": "coral-tooth",                 "taxon_id": 49162,   "common_name": "Coral Tooth Fungus",              "scientific_name": "Hericium coralloides",         "season_start": 8,  "season_end": 11, "peak_months": [9, 10],         "edibility": "Good edible",      "emoji": "🪸",  "color": "#E8E8E8"},
    {"id": "western-matsutake",           "taxon_id": 521711,  "common_name": "Western Matsutake",               "scientific_name": "Tricholoma murrillianum",      "season_start": 9,  "season_end": 12, "peak_months": [10, 11],        "edibility": "Choice edible",    "emoji": "🌲",  "color": "#D2B48C"},
    {"id": "lobster-mushroom",            "taxon_id": 48215,   "common_name": "Lobster Mushroom",                "scientific_name": "Hypomyces lactifluorum",       "season_start": 8,  "season_end": 10, "peak_months": [9],             "edibility": "Choice edible",    "emoji": "🦞",  "color": "#DC2626"},
    {"id": "hedgehog-mushroom",           "taxon_id": 48641,   "common_name": "Wood Hedgehog",                   "scientific_name": "Hydnum repandum",              "season_start": 9,  "season_end": 12, "peak_months": [10, 11],        "edibility": "Choice edible",    "emoji": "🦔",  "color": "#FBBF24"},
    {"id": "oyster-mushroom",             "taxon_id": 48494,   "common_name": "Oyster Mushroom",                 "scientific_name": "Pleurotus ostreatus",          "season_start": 10, "season_end": 4,  "peak_months": [11, 12, 1],     "edibility": "Good edible",      "emoji": "🦪",  "color": "#9CA3AF"},
    {"id": "cauliflower-mushroom",        "taxon_id": 486226,  "common_name": "Western Cauliflower Mushroom",    "scientific_name": "Sparassis radicata",           "season_start": 8,  "season_end": 11, "peak_months": [9, 10],         "edibility": "Good edible",      "emoji": "🥦",  "color": "#FEF3C7"},
    {"id": "black-trumpet",               "taxon_id": 48607,   "common_name": "Black Trumpet",                   "scientific_name": "Craterellus cornucopioides",   "season_start": 10, "season_end": 2,  "peak_months": [11, 12],        "edibility": "Choice edible",    "emoji": "🎺",  "color": "#1F2937"},
    {"id": "shaggy-mane",                 "taxon_id": 47392,   "common_name": "Shaggy Mane",                     "scientific_name": "Coprinus comatus",             "season_start": 9,  "season_end": 11, "peak_months": [10],            "edibility": "Good edible",      "emoji": "🧶",  "color": "#E5E7EB"},
    {"id": "giant-puffball",              "taxon_id": 57692,   "common_name": "Giant Puffball",                  "scientific_name": "Calvatia gigantea",            "season_start": 8,  "season_end": 10, "peak_months": [9],             "edibility": "Good edible",      "emoji": "⚪",  "color": "#F9FAFB"},
    {"id": "oregon-black-truffle",        "taxon_id": 125191,  "common_name": "Oregon Black Truffle",            "scientific_name": "Leucangium carthusianum",      "season_start": 11, "season_end": 3,  "peak_months": [12, 1, 2],      "edibility": "Choice edible",    "emoji": "⬛",  "color": "#292524"},
    {"id": "oregon-white-truffle",        "taxon_id": 517784,  "common_name": "Oregon White Truffle",            "scientific_name": "Tuber oregonense",             "season_start": 10, "season_end": 2,  "peak_months": [11, 12],        "edibility": "Choice edible",    "emoji": "⚪",  "color": "#FDF4E7"},
]


# ---------------------------------------------------------------------------
# Custom CSS
# ---------------------------------------------------------------------------
def inject_custom_css() -> None:
    st.markdown(dedent("""\
    <style>
    /* ── Google Font ── */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

    /* ── Root overrides ── */
    html, body, [class*="st-"], .stApp {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    /* ── Gradient header background ── */
    header[data-testid="stHeader"] {
        background: linear-gradient(135deg, #1a3a2a 0%, #2d5a3f 40%, #3d7a4f 100%);
    }
    .stApp {
        background: linear-gradient(180deg, #f0f4e8 0%, #e8efe0 30%, #fafcf8 100%);
    }

    /* ── Title styling ── */
    .app-title {
        font-size: 2.6rem;
        font-weight: 800;
        background: linear-gradient(135deg, #1a4a2e, #3d8b37);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        margin-bottom: 0.2rem;
    }
    .app-subtitle {
        font-size: 1rem;
        color: #6b7280;
        margin-bottom: 1rem;
    }

    /* ── Metric cards ── */
    div[data-testid="stMetric"] {
        background: linear-gradient(145deg, #ffffff 0%, #f8faf7 100%);
        border: 1px solid #e0e8dc;
        border-radius: 16px;
        padding: 1rem 1.2rem !important;
        box-shadow: 0 2px 12px rgba(30, 60, 30, 0.06);
        transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    div[data-testid="stMetric"]:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(30, 60, 30, 0.12);
    }
    div[data-testid="stMetric"] label {
        font-weight: 600 !important;
        color: #4a6b3a !important;
        font-size: 0.85rem !important;
        text-transform: uppercase;
        letter-spacing: 0.04em;
    }
    div[data-testid="stMetric"] div[data-testid="stMetricValue"] {
        font-size: 1.8rem !important;
        font-weight: 700 !important;
        color: #1a3a2a !important;
    }

    /* ── Info/Warning/Success boxes ── */
    div[data-testid="stAlert"] {
        border-radius: 12px !important;
        border-left-width: 4px !important;
    }

    /* ── Buttons ── */
    .stButton > button {
        border-radius: 10px !important;
        font-weight: 600 !important;
        transition: all 0.2s ease !important;
    }
    .stButton > button:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.12);
    }

    /* ── Expanders ── */
    div[data-testid="stExpander"] {
        border-radius: 12px !important;
        border: 1px solid #dde4d5 !important;
        background: #fafcf8 !important;
        box-shadow: 0 1px 4px rgba(0,0,0,0.03);
    }

    /* ── Tabs ── */
    button[data-baseweb="tab"] {
        font-weight: 600 !important;
        font-size: 0.95rem !important;
        border-radius: 8px 8px 0 0 !important;
    }
    button[data-baseweb="tab"][aria-selected="true"] {
        background: linear-gradient(135deg, #e8f5e3 0%, #d4ecd0 100%) !important;
        color: #1a4a2e !important;
    }

    /* ── Dataframe ── */
    div[data-testid="stDataFrame"] {
        border-radius: 12px !important;
        overflow: hidden;
    }

    /* ── Sidebar ── */
    section[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #f6f9f2 0%, #eaf1e3 100%) !important;
        border-right: 1px solid #d0dcc5 !important;
    }
    section[data-testid="stSidebar"] .st-emotion-cache-1gulkj5 {
        background: transparent !important;
    }

    /* ── Species card ── */
    .species-card {
        background: linear-gradient(145deg, #ffffff 0%, #f8faf7 100%);
        border: 1px solid #e0e8dc;
        border-radius: 14px;
        padding: 1rem;
        margin: 0.4rem 0;
        box-shadow: 0 2px 8px rgba(30, 60, 30, 0.05);
        transition: all 0.2s ease;
    }
    .species-card:hover {
        box-shadow: 0 4px 16px rgba(30, 60, 30, 0.12);
        transform: translateY(-1px);
    }

    /* ── Season badge ── */
    .season-badge-in {
        display: inline-block;
        background: linear-gradient(135deg, #3d8b37, #2d6a2e);
        color: white;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
    }
    .season-badge-out {
        display: inline-block;
        background: #e5e7eb;
        color: #6b7280;
        padding: 3px 10px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
    }

    /* ── Edibility badge ── */
    .edibility-choice {
        color: #15803d;
        font-weight: 700;
    }
    .edibility-good {
        color: #4a6b3a;
        font-weight: 600;
    }
    </style>
    """), unsafe_allow_html=True)


# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------
def parse_int_csv(text: str) -> list[int]:
    values = []
    for token in re.split(r"[,\s]+", text.strip()):
        if not token:
            continue
        if token.lstrip("-").isdigit():
            values.append(int(token))
    return sorted(set(values))


def load_tracked_mushrooms() -> dict[str, int]:
    mushrooms: dict[str, int] = {}
    if MUSHROOM_FILE.exists():
        for line in MUSHROOM_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                name, taxon_id = line.split(",", 1)
                mushrooms[name.strip()] = int(taxon_id.strip())
            except ValueError:
                continue
    return dict(sorted(mushrooms.items()))


def save_tracked_mushrooms(mushrooms: dict[str, int]) -> None:
    lines = [f"{name},{taxon_id}" for name, taxon_id in sorted(mushrooms.items())]
    MUSHROOM_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")


def load_cached_observations(taxon_id: int) -> list[dict]:
    cache_file = DATA_DIR / f"taxon_{taxon_id}.json"
    if cache_file.exists():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if not content:
                    return []
                return json.loads(content)
        except (json.JSONDecodeError, OSError, ValueError):
            return []
    return []


def save_cached_observations(taxon_id: int, data: list[dict]) -> None:
    cache_file = DATA_DIR / f"taxon_{taxon_id}.json"
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(data, f)


def validate_observation(obs: dict) -> bool:
    if not all(k in obs for k in ("id", "observed_on", "geojson")):
        return False
    if not obs["observed_on"] or not obs["geojson"]:
        return False
    coords = obs["geojson"].get("coordinates", [])
    if len(coords) != 2:
        return False
    lon, lat = coords
    return -180 <= lon <= 180 and -90 <= lat <= 90


def in_pnw_bounds(latitude: object, longitude: object) -> bool:
    try:
        lat = float(latitude)
        lon = float(longitude)
    except (TypeError, ValueError):
        return False
    return (
        PNW_BOUNDS["min_latitude"] <= lat <= PNW_BOUNDS["max_latitude"]
        and PNW_BOUNDS["min_longitude"] <= lon <= PNW_BOUNDS["max_longitude"]
    )


# ---------------------------------------------------------------------------
# iNaturalist API fetching
# ---------------------------------------------------------------------------
def _api_request(session: requests.Session, url: str, params: dict, headers: dict) -> dict:
    for attempt in range(3):
        try:
            resp = session.get(url, params=params, headers=headers, timeout=45)
            resp.raise_for_status()
            return resp.json()
        except (requests.RequestException, json.JSONDecodeError):
            if attempt < 2:
                time.sleep(2.0 * (attempt + 1))
    raise RuntimeError("iNaturalist API request failed after 3 retries.")


def fetch_observations(
    taxon_ids: list[int],
    place_ids: list[int] | None = None,
    quality_grades: Iterable[str] = ("research", "needs_id", "casual"),
    max_records: int = DEFAULT_MAX_RECORDS,
    max_pages: int = DEFAULT_MAX_PAGES,
    delay_seconds: float = DEFAULT_DELAY_SECONDS,
    years: list[int] | None = None,
    months: list[int] | None = None,
    id_below: int | None = None,
) -> pd.DataFrame:
    effective_place_ids = place_ids or DEFAULT_PNW_PLACE_IDS
    session = requests.Session()
    headers = {"User-Agent": "PNW-Mushroom-Observer/1.0"}
    rows: list[dict] = []
    quality = ",".join(sorted(set(quality_grades)))

    date_params: dict[str, str] = {}
    if years:
        min_y, max_y = min(years), max(years)
        if months:
            min_mo, max_mo = min(months), max(months)
            last_day = calendar.monthrange(max_y, max_mo)[1]
            date_params["d1"] = f"{min_y}-{min_mo:02d}-01"
            date_params["d2"] = f"{max_y}-{max_mo:02d}-{last_day:02d}"
        else:
            date_params["d1"] = f"{min_y}-01-01"
            date_params["d2"] = f"{max_y}-12-31"

    pages_fetched = 0
    while pages_fetched < max_pages and len(rows) < max_records:
        params: dict = {
            "place_id": ",".join(str(p) for p in effective_place_ids),
            "taxon_id": ",".join(str(t) for t in taxon_ids),
            "per_page": PER_PAGE,
            "order": "desc",
            "order_by": "observed_on",
            "photos": "true",
            "geo": "true",
            **date_params,
        }
        if quality:
            params["quality_grade"] = quality
        if id_below:
            params["id_below"] = id_below

        payload = _api_request(session, f"{API_BASE}/observations", params, headers)
        results = payload.get("results") or []
        if not results:
            break

        for obs in results:
            if not validate_observation(obs):
                continue
            taxon_data = obs.get("taxon") or {}
            coords = (obs.get("geojson") or {}).get("coordinates", [None, None])
            photos = obs.get("photos") or []
            photo_url = photos[0].get("url", "").replace("square", "medium") if photos else ""
            rows.append({
                "observation_id": obs.get("id"),
                "taxon_id": taxon_data.get("id"),
                "taxon_name": taxon_data.get("name"),
                "common_name": (taxon_data.get("preferred_common_name") or "").strip(),
                "quality_grade": obs.get("quality_grade"),
                "observed_on": obs.get("observed_on"),
                "latitude": coords[1],
                "longitude": coords[0],
                "place_guess": obs.get("place_guess") or "",
                "user_login": (obs.get("user") or {}).get("login") or "",
                "photo_url": photo_url,
                "url": f"https://www.inaturalist.org/observations/{obs.get('id')}",
            })

        pages_fetched += 1
        min_id = min((o.get("id") for o in results if o.get("id")), default=None)
        if min_id is None or len(results) < PER_PAGE:
            break
        id_below = min_id
        time.sleep(max(0.0, delay_seconds))

    df = pd.DataFrame(rows)
    if not df.empty and "observed_on" in df.columns:
        df["observed_on"] = pd.to_datetime(df["observed_on"], errors="coerce")
    return df


@st.cache_data(ttl=1800, show_spinner=False)
def cached_fetch_observations(
    taxon_ids: tuple[int, ...],
    place_ids: tuple[int, ...],
    quality_grades: tuple[str, ...],
    max_records: int,
    max_pages: int,
    delay_seconds: float,
    years: tuple[int, ...],
    months: tuple[int, ...],
) -> list[dict]:
    df = fetch_observations(
        taxon_ids=list(taxon_ids),
        place_ids=list(place_ids),
        quality_grades=quality_grades,
        max_records=max_records,
        max_pages=max_pages,
        delay_seconds=delay_seconds,
        years=list(years) if years else None,
        months=list(months) if months else None,
    )
    return df.to_dict(orient="records")


# ---------------------------------------------------------------------------
# Dashboard SQLite cache helpers
# ---------------------------------------------------------------------------
@st.cache_data(ttl=600, show_spinner=False)
def load_from_dashboard_cache(
    taxon_ids: tuple[int, ...],
    quality_grades: tuple[str, ...],
    max_records: int,
    enforce_pnw_bounds: bool,
    years: tuple[int, ...] = (),
    months: tuple[int, ...] = (),
) -> list[dict]:
    db_path = DASHBOARD_CACHE_DB
    if not db_path.exists():
        return []
    clauses = ["observed_on IS NOT NULL"]
    params: list = []
    if taxon_ids:
        clauses.append(f"taxon_id IN ({','.join('?' * len(taxon_ids))})")
        params.extend(taxon_ids)
    if quality_grades:
        clauses.append(f"quality_grade IN ({','.join('?' * len(quality_grades))})")
        params.extend(quality_grades)
    if years:
        clauses.append(f"strftime('%Y', observed_on) IN ({','.join('?' * len(years))})")
        params.extend(str(y) for y in years)
    if months:
        clauses.append(f"CAST(strftime('%m', observed_on) AS INTEGER) IN ({','.join('?' * len(months))})")
        params.extend(months)
    if enforce_pnw_bounds:
        clauses.append("((latitude IS NULL OR longitude IS NULL) OR (latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?))")
        params.extend([PNW_BOUNDS["min_latitude"], PNW_BOUNDS["max_latitude"], PNW_BOUNDS["min_longitude"], PNW_BOUNDS["max_longitude"]])
    where = " AND ".join(clauses)
    query = f"""
        SELECT id as observation_id, taxon_id, species_guess as taxon_name,
               species_guess as common_name, quality_grade, observed_on,
               latitude, longitude, place_guess, user_login
        FROM observations WHERE {where}
        ORDER BY observed_on DESC LIMIT ?
    """
    params.append(max_records)
    with sqlite3.connect(db_path) as conn:
        conn.row_factory = sqlite3.Row
        rows = conn.execute(query, params).fetchall()
    records = [dict(row) for row in rows]
    for r in records:
        r["url"] = f"https://www.inaturalist.org/observations/{r.get('observation_id')}"
    return records


# ── Season helpers ──
def _is_in_season(species: dict) -> bool:
    now = datetime.now()
    m = now.month
    start, end = species["season_start"], species["season_end"]
    if start > end:
        return m >= start or m <= end
    return start <= m <= end


def _season_label(species: dict) -> str:
    """Return (emoji, html_badge) for the species."""
    in_season = _is_in_season(species)
    peak = species.get("peak_months", [])
    now = datetime.now().month
    if in_season:
        if now in peak:
            badge = f'<span class="season-badge-in" style="background:linear-gradient(135deg,#e07b10,#c05600)">🔥 Peak Season</span>'
        else:
            badge = f'<span class="season-badge-in">✅ In Season</span>'
    else:
        badge = f'<span class="season-badge-out">❄️ Out of Season</span>'
    return badge


# ── Monthly analysis ──
def compute_monthly_heatmap(df: pd.DataFrame) -> pd.DataFrame | None:
    if df.empty or "observed_on" not in df.columns:
        return None
    dated = df.dropna(subset=["observed_on"]).copy()
    dated["year"] = dated["observed_on"].dt.year.astype(int)
    dated["month"] = dated["observed_on"].dt.month
    heat = dated.groupby(["year", "month"]).size().unstack(fill_value=0)
    heat = heat.reindex(columns=range(1, 13), fill_value=0).astype(int)
    heat.columns = MONTH_NAMES_SHORT
    return heat


def compute_seasonal_predictions(df: pd.DataFrame) -> dict:
    """Given a DataFrame, return per-month stats."""
    if df.empty or "observed_on" not in df.columns:
        return {}
    dated = df.dropna(subset=["observed_on"]).copy()
    dated["month"] = dated["observed_on"].dt.month
    monthly = dated.groupby("month").size()
    by_year_month = dated.assign(year=dated["observed_on"].dt.year).groupby(["year", "month"]).size()
    avg = by_year_month.groupby("month").mean()
    return {
        m: {"total": int(monthly.get(m, 0)), "avg": float(avg.get(m, 0))}
        for m in range(1, 13)
    }


# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="PNW Mushroom Observer",
    page_icon="🍄",
    layout="wide",
    initial_sidebar_state="expanded",
)
inject_custom_css()


# ---------------------------------------------------------------------------
# Session state initialization
# ---------------------------------------------------------------------------
if "tracked_mushrooms" not in st.session_state:
    st.session_state.tracked_mushrooms = load_tracked_mushrooms()
if "show_add_form" not in st.session_state:
    st.session_state.show_add_form = False
if "show_edit_form" not in st.session_state:
    st.session_state.show_edit_form = False
if "edit_target" not in st.session_state:
    st.session_state.edit_target = None
if "data_source" not in st.session_state:
    st.session_state.data_source = "Dashboard SQLite cache"
if "observations_loaded" not in st.session_state:
    st.session_state.observations_loaded = False


# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------
col_title, col_img = st.columns([5, 1])
with col_title:
    st.markdown('<p class="app-title">🍄 PNW Mushroom Observer</p>', unsafe_allow_html=True)
    st.markdown(
        '<p class="app-subtitle">Tracking wild edible mushroom observations across the Pacific Northwest'
        '<br>Data sourced from the <a href="https://inaturalist.org" target="_blank">iNaturalist</a> citizen-science platform.</p>',
        unsafe_allow_html=True,
    )


# ===================================================================
# SIDEBAR
# ===================================================================
with st.sidebar:
    st.markdown("### ⚙️ Configuration")

    # ── Data Source ──
    st.markdown("#### 📡 Data Source")
    cache_count = sum(
        len(load_cached_observations(tid))
        for tid in st.session_state.tracked_mushrooms.values()
    )
    db_cache_count = 0
    if DASHBOARD_CACHE_DB.exists():
        try:
            with sqlite3.connect(DASHBOARD_CACHE_DB) as conn:
                db_cache_count = conn.execute("SELECT COUNT(*) FROM observations").fetchone()[0]
        except sqlite3.Error:
            pass

    source_options = [
        f"Local JSON cache ({cache_count:,} obs) ⚡",
        f"Dashboard SQLite ({db_cache_count:,} obs) 💾",
        "iNaturalist API (live) 🌐",
    ]
    source_idx = 0 if cache_count > 0 else 1 if db_cache_count > 0 else 2
    data_source_label = st.selectbox(
        "Select data source",
        source_options,
        index=source_idx,
    )
    st.session_state.data_source = data_source_label

    # ── Filters ──
    with st.expander("🎯 Filters", expanded=True):
        quality = st.multiselect(
            "Quality grades",
            QUALITY_GRADES,
            default=["research", "needs_id"],
        )
        enforce_bounds = st.checkbox("Enforce PNW bounds", value=True)
        current_year = datetime.now().year
        year_options = list(range(2010, current_year + 1))
        selected_years = st.multiselect("Year filter", year_options, default=[])
        selected_months = st.multiselect(
            "Month filter",
            list(range(1, 13)),
            format_func=lambda m: MONTH_NAMES_SHORT[m - 1],
            default=[],
        )
        use_dates = st.checkbox("Custom date range")
        date_min_filter: str | None = None
        date_max_filter: str | None = None
        if use_dates:
            dr = st.date_input("Date range", value=(datetime(2020, 1, 1).date(), datetime(current_year, 12, 31).date()))
            if isinstance(dr, tuple) and len(dr) >= 2 and dr[0] and dr[1]:
                date_min_filter = dr[0].isoformat()
                date_max_filter = dr[1].isoformat()
            elif dr and not isinstance(dr, tuple):
                date_min_filter = date_max_filter = dr.isoformat()

        curated_years = tuple(selected_years) if selected_years else ()
        curated_months = tuple(selected_months) if selected_months else ()
        curated_quality = tuple(quality) if quality else tuple(QUALITY_GRADES)

    # ── Species management ──
    with st.expander("🍄 Tracked Species", expanded=True):
        tracked = st.session_state.tracked_mushrooms
        if not tracked:
            st.info("No species tracked yet. Add some below or use the built-in PNW species list.")
        else:
            for name, tid in tracked.items():
                c1, c2, c3 = st.columns([5, 1, 1])
                c1.write(f"**{name}**  `ID:{tid}`")
                if c2.button("✏️", key=f"edit_{name}", help=f"Edit {name}"):
                    st.session_state.edit_target = name
                    st.session_state.show_edit_form = True
                    st.rerun()
                if c3.button("🗑️", key=f"del_{name}", help=f"Remove {name}"):
                    del st.session_state.tracked_mushrooms[name]
                    save_tracked_mushrooms(st.session_state.tracked_mushrooms)
                    st.success(f"Removed **{name}**")
                    st.rerun()

        col_add, col_bulk = st.columns(2)
        if col_add.button("➕ Add Species", use_container_width=True):
            st.session_state.show_add_form = True
            st.rerun()
        if col_bulk.button("📋 Load all PNW", use_container_width=True, help="Load all 20 built-in PNW species"):
            for sp in PNW_SPECIES:
                st.session_state.tracked_mushrooms[sp["common_name"]] = sp["taxon_id"]
            save_tracked_mushrooms(st.session_state.tracked_mushrooms)
            st.success("Loaded all 20 PNW species!")
            st.rerun()

        # Add species form (modal-like)
        if st.session_state.show_add_form:
            st.markdown("---")
            st.markdown("**Add New Species**")
            with st.form("add_species_form"):
                new_name = st.text_input("Common name")
                new_id = st.text_input("iNaturalist taxon ID")
                submitted = st.form_submit_button("✅ Save")
                if submitted and new_name.strip() and new_id.strip().isdigit():
                    tid = int(new_id.strip())
                    st.session_state.tracked_mushrooms[new_name.strip()] = tid
                    save_tracked_mushrooms(st.session_state.tracked_mushrooms)
                    st.session_state.show_add_form = False
                    st.success(f"Added **{new_name.strip()}**")
                    st.rerun()
            if st.button("Cancel"):
                st.session_state.show_add_form = False
                st.rerun()

        # Edit species form
        if st.session_state.show_edit_form and st.session_state.edit_target:
            target = st.session_state.edit_target
            old_tid = st.session_state.tracked_mushrooms[target]
            st.markdown("---")
            st.markdown(f"**Edit: {target}**")
            with st.form("edit_species_form"):
                new_name = st.text_input("Common name", value=target)
                new_id = st.text_input("iNaturalist taxon ID", value=str(old_tid))
                submitted = st.form_submit_button("💾 Update")
                if submitted and new_name.strip() and new_id.strip().isdigit():
                    del st.session_state.tracked_mushrooms[target]
                    st.session_state.tracked_mushrooms[new_name.strip()] = int(new_id.strip())
                    save_tracked_mushrooms(st.session_state.tracked_mushrooms)
                    st.session_state.show_edit_form = False
                    st.session_state.edit_target = None
                    st.success(f"Updated **{new_name.strip()}**")
                    st.rerun()
            if st.button("Cancel", key="cancel_edit"):
                st.session_state.show_edit_form = False
                st.session_state.edit_target = None
                st.rerun()

    # ── Cache purge ──
    with st.expander("🗑️ Maintenance"):
        if st.button("Purge local JSON cache"):
            count = 0
            for f in DATA_DIR.glob("taxon_*.json"):
                f.unlink()
                count += 1
            st.success(f"Purged {count} cache files.")
        if st.button("Clear Streamlit cache"):
            st.cache_data.clear()
            st.success("Streamlit cache cleared.")

    # ── Footer ──
    st.markdown("---")
    st.caption(
        "Built with ❤️ for PNW mushroom foragers. "
        "Data from [iNaturalist.org](https://inaturalist.org). "
        "Please respect API rate limits."
    )


# ===================================================================
# LOAD DATA
# ===================================================================
tracked = st.session_state.tracked_mushrooms
if not tracked:
    st.warning("No species are being tracked. Use the sidebar to add species or load all PNW species.")
    st.stop()

taxon_ids = list(tracked.values())

records: list[dict] = []
meta: dict = {"source": "unknown", "record_count": 0}

with st.spinner("📡 Loading observations..."):
    if "API" in data_source_label:
        try:
            records = cached_fetch_observations(
                taxon_ids=tuple(taxon_ids),
                place_ids=tuple(DEFAULT_PNW_PLACE_IDS),
                quality_grades=curated_quality,
                max_records=DEFAULT_MAX_RECORDS,
                max_pages=DEFAULT_MAX_PAGES,
                delay_seconds=DEFAULT_DELAY_SECONDS,
                years=curated_years,
                months=curated_months,
            )
            meta["source"] = "inat_api"
            # Save to local cache per taxon
            for tid in taxon_ids:
                subset = [r for r in records if r.get("taxon_id") == tid]
                if subset:
                    save_cached_observations(tid, subset)
        except RuntimeError as e:
            st.error(str(e))
            st.stop()
    elif "SQLite" in data_source_label:
        records = load_from_dashboard_cache(
            taxon_ids=tuple(taxon_ids),
            quality_grades=curated_quality,
            max_records=DEFAULT_MAX_RECORDS,
            enforce_pnw_bounds=enforce_bounds,
            years=curated_years,
            months=curated_months,
        )
        meta["source"] = "dashboard_cache"
        # Fix: enforce_bounds filtering if not done in SQL
        if not enforce_bounds:
            filtered = [r for r in records if r.get("latitude") is None or r.get("longitude") is None or in_pnw_bounds(r.get("latitude"), r.get("longitude"))]
            records = filtered
    else:
        all_records = []
        for name, tid in tracked.items():
            cached = load_cached_observations(tid)
            if cached:
                all_records.extend(cached)
            else:
                # Fetch from API
                try:
                    df_fresh = fetch_observations(
                        taxon_ids=[tid],
                        place_ids=DEFAULT_PNW_PLACE_IDS,
                        quality_grades=curated_quality,
                        max_records=DEFAULT_MAX_RECORDS,
                        max_pages=5,
                    )
                    if not df_fresh.empty:
                        fresh_data = df_fresh.to_dict(orient="records")
                        save_cached_observations(tid, fresh_data)
                        all_records.extend(fresh_data)
                except RuntimeError:
                    st.warning(f"Could not fetch {name}. Using cached data if available.")
        records = all_records
        meta["source"] = "local_json"

# Post-load filtering
df = pd.DataFrame.from_records(records)
if not df.empty and "observed_on" in df.columns:
    df["observed_on"] = pd.to_datetime(df["observed_on"], errors="coerce")
    if curated_months and "observed_on" in df.columns:
        df = df[df["observed_on"].dt.month.isin(curated_months)]

if df.empty:
    st.warning("No observations found for the current selection. Try adjusting filters or loading data from the API.")
    st.stop()

meta["record_count"] = len(df)

# Display load summary
source_label_map = {
    "inat_api": "🔴 iNaturalist API (live)",
    "dashboard_cache": "💾 Dashboard SQLite cache",
    "local_json": "⚡ Local JSON cache",
}
source_badge = source_label_map.get(meta["source"], meta["source"])
st.caption(f"Data: {source_badge}  •  {meta['record_count']:,} observations  •  {df['taxon_id'].nunique():,} species")

# ===================================================================
# TABS
# ===================================================================
tab_dashboard, tab_explorer, tab_timeseries, tab_geographic, tab_raw = st.tabs([
    "🏠 Dashboard", "🔍 Species Explorer", "📈 Time Series", "🗺️ Geographic", "📋 Raw Data",
])

# ───────────────────────────────────────────────────────────────────
# TAB 1: DASHBOARD
# ───────────────────────────────────────────────────────────────────
with tab_dashboard:
    # --- KPI Row ---
    dated_df = df.dropna(subset=["observed_on"])
    date_min = dated_df["observed_on"].min() if not dated_df.empty else pd.NaT
    date_max = dated_df["observed_on"].max() if not dated_df.empty else pd.NaT
    span = (date_max - date_min).days if pd.notna(date_min) and pd.notna(date_max) else 0
    obs_per_day = len(dated_df) / max(1, span) if span else 0

    yoy = None
    if not dated_df.empty:
        by_year = dated_df.groupby(dated_df["observed_on"].dt.year).size()
        if len(by_year) >= 2:
            prev, curr = by_year.iloc[-2], by_year.iloc[-1]
            yoy = (curr - prev) / max(1, prev) * 100

    rg_pct = (df["quality_grade"] == "research").sum() / max(1, len(df)) * 100
    geo_count = df.dropna(subset=["latitude", "longitude"]).shape[0]

    kpi1, kpi2, kpi3, kpi4, kpi5, kpi6 = st.columns(6)
    kpi1.metric("Total Observations", f"{len(df):,}")
    kpi2.metric("Distinct Species", f"{df['taxon_id'].nunique():,}")
    kpi3.metric("Avg Obs/Day", f"{obs_per_day:.1f}")
    kpi4.metric("YoY Growth", f"{yoy:+.1f}%" if yoy is not None else "n/a")
    kpi5.metric("Research Grade", f"{rg_pct:.1f}%")
    kpi6.metric("With Coordinates", f"{geo_count:,}")

    st.markdown("---")

    # --- What's Fruiting Now? ---
    st.subheader("🌿 What's Fruiting Right Now?")
    now_month = datetime.now().month
    in_season_species = [s for s in PNW_SPECIES if s["taxon_id"] in taxon_ids and _is_in_season(s)]
    peak_species = [s for s in in_season_species if now_month in s.get("peak_months", [])]
    other_season = [s for s in in_season_species if now_month not in s.get("peak_months", [])]

    if in_season_species:
        cols = st.columns(min(4, len(in_season_species)))
        for i, sp in enumerate(in_season_species):
            col = cols[i % len(cols)]
            with col:
                is_peak = sp in peak_species
                bg = sp.get("color", "#e8f5e3")
                emoji = sp.get("emoji", "🍄")
                border_color = "#e07b10" if is_peak else "#4caf50"
                col.markdown(f"""
                <div style="
                    background: linear-gradient(145deg, white, {bg}33);
                    border: 2px solid {border_color};
                    border-radius: 16px;
                    padding: 1rem;
                    margin: 0.3rem 0;
                ">
                    <div style="font-size:1.8rem">{emoji}</div>
                    <div style="font-weight:700; color:#1a3a2a; margin-top:0.3rem">{sp['common_name']}</div>
                    <div style="font-size:0.8rem; color:#6b7280; font-style:italic">{sp['scientific_name']}</div>
                    <div style="margin-top:0.4rem">{_season_label(sp)}</div>
                    <div style="font-size:0.75rem; color:#4a6b3a; margin-top:0.3rem">{sp.get('edibility','')}</div>
                </div>
                """, unsafe_allow_html=True)
    else:
        st.info("No species from your tracked list are currently in season. Try adding more species from the PNW list!")

    st.markdown("---")

    # --- Seasonal Predictions (aggregate) ---
    st.subheader("📊 Aggregate Seasonal Patterns")
    monthly_agg = dated_df.groupby(dated_df["observed_on"].dt.month).size() if not dated_df.empty else pd.Series(dtype=int)
    by_year_month = dated_df.assign(year=dated_df["observed_on"].dt.year).groupby(["year", dated_df["observed_on"].dt.month]).size() if not dated_df.empty else pd.Series(dtype=int)
    monthly_avg = by_year_month.groupby(level=1).mean() if not by_year_month.empty else pd.Series(dtype=float)

    fig_seasonal = go.Figure()
    fig_seasonal.add_trace(go.Bar(
        x=list(range(1, 13)),
        y=[monthly_agg.get(m, 0) for m in range(1, 13)],
        name="Total Observations",
        marker_color="#4a6b3a",
        marker_line=dict(color="#2d5a2f", width=1),
    ))
    fig_seasonal.add_trace(go.Scatter(
        x=list(range(1, 13)),
        y=[monthly_avg.get(m, 0) for m in range(1, 13)],
        name="Yearly Average",
        mode="lines+markers",
        line=dict(color="#e07b10", width=3),
        marker=dict(size=8, color="#e07b10"),
    ))
    now = datetime.now().month
    fig_seasonal.add_vline(x=now, line_dash="dash", line_color="red", annotation_text=f"Now ({MONTH_NAMES_SHORT[now-1]})")
    fig_seasonal.update_layout(
        height=400,
        margin=dict(l=20, r=20, t=30, b=20),
        xaxis=dict(tickmode="array", tickvals=list(range(1, 13)), ticktext=MONTH_NAMES_SHORT),
        legend=dict(orientation="h", y=1.12),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
    )
    st.plotly_chart(fig_seasonal, use_container_width=True)

    # --- Quality Distribution ---
    col_q1, col_q2 = st.columns(2)
    with col_q1:
        st.subheader("Quality Grade Distribution")
        quality_counts = df["quality_grade"].value_counts()
        fig_qual = px.pie(
            values=quality_counts.values,
            names=quality_counts.index,
            color_discrete_sequence=["#15803d", "#e07b10", "#6b7280"],
            hole=0.5,
        )
        fig_qual.update_layout(height=320, margin=dict(l=10, r=10, t=10, b=10))
        st.plotly_chart(fig_qual, use_container_width=True)

    with col_q2:
        st.subheader("Year-over-Year Trend")
        if not by_year_month.empty:
            yoy_df = by_year_month.groupby(level=0).sum().reset_index()
            yoy_df.columns = ["year", "observations"]
            fig_yoy = px.bar(
                yoy_df, x="year", y="observations",
                color_discrete_sequence=["#3d8b37"],
            )
            fig_yoy.update_layout(height=320, margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig_yoy, use_container_width=True)
        else:
            st.info("Not enough data for YoY trend.")


# ───────────────────────────────────────────────────────────────────
# TAB 2: SPECIES EXPLORER
# ───────────────────────────────────────────────────────────────────
with tab_explorer:
    # Species selector
    species_names_in_data = df["taxon_name"].dropna().unique().tolist()
    # Map taxon IDs to names
    id_to_name = {v: k for k, v in tracked.items()}
    species_options = []
    for tid in df["taxon_id"].unique():
        name = id_to_name.get(tid, f"Taxon {tid}")
        count = (df["taxon_id"] == tid).sum()
        species_options.append((name, tid, count))
    species_options.sort(key=lambda x: -x[2])  # Sort by count desc

    if not species_options:
        st.info("No species data available.")
        st.stop()

    # Species dropdown
    option_labels = [f"{n} ({c} obs)" for n, _, c in species_options]
    selected_idx = st.selectbox(
        "Select a species to explore",
        range(len(species_options)),
        format_func=lambda i: option_labels[i],
    )
    sel_name, sel_tid, _ = species_options[selected_idx]

    species_df = df[df["taxon_id"] == sel_tid].copy()
    if species_df.empty:
        st.warning(f"No observations for **{sel_name}**.")
        st.stop()

    # Build per-species metrics from PNW_SPECIES
    species_info = next((s for s in PNW_SPECIES if s["taxon_id"] == sel_tid), None)

    # Top section: info + metrics
    if species_info:
        emoji = species_info.get("emoji", "🍄")
        desc = species_info.get("description", "")
        habitat = species_info.get("habitat", "")
        edibility = species_info.get("edibility", "")
        col_info, col_metrics = st.columns([3, 2])
        with col_info:
            st.markdown(f"### {emoji} {species_info['common_name']}")
            st.caption(f"*{species_info['scientific_name']}* — Taxon ID: `{sel_tid}`")
            if desc:
                st.markdown(desc)
            st.caption(f"**Habitat:** {habitat}  •  **Edibility:** {edibility}")
    else:
        st.markdown(f"### 🍄 {sel_name}")
        st.caption(f"Taxon ID: `{sel_tid}`")

    # Metrics row
    sp_dated = species_df.dropna(subset=["observed_on"])
    sp_total = len(species_df)
    sp_research = (species_df["quality_grade"] == "research").sum()
    sp_geo = species_df.dropna(subset=["latitude", "longitude"]).shape[0]
    sp_unique_places = species_df["place_guess"].nunique()

    sp_m1, sp_m2, sp_m3, sp_m4, sp_m5 = st.columns(5)
    sp_m1.metric("Observations", f"{sp_total:,}")
    sp_m2.metric("Research Grade", f"{sp_research/sp_total*100:.1f}%" if sp_total else "0%")
    sp_m3.metric("Mapped", f"{sp_geo:,}")
    sp_m4.metric("Unique Places", f"{sp_unique_places:,}")
    sp_m5.metric("Avg Obs/Year", f"{sp_total/max(1, (datetime.now().year - int(sp_dated['observed_on'].dt.year.min() or 2010) + 1)):.1f}")

    st.markdown("---")

    # Monthly pattern
    col_heat, col_monthly = st.columns(2)
    with col_heat:
        st.subheader("Seasonal Heatmap (Month × Year)")
        heat = compute_monthly_heatmap(species_df)
        if heat is not None and not heat.empty:
            fig_heat = px.imshow(
                heat, labels=dict(x="Month", y="Year", color="Obs"),
                aspect="auto", color_continuous_scale="YlOrBr",
            )
            fig_heat.update_layout(height=380, margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig_heat, use_container_width=True)
        else:
            st.info("Not enough data for heatmap.")

    with col_monthly:
        st.subheader("Monthly Distribution")
        predictions = compute_seasonal_predictions(species_df)
        if predictions:
            months = list(range(1, 13))
            totals = [predictions[m]["total"] for m in months]
            avgs = [predictions[m]["avg"] for m in months]
            fig_mo = go.Figure()
            fig_mo.add_trace(go.Bar(x=months, y=totals, name="Total", marker_color="#4a6b3a"))
            fig_mo.add_trace(go.Scatter(x=months, y=avgs, name="Yearly Avg", mode="lines+markers",
                                         line=dict(color="#e07b10", width=2.5),
                                         marker=dict(size=7, color="#e07b10")))
            now_m = datetime.now().month
            fig_mo.add_vline(x=now_m, line_dash="dash", line_color="red",
                             annotation_text=f"Now ({MONTH_NAMES_SHORT[now_m-1]})")
            fig_mo.update_layout(
                height=380, margin=dict(l=10, r=10, t=10, b=10),
                xaxis=dict(tickmode="array", tickvals=months, ticktext=MONTH_NAMES_SHORT),
                legend=dict(orientation="h", y=1.1),
            )
            st.plotly_chart(fig_mo, use_container_width=True)
        else:
            st.info("Not enough data.")

    # Map
    st.subheader("🗺️ Observation Map")
    map_df = species_df.dropna(subset=["latitude", "longitude"])[["latitude", "longitude"]]
    if not map_df.empty:
        st.map(map_df, size=8, use_container_width=True)
    else:
        st.info("No geo-tagged observations for this species.")

    # Quality breakdown and observers
    col_qb, col_obs = st.columns(2)
    with col_qb:
        st.subheader("Quality Breakdown")
        qc = species_df["quality_grade"].value_counts()
        fig_qc = px.pie(values=qc.values, names=qc.index, color_discrete_sequence=["#15803d", "#e07b10", "#6b7280"], hole=0.4)
        fig_qc.update_layout(height=280, margin=dict(l=10, r=10, t=10, b=10))
        st.plotly_chart(fig_qc, use_container_width=True)

    with col_obs:
        st.subheader("Top Observers")
        if "user_login" in species_df.columns:
            top_users = species_df["user_login"].value_counts().head(10)
            fig_users = px.bar(
                x=top_users.values, y=top_users.index, orientation="h",
                color_discrete_sequence=["#3d8b37"], text=top_users.values,
            )
            fig_users.update_layout(height=280, margin=dict(l=10, r=10, t=10, b=10), yaxis=dict(autorange="reversed"))
            st.plotly_chart(fig_users, use_container_width=True)
        else:
            st.info("No observer data.")


# ───────────────────────────────────────────────────────────────────
# TAB 3: TIME SERIES
# ───────────────────────────────────────────────────────────────────
with tab_timeseries:
    if dated_df.empty:
        st.info("No dated observations for time series analysis.")
    else:
        # Daily view
        st.subheader("Daily Observations + 7-Day Rolling Average")
        daily = (
            dated_df.assign(day=dated_df["observed_on"].dt.date)
            .groupby("day", as_index=False)["observation_id"]
            .count()
            .rename(columns={"observation_id": "observations"})
            .sort_values("day")
        )
        if not daily.empty:
            daily["rolling_7d"] = daily["observations"].rolling(window=7, min_periods=1).sum()
            fig_daily = px.line(
                daily, x="day", y=["rolling_7d"],
                labels={"value": "Observations", "variable": "Series"},
                color_discrete_sequence=["#e07b10"],
            )
            fig_daily.update_layout(height=360, margin=dict(l=10, r=10, t=10, b=10), legend=dict(orientation="h", y=1.1))
            st.plotly_chart(fig_daily, use_container_width=True)

        # Monthly view
        st.subheader("Monthly Trend")
        monthly = (
            dated_df.assign(month=dated_df["observed_on"].dt.to_period("M").astype(str))
            .groupby("month", as_index=False)["observation_id"]
            .count()
            .rename(columns={"observation_id": "observations"})
        )
        if not monthly.empty:
            fig_monthly = px.bar(
                monthly, x="month", y="observations",
                color_discrete_sequence=["#3d8b37"],
            )
            fig_monthly.update_layout(height=340, margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig_monthly, use_container_width=True)

        # Weekly momentum by species
        st.subheader("Weekly Momentum by Species (Current vs Previous Week)")
        now_utc = datetime.now(tz=timezone.utc)
        cur_start = pd.Timestamp(now_utc.date() - timedelta(days=6))
        prev_start = pd.Timestamp(now_utc.date() - timedelta(days=13))
        prev_end = pd.Timestamp(now_utc.date() - timedelta(days=7))

        cur_week = (
            dated_df[dated_df["observed_on"] >= cur_start]
            .groupby(["taxon_id", "taxon_name"], as_index=False)["observation_id"]
            .count()
            .rename(columns={"observation_id": "current_7d"})
        )
        prev_week = (
            dated_df[(dated_df["observed_on"] >= prev_start) & (dated_df["observed_on"] <= prev_end)]
            .groupby(["taxon_id", "taxon_name"], as_index=False)["observation_id"]
            .count()
            .rename(columns={"observation_id": "previous_7d"})
        )
        momentum = cur_week.merge(prev_week, on=["taxon_id", "taxon_name"], how="outer").fillna(0)
        momentum["delta"] = momentum["current_7d"] - momentum["previous_7d"]
        momentum = momentum.sort_values("current_7d", ascending=False).head(15)
        if not momentum.empty:
            fig_mom = px.bar(
                momentum, x="taxon_name", y=["current_7d", "previous_7d"],
                barmode="group",
                color_discrete_sequence=["#3d8b37", "#9ca3af"],
                labels={"value": "Observations", "taxon_name": "Species", "variable": "Week"},
            )
            fig_mom.update_layout(height=380, margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig_mom, use_container_width=True)
        else:
            st.info("No observations in recent weeks.")


# ───────────────────────────────────────────────────────────────────
# TAB 4: GEOGRAPHIC
# ───────────────────────────────────────────────────────────────────
with tab_geographic:
    map_data = df.dropna(subset=["latitude", "longitude"])[["latitude", "longitude"]]
    if not map_data.empty:
        st.subheader("All Observations Map")
        st.map(map_data, size=5, use_container_width=True)
    else:
        st.info("No geo-tagged observations.")

    # By place
    if "place_guess" in df.columns:
        st.subheader("Observations by Place")
        place_counts = (
            df.assign(place=df["place_guess"].fillna("(unknown)"))
            .groupby("place", as_index=False)["observation_id"]
            .count()
            .rename(columns={"observation_id": "observations"})
            .sort_values("observations", ascending=False)
            .head(20)
        )
        fig_place = px.bar(
            place_counts, x="observations", y="place", orientation="h",
            color_discrete_sequence=["#3d8b37"], text="observations",
        )
        fig_place.update_layout(height=440, margin=dict(l=10, r=10, t=10, b=10), yaxis=dict(autorange="reversed"))
        st.plotly_chart(fig_place, use_container_width=True)

    # By observer
    if "user_login" in df.columns:
        st.subheader("Top Observers")
        user_counts = (
            df[df["user_login"].notna() & (df["user_login"] != "")]
            .groupby("user_login", as_index=False)["observation_id"]
            .count()
            .rename(columns={"observation_id": "observations"})
            .sort_values("observations", ascending=False)
            .head(20)
        )
        col_u1, col_u2 = st.columns([3, 2])
        with col_u1:
            fig_users = px.bar(
                user_counts, x="observations", y="user_login", orientation="h",
                color_discrete_sequence=["#e07b10"], text="observations",
            )
            fig_users.update_layout(height=440, margin=dict(l=10, r=10, t=10, b=10), yaxis=dict(autorange="reversed"))
            st.plotly_chart(fig_users, use_container_width=True)
        with col_u2:
            st.metric("Unique Observers", f"{df['user_login'].nunique():,}")


# ───────────────────────────────────────────────────────────────────
# TAB 5: RAW DATA
# ───────────────────────────────────────────────────────────────────
with tab_raw:
    st.subheader("Raw Observations")
    display_df = df[
        ["observation_id", "observed_on", "taxon_id", "taxon_name", "common_name",
         "quality_grade", "place_guess", "latitude", "longitude", "user_login", "url"]
    ].sort_values("observed_on", ascending=False)

    limit = min(5000, len(display_df))
    st.dataframe(
        display_df.head(limit),
        use_container_width=True,
        hide_index=True,
        height=420,
    )
    if len(display_df) > limit:
        st.caption(f"Showing first {limit:,} of {len(display_df):,} observations. Download CSV for full dataset.")

    csv_bytes = display_df.to_csv(index=False).encode("utf-8")
    st.download_button(
        label=f"📥 Download CSV ({len(display_df):,} rows)",
        data=csv_bytes,
        file_name=f"pnw_mushroom_observations_{datetime.now().date().isoformat()}.csv",
        mime="text/csv",
    )


# ───────────────────────────────────────────────────────────────────
# Footer
# ───────────────────────────────────────────────────────────────────
st.markdown("---")
st.caption(
    f"🍄 PNW Mushroom Observer  •  {len(df):,} observations  •  {df['taxon_id'].nunique():,} species  •  "
    f"Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}  •  "
    f"[GitHub](https://github.com/anomalyco/opencode)  •  "
    f"Data courtesy of [iNaturalist](https://inaturalist.org)"
)
