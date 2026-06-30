"""
council_da_api.py — Australia-wide DA ingestion via council-da.com API.

Covers 250+ councils across NSW, VIC, QLD, SA, WA, TAS, NT, ACT.
API key required (free tier: 500 req/day). No scraping needed.

Residential categories we target: Residential, Mixed Use, Subdivision (dwellings).
We skip: Commercial, Industrial, Minor Works (verandah/carport), Agricultural.
"""

import os
import sys
import logging
import time
import requests
from datetime import datetime, timedelta, timezone
from typing import Optional, List

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
from shared.supabase_client import (
    upsert_da,
    da_exists,
    log_scraper_start,
    log_scraper_end,
    log_health,
    increment_suburb_da_count,
    increment_council_da_count,
    increment_postcode_da_count,
)
from shared.classifier import classify_project_type
from shared.matcher import match_da_to_builders

log = logging.getLogger(__name__)

SOURCE = "council_da"
BASE_URL = os.environ.get("COUNCIL_DA_API_URL", "https://councilda-backend.onrender.com/v1")
API_KEY = os.environ.get("COUNCIL_DA_API_KEY", "")
PAGE_SIZE = 100
MAX_RETRIES = 3
RETRY_DELAY = 10

# Categories we want to ingest
RESIDENTIAL_CATEGORIES = {"residential", "mixed use", "subdivision"}

# Description keywords that suggest commercial/industrial — skip these
SKIP_KEYWORDS = {
    "warehouse", "factory", "industrial", "office building", "commercial premises",
    "service station", "car wash", "child care centre", "aged care",
    "agricultural building", "shed (agricultural)", "poultry",
}

# Australian states to iterate over
ALL_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "NT", "ACT"]


def _should_skip(record: dict) -> bool:
    """Return True if this DA is not relevant for residential builders."""
    category = (record.get("category") or "").lower()
    application_type = (record.get("application_type") or "").upper()
    description = (record.get("description") or "").lower()
    suburb = (record.get("suburb") or "").strip()

    # Skip records with no usable suburb
    if not suburb:
        return True

    # Skip non-residential categories when explicitly set
    if category and category not in RESIDENTIAL_CATEGORIES:
        return True

    # Skip certain application types (planning amendments, subdivisions, etc.)
    if application_type in ("SUBDIVISION", "STRATA", "HERITAGE", "REZONING"):
        return True

    # Skip commercial descriptions even when category is blank
    desc_words = set(description.split())
    for keyword in SKIP_KEYWORDS:
        if keyword in description:
            return True

    return False


def _parse_record(record: dict) -> Optional[dict]:
    """Map a council-da.com API record to our DA schema. Returns None to skip."""
    if _should_skip(record):
        return None

    source_id = str(record.get("id") or "").strip()
    if not source_id:
        return None

    suburb = (record.get("suburb") or "").strip().title()
    state = (record.get("state") or "").strip().upper()
    postcode = (record.get("postcode") or "").strip() or None
    address = (record.get("address") or "").strip() or None
    council = (record.get("council_name") or "").strip() or None
    description = (record.get("description") or "").strip() or None
    da_number = (record.get("da_number") or "").strip() or None
    lodged_date = (record.get("lodged_date") or "").strip() or None
    source_url = (record.get("source_url") or "").strip() or None

    cost_raw = record.get("estimated_cost")
    try:
        cost_aud = int(float(cost_raw)) if cost_raw is not None else None
    except (ValueError, TypeError):
        cost_aud = None

    if not suburb or not state:
        return None

    return {
        "source": SOURCE,
        "source_id": source_id,
        "source_url": source_url,
        "council": council,
        "state": state,
        "suburb": suburb,
        "postcode": postcode,
        "street_address": address,
        "da_number": da_number,
        "description": description,
        "estimated_value_aud": cost_aud,
        "applicant_name": record.get("applicant_name"),
        "owner_name": None,
        "lodged_date": lodged_date,
        "determination_date": record.get("decision_date"),
        "raw_data": record,
    }


def _fetch_page(state: str, date_from: str, date_to: str, page: int) -> Optional[dict]:
    """Fetch a single page from the council-da.com API."""
    params = {
        "state": state,
        "lodged_from": date_from,
        "lodged_to": date_to,
        "per_page": PAGE_SIZE,
        "page": page,
    }
    headers = {"X-API-Key": API_KEY, "Accept": "application/json"}

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(
                f"{BASE_URL}/applications",
                params=params,
                headers=headers,
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            log.warning(f"[{state}] Page {page} attempt {attempt}/{MAX_RETRIES} failed: {e}")
            if attempt < MAX_RETRIES:
                time.sleep(RETRY_DELAY)
    return None


def run(days_back: int = 1, states: Optional[List[str]] = None) -> dict:
    """
    Ingest DAs from the council-da.com API for all (or specified) Australian states.
    Returns summary: { das_scraped, das_new, matches_created, errors }
    """
    if not API_KEY:
        raise RuntimeError("COUNCIL_DA_API_KEY not set in environment")

    target_states = states or ALL_STATES
    now = datetime.now(timezone.utc)
    date_to = now.strftime("%Y-%m-%d")
    date_from = (now - timedelta(days=days_back)).strftime("%Y-%m-%d")

    log.info(f"[council-da] Ingesting {target_states} from {date_from} to {date_to}")
    run_id = log_scraper_start(SOURCE)

    total_scraped = 0
    total_new = 0
    total_matches = 0
    errors = []

    for state in target_states:
        log.info(f"[{state}] Starting...")
        state_scraped = 0
        state_new = 0
        page = 1

        while True:
            data = _fetch_page(state, date_from, date_to, page)
            if data is None:
                errors.append(f"{state} page {page}: failed after {MAX_RETRIES} retries")
                break

            records = data.get("data") or []
            if not records:
                break

            for record in records:
                state_scraped += 1
                parsed = _parse_record(record)
                if not parsed:
                    continue

                if da_exists(SOURCE, parsed["source_id"]):
                    continue

                # Classify project type via DeepSeek
                if parsed.get("description"):
                    try:
                        classification = classify_project_type(parsed["description"])
                        parsed["project_type"] = classification["project_type"]
                        parsed["project_type_confidence"] = classification["confidence"]
                    except Exception as e:
                        log.warning(f"Classifier error: {e}")
                        parsed["project_type"] = "other"
                        parsed["project_type_confidence"] = 0.0
                else:
                    # Try to infer from category field
                    category = (record.get("category") or "").lower()
                    if "residential" in category:
                        parsed["project_type"] = "new_dwelling"
                    else:
                        parsed["project_type"] = "other"
                    parsed["project_type_confidence"] = 0.3

                da_id = upsert_da(parsed)
                if not da_id:
                    errors.append(f"Failed to upsert {parsed['source_id']}")
                    continue

                state_new += 1

                # Update SEO rollup tables
                increment_suburb_da_count(parsed["suburb"], parsed["state"], parsed.get("postcode"))
                increment_council_da_count(parsed.get("council") or "", parsed["state"])
                if parsed.get("postcode"):
                    increment_postcode_da_count(parsed["postcode"], parsed["state"], parsed["suburb"])

                # Match to builders
                new_matches = match_da_to_builders(da_id, parsed, trigger_stage="lodgement")
                total_matches += new_matches

            log.info(f"[{state}] Page {page}: {len(records)} records, {state_new} new so far")

            total_pages = data.get("total_pages", 1)
            if page >= total_pages:
                break
            page += 1

            # Respect rate limit — small delay between pages
            time.sleep(0.2)

        total_scraped += state_scraped
        total_new += state_new
        log.info(f"[{state}] Done: {state_scraped} scraped, {state_new} new")

    error_str = "; ".join(errors) if errors else None
    log_scraper_end(run_id, total_scraped, total_new, total_matches, error_str)
    log_health(
        check_name="council_da",
        status="error" if errors and total_new == 0 else "ok",
        message=error_str or f"Ingested {total_new} new DAs across {len(target_states)} states",
    )

    log.info(f"[council-da] Complete: {total_scraped} scraped, {total_new} new, {total_matches} matches")
    return {
        "das_scraped": total_scraped,
        "das_new": total_new,
        "matches_created": total_matches,
        "errors": errors,
    }


if __name__ == "__main__":
    import argparse
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "../../.env.local"))
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

    parser = argparse.ArgumentParser(description="Ingest Australian DAs via council-da.com API")
    parser.add_argument("--days-back", type=int, default=1, help="Days back to fetch (default: 1)")
    parser.add_argument("--states", nargs="+", help="States to ingest (default: all)")
    args = parser.parse_args()

    result = run(days_back=args.days_back, states=args.states)
    print(result)
