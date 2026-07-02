"""
wa_councils.py - Western Australia DA scraper targeting the state ePlanning portal
and major Perth metro council planning registers.

Primary source: MyDevelopment WA ePlanning portal
  https://www.mydevelopment.com.au/

Secondary: Direct council ePlanning portals for the top-volume councils.
  Councils scraped (in order of DA volume):
    - City of Perth
    - City of Stirling
    - City of Fremantle
    - City of Joondalup
    - City of Swan
    - City of Wanneroo

Most WA councils use the "Pathway" ePlanning system by Civica, which has a
consistent table-based DA register format. The _scrape_council() function
handles this consistent format.

On first run: check which councils returned rows in the logs. Update
COUNCILS list if any council has migrated to a different system.
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

SOURCE = "wa_councils"
MAX_RETRIES = 2

# Council name → DA search URL
# Many WA councils use Pathway ePlanning at eplan.{council}.wa.gov.au
# or similar. Check the council website if a URL stops working.
COUNCILS = {
    "City of Perth": "https://eplan.perth.wa.gov.au/ePathway/Production/Web/GeneralEnquiry/EnquiryLists.aspx?NodeName=DevelopmentApplications",
    "City of Stirling": "https://eplan.stirling.wa.gov.au/ePathway/Production/Web/GeneralEnquiry/EnquiryLists.aspx?NodeName=DevelopmentApplications",
    "City of Fremantle": "https://eplan.fremantle.wa.gov.au/ePathway/Production/Web/GeneralEnquiry/EnquiryLists.aspx?NodeName=DevelopmentApplications",
    "City of Joondalup": "https://eplan.joondalup.wa.gov.au/ePathway/Production/Web/GeneralEnquiry/EnquiryLists.aspx?NodeName=DevelopmentApplications",
    "City of Swan": "https://eplan.swan.wa.gov.au/ePathway/Production/Web/GeneralEnquiry/EnquiryLists.aspx?NodeName=DevelopmentApplications",
    "City of Wanneroo": "https://eplan.wanneroo.wa.gov.au/ePathway/Production/Web/GeneralEnquiry/EnquiryLists.aspx?NodeName=DevelopmentApplications",
}

# MyDevelopment WA — covers Perth metro area, worth trying as a single source
MY_DEV_URL = "https://www.mydevelopment.com.au/Application/Search"


async def _scrape_my_development(page, date_from: str, date_to: str) -> list[dict]:
    """Attempt to scrape MyDevelopment WA ePlanning portal."""
    captured = []

    async def on_response(response):
        ct = response.headers.get("content-type", "")
        if "json" in ct and "mydevelopment.com.au" in response.url:
            try:
                body = await response.json()
                if isinstance(body, list) and body:
                    captured.extend(body)
                elif isinstance(body, dict):
                    for key in ("applications", "results", "data", "items"):
                        if key in body and isinstance(body[key], list):
                            captured.extend(body[key])
                            break
                log.info(f"[WA-MyDev] Captured {len(captured)} records from {response.url}")
            except Exception:
                pass

    page.on("response", on_response)

    try:
        await page.goto(MY_DEV_URL, wait_until="networkidle", timeout=45000)
        log.info("[WA-MyDev] Loaded")

        # Fill date range
        for sel, val in [
            (["input[id*='dateFrom']", "input[name*='dateFrom']", "[placeholder*='From']"], date_from),
            (["input[id*='dateTo']", "input[name*='dateTo']", "[placeholder*='To']"], date_to),
        ]:
            for s in sel:
                try:
                    await page.fill(s, val, timeout=3000)
                    break
                except Exception:
                    pass

        for sel in ["button[type='submit']", "button:has-text('Search')", ".search-btn", "input[value='Search']"]:
            try:
                await page.click(sel, timeout=3000)
                await page.wait_for_load_state("networkidle", timeout=20000)
                break
            except Exception:
                pass

        import asyncio as aio
        await aio.sleep(2)

    except Exception as e:
        log.warning(f"[WA-MyDev] Error: {e}")

    return captured


async def _scrape_council(page, council_name: str, url: str, date_from: str, date_to: str) -> list[dict]:
    """Scrape a Pathway ePlanning council portal."""
    results = []
    try:
        await page.goto(url, wait_until="networkidle", timeout=30000)
        log.info(f"[WA-{council_name}] Loaded ePlanning register")

        # Pathway ePlanning: date range search
        for sel, val in [
            (["input[id*='DateFrom']", "input[id*='dateFrom']", "input[name*='LodgedFrom']"], date_from),
            (["input[id*='DateTo']", "input[id*='dateTo']", "input[name*='LodgedTo']"], date_to),
        ]:
            for s in sel:
                try:
                    await page.fill(s, val, timeout=3000)
                    break
                except Exception:
                    pass

        # Submit search in Pathway system
        for sel in ["input[value='Search']", "button:has-text('Search')", "input[type='submit']"]:
            try:
                await page.click(sel, timeout=3000)
                await page.wait_for_load_state("networkidle", timeout=20000)
                break
            except Exception:
                pass

        # Pathway renders a GridView table with class "rgMasterTable" or similar
        rows = await page.query_selector_all(
            "table.rgMasterTable tbody tr, table[id*='Grid'] tbody tr, "
            ".k-grid-content table tbody tr, table tbody tr[class*='Row']"
        )
        log.info(f"[WA-{council_name}] Found {len(rows)} table rows")

        for row in rows:
            try:
                cells = await row.query_selector_all("td")
                texts = [await c.inner_text() for c in cells]
                if len(texts) < 3:
                    continue
                texts = [t.strip() for t in texts if t.strip()]
                if texts:
                    results.append({"_cells": texts, "_council": council_name})
            except Exception as e:
                log.debug(f"[WA-{council_name}] Row error: {e}")

    except Exception as e:
        log.warning(f"[WA-{council_name}] Error: {e}")

    return results


async def _run_async(days_back: int = 1) -> list[dict]:
    from playwright.async_api import async_playwright

    now = datetime.now(timezone.utc)
    date_to = now.strftime("%d/%m/%Y")
    date_from = (now - timedelta(days=days_back)).strftime("%d/%m/%Y")

    all_items = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            locale="en-AU",
        )

        # Try MyDevelopment WA first (covers many councils)
        page = await context.new_page()
        my_dev_results = await _scrape_my_development(page, date_from, date_to)
        await page.close()
        if my_dev_results:
            all_items.extend(my_dev_results)
            log.info(f"[WA] MyDevelopment: {len(my_dev_results)} items")
        else:
            log.info("[WA] MyDevelopment returned nothing — trying individual councils")
            for council_name, url in COUNCILS.items():
                page = await context.new_page()
                rows = await _scrape_council(page, council_name, url, date_from, date_to)
                await page.close()
                all_items.extend(rows)
                log.info(f"[WA] {council_name}: {len(rows)} rows")

        await browser.close()

    return all_items


def _parse_wa(raw) -> dict | None:
    if isinstance(raw, dict) and "_cells" in raw:
        return _parse_wa_dom(raw["_cells"], raw.get("_council", ""))
    if not isinstance(raw, dict):
        return None

    ref = str(raw.get("applicationNumber") or raw.get("referenceNumber") or raw.get("id") or "")
    if not ref or len(ref) < 3:
        return None

    address = str(raw.get("address") or raw.get("siteAddress") or "")
    council = str(raw.get("council") or raw.get("localGovernment") or raw.get("lga") or "")
    description = str(raw.get("description") or raw.get("proposedDevelopment") or "")
    date_raw = str(raw.get("lodgementDate") or raw.get("dateReceived") or "")

    suburb, postcode, street = _parse_wa_address(address)
    if not suburb:
        return None

    return {
        "source": SOURCE,
        "source_id": ref.replace("/", "-").replace(" ", "-"),
        "source_url": f"https://www.mydevelopment.com.au/Application/Details/{ref}",
        "council": council or None,
        "state": "WA",
        "suburb": suburb,
        "postcode": postcode,
        "street_address": street,
        "da_number": ref,
        "description": description or None,
        "lodged_date": _parse_date(date_raw),
        "determination_date": None,
        "raw_data": raw,
    }


def _parse_wa_dom(cells: list[str], council: str = "") -> dict | None:
    # Pathway columns: [DA Number, Address, Description, Status, Date]
    ref = cells[0].strip() if cells else ""
    if not ref or len(ref) < 3:
        return None
    address = cells[1].strip() if len(cells) > 1 else ""
    description = cells[2].strip() if len(cells) > 2 else ""
    date_raw = cells[4].strip() if len(cells) > 4 else (cells[3].strip() if len(cells) > 3 else "")
    suburb, postcode, street = _parse_wa_address(address)
    if not suburb:
        return None
    return {
        "source": SOURCE,
        "source_id": ref.replace("/", "-").replace(" ", "-"),
        "source_url": f"https://www.mydevelopment.com.au/Application/Details/{ref}",
        "council": council or None,
        "state": "WA",
        "suburb": suburb,
        "postcode": postcode,
        "street_address": street,
        "da_number": ref,
        "description": description or None,
        "lodged_date": _parse_date(date_raw),
        "determination_date": None,
        "raw_data": {"_cells": cells, "_council": council},
    }


def _parse_wa_address(address: str) -> tuple[str | None, str | None, str | None]:
    if not address:
        return None, None, None
    postcode_match = re.search(r"\b(6\d{3})\b", address)
    postcode = postcode_match.group(1) if postcode_match else None
    suburb_match = re.search(r",\s*([A-Za-z][A-Za-z\s]+?)(?:\s+WA)?\s+6\d{3}", address)
    if suburb_match:
        suburb = suburb_match.group(1).strip().title()
    elif "," in address:
        parts = address.rsplit(",", 1)
        raw = parts[-1].strip().replace("WA", "").strip()
        suburb = re.sub(r"\d{4}", "", raw).strip().title() or None
    else:
        suburb = None
    street = address.split(",")[0].strip() if "," in address else address
    return suburb, postcode, street


def _parse_date(raw: str) -> str | None:
    if not raw:
        return None
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y", "%d %b %Y"):
        try:
            return datetime.strptime(raw.strip(), fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def run(days_back: int = 1) -> dict:
    log.info(f"[WA] Starting scrape ({days_back} days back)")
    run_id = log_scraper_start(SOURCE)
    das_scraped = 0
    das_new = 0
    matches_created = 0
    errors = []

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            raw_items = asyncio.run(_run_async(days_back))
            log.info(f"[WA] Processing {len(raw_items)} raw items")
            for raw in raw_items:
                das_scraped += 1
                parsed = _parse_wa(raw)
                if not parsed:
                    continue
                if da_exists(SOURCE, parsed["source_id"]):
                    continue

                if parsed.get("description"):
                    cls = classify_project_type(parsed["description"])
                    parsed["project_type"] = cls["project_type"]
                    parsed["project_type_confidence"] = cls["confidence"]
                    if not parsed.get("estimated_value_aud"):
                        parsed["estimated_value_aud"] = cls.get("estimated_value_aud")
                else:
                    parsed["project_type"] = "other"
                    parsed["project_type_confidence"] = 0.0

                da_id = upsert_da(parsed)
                if not da_id:
                    errors.append(f"Failed to upsert {parsed['source_id']}")
                    continue

                das_new += 1
                coords = get_suburb_coords(parsed["suburb"], parsed["state"])
                if coords:
                    set_da_coords(da_id, coords[0], coords[1])
                increment_suburb_da_count(parsed["suburb"], parsed["state"], parsed.get("postcode"))
                increment_council_da_count(parsed.get("council") or "", parsed["state"])
                increment_postcode_da_count(parsed.get("postcode") or "", parsed["state"], parsed["suburb"])
                matches_created += match_da_to_builders(da_id, parsed, trigger_stage="lodgement")
            break
        except Exception as e:
            log.error(f"[WA] Attempt {attempt} error: {e}")
            errors.append(str(e))
            if attempt < MAX_RETRIES:
                import time; time.sleep(30)

    error_str = "; ".join(errors) if errors else None
    log_scraper_end(run_id, das_scraped, das_new, matches_created, error_str)
    log_health("wa_councils", "error" if errors and das_new == 0 else "ok", error_str or f"{das_new} new DAs")
    log.info(f"[WA] Done: {das_scraped} scraped, {das_new} new, {matches_created} matches")
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
