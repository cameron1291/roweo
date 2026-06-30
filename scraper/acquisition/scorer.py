"""
scorer.py - Score builder prospects by fit for Roweo.
Usage: python scorer.py [--limit 50]

For each prospect with status='reviewed', compute a fit_score (0-100)
and update the record. High scores → 'approved', low → 'not_suitable'.
"""

import os
import sys
import logging
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

# Top 50 NSW suburbs by DA volume (seed data — updated as real DAs flow in)
HIGH_DA_SUBURBS = {
    'parramatta', 'blacktown', 'penrith', 'campbelltown', 'liverpool',
    'bankstown', 'hurstville', 'hornsby', 'ryde', 'lane cove',
    'manly', 'mosman', 'north sydney', 'chatswood', 'lane cove',
    'strathfield', 'auburn', 'merrylands', 'granville', 'westmead',
    'kellyville', 'baulkham hills', 'castle hill', 'norwest', 'seven hills',
    'epping', 'eastwood', 'meadowbank', 'rhodes', 'homebush',
    'newtown', 'surry hills', 'darlinghurst', 'redfern', 'waterloo',
    'bondi', 'randwick', 'maroubra', 'cronulla', 'sutherland',
    'kogarah', 'rockdale', 'botany', 'mascot', 'tempe',
    'leichhardt', 'balmain', 'rozelle', 'dulwich hill', 'marrickville',
}

GOOD_BUSINESS_TYPES = {'residential', 'renovation', 'extension', 'granny_flat', 'custom', 'knockdown_rebuild'}
BAD_BUSINESS_TYPES = {'commercial', 'civil'}


def compute_fit_score(prospect: dict) -> tuple[int, list[str]]:
    score = 0
    reasons: list[str] = []

    # Business type (+30 good, -30 bad)
    btype = (prospect.get('business_type') or '').lower()
    if btype in GOOD_BUSINESS_TYPES:
        score += 30
        reasons.append(f"Business type '{btype}' is a good fit")
    elif btype in BAD_BUSINESS_TYPES:
        score -= 30
        reasons.append(f"Business type '{btype}' is commercial/civil — low fit")

    # Service suburb overlap (+25)
    service_suburbs = {s.lower().strip() for s in (prospect.get('service_suburbs') or [])}
    overlap = service_suburbs & HIGH_DA_SUBURBS
    if overlap:
        score += 25
        reasons.append(f"Service suburbs overlap with high-DA areas: {', '.join(list(overlap)[:3])}")
    elif service_suburbs:
        score += 10
        reasons.append(f"Has service suburbs defined ({len(service_suburbs)} suburbs)")

    # Has postal address (+20)
    if prospect.get('postal_address'):
        score += 20
        reasons.append("Has postal address — physical letter deliverable")

    # Has website (+10)
    if prospect.get('website'):
        score += 10
        reasons.append("Has website — legitimate business presence")

    # Has email AND phone (+10)
    if prospect.get('email') and prospect.get('phone'):
        score += 10
        reasons.append("Has both email and phone contact")
    elif prospect.get('email') or prospect.get('phone'):
        score += 5

    # Penalty: no web presence
    if not prospect.get('website'):
        score -= 20
        reasons.append("No website — hard to verify legitimacy")

    score = max(0, min(100, score))
    return score, reasons


def run(limit: int = 50, min_score_threshold: int = 30):
    supabase = _get_client()
    result = supabase.table('builder_prospects') \
        .select('id, company_name, business_type, service_suburbs, postal_address, website, email, phone') \
        .eq('status', 'reviewed') \
        .limit(limit) \
        .execute()

    prospects = result.data or []
    log.info(f"Scoring {len(prospects)} prospects")

    scored = 0
    for p in prospects:
        score, reasons = compute_fit_score(p)
        new_status = 'approved' if score >= min_score_threshold else 'not_suitable'

        supabase.table('builder_prospects').update({
            'fit_score': score,
            'fit_reasons': reasons,
            'status': new_status,
            'updated_at': 'now()',
        }).eq('id', p['id']).execute()

        log.info(f"  {p['company_name']}: score={score} → {new_status}")
        scored += 1

    log.info(f"Done: {scored}/{len(prospects)} scored")
    return {'scored': scored}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=50)
    parser.add_argument('--min-score', type=int, default=30, help='Minimum score to approve (default 30)')
    args = parser.parse_args()
    run(args.limit, args.min_score)
