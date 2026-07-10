"""
abr_scraper.py - Scrape the Australian Business Register for NSW builder companies.

ABR (abr.business.gov.au) is the government registry of all ABN-holding entities.
Searching by business name keywords + State=NSW returns real, active, verified
building companies — no franchise issue (each ABN is a separate legal entity),
no Google Maps noise, no pay-per-listing bias.

The search returns 40 results per page. We run multiple keyword searches to cover
all relevant company name patterns (home builder, renovation builder, etc.).

Usage:
  python abr_scraper.py                  # all keywords, NSW
  python abr_scraper.py --state VIC      # change state
  python abr_scraper.py --dry-run        # print matches without inserting
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

ABR_URL = 'https://abr.business.gov.au/Search/ResultsActive'
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-AU,en;q=0.9',
}

# Keywords that find residential building companies on the ABR.
# Ordered broad → narrow to maximise distinct results.
SEARCH_TERMS = [
    'home builders',
    'home building',
    'residential builders',
    'residential building',
    'renovation builders',
    'renovation building',
    'home renovation',
    'house builders',
    'building contractors',
    'building company',
    'construction homes',
    'custom homes',
    'knockdown rebuild',
    'granny flat builders',
    'extension builders',
    'duplex builders',
    'project builders',
    'quality builders',
    'prestige homes',
    'luxury homes builders',
]

# Skip these — not residential builders
SKIP_KEYWORDS = {
    'commercial', 'civil', 'infrastructure', 'engineering', 'electrical',
    'plumbing', 'hvac', 'fire protection', 'asbestos', 'scaffolding',
    'plant hire', 'earthmoving', 'excavat', 'labour hire',
    'supply', 'supplies', 'materials', 'hardware', 'ceramics', 'tiles',
    'insurance', 'finance', 'mortgage', 'realty', 'real estate',
    'management consulting', 'software', 'technology',
}

# National franchise companies — skip them
FRANCHISE_KEYWORDS = {
    'gj gardner', 'masterton', 'metricon', 'henley homes', 'simonds',
    'burbank', 'mcdonald jones', 'wisdom homes', 'clarendon homes',
    'hotondo', 'stroud homes', 'porter davis',
}


def _is_suitable(name: str) -> bool:
    n = name.lower()
    if any(kw in n for kw in SKIP_KEYWORDS):
        return False
    if any(kw in n for kw in FRANCHISE_KEYWORDS):
        return False
    return True


def _extract_postcode_state(location_text: str) -> tuple[str | None, str | None]:
    """'2150         NSW' → ('2150', 'NSW')"""
    m = re.search(r'(\d{4})\s+([A-Z]{2,3})', location_text)
    if m:
        return m.group(1), m.group(2)
    return None, None


def scrape_keyword(session: requests.Session, keyword: str, state: str, max_pages: int = 10) -> list[dict]:
    results = []
    seen_abns: set[str] = set()

    for page in range(max_pages):
        params = {
            'SearchText': keyword,
            'CurrentPageIndex': page,
            'ABNStatus': 'Active',
            'SearchType': 'NM',
            'State': state,
        }
        try:
            r = session.get(ABR_URL, params=params, headers=HEADERS, timeout=15)
            r.raise_for_status()
        except Exception as e:
            log.warning(f"  Request failed (keyword={keyword!r} page={page}): {e}")
            break

        soup = BeautifulSoup(r.text, 'html.parser')
        table = soup.find('table')
        if not table:
            break

        rows = table.find_all('tr')[1:]  # skip header row
        if not rows:
            break

        page_count = 0
        for row in rows:
            cells = row.find_all('td')
            if len(cells) < 4:
                continue

            # Cell 0: "12 345 678 901Active"
            abn_cell = cells[0].get_text(strip=True)
            abn = re.sub(r'\D', '', abn_cell)[:11]  # digits only

            if not abn or abn in seen_abns:
                continue
            seen_abns.add(abn)

            name = cells[1].get_text(strip=True)
            if not name or not _is_suitable(name):
                continue

            location_text = cells[3].get_text(strip=True) if len(cells) > 3 else ''
            postcode, entity_state = _extract_postcode_state(location_text)

            # Double-check state (sometimes mixed in results)
            if entity_state and entity_state != state:
                continue

            results.append({
                'company_name': name,
                'abn': abn,
                'postcode': postcode,
                'source': 'abr',
            })
            page_count += 1

        log.debug(f"    keyword={keyword!r} page={page}: {page_count} matches")

        if len(rows) < 40:
            break  # last page

        time.sleep(0.6)

    return results


def run(state: str = 'NSW', max_pages: int = 10, dry_run: bool = False) -> dict:
    supabase = None if dry_run else _get_client()

    # Load existing names to skip duplicates
    existing_lower: set[str] = set()
    if supabase:
        log.info("Loading existing prospect names...")
        existing = supabase.table('builder_prospects').select('company_name').limit(5000).execute()
        existing_lower = {r['company_name'].lower() for r in (existing.data or [])}
        log.info(f"  {len(existing_lower)} existing prospects loaded")

    session = requests.Session()
    all_results: dict[str, dict] = {}  # abn → record (dedup across keywords)
    total_inserted = 0
    total_skipped = 0

    for keyword in SEARCH_TERMS:
        log.info(f"Searching ABR: '{keyword}' ({state})")
        found = scrape_keyword(session, keyword, state, max_pages)
        new = 0
        for item in found:
            if item['abn'] not in all_results:
                all_results[item['abn']] = item
                new += 1
        log.info(f"  {len(found)} results, {new} new unique (total unique: {len(all_results)})")
        time.sleep(0.8)

    log.info(f"\nTotal unique ABR results: {len(all_results)}")

    if dry_run:
        for item in list(all_results.values())[:20]:
            log.info(f"  [DRY RUN] {item['company_name']} | ABN {item['abn']} | {item.get('postcode')} {state}")
        return {'inserted': 0, 'skipped': 0, 'found': len(all_results)}

    # Resolve suburb for each result, then immediately enrich to find website.
    # A record is only written to builder_prospects AFTER enrichment confirms
    # it has company_name + website + postal_address. Nothing partial is inserted.
    from acquisition.enricher import enrich_new_candidate

    for item in all_results.values():
        name = item['company_name']
        if name.lower() in existing_lower:
            total_skipped += 1
            continue

        postcode = item.get('postcode', '')
        postal_address = None
        if postcode:
            try:
                sub_resp = supabase.table('suburbs').select('name').eq('postcode', postcode).eq('state', state).limit(1).execute()
                if sub_resp.data:
                    suburb = sub_resp.data[0]['name']
                    postal_address = f"{suburb} {state} {postcode}"
                else:
                    postal_address = f"{state} {postcode}"
            except Exception:
                postal_address = f"{state} {postcode}"

        if not postal_address:
            total_skipped += 1
            continue

        candidate = {
            'company_name': name,
            'abn': item.get('abn'),
            'postal_address': postal_address,
            'source': 'abr',
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

    log.info(f"\nDone — inserted: {total_inserted}, skipped (no website found / dup / unsuitable): {total_skipped}")
    return {'inserted': total_inserted, 'skipped': total_skipped}


def lookup_abn_by_name(session: requests.Session, company_name: str, state: str = 'NSW') -> str | None:
    """Search ABR by exact company name. Returns the ABN string of the first active match, or None."""
    params = {
        'SearchText': company_name,
        'CurrentPageIndex': 0,
        'ABNStatus': 'Active',
        'SearchType': 'NM',
        'State': state,
    }
    try:
        r = session.get(ABR_URL, params=params, headers=HEADERS, timeout=15)
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')
        table = soup.find('table')
        if not table:
            return None
        for row in table.find_all('tr')[1:]:
            cells = row.find_all('td')
            if len(cells) < 2:
                continue
            abn_cell = cells[0].get_text(strip=True)
            abn = re.sub(r'\D', '', abn_cell)[:11]
            name_cell = cells[1].get_text(strip=True).lower()
            if abn and company_name.lower()[:20] in name_cell:
                return abn
    except Exception as e:
        log.debug(f"ABR name lookup failed for {company_name!r}: {e}")
    return None


def get_full_address(session: requests.Session, abn: str) -> str | None:
    """Visit the ABN detail page and return the full registered street address, or None."""
    try:
        r = session.get(
            f'https://abr.business.gov.au/ABN/View',
            params={'id': abn},
            headers=HEADERS,
            timeout=15,
        )
        r.raise_for_status()
        soup = BeautifulSoup(r.text, 'html.parser')

        # The ABR detail page shows address in a <td> after a <th> labelled 'Main business location'
        for th in soup.find_all('th'):
            if 'main business location' in th.get_text(strip=True).lower():
                td = th.find_next_sibling('td')
                if td:
                    addr = td.get_text(separator=', ', strip=True)
                    addr = re.sub(r'\s+', ' ', addr).strip()
                    if addr and not addr.lower().startswith('po box') and not addr.lower().startswith('gpo box'):
                        return addr
    except Exception as e:
        log.debug(f"ABR detail page failed for ABN {abn}: {e}")
    return None


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Scrape ABR for NSW builder companies')
    parser.add_argument('--state', default='NSW', help='State code (NSW, VIC, QLD, ACT)')
    parser.add_argument('--pages', type=int, default=10, help='Max pages per keyword (40 results/page)')
    parser.add_argument('--dry-run', action='store_true', help='Print matches without inserting')
    args = parser.parse_args()
    run(args.state, args.pages, args.dry_run)
