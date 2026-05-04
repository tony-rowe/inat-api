from __future__ import annotations

import calendar
import json
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

# ============================================================================
# Constants
# ============================================================================
API_BASE = "https://api.inaturalist.org/v1"
PER_PAGE = 200
DEFAULT_DELAY = 1.1
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

LOAD_PRESET_QUICK = (5000, 25, "⚡ Quick  (~25 sec)")
LOAD_PRESET_STANDARD = (50000, 250, "📦 Standard (~4 min)")
LOAD_PRESET_FULL = (200000, 1000, "🔬 Full (~15 min)")

# ============================================================================
# 20 Built-in PNW edible species
# ============================================================================
PNW_SPECIES = [
    {"id":"pacific-golden-chanterelle","taxon_id":120443,"common_name":"Pacific Golden Chanterelle",  "scientific_name":"Cantharellus formosus",     "season":[9,12],"peak":[10,11],  "edibility":"Choice edible",       "emoji":"🍄","color":"#F59E0B"},
    {"id":"white-chanterelle",         "taxon_id":54132, "common_name":"White Chanterelle",           "scientific_name":"Cantharellus subalbidus",   "season":[9,12],"peak":[10,11],  "edibility":"Choice edible",       "emoji":"🤍","color":"#F5F5DC"},
    {"id":"yellowfoot-chanterelle",    "taxon_id":350511,"common_name":"Yellowfoot Chanterelle",      "scientific_name":"Craterellus tubaeformis",   "season":[10,2],"peak":[11,12],  "edibility":"Good edible",         "emoji":"💛","color":"#CA8A04"},
    {"id":"king-bolete",               "taxon_id":48701, "common_name":"King Bolete (Porcini)",       "scientific_name":"Boletus edulis",            "season":[8,11],"peak":[9,10],   "edibility":"Choice edible",       "emoji":"👑","color":"#8B4513"},
    {"id":"admirable-bolete",          "taxon_id":790782,"common_name":"Admirable Bolete",            "scientific_name":"Aureoboletus mirabilis",    "season":[8,11],"peak":[9,10],   "edibility":"Good edible",         "emoji":"🟤","color":"#5C4033"},
    {"id":"black-morel",               "taxon_id":1467061,"common_name":"Black Morel",                "scientific_name":"Morchella elata",           "season":[3,6], "peak":[4,5],    "edibility":"Choice (must cook)",  "emoji":"🔥","color":"#3D2B1F"},
    {"id":"chicken-of-the-woods",      "taxon_id":53713, "common_name":"Chicken of the Woods",        "scientific_name":"Laetiporus sulphureus",     "season":[5,11],"peak":[8,9,10], "edibility":"Good edible",         "emoji":"🐔","color":"#FF6B00"},
    {"id":"hen-of-the-woods",          "taxon_id":53714, "common_name":"Hen of the Woods (Maitake)",  "scientific_name":"Grifola frondosa",          "season":[8,11],"peak":[9,10],   "edibility":"Choice edible",       "emoji":"🐓","color":"#6B7280"},
    {"id":"lions-mane",                "taxon_id":49158, "common_name":"Lion's Mane",                 "scientific_name":"Hericium erinaceus",        "season":[8,11],"peak":[9,10],   "edibility":"Choice edible",       "emoji":"🦁","color":"#FAFAFA"},
    {"id":"coral-tooth",               "taxon_id":49162, "common_name":"Coral Tooth Fungus",          "scientific_name":"Hericium coralloides",      "season":[8,11],"peak":[9,10],   "edibility":"Good edible",         "emoji":"🪸","color":"#E8E8E8"},
    {"id":"western-matsutake",         "taxon_id":521711,"common_name":"Western Matsutake",           "scientific_name":"Tricholoma murrillianum",   "season":[9,12],"peak":[10,11],  "edibility":"Choice edible",       "emoji":"🌲","color":"#D2B48C"},
    {"id":"lobster-mushroom",          "taxon_id":48215, "common_name":"Lobster Mushroom",            "scientific_name":"Hypomyces lactifluorum",    "season":[8,10],"peak":[9],      "edibility":"Choice edible",       "emoji":"🦞","color":"#DC2626"},
    {"id":"hedgehog-mushroom",         "taxon_id":48641, "common_name":"Wood Hedgehog",               "scientific_name":"Hydnum repandum",           "season":[9,12],"peak":[10,11],  "edibility":"Choice edible",       "emoji":"🦔","color":"#FBBF24"},
    {"id":"oyster-mushroom",           "taxon_id":48494, "common_name":"Oyster Mushroom",             "scientific_name":"Pleurotus ostreatus",       "season":[10,4],"peak":[11,12,1],"edibility":"Good edible",         "emoji":"🦪","color":"#9CA3AF"},
    {"id":"cauliflower-mushroom",      "taxon_id":486226,"common_name":"Western Cauliflower Mushroom","scientific_name":"Sparassis radicata",        "season":[8,11],"peak":[9,10],   "edibility":"Good edible",         "emoji":"🥦","color":"#FEF3C7"},
    {"id":"black-trumpet",             "taxon_id":48607, "common_name":"Black Trumpet",               "scientific_name":"Craterellus cornucopioides","season":[10,2],"peak":[11,12],  "edibility":"Choice edible",       "emoji":"🎺","color":"#1F2937"},
    {"id":"shaggy-mane",               "taxon_id":47392, "common_name":"Shaggy Mane",                 "scientific_name":"Coprinus comatus",          "season":[9,11],"peak":[10],     "edibility":"Good edible",         "emoji":"🧶","color":"#E5E7EB"},
    {"id":"giant-puffball",            "taxon_id":57692, "common_name":"Giant Puffball",              "scientific_name":"Calvatia gigantea",         "season":[8,10],"peak":[9],      "edibility":"Good edible",         "emoji":"⚪","color":"#F9FAFB"},
    {"id":"oregon-black-truffle",      "taxon_id":125191,"common_name":"Oregon Black Truffle",        "scientific_name":"Leucangium carthusianum",   "season":[11,3],"peak":[12,1,2], "edibility":"Choice edible",       "emoji":"⬛","color":"#292524"},
    {"id":"oregon-white-truffle",      "taxon_id":517784,"common_name":"Oregon White Truffle",        "scientific_name":"Tuber oregonense",          "season":[10,2],"peak":[11,12],  "edibility":"Choice edible",       "emoji":"⚪","color":"#FDF4E7"},
]

# ============================================================================
# Helpers
# ============================================================================
def parse_int_csv(text: str) -> list[int]:
    vals = []
    for t in re.split(r"[,\s]+", text.strip()):
        if not t: continue
        if t.lstrip("-").isdigit(): vals.append(int(t))
    return sorted(set(vals))

def load_tracked() -> dict[str, int]:
    d: dict[str, int] = {}
    if MUSHROOM_FILE.exists():
        for line in MUSHROOM_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line: continue
            try:
                nm, tid = line.split(",", 1)
                d[nm.strip()] = int(tid.strip())
            except ValueError: continue
    return dict(sorted(d.items()))

def save_tracked(d: dict[str, int]) -> None:
    MUSHROOM_FILE.write_text(
        "\n".join(f"{n},{tid}" for n, tid in sorted(d.items())) + "\n", encoding="utf-8")

def load_cached(taxon_id: int) -> list[dict]:
    cf = DATA_DIR / f"taxon_{taxon_id}.json"
    if cf.exists():
        try:
            raw = cf.read_text(encoding="utf-8").strip()
            return json.loads(raw) if raw else []
        except (json.JSONDecodeError, OSError, ValueError): return []
    return []

def save_cached(taxon_id: int, data: list[dict]) -> None:
    (DATA_DIR / f"taxon_{taxon_id}.json").write_text(json.dumps(data), encoding="utf-8")

def validate_obs(o: dict) -> bool:
    if not all(k in o for k in ("id","observed_on","geojson")): return False
    if not o.get("observed_on") or not o.get("geojson"): return False
    c = o["geojson"].get("coordinates", [])
    if len(c) != 2: return False
    lon, lat = c
    return -180 <= lon <= 180 and -90 <= lat <= 90

def in_pnw(lat, lon) -> bool:
    try: lat, lon = float(lat), float(lon)
    except (TypeError, ValueError): return False
    return (PNW_BOUNDS["min_lat"] <= lat <= PNW_BOUNDS["max_lat"]
            and PNW_BOUNDS["min_lon"] <= lon <= PNW_BOUNDS["max_lon"])

def is_in_season(sp: dict) -> bool:
    m = datetime.now().month
    s, e = sp["season"][0], sp["season"][1]
    return (m >= s or m <= e) if s > e else (s <= m <= e)

def get_predictions(df: pd.DataFrame, name: str = "") -> dict:
    if df.empty or "observed_on" not in df.columns: return {}
    d = df.dropna(subset=["observed_on"]).copy()
    d["month"] = d["observed_on"].dt.month
    d["year"] = d["observed_on"].dt.year
    mc = d.groupby("month").size()
    ym = d.groupby(["year","month"]).size()
    avg = ym.groupby("month").mean()
    now = datetime.now().month
    prev = (now - 1) if now > 1 else 12
    nxt = (now + 1) if now < 12 else 1
    peak_m = int(mc.idxmax()) if not mc.empty else 0
    return {
        "species": name,
        "last_month":    {"month":prev,"label":MONTH_FULL[prev-1],"avg":round(avg.get(prev,0),1),"total":int(mc.get(prev,0))},
        "current_month": {"month":now, "label":MONTH_FULL[now-1], "avg":round(avg.get(now,0),1), "total":int(mc.get(now,0))},
        "next_month":    {"month":nxt, "label":MONTH_FULL[nxt-1], "avg":round(avg.get(nxt,0),1), "total":int(mc.get(nxt,0))},
        "peak_month": peak_m,
        "peak_month_label": MONTH_FULL[peak_m - 1] if peak_m else "n/a",
        "total_obs": len(d),
    }

def monthly_heatmap(df: pd.DataFrame):
    if df.empty or "observed_on" not in df.columns: return None
    d = df.dropna(subset=["observed_on"]).copy()
    d["year"] = d["observed_on"].dt.year.astype(int)
    d["month"] = d["observed_on"].dt.month
    h = d.groupby(["year","month"]).size().unstack(fill_value=0)
    h = h.reindex(columns=range(1,13), fill_value=0).astype(int)
    h.columns = MONTH_SHORT
    return h

# ============================================================================
# API fetching
# ============================================================================
def _api_req(sess, url, params, headers):
    for attempt in range(3):
        try:
            r = sess.get(url, params=params, headers=headers, timeout=45)
            r.raise_for_status()
            return r.json()
        except (requests.RequestException, json.JSONDecodeError):
            if attempt < 2: time.sleep(2.0 * (attempt + 1))
    raise RuntimeError("iNaturalist API failed after 3 retries.")

def fetch_observations_since(taxon_ids: list[int], since_date: str | None = None,
                              place_ids=None, quality_grades=None,
                              max_records=5000, max_pages=5) -> list[dict]:
    """Fetch only observations since a given date (for incremental updates)."""
    places = place_ids or DEFAULT_PLACE_IDS
    quality = ",".join(sorted(set(quality_grades or QUALITY_GRADES)))
    sess = requests.Session()
    headers = {"User-Agent": "PNW-Mushroom-Observer/1.0"}
    rows = []
    id_below = None
    pages = 0
    date_params = {"d1": since_date} if since_date else {}
    while pages < max_pages and len(rows) < max_records:
        params: dict = {
            "place_id": ",".join(str(p) for p in places),
            "taxon_id": ",".join(str(t) for t in taxon_ids),
            "per_page": PER_PAGE, "order": "desc", "order_by": "observed_on",
            "photos": "true", "geo": "true",
            **date_params,
        }
        if quality: params["quality_grade"] = quality
        if id_below: params["id_below"] = id_below
        payload = _api_req(sess, f"{API_BASE}/observations", params, headers)
        results = payload.get("results") or []
        if not results: break
        for obs in results:
            if not validate_obs(obs): continue
            t = obs.get("taxon") or {}
            c = (obs.get("geojson") or {}).get("coordinates") or [None, None]
            pu = ""
            if photos := obs.get("photos") or []:
                pu = photos[0].get("url","").replace("square","medium")
            rows.append(dict(
                observation_id=obs.get("id"), taxon_id=t.get("id"),
                taxon_name=t.get("name",""),
                common_name=(t.get("preferred_common_name") or "").strip(),
                quality_grade=obs.get("quality_grade"), observed_on=obs.get("observed_on"),
                latitude=c[1], longitude=c[0],
                place_guess=obs.get("place_guess") or "",
                user_login=(obs.get("user") or {}).get("login") or "",
                photo_url=pu,
                url=f"https://www.inaturalist.org/observations/{obs.get('id')}",
            ))
        pages += 1
        min_id = min((o.get("id") for o in results if o.get("id")), default=None)
        if min_id is None or len(results) < PER_PAGE: break
        id_below = min_id
        time.sleep(max(0.0, DEFAULT_DELAY))
    return rows

def fetch_api(taxon_ids: list[int], place_ids=None, quality_grades=None,
              max_records=5000, max_pages=25, delay=DEFAULT_DELAY,
              years=None, months=None) -> pd.DataFrame:
    places = place_ids or DEFAULT_PLACE_IDS
    sess = requests.Session()
    headers = {"User-Agent": "PNW-Mushroom-Observer/1.0"}
    rows = []
    quality = ",".join(sorted(set(quality_grades or QUALITY_GRADES)))
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
            "per_page": PER_PAGE, "order": "desc", "order_by": "observed_on",
            "photos": "true", "geo": "true", **date_params,
        }
        if quality: params["quality_grade"] = quality
        if id_below: params["id_below"] = id_below
        payload = _api_req(sess, f"{API_BASE}/observations", params, headers)
        results = payload.get("results") or []
        if not results: break
        for obs in results:
            if not validate_obs(obs): continue
            t = obs.get("taxon") or {}
            c = (obs.get("geojson") or {}).get("coordinates") or [None, None]
            pu = ""
            if photos := obs.get("photos") or []:
                pu = photos[0].get("url","").replace("square","medium")
            rows.append(dict(
                observation_id=obs.get("id"), taxon_id=t.get("id"),
                taxon_name=t.get("name",""),
                common_name=(t.get("preferred_common_name") or "").strip(),
                quality_grade=obs.get("quality_grade"), observed_on=obs.get("observed_on"),
                latitude=c[1], longitude=c[0],
                place_guess=obs.get("place_guess") or "",
                user_login=(obs.get("user") or {}).get("login") or "",
                photo_url=pu,
                url=f"https://www.inaturalist.org/observations/{obs.get('id')}",
            ))
        pages += 1
        min_id = min((o.get("id") for o in results if o.get("id")), default=None)
        if min_id is None or len(results) < PER_PAGE: break
        id_below = min_id
        time.sleep(max(0.0, delay))
    df = pd.DataFrame(rows)
    if not df.empty and "observed_on" in df.columns:
        df["observed_on"] = pd.to_datetime(df["observed_on"], errors="coerce")
    return df

@st.cache_data(ttl=1800, show_spinner=False)
def cached_fetch(taxon_ids: tuple, place_ids: tuple, quality: tuple,
                 max_recs: int, max_pgs: int, delay: float,
                 years: tuple, months: tuple) -> list[dict]:
    df = fetch_api(list(taxon_ids), list(place_ids), quality, max_recs, max_pgs, delay,
                   list(years) if years else None, list(months) if months else None)
    return df.to_dict(orient="records")

@st.cache_data(ttl=600, show_spinner=False)
def load_cache_db(taxon_ids: tuple, quality: tuple, max_recs: int,
                  enforce: bool, years=(), months=()) -> list[dict]:
    if not DASHBOARD_CACHE_DB.exists(): return []
    clauses = ["observed_on IS NOT NULL"]
    params: list = []
    if taxon_ids:
        clauses.append(f"taxon_id IN ({','.join('?'*len(taxon_ids))})")
        params.extend(taxon_ids)
    if quality:
        clauses.append(f"quality_grade IN ({','.join('?'*len(quality))})")
        params.extend(quality)
    if years:
        clauses.append(f"strftime('%Y',observed_on) IN ({','.join('?'*len(years))})")
        params.extend(str(y) for y in years)
    if months:
        clauses.append(f"CAST(strftime('%m',observed_on) AS INTEGER) IN ({','.join('?'*len(months))})")
        params.extend(months)
    if enforce:
        clauses.append("((latitude IS NULL OR longitude IS NULL) OR "
                       "(latitude BETWEEN ? AND ? AND longitude BETWEEN ? AND ?))")
        params.extend([PNW_BOUNDS["min_lat"],PNW_BOUNDS["max_lat"],
                       PNW_BOUNDS["min_lon"],PNW_BOUNDS["max_lon"]])
    q = f"""SELECT id as observation_id, taxon_id, species_guess as taxon_name,
            species_guess as common_name, quality_grade, observed_on,
            latitude, longitude, place_guess, user_login
            FROM observations WHERE {' AND '.join(clauses)} ORDER BY observed_on DESC LIMIT ?"""
    params.append(max_recs)
    with sqlite3.connect(DASHBOARD_CACHE_DB) as c:
        c.row_factory = sqlite3.Row
        rows = c.execute(q, params).fetchall()
    recs = [dict(r) for r in rows]
    for r in recs: r["url"] = f"https://www.inaturalist.org/observations/{r.get('observation_id')}"
    return recs

# ============================================================================
# API count verification
# ============================================================================
@st.cache_data(ttl=300, show_spinner=False)
def fetch_api_total(place_ids: tuple, taxon_ids: tuple, quality: tuple,
                    years: tuple, months: tuple) -> dict:
    params: dict[str, str | int] = {
        "place_id": ",".join(str(p) for p in place_ids),
        "per_page": 1,
    }
    if taxon_ids: params["taxon_id"] = ",".join(str(t) for t in taxon_ids[:50])
    if quality: params["quality_grade"] = ",".join(quality)
    if years:
        mn, mx = min(years), max(years)
        if months:
            mmn, mmx = min(months), max(months)
            ld = calendar.monthrange(mx, mmx)[1]
            params["d1"] = f"{mn}-{mmn:02d}-01"
            params["d2"] = f"{mx}-{mmx:02d}-{ld:02d}"
        else:
            params["d1"] = f"{mn}-01-01"
            params["d2"] = f"{mx}-12-31"
    try:
        sess = requests.Session()
        p = _api_req(sess, f"{API_BASE}/observations", params,
                     {"User-Agent":"PNW-Streamlit/1.0"})
        return {"total_results": int(p.get("total_results") or 0), "error": None}
    except Exception as e:
        return {"total_results": None, "error": str(e)}

# ============================================================================
# Page config & session
# ============================================================================
st.set_page_config(page_title="PNW Mushroom Observer", page_icon="🍄",
                   layout="wide", initial_sidebar_state="expanded")

st.markdown("""
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
html,body,[class*="st-"],[data-testid="stAppViewContainer"]{font-family:'Inter',sans-serif;}
div[data-testid="stMetric"]{border-radius:10px;padding:0.7rem 0.9rem!important;box-shadow:0 1px 3px rgba(0,0,0,0.06);}
div[data-testid="stMetric"] label{font-weight:600!important;font-size:0.75rem!important;text-transform:uppercase;letter-spacing:0.03em;}
.stButton>button{border-radius:8px;font-weight:600;}
</style>
""", unsafe_allow_html=True)

if "tracked" not in st.session_state:
    st.session_state.tracked = load_tracked()
if "show_add" not in st.session_state: st.session_state.show_add = False
if "show_edit" not in st.session_state: st.session_state.show_edit = False
if "edit_name" not in st.session_state: st.session_state.edit_name = None
if "update_confirm" not in st.session_state: st.session_state.update_confirm = False
if "purge_confirm" not in st.session_state: st.session_state.purge_confirm = False

# ============================================================================
# HEADER
# ============================================================================
st.title("🍄 PNW Mushroom Observer")
st.caption("Wild edible mushroom observation tracker for the Pacific Northwest · Data: [iNaturalist](https://inaturalist.org)")

# ============================================================================
# SIDEBAR
# ============================================================================
with st.sidebar:
    st.header("⚙️ Settings")

    # ── Species ──
    with st.expander("🍄 Tracked Species", expanded=not bool(st.session_state.tracked)):
        tracked = st.session_state.tracked
        if not tracked:
            st.info("No species tracked yet.")
        else:
            for name, tid in list(tracked.items()):
                c1, c2 = st.columns([7, 1])
                c1.write(f"**{name}**  *`ID:{tid}`*")
                if c2.button("✏️", key=f"ed_{name}"):
                    st.session_state.edit_name = name; st.session_state.show_edit = True; st.rerun()

        ca, cl = st.columns(2)
        if ca.button("➕ Add", use_container_width=True):
            st.session_state.show_add = True; st.rerun()
        if cl.button("📋 All 20 PNW", use_container_width=True):
            for sp in PNW_SPECIES:
                st.session_state.tracked[sp["common_name"]] = sp["taxon_id"]
            save_tracked(st.session_state.tracked); st.success("Loaded 20 species!"); st.rerun()

        if st.session_state.show_add:
            st.divider()
            st.caption("**Add Species**")
            with st.form("add_sp"):
                nm = st.text_input("Common name")
                tid = st.text_input("Taxon ID")
                s = st.form_submit_button("Save")
                if s and nm.strip() and tid.strip().isdigit():
                    tid_i = int(tid.strip())
                    st.session_state.tracked[nm.strip()] = tid_i
                    save_tracked(st.session_state.tracked)
                    st.session_state.show_add = False
                    # Prefetch data for new species
                    with st.spinner(f"Fetching initial data for {nm.strip()}..."):
                        try:
                            nd = fetch_observations_since([tid_i], max_records=2000, max_pages=10)
                            if nd:
                                save_cached(tid_i, nd)
                                st.success(f"Added **{nm.strip()}** with {len(nd):,} observations!")
                        except RuntimeError:
                            st.warning(f"Added **{nm.strip()}** but fetch failed. Data will load later.")
                    st.rerun()
            if st.button("Cancel", key="cx_add"): st.session_state.show_add = False; st.rerun()

        if st.session_state.show_edit and st.session_state.edit_name:
            en = st.session_state.edit_name
            ot = st.session_state.tracked[en]
            st.divider()
            st.caption(f"**Edit: {en}**")
            with st.form("edit_sp"):
                nm2 = st.text_input("Name", value=en)
                tid2 = st.text_input("Taxon ID", value=str(ot))
                s2 = st.form_submit_button("Update")
                if s2 and nm2.strip() and tid2.strip().isdigit():
                    nt = int(tid2.strip())
                    del st.session_state.tracked[en]
                    st.session_state.tracked[nm2.strip()] = nt
                    save_tracked(st.session_state.tracked)
                    # Rename cache file if taxon ID changed
                    if nt != ot:
                        old_cache = DATA_DIR / f"taxon_{ot}.json"
                        new_cache = DATA_DIR / f"taxon_{nt}.json"
                        if old_cache.exists() and not new_cache.exists():
                            old_cache.rename(new_cache)
                    st.session_state.show_edit = False; st.session_state.edit_name = None
                    st.success(f"Updated **{nm2.strip()}**"); st.rerun()
            cxl, cxr = st.columns(2)
            if cxl.button("Cancel", key="cx_ed"): st.session_state.show_edit = False; st.session_state.edit_name = None; st.rerun()
            if cxr.button("🗑️ Remove", key="rm_sp"):
                del st.session_state.tracked[en]; save_tracked(st.session_state.tracked)
                st.session_state.show_edit = False; st.session_state.edit_name = None
                st.success(f"Removed **{en}**"); st.rerun()

    # ── Data Source ──
    st.divider()
    st.caption("**📡 Data Source**")
    cache_sum = sum(len(load_cached(tid)) for tid in tracked.values())
    db_count = 0
    if DASHBOARD_CACHE_DB.exists():
        try:
            with sqlite3.connect(DASHBOARD_CACHE_DB) as c:
                db_count = c.execute("SELECT COUNT(*) FROM observations").fetchone()[0]
        except sqlite3.Error: pass
    source = st.selectbox("Data source", [
        f"Local JSON ({cache_sum:,}) ⚡",
        f"Dashboard SQLite ({db_count:,}) 💾",
        "iNaturalist API 🌐",
    ], index=0 if cache_sum > 0 else (1 if db_count > 0 else 2), label_visibility="collapsed")

    # ── Load Preset ──
    st.caption("**📦 Load Preset**")
    preset = st.radio("Preset", ["⚡ Quick","📦 Standard","🔬 Full","🔧 Custom"],
                       horizontal=True, label_visibility="collapsed")
    if preset == "⚡ Quick":
        max_recs, max_pgs, _ = LOAD_PRESET_QUICK
    elif preset == "📦 Standard":
        max_recs, max_pgs, _ = LOAD_PRESET_STANDARD
    elif preset == "🔬 Full":
        max_recs, max_pgs, _ = LOAD_PRESET_FULL
    else:
        max_recs = st.slider("Max records", 500, 1000000, 5000, step=1000,
                             label_visibility="collapsed")
        max_pgs = st.slider("Max pages", 5, 5000, 25, step=10,
                            label_visibility="collapsed")

    # ── Filters ──
    with st.expander("🎯 Filters", expanded=True):
        quality = st.multiselect("Quality grade", QUALITY_GRADES, default=["research","needs_id"])
        enforce = st.checkbox("Enforce PNW bounds", value=True)
        cy = datetime.now().year
        sely = st.multiselect("Year", list(range(2010, cy + 1)), default=[])
        selm = st.multiselect("Month", list(range(1, 13)),
                              format_func=lambda m: MONTH_SHORT[m-1], default=[])
        use_dr = st.checkbox("Custom date range")
        dmin: str | None = None
        dmax: str | None = None
        if use_dr:
            dr = st.date_input("Range", value=(datetime(2020,1,1).date(), datetime(cy,12,31).date()),
                               label_visibility="collapsed")
            if isinstance(dr, tuple) and len(dr) >= 2 and dr[0] and dr[1]:
                dmin, dmax = dr[0].isoformat(), dr[1].isoformat()
            elif dr and not isinstance(dr, tuple):
                dmin = dmax = dr.isoformat()
        cyears = tuple(sely) if sely else ()
        cmonths = tuple(selm) if selm else ()
        cqual = tuple(quality) if quality else tuple(QUALITY_GRADES)

    # ── Data Updates ──
    with st.expander("🔄 Data Updates"):
        st.caption("Incremental update: fetch only new observations since last cache update.")
        if st.button("🔄 Incremental Update All", use_container_width=True):
            st.session_state.update_confirm = True; st.rerun()
        if st.button("🗑️ Purge Local Cache", use_container_width=True):
            st.session_state.purge_confirm = True; st.rerun()
        if st.button("🧹 Clear Streamlit Cache", use_container_width=True):
            st.cache_data.clear(); st.success("Streamlit cache cleared.")

    # Handle update confirm
    if st.session_state.update_confirm:
        st.warning("This will hit the iNaturalist API for each species. Continue?")
        c1, c2 = st.columns(2)
        if c1.button("Yes, update all"):
            st.session_state.update_confirm = False
            total_new = 0
            status_msgs = []
            for name, tid in tracked.items():
                cached = load_cached(tid)
                last_date = None
                if cached:
                    dates = [o.get("observed_on") for o in cached if o.get("observed_on")]
                    if dates: last_date = max(dates)
                if last_date:
                    # Parse to YYYY-MM-DD
                    try: last_date = pd.to_datetime(last_date).strftime("%Y-%m-%d")
                    except Exception: last_date = None
                try:
                    new = fetch_observations_since([tid], since_date=last_date,
                                                    max_records=5000, max_pages=10)
                    if new and cached:
                        existing = {o["observation_id"] for o in cached}
                        new = [o for o in new if o["observation_id"] not in existing]
                    if new:
                        merged = (cached or []) + new
                        save_cached(tid, merged)
                        total_new += len(new)
                        qc = {}
                        for o in new: qc[o.get("quality_grade","?")] = qc.get(o.get("quality_grade","?"),0) + 1
                        qs = ", ".join(f"{g}:{c}" for g,c in qc.items())
                        status_msgs.append(f"✅ **{name}**: +{len(new)} new ({qs}) | total: {len(merged):,}")
                    else:
                        status_msgs.append(f"✓ **{name}**: up to date ({len(cached or []):,} obs)")
                except Exception as e:
                    status_msgs.append(f"❌ **{name}**: {e}")
            st.success(f"Incremental update complete — {total_new:,} new observations added.")
            for m in status_msgs: st.caption(m)
            st.rerun()
        if c2.button("Cancel"): st.session_state.update_confirm = False; st.rerun()

    # Handle purge confirm
    if st.session_state.purge_confirm:
        st.warning("Purge all local JSON cache files? This cannot be undone.")
        c1, c2 = st.columns(2)
        if c1.button("Yes, purge"):
            n = 0
            for f in DATA_DIR.glob("taxon_*.json"): f.unlink(); n += 1
            st.session_state.purge_confirm = False
            st.success(f"Purged {n} cache files."); st.rerun()
        if c2.button("Cancel"): st.session_state.purge_confirm = False; st.rerun()

    st.divider()
    st.caption("❤️ For PNW foragers · Data: [iNaturalist](https://inaturalist.org)")

# ============================================================================
# LOAD DATA
# ============================================================================
if not tracked:
    st.warning("No species tracked. Use the sidebar to add species or load all PNW.")
    st.stop()

taxon_ids = list(tracked.values())
records: list[dict] = []
meta = {"source": "unknown"}

with st.spinner("📡 Loading observations..."):
    if "API" in source:
        try:
            records = cached_fetch(tuple(taxon_ids), tuple(DEFAULT_PLACE_IDS), cqual,
                                   max_recs, max_pgs, DEFAULT_DELAY, cyears, cmonths)
            meta["source"] = "inat_api"
            for tid in taxon_ids:
                sub = [r for r in records if r.get("taxon_id") == tid]
                if sub: save_cached(tid, sub)
        except RuntimeError as e:
            st.error(str(e)); st.stop()
    elif "SQLite" in source:
        records = load_cache_db(tuple(taxon_ids), cqual, max_recs, enforce, cyears, cmonths)
        meta["source"] = "dashboard_cache"
    else:
        all_r = []
        for nm, tid in tracked.items():
            c = load_cached(tid)
            if c: all_r.extend(c)
            else:
                try:
                    dfx = fetch_api([tid], DEFAULT_PLACE_IDS, cqual, max_recs, 5)
                    if not dfx.empty:
                        fd = dfx.to_dict(orient="records"); save_cached(tid, fd); all_r.extend(fd)
                except RuntimeError:
                    st.warning(f"Could not fetch **{nm}**.")
        records = all_r
        meta["source"] = "local_json"

df = pd.DataFrame.from_records(records)
if not df.empty and "observed_on" in df.columns:
    df["observed_on"] = pd.to_datetime(df["observed_on"], errors="coerce")
    if cmonths and not dmin: df = df[df["observed_on"].dt.month.isin(cmonths)]
    if dmin: df = df[(df["observed_on"] >= dmin) & (df["observed_on"] <= dmax)]

if df.empty:
    st.warning("No observations. Adjust filters, switch to API, or run incremental update.")
    st.stop()

slabs = {"inat_api":"🔴 API live", "dashboard_cache":"💾 DB cache", "local_json":"⚡ Local cache"}
st.caption(f"{slabs.get(meta['source'],meta['source'])} · {len(df):,} obs · {df['taxon_id'].nunique():,} species")
dated_df = df.dropna(subset=["observed_on"])

# ============================================================================
# TABS
# ============================================================================
tabs = st.tabs([
    "🏠 Dashboard", "🔮 Predictions", "📊 Taxa & Momentum",
    "🔍 Species Explorer", "📈 Time Series", "👥 Contributors",
    "🗺️ Geographic", "📋 Pivot & Slice", "🛰️ API Status", "📄 Raw Data",
])

# ── TAB 0: DASHBOARD ──
with tabs[0]:
    if dated_df.empty:
        st.info("No dated observations."); st.stop()

    dminv, dmaxv = dated_df["observed_on"].min(), dated_df["observed_on"].max()
    span = (dmaxv - dminv).days if pd.notna(dminv) and pd.notna(dmaxv) else 0
    opd = len(dated_df) / max(1, span) if span else 0
    yoy = None
    by_year = dated_df.groupby(dated_df["observed_on"].dt.year).size()
    if len(by_year) >= 2:
        yoy = (by_year.iloc[-1] - by_year.iloc[-2]) / max(1, by_year.iloc[-2]) * 100
    rg = (df["quality_grade"]=="research").sum() / max(1,len(df)) * 100
    geom = df.dropna(subset=["latitude","longitude"]).shape[0]

    k1,k2,k3,k4,k5 = st.columns(5)
    k1.metric("Total Obs", f"{len(df):,}")
    k2.metric("Species", f"{df['taxon_id'].nunique():,}")
    k3.metric("Obs/Day", f"{opd:.1f}")
    k4.metric("YoY Growth", f"{yoy:+.1f}%" if yoy is not None else "n/a")
    k5.metric("Research %", f"{rg:.1f}%")

    st.divider()

    # Statistical summary
    if not dated_df.empty:
        by_month = dated_df.groupby(dated_df["observed_on"].dt.month)["observation_id"].count()
        st.caption(f"**Stats:** Mean/month {by_month.mean():.1f} · "
                   f"Median {by_month.median():.0f} · "
                   f"Std {by_month.std():.1f} · "
                   f"Peak: **{MONTH_FULL[by_month.idxmax()-1] if not by_month.empty else 'n/a'}** "
                   f"({int(by_month.max()) if not by_month.empty else 0:,} obs) · "
                   f"Mapped: {geom:,} obs")

    # What's Fruiting Now
    st.subheader("🌿 What's Fruiting")
    in_season = [s for s in PNW_SPECIES if s["taxon_id"] in taxon_ids and is_in_season(s)]
    if in_season:
        cols = st.columns(min(4, len(in_season)))
        for i, sp in enumerate(in_season):
            c = cols[i % len(cols)]
            peak = datetime.now().month in sp["peak"]
            c.markdown(f"""<div style="background:#fff;border:2px solid {'#e07b10' if peak else '#4caf50'};
              border-radius:12px;padding:0.6rem;margin:0.15rem 0;">
              <span style="font-size:1.3rem">{sp['emoji']}</span>
              <strong style="font-size:0.85rem;color:#1e3a5f">{sp['common_name']}</strong><br>
              <span style="font-size:0.7rem;color:#6b7c93;font-style:italic">{sp['scientific_name']}</span><br>
              <span style="font-size:0.7rem;font-weight:600;color:{'#e07b10' if peak else '#15803d'}">{'🔥 Peak' if peak else '✅ In Season'}</span>
              </div>""", unsafe_allow_html=True)
    else:
        st.info("No tracked species currently in season.")

    st.divider()

    # Aggregate seasonal pattern
    st.subheader("📊 Aggregate Seasonal Pattern")
    m_agg = dated_df.groupby(dated_df["observed_on"].dt.month).size()
    ym = dated_df.assign(year=dated_df["observed_on"].dt.year).groupby(
        ["year", dated_df["observed_on"].dt.month]).size()
    m_avg = ym.groupby(level=1).mean()
    fig_s = go.Figure()
    fig_s.add_trace(go.Bar(x=list(range(1,13)), y=[m_agg.get(m,0) for m in range(1,13)],
                           name="Total", marker_color="#1565C0"))
    fig_s.add_trace(go.Scatter(x=list(range(1,13)), y=[m_avg.get(m,0) for m in range(1,13)],
                               name="Yearly Avg", mode="lines+markers",
                               line=dict(color="#FF6F00",width=3), marker=dict(size=8)))
    nm = datetime.now().month
    fig_s.add_vline(x=nm, line_dash="dash", line_color="red",
                    annotation_text=f"Now ({MONTH_SHORT[nm-1]})")
    fig_s.update_layout(height=360, margin=dict(l=10,r=10,t=10,b=10),
                        xaxis=dict(tickmode="array",tickvals=list(range(1,13)),ticktext=MONTH_SHORT),
                        legend=dict(orientation="h",y=1.1))
    st.plotly_chart(fig_s, use_container_width=True)

    cq1, cq2 = st.columns(2)
    with cq1:
        st.subheader("Quality Distribution")
        qc = df["quality_grade"].value_counts()
        fig_q = px.pie(values=qc.values, names=qc.index, hole=0.5,
                       color_discrete_sequence=["#15803d","#FF6F00","#9e9e9e"])
        fig_q.update_layout(height=280, margin=dict(l=10,r=10,t=10,b=10))
        st.plotly_chart(fig_q, use_container_width=True)
    with cq2:
        st.subheader("Year-over-Year")
        yoy_df = by_year.reset_index(); yoy_df.columns = ["year","obs"]
        fig_yoy = px.bar(yoy_df, x="year", y="obs", color_discrete_sequence=["#1565C0"])
        fig_yoy.update_layout(height=280, margin=dict(l=10,r=10,t=10,b=10))
        st.plotly_chart(fig_yoy, use_container_width=True)

# ── TAB 1: PREDICTIONS ──
with tabs[1]:
    st.subheader("🔮 Seasonal Predictions")
    st.caption("Last / current / next month per-species based on historical data.")

    if dated_df.empty:
        st.info("No data.")
    else:
        id_to_name = {v:k for k,v in tracked.items()}
        all_preds = []
        for tid in taxon_ids:
            sdf = dated_df[dated_df["taxon_id"]==tid]
            nm = id_to_name.get(tid, f"Taxon {tid}")
            sp_info = next((s for s in PNW_SPECIES if s["taxon_id"]==tid), None)
            emoji = sp_info["emoji"] if sp_info else "🍄"
            pred = get_predictions(sdf, nm)
            if pred:
                pred["emoji"] = emoji
                pred["in_season"] = is_in_season(sp_info) if sp_info else False
                all_preds.append(pred)
        all_preds.sort(key=lambda p: (-p["in_season"], -p["total_obs"]))

        # Aggregate summary
        tp = get_predictions(dated_df, "All Species")
        if tp:
            kc,kn,kl = st.columns(3)
            kl.metric(f"📉 Last: {tp['last_month']['label']}", f"{tp['last_month']['avg']:.1f}/yr avg",
                      delta=f"{tp['last_month']['total']:,} total")
            kc.metric(f"📊 Now: {tp['current_month']['label']}", f"{tp['current_month']['avg']:.1f}/yr avg",
                      delta=f"{tp['current_month']['total']:,} total")
            kn.metric(f"📈 Next: {tp['next_month']['label']}", f"{tp['next_month']['avg']:.1f}/yr avg",
                      delta=f"{tp['next_month']['total']:,} total")

        st.divider()

        # Per-species cards
        cols = st.columns(2)
        for i, p in enumerate(all_preds):
            c = cols[i % 2]
            cu, nu, lu = p["current_month"], p["next_month"], p["last_month"]
            bg = "#e8f5e9" if p["in_season"] else "#fafafa"
            border = "#4caf50" if p["in_season"] else "#ddd"
            c.markdown(f"""<div style="background:{bg};border:2px solid {border};border-radius:12px;
              padding:0.6rem;margin:0.2rem 0;">
              <span style="font-size:1.2rem">{p['emoji']}</span>
              <strong style="font-size:0.9rem">{p['species']}</strong>
              <table style="width:100%;font-size:0.72rem;margin-top:0.2rem">
              <tr><td>{lu['label']}</td><td align=right>Avg {lu['avg']:.1f}</td><td align=right>{lu['total']:,} total</td></tr>
              <tr style="font-weight:700;color:#1565C0"><td>{cu['label']} (now)</td><td align=right>Avg {cu['avg']:.1f}</td><td align=right>{cu['total']:,} total</td></tr>
              <tr><td>{nu['label']}</td><td align=right>Avg {nu['avg']:.1f}</td><td align=right>{nu['total']:,} total</td></tr>
              </table>
              <span style="font-size:0.7rem;color:#6b7c93">Peak: {p['peak_month_label']} · {p['total_obs']:,} total obs</span>
              </div>""", unsafe_allow_html=True)

        st.divider()
        st.subheader("📈 Monthly Breakdown by Quality Grade")
        mq = dated_df.groupby([dated_df["observed_on"].dt.month,"quality_grade"]).size().unstack(fill_value=0)
        mq = mq.reindex(range(1,13), fill_value=0)
        mq.index = MONTH_SHORT
        st.dataframe(mq, use_container_width=True)
        st.caption(f"Grand total: {mq.sum().sum():,}")

# ── TAB 2: TAXA & MOMENTUM ──
with tabs[2]:
    # Top taxa table
    st.subheader("Top Taxa by Observation Count")
    top_taxa = (df.groupby(["taxon_id","taxon_name","common_name"], as_index=False)["observation_id"]
                .count().rename(columns={"observation_id":"obs"})
                .sort_values("obs", ascending=False))
    st.dataframe(top_taxa.head(50), use_container_width=True, hide_index=True)

    # Yearly trend by taxon
    if not dated_df.empty and "common_name" in dated_df.columns:
        st.subheader("Top 10 Taxa Yearly Trend")
        top10_ids = top_taxa.head(10)["taxon_id"].tolist()
        sub = dated_df[dated_df["taxon_id"].isin(top10_ids)].copy()
        sub["year"] = sub["observed_on"].dt.year
        ty = sub.groupby(["year","taxon_id","common_name"]).size().reset_index(name="obs")
        fig_ty = px.line(ty, x="year", y="obs", color="common_name",
                         labels={"year":"Year","obs":"Observations","common_name":"Taxon"})
        fig_ty.update_layout(height=360, margin=dict(l=10,r=10,t=10,b=10),
                             legend=dict(orientation="h", y=1.15))
        st.plotly_chart(fig_ty, use_container_width=True)

    # Weekly momentum
    st.subheader("Weekly Momentum (Current vs Previous Week)")
    now_u = datetime.now(tz=timezone.utc)
    cs = pd.Timestamp(now_u.date() - timedelta(days=6))
    ps = pd.Timestamp(now_u.date() - timedelta(days=13))
    pe = pd.Timestamp(now_u.date() - timedelta(days=7))
    cw = (dated_df[dated_df["observed_on"] >= cs]
          .groupby(["taxon_id","taxon_name"], as_index=False)["observation_id"].count()
          .rename(columns={"observation_id":"cur"}))
    pw = (dated_df[(dated_df["observed_on"] >= ps) & (dated_df["observed_on"] <= pe)]
          .groupby(["taxon_id","taxon_name"], as_index=False)["observation_id"].count()
          .rename(columns={"observation_id":"prev"}))
    mom = cw.merge(pw, on=["taxon_id","taxon_name"], how="outer").fillna(0)
    mom["delta"] = mom["cur"] - mom["prev"]
    mom = mom.sort_values("cur", ascending=False).head(20)
    if not mom.empty:
        fig_mom = px.bar(mom, x="taxon_name", y=["cur","prev"], barmode="group",
                         color_discrete_sequence=["#1565C0","#9e9e9e"],
                         labels={"value":"Obs","taxon_name":"Species","variable":"Week"})
        fig_mom.update_layout(height=360, margin=dict(l=10,r=10,t=10,b=10))
        st.plotly_chart(fig_mom, use_container_width=True)
    else:
        st.info("No recent observations to compare.")

# ── TAB 3: SPECIES EXPLORER ──
with tabs[3]:
    id_to_name = {v:k for k,v in tracked.items()}
    opts = []
    for tid in df["taxon_id"].unique():
        nm = id_to_name.get(tid, f"Taxon {tid}")
        cnt = (df["taxon_id"]==tid).sum()
        opts.append((nm, tid, cnt))
    opts.sort(key=lambda x: -x[2])
    if not opts: st.info("No species data."); st.stop()

    sel = st.selectbox("Species", range(len(opts)),
                       format_func=lambda i: f"{opts[i][0]} ({opts[i][2]} obs)")
    nm, tid, _ = opts[sel]
    sdf = df[df["taxon_id"]==tid].copy()
    sp_info = next((s for s in PNW_SPECIES if s["taxon_id"]==tid), None)

    if sp_info:
        st.subheader(f"{sp_info['emoji']} {sp_info['common_name']}")
        st.caption(f"*{sp_info['scientific_name']}* — ID `{tid}` — {sp_info['edibility']}")
    else:
        st.subheader(f"🍄 {nm}")
        st.caption(f"Taxon ID `{tid}`")

    sd = sdf.dropna(subset=["observed_on"])
    sp1,sp2,sp3,sp4 = st.columns(4)
    sp1.metric("Obs", f"{len(sdf):,}")
    sp2.metric("Research %", f"{(sdf['quality_grade']=='research').sum()/max(1,len(sdf))*100:.1f}%")
    sp3.metric("Mapped", f"{sdf.dropna(subset=['latitude','longitude']).shape[0]:,}")
    pred = get_predictions(sdf, nm)
    sp4.metric("Peak Month", pred.get("peak_month_label","n/a") if pred else "n/a")

    if pred:
        st.caption(f"Prediction — Last: {pred['last_month']['avg']:.1f}/yr avg · "
                   f"Now: {pred['current_month']['avg']:.1f}/yr avg · "
                   f"Next: {pred['next_month']['avg']:.1f}/yr avg")

    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Monthly Heatmap")
        heat = monthly_heatmap(sdf)
        if heat is not None and not heat.empty:
            fig_h = px.imshow(heat, aspect="auto", color_continuous_scale="Blues")
            fig_h.update_layout(height=340, margin=dict(l=10,r=10,t=10,b=10))
            st.plotly_chart(fig_h, use_container_width=True)
        else: st.info("Not enough data.")
    with c2:
        st.subheader("Monthly Distribution")
        if not sd.empty:
            mo = sd.groupby(sd["observed_on"].dt.month).size()
            ym2 = sd.assign(y=sd["observed_on"].dt.year).groupby(["y",sd["observed_on"].dt.month]).size()
            av = ym2.groupby(level=1).mean()
            fig2 = go.Figure()
            fig2.add_trace(go.Bar(x=list(range(1,13)), y=[mo.get(m,0) for m in range(1,13)],
                                  name="Total", marker_color="#1565C0"))
            fig2.add_trace(go.Scatter(x=list(range(1,13)), y=[av.get(m,0) for m in range(1,13)],
                                      name="Avg", mode="lines+markers",
                                      line=dict(color="#FF6F00",width=2.5)))
            fig2.add_vline(x=datetime.now().month, line_dash="dash", line_color="red")
            fig2.update_layout(height=340, margin=dict(l=10,r=10,t=10,b=10),
                               xaxis=dict(tickmode="array",tickvals=list(range(1,13)),ticktext=MONTH_SHORT),
                               legend=dict(orientation="h",y=1.1))
            st.plotly_chart(fig2, use_container_width=True)
        else: st.info("No data.")

    st.subheader("🗺️ Map")
    mp = sdf.dropna(subset=["latitude","longitude"])[["latitude","longitude"]]
    if not mp.empty: st.map(mp, size=6, use_container_width=True)
    else: st.info("No geo-tagged observations.")

# ── TAB 4: TIME SERIES ──
with tabs[4]:
    if dated_df.empty:
        st.info("No dated data.")
    else:
        daily = (dated_df.assign(day=dated_df["observed_on"].dt.date)
                 .groupby("day", as_index=False)["observation_id"].count()
                 .rename(columns={"observation_id":"obs"}).sort_values("day"))
        if not daily.empty:
            daily["r7"] = daily["obs"].rolling(7, min_periods=1).sum()
            st.subheader("Daily + 7-Day Rolling")
            fig_d = px.line(daily, x="day", y=["r7"], labels={"value":"Obs","variable":"Series"},
                            color_discrete_sequence=["#FF6F00"])
            fig_d.update_layout(height=320, margin=dict(l=10,r=10,t=10,b=10))
            st.plotly_chart(fig_d, use_container_width=True)

        monthly = (dated_df.assign(mo=dated_df["observed_on"].dt.to_period("M").astype(str))
                   .groupby("mo", as_index=False)["observation_id"].count()
                   .rename(columns={"observation_id":"obs"}))
        if not monthly.empty:
            st.subheader("Monthly Trend")
            fig_m = px.bar(monthly, x="mo", y="obs", color_discrete_sequence=["#1565C0"])
            fig_m.update_layout(height=320, margin=dict(l=10,r=10,t=10,b=10))
            st.plotly_chart(fig_m, use_container_width=True)

# ── TAB 5: CONTRIBUTORS ──
with tabs[5]:
    if "user_login" in df.columns:
        ul = df["user_login"].fillna("").astype(str).str.strip()
        mask = ul != ""
        users_df = df.loc[mask].groupby(ul.loc[mask].values)["observation_id"].count().reset_index()
        users_df.columns = ["user","obs"]
        users_df = users_df.sort_values("obs", ascending=False)
        st.subheader("Top Observers")
        st.dataframe(users_df.head(30), use_container_width=True, hide_index=True)
        st.metric("Unique Observers", f"{len(users_df):,}")
    else: st.info("No contributor data.")

# ── TAB 6: GEOGRAPHIC ──
with tabs[6]:
    mp_df = df.dropna(subset=["latitude","longitude"])[["latitude","longitude"]]
    if not mp_df.empty:
        st.subheader("Observation Map")
        st.map(mp_df, size=4, use_container_width=True)
    else: st.info("No coordinates.")

    if "place_guess" in df.columns:
        pl = df["place_guess"].fillna("(unknown)")
        pc = df.assign(place=pl).groupby("place", as_index=False)["observation_id"].count()
        pc = pc.rename(columns={"observation_id":"obs"}).sort_values("obs", ascending=False)
        st.subheader("By Place")
        st.dataframe(pc.head(30), use_container_width=True, hide_index=True)

# ── TAB 7: PIVOT & SLICE ──
with tabs[7]:
    st.subheader("📊 Pivot & Slice")
    st.caption("Filter and aggregate the loaded data.")

    pv = df.copy()
    if not pv.empty and "observed_on" in pv.columns:
        pv = pv.dropna(subset=["observed_on"])
        pv["year"] = pv["observed_on"].dt.year
        pv["month"] = pv["observed_on"].dt.month

    f1, f2, f3 = st.columns(3)
    with f1:
        y_ops = sorted(pv["year"].dropna().unique().astype(int).tolist()) if not pv.empty and "year" in pv.columns else []
        selyp = st.multiselect("Year", y_ops, default=[], key="py")
        selmp = st.multiselect("Month", list(range(1,13)), default=[],
                               format_func=lambda m: MONTH_SHORT[m-1], key="pm")
    with f2:
        t_ops = sorted(pv["common_name"].dropna().unique().tolist()) if "common_name" in pv.columns else []
        seltp = st.multiselect("Taxon", t_ops, default=[], key="pt")
        q_ops = pv["quality_grade"].dropna().unique().tolist() if "quality_grade" in pv.columns else []
        selqp = st.multiselect("Quality", q_ops, default=[], key="pq")
    with f3:
        p_ops = []
        if "place_guess" in pv.columns:
            ps = pv["place_guess"].fillna("").astype(str).str.strip()
            p_ops = sorted(ps[ps!=""].unique().tolist())
        selpp = st.multiselect("Place", p_ops, default=[], key="ppl")

    sv = pv
    if selyp and "year" in sv.columns: sv = sv[sv["year"].isin(selyp)]
    if selmp and "month" in sv.columns: sv = sv[sv["month"].isin(selmp)]
    if seltp and "common_name" in sv.columns: sv = sv[sv["common_name"].isin(seltp)]
    if selqp and "quality_grade" in sv.columns: sv = sv[sv["quality_grade"].isin(selqp)]
    if selpp and "place_guess" in sv.columns: sv = sv[sv["place_guess"].astype(str).str.strip().isin(selpp)]

    st.metric("Filtered count", f"{len(sv):,} obs")
    dims = [c for c in ["year","month","common_name","quality_grade","place_guess","user_login"] if c in sv.columns]
    if dims:
        rd = st.selectbox("Rows", dims, key="pr")
        cd_opts = ["None"] + dims
        cd = st.selectbox("Columns", cd_opts, key="pc")
        cd = None if cd == "None" else cd
        if not sv.empty:
            try:
                grp = [c for c in [rd, cd] if c]
                agg = (sv.groupby(grp, dropna=False)["observation_id"].count().unstack(fill_value=0)
                       if cd else sv.groupby(rd, dropna=False)["observation_id"].count())
                if isinstance(agg, pd.Series): agg = agg.to_frame("count")
                st.dataframe(agg, use_container_width=True, height=400)
            except Exception as e: st.warning(f"Pivot error: {e}")

# ── TAB 8: API STATUS ──
with tabs[8]:
    st.subheader("🛰️ API Status & Verification")
    st.caption("Compare loaded/cached counts against what iNaturalist reports.")

    st.write("**Current query:**")
    st.code(f"Places: {DEFAULT_PLACE_IDS}\n"
            f"Taxa: {list(tracked.keys())[:5]}{'...' if len(tracked)>5 else ''}\n"
            f"Quality: {list(cqual)}\n"
            f"Years: {list(cyears) if cyears else 'All'}\n"
            f"Months: {list(cmonths) if cmonths else 'All'}")

    our_count = len(df)
    st.metric("Our count", f"{our_count:,}")
    st.caption("Click below to verify against the iNaturalist API total.")

    if st.button("🔄 Verify against API now"):
        with st.spinner("Querying iNaturalist API..."):
            result = fetch_api_total(tuple(DEFAULT_PLACE_IDS), tuple(taxon_ids),
                                     cqual, cyears, cmonths)
        if result["error"]:
            st.error(f"API error: {result['error']}")
        else:
            api_total = result["total_results"]
            diff = our_count - (api_total or 0)
            c1, c2, c3 = st.columns(3)
            c1.metric("Our count", f"{our_count:,}")
            c2.metric("API total", f"{api_total:,}" if api_total is not None else "n/a")
            c3.metric("Difference", f"{diff:+,}")
            if diff == 0: st.success("Counts align perfectly.")
            elif abs(diff) < 100: st.info("Minor difference — likely cache timing.")
            else: st.warning("Significant difference. Try switching to API source or running incremental update.")

    st.divider()
    st.caption("**Tips:** Cache data may lag behind live API. Quality grades: leave all unchecked for 'Any'. "
               "PNW bounds can exclude out-of-region observations.")

# ── TAB 9: RAW DATA ──
with tabs[9]:
    st.subheader("Raw Observations")
    dc = ["observation_id","observed_on","taxon_id","taxon_name","common_name",
          "quality_grade","place_guess","latitude","longitude","user_login","url"]
    disp = df[[c for c in dc if c in df.columns]].sort_values("observed_on", ascending=False)
    lim = min(5000, len(disp))
    st.dataframe(disp.head(lim), use_container_width=True, hide_index=True, height=420)
    if len(disp) > lim:
        st.caption(f"Showing {lim:,} of {len(disp):,}. Download CSV for full dataset.")
    csv = disp.to_csv(index=False).encode("utf-8")
    st.download_button(f"📥 Download CSV ({len(disp):,} rows)", csv,
                       f"pnw_mushrooms_{datetime.now().date().isoformat()}.csv", "text/csv")

# ============================================================================
# FOOTER
# ============================================================================
st.divider()
st.caption(f"🍄 PNW Mushroom Observer · {len(df):,} obs · {df['taxon_id'].nunique():,} species · "
           f"{datetime.now().strftime('%Y-%m-%d %H:%M')} · Data: [iNaturalist](https://inaturalist.org)")
