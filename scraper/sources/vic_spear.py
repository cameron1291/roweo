"""
vic_spear.py - Playwright scraper for Victoria planning permits via SPEAR portal.

SPEAR (Streamlined Planning through Electronic Applications and Referrals):
  https://www.spear.land.vic.gov.au/spear/pages/public/register.jsp

SPEAR is the primary lodgement system for planning permits in Victoria.
The public register lists recently lodged applications searchable by date.

On first run, check the logs — if SPEAR structure changed, update the selectors
in _scrape_register(). The network interception in _try_api() may catch a JSON
endpoint automatically without needing DOM parsing.
"""

import asyncio
import os
import sys
import re
import logging
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

SOURCE = "vic_spear"
SPEAR_URL = "https://www.spear.land.vic.gov.au/spear/pages/public/register.jsp"
# Data.Vic CKAN API — planning permit activity dataset
# resource_id may change; check data.vic.gov.au/dataset/planning-permit-activity if broken
DATA_VIC_API = "https://data.vic.gov.au/data/api/3/action/datastore_search"
DATA_VIC_RESOURCE = "3e8da1e6-b177-4d05-9ea1-4c29aaacd421"
MAX_RETRIES = 2


def _try_data_vic_api(date_from_iso: str) -> list[dict]:
    """Try the Data.Vic CKAN API for planning permit activity."""
    import requests as req
    try:
        resp = req.get(
            DATA_VIC_API,
            params={
                "resource_id": DATA_VIC_RESOURCE,
                "filters": f'{{"Lodgement_Date":"{date_from_iso}"}}',
                "limit": 500,
            },
            timeout=20,
        )
        if resp.status_code == 200:
            data = resp.json()
            records = data.get("result", {}).get("records", [])
            if records:
                log.info(f"[VIC] Data.Vic API: {len(records)} records")
                return records
    except Exception as e:
        log.debug(f"[VIC] Data.Vic API error: {e}")
    return []


async def _scrape_register(page, date_from: str, date_to: str) -> list[dict]:
    """Navigate to SPEAR public register and extract planning permit rows."""
    results = []
    captured_json = []

    # Intercept JSON API responses — SPEAR may XHR its data
    async def handle_response(response):
        ct = response.headers.get("content-type", "")
        if "json" in ct and "spear" in response.url:
            try:
                body = await response.json()
                if isinstance(body, (list, dict)):
                    captured_json.append(body)
                    log.info(f"[VIC] Captured JSON from {response.url}: {len(str(body))} chars")
            except Exception:
                pass

    page.on("response", handle_response)

    try:
        await page.goto(SPEAR_URL, wait_until="networkidle", timeout=45000)
        log.info(f"[VIC] Loaded SPEAR register page")

        # Fill date range if filter inputs are visible
        for date_sel in ["input[id*='dateFrom']", "input[name*='dateFrom']", "input[placeholder*='From']"]:
            try:
                await page.fill(date_sel, date_from, timeout=3000)
                log.info(f"[VIC] Filled date_from with selector {date_sel}")
                break
            except Exception:
                pass

        for date_sel in ["input[id*='dateTo']", "input[name*='dateTo']", "input[placeholder*='To']"]:
            try:
                await page.fill(date_sel, date_to, timeout=3000)
                log.info(f"[VIC] Filled date_to with selector {date_sel}")
                break
            except Exception:
                pass

        # Submit search
        for btn_sel in ["button[type='submit']", "input[type='submit']", "button:has-text('Search')", ".search-btn"]:
            try:
                await page.click(btn_sel, timeout=3000)
                await page.wait_for_load_state("networkidle", timeout=20000)
                log.info(f"[VIC] Clicked search with {btn_sel}")
                break
            except Exception:
                pass

        # If API interception got JSON, use it
        if captured_json:
            log.info(f"[VIC] Using intercepted JSON ({len(captured_json)} responses)")
            return captured_json

        # Wait longer for JS-rendered tables
        import asyncio as aio
        await aio.sleep(4)

        # Fall back to DOM extraction — try many selector patterns
        rows = await page.query_selector_all(
            "table tbody tr, .application-row, tr[class*='permit'], tr[data-id], "
            "[class*='register'] tr, .permit-row, .application-list-item"
        )
        log.info(f"[VIC] DOM: found {len(rows)} rows")

        for row in rows:
            try:
                cells = await row.query_selector_all("td")
                texts = [await c.inner_text() for c in cells]
                if len(texts) < 3:
                    continue
                results.append({
                    "_cells": texts,
                    "_html": await row.inner_html(),
                })
            except Exception as e:
                log.debug(f"[VIC] Row parse error: {e}")

    except Exception as e:
        log.error(f"[VIC] SPEAR scrape error: {e}")

    return results


def _parse_vic_row(raw) -> dict | None:
    """Parse a SPEAR row or JSON object into our DA schema."""
    # If raw is a dict (from JSON interception), map known fields
    if isinstance(raw, dict):
        return _parse_vic_json(raw)
    if isinstance(raw, list):
        # List of dicts from a JSON array
        return None  # handled at caller level

    # DOM row: raw is {"_cells": [...], "_html": "..."}
    cells = raw.get("_cells", [])
    if not cells:
        return None

    # SPEAR table columns are typically:
    # [Reference, Council, Address, Description, Status, Lodged Date]
    ref = cells[0].strip() if len(cells) > 0 else ""
    if not ref or len(ref) < 3:
        return None

    council = cells[1].strip() if len(cells) > 1 else ""
    address = cells[2].strip() if len(cells) > 2 else ""
    description = cells[3].strip() if len(cells) > 3 else ""
    date_text = cells[5].strip() if len(cells) > 5 else (cells[4].strip() if len(cells) > 4 else "")

    suburb, postcode, street = _parse_vic_address(address)
    if not suburb:
        return None

    lodged_date = _parse_date(date_text)

    return {
        "source": SOURCE,
        "source_id": ref.replace("/", "-").replace(" ", "-"),
        "source_url": f"https://www.spear.land.vic.gov.au/spear/pages/public/register.jsp?ref={ref}",
        "council": council or None,
        "state": "VIC",
        "suburb": suburb,
        "postcode": postcode,
        "street_address": street,
        "da_number": ref,
        "description": description or None,
        "lodged_date": lodged_date,
        "determination_date": None,
        "raw_data": raw,
    }


def _parse_vic_json(obj: dict) -> dict | None:
    """Parse a JSON object from SPEAR API interception."""
    # Try common field names; adjust after first run if needed
    ref = str(obj.get("referenceNo") or obj.get("reference") or obj.get("permitNo") or obj.get("id") or "")
    if not ref or len(ref) < 3:
        return None

    address = str(obj.get("address") or obj.get("propertyAddress") or "")
    council = str(obj.get("council") or obj.get("localCouncil") or obj.get("lga") or "")
    description = str(obj.get("description") or obj.get("proposedUse") or obj.get("summary") or "")
    date_raw = str(obj.get("lodgementDate") or obj.get("lodgedDate") or obj.get("dateReceived") or "")

    suburb, postcode, street = _parse_vic_address(address)
    if not suburb:
        return None

    return {
        "source": SOURCE,
        "source_id": ref.replace("/", "-").replace(" ", "-"),
        "source_url": f"https://www.spear.land.vic.gov.au/spear/pages/public/register.jsp?ref={ref}",
        "council": council or None,
        "state": "VIC",
        "suburb": suburb,
        "postcode": postcode,
        "street_address": street,
        "da_number": ref,
        "description": description or None,
        "lodged_date": _parse_date(date_raw),
        "determination_date": None,
        "raw_data": obj,
    }


def _parse_vic_address(address: str) -> tuple[str | None, str | None, str | None]:
    """Extract suburb, postcode, street from a VIC address string."""
    if not address:
        return None, None, None

    postcode_match = re.search(r"\b(3\d{3})\b", address)
    postcode = postcode_match.group(1) if postcode_match else None

    # "12 Smith St, Fitzroy VIC 3065" → suburb=Fitzroy
    suburb_match = re.search(r",\s*([A-Za-z][A-Za-z\s]+?)(?:\s+VIC)?\s+3\d{3}", address)
    if suburb_match:
        suburb = suburb_match.group(1).strip().title()
    elif "," in address:
        parts = address.rsplit(",", 1)
        raw = parts[-1].strip().replace("VIC", "").strip()
        suburb = re.sub(r"\d{4}", "", raw).strip().title() or None
    else:
        suburb = None

    street = address.split(",")[0].strip() if "," in address else address.strip()
    return suburb, postcode, street


def _parse_date(raw: str) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


async def _run_async(days_back: int = 1) -> dict:
    from playwright.async_api import async_playwright

    now = datetime.now(timezone.utc)
    date_to = now.strftime("%d/%m/%Y")
    date_from = (now - timedelta(days=days_back)).strftime("%d/%m/%Y")
    date_from_iso = (now - timedelta(days=days_back)).strftime("%Y-%m-%d")
    log.info(f"[VIC] Scraping {date_from} → {date_to}")
    run_id = log_scraper_start(SOURCE)

    das_scraped = 0
    das_new = 0
    matches_created = 0
    errors = []

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            # Try Data.Vic CKAN API first (no browser needed)
            raw_items = _try_data_vic_api(date_from_iso)

            # Fall back to SPEAR Playwright if API returned nothing
            if not raw_items:
                async with async_playwright() as p:
                    browser = await p.chromium.launch(headless=True)
                    context = await browser.new_context(
                        user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                        locale="en-AU",
                    )
                    page = await context.new_page()
                    raw_items = await _scrape_register(page, date_from, date_to)
                    await browser.close()

            # raw_items may be list-of-dicts (JSON) or list-of-dom-rows
            # Handle a captured JSON array (single dict with a list value)
            flat_items = []
            for item in raw_items:
                if isinstance(item, list):
                    flat_items.extend(item)
                elif isinstance(item, dict):
                    # Could be a wrapper like {"applications": [...]}
                    for v in item.values():
                        if isinstance(v, list):
                            flat_items.extend(v)
                            break
                    else:
                        flat_items.append(item)

            log.info(f"[VIC] Processing {len(flat_items)} raw items")

            for raw in flat_items:
                das_scraped += 1
                parsed = _parse_vic_row(raw) if isinstance(raw, dict) and "_cells" in raw else _parse_vic_json(raw) if isinstance(raw, dict) else None
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

            break
        except Exception as e:
            log.error(f"[VIC] Attempt {attempt} failed: {e}")
            errors.append(str(e))
            if attempt < MAX_RETRIES:
                import time; time.sleep(30)

    error_str = "; ".join(errors) if errors else None
    log_scraper_end(run_id, das_scraped, das_new, matches_created, error_str)
    log_health(
        check_name="vic_spear",
        status="error" if errors and das_new == 0 else "ok",
        message=error_str or f"Scraped {das_new} new DAs",
    )
    log.info(f"[VIC] Done: {das_scraped} scraped, {das_new} new, {matches_created} matches")
    return {"das_scraped": das_scraped, "das_new": das_new, "matches_created": matches_created, "errors": errors}


def run(days_back: int = 1) -> dict:
    return asyncio.run(_run_async(days_back=days_back))


if __name__ == "__main__":
    import argparse
    from dotenv import load_dotenv
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    parser = argparse.ArgumentParser()
    parser.add_argument("--days-back", type=int, default=1)
    args = parser.parse_args()
    run(days_back=args.days_back)
