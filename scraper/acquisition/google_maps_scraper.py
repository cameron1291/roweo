"""
Scrape builder prospects from Google Maps — headed mode, Mac only.

Clicks into each listing to pull company name, address, phone AND website
from the Google Maps detail panel. Gives complete prospect data in one pass.

Use targeted search queries to surface mid-size companies, not sole traders:
  "building company Sydney NSW"
  "renovation company Sydney NSW"
  "home extension company Sydney"
  "residential builder Parramatta"

Usage:
  python google_maps_scraper.py --query "building company Sydney NSW" --max 30
  python google_maps_scraper.py --query "home extension company Melbourne VIC" --max 30

Only run manually on the Mac during active outreach — not automated.
"""

import asyncio
import argparse
import logging
import os
import re
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

# Reject obvious 1-man trades and non-builders
SKIP_WORDS = {
    'plumb', 'electr', 'tile', 'tiling', 'paint', 'landscap', 'clean',
    'scaff', 'labour', 'labor', 'hire', 'supply', 'material',
    'search', 'find', 'compare', 'request', 'sponsored', 'ad ·',
    'open now', 'closed', 'directions',
}


def _looks_like_company(name: str) -> bool:
    if not name or len(name) < 4 or len(name) > 80:
        return False
    n = name.lower()
    return not any(w in n for w in SKIP_WORDS)


async def scrape_google_maps(query: str, max_results: int = 30) -> list[dict]:
    from playwright.async_api import async_playwright

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=['--disable-blink-features=AutomationControlled'],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={'width': 1440, 'height': 900},
        )
        page = await context.new_page()
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        search_url = f"https://www.google.com.au/maps/search/{query.replace(' ', '+')}/"
        log.info(f"Opening: {search_url}")
        await page.goto(search_url, wait_until="networkidle", timeout=45000)
        await page.wait_for_timeout(3000)

        # Scroll the results panel to load listings
        feed = page.locator('[role="feed"]')
        for _ in range(max(4, max_results // 6)):
            await feed.evaluate("el => el.scrollBy(0, 2500)")
            await page.wait_for_timeout(1000)

        # Collect all result cards
        cards = await page.locator('[role="feed"] [jsaction]').all()
        log.info(f"Found {len(cards)} cards — clicking each for full details")

        seen_names: set[str] = set()

        for card in cards:
            if len(results) >= max_results:
                break

            try:
                # Get name from card before clicking
                name_el = card.locator('div[class*="fontHeadline"], div[class*="qBF1Pd"]').first
                card_name = ''
                if await name_el.count() > 0:
                    card_name = (await name_el.inner_text()).strip().split('\n')[0].strip()

                if not _looks_like_company(card_name):
                    continue
                if card_name in seen_names:
                    continue

                # Click to open detail panel
                await card.click()
                await page.wait_for_timeout(2000)

                # Extract from right-hand detail panel
                name = card_name

                # Phone — multiple selector strategies
                phone = None
                for sel in ['[data-item-id="phone"] [aria-label]', 'button[data-item-id*="phone"]', '[aria-label^="Phone"]', '[data-tooltip*="0"]']:
                    el = page.locator(sel).first
                    if await el.count() > 0:
                        phone = await el.get_attribute('aria-label') or await el.get_attribute('data-tooltip') or await el.inner_text()
                        phone = phone.replace('Phone:', '').replace('phone:', '').strip() if phone else None
                        if phone and re.search(r'\d{8,}', phone.replace(' ', '')):
                            break
                        phone = None

                # Website
                website = None
                for sel in ['a[data-item-id="authority"]', 'a[aria-label*="website" i]', 'a[href^="http"][data-item-id]']:
                    el = page.locator(sel).first
                    if await el.count() > 0:
                        website = await el.get_attribute('href')
                        if website and 'google.com' not in website and 'maps' not in website:
                            break
                        website = None

                # Address
                address = None
                for sel in ['[data-item-id*="address"] [aria-label]', 'button[data-item-id*="address"]', '[aria-label*="Address"]']:
                    el = page.locator(sel).first
                    if await el.count() > 0:
                        address = await el.get_attribute('aria-label') or await el.inner_text()
                        address = address.replace('Address:', '').replace('address:', '').strip() if address else None
                        if address:
                            break
                        address = None

                seen_names.add(name)
                results.append({
                    'company_name': name,
                    'postal_address': address,
                    'phone': phone,
                    'website': website,
                    'source': 'google_maps',
                })
                log.info(f"  ✓ {name} | {phone or '—'} | {website or '—'}")

            except Exception as e:
                log.debug(f"Card error: {e}")

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

        existing = supabase.table('builder_prospects') \
            .select('id') \
            .ilike('company_name', p['company_name']) \
            .limit(1) \
            .execute()

        if existing.data:
            skipped += 1
            continue

        demo_slug = re.sub(r'[^a-z0-9]+', '-', p['company_name'].lower()).strip('-')[:40]
        demo_slug = demo_slug + '-' + os.urandom(3).hex()

        supabase.table('builder_prospects').insert({
            **{k: v for k, v in p.items() if v is not None},
            'status': 'scraped',
            'demo_slug': demo_slug,
            'qr_token': str(uuid.uuid4()),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }).execute()
        inserted += 1

    return {'inserted': inserted, 'skipped': skipped}


async def run(query: str, max_results: int = 30):
    log.info(f"Google Maps: '{query}' max={max_results}")
    prospects = await scrape_google_maps(query, max_results)
    log.info(f"Scraped {len(prospects)} prospects")
    result = insert_prospects(prospects)
    log.info(f"Done — inserted: {result['inserted']}, skipped: {result['skipped']}")
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape builder prospects from Google Maps (headed)')
    parser.add_argument('--query', default='building company Sydney NSW', help='Google Maps search query')
    parser.add_argument('--max', type=int, default=30, help='Max results')
    args = parser.parse_args()
    asyncio.run(run(args.query, args.max))
