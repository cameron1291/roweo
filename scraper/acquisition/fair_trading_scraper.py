"""
fair_trading_scraper.py - NSW Fair Trading Public Register: licensed builders.

Every residential builder operating legally in NSW must hold a licence issued by
NSW Fair Trading. This is the authoritative government source — franchise-free,
verified, and publicly accessible. Each result is a separate licensed entity
(ABN-based), so no franchise duplication.

Source: NSW Fair Trading Public Register
URL: https://www.onegov.nsw.gov.au/publicregister/

Searches for "Builder Licence" holders with Active status, paginated.
Inserts as builder_prospects with status='scraped' for the enricher to process.

Usage:
  python fair_trading_scraper.py                          # all of NSW
  python fair_trading_scraper.py --suburb Sydney          # filter by suburb
  python fair_trading_scraper.py --pages 20 --delay 1.0  # larger pull
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

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

# NSW Fair Trading Public Register API (same endpoint the browser calls)
FT_API = 'https://www.onegov.nsw.gov.au/publicregister/api/publicregister/search'

HEADERS = {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Origin': 'https://www.onegov.nsw.gov.au',
    'Referer': 'https://www.onegov.nsw.gov.au/publicregister/',
}

# Licence classes that correspond to residential builders
BUILDER_LICENCE_CLASSES = [
    'Builder Licence',
    'Contractor Licence',
]

# Filter out commercial/civil firms by keyword
SKIP_KEYWORDS = {
    'civil', 'commercial', 'infrastructure', 'engineering', 'electrical',
    'plumbing', 'hvac', 'fire', 'asbestos', 'scaffolding', 'demolition',
    'concret', 'earthwork', 'earthmoving', 'excavat',
}


def _looks_residential(name: str) -> bool:
    n = name.lower()
    return not any(kw in n for kw in SKIP_KEYWORDS)


def _search_page(session: requests.Session, licence_class: str, suburb: str, page: int, page_size: int = 50) -> dict:
    payload = {
        'keyword': '',
        'licenceClass': licence_class,
        'suburb': suburb,
        'pageNumber': page,
        'pageSize': page_size,
        'registerId': 'BCL',  # Building and Construction Licences
    }
    try:
        resp = session.post(FT_API, json=payload, headers=HEADERS, timeout=20)
        if resp.status_code == 200:
            return resp.json()
        log.warning(f"API returned {resp.status_code} for page {page}")
    except Exception as e:
        log.warning(f"API request failed (page {page}): {e}")
    return {}


def insert_prospects(supabase, prospects: list[dict], existing_lower: set) -> tuple[int, int]:
    inserted = 0
    skipped = 0

    for p in prospects:
        name = p.get('company_name', '').strip()
        if not name or name.lower() in existing_lower:
            skipped += 1
            continue

        demo_slug = re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-')[:40]
        demo_slug = demo_slug + '-' + os.urandom(3).hex()

        try:
            supabase.table('builder_prospects').insert({
                'company_name': name,
                'postal_address': p.get('postal_address'),
                'source': 'fair_trading',
                'status': 'scraped',
                'demo_slug': demo_slug,
                'qr_token': str(uuid.uuid4()),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
            }).execute()
            existing_lower.add(name.lower())
            inserted += 1
        except Exception as e:
            log.debug(f"Insert failed for {name}: {e}")
            skipped += 1

    return inserted, skipped


def run(suburb: str = '', max_pages: int = 40, delay: float = 1.2) -> dict:
    supabase = _get_client()
    session = requests.Session()

    # Cache existing prospect names to skip duplicates
    log.info("Loading existing prospect names...")
    existing = supabase.table('builder_prospects').select('company_name').limit(3000).execute()
    existing_lower = {r['company_name'].lower() for r in (existing.data or [])}
    log.info(f"  {len(existing_lower)} existing prospects loaded")

    total_inserted = 0
    total_skipped = 0

    for licence_class in BUILDER_LICENCE_CLASSES:
        log.info(f"\nSearching: licence_class='{licence_class}' suburb='{suburb or 'ALL NSW'}'")

        for page in range(1, max_pages + 1):
            data = _search_page(session, licence_class, suburb, page)

            if not data:
                log.info(f"  No data returned on page {page} — stopping")
                break

            # The API returns different shapes — handle both list and dict with 'items'
            items = []
            if isinstance(data, list):
                items = data
            elif isinstance(data, dict):
                items = data.get('items') or data.get('results') or data.get('data') or []
                # Some endpoints wrap in a 'licenceHolders' key
                if not items:
                    items = data.get('licenceHolders') or []

            if not items:
                log.info(f"  Empty results on page {page} — done")
                break

            log.info(f"  Page {page}: {len(items)} results")

            prospects = []
            for item in items:
                # Handle various key naming conventions in the API response
                name = (
                    item.get('businessName') or
                    item.get('business_name') or
                    item.get('name') or
                    item.get('licenceHolderName') or
                    item.get('LicenceHolderName') or ''
                ).strip()

                if not name or not _looks_residential(name):
                    continue

                # Status check — only active licences
                status = (
                    item.get('licenceStatus') or
                    item.get('status') or
                    item.get('Status') or ''
                ).lower()
                if status and status not in ('active', 'current', ''):
                    continue

                suburb_val = (
                    item.get('suburb') or
                    item.get('Suburb') or
                    item.get('suburbCity') or ''
                ).strip()

                address = suburb_val  # minimal — enricher will get full details from website

                prospects.append({'company_name': name, 'postal_address': address or None})

            ins, sk = insert_prospects(supabase, prospects, existing_lower)
            total_inserted += ins
            total_skipped += sk
            log.info(f"    inserted={ins} skipped={sk} (total so far: {total_inserted})")

            if len(items) < 50:
                log.info(f"  Last page reached (only {len(items)} items returned)")
                break

            time.sleep(delay)

    log.info(f"\nDone — total inserted: {total_inserted}, skipped: {total_skipped}")
    return {'inserted': total_inserted, 'skipped': total_skipped}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape NSW Fair Trading licensed builder register')
    parser.add_argument('--suburb', default='', help='Filter by suburb (blank = all NSW)')
    parser.add_argument('--pages', type=int, default=40, help='Max pages per licence class (50 results/page)')
    parser.add_argument('--delay', type=float, default=1.2, help='Delay between page requests in seconds')
    args = parser.parse_args()
    run(args.suburb, args.pages, args.delay)
