from __future__ import annotations

import calendar
import json
import math
import re
import sqlite3
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

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
DEFAULT_DELAY = 1.1
DEFAULT_MAX_RECORDS = 5000
DEFAULT_MAX_PAGES = 25
DEFAULT_PLACE_IDS = [10, 46]

MONTH_FULL = ["January","February","March","April","May","June",
              "July","August","September","October","November","December"]
MONTH_SHORT = [m[:3] for m in MONTH_FULL]
QUALITY_GRADES = ["research", "needs_id", "casual"]

PNW_BOUNDS = dict(min_lat=41.95, max_lat=49.05, min_lon=-124.9, max_lon=-116.35)

DATA_DIR = Path(__file__).resolve().parent.parent / "mushroom_data"
REPORTS_DIR = Path(__file__).resolve().parent.parent / "reports"
MUSHROOM_FILE = Path(__file__).resolve().parent.parent / "mushrooms.txt"
DATA_DIR.mkdir(parents=True, exist_ok=True)
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

DASHBOARD_CACHE_DB = Path("/app/data/cache.db")
if not DASHBOARD_CACHE_DB.exists():
    DASHBOARD_CACHE_DB = Path(__file__).resolve().parents[1] / "dashboard" / "data" / "cache.db"

# ---------------------------------------------------------------------------
# 20 built-in PNW edible species
# ---------------------------------------------------------------------------
PNW_SPECIES = [
    dict(id="pacific-golden-chanterelle", taxon_id=120443,  common_name="Pacific Golden Chanterelle",   scientific_name="Cantharellus formosus",      season=[9,12], peak=[10,11],   edibility="Choice edible",        emoji="🍄", color="#F59E0B"),
    dict(id="white-chanterelle",          taxon_id=54132,   common_name="White Chanterelle",            scientific_name="Cantharellus subalbidus",    season=[9,12], peak=[10,11],   edibility="Choice edible",        emoji="🤍", color="#F5F5DC"),
    dict(id="yellowfoot-chanterelle",     taxon_id=350511,  common_name="Yellowfoot Chanterelle",       scientific_name="Craterellus tubaeformis",    season=[10,2], peak=[11,12],   edibility="Good edible",          emoji="💛", color="#CA8A04"),
    dict(id="king-bolete",                taxon_id=48701,   common_name="King Bolete (Porcini)",        scientific_name="Boletus edulis",             season=[8,11], peak=[9,10],    edibility="Choice edible",        emoji="👑", color="#8B4513"),
    dict(id="admirable-bolete",           taxon_id=790782,  common_name="Admirable Bolete",             scientific_name="Aureoboletus mirabilis",     season=[8,11], peak=[9,10],    edibility="Good edible",          emoji="🟤", color="#5C4033"),
    dict(id="black-morel",                taxon_id=1467061, common_name="Black Morel",                  scientific_name="Morchella elata",            season=[3,6],  peak=[4,5],     edibility="Choice (must cook)",   emoji="🔥", color="#3D2B1F"),
    dict(id="chicken-of-the-woods",       taxon_id=53713,   common_name="Chicken of the Woods",         scientific_name="Laetiporus sulphureus",      season=[5,11], peak=[8,9,10],  edibility="Good edible",          emoji="🐔", color="#FF6B00"),
    dict(id="hen-of-the-woods",           taxon_id=53714,   common_name="Hen of the Woods (Maitake)",   scientific_name="Grifola frondosa",           season=[8,11], peak=[9,10],    edibility="Choice edible",        emoji="🐓", color="#6B7280"),
    dict(id="lions-mane",                 taxon_id=49158,   common_name="Lion's Mane",                  scientific_name="Hericium erinaceus",         season=[8,11], peak=[9,10],    edibility="Choice edible",        emoji="🦁", color="#FAFAFA"),
    dict(id="coral-tooth",                taxon_id=49162,   common_name="Coral Tooth Fungus",           scientific_name="Hericium coralloides",       season=[8,11], peak=[9,10],    edibility="Good edible",          emoji="🪸", color="#E8E8E8"),
    dict(id="western-matsutake",          taxon_id=521711,  common_name="Western Matsutake",            scientific_name="Tricholoma murrillianum",    season=[9,12], peak=[10,11],   edibility="Choice edible",        emoji="🌲", color="#D2B48C"),
    dict(id="lobster-mushroom",           taxon_id=48215,   common_name="Lobster Mushroom",             scientific_name="Hypomyces lactifluorum",     season=[8,10], peak=[9],       edibility="Choice edible",        emoji="🦞", color="#DC2626"),
    dict(id="hedgehog-mushroom",          taxon_id=48641,   common_name="Wood Hedgehog",                scientific_name="Hydnum repandum",            season=[9,12], peak=[10,11],   edibility="Choice edible",        emoji="🦔", color="#FBBF24"),
    dict(id="oyster-mushroom",            taxon_id=48494,   common_name="Oyster Mushroom",              scientific_name="Pleurotus ostreatus",        season=[10,4], peak=[11,12,1], edibility="Good edible",          emoji="🦪", color="#9CA3AF"),
    dict(id="cauliflower-mushroom",       taxon_id=486226,  common_name="Western Cauliflower Mushroom", scientific_name="Sparassis radicata",         season=[8,11], peak=[9,10],    edibility="Good edible",          emoji="🥦", color="#FEF3C7"),
    dict(id="black-trumpet",              taxon_id=48607,   common_name="Black Trumpet",                scientific_name="Craterellus cornucopioides", season=[10,2], peak=[11,12],   edibility="Choice edible",        emoji="🎺", color="#1F2937"),
    dict(id="shaggy-mane",                taxon_id=47392,   common_name="Shaggy Mane",                  scientific_name="Coprinus comatus",           season=[9,11], peak=[10],      edibility="Good edible",          emoji="🧶", color="#E5E7EB"),
    dict(id="giant-puffball",             taxon_id=57692,   common_name="Giant Puffball",               scientific_name="Calvatia gigantea",          season=[8,10], peak=[9],       edibility="Good edible",          emoji="⚪", color="#F9FAFB"),
    dict(id="oregon-black-truffle",       taxon_id=125191,  common_name="Oregon Black Truffle",         scientific_name="Leucangium carthusianum",    season=[11,3], peak=[12,1,2],  edibility="Choice edible",        emoji="⬛", color="#292524"),
    dict(id="oregon-white-truffle",       taxon_id=517784,  common_name="Oregon White Truffle",         scientific_name="Tuber oregonense",           season=[10,2], peak=[11,12],   edibility="Choice edible",        emoji="⚪", color="#FDF4E7"),
]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def parse_int_csv(text: str) -> list[int]:
    vals = []
    for t in re.split(r"[,\s]+", text.strip()):
        if not t:
            continue
        if t.lstrip("-").isdigit():
            vals.append(int(t))
    return sorted(set(vals))


def load_tracked() -> dict[str, int]:
    d: dict[str, int] = {}
    if MUSHROOM_FILE.exists():
        for line in MUSHROOM_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            try:
                name, tid = line.split(",", 1)
                d[name.strip()] = int(tid.strip())
            except ValueError:
                continue
    return dict(sorted(d.items()))


def save_tracked(d: dict[str, int]) -> None:
    MUSHROOM_FILE.write_text(
        "\n".join(f"{n},{tid}" for n, tid in sorted(d.items())) + "\n",
        encoding="utf-8",
    )


def load_cached(taxon_id: int) -> list[dict]:
    cf = DATA_DIR / f"taxon_{taxon_id}.json"
    if cf.exists():
        try:
            raw = cf.read_text(encoding="utf-8").strip()
            if not raw:
                return []
            return json.loads(raw)
        except (json.JSONDecodeError, OSError, ValueError):
            return []
    return []


def save_cached(taxon_id: int, data: list[dict]) -> None:
    (DATA_DIR / f"taxon_{taxon_id}.json").write_text(json.dumps(data), encoding="utf-8")


def validate_obs(obs: dict) -> bool:
    if not all(k in obs for k in ("id", "observed_on", "geojson")):
        return False
    if not obs.get("observed_on") or not obs.get("geojson"):
        return False
    coords = obs["geojson"].get("coordinates", [])
    if len(coords) != 2:
        return False
    lon, lat = coords
    return -180 <= lon <= 180 and -90 <= lat <= 90


def in_pnw(lat, lon) -> bool:
    try:
        lat, lon = float(lat), float(lon)
    except (TypeError, ValueError):
        return False
    return (PNW_BOUNDS["min_lat"] <= lat <= PNW_BOUNDS["max_lat"]
            and PNW_BOUNDS["min_lon"] <= lon <= PNW_BOUNDS["max_lon"])


# ---------------------------------------------------------------------------
# API fetching
# ---------------------------------------------------------------------------
def _api_req(sess, url, params, headers):
    for attempt in range(3):
        try:
            r = sess.get(url, params=params, headers=headers, timeout=45)
            r.raise_for_status()
            return r.json()
        except (requests.RequestException, json.JSONDecodeError):
            if attempt < 2:
                time.sleep(2.0 * (attempt + 1))
    raise RuntimeError("iNaturalist API failed after 3 retries.")


def fetch_api(
    taxon_ids: list[int],
    place_ids: list[int] | None = None,
    quality_grades=None,
    max_records=DEFAULT_MAX_RECORDS,
    max_pages=DEFAULT_MAX_PAGES,
    delay=DEFAULT_DELAY,
    years=None,
    months=None,
) -> pd.DataFrame:
    if quality_grades is None:
        quality_grades = QUALITY_GRADES
    places = place_ids or DEFAULT_PLACE_IDS
    sess = requests.Session()
    headers = {"User-Agent": "PNW-Mushroom-Observer/1.0"}
    rows = []
    quality = ",".join(sorted(set(quality_grades)))
    date_params: dict = {}
    if years:
        mn, mx = min(years), max(years)
        if months:
            mmn, mmx = min(months), max(months)
            ld = calendar.monthrange(mx, mmx)[1]
            date_params = {"d1": f"{mn}-{mmn:02d}-01", "d2": f"{mx}-{mmx:02d}-{ld:02d}"}
        else:
            date_params = {"d1": f"{mn}-01-01", "d2": f"{mx}-12-31"}

    pages = 0
    id_below = None
    while pages < max_pages and len(rows) < max_records:
        params: dict = {
            "place_id": ",".join(str(p) for p in places),
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
        payload = _api_req(sess, f"{API_BASE}/observations", params, headers)
        results = payload.get("results") or []
        if not results:
            break
        for obs in results:
            if not validate_obs(obs):
                continue
            taxon = obs.get("taxon") or {}
            c = (obs.get("geojson") or {}).get("coordinates") or [None, None]
            photos = obs.get("photos") or []
            pu = photos[0].get("url","").replace("square","medium") if photos else ""
            rows.append(dict(
                observation_id=obs.get("id"),
                taxon_id=taxon.get("id"),
                taxon_name=taxon.get("name",""),
                common_name=(taxon.get("preferred_common_name") or "").strip(),
                quality_grade=obs.get("quality_grade"),
                observed_on=obs.get("observed_on"),
                latitude=c[1],
                longitude=c[0],
                place_guess=obs.get("place_guess") or "",
                user_login=(obs.get("user") or {}).get("login") or "",
                photo_url=pu,
                url=f"https://www.inaturalist.org/observations/{obs.get('id')}",
            ))
        pages += 1
        min_id = min((o.get("id") for o in results if o.get("id")), default=None)
        if min_id is None or len(results) < PER_PAGE:
            break
        id_below = min_id
        time.sleep(max(0.0, delay))
    df = pd.DataFrame(rows)
    if not df.empty and "observed_on" in df.columns:
        df["observed_on"] = pd.to_datetime(df["observed_on"], errors="coerce")
    return df


@st.cache_data(ttl=1800, show_spinner=False)
def cached_fetch(
    taxon_ids: tuple, place_ids: tuple, quality_grades: tuple,
    max_recs: int, max_pgs: int, delay: float,
    years: tuple, months: tuple,
) -> list[dict]:
    df = fetch_api(list(taxon_ids), list(place_ids), quality_grades,
                    max_recs, max_pgs, delay,
                    list(years) if years else None,
                    list(months) if months else None)
    return df.to_dict(orient="records")


# ---------------------------------------------------------------------------
# Dashboard SQLite cache
# ---------------------------------------------------------------------------
@st.cache_data(ttl=600, show_spinner=False)
def load_cache_db(
    taxon_ids: tuple, quality_grades: tuple, max_recs: int,
    enforce_bounds: bool, years=(), months=(),
) -> list[dict]:
    if not DASHBOARD_CACHE_DB.exists():
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
        clauses.append(f"strftime('%Y',observed_on) IN ({','.join('?'*len(years))})")
        params.extend(str(y) for y in years)
    if months:
        clauses.append(f"CAST(strftime('%m',observed_on) AS INTEGER) IN ({','.join('?'*len(months))})")
        params.extend(months)
    if enforce_bounds:
        clauses.append("((latitude IS NULL OR longitude IS NULL) OR "
                       "(latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?))")
        params.extend([PNW_BOUNDS["min_lat"], PNW_BOUNDS["max_lat"],
                       PNW_BOUNDS["min_lon"], PNW_BOUNDS["max_lon"]])
    q = f"""SELECT id as observation_id, taxon_id, species_guess as taxon_name,
            species_guess as common_name, quality_grade, observed_on,
            latitude, longitude, place_guess, user_login
            FROM observations WHERE {' AND '.join(clauses)}
            ORDER BY observed_on DESC LIMIT ?"""
    params.append(max_recs)
    with sqlite3.connect(DASHBOARD_CACHE_DB) as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(q, params).fetchall()
    recs = [dict(r) for r in rows]
    for r in recs:
        r["url"] = f"https://www.inaturalist.org/observations/{r.get('observation_id')}"
    return recs


# ---------------------------------------------------------------------------
# Season & prediction helpers
# ---------------------------------------------------------------------------
def is_in_season(sp: dict) -> bool:
    m = datetime.now().month
    s, e = sp["season"][0], sp["season"][1]
    return (m >= s or m <= e) if s > e else (s <= m <= e)


def season_badge(sp: dict) -> str:
    m = datetime.now().month
    if not is_in_season(sp):
        return ":gray[❄️ Out]"
    if m in sp["peak"]:
        return ":orange[🔥 Peak]"
    return ":green[✅ In]"


def get_predictions(df: pd.DataFrame, species_name: str = "") -> dict:
    """Prediction engine: last/current/next month stats per species."""
    if df.empty or "observed_on" not in df.columns:
        return {}
    d = df.dropna(subset=["observed_on"]).copy()
    d["month"] = d["observed_on"].dt.month
    d["year"] = d["observed_on"].dt.year
    monthly_counts = d.groupby("month").size()
    yearly = d.groupby(["year", "month"]).size()
    avg = yearly.groupby("month").mean()
    now = datetime.now().month
    prev = (now - 1) if now > 1 else 12
    nxt = (now + 1) if now < 12 else 1
    return {
        "species": species_name,
        "last_month": {"month": prev, "label": MONTH_FULL[prev - 1],
                       "avg": round(avg.get(prev, 0), 1),
                       "total": int(monthly_counts.get(prev, 0))},
        "current_month": {"month": now, "label": MONTH_FULL[now - 1],
                          "avg": round(avg.get(now, 0), 1),
                          "total": int(monthly_counts.get(now, 0))},
        "next_month": {"month": nxt, "label": MONTH_FULL[nxt - 1],
                       "avg": round(avg.get(nxt, 0), 1),
                       "total": int(monthly_counts.get(nxt, 0))},
        "peak_month": int(monthly_counts.idxmax()) if not monthly_counts.empty else 0,
        "peak_month_label": MONTH_FULL[int(monthly_counts.idxmax()) - 1] if not monthly_counts.empty else "n/a",
        "total_obs": len(d),
    }


def compute_monthly_heatmap(df: pd.DataFrame):
    if df.empty or "observed_on" not in df.columns:
        return None
    d = df.dropna(subset=["observed_on"]).copy()
    d["year"] = d["observed_on"].dt.year.astype(int)
    d["month"] = d["observed_on"].dt.month
    h = d.groupby(["year","month"]).size().unstack(fill_value=0)
    h = h.reindex(columns=range(1,13), fill_value=0).astype(int)
    h.columns = MONTH_SHORT
    return h


# ---------------------------------------------------------------------------
# Page config
# ---------------------------------------------------------------------------
st.set_page_config(
    page_title="PNW Mushroom Observer",
    page_icon="🍄",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Minimal CSS – clean cards, no overrides of theme colors
st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
html,body,[class*="st-"],.stApp{font-family:'Inter',sans-serif;}
div[data-testid="stMetric"]{border-radius:12px;padding:0.8rem 1rem!important;
  box-shadow:0 1px 4px rgba(0,0,0,0.04);}
div[data-testid="stMetric"] label{font-weight:600!important;font-size:0.78rem!important;
  text-transform:uppercase;letter-spacing:0.03em;}
div[data-testid="stMetric"] div[data-testid="stMetricValue"]{font-size:1.6rem!important;font-weight:700!important;}
.stButton>button{border-radius:8px;font-weight:600;transition:all 0.15s;}
.stButton>button:hover{transform:translateY(-1px);box-shadow:0 3px 10px rgba(0,0,0,0.1);}
</style>
""", unsafe_allow_html=True)

# ── Session state ──
if "tracked" not in st.session_state:
    st.session_state.tracked = load_tracked()
if "show_add" not in st.session_state:
    st.session_state.show_add = False
if "show_edit" not in st.session_state:
    st.session_state.show_edit = False
if "edit_name" not in st.session_state:
    st.session_state.edit_name = None


# ── Title ──
st.title("🍄 PNW Mushroom Observer")
st.caption(
    "Wild edible mushroom observations across the Pacific Northwest. "
    "Data from [iNaturalist](https://inaturalist.org)."
)

# =====================================================================
# SIDEBAR
# =====================================================================
with st.sidebar:
    st.header("⚙️ Configuration")

    # ── Species management ──
    with st.expander("🍄 Tracked Species", expanded=True):
        tracked = st.session_state.tracked
        if not tracked:
            st.info("No species tracked. Add some below or load all PNW species.")
        else:
            for name, tid in list(tracked.items()):
                c1, c2 = st.columns([6, 1])
                c1.write(f"**{name}**  `ID:{tid}`")
                if c2.button("✏️", key=f"ed_{name}"):
                    st.session_state.edit_name = name
                    st.session_state.show_edit = True
                    st.rerun()

        c_add, c_load = st.columns(2)
        if c_add.button("➕ Add", use_container_width=True):
            st.session_state.show_add = True
            st.rerun()
        if c_load.button("📋 All 20 PNW", use_container_width=True):
            for sp in PNW_SPECIES:
                st.session_state.tracked[sp["common_name"]] = sp["taxon_id"]
            save_tracked(st.session_state.tracked)
            st.success("Loaded 20 PNW species!")
            st.rerun()

        # Add form
        if st.session_state.show_add:
            st.divider()
            with st.form("add_species"):
                nm = st.text_input("Common name")
                tid = st.text_input("Taxon ID")
                if st.form_submit_button("Save") and nm.strip() and tid.strip().isdigit():
                    st.session_state.tracked[nm.strip()] = int(tid.strip())
                    save_tracked(st.session_state.tracked)
                    st.session_state.show_add = False
                    st.success(f"Added **{nm.strip()}**")
                    st.rerun()
            if st.button("Cancel", key="cancel_add"):
                st.session_state.show_add = False
                st.rerun()

        # Edit form
        if st.session_state.show_edit and st.session_state.edit_name:
            name = st.session_state.edit_name
            old_tid = st.session_state.tracked[name]
            st.divider()
            with st.form("edit_species"):
                nm = st.text_input("Name", value=name)
                tid = st.text_input("Taxon ID", value=str(old_tid))
                if st.form_submit_button("Update") and nm.strip() and tid.strip().isdigit():
                    del st.session_state.tracked[name]
                    st.session_state.tracked[nm.strip()] = int(tid.strip())
                    save_tracked(st.session_state.tracked)
                    st.session_state.show_edit = False
                    st.session_state.edit_name = None
                    st.success(f"Updated **{nm.strip()}**")
                    st.rerun()
            if st.button("Cancel", key="cancel_edit"):
                st.session_state.show_edit = False
                st.session_state.edit_name = None
                st.rerun()

            # Remove button
            if st.button("🗑️ Remove", key=f"rm_{name}"):
                del st.session_state.tracked[name]
                save_tracked(st.session_state.tracked)
                st.session_state.show_edit = False
                st.session_state.edit_name = None
                st.success(f"Removed **{name}**")
                st.rerun()

    # ── Data source ──
    cache_sum = sum(len(load_cached(tid)) for tid in tracked.values())
    db_count = 0
    if DASHBOARD_CACHE_DB.exists():
        try:
            with sqlite3.connect(DASHBOARD_CACHE_DB) as c:
                db_count = c.execute("SELECT COUNT(*) FROM observations").fetchone()[0]
        except sqlite3.Error:
            pass
    source = st.selectbox("📡 Data source", [
        f"Local JSON cache ({cache_sum:,} obs) ⚡",
        f"Dashboard SQLite ({db_count:,} obs) 💾",
        "iNaturalist API (live) 🌐",
    ], index=0 if cache_sum > 0 else (1 if db_count > 0 else 2))

    # ── Filters ──
    with st.expander("🎯 Filters", expanded=True):
        quality = st.multiselect("Quality grades", QUALITY_GRADES, default=["research","needs_id"])
        enforce = st.checkbox("Enforce PNW bounds", value=True)
        cy = datetime.now().year
        sely = st.multiselect("Year", list(range(2010, cy + 1)), default=[])
        selm = st.multiselect("Month", list(range(1, 13)),
                              format_func=lambda m: MONTH_SHORT[m - 1], default=[])
        use_dr = st.checkbox("Custom date range")
        dmin: str | None = None
        dmax: str | None = None
        if use_dr:
            dr = st.date_input("Range", value=(datetime(2020, 1, 1).date(),
                                               datetime(cy, 12, 31).date()))
            if isinstance(dr, tuple) and len(dr) >= 2 and dr[0] and dr[1]:
                dmin, dmax = dr[0].isoformat(), dr[1].isoformat()
            elif dr and not isinstance(dr, tuple):
                dmin = dmax = dr.isoformat()
        cyears = tuple(sely) if sely else ()
        cmonths = tuple(selm) if selm else ()
        cqual = tuple(quality) if quality else tuple(QUALITY_GRADES)

    # ── Maintenance ──
    with st.expander("🗑️ Maintenance"):
        if st.button("Purge local JSON cache"):
            n = 0
            for f in DATA_DIR.glob("taxon_*.json"):
                f.unlink(); n += 1
            st.success(f"Purged {n} files.")
        if st.button("Clear Streamlit cache"):
            st.cache_data.clear()
            st.success("Cleared.")

    st.divider()
    st.caption("❤️ For PNW foragers. Data: [iNaturalist](https://inaturalist.org). Respect rate limits.")


# =====================================================================
# LOAD DATA
# =====================================================================
if not tracked:
    st.warning("No species tracked. Use the sidebar to add species or load all PNW.")
    st.stop()

taxon_ids = list(tracked.values())
records: list[dict] = []
meta = {"source": "unknown"}

with st.spinner("📡 Loading observations..."):
    if "API" in source:
        try:
            records = cached_fetch(
                tuple(taxon_ids), tuple(DEFAULT_PLACE_IDS), cqual,
                DEFAULT_MAX_RECORDS, DEFAULT_MAX_PAGES, DEFAULT_DELAY,
                cyears, cmonths,
            )
            meta["source"] = "inat_api"
            for tid in taxon_ids:
                sub = [r for r in records if r.get("taxon_id") == tid]
                if sub:
                    save_cached(tid, sub)
        except RuntimeError as e:
            st.error(str(e))
            st.stop()
    elif "SQLite" in source:
        records = load_cache_db(tuple(taxon_ids), cqual,
                                DEFAULT_MAX_RECORDS, enforce, cyears, cmonths)
        meta["source"] = "dashboard_cache"
    else:
        all_r = []
        for nm, tid in tracked.items():
            c = load_cached(tid)
            if c:
                all_r.extend(c)
            else:
                try:
                    dfx = fetch_api([tid], DEFAULT_PLACE_IDS, cqual,
                                    DEFAULT_MAX_RECORDS, 5)
                    if not dfx.empty:
                        fd = dfx.to_dict(orient="records")
                        save_cached(tid, fd)
                        all_r.extend(fd)
                except RuntimeError:
                    st.warning(f"Could not fetch **{nm}**.")
        records = all_r
        meta["source"] = "local_json"

df = pd.DataFrame.from_records(records)
if not df.empty and "observed_on" in df.columns:
    df["observed_on"] = pd.to_datetime(df["observed_on"], errors="coerce")
    if cmonths and not dmin:
        df = df[df["observed_on"].dt.month.isin(cmonths)]
    if dmin:
        df = df[(df["observed_on"] >= dmin) & (df["observed_on"] <= dmax)]

if df.empty:
    st.warning("No observations. Adjust filters or switch to API data source.")
    st.stop()

slabs = {"inat_api": "🔴 iNaturalist API", "dashboard_cache": "💾 Dashboard cache",
         "local_json": "⚡ Local cache"}
st.caption(f"Source: {slabs.get(meta['source'], meta['source'])}  •  "
           f"{len(df):,} obs  •  {df['taxon_id'].nunique():,} species")

dated_df = df.dropna(subset=["observed_on"])

# =====================================================================
# TABS
# =====================================================================
t0, t1, t2, t3, t4, t5, t6, t7 = st.tabs([
    "🏠 Dashboard", "🔮 Predictions", "🔍 Species Explorer",
    "📈 Time Series", "👥 Contributors", "🗺️ Geographic",
    "📊 Pivot & Slice", "📋 Raw Data",
])

# ───────────────────────────────────────────────────────────────────
# TAB 0: DASHBOARD
# ───────────────────────────────────────────────────────────────────
with t0:
    if dated_df.empty:
        st.info("No dated observations.")
        st.stop()

    dminv = dated_df["observed_on"].min()
    dmaxv = dated_df["observed_on"].max()
    span = (dmaxv - dminv).days if pd.notna(dminv) and pd.notna(dmaxv) else 0
    opd = len(dated_df) / max(1, span) if span else 0
    yoy = None
    by_year = dated_df.groupby(dated_df["observed_on"].dt.year).size()
    if len(by_year) >= 2:
        yoy = (by_year.iloc[-1] - by_year.iloc[-2]) / max(1, by_year.iloc[-2]) * 100
    rg = (df["quality_grade"] == "research").sum() / max(1, len(df)) * 100
    geom = df.dropna(subset=["latitude", "longitude"]).shape[0]
    users = df["user_login"].nunique()
    places = df["place_guess"].nunique()

    k1, k2, k3, k4, k5, k6, k7 = st.columns(7)
    k1.metric("Total Obs", f"{len(df):,}")
    k2.metric("Species", f"{df['taxon_id'].nunique():,}")
    k3.metric("Obs/Day", f"{opd:.1f}")
    k4.metric("YoY Growth", f"{yoy:+.1f}%" if yoy is not None else "n/a")
    k5.metric("Research%", f"{rg:.1f}%")
    k6.metric("Observers", f"{users:,}")
    k7.metric("Mapped", f"{geom:,}")

    st.divider()

    # What's fruiting now
    st.subheader("🌿 What's Fruiting Right Now?")
    in_season = [s for s in PNW_SPECIES if s["taxon_id"] in taxon_ids and is_in_season(s)]
    if in_season:
        cols = st.columns(min(4, len(in_season)))
        for i, sp in enumerate(in_season):
            c = cols[i % len(cols)]
            peak = datetime.now().month in sp["peak"]
            bc = sp.get("color", "#ccc")
            c.markdown(f"""
            <div style="background:white;border:2px solid {'#e07b10' if peak else '#4caf50'};
              border-radius:14px;padding:0.8rem;margin:0.2rem 0;">
              <span style="font-size:1.6rem">{sp['emoji']}</span><br>
              <strong style="color:#1e3a5f">{sp['common_name']}</strong><br>
              <span style="font-size:0.8rem;color:#6b7c93;font-style:italic">{sp['scientific_name']}</span><br>
              <span style="font-size:0.75rem;font-weight:600;color:{'#e07b10' if peak else '#15803d'}">{'🔥 Peak' if peak else '✅ In Season'}</span>
            </div>
            """, unsafe_allow_html=True)
    else:
        st.info("No tracked species are currently in season.")

    st.divider()

    # Aggregate seasonal pattern
    st.subheader("📊 Aggregate Seasonal Pattern")
    m_agg = dated_df.groupby(dated_df["observed_on"].dt.month).size()
    ym = dated_df.assign(year=dated_df["observed_on"].dt.year).groupby(
        ["year", dated_df["observed_on"].dt.month]).size()
    m_avg = ym.groupby(level=1).mean()
    fig_s = go.Figure()
    fig_s.add_trace(go.Bar(x=list(range(1, 13)),
                           y=[m_agg.get(m, 0) for m in range(1, 13)],
                           name="Total", marker_color="#1565C0"))
    fig_s.add_trace(go.Scatter(x=list(range(1, 13)),
                               y=[m_avg.get(m, 0) for m in range(1, 13)],
                               name="Yearly Avg", mode="lines+markers",
                               line=dict(color="#FF6F00", width=3),
                               marker=dict(size=8)))
    nm = datetime.now().month
    fig_s.add_vline(x=nm, line_dash="dash", line_color="red",
                    annotation_text=f"Now ({MONTH_SHORT[nm-1]})")
    fig_s.update_layout(height=380, margin=dict(l=10, r=10, t=10, b=10),
                        xaxis=dict(tickmode="array", tickvals=list(range(1, 13)),
                                   ticktext=MONTH_SHORT),
                        legend=dict(orientation="h", y=1.1))
    st.plotly_chart(fig_s, use_container_width=True)

    # Quality + YoY
    cq1, cq2 = st.columns(2)
    with cq1:
        st.subheader("Quality Distribution")
        qc = df["quality_grade"].value_counts()
        fig_q = px.pie(values=qc.values, names=qc.index, hole=0.5,
                       color_discrete_sequence=["#15803d","#FF6F00","#9e9e9e"])
        fig_q.update_layout(height=300, margin=dict(l=10, r=10, t=10, b=10))
        st.plotly_chart(fig_q, use_container_width=True)
    with cq2:
        st.subheader("Year-over-Year")
        yoy_df = by_year.reset_index()
        yoy_df.columns = ["year","obs"]
        fig_yoy = px.bar(yoy_df, x="year", y="obs",
                         color_discrete_sequence=["#1565C0"])
        fig_yoy.update_layout(height=300, margin=dict(l=10, r=10, t=10, b=10))
        st.plotly_chart(fig_yoy, use_container_width=True)


# ───────────────────────────────────────────────────────────────────
# TAB 1: PREDICTIONS
# ───────────────────────────────────────────────────────────────────
with t1:
    st.subheader("🔮 Seasonal Predictions")
    st.caption("Historical patterns used to predict what to expect this month, last month, and next month — per species.")

    if dated_df.empty:
        st.info("No dated data.")
    else:
        # Compute predictions per species
        id_to_name = {v: k for k, v in tracked.items()}
        all_preds = []
        for tid in taxon_ids:
            sdf = dated_df[dated_df["taxon_id"] == tid]
            name = id_to_name.get(tid, f"Taxon {tid}")
            sp_info = next((s for s in PNW_SPECIES if s["taxon_id"] == tid), None)
            emoji = sp_info["emoji"] if sp_info else "🍄"
            pred = get_predictions(sdf, name)
            if pred:
                pred["emoji"] = emoji
                pred["in_season"] = is_in_season(sp_info) if sp_info else False
                all_preds.append(pred)

        all_preds.sort(key=lambda p: (-p["in_season"], -p["total_obs"]))

        # Summary cards
        st.markdown("### 📋 Per-Species Prediction Cards")
        now_m = datetime.now().month
        cols = st.columns(min(3, len(all_preds)))
        for i, p in enumerate(all_preds):
            c = cols[i % len(cols)]
            now_label = MONTH_FULL[now_m - 1]
            cu = p["current_month"]
            nu = p["next_month"]
            lu = p["last_month"]
            bg = "#e8f5e9" if p["in_season"] else "#f5f5f5"
            border = "#4caf50" if p["in_season"] else "#ccc"
            c.markdown(f"""
            <div style="background:{bg};border:2px solid {border};border-radius:14px;
              padding:0.7rem;margin:0.2rem 0;">
              <span style="font-size:1.4rem">{p['emoji']}</span>
              <strong>{p['species']}</strong>
              <div style="font-size:0.8rem;margin-top:0.3rem">
                <table style="width:100%;font-size:0.75rem">
                  <tr><td><b>{lu['label']}</b></td><td>Avg: {lu['avg']:.1f}</td><td>Total: {lu['total']:,}</td></tr>
                  <tr style="font-weight:700;color:#1565C0"><td><b>{cu['label']} (now)</b></td><td>Avg: {cu['avg']:.1f}</td><td>Total: {cu['total']:,}</td></tr>
                  <tr><td><b>{nu['label']}</b></td><td>Avg: {nu['avg']:.1f}</td><td>Total: {nu['total']:,}</td></tr>
                </table>
              </div>
              <div style="font-size:0.7rem;color:#6b7c93;margin-top:0.2rem">
                Peak month: {p['peak_month_label']} • {p['total_obs']:,} total obs
              </div>
            </div>
            """, unsafe_allow_html=True)

        st.divider()

        # Aggregate: current vs next vs last month heat
        st.subheader("📊 Aggregate Predictions Summary")
        total_preds = get_predictions(dated_df, "All Species")
        if total_preds:
            cp = total_preds["current_month"]
            np = total_preds["next_month"]
            lp = total_preds["last_month"]
            kc, kn, kl = st.columns(3)
            kl.metric(f"📉 Last Month ({lp['label']})", f"{lp['avg']:.1f} avg",
                      delta=f"{lp['total']:,} total")
            kc.metric(f"📊 Current ({cp['label']})", f"{cp['avg']:.1f} avg",
                      delta=f"{cp['total']:,} total")
            kn.metric(f"📈 Next Month ({np['label']})", f"{np['avg']:.1f} avg",
                      delta=f"{np['total']:,} total")

        # Monthly breakdown chart
        st.subheader("📈 Monthly Historical Breakdown by Quality Grade")
        if not dated_df.empty:
            mq = dated_df.groupby([dated_df["observed_on"].dt.month, "quality_grade"]).size().unstack(fill_value=0)
            mq = mq.reindex(range(1, 13), fill_value=0)
            mq.index = MONTH_SHORT
            st.dataframe(mq, use_container_width=True)
            st.caption("Grand total: " + f"{mq.sum().sum():,} observations")


# ───────────────────────────────────────────────────────────────────
# TAB 2: SPECIES EXPLORER
# ───────────────────────────────────────────────────────────────────
with t2:
    id_to_name = {v: k for k, v in tracked.items()}
    opts = []
    for tid in df["taxon_id"].unique():
        nm = id_to_name.get(tid, f"Taxon {tid}")
        cnt = (df["taxon_id"] == tid).sum()
        opts.append((nm, tid, cnt))
    opts.sort(key=lambda x: -x[2])
    if not opts:
        st.info("No species data.")
        st.stop()
    sel = st.selectbox("Species", range(len(opts)),
                       format_func=lambda i: f"{opts[i][0]} ({opts[i][2]} obs)")
    nm, tid, _ = opts[sel]
    sdf = df[df["taxon_id"] == tid].copy()
    sp_info = next((s for s in PNW_SPECIES if s["taxon_id"] == tid), None)

    if sp_info:
        st.subheader(f"{sp_info['emoji']} {sp_info['common_name']}")
        st.caption(f"*{sp_info['scientific_name']}* — Taxon ID `{tid}` — {sp_info['edibility']}")

    # Species KPIs
    sd = sdf.dropna(subset=["observed_on"])
    sp_m1, sp_m2, sp_m3, sp_m4 = st.columns(4)
    sp_m1.metric("Observations", f"{len(sdf):,}")
    sp_m2.metric("Research Grade",
                 f"{(sdf['quality_grade']=='research').sum()/max(1,len(sdf))*100:.1f}%")
    sp_m3.metric("Mapped", f"{sdf.dropna(subset=['latitude','longitude']).shape[0]:,}")
    sp_m4.metric("Peak Month", get_predictions(sdf).get("peak_month_label", "n/a"))

    # Prediction cards
    pred = get_predictions(sdf, nm)
    if pred:
        st.caption(f"**Predictions:** Last month avg: {pred['last_month']['avg']:.1f} | "
                   f"Current avg: {pred['current_month']['avg']:.1f} | "
                   f"Next month avg: {pred['next_month']['avg']:.1f}")

    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Monthly Heatmap")
        heat = compute_monthly_heatmap(sdf)
        if heat is not None and not heat.empty:
            fig = px.imshow(heat, aspect="auto", color_continuous_scale="Blues")
            fig.update_layout(height=360, margin=dict(l=10, r=10, t=10, b=10))
            st.plotly_chart(fig, use_container_width=True)
        else:
            st.info("Not enough data.")
    with c2:
        st.subheader("Monthly Distribution")
        if not sd.empty:
            mo = sd.groupby(sd["observed_on"].dt.month).size()
            ym2 = sd.assign(y=sd["observed_on"].dt.year).groupby(["y",sd["observed_on"].dt.month]).size()
            av = ym2.groupby(level=1).mean()
            fig2 = go.Figure()
            fig2.add_trace(go.Bar(x=list(range(1,13)),
                                  y=[mo.get(m,0) for m in range(1,13)],
                                  name="Total", marker_color="#1565C0"))
            fig2.add_trace(go.Scatter(x=list(range(1,13)),
                                      y=[av.get(m,0) for m in range(1,13)],
                                      name="Avg", mode="lines+markers",
                                      line=dict(color="#FF6F00",width=2.5)))
            fig2.add_vline(x=datetime.now().month, line_dash="dash", line_color="red")
            fig2.update_layout(height=360, margin=dict(l=10,r=10,t=10,b=10),
                               xaxis=dict(tickmode="array", tickvals=list(range(1,13)),
                                          ticktext=MONTH_SHORT),
                               legend=dict(orientation="h", y=1.1))
            st.plotly_chart(fig2, use_container_width=True)
        else:
            st.info("No data.")

    # Map
    st.subheader("🗺️ Observation Map")
    mp = sdf.dropna(subset=["latitude","longitude"])[["latitude","longitude"]]
    if not mp.empty:
        st.map(mp, size=6, use_container_width=True)
    else:
        st.info("No geo-tagged observations.")


# ───────────────────────────────────────────────────────────────────
# TAB 3: TIME SERIES
# ───────────────────────────────────────────────────────────────────
with t3:
    if dated_df.empty:
        st.info("No dated observations.")
    else:
        daily = (dated_df.assign(day=dated_df["observed_on"].dt.date)
                 .groupby("day", as_index=False)["observation_id"].count()
                 .rename(columns={"observation_id":"obs"}).sort_values("day"))
        if not daily.empty:
            daily["r7"] = daily["obs"].rolling(7, min_periods=1).sum()
            st.subheader("Daily + 7-Day Rolling")
            fig_d = px.line(daily, x="day", y=["r7"],
                            labels={"value":"Obs","variable":"Series"},
                            color_discrete_sequence=["#FF6F00"])
            fig_d.update_layout(height=340, margin=dict(l=10,r=10,t=10,b=10))
            st.plotly_chart(fig_d, use_container_width=True)

        monthly = (dated_df.assign(mo=dated_df["observed_on"].dt.to_period("M").astype(str))
                   .groupby("mo", as_index=False)["observation_id"].count()
                   .rename(columns={"observation_id":"obs"}))
        if not monthly.empty:
            st.subheader("Monthly Trend")
            fig_m = px.bar(monthly, x="mo", y="obs",
                           color_discrete_sequence=["#1565C0"])
            fig_m.update_layout(height=340, margin=dict(l=10,r=10,t=10,b=10))
            st.plotly_chart(fig_m, use_container_width=True)

        # Weekly momentum
        st.subheader("Weekly Momentum (Current vs Previous)")
        now_u = datetime.now(tz=timezone.utc)
        cs = pd.Timestamp(now_u.date() - timedelta(days=6))
        ps = pd.Timestamp(now_u.date() - timedelta(days=13))
        pe = pd.Timestamp(now_u.date() - timedelta(days=7))
        cw = (dated_df[dated_df["observed_on"] >= cs]
              .groupby(["taxon_id","taxon_name"], as_index=False)["observation_id"]
              .count().rename(columns={"observation_id":"cur"}))
        pw = (dated_df[(dated_df["observed_on"] >= ps) & (dated_df["observed_on"] <= pe)]
              .groupby(["taxon_id","taxon_name"], as_index=False)["observation_id"]
              .count().rename(columns={"observation_id":"prev"}))
        mom = cw.merge(pw, on=["taxon_id","taxon_name"], how="outer").fillna(0)
        mom["delta"] = mom["cur"] - mom["prev"]
        mom = mom.sort_values("cur", ascending=False).head(15)
        if not mom.empty:
            fig_mom = px.bar(mom, x="taxon_name", y=["cur","prev"], barmode="group",
                             color_discrete_sequence=["#1565C0","#9e9e9e"],
                             labels={"value":"Obs","taxon_name":"Species","variable":"Week"})
            fig_mom.update_layout(height=360, margin=dict(l=10,r=10,t=10,b=10))
            st.plotly_chart(fig_mom, use_container_width=True)


# ───────────────────────────────────────────────────────────────────
# TAB 4: CONTRIBUTORS
# ───────────────────────────────────────────────────────────────────
with t4:
    if "user_login" in df.columns:
        ul = df["user_login"].fillna("").astype(str).str.strip()
        mask = ul != ""
        users_df = df.loc[mask].groupby(ul.loc[mask].values)["observation_id"].count().reset_index()
        users_df.columns = ["user","obs"]
        users_df = users_df.sort_values("obs", ascending=False)
        st.subheader("Top Observers")
        st.dataframe(users_df.head(30), use_container_width=True, hide_index=True)
        st.metric("Unique Observers", f"{len(users_df):,}")
    else:
        st.info("No contributor data.")


# ───────────────────────────────────────────────────────────────────
# TAB 5: GEOGRAPHIC
# ───────────────────────────────────────────────────────────────────
with t5:
    mp_df = df.dropna(subset=["latitude","longitude"])[["latitude","longitude"]]
    if not mp_df.empty:
        st.subheader("Observation Map")
        st.map(mp_df, size=4, use_container_width=True)
    else:
        st.info("No coordinates.")

    if "place_guess" in df.columns:
        pl = df["place_guess"].fillna("(unknown)")
        pc = df.assign(place=pl).groupby("place", as_index=False)["observation_id"].count()
        pc = pc.rename(columns={"observation_id":"obs"}).sort_values("obs", ascending=False)
        st.subheader("By Place")
        st.dataframe(pc.head(30), use_container_width=True, hide_index=True)


# ───────────────────────────────────────────────────────────────────
# TAB 6: PIVOT & SLICE
# ───────────────────────────────────────────────────────────────────
with t6:
    st.subheader("📊 Pivot & Slice")
    st.caption("Filter and pivot the loaded data.")

    pivot_df = df.copy()
    if not pivot_df.empty and "observed_on" in pivot_df.columns:
        pivot_df = pivot_df.dropna(subset=["observed_on"])
        pivot_df["year"] = pivot_df["observed_on"].dt.year
        pivot_df["month"] = pivot_df["observed_on"].dt.month

    f1, f2, f3 = st.columns(3)
    with f1:
        y_ops = sorted(pivot_df["year"].dropna().unique().astype(int).tolist()) if not pivot_df.empty and "year" in pivot_df.columns else []
        selyp = st.multiselect("Year", y_ops, default=[], key="pv_years")
        m_ops = list(range(1, 13))
        selmp = st.multiselect("Month", m_ops, default=[],
                               format_func=lambda m: MONTH_SHORT[m - 1], key="pv_months")
    with f2:
        t_ops = sorted(pivot_df["common_name"].dropna().unique().tolist()) if "common_name" in pivot_df.columns else []
        seltp = st.multiselect("Taxon", t_ops, default=[], key="pv_taxa")
        q_ops = pivot_df["quality_grade"].dropna().unique().tolist() if "quality_grade" in pivot_df.columns else []
        selqp = st.multiselect("Quality", q_ops, default=[], key="pv_qual")
    with f3:
        p_ops = []
        if "place_guess" in pivot_df.columns:
            places_s = pivot_df["place_guess"].fillna("").astype(str).str.strip()
            p_ops = sorted(places_s[places_s != ""].unique().tolist())
        selpp = st.multiselect("Place", p_ops, default=[], key="pv_places")

    slice_df = pivot_df
    if selyp and "year" in slice_df.columns:
        slice_df = slice_df[slice_df["year"].isin(selyp)]
    if selmp and "month" in slice_df.columns:
        slice_df = slice_df[slice_df["month"].isin(selmp)]
    if seltp and "common_name" in slice_df.columns:
        slice_df = slice_df[slice_df["common_name"].isin(seltp)]
    if selqp and "quality_grade" in slice_df.columns:
        slice_df = slice_df[slice_df["quality_grade"].isin(selqp)]
    if selpp and "place_guess" in slice_df.columns:
        slice_df = slice_df[slice_df["place_guess"].astype(str).str.strip().isin(selpp)]

    st.metric("Filtered", f"{len(slice_df):,} obs")
    dims = [c for c in ["year","month","common_name","quality_grade","place_guess","user_login"]
            if c in slice_df.columns]
    if dims:
        rd = st.selectbox("Rows", dims, key="pv_row")
        cd_opts = ["None"] + dims
        cd = st.selectbox("Columns", cd_opts, key="pv_col")
        cd = None if cd == "None" else cd
        if not slice_df.empty:
            try:
                grp = [c for c in [rd, cd] if c]
                agg = (slice_df.groupby(grp, dropna=False)["observation_id"].count()
                       .unstack(fill_value=0) if cd else
                       slice_df.groupby(rd, dropna=False)["observation_id"].count())
                if isinstance(agg, pd.Series):
                    agg = agg.to_frame("count")
                st.dataframe(agg, use_container_width=True, height=420)
            except Exception as e:
                st.warning(f"Pivot error: {e}")


# ───────────────────────────────────────────────────────────────────
# TAB 7: RAW DATA
# ───────────────────────────────────────────────────────────────────
with t7:
    st.subheader("Raw Observations")
    disp_cols = ["observation_id","observed_on","taxon_id","taxon_name","common_name",
                 "quality_grade","place_guess","latitude","longitude","user_login","url"]
    disp = df[[c for c in disp_cols if c in df.columns]].sort_values("observed_on", ascending=False)
    lim = min(5000, len(disp))
    st.dataframe(disp.head(lim), use_container_width=True, hide_index=True, height=420)
    if len(disp) > lim:
        st.caption(f"Showing {lim:,} of {len(disp):,}. Download CSV for full data.")
    csv = disp.to_csv(index=False).encode("utf-8")
    st.download_button(f"📥 Download CSV ({len(disp):,} rows)", csv,
                       f"pnw_mushrooms_{datetime.now().date().isoformat()}.csv",
                       "text/csv")


# ───────────────────────────────────────────────────────────────────
# Footer
# ───────────────────────────────────────────────────────────────────
st.divider()
st.caption(
    f"🍄 PNW Mushroom Observer • {len(df):,} obs • {df['taxon_id'].nunique():,} species • "
    f"Updated {datetime.now().strftime('%Y-%m-%d %H:%M')} • "
    "Data: [iNaturalist](https://inaturalist.org)"
)
