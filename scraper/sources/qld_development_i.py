"""
qld_development_i.py - Queensland DA scraper via development.i portal.

Portal: https://development.i.qld.gov.au/
This is the QLD Government's state-wide development applications register.
It provides a JSON search API that this scraper targets directly.

If the API returns 4xx, the scraper falls back to Playwright DOM scraping.

On first run, check logs for "Captured JSON" or "API hit" messages.
If neither, the selector or URL may have changed — inspect the portal's
network tab and update the API_URL constant below.
"""

import asyncio
import os
import sys
import re
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
    get_suburb_coords,
    set_da_coords,
)
from shared.classifier import classify_project_type
from shared.matcher import match_da_to_builders

log = logging.getLogger(__name__)

SOURCE = "qld_development_i"
# QLD has multiple DA portals; try each in order.
# development.i.qld.gov.au → QLD Development Assessment portal
# developmenti.com.au → private aggregator (may have better data)
# das.dsdmip.qld.gov.au → DAS (older QLD system)
PORTAL_URLS = [
    "https://www.developmenti.com.au",
    "https://development.i.qld.gov.au",
    "https://das.dsdmip.qld.gov.au",
]
PORTAL_URL = PORTAL_URLS[0]

API_CANDIDATES = []
for _base in PORTAL_URLS:
    API_CANDIDATES += [
        f"{_base}/api/v1/applications",
        f"{_base}/api/applications",
        f"{_base}/resources/applications",
    ]

SEARCH_PATHS = ["/search", "/applications/search", "/da/search"]
PAGE_SIZE = 100
MAX_RETRIES = 2

HEADERS = {
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-AU,en;q=0.9",
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": PORTAL_URL,
}


def _try_api(date_from: str, date_to: str) -> list[dict]:
    """Attempt REST API calls to development.i. Returns list of raw application dicts."""
    # Common query parameter patterns for QLD development.i
    param_variants = [
        {"lodgementDateFrom": date_from, "lodgementDateTo": date_to, "page": 1, "perPage": PAGE_SIZE},
        {"fromDate": date_from, "toDate": date_to, "page": 1, "per_page": PAGE_SIZE},
        {"dateFrom": date_from, "dateTo": date_to, "pageNumber": 1, "pageSize": PAGE_SIZE},
        {"lodgement_date_from": date_from, "lodgement_date_to": date_to, "page": 1, "limit": PAGE_SIZE},
    ]

    for url in API_CANDIDATES:
        for params in param_variants:
            try:
                resp = requests.get(url, headers=HEADERS, params=params, timeout=30)
                if resp.status_code == 200:
                    data = resp.json()
                    # data could be a list, or a dict with a results key
                    if isinstance(data, list) and data:
                        log.info(f"[QLD] API hit: {url} returned {len(data)} items")
                        return data
                    elif isinstance(data, dict):
                        for key in ("applications", "results", "data", "items", "records"):
                            if key in data and isinstance(data[key], list):
                                log.info(f"[QLD] API hit: {url}.{key} returned {len(data[key])} items")
                                return data[key]
                else:
                    log.debug(f"[QLD] API {url} params {list(params.keys())[:2]}: HTTP {resp.status_code}")
            except Exception as e:
                log.debug(f"[QLD] API {url} error: {e}")

    return []


async def _playwright_scrape(date_from: str, date_to: str) -> list[dict]:
    """Fall back to Playwright if REST API fails."""
    from playwright.async_api import async_playwright

    results = []
    captured_json = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            locale="en-AU",
        )
        page = await context.new_page()

        async def on_response(response):
            ct = response.headers.get("content-type", "")
            if "json" in ct and "development.i.qld" in response.url:
                try:
                    body = await response.json()
                    if isinstance(body, list) and body:
                        captured_json.extend(body)
                    elif isinstance(body, dict):
                        for key in ("applications", "results", "data", "items"):
                            if key in body and isinstance(body[key], list):
                                captured_json.extend(body[key])
                                break
                    log.info(f"[QLD] Playwright intercepted JSON: {len(captured_json)} records from {response.url}")
                except Exception:
                    pass

        page.on("response", on_response)

        # Try each portal URL in turn
        loaded = False
        for base_url in PORTAL_URLS:
            for path in SEARCH_PATHS:
                try:
                    await page.goto(f"{base_url}{path}", wait_until="networkidle", timeout=30000)
                    loaded = True
                    log.info(f"[QLD] Loaded {base_url}{path}")
                    break
                except Exception:
                    pass
            if loaded:
                break

        if not loaded:
            await browser.close()
            return results

        try:

            # Fill date range
            for sel in ["input[id*='dateFrom']", "input[placeholder*='date']", "input[type='date']"]:
                try:
                    await page.fill(sel, date_from, timeout=3000)
                    break
                except Exception:
                    pass

            for sel in ["input[id*='dateTo']", "input[placeholder*='to']"]:
                try:
                    await page.fill(sel, date_to, timeout=3000)
                    break
                except Exception:
                    pass

            for sel in ["button[type='submit']", "button:has-text('Search')", ".search-button"]:
                try:
                    await page.click(sel, timeout=3000)
                    await page.wait_for_load_state("networkidle", timeout=20000)
                    break
                except Exception:
                    pass

            import asyncio as aio
            await aio.sleep(3)

            if captured_json:
                await browser.close()
                return captured_json

            # DOM extraction as last resort
            rows = await page.query_selector_all("table tbody tr, .application-item, [class*='da-row']")
            log.info(f"[QLD] Playwright DOM: {len(rows)} rows")
            for row in rows:
                try:
                    cells = await row.query_selector_all("td")
                    texts = [await c.inner_text() for c in cells]
                    if len(texts) >= 3:
                        results.append({"_cells": texts})
                except Exception:
                    pass

        except Exception as e:
            log.error(f"[QLD] Playwright inner error: {e}")

        await browser.close()

    return captured_json if captured_json else results


def _parse_qld(raw) -> dict | None:
    """Map a QLD development.i record to our DA schema."""
    if isinstance(raw, dict) and "_cells" in raw:
        return _parse_qld_dom(raw["_cells"])

    if not isinstance(raw, dict):
        return None

    # JSON field mapping — adjust field names after first run if needed
    ref = str(
        raw.get("applicationNumber") or raw.get("referenceNumber") or
        raw.get("lodgementNumber") or raw.get("id") or ""
    )
    if not ref or len(ref) < 3:
        return None

    address = str(raw.get("address") or raw.get("siteAddress") or raw.get("propertyAddress") or "")
    council = str(raw.get("localGovernment") or raw.get("council") or raw.get("lga") or "")
    description = str(raw.get("description") or raw.get("proposedDevelopment") or raw.get("summary") or "")
    date_raw = str(raw.get("lodgementDate") or raw.get("dateReceived") or raw.get("lodgedDate") or "")

    suburb, postcode, street = _parse_qld_address(address)
    if not suburb:
        return None

    return {
        "source": SOURCE,
        "source_id": ref.replace("/", "-").replace(" ", "-"),
        "source_url": f"{PORTAL_URL}/application/{ref}",
        "council": council or None,
        "state": "QLD",
        "suburb": suburb,
        "postcode": postcode,
        "street_address": street,
        "da_number": ref,
        "description": description or None,
        "lodged_date": _parse_date(date_raw),
        "determination_date": None,
        "raw_data": raw,
    }


def _parse_qld_dom(cells: list[str]) -> dict | None:
    # Typical QLD table: [Reference, Address, Description, Status, Date]
    ref = cells[0].strip() if cells else ""
    if not ref or len(ref) < 3:
        return None
    address = cells[1].strip() if len(cells) > 1 else ""
    description = cells[2].strip() if len(cells) > 2 else ""
    date_raw = cells[4].strip() if len(cells) > 4 else (cells[3].strip() if len(cells) > 3 else "")
    suburb, postcode, street = _parse_qld_address(address)
    if not suburb:
        return None
    return {
        "source": SOURCE,
        "source_id": ref.replace("/", "-").replace(" ", "-"),
        "source_url": f"{PORTAL_URL}/application/{ref}",
        "council": None,
        "state": "QLD",
        "suburb": suburb,
        "postcode": postcode,
        "street_address": street,
        "da_number": ref,
        "description": description or None,
        "lodged_date": _parse_date(date_raw),
        "determination_date": None,
        "raw_data": {"_cells": cells},
    }


def _parse_qld_address(address: str) -> tuple[str | None, str | None, str | None]:
    if not address:
        return None, None, None
    postcode_match = re.search(r"\b(4\d{3})\b", address)
    postcode = postcode_match.group(1) if postcode_match else None
    suburb_match = re.search(r",\s*([A-Za-z][A-Za-z\s]+?)(?:\s+QLD)?\s+4\d{3}", address)
    if suburb_match:
        suburb = suburb_match.group(1).strip().title()
    elif "," in address:
        parts = address.rsplit(",", 1)
        raw = parts[-1].strip().replace("QLD", "").strip()
        suburb = re.sub(r"\d{4}", "", raw).strip().title() or None
    else:
        suburb = None
    street = address.split(",")[0].strip() if "," in address else address
    return suburb, postcode, street


def _parse_date(raw: str) -> str | None:
    if not raw:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(raw.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def run(days_back: int = 1) -> dict:
    now = datetime.now(timezone.utc)
    date_to = now.strftime("%Y-%m-%d")
    date_from = (now - timedelta(days=days_back)).strftime("%Y-%m-%d")
    log.info(f"[QLD] Scraping {date_from} → {date_to}")
    run_id = log_scraper_start(SOURCE)

    das_scraped = 0
    das_new = 0
    matches_created = 0
    errors = []

    # Try REST API first
    raw_items = _try_api(date_from, date_to)

    # Fall back to Playwright
    if not raw_items:
        log.info("[QLD] REST API returned nothing — falling back to Playwright")
        try:
            raw_items = asyncio.run(_playwright_scrape(date_from, date_to))
        except Exception as e:
            errors.append(f"Playwright error: {e}")
            log.error(f"[QLD] Playwright failed: {e}")

    log.info(f"[QLD] Processing {len(raw_items)} raw items")

    for raw in raw_items:
        das_scraped += 1
        parsed = _parse_qld(raw)
        if not parsed:
            continue
        if da_exists(SOURCE, parsed["source_id"]):
            continue

        if parsed.get("description"):
            classification = classify_project_type(parsed["description"])
            parsed["project_type"] = classification["project_type"]
            parsed["project_type_confidence"] = classification["confidence"]
            if parsed.get("estimated_value_aud") is None:
                parsed["estimated_value_aud"] = classification.get("estimated_value_aud")
        else:
            parsed["project_type"] = "other"
            parsed["project_type_confidence"] = 0.0

        da_id = upsert_da(parsed)
        if not da_id:
            errors.append(f"Failed to upsert DA {parsed['source_id']}")
            continue

        das_new += 1
        coords = get_suburb_coords(parsed["suburb"], parsed["state"])
        if coords:
            set_da_coords(da_id, coords[0], coords[1])

        increment_suburb_da_count(parsed["suburb"], parsed["state"], parsed.get("postcode"))
        increment_council_da_count(parsed.get("council") or "", parsed["state"])
        increment_postcode_da_count(parsed.get("postcode") or "", parsed["state"], parsed["suburb"])

        new_matches = match_da_to_builders(da_id, parsed, trigger_stage="lodgement")
        matches_created += new_matches

    error_str = "; ".join(errors) if errors else None
    log_scraper_end(run_id, das_scraped, das_new, matches_created, error_str)
    log_health(
        check_name="qld_development_i",
        status="error" if errors and das_new == 0 else "ok",
        message=error_str or f"Scraped {das_new} new DAs",
    )
    log.info(f"[QLD] Done: {das_scraped} scraped, {das_new} new, {matches_created} matches")
    return {"das_scraped": das_scraped, "das_new": das_new, "matches_created": matches_created, "errors": errors}


if __name__ == "__main__":
    import argparse
    from dotenv import load_dotenv
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    parser = argparse.ArgumentParser()
    parser.add_argument("--days-back", type=int, default=1)
    args = parser.parse_args()
    run(days_back=args.days_back)
