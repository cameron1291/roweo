"""
enricher.py - Enrich 'scraped' builder prospects by fetching and analysing their website.
Usage: python enricher.py [--limit 20]

For each prospect with status='scraped':
  1. If no website: search DuckDuckGo for "<company name> builder Australia" to find it
  2. Fetch homepage + /contact + /services page with requests + BeautifulSoup
  3. Extract email addresses directly from HTML
  4. Pass content to DeepSeek for structured extraction (business type, suburbs, summary)
  5. Update prospect with enriched data, set status='reviewed'
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
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-AU,en;q=0.9',
}

EMAIL_RE = re.compile(r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}')
SKIP_EMAIL_DOMAINS = {'example.com', 'yourdomain.com', 'email.com', 'domain.com', 'sentry.io', 'wixpress.com'}

BUSINESS_TYPES = ['residential', 'renovation', 'extension', 'granny_flat', 'custom', 'knockdown_rebuild', 'commercial', 'civil', 'other']


def search_for_website(company_name: str) -> str | None:
    """Use DuckDuckGo HTML search to find a company's website."""
    query = f'"{company_name}" builder Australia site contact'
    try:
        resp = requests.get(
            'https://html.duckduckgo.com/html/',
            params={'q': query},
            headers=HEADERS,
            timeout=10,
        )
        soup = BeautifulSoup(resp.text, 'html.parser')
        for result in soup.select('.result__url, .result__a'):
            href = result.get('href', '') or result.get_text(strip=True)
            # DuckDuckGo wraps URLs in redirect — extract from data
            if 'uddg=' in href:
                from urllib.parse import unquote, parse_qs, urlparse
                qs = parse_qs(urlparse(href).query)
                href = qs.get('uddg', [href])[0]
                href = unquote(href)
            if href.startswith('http') and not any(x in href for x in ['duckduckgo', 'google', 'facebook', 'yelp', 'yellowpages', 'truelocal', 'hipages']):
                return href
    except Exception as e:
        log.debug(f"Website search failed for {company_name}: {e}")
    return None


def fetch_page_text(url: str, timeout: int = 10) -> tuple[str, list[str]]:
    """Fetch a URL and return (cleaned_text, emails_found)."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        html = resp.text

        # Extract emails from raw HTML first (before soup strips them)
        raw_emails = EMAIL_RE.findall(html)
        emails = [
            e.lower() for e in raw_emails
            if not any(skip in e.lower() for skip in SKIP_EMAIL_DOMAINS)
            and not e.startswith('no-reply')
            and not e.startswith('noreply')
            and '.' in e.split('@')[-1]
        ]

        soup = BeautifulSoup(html, 'html.parser')
        for tag in soup(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()
        text = soup.get_text(separator=' ', strip=True)
        return re.sub(r'\s+', ' ', text)[:4000], list(dict.fromkeys(emails))  # dedupe preserving order
    except Exception as e:
        log.debug(f"Fetch failed {url}: {e}")
        return '', []


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
  "has_phone": true/false (is there a phone number visible?),
  "phone": "the phone number if visible, e.g. 02 9876 5432 or 0412 345 678, or null",
  "has_postal_address": true/false (is there a street/postal address visible?),
  "postal_address": "the street or postal address if visible, or null",
  "ai_summary": "2-3 sentence summary of this builder's business, focus and service area",
  "is_suitable": true/false (are they a residential/renovation/extension builder? false if commercial-only, civil, labour hire, or national franchise),
  "is_sole_trader": true/false (does this appear to be a single-person operation? true if sole trader, false if they have a team)
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
        # Strip markdown code fences if present
        text = re.sub(r'^```[a-z]*\n?', '', text)
        text = re.sub(r'\n?```$', '', text)
        return json.loads(text)
    except Exception as e:
        log.warning(f"DeepSeek enrichment failed: {e}")
        return {}


def enrich_prospect(supabase, prospect: dict) -> bool:
    website = prospect.get('website')

    # Try to find website via search if not stored
    if not website:
        log.info(f"  Searching for website: {prospect['company_name']}")
        website = search_for_website(prospect['company_name'])
        if website:
            log.info(f"    Found: {website}")

    if not website:
        supabase.table('builder_prospects').update({'status': 'reviewed', 'updated_at': 'now()'}).eq('id', prospect['id']).execute()
        log.info(f"  No website found for {prospect['company_name']} — marked reviewed")
        return True

    # Fetch homepage
    text, emails = fetch_page_text(website)

    # Also try /contact and /services pages for more emails
    for path in ['/contact', '/contact-us', '/services', '/about']:
        extra_url = website.rstrip('/') + path
        extra_text, extra_emails = fetch_page_text(extra_url)
        emails.extend(extra_emails)
        if extra_text and len(text) < 3000:
            text = (text + ' ' + extra_text)[:4000]

    # Dedupe emails
    seen = set()
    unique_emails = []
    for e in emails:
        if e not in seen:
            seen.add(e)
            unique_emails.append(e)

    best_email = unique_emails[0] if unique_emails else None

    extracted = {}
    if text:
        extracted = enrich_with_deepseek(prospect['company_name'], text)

    is_sole_trader = extracted.get('is_sole_trader', False)
    is_suitable = extracted.get('is_suitable', True) and not is_sole_trader

    updates = {
        'website': website,
        'status': 'not_suitable' if not is_suitable else 'reviewed',
        'business_type': extracted.get('business_type'),
        'service_suburbs': extracted.get('service_suburbs', []) or [],
        'ai_summary': extracted.get('ai_summary'),
        'updated_at': 'now()',
    }

    if best_email:
        updates['email'] = best_email
        log.info(f"    Email found: {best_email}")

    # Fill in contact details if scraper missed them
    if extracted.get('phone') and not prospect.get('phone'):
        updates['phone'] = extracted['phone']
    if extracted.get('postal_address') and not prospect.get('postal_address'):
        updates['postal_address'] = extracted['postal_address']

    supabase.table('builder_prospects').update(updates).eq('id', prospect['id']).execute()
    log.info(f"  Enriched: {prospect['company_name']} → {updates['status']} | email={best_email or '—'}")
    return True


def run(limit: int = 20):
    supabase = _get_client()
    result = supabase.table('builder_prospects') \
        .select('id, company_name, website, phone, postal_address, email') \
        .eq('status', 'scraped') \
        .limit(limit) \
        .execute()

    prospects = result.data or []
    log.info(f"Enriching {len(prospects)} prospects")

    enriched = 0
    for p in prospects:
        if enrich_prospect(supabase, p):
            enriched += 1
        time.sleep(1.5)  # polite delay

    log.info(f"Done: {enriched}/{len(prospects)} enriched")
    return {'enriched': enriched, 'total': len(prospects)}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--limit', type=int, default=20)
    args = parser.parse_args()
    run(args.limit)
