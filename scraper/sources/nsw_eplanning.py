"""
nsw_eplanning.py - NSW DA scraper via the NSW Planning Portal.

The NSW ePlanning Portal API (api.apps1.nsw.gov.au/eplanning/data/v0/OnlineDA)
was deprecated and now requires a subscription key.

This scraper uses Playwright to load the NSW Planning Portal search page and
intercepts the internal JSON API calls that the page makes. This gives us
clean JSON data without needing an API key.

Portal: https://www.planningportal.nsw.gov.au/find-a-development-application

On first run: check logs for "Captured API JSON" lines. If the portal structure
changes, open the URL in Chrome DevTools → Network tab, perform a search, and
look for XHR calls to identify the new API endpoint pattern.
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

SOURCE = "nsw_eplanning"
PORTAL_URL = "https://www.planningportal.nsw.gov.au/find-a-development-application"
MAX_RETRIES = 2


async def _scrape_portal(date_from_au: str, date_to_au: str) -> list[dict]:
    """
    Load the NSW Planning Portal search page in Playwright, fill date range,
    and intercept the internal API JSON responses.
    """
    from playwright.async_api import async_playwright

    captured = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36",
            locale="en-AU",
        )
        page = await context.new_page()

        async def on_response(response):
            ct = response.headers.get("content-type", "")
            url = response.url
            # Intercept any JSON responses from NSW gov APIs
            if "json" in ct and any(d in url for d in ["planningportal.nsw", "apps1.nsw.gov.au", "api.nsw.gov.au", "eplanning"]):
                try:
                    body = await response.json()
                    if isinstance(body, list) and body:
                        captured.extend(body)
                        log.info(f"[NSW] Captured API JSON (list): {len(body)} items from {url}")
                    elif isinstance(body, dict):
                        # Try common wrapper keys
                        for key in ("Application", "applications", "results", "data", "items", "DevelopmentApplications"):
                            if key in body and isinstance(body[key], list):
                                captured.extend(body[key])
                                log.info(f"[NSW] Captured API JSON .{key}: {len(body[key])} items from {url}")
                                break
                        else:
                            if body and "ErrorMessage" not in body:
                                captured.append(body)
                                log.info(f"[NSW] Captured API JSON (dict): {url}")
                except Exception as e:
                    log.debug(f"[NSW] JSON parse error from {url}: {e}")

        page.on("response", on_response)

        try:
            log.info(f"[NSW] Loading Planning Portal…")
            await page.goto(PORTAL_URL, wait_until="networkidle", timeout=60000)
            log.info(f"[NSW] Portal loaded")

            # Try to fill lodgement date from/to fields
            # The NSW Planning Portal uses React so field IDs may vary
            date_selectors_from = [
                "input[id*='dateFrom']", "input[id*='lodgementFrom']",
                "input[placeholder*='from']", "input[name*='dateFrom']",
                "input[aria-label*='from']", "input[aria-label*='From']",
                "[data-testid*='date-from'] input", "input[type='date']:first-of-type",
            ]
            date_selectors_to = [
                "input[id*='dateTo']", "input[id*='lodgementTo']",
                "input[placeholder*='to']", "input[name*='dateTo']",
                "input[aria-label*='to']", "input[aria-label*='To']",
                "[data-testid*='date-to'] input",
            ]

            filled_from = False
            for sel in date_selectors_from:
                try:
                    await page.fill(sel, date_from_au, timeout=3000)
                    filled_from = True
                    log.info(f"[NSW] Filled date-from via {sel}: {date_from_au}")
                    break
                except Exception:
                    pass

            for sel in date_selectors_to:
                try:
                    await page.fill(sel, date_to_au, timeout=3000)
                    log.info(f"[NSW] Filled date-to via {sel}: {date_to_au}")
                    break
                except Exception:
                    pass

            # Select "Development Application" type if there's a filter
            for sel in ["select[id*='type']", "select[name*='type']", "select[aria-label*='type']"]:
                try:
                    await page.select_option(sel, label="Development Application", timeout=3000)
                    log.info(f"[NSW] Selected DA type via {sel}")
                    break
                except Exception:
                    pass

            # Submit search
            for sel in [
                "button[type='submit']", "button:has-text('Search')",
                "button:has-text('Find')", "input[type='submit']",
                "[data-testid='search-button']", ".search-submit",
            ]:
                try:
                    await page.click(sel, timeout=3000)
                    await page.wait_for_load_state("networkidle", timeout=30000)
                    log.info(f"[NSW] Submitted via {sel}")
                    break
                except Exception:
                    pass

            # Wait for XHR responses
            import asyncio as aio
            await aio.sleep(5)

            log.info(f"[NSW] After search: {len(captured)} items captured via API interception")

            if not captured:
                # Try DOM extraction as last resort
                rows = await page.query_selector_all(
                    "table tbody tr, .application-row, .da-list-item, "
                    "[class*='result-row'], [class*='ApplicationRow']"
                )
                log.info(f"[NSW] DOM: {len(rows)} rows found")
                for row in rows:
                    try:
                        cells = await row.query_selector_all("td, [class*='cell']")
                        texts = [await c.inner_text() for c in cells]
                        texts = [t.strip() for t in texts if t.strip()]
                        if len(texts) >= 3:
                            captured.append({"_cells": texts, "_source": "dom"})
                    except Exception:
                        pass

        except Exception as e:
            log.error(f"[NSW] Playwright error: {e}")

        await browser.close()

    return captured


def _parse_nsw(raw) -> dict | None:
    """Map a NSW Planning Portal record to our DA schema."""
    if not isinstance(raw, dict):
        return None

    if raw.get("_source") == "dom":
        return _parse_nsw_dom(raw.get("_cells", []))

    # JSON field mapping — names vary between API versions
    ref = str(
        raw.get("ApplicationId") or raw.get("PlanningPortalApplicationNumber") or
        raw.get("applicationNumber") or raw.get("referenceNumber") or
        raw.get("id") or raw.get("DaNumber") or ""
    )
    if not ref or len(ref) < 3:
        return None

    # Address parsing
    addr_obj = raw.get("PrimaryAddress") or {}
    if addr_obj:
        addr = _parse_address_obj(addr_obj)
    else:
        addr_str = str(raw.get("address") or raw.get("siteAddress") or raw.get("Address") or "")
        addr = _parse_address_str(addr_str, state="NSW")

    if not addr.get("suburb"):
        return None

    description = str(raw.get("Description") or raw.get("description") or raw.get("proposedDevelopment") or "")
    council = str(raw.get("Council") or raw.get("council") or raw.get("LocalCouncil") or "")
    date_raw = str(raw.get("LodgementDate") or raw.get("lodgementDate") or raw.get("DateLodged") or "")

    cost_raw = raw.get("CostOfDevelopment") or raw.get("estimatedCost")
    try:
        cost_aud = int(float(cost_raw)) if cost_raw is not None else None
    except (ValueError, TypeError):
        cost_aud = None

    return {
        "source": SOURCE,
        "source_id": str(ref).replace("/", "-").replace(" ", "-"),
        "source_url": f"https://www.planningportal.nsw.gov.au/find-a-development-application?id={ref}",
        "council": council or None,
        "state": "NSW",
        "suburb": addr["suburb"],
        "postcode": addr.get("postcode"),
        "street_address": addr.get("street_address"),
        "da_number": str(raw.get("ApplicationNumber") or raw.get("applicationNumber") or ref),
        "description": description or None,
        "estimated_value_aud": cost_aud,
        "applicant_name": str(raw.get("ApplicantName") or raw.get("applicantName") or ""),
        "lodged_date": _parse_date(date_raw),
        "determination_date": _parse_date(str(raw.get("DeterminationDate") or raw.get("determinationDate") or "")),
        "raw_data": raw,
    }


def _parse_nsw_dom(cells: list[str]) -> dict | None:
    ref = cells[0].strip() if cells else ""
    if not ref or len(ref) < 3:
        return None
    address = cells[1].strip() if len(cells) > 1 else ""
    description = cells[2].strip() if len(cells) > 2 else ""
    date_raw = cells[4].strip() if len(cells) > 4 else (cells[3].strip() if len(cells) > 3 else "")
    addr = _parse_address_str(address, "NSW")
    if not addr.get("suburb"):
        return None
    return {
        "source": SOURCE,
        "source_id": ref.replace("/", "-").replace(" ", "-"),
        "source_url": f"https://www.planningportal.nsw.gov.au/find-a-development-application?id={ref}",
        "council": None,
        "state": "NSW",
        "suburb": addr["suburb"],
        "postcode": addr.get("postcode"),
        "street_address": addr.get("street_address"),
        "da_number": ref,
        "description": description or None,
        "lodged_date": _parse_date(date_raw),
        "determination_date": None,
        "raw_data": {"_cells": cells},
    }


def _parse_address_obj(addr: dict) -> dict:
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


def _parse_address_str(address: str, state: str = "NSW") -> dict:
    if not address:
        return {}
    postcode_match = re.search(r"\b(2\d{3})\b", address)
    postcode = postcode_match.group(1) if postcode_match else None
    suburb_match = re.search(rf",\s*([A-Za-z][A-Za-z\s]+?)(?:\s+{state})?\s+2\d{{3}}", address)
    if suburb_match:
        suburb = suburb_match.group(1).strip().title()
    elif "," in address:
        parts = address.rsplit(",", 1)
        raw = parts[-1].strip().replace(state, "").strip()
        suburb = re.sub(r"\d{4}", "", raw).strip().title() or None
    else:
        suburb = None
    street = address.split(",")[0].strip() if "," in address else address
    return {"suburb": suburb, "postcode": postcode, "street_address": street}


def _parse_date(raw: str) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(raw, fmt).strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None


def run(days_back: int = 1) -> dict:
    now = datetime.now(timezone.utc)
    date_to_au = now.strftime("%d/%m/%Y")
    date_from_au = (now - timedelta(days=days_back)).strftime("%d/%m/%Y")

    log.info(f"[NSW] Scraping DAs from {date_from_au} to {date_to_au}")
    run_id = log_scraper_start(SOURCE)

    das_scraped = 0
    das_new = 0
    matches_created = 0
    errors = []

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            raw_items = asyncio.run(_scrape_portal(date_from_au, date_to_au))
            log.info(f"[NSW] Got {len(raw_items)} raw items")

            for raw in raw_items:
                das_scraped += 1
                parsed = _parse_nsw(raw)
                if not parsed:
                    continue

                if da_exists(SOURCE, parsed["source_id"]):
                    continue

                if parsed.get("description"):
                    cls = classify_project_type(parsed["description"])
                    parsed["project_type"] = cls["project_type"]
                    parsed["project_type_confidence"] = cls["confidence"]
                    if parsed.get("estimated_value_aud") is None:
                        parsed["estimated_value_aud"] = cls.get("estimated_value_aud")
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
            log.error(f"[NSW] Attempt {attempt} error: {e}")
            errors.append(str(e))
            if attempt < MAX_RETRIES:
                import time; time.sleep(30)

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

    parser = argparse.ArgumentParser(description="Scrape NSW Planning Portal DAs")
    parser.add_argument("--days-back", type=int, default=1, help="How many days back to fetch")
    args = parser.parse_args()
    run(days_back=args.days_back)
