"""
act_portal.py - Playwright scraper for ACT planning authority DA register.
ACT portal: https://www.accesscanberra.act.gov.au/s/article/development-applications

The ACT DA search is at: https://www.planning.act.gov.au/development-applications/register
Pattern adapted from ~/scrape_real_contractors.py (Playwright async_api).

On first run, verify the CSS selectors against the live page.
"""

import asyncio
import os
import sys
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
)
from shared.classifier import classify_project_type
from shared.matcher import match_da_to_builders

log = logging.getLogger(__name__)

SOURCE = "act_portal"
BASE_URL = "https://www.planning.act.gov.au/development-applications/register"
MAX_RETRIES = 2


async def _scrape_page(page, date_from: str) -> list[dict]:
    """Scrape one page of ACT DA results. Returns list of raw DA dicts."""
    das = []

    try:
        # Navigate to the DA register
        await page.goto(BASE_URL, wait_until="networkidle", timeout=30000)

        # Fill in date filter if a date field exists
        try:
            await page.fill("input[name*='date'], input[placeholder*='date']", date_from, timeout=5000)
            await page.click("button[type='submit'], input[type='submit']", timeout=5000)
            await page.wait_for_load_state("networkidle", timeout=15000)
        except Exception:
            pass

        # Try to extract table rows (DA registers are usually presented as HTML tables)
        rows = await page.query_selector_all("table tbody tr, .da-list-item, [data-testid='da-row']")
        log.info(f"[ACT] Found {len(rows)} rows on page")

        for row in rows:
            try:
                text = await row.inner_text()
                cells = await row.query_selector_all("td")
                cell_texts = [await c.inner_text() for c in cells]

                # Parse cells — ACT typically: [DA Number, Address, Description, Status, Lodged Date]
                if len(cell_texts) >= 4:
                    das.append({
                        "da_number": cell_texts[0].strip() if cell_texts else "",
                        "street_address": cell_texts[1].strip() if len(cell_texts) > 1 else "",
                        "description": cell_texts[2].strip() if len(cell_texts) > 2 else "",
                        "status_text": cell_texts[3].strip() if len(cell_texts) > 3 else "",
                        "lodged_date_text": cell_texts[4].strip() if len(cell_texts) > 4 else "",
                        "_row_text": text.strip(),
                    })
            except Exception as e:
                log.debug(f"[ACT] Error parsing row: {e}")
                continue

    except Exception as e:
        log.error(f"[ACT] Error scraping page: {e}")

    return das


def _parse_act_da(raw: dict) -> dict | None:
    """Map a raw ACT row to our DA schema."""
    da_number = raw.get("da_number") or ""
    if not da_number or len(da_number) < 3:
        return None

    source_id = da_number.replace("/", "-").replace(" ", "-")

    # Parse suburb from ACT address (typically "12 Smith St, Braddon ACT 2612")
    address = raw.get("street_address") or ""
    suburb = None
    postcode = None
    street = address

    import re
    postcode_match = re.search(r"\b(26\d{2})\b", address)
    if postcode_match:
        postcode = postcode_match.group(1)

    suburb_match = re.search(r",\s*([A-Za-z\s]+?)(?:\s+ACT)?\s+\d{4}", address)
    if suburb_match:
        suburb = suburb_match.group(1).strip().title()
    elif "," in address:
        parts = address.split(",")
        suburb = parts[-1].strip().replace("ACT", "").strip().title()

    if not suburb:
        return None

    street_part = address.split(",")[0].strip() if "," in address else address

    # Parse lodgement date
    date_text = raw.get("lodged_date_text") or ""
    lodged_date = None
    for fmt in ("%d/%m/%Y", "%d-%m-%Y", "%Y-%m-%d", "%d %b %Y"):
        try:
            lodged_date = datetime.strptime(date_text.strip(), fmt).strftime("%Y-%m-%d")
            break
        except ValueError:
            continue

    return {
        "source": SOURCE,
        "source_id": source_id,
        "source_url": f"{BASE_URL}?da={source_id}",
        "council": "ACT Planning Authority",
        "state": "ACT",
        "suburb": suburb,
        "postcode": postcode,
        "street_address": street_part,
        "da_number": da_number,
        "description": raw.get("description") or None,
        "lodged_date": lodged_date,
        "determination_date": None,
        "raw_data": raw,
    }


async def _run_async(days_back: int = 1) -> dict:
    from playwright.async_api import async_playwright

    date_from = (datetime.now(timezone.utc) - timedelta(days=days_back)).strftime("%d/%m/%Y")
    log.info(f"[ACT] Scraping from {date_from}")
    run_id = log_scraper_start(SOURCE)

    das_scraped = 0
    das_new = 0
    matches_created = 0
    errors = []

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.set_extra_http_headers({
                    "Accept-Language": "en-AU,en;q=0.9",
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                })

                raw_das = await _scrape_page(page, date_from)
                await browser.close()

            for raw in raw_das:
                das_scraped += 1
                parsed = _parse_act_da(raw)
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
                increment_suburb_da_count(parsed["suburb"], parsed["state"], parsed.get("postcode"))
                increment_council_da_count(parsed.get("council") or "", parsed["state"])
                increment_postcode_da_count(parsed.get("postcode") or "", parsed["state"], parsed["suburb"])

                new_matches = match_da_to_builders(da_id, parsed, trigger_stage="lodgement")
                matches_created += new_matches

            break
        except Exception as e:
            log.error(f"[ACT] Attempt {attempt} failed: {e}")
            errors.append(str(e))
            if attempt < MAX_RETRIES:
                import time; time.sleep(30)

    error_str = "; ".join(errors) if errors else None
    log_scraper_end(run_id, das_scraped, das_new, matches_created, error_str)
    log_health(
        check_name="act_portal",
        status="error" if errors and das_new == 0 else "ok",
        message=error_str or f"Scraped {das_new} new DAs",
    )

    log.info(f"[ACT] Done: {das_scraped} scraped, {das_new} new, {matches_created} matches")
    return {"das_scraped": das_scraped, "das_new": das_new, "matches_created": matches_created, "errors": errors}


def run(days_back: int = 1) -> dict:
    return asyncio.run(_run_async(days_back=days_back))


if __name__ == "__main__":
    import argparse
    from dotenv import load_dotenv
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")

    parser = argparse.ArgumentParser(description="Scrape ACT planning portal DAs")
    parser.add_argument("--days-back", type=int, default=1)
    args = parser.parse_args()
    run(days_back=args.days_back)
