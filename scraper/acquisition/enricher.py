"""
enricher.py - Enrich 'scraped' builder prospects by fetching and analysing their website.
Usage: python enricher.py [--limit 20]

For each prospect with status='scraped' and a website URL:
  1. Fetch homepage + /services page with requests + BeautifulSoup
  2. Pass content to DeepSeek for structured extraction
  3. Update prospect with enriched data, set status='reviewed'
"""

import os
import sys
import json
import re
import logging
import argparse
import time

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from shared.supabase_client import _get_client

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
log = logging.getLogger(__name__)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (compatible; Roweo-Enricher/1.0; +https://roweo.com.au)',
    'Accept': 'text/html,application/xhtml+xml',
}

BUSINESS_TYPES = ['residential', 'renovation', 'extension', 'granny_flat', 'custom', 'knockdown_rebuild', 'commercial', 'civil', 'other']


def fetch_page_text(url: str, timeout: int = 8) -> str:
    """Fetch a URL and return cleaned text content."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()
        text = soup.get_text(separator=' ', strip=True)
        return re.sub(r'\s+', ' ', text)[:4000]
    except Exception as e:
        log.debug(f"Fetch failed {url}: {e}")
        return ''


def enrich_with_deepseek(company_name: str, website_text: str) -> dict:
    """Call DeepSeek to extract structured prospect data from website text."""
    from openai import OpenAI
    client = OpenAI(
        api_key=os.environ.get('DEEPSEEK_API_KEY', ''),
        base_url='https://api.deepseek.com',
    )

    prompt = f"""You are analysing an Australian building company's website content to extract structured data.

Company: {company_name}
Website content: {website_text[:3000]}

Extract the following as JSON:
{{
  "business_type": one of {BUSINESS_TYPES},
  "service_suburbs": list of suburb names they mention serving (max 10, Australian suburbs only),
  "has_email": true/false (is there an email address visible?),
  "has_phone": true/false (is there a phone number visible?),
  "has_postal_address": true/false (is there a street/postal address visible?),
  "ai_summary": "2-3 sentence summary of this builder's business, focus and service area",
  "is_suitable": true/false (are they a residential/renovation/extension builder? false if commercial-only, civil, labour hire, or national franchise)
}}

Return only valid JSON. No markdown, no explanation."""

    try:
        response = client.chat.completions.create(
            model='deepseek-chat',
            messages=[{'role': 'user', 'content': prompt}],
            max_tokens=400,
            temperature=0.1,
        )
        text = response.choices[0].message.content.strip()
        return json.loads(text)
    except Exception as e:
        log.warning(f"DeepSeek enrichment failed: {e}")
        return {}


def enrich_prospect(supabase, prospect: dict) -> bool:
    website = prospect.get('website')
    if not website:
        supabase.table('builder_prospects').update({'status': 'reviewed', 'updated_at': 'now()'}).eq('id', prospect['id']).execute()
        return True

    text = fetch_page_text(website)

    # Try /services page too
    services_url = website.rstrip('/') + '/services'
    services_text = fetch_page_text(services_url)
    combined = (text + ' ' + services_text)[:4000]

    extracted = enrich_with_deepseek(prospect['company_name'], combined)
    if not extracted:
        return False

    updates = {
        'status': 'not_suitable' if not extracted.get('is_suitable', True) else 'reviewed',
        'business_type': extracted.get('business_type'),
        'service_suburbs': extracted.get('service_suburbs', []),
        'ai_summary': extracted.get('ai_summary'),
        'updated_at': 'now()',
    }

    supabase.table('builder_prospects').update(updates).eq('id', prospect['id']).execute()
    log.info(f"  Enriched: {prospect['company_name']} → {updates['status']}")
    return True


def run(limit: int = 20):
    supabase = _get_client()
    result = supabase.table('builder_prospects') \
        .select('id, company_name, website') \
        .eq('status', 'scraped') \
        .not_.is_('website', 'null') \
        .limit(limit) \
        .execute()

    prospects = result.data or []
    log.info(f"Enriching {len(prospects)} prospects")

    enriched = 0
    for p in prospects:
        if enrich_prospect(supabase, p):
            enriched += 1
        time.sleep(1)  # Rate limit crawling

    log.info(f"Done: {enriched}/{len(prospects)} enriched")
    return {'enriched': enriched, 'total': len(prospects)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=20)
    args = parser.parse_args()
    run(args.limit)
