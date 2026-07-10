"""
da_prospects_extractor.py - Extract builder prospects from our own DA applicant data.

The development_applications.applicant_name field contains the company or person who
lodged the DA — often the builder, architect, or project manager (not just the homeowner).
This is our highest-quality prospect source:
  - Already in our DB, zero scraping needed
  - These builders are actively submitting DAs in our exact target suburbs right now
  - No franchise contamination (franchises don't lodge individual project DAs)
  - Naturally ranked by activity (companies lodging many DAs = more active builders)

Usage: python da_prospects_extractor.py [--limit 500]
"""

import argparse
import logging
import os
import re
import sys
import uuid
from collections import defaultdict
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

# One of these words in the applicant name → likely a building company, not a homeowner
COMPANY_SIGNALS_RE = re.compile(
    r'\bpty\s*(ltd)?\b'
    r'|\bp\.?l\.?\b'
    r'|\bbuilding\b'
    r'|\bbuilders?\b'
    r'|\bconstructions?\b'
    r'|\bhomes\b'
    r'|\bhome\s+(building|group)\b'
    r'|\brenovations?\b'
    r'|\bextensions?\b'
    r'|\bprojects?\b'
    r'|\bdevelopments?\b'
    r'|\bcontractors?\b'
    r'|\bconstruct\b'
    r'|\bdesign\s*(and\s*)?build\b'
    r'|\barchitects?\b'
    r'|\bdesigns?\b'
    r'|\bcarpentry\b'
    r'|\bjoinery\b'
    r'|\bworks\b'
    r'|\bgroup\b'
    r'|\bservices\b'
    r'|\bassociates\b'
    r'|\benterprises?\b'
    r'|\bindustries\b',
    re.IGNORECASE,
)

# Patterns that flag a personal/homeowner name — skip these
PERSONAL_RE = re.compile(r'^(Mr|Mrs|Ms|Miss|Dr|Prof|Rev)\.?\s+', re.IGNORECASE)


def _is_company(name: str) -> bool:
    if not name or len(name) < 5 or len(name) > 100:
        return False
    if PERSONAL_RE.match(name):
        return False
    return bool(COMPANY_SIGNALS_RE.search(name))


def run(limit: int = 500) -> dict:
    supabase = _get_client()

    # Pull all DA rows that have an applicant name — page in batches if needed
    log.info("Loading DA applicant names from development_applications...")
    all_rows = []
    page_size = 1000
    offset = 0

    while True:
        result = supabase.table('development_applications') \
            .select('applicant_name, suburb, state, council, project_type') \
            .neq('applicant_name', '') \
            .range(offset, offset + page_size - 1) \
            .execute()
        batch = result.data or []
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size

    log.info(f"  Total DA rows with applicant_name: {len(all_rows)}")

    # Aggregate: for each company name, collect suburbs + project types they're active in
    company_data: dict[str, dict] = defaultdict(lambda: {'suburbs': set(), 'types': set()})
    for row in all_rows:
        name = (row.get('applicant_name') or '').strip()
        if not _is_company(name):
            continue
        company_data[name]['suburbs'].add(row.get('suburb') or '')
        company_data[name]['types'].add(row.get('project_type') or '')

    log.info(f"  Distinct company names identified: {len(company_data)}")

    # Sort by number of DA suburbs (most active builders first)
    ranked = sorted(company_data.items(), key=lambda x: -len(x[1]['suburbs']))

    # Load existing prospect names to skip duplicates
    existing = supabase.table('builder_prospects').select('company_name').limit(3000).execute()
    existing_lower = {r['company_name'].lower() for r in (existing.data or [])}

    inserted = 0
    skipped = 0

    for company_name, data in ranked:
        if inserted >= limit:
            break

        if company_name.lower() in existing_lower:
            skipped += 1
            continue

        service_suburbs = [s for s in data['suburbs'] if s]
        project_types = [t for t in data['types'] if t and t != 'other']

        demo_slug = re.sub(r'[^a-z0-9]+', '-', company_name.lower()).strip('-')[:40]
        demo_slug = demo_slug + '-' + os.urandom(3).hex()

        try:
            supabase.table('builder_prospects').insert({
                'company_name': company_name,
                'service_suburbs': service_suburbs,
                'source': 'da_applicant',
                'status': 'scraped',
                'demo_slug': demo_slug,
                'qr_token': str(uuid.uuid4()),
                'created_at': datetime.now(timezone.utc).isoformat(),
                'updated_at': datetime.now(timezone.utc).isoformat(),
            }).execute()
            log.info(f"  ✓ {company_name} ({len(service_suburbs)} suburb(s))")
            existing_lower.add(company_name.lower())
            inserted += 1
        except Exception as e:
            log.debug(f"  Insert failed for {company_name}: {e}")
            skipped += 1

    log.info(f"Done — inserted: {inserted}, skipped (already exists): {skipped}")
    return {'inserted': inserted, 'skipped': skipped}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Extract builder prospects from DA applicant names')
    parser.add_argument('--limit', type=int, default=500, help='Max prospects to insert')
    args = parser.parse_args()
    run(args.limit)
