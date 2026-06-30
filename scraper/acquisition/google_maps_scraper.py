"""
google_maps_scraper.py - Scrape builder prospects from Google Maps.
Usage: python google_maps_scraper.py --query "residential builder Sydney" --max 50

Inserts rows into builder_prospects with status='scraped'.
Adapted from ~/scrape_real_contractors.py Playwright pattern.
"""

import asyncio
import argparse
import logging
import os
import re
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

SUBURB_PATTERN = re.compile(r'(?:NSW|VIC|QLD|ACT|WA|SA|TAS|NT)\s+\d{4}')


async def scrape_google_maps(query: str, max_results: int = 50) -> list[dict]:
    from playwright.async_api import async_playwright

    results = []
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
        )
        page = await context.new_page()

        search_url = f"https://www.google.com.au/maps/search/{query.replace(' ', '+')}/"
        log.info(f"Searching: {search_url}")
        await page.goto(search_url, wait_until="networkidle")
        await page.wait_for_timeout(2000)

        # Scroll to load more results
        results_panel = page.locator('[role="feed"]')
        for _ in range(min(max_results // 10, 5)):
            await results_panel.evaluate("el => el.scrollBy(0, 2000)")
            await page.wait_for_timeout(1500)

        # Extract result cards
        cards = await page.locator('[data-result-index]').all()
        log.info(f"Found {len(cards)} result cards")

        for card in cards[:max_results]:
            try:
                name = await card.locator('div.fontHeadlineSmall').first.inner_text()
                address_el = card.locator('div[class*="fontBodyMedium"] span').first
                address = await address_el.inner_text() if await address_el.count() > 0 else ''
                phone_el = card.locator('[data-tooltip*="phone"], [aria-label*="Phone"]').first
                phone = await phone_el.get_attribute('data-tooltip') if await phone_el.count() > 0 else None

                # Click card to get website
                await card.click()
                await page.wait_for_timeout(1500)
                website = None
                website_el = page.locator('a[data-item-id="authority"]').first
                if await website_el.count() > 0:
                    website = await website_el.get_attribute('href')

                if name and len(name) > 3:
                    results.append({
                        'company_name': name.strip(),
                        'postal_address': address.strip() or None,
                        'phone': phone.strip() if phone else None,
                        'website': website,
                        'source': 'google_maps',
                    })
                    log.info(f"  Scraped: {name}")
            except Exception as e:
                log.debug(f"Card parse error: {e}")

        await browser.close()

    return results


def insert_prospects(prospects: list[dict]) -> dict:
    supabase = _get_client()
    inserted = 0
    skipped = 0

    for p in prospects:
        if not p.get('company_name'):
            skipped += 1
            continue

        # Check duplicate by company name
        existing = supabase.table('builder_prospects') \
            .select('id') \
            .ilike('company_name', p['company_name']) \
            .limit(1) \
            .execute()

        if existing.data:
            skipped += 1
            continue

        # Generate demo slug
        demo_slug = re.sub(r'[^a-z0-9]+', '-', p['company_name'].lower()).strip('-')
        demo_slug = demo_slug[:40] + '-' + os.urandom(3).hex()

        import uuid
        supabase.table('builder_prospects').insert({
            **p,
            'status': 'scraped',
            'demo_slug': demo_slug,
            'qr_token': str(uuid.uuid4()),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }).execute()
        inserted += 1

    return {'inserted': inserted, 'skipped': skipped}


async def run(query: str, max_results: int = 50):
    log.info(f"Google Maps scraper: query='{query}' max={max_results}")
    prospects = await scrape_google_maps(query, max_results)
    log.info(f"Scraped {len(prospects)} prospects")
    result = insert_prospects(prospects)
    log.info(f"Inserted {result['inserted']}, skipped {result['skipped']}")
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--query', default='residential builder Sydney NSW', help='Google Maps search query')
    parser.add_argument('--max', type=int, default=50, help='Max results to scrape')
    args = parser.parse_args()
    asyncio.run(run(args.query, args.max))
