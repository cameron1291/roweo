"""
seed_suburb_coords.py — Geocode Australian suburb centroids using Nominatim (OSM).

Usage:
  python seed_suburb_coords.py                  # geocode all suburbs missing lat/lng
  python seed_suburb_coords.py --state NSW       # only NSW suburbs
  python seed_suburb_coords.py --dry-run         # print without saving

Nominatim usage policy: max 1 request/second, identify yourself via User-Agent.
This script is a one-time seed — subsequent DA inserts look up from the suburbs table.
"""

import os
import sys
import time
import logging
import argparse
import requests
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(__file__))
from shared.supabase_client import _get_client

load_dotenv()
log = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
HEADERS = {"User-Agent": "Roweo/1.0 (cameron.drayton@hotmail.co.uk)"}
REQUEST_DELAY = 1.1  # Nominatim policy: max 1 req/sec


def geocode_suburb(name: str, state: str) -> tuple[float, float] | None:
    """Return (lat, lng) for an Australian suburb, or None if not found."""
    params = {
        "q": f"{name}, {state}, Australia",
        "format": "json",
        "limit": 1,
        "countrycodes": "au",
        "featuretype": "settlement",
    }
    try:
        resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        results = resp.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
        # Retry without featuretype restriction (some suburbs aren't tagged as settlement)
        params.pop("featuretype")
        resp = requests.get(NOMINATIM_URL, params=params, headers=HEADERS, timeout=10)
        resp.raise_for_status()
        results = resp.json()
        if results:
            return float(results[0]["lat"]), float(results[0]["lon"])
    except Exception as e:
        log.warning(f"Geocode failed for {name}, {state}: {e}")
    return None


def run(state_filter: str | None = None, dry_run: bool = False):
    client = _get_client()

    query = client.table("suburbs").select("id, name, state").is_("lat", "null")
    if state_filter:
        query = query.eq("state", state_filter.upper())

    result = query.order("da_count", desc=True).execute()
    suburbs = result.data or []

    log.info(f"Found {len(suburbs)} suburbs without coordinates")

    success = 0
    failed = 0
    for i, row in enumerate(suburbs):
        name = row["name"]
        state = row["state"]
        log.info(f"[{i+1}/{len(suburbs)}] Geocoding {name}, {state}…")

        coords = geocode_suburb(name, state)
        time.sleep(REQUEST_DELAY)

        if not coords:
            log.warning(f"  ✗ No result for {name}, {state}")
            failed += 1
            continue

        lat, lng = coords
        log.info(f"  ✓ {lat:.4f}, {lng:.4f}")

        if not dry_run:
            client.table("suburbs").update({"lat": lat, "lng": lng}).eq("id", row["id"]).execute()
        success += 1

    log.info(f"Done: {success} geocoded, {failed} failed{' (dry run)' if dry_run else ''}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", help="Filter by state (NSW, ACT, VIC…)")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(state_filter=args.state, dry_run=args.dry_run)
