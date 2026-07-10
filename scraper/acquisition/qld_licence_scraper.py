"""
qld_licence_scraper.py — Load QLD QBCC contractor licence register and enrich builder records.

Data source: Queensland Building and Construction Commission (QBCC) licensed contractor register.
Download URL: https://www.data.qld.gov.au/dataset/qbcc-licensed-contractors-register
CSV file (UTF-16): builder-contractor-qbcc-licensee-register.csv (~81 MB)

This script:
  1. Downloads the CSV (or uses a cached copy)
  2. Filters to active Company-type Builder-class licences in QLD
  3. Deduplicates by company name (one record per company)
  4. Calls enrich_new_candidate() per record with address from register
  5. Only inserts if record passes 3-field gate: name + website + full street address

Usage:
  python qld_licence_scraper.py                    # all active QLD builders
  python qld_licence_scraper.py --limit 500        # stop after 500 attempts
  python qld_licence_scraper.py --dry-run          # print records without inserting
  python qld_licence_scraper.py --refresh          # re-download the CSV
"""

import argparse
import csv
import logging
import os
import re
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger(__name__)

CSV_URL = (
    'https://www.data.qld.gov.au/dataset/980b6499-c0b4-491b-ba9c-1c7506368a50'
    '/resource/25608781-b28c-44f8-8545-0ab18d84082f'
    '/download/builder-contractor-qbcc-licensee-register.csv'
)
CSV_CACHE = os.path.join(os.path.dirname(__file__), '..', 'data', 'qld_contractor_licence.csv')

# Core builder licence classes only (excludes trade contractors)
BUILDER_CLASSES = {
    'Builder - Low Rise',
    'Builder - Open',
    'Builder - Medium Rise',
    'Builder - Project Management Services',
    'Builder - High Rise',
}

FRANCHISE_NAMES = {
    'gj gardner', 'masterton', 'metricon', 'henley', 'porter davis',
    'simonds', 'burbank', 'mcdonald jones', 'wisdom homes', 'clarendon',
    'hotondo', 'stroud homes', 'orbit homes', 'plantation homes', 'dale alcock',
    'coral homes', 'brighton homes', 'privium', 'metricon', 'plantation',
}


def _download_csv(force: bool = False) -> str:
    """Download the CSV if not cached. Returns local path."""
    os.makedirs(os.path.dirname(CSV_CACHE), exist_ok=True)

    if os.path.exists(CSV_CACHE) and not force:
        log.info(f'Using cached CSV: {CSV_CACHE}')
        return CSV_CACHE

    log.info(f'Downloading QLD QBCC CSV from data portal...')
    import requests
    r = requests.get(CSV_URL, timeout=300, stream=True, allow_redirects=True)
    r.raise_for_status()
    with open(CSV_CACHE, 'wb') as f:
        for chunk in r.iter_content(chunk_size=65536):
            f.write(chunk)
    size_mb = os.path.getsize(CSV_CACHE) / (1024 * 1024)
    log.info(f'Downloaded {size_mb:.1f} MB → {CSV_CACHE}')
    return CSV_CACHE


def _normalise_address(raw: str) -> str:
    """Convert ALL-CAPS spaced address to Title Case.
    '7 GARNET COURT KENMORE QLD 4069' → '7 Garnet Court Kenmore QLD 4069'
    """
    if not raw:
        return ''
    result = raw.strip().title()
    # Restore state abbreviation to uppercase
    result = re.sub(r'\bQld\b', 'QLD', result)
    return result


def _is_franchise(name: str) -> bool:
    n = name.lower()
    return any(f in n for f in FRANCHISE_NAMES)


def load_builders(csv_path: str) -> list[dict]:
    """Read the CSV and return list of active QLD builder company records (deduplicated by name)."""
    companies: dict[str, dict] = {}

    try:
        with open(csv_path, encoding='utf-16') as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Filter: companies only (not individuals)
                if row.get('Licence Type CODE', '').strip() != 'C':
                    continue

                # Filter: builder class licences only
                licence_class = row.get('Licence Class Type', '').strip()
                if licence_class not in BUILDER_CLASSES:
                    continue

                name = row.get('Licensee Name', '').strip()
                if not name or len(name) < 3:
                    continue

                # Skip franchises
                if _is_franchise(name):
                    continue

                address_raw = row.get('Licensee Business Address', '').strip()
                if not address_raw or 'QLD' not in address_raw.upper():
                    continue

                # Deduplicate — keep first record per company name
                name_lower = name.lower()
                if name_lower in companies:
                    continue

                address = _normalise_address(address_raw)
                abn = row.get('ABN', '').strip() or None
                acn = row.get('ACN', '').strip() or None
                licence_num = row.get('Licence Number', '').strip() or None

                companies[name_lower] = {
                    'company_name': name,
                    'postal_address': address,
                    'abn': abn,
                    'acn': acn,
                    'builder_licence': licence_num,
                    'source': 'qld_licence',
                }

    except UnicodeDecodeError:
        # Fallback: try utf-8
        log.warning('UTF-16 decode failed, trying UTF-8...')
        with open(csv_path, encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row.get('Licence Type CODE', '').strip() != 'C':
                    continue
                licence_class = row.get('Licence Class Type', '').strip()
                if licence_class not in BUILDER_CLASSES:
                    continue
                name = row.get('Licensee Name', '').strip()
                if not name or len(name) < 3:
                    continue
                if _is_franchise(name):
                    continue
                address_raw = row.get('Licensee Business Address', '').strip()
                if not address_raw or 'QLD' not in address_raw.upper():
                    continue
                name_lower = name.lower()
                if name_lower in companies:
                    continue
                address = _normalise_address(address_raw)
                companies[name_lower] = {
                    'company_name': name,
                    'postal_address': address,
                    'abn': row.get('ABN', '').strip() or None,
                    'acn': row.get('ACN', '').strip() or None,
                    'builder_licence': row.get('Licence Number', '').strip() or None,
                    'source': 'qld_licence',
                }

    result = list(companies.values())
    log.info(f'Loaded {len(result)} unique active QLD builder company records from CSV')
    return result


def run(limit: int = 0, dry_run: bool = False, refresh_csv: bool = False) -> dict:
    csv_path = _download_csv(force=refresh_csv)
    builders = load_builders(csv_path)

    if not builders:
        log.error('No builders loaded from CSV')
        return {'inserted': 0, 'skipped': 0}

    if dry_run:
        log.info(f'\n[DRY RUN] First 20 of {len(builders)} records:')
        for b in builders[:20]:
            log.info(f"  {b['company_name']} | {b['postal_address']} | {b['builder_licence']}")
        return {'inserted': 0, 'skipped': 0, 'found': len(builders)}

    supabase = _get_client()
    log.info('Loading existing prospect names...')
    resp = supabase.table('builder_prospects').select('company_name').limit(20000).execute()
    existing_lower = {r['company_name'].lower() for r in (resp.data or [])}
    log.info(f'  {len(existing_lower)} existing prospects loaded')

    from acquisition.enricher import enrich_new_candidate

    total_inserted = 0
    total_skipped = 0
    attempts = 0

    for b in builders:
        if limit and attempts >= limit:
            break

        name = b['company_name']
        if name.lower() in existing_lower:
            total_skipped += 1
            continue

        attempts += 1
        log.info(f'[{attempts}] {name} | {b["postal_address"]}')

        candidate = {
            'company_name': name,
            'postal_address': b['postal_address'],
            'builder_licence': b.get('builder_licence'),
            'abn': b.get('abn'),
            'website': None,
            'source': 'qld_licence',
        }

        inserted = enrich_new_candidate(supabase, candidate, existing_lower)
        if inserted:
            existing_lower.add(name.lower())
            total_inserted += 1
            if total_inserted % 10 == 0:
                log.info(f'  ✓ {total_inserted} inserted so far')
        else:
            total_skipped += 1

        time.sleep(1.5)

    log.info(f'\nDone — inserted: {total_inserted}, skipped: {total_skipped}')
    return {'inserted': total_inserted, 'skipped': total_skipped}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Load QLD QBCC builder licence register into prospects DB')
    parser.add_argument('--limit', type=int, default=0, help='Max records to attempt (0 = all)')
    parser.add_argument('--dry-run', action='store_true', help='Print records without inserting')
    parser.add_argument('--refresh', action='store_true', help='Re-download the CSV')
    args = parser.parse_args()
    run(args.limit, args.dry_run, args.refresh)
