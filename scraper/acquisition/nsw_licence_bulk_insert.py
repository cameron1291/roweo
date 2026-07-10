"""
nsw_licence_bulk_insert.py — Direct-insert all NSW builder organisations from licence register.

No website search — inserts name + address + licence immediately.
Website/email enrichment is handled separately by enricher.py.

Filters applied:
  - Sheet3 (organisations) only — individuals/sole traders already excluded
  - Active licences (not expired)
  - NSW address
  - Builder class licence
  - Not a franchise national builder
  - Not an individual-named company (e.g. "John Smith Building Pty Ltd")

Usage:
  python nsw_licence_bulk_insert.py           # insert all
  python nsw_licence_bulk_insert.py --dry-run # count without inserting
"""

import argparse
import logging
import os
import re
import sys
import uuid
from datetime import date, datetime

import openpyxl

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(message)s')
log = logging.getLogger(__name__)

EXCEL_CACHE = os.path.join(os.path.dirname(__file__), '..', 'data', 'nsw_contractor_licence.xlsx')

BUILDER_CLASSES = {'builder', 'general building work', 'full building work', 'building work'}

FRANCHISE_NAMES = {
    'gj gardner', 'masterton', 'metricon', 'henley', 'porter davis',
    'simonds', 'burbank', 'mcdonald jones', 'wisdom homes', 'clarendon',
    'hotondo', 'stroud homes', 'orbit homes', 'plantation homes', 'dale alcock',
}

# Matches "John Smith Building Pty Ltd" — two proper-name words then a trade term
# Filters out incorporated sole traders (1-man operations with a company name)
_INDIVIDUAL_CO_RE = re.compile(
    r'^[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\s+'
    r'(building|construction|constructions|builder|builders|homes|home|'
    r'renovation|renovations|carpentry|concrete|concreting|roofing|'
    r'maintenance|plumbing|painting|tiling|landscaping|earthworks|'
    r'electrical|plastering|bricklaying|cabinet|joinery|'
    r'interiors|projects|services|solutions|group)\b',
    re.IGNORECASE,
)


def _normalise_address(raw: str) -> str:
    parts = [p.strip().title() for p in raw.split(',')]
    result = ', '.join(parts)
    result = re.sub(r'\b(Nsw|Act|Vic|Qld|Sa|Wa|Tas|Nt)\b', lambda m: m.group().upper(), result)
    return result


def _is_individual_company(name: str) -> bool:
    """True if name looks like a sole trader with a Pty Ltd wrapper."""
    return bool(_INDIVIDUAL_CO_RE.match(name))


def load_builders(excel_path: str) -> list[dict]:
    today = date.today()
    wb = openpyxl.load_workbook(excel_path, read_only=True, data_only=True)
    ws = wb['Sheet3']

    results = []
    seen: set[str] = set()

    for row in ws.iter_rows(min_row=3, values_only=True):
        if not row or not row[0]:
            continue

        licence_num = str(row[0]).strip()
        expiry = row[2]
        name = str(row[3]).strip() if row[3] else ''
        address_raw = str(row[5]).strip() if row[5] else ''
        abn = str(row[8]).strip() if len(row) > 8 and row[8] else None
        classes = str(row[9]).strip() if len(row) > 9 and row[9] else ''

        if not any(bc in classes.lower() for bc in BUILDER_CLASSES):
            continue
        if 'NSW' not in address_raw.upper():
            continue

        if isinstance(expiry, datetime):
            expiry_date = expiry.date()
        elif isinstance(expiry, date):
            expiry_date = expiry
        else:
            expiry_date = today
        if expiry_date < today:
            continue

        name = re.sub(r'\s+', ' ', name).strip()
        if not name or len(name) < 3:
            continue

        name_lower = name.lower()
        if any(f in name_lower for f in FRANCHISE_NAMES):
            continue
        if name_lower in seen:
            continue

        # Filter individual-named companies (1-man operators with Pty Ltd)
        if _is_individual_company(name):
            continue

        seen.add(name_lower)
        results.append({
            'company_name': name,
            'postal_address': _normalise_address(address_raw),
            'builder_licence': licence_num,
            'abn': abn,
        })

    log.info(f'Loaded {len(results)} records after filtering')
    return results


def run(dry_run: bool = False) -> dict:
    log.info(f'Loading Excel: {EXCEL_CACHE}')
    builders = load_builders(EXCEL_CACHE)

    if not builders:
        log.error('No records loaded')
        return {'inserted': 0, 'skipped': 0}

    if dry_run:
        log.info(f'[DRY RUN] Would insert up to {len(builders)} records')
        log.info('Sample (first 10):')
        for b in builders[:10]:
            log.info(f"  {b['company_name']} | {b['postal_address']}")
        return {'found': len(builders)}

    supabase = _get_client()
    log.info('Loading existing records...')
    existing_lower: set[str] = set()
    offset = 0
    while True:
        resp = supabase.table('builder_prospects').select('company_name').range(offset, offset + 999).execute()
        if not resp.data:
            break
        existing_lower.update(r['company_name'].lower() for r in resp.data)
        offset += 1000
        if len(resp.data) < 1000:
            break
    log.info(f'  {len(existing_lower)} already in DB')

    inserted = 0
    skipped = 0
    batch = []

    for b in builders:
        if b['company_name'].lower() in existing_lower:
            skipped += 1
            continue

        batch.append({
            'id': str(uuid.uuid4()),
            'company_name': b['company_name'],
            'postal_address': b['postal_address'],
            'builder_licence': b['builder_licence'],
            'abn': b['abn'],
            'source': 'nsw_licence',
            'status': 'scraped',
            'website': None,
            'email': None,
        })

        if len(batch) >= 100:
            supabase.table('builder_prospects').insert(batch).execute()
            inserted += len(batch)
            log.info(f'  Inserted batch — {inserted} total so far')
            batch = []

    if batch:
        supabase.table('builder_prospects').insert(batch).execute()
        inserted += len(batch)

    log.info(f'Done — inserted: {inserted}, skipped (already in DB): {skipped}')
    return {'inserted': inserted, 'skipped': skipped}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    run(args.dry_run)
