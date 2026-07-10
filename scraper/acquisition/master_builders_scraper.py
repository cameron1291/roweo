"""
master_builders_scraper.py — Scrape the Master Builders Association of NSW member directory.

mbansw.asn.au/find-a-master-builder is server-rendered Drupal. Each .card contains:
  - h2.field-content → company name
  - .views-field-field-user-last-name → contact person name
  - .views-field-field-phone → phone number
  - .views-field-field-web-address a → website URL (optional)

Pagination: ?page=N (0-indexed)
Filter by category: ?field_sub_category_target_id=... (not needed — fetch all)

Usage:
  python master_builders_scraper.py            # all pages
  python master_builders_scraper.py --dry-run  # print matches without inserting
"""

import argparse
import logging
import os
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

BASE_URL = 'https://www.mbansw.asn.au/find-a-master-builder'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-AU,en;q=0.9',
    'Referer': 'https://www.mbansw.asn.au/',
}


def scrape_page(session: requests.Session, page: int) -> list[dict]:
    """Scrape one page. page=0 is the first page."""
    params = {'page': page} if page > 0 else {}
    try:
        r = session.get(BASE_URL, params=params, headers=HEADERS, timeout=20)
        r.raise_for_status()
    except Exception as e:
        log.warning(f"  Page {page} fetch failed: {e}")
        return []

    soup = BeautifulSoup(r.text, 'html.parser')
    cards = soup.select('.card')

    if not cards:
        return []

    results = []
    for card in cards:
        # Company name — h2 inside views-field-field-business-name
        name_el = card.select_one('.views-field-field-business-name h2')
        if not name_el:
            name_el = card.find('h2')
        name = name_el.get_text(strip=True) if name_el else None
        if not name or len(name) < 3:
            continue

        # Contact person (owner/director)
        contact_el = card.select_one('.views-field-field-user-last-name .field-content')
        contact_name = contact_el.get_text(strip=True) if contact_el else None

        # Phone — strip "Phone:" prefix
        phone_el = card.select_one('.views-field-field-phone .field-content')
        phone = None
        if phone_el:
            raw_phone = phone_el.get_text(strip=True)
            phone = re.sub(r'^Phone:\s*', '', raw_phone).strip() or None

        # Website
        website_el = card.select_one('.views-field-field-web-address a.mba-link')
        website = website_el['href'].rstrip('/') if website_el else None

        results.append({
            'company_name': name,
            'website': website,
            'phone': phone,
            'owner_name': contact_name,
            'source': 'master_builders',
        })

    return results


def run(max_pages: int = 50, dry_run: bool = False) -> dict:
    supabase = None if dry_run else _get_client()
    existing_lower: set[str] = set()

    if supabase:
        log.info("Loading existing prospect names...")
        resp = supabase.table('builder_prospects').select('company_name').limit(5000).execute()
        existing_lower = {r['company_name'].lower() for r in (resp.data or [])}
        log.info(f"  {len(existing_lower)} existing prospects loaded")

    session = requests.Session()
    all_candidates: dict[str, dict] = {}  # name.lower() → record

    for page in range(max_pages):
        results = scrape_page(session, page)
        if not results:
            log.info(f"  No cards on page {page} — done")
            break

        new_this_page = 0
        for item in results:
            key = item['company_name'].lower()
            if key not in all_candidates:
                all_candidates[key] = item
                new_this_page += 1

        log.info(f"  Page {page}: {len(results)} cards, {new_this_page} new (total: {len(all_candidates)})")
        time.sleep(1.0)

    log.info(f"\nTotal unique Master Builders listings: {len(all_candidates)}")

    if dry_run:
        for item in list(all_candidates.values())[:20]:
            log.info(
                f"  [DRY RUN] {item['company_name']} | "
                f"website={item.get('website') or '—'} | "
                f"phone={item.get('phone') or '—'} | "
                f"contact={item.get('owner_name') or '—'}"
            )
        return {'inserted': 0, 'skipped': 0, 'found': len(all_candidates)}

    from acquisition.enricher import enrich_new_candidate
    from acquisition.abr_scraper import lookup_abn_by_name

    total_inserted = 0
    total_skipped = 0

    for item in all_candidates.values():
        name = item['company_name']
        if name.lower() in existing_lower:
            total_skipped += 1
            continue

        # ABN lookup — bonus field only (ABR public data only shows postcode, not street address)
        abn = lookup_abn_by_name(session, name)
        if abn:
            time.sleep(0.3)

        candidate = {
            'company_name': name,
            'website': item.get('website'),   # may be None; enricher will try DuckDuckGo
            'phone': item.get('phone'),
            'owner_name': item.get('owner_name'),
            'postal_address': None,            # enricher extracts full address from website contact page
            'abn': abn,
            'source': 'master_builders',
        }

        inserted = enrich_new_candidate(supabase, candidate, existing_lower)
        if inserted:
            existing_lower.add(name.lower())
            total_inserted += 1
            if total_inserted % 10 == 0:
                log.info(f"  ...{total_inserted} inserted")
        else:
            total_skipped += 1

        time.sleep(1.5)

    log.info(f"\nDone — inserted: {total_inserted}, skipped: {total_skipped}")
    return {'inserted': total_inserted, 'skipped': total_skipped}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape Master Builders NSW member directory')
    parser.add_argument('--pages', type=int, default=50, help='Max pages to scrape (9 cards each)')
    parser.add_argument('--dry-run', action='store_true', help='Print matches without inserting')
    args = parser.parse_args()
    run(args.pages, args.dry_run)
