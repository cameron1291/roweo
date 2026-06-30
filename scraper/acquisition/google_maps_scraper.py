"""
Scrape builder prospects from Google Maps (headed mode, Mac only).

Usage:
  python google_maps_scraper.py --query "renovation builder Sydney NSW" --max 40
  python google_maps_scraper.py --query "extension builder Melbourne VIC" --max 40 --headless

Runs headed by default so Google Maps treats it as a real browser.
Only run this manually on the Mac when doing active outreach — not automated.

Inserts rows into builder_prospects with status='scraped'.
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

SKIP_WORDS = {
    'search', 'find', 'compare', 'get quotes', 'request', 'read more',
    'see all', 'load more', 'view', 'menu', 'open', 'closed',
    'directions', 'call', 'website', 'share', 'save', 'photos',
    'reviews', 'nearby', 'sponsored', 'ad ·',
}


def _looks_like_company(name: str) -> bool:
    name_lower = name.lower().strip()
    if len(name) < 4 or len(name) > 80:
        return False
    if any(w in name_lower for w in SKIP_WORDS):
        return False
    if name_lower.startswith(('http', 'www.', '+61', '0', '(')):
        return False
    return True


async def scrape_google_maps(query: str, max_results: int = 40, headless: bool = False) -> list[dict]:
    from playwright.async_api import async_playwright

    results = []

    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=headless,
            args=['--disable-blink-features=AutomationControlled'],
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            viewport={'width': 1400, 'height': 900},
        )
        page = await context.new_page()
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        search_url = f"https://www.google.com.au/maps/search/{query.replace(' ', '+')}/"
        log.info(f"Opening Google Maps: {search_url}")
        await page.goto(search_url, wait_until="networkidle", timeout=45000)
        await page.wait_for_timeout(3000)

        # Scroll the results panel to load more
        feed = page.locator('[role="feed"]')
        for i in range(max(3, max_results // 8)):
            await feed.evaluate("el => el.scrollBy(0, 2500)")
            await page.wait_for_timeout(1200)

        # Strategy 1: Look for result cards with the feed
        seen = set()
        cards = await page.locator('[role="feed"] [jsaction]').all()
        log.info(f"Found {len(cards)} feed cards")

        for card in cards:
            try:
                # Business name is usually in the first heading-like element
                name_el = card.locator('div[class*="fontHeadline"], h2, h3, [aria-label]').first
                name = ''
                if await name_el.count() > 0:
                    name = await name_el.inner_text()
                    if not name:
                        name = await name_el.get_attribute('aria-label') or ''

                name = name.strip().split('\n')[0].strip()
                if not _looks_like_company(name) or name in seen:
                    continue
                seen.add(name)

                # Try to get address from card
                addr_el = card.locator('div[class*="fontBody"] span').first
                address = ''
                if await addr_el.count() > 0:
                    address = await addr_el.inner_text()

                results.append({
                    'company_name': name,
                    'postal_address': address.strip() or None,
                    'source': 'google_maps',
                })
                log.info(f"  + {name}")

                if len(results) >= max_results:
                    break
            except Exception as e:
                log.debug(f"Card error: {e}")

        # Strategy 2: If we didn't get enough, try aria-labels on the cards
        if len(results) < 5:
            log.info("Trying aria-label strategy...")
            labeled = await page.locator('[role="feed"] [aria-label]').all()
            for el in labeled:
                try:
                    label = (await el.get_attribute('aria-label') or '').strip()
                    if _looks_like_company(label) and label not in seen:
                        seen.add(label)
                        results.append({'company_name': label, 'source': 'google_maps'})
                        log.info(f"  + {label} (aria)")
                        if len(results) >= max_results:
                            break
                except Exception:
                    pass

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
            **p,
            'status': 'scraped',
            'demo_slug': demo_slug,
            'qr_token': str(uuid.uuid4()),
            'created_at': datetime.now(timezone.utc).isoformat(),
            'updated_at': datetime.now(timezone.utc).isoformat(),
        }).execute()
        inserted += 1
        log.info(f"  Saved: {p['company_name']}")

    return {'inserted': inserted, 'skipped': skipped}


async def run(query: str, max_results: int = 40, headless: bool = False):
    log.info(f"Google Maps scraper: '{query}' max={max_results} headless={headless}")
    prospects = await scrape_google_maps(query, max_results, headless)
    log.info(f"Scraped {len(prospects)} prospects")
    result = insert_prospects(prospects)
    log.info(f"Done — inserted: {result['inserted']}, skipped: {result['skipped']}")
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--query', default='renovation builder Sydney NSW', help='Google Maps search query')
    parser.add_argument('--max', type=int, default=40, help='Max results')
    parser.add_argument('--headless', action='store_true', help='Run headless (default: headed/visible)')
    args = parser.parse_args()
    asyncio.run(run(args.query, args.max, args.headless))
