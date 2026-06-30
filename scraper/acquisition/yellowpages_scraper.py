"""
yellowpages_scraper.py — Scrape builder prospects from Yellow Pages Australia.

Yellow Pages is server-side rendered HTML — no Playwright needed.
Returns company name, address, phone, website for each listing.
Much more reliable than Google Maps for 5-50 person firms.

Usage:
  python yellowpages_scraper.py --category builders --location sydney-nsw --pages 5
  python yellowpages_scraper.py --category home-renovations --location melbourne-vic --pages 5

Categories (append -[state] to location):
  builders, home-renovations, extensions-renovations, granny-flat-builders,
  renovation-builders, building-contractors, home-extensions

Inserts builder_prospects rows with status='scraped'.
"""

import argparse
import logging
import os
import re
import sys
import time
import uuid
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-AU,en;q=0.9',
}

# Filter out obviously wrong businesses — 1-man trades, material suppliers, etc.
SKIP_KEYWORDS = {
    'supply', 'supplies', 'materials', 'hardware', 'hire', 'hire co',
    'labour', 'labor', 'scaffolding', 'scaffold', 'demolition only',
    'plumbing', 'electrical', 'electrician', 'plumber', 'tiling only',
    'painting only', 'landscaping', 'cleaning',
}


def _is_valid_prospect(name: str) -> bool:
    if not name or len(name) < 4 or len(name) > 80:
        return False
    name_lower = name.lower()
    return not any(kw in name_lower for kw in SKIP_KEYWORDS)


def scrape_page(category: str, location: str, page: int) -> list[dict]:
    url = f"https://www.yellowpages.com.au/find/{category}/{location}"
    params = {} if page == 1 else {'page': str(page)}

    try:
        resp = requests.get(url, headers=HEADERS, params=params, timeout=15)
        resp.raise_for_status()
    except Exception as e:
        log.warning(f"Failed to fetch page {page}: {e}")
        return []

    soup = BeautifulSoup(resp.text, 'html.parser')

    # Yellow Pages listing structure — each business is in .result-row
    listings = soup.select('.result-row, .listing-result, [class*="organic"], [data-testid*="listing"]')

    if not listings:
        # Fallback: try any div with an h2 inside the main content
        listings = soup.select('main .listing, main article, main [class*="result"]')

    results = []
    for listing in listings:
        try:
            # Company name
            name_el = listing.select_one('.listing-name, .name, h2, h3, [class*="business-name"]')
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            if not _is_valid_prospect(name):
                continue

            # Address
            addr_el = listing.select_one('.listing-address, .address, [class*="address"], [itemprop="streetAddress"]')
            address = addr_el.get_text(strip=True) if addr_el else None

            # Phone
            phone_el = listing.select_one('[class*="phone"], [itemprop="telephone"], a[href^="tel:"]')
            phone = None
            if phone_el:
                phone = phone_el.get_text(strip=True) or phone_el.get('href', '').replace('tel:', '')
                phone = re.sub(r'\s+', ' ', phone).strip()

            # Website
            website_el = listing.select_one('a.visit-website, a[class*="website"], a[data-analytics*="website"]')
            website = None
            if website_el:
                href = website_el.get('href', '')
                # YP uses redirect URLs — extract the actual URL from the query string
                if 'yellowpages.com.au/external' in href or 'url=' in href:
                    match = re.search(r'url=([^&]+)', href)
                    if match:
                        from urllib.parse import unquote
                        website = unquote(match.group(1))
                elif href.startswith('http'):
                    website = href

            results.append({
                'company_name': name,
                'postal_address': address,
                'phone': phone,
                'website': website,
                'source': 'yellow_pages',
            })
            log.info(f"  + {name}" + (f" | {website}" if website else ''))

        except Exception as e:
            log.debug(f"Listing parse error: {e}")

    log.info(f"Page {page}: {len(results)} listings extracted")
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


def run(category: str = 'builders', location: str = 'sydney-nsw', max_pages: int = 5) -> dict:
    log.info(f"Yellow Pages scraper: category={category} location={location} pages={max_pages}")
    all_prospects = []

    for page in range(1, max_pages + 1):
        prospects = scrape_page(category, location, page)
        if not prospects:
            log.info(f"No results on page {page} — stopping")
            break
        all_prospects.extend(prospects)
        if page < max_pages:
            time.sleep(1.5)  # polite delay

    log.info(f"Total scraped: {len(all_prospects)}")
    result = insert_prospects(all_prospects)
    log.info(f"Done — inserted: {result['inserted']}, skipped (dup): {result['skipped']}")
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--category', default='builders', help='YP category slug e.g. builders, home-renovations')
    parser.add_argument('--location', default='sydney-nsw', help='Location slug e.g. sydney-nsw, melbourne-vic, brisbane-qld')
    parser.add_argument('--pages', type=int, default=5, help='Number of pages to scrape (10 results per page)')
    args = parser.parse_args()
    run(args.category, args.location, args.pages)
