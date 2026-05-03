#!/usr/bin/env python3
"""
Test script for iNaturalist API - verifies chained taxon queries and pagination.
Run: python streamlit/test_api.py
"""
from __future__ import annotations

import time

import requests

API_BASE = "https://api.inaturalist.org/v1"
PER_PAGE = 200

TAXON_IDS = [120443, 54132, 350511, 48701, 53713]
PLACE_IDS = [10, 46]


def test_single_page():
    """Test basic chained taxon_id + place_id query."""
    params = {
        "taxon_id": ",".join(str(t) for t in TAXON_IDS),
        "place_id": ",".join(str(p) for p in PLACE_IDS),
        "per_page": 50,
        "quality_grade": "research,needs_id",
        "order": "desc",
        "order_by": "id",
    }
    resp = requests.get(f"{API_BASE}/observations", params=params, headers={"User-Agent": "PNW-Test/1.0"}, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    total = data.get("total_results", 0)
    results = data.get("results") or []
    print(f"[PASS] Single page: {len(results)} results, total_results={total:,}")
    return data


def test_pagination(max_pages: int = 5):
    """Test pagination with id_below."""
    params = {
        "taxon_id": ",".join(str(t) for t in TAXON_IDS),
        "place_id": ",".join(str(p) for p in PLACE_IDS),
        "per_page": PER_PAGE,
        "quality_grade": "research,needs_id",
        "order": "desc",
        "order_by": "id",
    }
    all_rows = []
    id_below = None

    for page in range(max_pages):
        if id_below is not None:
            params["id_below"] = str(id_below)
        resp = requests.get(
            f"{API_BASE}/observations",
            params=params.copy(),
            headers={"User-Agent": "PNW-Test/1.0"},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results") or []
        if not results:
            break
        all_rows.extend(results)
        min_id = min(r.get("id") for r in results if r.get("id"))
        id_below = min_id
        time.sleep(1.1)
        print(f"  Page {page + 1}: got {len(results)} obs (total so far: {len(all_rows)})")

    total_api = data.get("total_results", 0)
    print(f"[PASS] Pagination: fetched {len(all_rows):,} rows in {max_pages} pages, API reports total_results={total_api:,}")
    return len(all_rows)


def test_larger_taxon_set():
    """Test with more taxon IDs (10) - still single query."""
    more_taxa = [120443, 54132, 350511, 48701, 53713, 53714, 49158, 48215, 48641, 48494]
    params = {
        "taxon_id": ",".join(str(t) for t in more_taxa),
        "place_id": "10,46",
        "per_page": 200,
        "quality_grade": "research,needs_id",
        "order": "desc",
        "order_by": "id",
    }
    resp = requests.get(f"{API_BASE}/observations", params=params, headers={"User-Agent": "PNW-Test/1.0"}, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    total = data.get("total_results", 0)
    results = data.get("results") or []
    print(f"[PASS] 10 taxon IDs in one query: {len(results)} on first page, total_results={total:,}")
    return total


def test_iconic_taxa_no_taxon_filter():
    """Test iconic_taxa (Fungi) without explicit taxon_id."""
    params = {
        "place_id": "10,46",
        "iconic_taxa": "Fungi",
        "per_page": 100,
        "quality_grade": "research,needs_id",
        "order": "desc",
        "order_by": "id",
    }
    resp = requests.get(f"{API_BASE}/observations", params=params, headers={"User-Agent": "PNW-Test/1.0"}, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    total = data.get("total_results", 0)
    results = data.get("results") or []
    print(f"[PASS] Iconic Fungi (no taxon_id): {len(results)} on first page, total_results={total:,}")
    return total


def test_date_range():
    """Test d1/d2 date filtering."""
    params = {
        "taxon_id": "120443",
        "place_id": "10",
        "per_page": 20,
        "quality_grade": "research",
        "d1": "2024-01-01",
        "d2": "2024-12-31",
        "order": "desc",
        "order_by": "id",
    }
    resp = requests.get(f"{API_BASE}/observations", params=params, headers={"User-Agent": "PNW-Test/1.0"}, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    total = data.get("total_results", 0)
    results = data.get("results") or []
    print(f"[PASS] Date range (2024): {len(results)} on first page, total_results={total:,}")
    return total


def test_quick_load_simulation():
    """Simulate Quick preset: 25 pages, ~5k records."""
    taxon_ids = [120443, 54132, 350511, 48701, 53713]
    base_params = {
        "taxon_id": ",".join(str(t) for t in taxon_ids),
        "place_id": "10,46",
        "per_page": PER_PAGE,
        "quality_grade": "research,needs_id",
        "order": "desc",
        "order_by": "id",
    }
    all_rows = []
    id_below = None
    max_pages = 25

    for page in range(max_pages):
        p = dict(base_params)
        if id_below is not None:
            p["id_below"] = str(id_below)
        resp = requests.get(f"{API_BASE}/observations", params=p, headers={"User-Agent": "PNW-Test/1.0"}, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        results = data.get("results") or []
        if not results:
            break
        all_rows.extend(results)
        min_id = min(r.get("id") for r in results if r.get("id"))
        id_below = min_id
        time.sleep(1.1)

    print(f"[PASS] Quick-load sim (25 pages max): {len(all_rows):,} rows fetched")
    return len(all_rows)


def main():
    print("iNaturalist API tests\n" + "=" * 50)
    try:
        test_single_page()
        print()
        test_pagination(max_pages=5)
        print()
        test_larger_taxon_set()
        print()
        test_iconic_taxa_no_taxon_filter()
        print()
        test_date_range()
        print()
        test_quick_load_simulation()
        print("=" * 50)
        print("All tests passed.")
    except requests.RequestException as e:
        print(f"[FAIL] Request error: {e}")
        raise
    except Exception as e:
        print(f"[FAIL] {e}")
        raise


if __name__ == "__main__":
    main()
