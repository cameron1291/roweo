"""
nt_planning.py - Northern Territory DA scraper.

Targets:
  1. NT Department of Infrastructure, Planning and Logistics
     https://planning.nt.gov.au/development-applications/search-approved-development-applications
  2. Darwin City Council ePlanning portal
     https://www.darwin.nt.gov.au/council/planning-building-development/development-applications

NT has relatively low DA volume. The state planning portal covers Territory Plan
applications (large developments); council-level DAs are handled by individual councils.

On first run: check logs for row counts.
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

SOURCE = "nt_planning"
MAX_RETRIES = 2

# NT planning portal DA search
NT_PLANNING_URL = "https://planning.nt.gov.au/development-applications/search-approved-development-applications"

# Darwin City Council
DARWIN_DA_URL = "https://eplan.darwin.nt.gov.au/ePathway/Production/Web/GeneralEnquiry/EnquiryLists.aspx?NodeName=DevelopmentApplications"

# Palmerston City Council
PALMERSTON_DA_URL = "https://eplan.palmerston.nt.gov.au/ePathway/Production/Web/GeneralEnquiry/EnquiryLists.aspx?NodeName=DevelopmentApplications"

SOURCES = {
    "NT Planning": NT_PLANNING_URL,
    "Darwin City Council": DARWIN_DA_URL,
    "Palmerston City Council": PALMERSTON_DA_URL,
}


async def _scrape_portal(source_name: str, url: str, date_from: str, date_to: str) -> list[dict]:
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
            if "json" in ct and "nt.gov.au" in response.url:
                try:
                    body = await response.json()
                    if isinstance(body, list) and body:
                        captured_json.extend(body)
                    elif isinstance(body, dict):
                        for key in ("applications", "results", "data", "items"):
                            if key in body and isinstance(body[key], list):
                                captured_json.extend(body[key])
                                break
                    log.info(f"[NT-{source_name}] JSON: {len(captured_json)} items from {response.url}")
                except Exception:
                    pass

        page.on("response", on_response)

        try:
            await page.goto(url, wait_until="networkidle", timeout=45000)
            log.info(f"[NT-{source_name}] Loaded {url}")

            # Fill date range
            for sel, val in [
                (["input[id*='DateFrom']", "input[id*='dateFrom']", "input[name*='From']", "input[type='date']"], date_from),
                (["input[id*='DateTo']", "input[id*='dateTo']", "input[name*='To']"], date_to),
            ]:
                for s in sel:
                    try:
                        await page.fill(s, val, timeout=3000)
                        break
                    except Exception:
                        pass

            for sel in ["input[value='Search']", "button:has-text('Search')", "input[type='submit']", "button[type='submit']"]:
                try:
                    await page.click(sel, timeout=3000)
                    await page.wait_for_load_state("networkidle", timeout=20000)
                    break
                except Exception:
                    pass

            if captured_json:
                await browser.close()
                return captured_json

            # DOM extraction
            rows = await page.query_selector_all(
                "table.rgMasterTable tbody tr, table[id*='Grid'] tbody tr, "
                ".k-grid-content table tbody tr, table tbody tr[class*='Row'], "
                "table tbody tr"
            )
            log.info(f"[NT-{source_name}] DOM: {len(rows)} rows")
            for row in rows:
                try:
                    cells = await row.query_selector_all("td")
                    texts = [await c.inner_text() for c in cells]
                    texts = [t.strip() for t in texts if t.strip()]
                    if len(texts) >= 3:
                        results.append({"_cells": texts, "_council": source_name})
                except Exception:
                    pass

        except Exception as e:
            log.warning(f"[NT-{source_name}] Error: {e}")

        await browser.close()

    return results


def _parse_nt(raw) -> dict | None:
    if not isinstance(raw, dict):
        return None

    cells = raw.get("_cells")
    council = raw.get("_council", "NT Planning")

    if cells:
        ref = cells[0].strip() if cells else ""
        if not ref or len(ref) < 3:
            return None
        address = cells[1].strip() if len(cells) > 1 else ""
        description = cells[2].strip() if len(cells) > 2 else ""
        date_raw = cells[4].strip() if len(cells) > 4 else (cells[3].strip() if len(cells) > 3 else "")
    else:
        ref = str(raw.get("applicationNumber") or raw.get("referenceNumber") or raw.get("id") or "")
        if not ref or len(ref) < 3:
            return None
        address = str(raw.get("address") or raw.get("siteAddress") or "")
        council = str(raw.get("council") or council)
        description = str(raw.get("description") or raw.get("proposedDevelopment") or "")
        date_raw = str(raw.get("lodgementDate") or raw.get("dateReceived") or "")

    suburb, postcode, street = _parse_nt_address(address)
    if not suburb:
        return None

    return {
        "source": SOURCE,
        "source_id": f"NT-{ref}".replace("/", "-").replace(" ", "-"),
        "source_url": NT_PLANNING_URL,
        "council": council or None,
        "state": "NT",
        "suburb": suburb,
        "postcode": postcode,
        "street_address": street,
        "da_number": ref,
        "description": description or None,
        "lodged_date": _parse_date(date_raw),
        "determination_date": None,
        "raw_data": raw,
    }


def _parse_nt_address(address: str) -> tuple[str | None, str | None, str | None]:
    if not address:
        return None, None, None
    postcode_match = re.search(r"\b(08\d{2})\b", address)
    postcode = postcode_match.group(1) if postcode_match else None
    suburb_match = re.search(r",\s*([A-Za-z][A-Za-z\s]+?)(?:\s+NT)?\s+0\d{3}", address)
    if suburb_match:
        suburb = suburb_match.group(1).strip().title()
    elif "," in address:
        parts = address.rsplit(",", 1)
        raw = parts[-1].strip().replace("NT", "").strip()
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
    log.info(f"[NT] Scraping {date_from} → {date_to}")
    run_id = log_scraper_start(SOURCE)
    das_scraped = 0
    das_new = 0
    matches_created = 0
    errors = []

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            all_raw = []
            for source_name, url in SOURCES.items():
                try:
                    items = asyncio.run(_scrape_portal(source_name, url, date_from, date_to))
                    all_raw.extend(items)
                    log.info(f"[NT] {source_name}: {len(items)} items")
                except Exception as e:
                    log.warning(f"[NT] {source_name} failed: {e}")
                    errors.append(f"{source_name}: {e}")

            log.info(f"[NT] Processing {len(all_raw)} total items")
            for raw in all_raw:
                das_scraped += 1
                parsed = _parse_nt(raw)
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
            log.error(f"[NT] Attempt {attempt} error: {e}")
            errors.append(str(e))
            if attempt < MAX_RETRIES:
                import time; time.sleep(30)

    error_str = "; ".join(errors) if errors else None
    log_scraper_end(run_id, das_scraped, das_new, matches_created, error_str)
    log_health("nt_planning", "error" if errors and das_new == 0 else "ok", error_str or f"{das_new} new DAs")
    log.info(f"[NT] Done: {das_scraped} scraped, {das_new} new, {matches_created} matches")
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
