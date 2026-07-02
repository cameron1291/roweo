"""
sa_planssa.py - South Australia DA scraper via PlanSA ePlanning portal.

Portal: https://www.saplanningportal.sa.gov.au/
PlanSA is the SA Government's state-wide planning and development portal,
covering all SA councils under the Planning, Development and Infrastructure Act 2016.

Approach: Playwright browser scraper with JSON interception.
The portal uses a React/Angular frontend that loads application data via XHR —
the interceptor catches that JSON so we don't need to parse DOM tables.

On first run: check logs for "Captured JSON" lines. If the portal structure
has changed, open https://www.saplanningportal.sa.gov.au/ in a browser, open
DevTools Network tab, search for DAs, and note the API URL for API_URL below.
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

SOURCE = "sa_planssa"
PORTAL_URL = "https://www.saplanningportal.sa.gov.au"
SEARCH_URL = f"{PORTAL_URL}/page/planning/search"
MAX_RETRIES = 2


async def _scrape(date_from: str, date_to: str) -> list[dict]:
    """Playwright scraper with JSON API interception for PlanSA portal."""
    from playwright.async_api import async_playwright

    captured = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
            locale="en-AU",
        )
        page = await context.new_page()

        async def on_response(response):
            ct = response.headers.get("content-type", "")
            url = response.url
            if "json" in ct and ("planningportal" in url or "planssa" in url or "saplanningportal" in url):
                try:
                    body = await response.json()
                    if isinstance(body, list) and len(body) > 0:
                        captured.extend(body)
                        log.info(f"[SA] JSON list from {url}: {len(body)} items")
                    elif isinstance(body, dict):
                        for key in ("applications", "results", "data", "items", "developmentApplications"):
                            if key in body and isinstance(body[key], list):
                                captured.extend(body[key])
                                log.info(f"[SA] JSON .{key} from {url}: {len(body[key])} items")
                                break
                except Exception:
                    pass

        page.on("response", on_response)

        try:
            await page.goto(SEARCH_URL, wait_until="networkidle", timeout=45000)
            log.info(f"[SA] Loaded PlanSA search page")

            # Try to fill date range inputs
            for sel, val in [
                (["input[id*='dateFrom']", "input[placeholder*='from']", "input[aria-label*='from']"], date_from),
                (["input[id*='dateTo']", "input[placeholder*='to']", "input[aria-label*='to']"], date_to),
            ]:
                for s in sel:
                    try:
                        await page.fill(s, val, timeout=3000)
                        log.info(f"[SA] Filled {s}={val}")
                        break
                    except Exception:
                        pass

            # Submit search
            for sel in ["button[type='submit']", "button:has-text('Search')", "input[type='submit']", ".search-btn", "[data-testid='search-button']"]:
                try:
                    await page.click(sel, timeout=3000)
                    await page.wait_for_load_state("networkidle", timeout=25000)
                    log.info(f"[SA] Submitted search via {sel}")
                    break
                except Exception:
                    pass

            # Wait a bit more for XHR to complete
            import asyncio as aio
            await aio.sleep(3)

            if not captured:
                # DOM fallback
                rows = await page.query_selector_all("table tbody tr, .application-row, [class*='result-row']")
                log.info(f"[SA] DOM fallback: {len(rows)} rows")
                for row in rows:
                    try:
                        cells = await row.query_selector_all("td")
                        texts = [await c.inner_text() for c in cells]
                        if len(texts) >= 3:
                            captured.append({"_cells": texts})
                    except Exception:
                        pass

        except Exception as e:
            log.error(f"[SA] Scrape error: {e}")

        await browser.close()

    return captured


def _parse_sa(raw) -> dict | None:
    if isinstance(raw, dict) and "_cells" in raw:
        return _parse_sa_dom(raw["_cells"])
    if not isinstance(raw, dict):
        return None

    ref = str(
        raw.get("applicationNumber") or raw.get("referenceNumber") or
        raw.get("developmentNumber") or raw.get("id") or ""
    )
    if not ref or len(ref) < 3:
        return None

    address = str(raw.get("address") or raw.get("siteAddress") or raw.get("streetAddress") or "")
    council = str(raw.get("council") or raw.get("localCouncil") or raw.get("assessmentManager") or "")
    description = str(raw.get("description") or raw.get("natureOfDevelopment") or raw.get("summary") or "")
    date_raw = str(raw.get("lodgementDate") or raw.get("dateReceived") or raw.get("lodgedDate") or "")

    suburb, postcode, street = _parse_sa_address(address)
    if not suburb:
        return None

    return {
        "source": SOURCE,
        "source_id": ref.replace("/", "-").replace(" ", "-"),
        "source_url": f"{PORTAL_URL}/application/{ref}",
        "council": council or None,
        "state": "SA",
        "suburb": suburb,
        "postcode": postcode,
        "street_address": street,
        "da_number": ref,
        "description": description or None,
        "lodged_date": _parse_date(date_raw),
        "determination_date": None,
        "raw_data": raw,
    }


def _parse_sa_dom(cells: list[str]) -> dict | None:
    ref = cells[0].strip() if cells else ""
    if not ref or len(ref) < 3:
        return None
    address = cells[1].strip() if len(cells) > 1 else ""
    description = cells[2].strip() if len(cells) > 2 else ""
    date_raw = cells[4].strip() if len(cells) > 4 else (cells[3].strip() if len(cells) > 3 else "")
    suburb, postcode, street = _parse_sa_address(address)
    if not suburb:
        return None
    return {
        "source": SOURCE,
        "source_id": ref.replace("/", "-").replace(" ", "-"),
        "source_url": f"{PORTAL_URL}/application/{ref}",
        "council": None,
        "state": "SA",
        "suburb": suburb,
        "postcode": postcode,
        "street_address": street,
        "da_number": ref,
        "description": description or None,
        "lodged_date": _parse_date(date_raw),
        "determination_date": None,
        "raw_data": {"_cells": cells},
    }


def _parse_sa_address(address: str) -> tuple[str | None, str | None, str | None]:
    if not address:
        return None, None, None
    postcode_match = re.search(r"\b(5\d{3})\b", address)
    postcode = postcode_match.group(1) if postcode_match else None
    suburb_match = re.search(r",\s*([A-Za-z][A-Za-z\s]+?)(?:\s+SA)?\s+5\d{3}", address)
    if suburb_match:
        suburb = suburb_match.group(1).strip().title()
    elif "," in address:
        parts = address.rsplit(",", 1)
        raw = parts[-1].strip().replace("SA", "").strip()
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
    log.info(f"[SA] Scraping {date_from} → {date_to}")
    run_id = log_scraper_start(SOURCE)

    das_scraped = 0
    das_new = 0
    matches_created = 0
    errors = []

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            raw_items = asyncio.run(_scrape(date_from, date_to))
            log.info(f"[SA] Got {len(raw_items)} raw items")

            for raw in raw_items:
                das_scraped += 1
                parsed = _parse_sa(raw)
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
            log.error(f"[SA] Attempt {attempt} error: {e}")
            errors.append(str(e))
            if attempt < MAX_RETRIES:
                import time; time.sleep(30)

    error_str = "; ".join(errors) if errors else None
    log_scraper_end(run_id, das_scraped, das_new, matches_created, error_str)
    log_health("sa_planssa", "error" if errors and das_new == 0 else "ok", error_str or f"{das_new} new DAs")
    log.info(f"[SA] Done: {das_scraped} scraped, {das_new} new, {matches_created} matches")
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
