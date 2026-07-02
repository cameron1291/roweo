"""
tas_councils.py - Tasmania DA scraper targeting major council ePlanning portals.

Councils covered (highest DA volume in TAS):
  - Hobart City Council
  - Launceston City Council
  - Glenorchy City Council
  - Clarence City Council

Most Tasmanian councils use eplanning.tas.gov.au (statewide ePlanning system)
or the Pathway ePlanning system by Civica.

Primary target: ePlanning Tasmania (https://eplan.tas.gov.au)
This is the statewide system covering most TAS councils under a single URL.

On first run: check logs for row counts per council.
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

SOURCE = "tas_councils"
MAX_RETRIES = 2

# TAS ePlanning — statewide system
EPLAN_TAS_URL = "https://eplan.tas.gov.au/ePathway/Production/Web/GeneralEnquiry/EnquiryLists.aspx?NodeName=DevelopmentApplications"

# Fallback: individual council portals
COUNCILS = {
    "Hobart City Council": "https://www.hobartcity.com.au/development-and-building/planning-and-development/planning-applications",
    "Launceston City Council": "https://www.launceston.tas.gov.au/building-and-development/development-applications",
    "Glenorchy City Council": "https://www.gcc.tas.gov.au/council-services/building-and-development/development-applications/",
    "Clarence City Council": "https://www.ccc.tas.gov.au/building-and-development/applications/",
}


async def _scrape_eplan_tas(date_from: str, date_to: str) -> list[dict]:
    """Scrape the statewide TAS ePlanning (Pathway-based) system."""
    from playwright.async_api import async_playwright
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            locale="en-AU",
        )
        page = await context.new_page()

        try:
            await page.goto(EPLAN_TAS_URL, wait_until="networkidle", timeout=45000)
            log.info("[TAS] Loaded ePlanning Tasmania")

            # Pathway ePlanning date inputs
            for sel, val in [
                (["input[id*='DateFrom']", "input[name*='LodgedFrom']", "input[id*='dateFrom']"], date_from),
                (["input[id*='DateTo']", "input[name*='LodgedTo']", "input[id*='dateTo']"], date_to),
            ]:
                for s in sel:
                    try:
                        await page.fill(s, val, timeout=3000)
                        break
                    except Exception:
                        pass

            for sel in ["input[value='Search']", "button:has-text('Search')", "input[type='submit']"]:
                try:
                    await page.click(sel, timeout=3000)
                    await page.wait_for_load_state("networkidle", timeout=20000)
                    break
                except Exception:
                    pass

            rows = await page.query_selector_all(
                "table.rgMasterTable tbody tr, table[id*='Grid'] tbody tr, "
                ".k-grid-content table tbody tr, table tbody tr[class*='Row']"
            )
            log.info(f"[TAS] ePlanning: {len(rows)} rows")
            for row in rows:
                try:
                    cells = await row.query_selector_all("td")
                    texts = [await c.inner_text() for c in cells]
                    texts = [t.strip() for t in texts if t.strip()]
                    if len(texts) >= 3:
                        results.append({"_cells": texts, "_council": "ePlanning TAS"})
                except Exception as e:
                    log.debug(f"[TAS] Row error: {e}")

        except Exception as e:
            log.warning(f"[TAS] ePlanning error: {e}")

        await browser.close()

    return results


async def _scrape_council_site(council_name: str, url: str, date_from: str, date_to: str) -> list[dict]:
    """Generic Playwright scraper for individual TAS council sites."""
    from playwright.async_api import async_playwright
    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            locale="en-AU",
        )
        page = await context.new_page()

        try:
            await page.goto(url, wait_until="networkidle", timeout=30000)
            log.info(f"[TAS-{council_name}] Loaded")

            for sel, val in [
                (["input[type='date']", "input[id*='dateFrom']", "input[placeholder*='from']"], date_from),
                (["input[type='date']:last-of-type", "input[id*='dateTo']", "input[placeholder*='to']"], date_to),
            ]:
                for s in sel:
                    try:
                        await page.fill(s, val, timeout=3000)
                        break
                    except Exception:
                        pass

            for sel in ["button[type='submit']", "button:has-text('Search')", "input[type='submit']"]:
                try:
                    await page.click(sel, timeout=3000)
                    await page.wait_for_load_state("networkidle", timeout=15000)
                    break
                except Exception:
                    pass

            rows = await page.query_selector_all("table tbody tr, .application-item, [class*='da-row']")
            log.info(f"[TAS-{council_name}] Found {len(rows)} rows")
            for row in rows:
                try:
                    cells = await row.query_selector_all("td")
                    texts = [await c.inner_text() for c in cells]
                    texts = [t.strip() for t in texts if t.strip()]
                    if len(texts) >= 3:
                        results.append({"_cells": texts, "_council": council_name})
                except Exception:
                    pass

        except Exception as e:
            log.warning(f"[TAS-{council_name}] Error: {e}")

        await browser.close()

    return results


def _parse_tas(raw) -> dict | None:
    if not isinstance(raw, dict):
        return None
    cells = raw.get("_cells", [])
    council = raw.get("_council", "")

    if not cells:
        return None

    ref = cells[0].strip() if cells else ""
    if not ref or len(ref) < 3:
        return None

    address = cells[1].strip() if len(cells) > 1 else ""
    description = cells[2].strip() if len(cells) > 2 else ""
    date_raw = cells[4].strip() if len(cells) > 4 else (cells[3].strip() if len(cells) > 3 else "")

    suburb, postcode, street = _parse_tas_address(address)
    if not suburb:
        return None

    return {
        "source": SOURCE,
        "source_id": f"TAS-{ref}".replace("/", "-").replace(" ", "-"),
        "source_url": f"https://eplan.tas.gov.au",
        "council": council or None,
        "state": "TAS",
        "suburb": suburb,
        "postcode": postcode,
        "street_address": street,
        "da_number": ref,
        "description": description or None,
        "lodged_date": _parse_date(date_raw),
        "determination_date": None,
        "raw_data": raw,
    }


def _parse_tas_address(address: str) -> tuple[str | None, str | None, str | None]:
    if not address:
        return None, None, None
    postcode_match = re.search(r"\b(7\d{3})\b", address)
    postcode = postcode_match.group(1) if postcode_match else None
    suburb_match = re.search(r",\s*([A-Za-z][A-Za-z\s]+?)(?:\s+TAS)?\s+7\d{3}", address)
    if suburb_match:
        suburb = suburb_match.group(1).strip().title()
    elif "," in address:
        parts = address.rsplit(",", 1)
        raw = parts[-1].strip().replace("TAS", "").strip()
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
    now = datetime.now(timezone.utc)
    date_to = now.strftime("%d/%m/%Y")
    date_from = (now - timedelta(days=days_back)).strftime("%d/%m/%Y")
    log.info(f"[TAS] Scraping {date_from} → {date_to}")
    run_id = log_scraper_start(SOURCE)
    das_scraped = 0
    das_new = 0
    matches_created = 0
    errors = []

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            # Try the statewide ePlanning TAS portal first
            raw_items = asyncio.run(_scrape_eplan_tas(date_from, date_to))

            # If nothing came back, try individual councils
            if not raw_items:
                log.info("[TAS] ePlanning returned nothing — trying individual councils")
                for council_name, url in COUNCILS.items():
                    try:
                        rows = asyncio.run(_scrape_council_site(council_name, url, date_from, date_to))
                        raw_items.extend(rows)
                    except Exception as e:
                        log.warning(f"[TAS] {council_name} failed: {e}")

            log.info(f"[TAS] Processing {len(raw_items)} raw items")
            for raw in raw_items:
                das_scraped += 1
                parsed = _parse_tas(raw)
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
            log.error(f"[TAS] Attempt {attempt} error: {e}")
            errors.append(str(e))
            if attempt < MAX_RETRIES:
                import time; time.sleep(30)

    error_str = "; ".join(errors) if errors else None
    log_scraper_end(run_id, das_scraped, das_new, matches_created, error_str)
    log_health("tas_councils", "error" if errors and das_new == 0 else "ok", error_str or f"{das_new} new DAs")
    log.info(f"[TAS] Done: {das_scraped} scraped, {das_new} new, {matches_created} matches")
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
