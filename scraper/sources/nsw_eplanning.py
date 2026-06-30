"""
nsw_eplanning.py - Scrapes NSW development applications from the NSW ePlanning Portal API.

API: https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA
Public API — no authentication required for v0 endpoint.

On first run, spot-check the raw_data logged to Supabase and update field mappings
in _parse_application() if field names differ from what's expected here.
"""

import os
import sys
import logging
import requests
from datetime import datetime, timedelta, timezone

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

SOURCE = "nsw_eplanning"
BASE_URL = "https://api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA"
PAGE_SIZE = 100
MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 30


def _build_url(date_from: str, date_to: str, page: int) -> str:
    # Colon-separated key:value pairs, comma-delimited list under 'filters' param.
    # ApplicationTypeNm:Development Application is the required base filter.
    filters = (
        f"ApplicationTypeNm:Development Application,"
        f"LodgementDateFrom:{date_from},"
        f"LodgementDateTo:{date_to}"
    )
    return (
        f"{BASE_URL}"
        f"?filters={requests.utils.quote(filters, safe=':,')}"
        f"&pageSize={PAGE_SIZE}"
        f"&pageNumber={page}"
    )


def _parse_address(addr: dict) -> dict:
    """Extract flat address fields from the PrimaryAddress nested object."""
    # Verify these field names against raw_data on first run.
    street_num = str(addr.get("StreetNumber") or "").strip()
    unit = str(addr.get("UnitNumber") or "").strip()
    street_name = str(addr.get("StreetName") or "").strip()
    street_type = str(addr.get("StreetType") or "").strip()
    prefix = f"{unit}/{street_num}" if unit else street_num
    full_street = f"{prefix} {street_name} {street_type}".strip()

    return {
        "street_address": full_street or None,
        "suburb": (addr.get("Suburb") or "").strip().title() or None,
        "postcode": str(addr.get("PostCode") or "").strip() or None,
    }


def _parse_application(app: dict) -> dict | None:
    """Map a single API application object to our DA schema. Returns None to skip."""
    # Field name reference: adjust these if the live API differs.
    # Source ID: unique identifier per DA on this portal.
    source_id = str(app.get("ApplicationId") or app.get("PlanningPortalApplicationNumber") or "")
    if not source_id:
        return None

    addr = _parse_address(app.get("PrimaryAddress") or {})
    if not addr.get("suburb"):
        return None

    lodged_date_raw = app.get("LodgementDate")
    determination_date_raw = app.get("DeterminationDate")
    description = (app.get("Description") or "").strip() or None

    cost_raw = app.get("CostOfDevelopment")
    try:
        cost_aud = int(float(cost_raw)) if cost_raw is not None else None
    except (ValueError, TypeError):
        cost_aud = None

    return {
        "source": SOURCE,
        "source_id": source_id,
        "source_url": f"https://www.planningportal.nsw.gov.au/find-a-development-application?id={source_id}",
        "council": (app.get("Council") or "").strip() or None,
        "state": "NSW",
        "suburb": addr["suburb"],
        "postcode": addr["postcode"],
        "street_address": addr["street_address"],
        "da_number": str(app.get("ApplicationNumber") or "").strip() or None,
        "description": description,
        "estimated_value_aud": cost_aud,
        "applicant_name": (app.get("ApplicantName") or "").strip() or None,
        "owner_name": None,
        "lodged_date": _parse_date(lodged_date_raw),
        "determination_date": _parse_date(determination_date_raw),
        "raw_data": app,
    }


def _parse_date(raw) -> str | None:
    if not raw:
        return None
    raw = str(raw).strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def _fetch_page(date_from: str, date_to: str, page: int) -> dict | None:
    url = _build_url(date_from, date_to, page)
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            resp = requests.get(
                url,
                headers={"Accept": "application/json", "User-Agent": "Roweo/1.0"},
                timeout=30,
            )
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            log.warning(f"[NSW] Page {page} attempt {attempt}/{MAX_RETRIES} failed: {e}")
            if attempt < MAX_RETRIES:
                import time; time.sleep(RETRY_DELAY_SECONDS)
    return None


def run(days_back: int = 1) -> dict:
    """
    Scrape NSW ePlanning Portal DAs from the last `days_back` days.
    Returns summary dict: { das_scraped, das_new, matches_created, errors }.
    """
    now = datetime.now(timezone.utc)
    date_to = now.strftime("%Y-%m-%d")
    date_from = (now - timedelta(days=days_back)).strftime("%Y-%m-%d")

    log.info(f"[NSW] Scraping DAs from {date_from} to {date_to}")
    run_id = log_scraper_start(SOURCE)

    das_scraped = 0
    das_new = 0
    matches_created = 0
    errors = []

    page = 1
    while True:
        data = _fetch_page(date_from, date_to, page)
        if data is None:
            errors.append(f"Failed to fetch page {page} after {MAX_RETRIES} retries")
            break

        if "ErrorMessage" in data:
            err = data.get("ErrorMessage", "Unknown API error")
            log.error(f"[NSW] API error on page {page}: {err}")
            errors.append(f"API error page {page}: {err}")
            break

        # Top-level response: { TotalCount: N, Application: [...] }
        applications = data.get("Application") or []
        if not applications:
            break

        for app in applications:
            das_scraped += 1
            parsed = _parse_application(app)
            if not parsed:
                continue

            if da_exists(SOURCE, parsed["source_id"]):
                continue

            # Classify project type via DeepSeek
            if parsed.get("description"):
                classification = classify_project_type(parsed["description"])
                parsed["project_type"] = classification["project_type"]
                parsed["project_type_confidence"] = classification["confidence"]
            else:
                parsed["project_type"] = "other"
                parsed["project_type_confidence"] = 0.0

            da_id = upsert_da(parsed)
            if not da_id:
                errors.append(f"Failed to upsert DA {parsed['source_id']}")
                continue

            das_new += 1

            # Update SEO rollup tables
            increment_suburb_da_count(parsed["suburb"], parsed["state"], parsed.get("postcode"))
            increment_council_da_count(parsed.get("council") or "", parsed["state"])
            increment_postcode_da_count(parsed.get("postcode") or "", parsed["state"], parsed["suburb"])

            # Fan out to matching builders
            new_matches = match_da_to_builders(da_id, parsed, trigger_stage="lodgement")
            matches_created += new_matches

        log.info(f"[NSW] Page {page}: {len(applications)} DAs, {das_new} new so far")

        # Stop if we've consumed all pages
        total_count = data.get("TotalCount", 0)
        if page * PAGE_SIZE >= total_count or len(applications) < PAGE_SIZE:
            break
        page += 1

    error_str = "; ".join(errors) if errors else None
    log_scraper_end(run_id, das_scraped, das_new, matches_created, error_str)
    log_health(
        check_name="nsw_eplanning",
        status="error" if errors and das_new == 0 else "ok",
        message=error_str or f"Scraped {das_new} new DAs",
    )

    log.info(f"[NSW] Done: {das_scraped} scraped, {das_new} new, {matches_created} matches, {len(errors)} errors")
    return {
        "das_scraped": das_scraped,
        "das_new": das_new,
        "matches_created": matches_created,
        "errors": errors,
    }


if __name__ == "__main__":
    import argparse
    from dotenv import load_dotenv
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

    parser = argparse.ArgumentParser(description="Scrape NSW ePlanning DAs")
    parser.add_argument("--days-back", type=int, default=1, help="How many days back to fetch")
    args = parser.parse_args()
    run(days_back=args.days_back)
